import type {
  ScenarioSpec,
  ChaosSpec,
  TrackEntity,
  SimEvent,
  SimEventType,
  OperatorEventView,
  OperatorEventCategory,
  UserAction,
  SensorMode,
  EffectorId,
  TrackClass,
} from './types';
import { InputQueue } from './inputQueue';
import { streamSeed, mulberry32, keyedU } from './rng';
import { clockInstance } from './clock';
import { SHORT_CODES, isHostile } from './taxonomy';
import { CONFIG } from '@/config';
import { canTransition, evaluateReleaseGating } from './roe';
import { resolveEngagement } from './effectors';
import { aggregateAARMetrics } from './metrics';
import { calculateRadarPd, computeCoastingState } from './sensors';
import { evaluateMasking } from './masking';
import { type OperatorFeedback, createOperatorFeedback } from './operatorFeedback';
import { TrackEstimator } from './tracker';
import type { OperatorTrackView } from './trackerTypes';
import {
  generateRadarMeasurement,
  generateEoirMeasurement,
  generateRfMeasurement,
} from './sensorMeasurement';
import type { RfMeasurement } from './measurementTypes';

export type SensorHealthStatus = 'OK' | 'DEG' | 'OUT';

export const OPERATOR_FACING_EVENT_TYPES: ReadonlySet<SimEventType> = new Set([
  'SIM_START',
  'DETECT',
  'TRACK_INIT',
  'MASKED',
  'REACQUIRE',
  'DESIGNATE',
  'SENSOR_SWITCH',
  'CLASSIFY',
  'ENGAGE',
  'ENGAGE_RESULT',
  'RELEASE_BLOCKED',
  'ASSESS',
  'CHAOS_ON',
  'CHAOS_OFF',
  'ROE_VIOLATION',
  'FLAG',
  'LEAK',
  'SESSION_PAUSE',
  'SESSION_RESUME',
  'SESSION_END',
]);

/**
 * Combines baseline sensor health with environmental degradation using strict severity precedence:
 * OK < DEG < OUT
 */
export function combineSensorHealth(
  a: SensorHealthStatus,
  b: SensorHealthStatus
): SensorHealthStatus {
  if (a === 'OUT' || b === 'OUT') return 'OUT';
  if (a === 'DEG' || b === 'DEG') return 'DEG';
  return 'OK';
}

/**
 * Computes deterministic temporary environmental sensor degradation from active chaos events.
 */
export function computeEnvironmentalSensorHealth(
  currentSimMs: number,
  chaosList?: ChaosSpec[]
): Record<SensorMode, SensorHealthStatus> {
  let radar: SensorHealthStatus = 'OK';
  let eoir: SensorHealthStatus = 'OK';
  let rf: SensorHealthStatus = 'OK';

  if (chaosList) {
    for (const c of chaosList) {
      if (currentSimMs >= c.tStartMs && currentSimMs <= c.tEndMs) {
        if (c.type === 'FOG' && c.severity > 0) {
          eoir = combineSensorHealth(eoir, 'DEG');
        } else if (c.type === 'JAMMING') {
          rf = combineSensorHealth(rf, 'OUT');
        } else if (c.type === 'RADAR_DROPOUT') {
          radar = combineSensorHealth(radar, 'OUT');
        }
      }
    }
  }

  return { RADAR: radar, EOIR: eoir, RF: rf };
}

export interface UiTrackRow {
  trackNo: string;
  label: TrackClass | null;
  shortCode: string;
  rangeKm: number;
  bearingDeg: number;
  speedMps: number;
  step: string;
  statusPill: string;
  timeToPnrSec: number;
  q: number;
  cCls: number;
  isHostile: boolean;
}

export interface UiSnapshot {
  tick: number;
  simTimeMs: number;
  formattedClock: string;
  activeSensor: SensorMode;
  selectedTrackNo: string | null;
  selectedTrack: UiTrackRow | null;
  trackRows: UiTrackRow[];
  sensorHealth: {
    RADAR: SensorHealthStatus;
    EOIR: SensorHealthStatus;
    RF: SensorHealthStatus;
  };
  roeText: string;
  isPaused: boolean;
  recentEvents: OperatorEventView[];
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  difficulty: number;
  activeEffector: EffectorId;
}

export class SimEngine {
  public spec: ScenarioSpec | null = null;
  public tickIndex: number = 0;
  public curr: TrackEntity[] = [];
  public prev: TrackEntity[] = [];
  public events: SimEvent[] = [];
  public eventSeq: number = 0;
  public inputQueue: InputQueue = new InputQueue();

  public onEvent: ((event: SimEvent) => void) | null = null;
  public onFeedback: ((feedback: OperatorFeedback) => void) | null = null;

  public emitFeedback(feedback: OperatorFeedback): void {
    this.onFeedback?.(feedback);
  }

  public activeSensor: SensorMode = 'RADAR';
  public selectedTrackNo: string | null = null;
  public activeEffector: EffectorId = 'RF_SOFTKILL';
  public eoirAzimuthDeg: number = 0;

  public baselineSensorHealth: Record<SensorMode, SensorHealthStatus> = {
    RADAR: 'OK',
    EOIR: 'OK',
    RF: 'OK',
  };

  public sensorHealth: Record<SensorMode, SensorHealthStatus> = {
    RADAR: 'OK',
    EOIR: 'OK',
    RF: 'OK',
  };

  public tracker: TrackEstimator = new TrackEstimator();
  public rfMeasurements: RfMeasurement[] = [];

  public getEffectiveSensorHealth(currentSimMs: number): Record<SensorMode, SensorHealthStatus> {
    const env = computeEnvironmentalSensorHealth(currentSimMs, this.spec?.chaos);
    return {
      RADAR: combineSensorHealth(this.baselineSensorHealth.RADAR, env.RADAR),
      EOIR: combineSensorHealth(this.baselineSensorHealth.EOIR, env.EOIR),
      RF: combineSensorHealth(this.baselineSensorHealth.RF, env.RF),
    };
  }

  private killRng: (() => number) | null = null;
  public sessionEnded: boolean = false;
  public trainingAidActive: boolean = false;
  public trainingAidTicks: number = 0;

  public get mode(): 'TRAIN' | 'EVAL' | 'DEMO' {
    return this.spec?.mode ?? 'TRAIN';
  }

  public load(spec: ScenarioSpec): void {
    this.spec = spec;
    this.tickIndex = 0;
    this.eventSeq = 0;
    this.sessionEnded = false;
    this.events = [];
    this.inputQueue.clear();
    this.activeSensor = 'RADAR';
    this.selectedTrackNo = null;
    this.activeEffector = 'RF_SOFTKILL';
    this.eoirAzimuthDeg = 0;
    this.trainingAidActive = false;
    this.trainingAidTicks = 0;
    this.baselineSensorHealth = { RADAR: 'OK', EOIR: 'OK', RF: 'OK' };
    this.sensorHealth = this.getEffectiveSensorHealth(0);
    this.killRng = mulberry32(streamSeed(spec.seed, 'kill'));
    this.tracker.clear();
    this.rfMeasurements = [];
    clockInstance.reset();

    this.curr = [];
    this.prev = [];

    // Spawn threats from spec
    let trackCounter = 1;
    const allSpawns = [...(spec.threats || []), ...(spec.decoys || [])];

    for (const s of allSpawns) {
      const initialPos = s.waypoints.length > 0 ? { ...s.waypoints[0] } : { x: 2000, y: 2000, z: 120 };
      const targetPos = s.waypoints.length > 1 ? (s.waypoints.at(-1) ?? { x: 0, y: 0, z: 20 }) : { x: 0, y: 0, z: 20 };
      const dx = targetPos.x - initialPos.x;
      const dy = targetPos.y - initialPos.y;
      const dist = Math.hypot(dx, dy);

      const vel = {
        x: dist > 0 ? (dx / dist) * s.speedMps : 0,
        y: dist > 0 ? (dy / dist) * s.speedMps : 0,
        z: 0,
      };

      const trackNo = `T-${String(trackCounter++).padStart(2, '0')}`;

      const entity: TrackEntity = {
        id: s.id,
        trackNo,
        trueClass: s.trueClass,
        droneType: s.droneType,
        pos: initialPos,
        prev: { ...initialPos },
        vel,
        rcsM2: s.rcsM2,
        valueInr: s.valueInr,
        emitsRf: s.emitsRf,
        remoteId: s.remoteId,
        iff: s.iff,
        profile: s.profile,
        spawnTMs: s.spawnTMs,
        lifecycle: 'ACTIVE',
        traineeLabel: null,
        step: 'UNDETECTED',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [],
        tVis: null,
        tTrk: null,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      };

      this.curr.push(entity);
      this.prev.push({ ...entity, pos: { ...entity.pos }, vel: { ...entity.vel } });
    }

    // Default select first track if already initiated
    const firstInitiated = this.curr.find((e) => e.step !== 'UNDETECTED');
    this.selectedTrackNo = firstInitiated?.trackNo ?? (this.curr.length > 0 ? this.curr[0].trackNo : null);

    // Log SIM_START event
    this.appendEvent('SIM_START', {
      scenarioId: spec.id,
      seed: spec.seed,
      mode: spec.mode,
      difficulty: spec.difficulty,
    });

    // Initial radar sweep at T=0
    this.evaluateRadarSweep(0);
    this.updateAuxiliarySensors(0);
  }

  public appendEvent(
    type: SimEventType,
    payload: Record<string, unknown>,
    trackNo?: string,
    entityId?: string,
    tRawMs?: number
  ): SimEvent {
    this.eventSeq += 1;
    const event: SimEvent = {
      seq: this.eventSeq,
      tMs: this.tickIndex * 50,
      tRawMs,
      type,
      trackNo,
      entityId,
      payload,
    };
    this.events.push(event);

    try {
      this.onEvent?.(event);
    } catch (error) {
      console.error('[Engine] Event listener failed:', error);
    }

    return event;
  }

  public abort(reason: string = 'ABORT', subReason?: string): void {
    if (this.sessionEnded || !this.spec) return;
    this.sessionEnded = true;
    const currentSimMs = this.tickIndex * 50;
    const finalMetrics = aggregateAARMetrics(this.events, this.spec, this.trainingAidTicks);
    this.appendEvent('SESSION_END', {
      durationMs: currentSimMs,
      metrics: finalMetrics,
      trainingAidTicks: this.trainingAidTicks,
      reason,
      subReason,
      aborted: true,
    });
  }

  public step(): void {
    if (!this.spec || this.sessionEnded) return;

    this.tickIndex += 1;
    const currentSimMs = this.tickIndex * 50;
    this.sensorHealth = this.getEffectiveSensorHealth(currentSimMs);

    if (this.trainingAidActive && this.mode !== 'EVAL') {
      this.trainingAidTicks += 1;
    }

    // 1. Radar sweep evaluation every 2000ms (40 ticks, 30 RPM)
    if (this.tickIndex % 40 === 0) {
      this.evaluateRadarSweep(currentSimMs);
    }

    // 2. Drain quantised user inputs for this tick
    const actions = this.inputQueue.drainForTick(this.tickIndex);
    for (const item of actions) {
      this.handleAction(item);
    }

    // 3. Clone previous state for interpolation
    this.prev = this.curr.map((e) => ({
      ...e,
      pos: { ...e.pos },
      vel: { ...e.vel },
    }));

    // 4. Update active entities, line-of-sight terrain masking, coasting, and check leak conditions
    this.updateEntities(currentSimMs);

    // 4b. Advance track estimator predictions (dt = 0.05s)
    this.tracker.predict(currentSimMs, 0.05);

    // 4c. Update auxiliary sensors (EO/IR, RF) and synchronize track operational statuses
    this.updateAuxiliarySensors(currentSimMs);

    // 5. Periodic snapshot keyframe every 250ms (5 ticks) for instant AAR scrubbing
    if (this.tickIndex % 5 === 0) {
      this.emitPeriodicSnapshot();
    }

    // 6. Check session completion
    if (currentSimMs >= this.spec.durationMs && !this.sessionEnded) {
      this.sessionEnded = true;
      const finalMetrics = aggregateAARMetrics(this.events, this.spec, this.trainingAidTicks);
      this.appendEvent('SESSION_END', {
        durationMs: currentSimMs,
        metrics: finalMetrics,
        trainingAidTicks: this.trainingAidTicks,
        reason: 'COMPLETE',
        aborted: false,
      });
    }
  }

  private evaluateRadarSweep(currentSimMs: number): void {
    if (!this.spec) return;
    const sweepPeriodMs = CONFIG.thresholds.radarSweepPeriodMs || 2000;
    const sweepIdx = Math.floor(currentSimMs / sweepPeriodMs);

    for (let i = 0; i < this.curr.length; i++) {
      const entity = this.curr[i];
      if (entity.lifecycle === 'ACTIVE' && currentSimMs >= entity.spawnTMs) {
        this.processEntityRadarDetection(entity, i, sweepIdx, currentSimMs);
      }
    }
  }

  private processEntityRadarDetection(
    entity: TrackEntity,
    index: number,
    sweepIdx: number,
    currentSimMs: number
  ): void {
    if (!this.spec) return;
    const rangeM = Math.hypot(entity.pos.x, entity.pos.y);
    const maskResult = evaluateMasking(entity.pos, this.spec.zones || []);

    let aEnv = 1.0;
    if (this.sensorHealth.RADAR === 'OUT') {
      aEnv = 0.0;
    } else if (this.sensorHealth.RADAR === 'DEG') {
      aEnv = 0.7;
    }

    const { pd } = calculateRadarPd(entity.rcsM2, rangeM, maskResult.isMasked ? 0 : aEnv);
    const u = keyedU(this.spec.seed, 'sense', index, sweepIdx);
    const isHit = u < pd;

    entity.hitHistory.push(isHit);
    if (entity.hitHistory.length > 3) {
      entity.hitHistory.shift();
    }

    // Initial plot detection (beam hit)
    if (isHit && entity.step === 'UNDETECTED') {
      entity.step = 'FIND';
      entity.tVis ??= currentSimMs;
      this.appendEvent('DETECT', { rangeM, pd, u }, entity.trackNo ?? undefined, entity.id);
    }

    // Track initiation: requires 2 hits in 3 consecutive sweeps (Rules.md DT-3, PRD 3.4, ARCHITECTURE.md 3.3)
    const hitsIn3 = entity.hitHistory.filter(Boolean).length;
    if (hitsIn3 >= 2 && entity.tTrk === null) {
      entity.tTrk = currentSimMs;
      entity.tVis ??= currentSimMs;
      if (entity.step === 'UNDETECTED') {
        entity.step = 'FIND';
      }
      this.appendEvent(
        'TRACK_INIT',
        { trackNo: entity.trackNo, rangeM, q: entity.q },
        entity.trackNo ?? undefined,
        entity.id
      );

      if (this.selectedTrackNo === null && entity.trackNo) {
        this.selectedTrackNo = entity.trackNo;
      }
    }

    // Generate noisy measurement & update tracker for established or newly initiated track
    if (isHit && (entity.tTrk !== null || hitsIn3 >= 2) && entity.trackNo && this.spec) {
      const radarMeas = generateRadarMeasurement({
        entity,
        entityIndex: index,
        sweepIdx,
        timestampMs: currentSimMs,
        scenarioSeed: this.spec.seed,
        sensorHealth: this.sensorHealth.RADAR,
      });
      if (radarMeas) {
        this.tracker.updateWithRadar(radarMeas);
      }
    }
  }

  private updateEntityMaskingAndCoasting(entity: TrackEntity, currentSimMs: number): void {
    if (!this.spec) return;
    const maskResult = evaluateMasking(entity.pos, this.spec.zones || []);
    const wasMasked = entity.masked;
    entity.masked = maskResult.isMasked;

    if (entity.masked) {
      if (!wasMasked) {
        entity.coastingSinceMs = currentSimMs;
        this.appendEvent(
          'MASKED',
          {
            zoneId: maskResult.zoneId,
            thetaT: maskResult.thetaT,
            thetaMask: maskResult.thetaMask,
          },
          entity.trackNo ?? undefined,
          entity.id
        );
      }
      const elapsed = currentSimMs - (entity.coastingSinceMs ?? currentSimMs);
      const coast = computeCoastingState(elapsed, 0.8);
      entity.q = coast.q;
      entity.ghostSigmaM = coast.ghostSigmaM;
    } else if (wasMasked) {
      entity.coastingSinceMs = null;
      entity.ghostSigmaM = 0;
      entity.q = 0.8;
      this.appendEvent(
        'REACQUIRE',
        {
          zoneId: maskResult.zoneId,
          thetaT: maskResult.thetaT,
          thetaMask: maskResult.thetaMask,
        },
        entity.trackNo ?? undefined,
        entity.id
      );
    }
  }

  private checkEntityLeak(
    entity: TrackEntity,
    rangeM: number,
    rMinM: number,
    currentSimMs: number
  ): void {
    if (rangeM > rMinM || entity.tPnr !== null) return;

    entity.tPnr = currentSimMs;
    const nonHostile = entity.trueClass === 'FRIENDLY' || entity.trueClass === 'CIVIL_UAS' || entity.trueClass === 'BIRD';
    if (!nonHostile) {
      entity.lifecycle = 'LEAKED';
      entity.step = 'CLOSED';
      this.appendEvent('LEAK', { rangeM, trueClass: entity.trueClass }, entity.trackNo ?? undefined, entity.id);
    }
  }

  private checkFirmTrackProgression(
    entity: TrackEntity,
    qMin: number,
    currentSimMs: number
  ): void {
    if (
      entity.step !== 'FIX' ||
      entity.q < qMin ||
      entity.tDesig === null ||
      currentSimMs - entity.tDesig < 1000
    ) {
      return;
    }

    if (
      canTransition(entity.step, 'TRACK', {
        q: entity.q,
        isDesignated: true,
        hasNonUnknownLabel: entity.traineeLabel !== null && entity.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        isNeutralised: false,
        isLeaked: entity.lifecycle === 'LEAKED',
      })
    ) {
      entity.step = 'TRACK';
    }
  }

  private updatePopUpApproach(entity: TrackEntity, distToAsset: number, speedMps: number): void {
    const dx = -entity.pos.x;
    const dy = -entity.pos.y;
    if (distToAsset > 0.1) {
      entity.vel.x = (dx / distToAsset) * speedMps;
      entity.vel.y = (dy / distToAsset) * speedMps;
    }
    if (entity.pos.z > 20) {
      entity.vel.z = -8;
    } else {
      entity.vel.z = 0;
      entity.pos.z = 20;
    }
  }

  private updatePopUpClimb(
    entity: TrackEntity,
    distToAsset: number,
    speedMps: number,
    climbRateMps: number
  ): void {
    const dx = -entity.pos.x;
    const dy = -entity.pos.y;
    if (distToAsset > 0.1) {
      entity.vel.x = (dx / distToAsset) * speedMps;
      entity.vel.y = (dy / distToAsset) * speedMps;
    }
    entity.vel.z = climbRateMps;
  }

  private updatePopUpDive(
    entity: TrackEntity,
    speedMps: number,
    peakZ: number,
    terminalTargetZ: number
  ): void {
    if (entity.pos.z >= peakZ) {
      entity.pos.z = peakZ;
    }
    const dX = -entity.pos.x;
    const dY = -entity.pos.y;
    const dZ = terminalTargetZ - entity.pos.z;
    const dist3D = Math.hypot(dX, dY, dZ);

    if (dist3D > 0.1) {
      const stepDist = speedMps * 0.05;
      if (dist3D <= stepDist) {
        entity.vel.x = dX / 0.05;
        entity.vel.y = dY / 0.05;
        entity.vel.z = dZ / 0.05;
      } else {
        entity.vel.x = (dX / dist3D) * speedMps;
        entity.vel.y = (dY / dist3D) * speedMps;
        entity.vel.z = (dZ / dist3D) * speedMps;
      }
    } else {
      entity.vel.x = 0;
      entity.vel.y = 0;
      entity.vel.z = 0;
    }
  }

  private updatePopUpDiveKinematics(entity: TrackEntity): void {
    const distToAsset = Math.hypot(entity.pos.x, entity.pos.y);
    const popupDistM = CONFIG.terrain?.popUp?.popupDistM ?? 900;
    const climbRateMps = CONFIG.terrain?.popUp?.climbRateMps ?? 15;
    const peakZ = CONFIG.terrain?.popUp?.peakZM ?? 150;
    const terminalTargetZ = CONFIG.terrain?.popUp?.terminalTargetZM ?? 20;

    const specSpeed =
      this.spec?.threats?.find((t) => t.id === entity.id)?.speedMps ??
      this.spec?.decoys?.find((d) => d.id === entity.id)?.speedMps;
    const speedMps = specSpeed ?? (Math.hypot(entity.vel.x, entity.vel.y) || 30);

    if (distToAsset > popupDistM) {
      this.updatePopUpApproach(entity, distToAsset, speedMps);
    } else if (entity.pos.z < peakZ && entity.vel.z >= 0) {
      this.updatePopUpClimb(entity, distToAsset, speedMps, climbRateMps);
    } else {
      this.updatePopUpDive(entity, speedMps, peakZ, terminalTargetZ);
    }
  }

  private updateSingleEntity(
    entity: TrackEntity,
    rMinM: number,
    qMin: number,
    currentSimMs: number
  ): void {
    if (entity.profile === 'POP_UP_DIVE') {
      this.updatePopUpDiveKinematics(entity);
    }

    entity.pos.x += entity.vel.x * 0.05;
    entity.pos.y += entity.vel.y * 0.05;
    entity.pos.z += entity.vel.z * 0.05;

    const rangeM = Math.hypot(entity.pos.x, entity.pos.y);
    this.checkEntityLeak(entity, rangeM, rMinM, currentSimMs);

    this.updateEntityMaskingAndCoasting(entity, currentSimMs);

    if (entity.q < qMin && (entity.step === 'TRACK' || entity.step === 'TARGET')) {
      entity.step = 'FIX';
    }

    this.checkFirmTrackProgression(entity, qMin, currentSimMs);
  }

  private updateEntities(currentSimMs: number): void {
    if (!this.spec) return;
    const rMinM = this.spec.asset.rMinM || CONFIG.thresholds.rMinM;
    const qMin = CONFIG.thresholds.qMin;

    for (const entity of this.curr) {
      if (entity.lifecycle === 'ACTIVE') {
        this.updateSingleEntity(entity, rMinM, qMin, currentSimMs);
      }
    }
  }

  public syncTrackerWithEntities(currentSimMs: number): void {
    const validTrackNos = new Set<string>();

    for (let i = 0; i < this.curr.length; i++) {
      const e = this.curr[i];
      if (e.trackNo && e.step !== 'UNDETECTED' && (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED')) {
        validTrackNos.add(e.trackNo);

        if (!this.tracker.getTrackEstimate(e.trackNo)) {
          const initMeas = generateRadarMeasurement({
            entity: e,
            entityIndex: i,
            sweepIdx: Math.floor(currentSimMs / 2000),
            timestampMs: currentSimMs,
            scenarioSeed: this.spec?.seed ?? 42,
            sensorHealth: this.sensorHealth.RADAR,
          });
          if (initMeas) {
            this.tracker.updateWithRadar(initMeas);
          }
        }

        this.tracker.syncTrackStatus(e.trackNo, {
          q: e.q,
          cCls: e.cCls,
          traineeLabel: e.traineeLabel,
          step: e.step,
          lifecycle: e.lifecycle as 'ACTIVE' | 'LEAKED' | 'NEUTRALISED',
        });
      }
    }

    // Prune tracks from tracker that no longer exist in this.curr
    for (const est of this.tracker.getAllEstimates()) {
      if (!validTrackNos.has(est.trackNo)) {
        this.tracker.removeTrack(est.trackNo);
      }
    }
  }

  private updateAuxiliarySensors(currentSimMs: number): void {
    if (!this.spec) return;

    // 1. Synchronize operational statuses and seed any unseeded initiated tracks
    this.syncTrackerWithEntities(currentSimMs);

    // 2. Generate RF measurements for emitting active targets
    this.rfMeasurements = [];
    const isJamming = this.sensorHealth.RF === 'OUT';
    for (let i = 0; i < this.curr.length; i++) {
      const e = this.curr[i];
      if (e.lifecycle === 'ACTIVE' && e.emitsRf) {
        const rfMeas = generateRfMeasurement({
          entity: e,
          entityIndex: i,
          timestampMs: currentSimMs,
          scenarioSeed: this.spec.seed,
          sensorHealth: this.sensorHealth.RF,
          isJamming,
        });
        if (rfMeas) {
          this.rfMeasurements.push(rfMeas);
          this.tracker.updateWithRf(rfMeas);
        }
      }
    }

    // 3. Generate EO/IR optical observation measurements
    if (this.sensorHealth.EOIR !== 'OUT') {
      const isNight = this.spec.dayNight === 'NIGHT';
      for (let i = 0; i < this.curr.length; i++) {
        const e = this.curr[i];
        if (e.trackNo && e.step !== 'UNDETECTED' && (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED')) {
          const eoirMeas = generateEoirMeasurement({
            entity: e,
            entityIndex: i,
            tickIndex: this.tickIndex,
            timestampMs: currentSimMs,
            scenarioSeed: this.spec.seed,
            context: {
              activeSensor: this.activeSensor,
              sensorHealth: this.sensorHealth,
              isNight,
              currentSimMs,
            },
          });
          if (eoirMeas) {
            this.tracker.updateWithEoir(eoirMeas);
          }
        }
      }
    }
  }

  public getOperatorTracks(): OperatorTrackView[] {
    return this.tracker.getOperatorTracks();
  }

  private emitPeriodicSnapshot(): void {
    const liveEntities = this.curr
      .filter((e) => e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED')
      .map((e) => {
        const est = e.trackNo ? this.tracker.getTrackEstimate(e.trackNo) : undefined;
        return {
          id: e.id,
          tNo: e.trackNo,
          x: Math.round(e.pos.x),
          y: Math.round(e.pos.y),
          z: Math.round(e.pos.z),
          estX: est ? Math.round(est.estPos.x) : undefined,
          estY: est ? Math.round(est.estPos.y) : undefined,
          estZ: est ? Math.round(est.estPos.z) : undefined,
          estUncertM: est ? Math.round(est.uncertaintyM) : undefined,
          isCoasting: est ? est.isCoasting : false,
          step: e.step,
          q: Number(e.q.toFixed(2)),
          lbl: e.traineeLabel ?? 'NONE',
          trueClass: e.trueClass,
        };
      });

    this.appendEvent('SNAPSHOT', { entities: liveEntities });
  }

  private handleAction(item: UserAction): void {
    const { action, tRawMs } = item;
    switch (action.type) {
      case 'DESIGNATE':
        this.handleDesignate(action, tRawMs);
        break;
      case 'CLASSIFY':
        this.handleClassify(action, tRawMs);
        break;
      case 'SELECT_EFFECTOR':
        this.activeEffector = action.effectorId;
        break;
      case 'FIRE':
        this.handleFire(action, tRawMs);
        break;
      case 'ASSESS': {
        const target = this.curr.find((e) => e.trackNo === action.trackNo);
        if (target) {
          if (action.result === 'KILL') {
            target.step = 'CLOSED';
          } else if (action.result === 'NO_KILL') {
            target.step = target.lifecycle === 'NEUTRALISED' ? 'CLOSED' : 'TARGET';
          }
          this.appendEvent('ASSESS', { result: action.result }, action.trackNo, target.id, tRawMs);
        }
        break;
      }
      case 'SET_SENSOR':
        this.activeSensor = action.mode;
        this.appendEvent('SENSOR_SWITCH', { mode: action.mode }, undefined, undefined, tRawMs);
        break;
      case 'SET_EOIR_AZIMUTH':
        this.eoirAzimuthDeg = (action.deg + 360) % 360;
        break;
      case 'CYCLE_TRACK':
        this.handleCycleTrack(action.direction);
        break;
      case 'PAUSE':
        this.appendEvent('SESSION_PAUSE', {});
        break;
      case 'RESUME':
        this.appendEvent('SESSION_RESUME', {});
        break;
    }
  }

  private handleDesignate(action: { trackNo: string; via: 'KEY' | 'CLICK' }, tRawMs?: number): void {
    this.selectedTrackNo = action.trackNo;
    const target = this.curr.find((e) => e.trackNo === action.trackNo);
    if (!target) return;

    // Disallow instant UNDETECTED to FIX transitions (ARCHITECTURE.md 3.3 / PRD 3.4)
    if (target.step === 'UNDETECTED') {
      return;
    }

    if (
      canTransition(target.step, 'FIX', {
        q: target.q,
        isDesignated: true,
        hasNonUnknownLabel: target.traineeLabel !== null && target.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        isNeutralised: target.lifecycle === 'NEUTRALISED',
        isLeaked: target.lifecycle === 'LEAKED',
      })
    ) {
      target.step = 'FIX';
      target.tDesig ??= this.tickIndex * 50;
      this.appendEvent('DESIGNATE', { via: action.via }, action.trackNo, target.id, tRawMs);
    }
  }

  private handleClassify(action: { trackNo: string; label: TrackClass }, tRawMs?: number): void {
    const target = this.curr.find((e) => e.trackNo === action.trackNo);
    if (!target) return;

    target.traineeLabel = action.label;
    target.tCls ??= this.tickIndex * 50;

    const hasNonUnknown = action.label !== 'UNKNOWN_EVIDENCE_INSUFFICIENT';
    if (
      canTransition(target.step, 'TARGET', {
        q: target.q,
        isDesignated: target.tDesig !== null,
        hasNonUnknownLabel: hasNonUnknown,
        isNeutralised: target.lifecycle === 'NEUTRALISED',
        isLeaked: target.lifecycle === 'LEAKED',
      })
    ) {
      target.step = 'TARGET';
    }

    this.appendEvent(
      'CLASSIFY',
      { label: action.label, cCls: target.cCls },
      action.trackNo,
      target.id,
      tRawMs
    );
  }

  private handleFire(action: { trackNo: string }, tRawMs?: number): void {
    const currentSimMs = this.tickIndex * 50;
    const target = this.curr.find((e) => e.trackNo === action.trackNo);
    if (!target) {
      this.emitFeedback(
        createOperatorFeedback({
          category: 'RELEASE_BLOCKED',
          reasonCode: 'TRACK_NOT_FOUND',
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
        })
      );
      return;
    }
    if (target.lifecycle !== 'ACTIVE' || target.step === 'CLOSED') {
      const reason =
        target.step === 'CLOSED' || target.lifecycle === 'LEAKED'
          ? 'PNR_VIOLATION'
          : 'INACTIVE_TARGET';
      const est = this.tracker.getTrackEstimate(action.trackNo);
      this.appendEvent(
        'RELEASE_BLOCKED',
        { reason, effector: this.activeEffector, rangeM: Math.hypot(target.pos.x, target.pos.y) },
        action.trackNo,
        target.id,
        tRawMs
      );
      this.emitFeedback(
        createOperatorFeedback({
          category: 'RELEASE_BLOCKED',
          reasonCode: reason,
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
          rangeM: est?.estRangeM,
        })
      );
      return;
    }

    if (target.step === 'ASSESS') {
      this.emitFeedback(
        createOperatorFeedback({
          category: 'RELEASE_BLOCKED',
          reasonCode: 'DUPLICATE_PENDING_FIRE',
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
        })
      );
      return;
    }

    const rangeM = Math.hypot(target.pos.x, target.pos.y);
    const est = this.tracker.getTrackEstimate(action.trackNo);
    const operatorRangeM = est?.estRangeM;
    const zones = this.spec?.zones || [];
    const isJammingActive = this.sensorHealth.RF === 'OUT';
    const isFogActive = this.sensorHealth.EOIR === 'DEG';

    // 1. Evaluate release gating (Hard blocks vs Soft gates)
    const gating = evaluateReleaseGating({
      target,
      effectorId: this.activeEffector,
      rangeM,
      zones,
      isJammingActive,
    });

    // Hard blocks prevent fire entirely
    if (gating.isHardBlocked) {
      const reason = gating.hardBlockReason || 'OUT_OF_ENVELOPE';
      this.appendEvent(
        'RELEASE_BLOCKED',
        {
          reason,
          effector: this.activeEffector,
          rangeM,
          q: target.q,
        },
        action.trackNo,
        target.id,
        tRawMs
      );
      this.emitFeedback(
        createOperatorFeedback({
          category: 'RELEASE_BLOCKED',
          reasonCode: reason,
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
          targetQ: target.q,
          rangeM: operatorRangeM,
          isJammingActive,
        })
      );
      return;
    }

    // 2. Log soft ROE violations
    for (const v of gating.violations) {
      this.appendEvent('ROE_VIOLATION', { reason: v, trackNo: action.trackNo }, action.trackNo, target.id);
      this.emitFeedback(
        createOperatorFeedback({
          category: 'ROE_WARNING',
          reasonCode: v,
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
          rangeM: operatorRangeM,
        })
      );
    }

    // 3. Log live CER / Unfavourable exchange flag if CER > 10
    if (gating.isUnfavourableCer) {
      this.appendEvent('FLAG', { type: 'UNFAVOURABLE_EXCHANGE', cer: gating.cer, trackNo: action.trackNo }, action.trackNo, target.id);
    }

    // 4. Resolve combat with seeded kill PRNG
    target.tEng = this.tickIndex * 50;
    target.engagements += 1;
    target.weaponUsed = this.activeEffector;

    const killDraw = resolveEngagement(
      this.activeEffector,
      rangeM,
      target,
      this.killRng ?? (() => 0.5),
      { isFogActive, isJammingActive }
    );

    const effConfig = CONFIG.effectors[this.activeEffector];
    this.appendEvent(
      'ENGAGE',
      {
        effector: this.activeEffector,
        rangeM,
        pk: killDraw.pk,
        u: killDraw.u,
        killed: killDraw.killed,
        pk0: killDraw.pk0,
        g: killDraw.g,
        h: killDraw.h,
        costInr: effConfig?.costInr ?? 0,
        cer: gating.cer,
        roeGate: gating.roeGate,
        zoneId: gating.overlappingZone?.id,
        rhoZone: gating.overlappingZone?.rho ?? 0,
        targetPos: { x: target.pos.x, y: target.pos.y, z: target.pos.z },
      },
      action.trackNo,
      target.id,
      tRawMs
    );

    target.step = killDraw.killed ? 'ASSESS' : 'TARGET';
    if (killDraw.killed) target.lifecycle = 'NEUTRALISED';
    this.appendEvent('ENGAGE_RESULT', { killed: killDraw.killed, u: killDraw.u, pk: killDraw.pk }, action.trackNo, target.id);

    // Operator feedback on outcome
    if (killDraw.killed) {
      this.emitFeedback(
        createOperatorFeedback({
          category: 'NEUTRALIZATION_INDICATED',
          reasonCode: 'NEUTRALIZATION_INDICATED',
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
          rangeM: operatorRangeM,
        })
      );
    } else {
      this.emitFeedback(
        createOperatorFeedback({
          category: 'ENGAGEMENT_UNSUCCESSFUL',
          reasonCode: 'ENGAGEMENT_UNSUCCESSFUL',
          timestampMs: currentSimMs,
          trackNo: action.trackNo,
          effectorId: this.activeEffector,
          rangeM: operatorRangeM,
        })
      );
    }
  }

  private handleCycleTrack(direction: 'NEXT' | 'PREV'): void {
    const activeTracks = this.curr.filter((e) => e.trackNo && e.lifecycle === 'ACTIVE');
    if (activeTracks.length === 0) return;

    const currentIndex = activeTracks.findIndex((e) => e.trackNo === this.selectedTrackNo);
    const stepOffset = direction === 'NEXT' ? 1 : -1;
    const nextIndex = (currentIndex + stepOffset + activeTracks.length) % activeTracks.length;
    this.selectedTrackNo = activeTracks[nextIndex].trackNo;
  }

  public buildUiSnapshot(): UiSnapshot {
    const simTimeMs = this.tickIndex * 50;
    this.syncTrackerWithEntities(simTimeMs);
    const totalSec = Math.floor(simTimeMs / 1000);
    const msRemainder = simTimeMs % 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const formattedClock = `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(msRemainder).padStart(3, '0')}`;

    const rMin = this.spec?.asset.rMinM ?? CONFIG.thresholds.rMinM;
    const trackRows: UiTrackRow[] = this.tracker
      .getOperatorTracks()
      .map((e) => {
        const rangeM = e.estRangeM;
        const bearingDeg = e.estBearingDeg;
        const speedMps = e.estSpeedMps;
        const distToPnr = Math.max(0, rangeM - rMin);
        const timeToPnrSec = speedMps > 1 ? Number((distToPnr / speedMps).toFixed(1)) : 999;

        const shortCode = e.traineeLabel ? (SHORT_CODES[e.traineeLabel] || 'UNK') : 'NON';

        return {
          trackNo: e.trackNo,
          label: e.traineeLabel,
          shortCode,
          rangeKm: Number((rangeM / 1000).toFixed(2)),
          bearingDeg,
          speedMps,
          step: e.step,
          statusPill: e.isCoasting ? 'COAST' : e.step,
          timeToPnrSec,
          q: Number(e.q.toFixed(2)),
          cCls: Number(e.cCls.toFixed(2)),
          isHostile: e.traineeLabel ? isHostile(e.traineeLabel) : false,
        };
      })
      .sort((a, b) => a.timeToPnrSec - b.timeToPnrSec)
      .slice(0, 150);

    const selectedTrack = trackRows.find((r) => r.trackNo === this.selectedTrackNo) || null;

    return {
      tick: this.tickIndex,
      simTimeMs,
      formattedClock,
      activeSensor: this.activeSensor,
      selectedTrackNo: this.selectedTrackNo,
      selectedTrack,
      trackRows,
      sensorHealth: { ...this.sensorHealth },
      roeText: this.spec?.roeText || 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED',
      isPaused: clockInstance.getPaused(),
      recentEvents: this.getOperatorEvents(),
      mode: this.spec?.mode || 'TRAIN',
      difficulty: this.spec?.difficulty || 0.3,
      activeEffector: this.activeEffector,
    };
  }

  /**
   * Returns a sanitized stream of recent events projected for the operator interface (Domain C).
   * Strictly filters out raw ground-truth secrets (trueClass, targetPos, pk, u, monetary values)
   * and excludes internal keyframes (SNAPSHOT, SPAWN, TRIGGER) to prevent event displacement.
   */
  public getOperatorEvents(): OperatorEventView[] {
    return this.events
      .filter((ev) => OPERATOR_FACING_EVENT_TYPES.has(ev.type))
      .slice(-8)
      .map((ev) => this.toOperatorEventView(ev));
  }

  private toOperatorEventView(ev: SimEvent): OperatorEventView {
    const est = ev.trackNo ? this.tracker.getTrackEstimate(ev.trackNo) : undefined;
    const estRangeM = est ? est.estRangeM : undefined;
    const category = this.getEventCategory(ev.type);
    const message = this.formatOperatorEventMessage(ev, estRangeM);

    // Strictly sanitized payload containing zero simulation ground-truth secrets
    const safePayload: Record<string, unknown> = {};
    if (ev.trackNo) safePayload.trackNo = ev.trackNo;
    if (typeof ev.payload.effector === 'string') safePayload.effector = ev.payload.effector;
    if (typeof ev.payload.killed === 'boolean') safePayload.killed = ev.payload.killed;
    if (typeof ev.payload.reason === 'string') safePayload.reason = ev.payload.reason;
    if (typeof ev.payload.mode === 'string') safePayload.mode = ev.payload.mode;
    if (typeof ev.payload.type === 'string') safePayload.type = ev.payload.type;
    if (typeof ev.payload.via === 'string') safePayload.via = ev.payload.via;
    if (typeof ev.payload.label === 'string') safePayload.label = ev.payload.label;
    if (estRangeM !== undefined) safePayload.rangeKm = Number((estRangeM / 1000).toFixed(2));

    return {
      id: `${ev.seq}_${ev.tMs}`,
      seq: ev.seq,
      tMs: ev.tMs,
      type: ev.type,
      trackNo: ev.trackNo,
      category,
      message,
      estRangeM,
      payload: safePayload,
    };
  }

  private getEventCategory(type: SimEventType): OperatorEventCategory {
    switch (type) {
      case 'DETECT':
      case 'TRACK_INIT':
        return 'DETECTION';
      case 'MASKED':
      case 'REACQUIRE':
      case 'DESIGNATE':
      case 'CLASSIFY':
        return 'TRACK';
      case 'ENGAGE':
      case 'ENGAGE_RESULT':
      case 'RELEASE_BLOCKED':
      case 'ASSESS':
        return 'ENGAGEMENT';
      case 'ROE_VIOLATION':
      case 'FLAG':
      case 'LEAK':
        return 'ROE';
      case 'SENSOR_SWITCH':
        return 'SENSOR';
      default:
        return 'SYSTEM';
    }
  }

  private formatOperatorEventMessage(ev: SimEvent, estRangeM?: number): string {
    const trk = ev.trackNo ? `TRK ${ev.trackNo} ` : '';
    const rng = estRangeM !== undefined ? ` | RNG ${(estRangeM / 1000).toFixed(2)}km` : '';

    switch (ev.type) {
      case 'DETECT':
        return `${trk}SIGNAL DETECTED`;
      case 'TRACK_INIT':
        return `${trk}TRACK ESTABLISHED${rng}`;
      case 'MASKED':
        return `${trk}SIGNAL MASKED / COASTING`;
      case 'REACQUIRE':
        return `${trk}SIGNAL REACQUIRED`;
      case 'DESIGNATE':
        return `${trk}DESIGNATED VIA ${String(ev.payload.via ?? 'SYSTEM')}`;
      case 'CLASSIFY':
        return `${trk}CLASSIFIED AS ${String(ev.payload.label ?? 'UNKNOWN')}`;
      case 'ENGAGE':
        return `${trk}ENGAGED WITH ${String(ev.payload.effector ?? 'WEAPON')}${rng}`;
      case 'ENGAGE_RESULT':
        return `${trk}${ev.payload.killed ? 'NEUTRALIZATION INDICATED' : 'ENGAGEMENT INEFFECTIVE'}`;
      case 'RELEASE_BLOCKED':
        return `RELEASE BLOCKED: ${String(ev.payload.reason ?? 'UNKNOWN')}`;
      case 'ROE_VIOLATION':
        return `ROE VIOLATION: ${String(ev.payload.reason ?? 'CRITERIA NOT MET')}`;
      case 'FLAG':
        return `TACTICAL FLAG: ${String(ev.payload.type ?? 'ALERT')}`;
      case 'LEAK':
        return `PERIMETER BREACH DETECTED`;
      case 'CHAOS_ON':
        return `ENVIRONMENTAL DEGRADATION ACTIVE`;
      case 'CHAOS_OFF':
        return `ENVIRONMENTAL CONDITIONS NORMAL`;
      case 'SENSOR_SWITCH':
        return `SENSOR SWITCHED TO ${String(ev.payload.mode ?? '')}`;
      case 'SESSION_PAUSE':
        return `SIMULATION PAUSED`;
      case 'SESSION_RESUME':
        return `SIMULATION RESUMED`;
      case 'SESSION_END':
        return `SESSION COMPLETED`;
      default:
        return `${ev.type} ${trk}`.trim();
    }
  }
}

import type {
  ScenarioSpec,
  TrackEntity,
  SimEvent,
  SimEventType,
  UserAction,
  SensorMode,
  EffectorId,
  TrackClass,
} from './types';
import { InputQueue } from './inputQueue';
import { streamSeed, mulberry32 } from './rng';
import { clockInstance } from './clock';
import { SHORT_CODES, isHostile } from './taxonomy';
import { CONFIG } from '@/config';
import { canTransition, evaluateReleaseGating } from './roe';
import { resolveEngagement } from './effectors';
import { aggregateAARMetrics } from './metrics';

export type SensorHealthStatus = 'OK' | 'DEG' | 'OUT';

export interface UiTrackRow {
  trackNo: string;
  label: string;
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
  recentEvents: SimEvent[];
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

  public activeSensor: SensorMode = 'RADAR';
  public selectedTrackNo: string | null = null;
  public activeEffector: EffectorId = 'RF_SOFTKILL';
  public eoirAzimuthDeg: number = 0;

  public sensorHealth: {
    RADAR: SensorHealthStatus;
    EOIR: SensorHealthStatus;
    RF: SensorHealthStatus;
  } = {
    RADAR: 'OK',
    EOIR: 'OK',
    RF: 'OK',
  };

  private killRng: (() => number) | null = null;

  public load(spec: ScenarioSpec): void {
    this.spec = spec;
    this.tickIndex = 0;
    this.eventSeq = 0;
    this.events = [];
    this.inputQueue.clear();
    this.activeSensor = 'RADAR';
    this.selectedTrackNo = null;
    this.activeEffector = 'RF_SOFTKILL';
    this.eoirAzimuthDeg = 0;
    this.killRng = mulberry32(streamSeed(spec.seed, 'kill'));
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
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'FIND',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: s.spawnTMs,
        tTrk: s.spawnTMs,
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

    // Default select first track
    if (this.curr.length > 0) {
      this.selectedTrackNo = this.curr[0].trackNo;
    }

    // Log SIM_START event
    this.appendEvent('SIM_START', {
      scenarioId: spec.id,
      seed: spec.seed,
      mode: spec.mode,
      difficulty: spec.difficulty,
    });
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
    return event;
  }

  public step(): void {
    if (!this.spec) return;

    this.tickIndex += 1;
    const currentSimMs = this.tickIndex * 50;

    // 1. Drain quantised user inputs for this tick
    const actions = this.inputQueue.drainForTick(this.tickIndex);
    for (const item of actions) {
      this.handleAction(item);
    }

    // 2. Clone previous state for interpolation
    this.prev = this.curr.map((e) => ({
      ...e,
      pos: { ...e.pos },
      vel: { ...e.vel },
    }));

    // 3. Update active entities and check leak conditions
    this.updateEntities(currentSimMs);

    // 4. Periodic snapshot keyframe every 250ms (5 ticks) for instant AAR scrubbing
    if (this.tickIndex % 5 === 0) {
      this.emitPeriodicSnapshot();
    }

    // 5. Check session completion
    if (currentSimMs >= this.spec.durationMs) {
      const finalMetrics = aggregateAARMetrics(this.events, this.spec);
      this.appendEvent('SESSION_END', { durationMs: currentSimMs, metrics: finalMetrics });
    }
  }

  private updateEntities(currentSimMs: number): void {
    if (!this.spec) return;
    const rMinM = this.spec.asset.rMinM || CONFIG.thresholds.rMinM;
    const qMin = CONFIG.thresholds.qMin;

    for (const entity of this.curr) {
      if (entity.lifecycle !== 'ACTIVE') continue;

      entity.pos.x += entity.vel.x * 0.05;
      entity.pos.y += entity.vel.y * 0.05;
      entity.pos.z += entity.vel.z * 0.05;

      const rangeM = Math.hypot(entity.pos.x, entity.pos.y);
      if (rangeM <= rMinM && entity.tPnr === null) {
        entity.tPnr = currentSimMs;
        const nonHostile = entity.trueClass === 'FRIENDLY' || entity.trueClass === 'CIVIL_UAS' || entity.trueClass === 'BIRD';
        if (!nonHostile) {
          entity.lifecycle = 'LEAKED';
          entity.step = 'CLOSED';
          this.appendEvent('LEAK', { rangeM, trueClass: entity.trueClass }, entity.trackNo ?? undefined, entity.id);
        }
      }

      // Demotion Guard: q < Q_min returns tracked entities to FIX (Rules.md SC-10, R-14)
      if (entity.q < qMin && (entity.step === 'TRACK' || entity.step === 'TARGET')) {
        entity.step = 'FIX';
      }
    }
  }

  private emitPeriodicSnapshot(): void {
    const liveEntities = this.curr
      .filter((e) => e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED')
      .map((e) => ({
        id: e.id,
        tNo: e.trackNo,
        x: Math.round(e.pos.x),
        y: Math.round(e.pos.y),
        z: Math.round(e.pos.z),
        step: e.step,
        q: Number(e.q.toFixed(2)),
        lbl: e.traineeLabel,
      }));

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

    if (target.tDesig === null) {
      target.tDesig = this.tickIndex * 50;
    }

    if (
      canTransition(target.step, 'FIX', {
        q: target.q,
        isDesignated: true,
        hasNonUnknownLabel: target.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        isNeutralised: target.lifecycle === 'NEUTRALISED',
        isLeaked: target.lifecycle === 'LEAKED',
      })
    ) {
      target.step = 'FIX';
    }

    this.appendEvent('DESIGNATE', { via: action.via }, action.trackNo, target.id, tRawMs);
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
    const target = this.curr.find((e) => e.trackNo === action.trackNo);
    if (!target) return;

    const rangeM = Math.hypot(target.pos.x, target.pos.y);
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
      return;
    }

    // 2. Log soft ROE violations
    for (const v of gating.violations) {
      this.appendEvent('ROE_VIOLATION', { reason: v, trackNo: action.trackNo }, action.trackNo, target.id);
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

    this.appendEvent(
      'ENGAGE',
      {
        effector: this.activeEffector,
        rangeM,
        pk: killDraw.pk,
        u: killDraw.u,
        killed: killDraw.killed,
        cer: gating.cer,
        roeGate: gating.roeGate,
        zoneId: gating.overlappingZone?.id,
        rhoZone: gating.overlappingZone?.rho ?? 0,
      },
      action.trackNo,
      target.id,
      tRawMs
    );

    target.step = killDraw.killed ? 'ASSESS' : 'TARGET';
    if (killDraw.killed) target.lifecycle = 'NEUTRALISED';
    this.appendEvent('ENGAGE_RESULT', { killed: killDraw.killed, u: killDraw.u, pk: killDraw.pk }, action.trackNo, target.id);
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
    const totalSec = Math.floor(simTimeMs / 1000);
    const msRemainder = simTimeMs % 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const formattedClock = `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(msRemainder).padStart(3, '0')}`;

    const trackRows: UiTrackRow[] = this.curr
      .filter((e) => e.trackNo && (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED'))
      .map((e) => {
        const rangeM = Math.hypot(e.pos.x, e.pos.y);
        const bearingRad = Math.atan2(e.pos.x, e.pos.y);
        let bearingDeg = Math.round((bearingRad * 180) / Math.PI);
        if (bearingDeg < 0) bearingDeg += 360;

        const speedMps = Math.round(Math.hypot(e.vel.x, e.vel.y));
        const rMin = this.spec?.asset.rMinM ?? CONFIG.thresholds.rMinM;
        const distToPnr = Math.max(0, rangeM - rMin);
        const timeToPnrSec = speedMps > 0 ? Number((distToPnr / speedMps).toFixed(1)) : 999;

        const shortCode = SHORT_CODES[e.traineeLabel] || 'UNK';

        return {
          trackNo: e.trackNo!,
          label: e.traineeLabel,
          shortCode,
          rangeKm: Number((rangeM / 1000).toFixed(2)),
          bearingDeg,
          speedMps,
          step: e.step,
          statusPill: e.masked ? 'COAST' : e.step,
          timeToPnrSec,
          q: Number(e.q.toFixed(2)),
          cCls: Number(e.cCls.toFixed(2)),
          isHostile: isHostile(e.traineeLabel),
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
      recentEvents: this.events.slice(-8),
      mode: this.spec?.mode || 'TRAIN',
      difficulty: this.spec?.difficulty || 0.3,
      activeEffector: this.activeEffector,
    };
  }
}

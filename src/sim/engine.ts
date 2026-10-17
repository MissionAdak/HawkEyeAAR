/**
 * DRISHTI-CUAS Simulation Engine (20 Hz Fixed Timestep Core)
 *
 * Rules: DT-1, DT-2, DT-3, DT-4, DT-5, DT-6, DT-7
 * State changes only inside engine.step() once per 50 ms tick.
 * Render code is read-only.
 * All trainee inputs are drained and applied at their quantised tick boundaries.
 */

import type {
  ScenarioSpec,
  TrackEntity,
  SimEvent,
  SimEventType,
  SensorMode,
  EffectorId,
} from './types';
import { TICK_MS, DT } from './clock';
import { InputQueue, type TraineeAction } from './inputQueue';
import { createStream } from './rng';

export interface UiTrackRow {
  trackNo: string;
  label: string;
  shortCode: string;
  rangeKm: number;
  bearingDeg: number;
  speedMps: number;
  status: string;
  q: number;
  cCls: number;
  step: string;
  isHostile: boolean;
  masked: boolean;
}

export interface UiSnapshot {
  tick: number;
  simTimeMs: number;
  sensorMode: SensorMode;
  selectedTrackNo: string | null;
  activeEffector: EffectorId | null;
  tracks: UiTrackRow[];
  sensorHealth: {
    radar: 'OK' | 'DEG' | 'OUT';
    eoir: 'OK' | 'DEG' | 'OUT';
    rf: 'OK' | 'DEG' | 'OUT';
  };
  recentEvents: SimEvent[];
  roeBanner: string;
  isComplete: boolean;
  isPaused: boolean;
}

export class SimEngine {
  public curr: TrackEntity[] = [];
  public prev: TrackEntity[] = [];
  public events: SimEvent[] = [];

  public currentTick = 0;
  public simTimeMs = 0;
  public spec: ScenarioSpec | null = null;
  public inputQueue = new InputQueue();

  public selectedTrackNo: string | null = null;
  public sensorMode: SensorMode = 'RADAR';
  public activeEffector: EffectorId | null = null;

  public isPaused = false;
  public isComplete = false;

  private eventSeq = 0;
  private nextTrackIdNum = 1;

  // PRNG streams
  private killStream: (() => number) | null = null;

  /**
   * Initializes and loads a scenario specification into the engine.
   */
  public load(spec: ScenarioSpec): void {
    this.spec = spec;
    this.currentTick = 0;
    this.simTimeMs = 0;
    this.eventSeq = 0;
    this.nextTrackIdNum = 1;
    this.selectedTrackNo = null;
    this.sensorMode = 'RADAR';
    this.activeEffector = null;
    this.isPaused = false;
    this.isComplete = false;

    this.inputQueue.clear();
    this.events = [];
    this.curr = [];
    this.prev = [];

    // Initialize PRNG streams
    this.killStream = createStream(spec.seed, 'kill');

    // Spawn dormant threats from spec
    const allSpawns = [...spec.threats, ...spec.decoys];
    for (const spawn of allSpawns) {
      const initialPos = spawn.waypoints[0] ?? { x: 0, y: 0, z: 100 };
      const entity: TrackEntity = {
        id: spawn.id,
        trackNo: null,
        trueClass: spawn.trueClass,
        droneType: spawn.droneType,
        pos: { ...initialPos },
        prev: { ...initialPos },
        vel: { x: 0, y: 0, z: 0 },
        rcsM2: spawn.rcsM2,
        valueInr: spawn.valueInr,
        emitsRf: spawn.emitsRf,
        remoteId: spawn.remoteId,
        iff: spawn.iff,
        profile: spawn.profile,
        spawnTMs: spawn.spawnTMs,
        lifecycle: 'DORMANT',
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'UNDETECTED',
        q: 0,
        cCls: 0,
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
      this.prev.push({ ...entity, pos: { ...entity.pos }, prev: { ...entity.prev }, vel: { ...entity.vel } });
    }

    this.logEvent('SIM_START', {
      scenarioId: spec.id,
      seed: spec.seed,
      difficulty: spec.difficulty,
      mode: spec.mode,
    });
  }

  /**
   * Advances simulation by exactly one fixed 50 ms tick.
   * Rule DT-1: Sim state changes only inside engine.step().
   */
  public step(): UiSnapshot {
    if (!this.spec || this.isComplete || this.isPaused) {
      return this.snapshot();
    }

    this.currentTick++;
    this.simTimeMs = this.currentTick * TICK_MS;

    // 1. Copy curr to prev for interpolation (avoiding full heap allocation)
    for (let i = 0; i < this.curr.length; i++) {
      const c = this.curr[i];
      const p = this.prev[i];
      p.pos.x = c.pos.x;
      p.pos.y = c.pos.y;
      p.pos.z = c.pos.z;
      p.vel.x = c.vel.x;
      p.vel.y = c.vel.y;
      p.vel.z = c.vel.z;
      p.q = c.q;
      p.step = c.step;
      p.lifecycle = c.lifecycle;
      p.masked = c.masked;
    }

    // 2. Drain and apply inputs quantised to this tick
    const inputs = this.inputQueue.drainForTick(this.currentTick);
    for (const input of inputs) {
      this.applyInput(input.action, input.tRawMs, input.applyTick);
    }

    // 3. Spawning and kinematics
    for (const entity of this.curr) {
      if (entity.lifecycle === 'DORMANT' && this.simTimeMs >= entity.spawnTMs) {
        entity.lifecycle = 'ACTIVE';
        entity.step = 'FIND';
        // Compute initial velocity towards origin (asset)
        const range = Math.hypot(entity.pos.x, entity.pos.y);
        const spawnSpec = [...this.spec.threats, ...this.spec.decoys].find((s) => s.id === entity.id);
        const speed = spawnSpec?.speedMps ?? 20;
        if (range > 1) {
          entity.vel.x = (-entity.pos.x / range) * speed;
          entity.vel.y = (-entity.pos.y / range) * speed;
        }
        // Auto-assign track number on activation (Phase 0 skeleton)
        if (!entity.trackNo) {
          entity.trackNo = `T-${String(this.nextTrackIdNum++).padStart(2, '0')}`;
          entity.tTrk = this.simTimeMs;
          this.logEvent('TRACK_INIT', { trackNo: entity.trackNo, entityId: entity.id }, entity.trackNo, entity.id);
        }
        this.logEvent('SPAWN', { entityId: entity.id, droneType: entity.droneType }, entity.trackNo ?? undefined, entity.id);
      }

      if (entity.lifecycle === 'ACTIVE') {
        entity.pos.x += entity.vel.x * DT;
        entity.pos.y += entity.vel.y * DT;
        entity.pos.z += entity.vel.z * DT;

        // Check PNR (Point of No Return = asset.rMinM)
        const dist = Math.hypot(entity.pos.x, entity.pos.y);
        if (dist <= this.spec.asset.rMinM && entity.step !== 'CLOSED') {
          entity.tPnr = this.simTimeMs;
          entity.lifecycle = 'LEAKED';
          entity.step = 'CLOSED';
          this.logEvent('LEAK', { trackNo: entity.trackNo, entityId: entity.id, distM: dist }, entity.trackNo ?? undefined, entity.id);
        }
      }
    }

    // 4. Periodic Snapshot every 250 ms (5 ticks) for event-sourced instant scrub
    if (this.currentTick % 5 === 0) {
      const liveEntities = this.curr
        .filter((e) => e.lifecycle === 'ACTIVE')
        .map((e) => [e.id, Math.round(e.pos.x), Math.round(e.pos.y), Math.round(e.pos.z), e.step, Math.round(e.q * 100)]);

      this.logEvent('SNAPSHOT', { entities: liveEntities });
    }

    // 5. Check session completion
    if (this.simTimeMs >= this.spec.durationMs) {
      this.isComplete = true;
      this.logEvent('SESSION_END', { durationMs: this.simTimeMs });
    }

    return this.snapshot();
  }

  /**
   * Applies trainee action to sim state.
   */
  public applyInput(action: TraineeAction, tRawMs?: number, _applyTick?: number): void {
    switch (action.type) {
      case 'DESIGNATE': {
        const track = this.curr.find((t) => t.trackNo === action.trackNo);
        if (track && track.step === 'FIND') {
          track.step = 'FIX';
          track.tDesig = this.simTimeMs;
          this.selectedTrackNo = action.trackNo;
          this.logEvent('DESIGNATE', { trackNo: action.trackNo, via: action.via }, action.trackNo, track.id, tRawMs);
        }
        break;
      }
      case 'CLASSIFY': {
        const track = this.curr.find((t) => t.trackNo === action.trackNo);
        if (track) {
          track.traineeLabel = action.label;
          track.tCls = this.simTimeMs;
          if (track.step === 'FIX' || track.step === 'TRACK') {
            track.step = 'TARGET';
          }
          this.logEvent(
            'CLASSIFY',
            { trackNo: action.trackNo, label: action.label, cClsShown: track.cCls },
            action.trackNo,
            track.id,
            tRawMs
          );
        }
        break;
      }
      case 'SELECT_EFFECTOR': {
        this.activeEffector = action.effector;
        break;
      }
      case 'ENGAGE': {
        const track = this.curr.find((t) => t.trackNo === action.trackNo);
        if (track && track.lifecycle === 'ACTIVE') {
          track.tEng = this.simTimeMs;
          track.engagements++;
          track.weaponUsed = action.effector;
          track.step = 'ENGAGE';

          // Draw deterministic kill outcome
          const u = this.killStream ? this.killStream() : 0.5;
          const pk = 0.8; // Notional Pk baseline for Phase 0
          const killed = u < pk;

          this.logEvent(
            'ENGAGE',
            { trackNo: action.trackNo, effector: action.effector },
            action.trackNo,
            track.id,
            tRawMs
          );

          if (killed) {
            track.lifecycle = 'NEUTRALISED';
          }
          track.step = 'ASSESS';

          this.logEvent(
            'ENGAGE_RESULT',
            { trackNo: action.trackNo, effector: action.effector, u, pk, killed },
            action.trackNo,
            track.id
          );
        }
        break;
      }
      case 'ASSESS': {
        const track = this.curr.find((t) => t.trackNo === action.trackNo);
        if (track) {
          track.step = 'CLOSED';
          this.logEvent('ASSESS', { trackNo: action.trackNo, result: action.result }, action.trackNo, track.id, tRawMs);
        }
        break;
      }
      case 'SENSOR_SWITCH': {
        this.sensorMode = action.mode;
        this.logEvent('SENSOR_SWITCH', { mode: action.mode }, undefined, undefined, tRawMs);
        break;
      }
      case 'PAUSE': {
        this.isPaused = true;
        this.logEvent('SESSION_PAUSE', {});
        break;
      }
      case 'RESUME': {
        this.isPaused = false;
        this.logEvent('SESSION_RESUME', {});
        break;
      }
    }
  }

  /**
   * Logs a deterministic SimEvent with monotonic sequence and scored sim time tMs.
   */
  public logEvent(
    type: SimEventType,
    payload: Record<string, unknown>,
    trackNo?: string,
    entityId?: string,
    tRawMs?: number
  ): SimEvent {
    const event: SimEvent = {
      seq: ++this.eventSeq,
      tMs: this.simTimeMs,
      tRawMs,
      type,
      trackNo,
      entityId,
      payload,
    };
    this.events.push(event);
    return event;
  }

  /**
   * Generates lightweight UI snapshot for Zustand store (capped at 150 rows).
   */
  public snapshot(): UiSnapshot {
    const activeTracks = this.curr.filter((e) => e.lifecycle !== 'DORMANT');
    const rows: UiTrackRow[] = activeTracks.slice(0, 150).map((t) => {
      const rangeM = Math.hypot(t.pos.x, t.pos.y);
      let bearingRad = Math.atan2(t.pos.x, t.pos.y);
      if (bearingRad < 0) bearingRad += 2 * Math.PI;
      const bearingDeg = Math.round((bearingRad * 180) / Math.PI);
      const speedMps = Math.round(Math.hypot(t.vel.x, t.vel.y));

      return {
        trackNo: t.trackNo ?? 'T-??',
        label: t.traineeLabel,
        shortCode: t.traineeLabel === 'UNKNOWN_EVIDENCE_INSUFFICIENT' ? 'UNK' : t.traineeLabel.substring(0, 2),
        rangeKm: Number((rangeM / 1000).toFixed(2)),
        bearingDeg,
        speedMps,
        status: t.step,
        q: t.q,
        cCls: t.cCls,
        step: t.step,
        isHostile: t.traineeLabel.startsWith('HOSTILE') || t.traineeLabel === 'SWARM_ELEMENT',
        masked: t.masked,
      };
    });

    return {
      tick: this.currentTick,
      simTimeMs: this.simTimeMs,
      sensorMode: this.sensorMode,
      selectedTrackNo: this.selectedTrackNo,
      activeEffector: this.activeEffector,
      tracks: rows,
      sensorHealth: {
        radar: 'OK',
        eoir: 'OK',
        rf: 'OK',
      },
      recentEvents: this.events.slice(-8),
      roeBanner: 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED',
      isComplete: this.isComplete,
      isPaused: this.isPaused,
    };
  }
}

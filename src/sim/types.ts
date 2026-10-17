/**
 * DRISHTI-CUAS Simulation Contracts & Types
 * Source of truth: ARCHITECTURE.md Section 3.2
 */

import type { TrackClass, TrueClass } from './taxonomy';

export type SensorMode = 'RADAR' | 'EOIR' | 'RF';
export type ZoneType = 'URBAN' | 'RIDGE' | 'FOREST';
export type Profile = 'DIRECT' | 'TERRAIN_HUG' | 'ORBIT_FEINT' | 'SWARM_SATURATE' | 'ERRATIC' | 'LOITER';
export type EffectorId = 'RF_SOFTKILL' | 'LASER' | 'GUN' | 'INTERCEPTOR' | 'MISSILE';
export type ChaosType = 'FOG' | 'JAMMING' | 'RAIN' | 'RADAR_DROPOUT';

export type DroneType =
  | 'RECON_QUAD'
  | 'FPV_ATTACK'
  | 'SWARM_ELEMENT'
  | 'LOITERING_MUNITION'
  | 'CIVIL_UAS'
  | 'BIRD'
  | 'FRIENDLY_UAS';

/** F2T2EA per track. FIND=plot seen, FIX=designated, TRACK=firm (q>=Q_min), TARGET=classified + effector chosen. */
export type F2T2EAStep =
  | 'UNDETECTED'
  | 'FIND'
  | 'FIX'
  | 'TRACK'
  | 'TARGET'
  | 'ENGAGE'
  | 'ASSESS'
  | 'CLOSED';

export interface Vec3 {
  x: number;
  y: number;
  z: number; // metres; z is scalar altitude, used for masking math
}

export type TrackLifecycle = 'DORMANT' | 'ACTIVE' | 'NEUTRALISED' | 'LEAKED' | 'DEPARTED';

export interface TrackEntity {
  id: string; // ground-truth id 'H-1', 'B-1', 'C-1'
  trackNo: string | null; // 'T-01', assigned at TRACK_INIT
  trueClass: TrueClass;
  droneType: DroneType;
  pos: Vec3;
  prev: Vec3; // used for render interpolation
  vel: Vec3;
  rcsM2: number;
  valueInr: number | null;
  emitsRf: boolean;
  remoteId: boolean;
  iff: boolean;
  profile: Profile;
  spawnTMs: number;
  lifecycle: TrackLifecycle;

  // trainee-facing picture (the only data the renderer may draw as classification)
  traineeLabel: TrackClass; // default UNKNOWN_EVIDENCE_INSUFFICIENT
  step: F2T2EAStep;
  q: number; // track quality 0..1 (position data only)
  cCls: number; // classification confidence hint 0..1 (never gates fire)
  masked: boolean;
  coastingSinceMs: number | null;
  ghostSigmaM: number;
  hitHistory: boolean[]; // last 3 sweeps, 2-of-3 initiation

  // timestamps (sim ms, tick-quantised); null until reached
  tVis: number | null;
  tTrk: number | null;
  tDesig: number | null;
  tCls: number | null;
  tEng: number | null;
  tPnr: number | null;
  engagements: number;
  weaponUsed: EffectorId | null;
}

export interface ZoneSpec {
  id: string;
  type: ZoneType;
  polygon: [number, number][]; // metres, CCW
  heightM: number;
  shadowM: number;
  rho: number; // rho 0..1 (ridge/forest = 0)
}

export interface ThreatSpawn {
  id: string;
  droneType: DroneType;
  trueClass: TrueClass;
  spawnTMs: number;
  waypoints: Vec3[];
  speedMps: number;
  profile: Profile;
  rcsM2: number;
  valueInr: number | null;
  emitsRf: boolean;
  remoteId: boolean;
  iff: boolean;
}

export interface ChaosSpec {
  type: ChaosType;
  tStartMs: number;
  tEndMs: number;
  severity: number;
}

export interface TriggerSpec {
  id: string;
  when: {
    kind: 'MDT_EXCEEDS' | 'TRACK_NEUTRALISED' | 'KINETIC_ON_BIRD' | 'NO_SENSOR_SWITCH';
    arg?: number | string;
  };
  action: {
    kind: 'SPAWN' | 'EXTEND_CHAOS';
    spawns?: ThreatSpawn[];
    extendMs?: number;
  };
  maxFires: 1;
}

export interface ScenarioSpec {
  id: string;
  schemaVersion: 1;
  simVersion: string;
  configHash: string;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  seed: number;
  difficulty: number;
  dayNight: 'DAY' | 'NIGHT';
  durationMs: 120_000 | 30_000;
  asset: {
    x: 0;
    y: 0;
    rMinM: number;
  };
  zones: ZoneSpec[];
  threats: ThreatSpawn[];
  decoys: ThreatSpawn[];
  chaos: ChaosSpec[];
  triggers: TriggerSpec[];
  roeText: string;
  levers: { id: string; reason: string }[]; // shown in AAR "Red Team plan"
  features: number[]; // 33-dim vector
  benchId?: string; // EVAL pack only
}

export type SimEventType =
  | 'SIM_START'
  | 'SPAWN'
  | 'DETECT'
  | 'TRACK_INIT'
  | 'MASKED'
  | 'REACQUIRE'
  | 'DESIGNATE'
  | 'SENSOR_SWITCH'
  | 'CLASSIFY'
  | 'ENGAGE'
  | 'ENGAGE_RESULT'
  | 'ASSESS'
  | 'CHAOS_ON'
  | 'CHAOS_OFF'
  | 'TRIGGER'
  | 'ROE_VIOLATION'
  | 'FLAG'
  | 'LEAK'
  | 'SNAPSHOT'
  | 'SESSION_PAUSE'
  | 'SESSION_RESUME'
  | 'SESSION_END';

export interface SimEvent {
  seq: number; // monotonic per session; breaks ties at equal tMs
  tMs: number; // tick-quantised sim time (scored)
  tRawMs?: number; // raw input time, user actions only
  type: SimEventType;
  trackNo?: string;
  entityId?: string;
  payload: Record<string, unknown>; // fully self-describing
}

export type Grade = 'PROFICIENT_IN_SIMULATION' | 'DEVELOPING' | 'NEEDS_RETRAINING';

export interface AARMetrics {
  sessionUid: string;
  mode: 'TRAIN' | 'EVAL';
  score: number;
  grade: Grade;
  metMs: number | null; // mean(tEng - tTrk), engaged hostiles
  mdtMs: number | null; // mean(tDesig - tTrk)
  mctMs: number | null; // mean(tCls - tDesig)
  s2sMs: number | null; // mean(tEng - tDesig)
  detToTrackMs: number | null; // mean(tTrk - tVis), diagnostic only
  clsAccuracy: number; // correct / all tracks that existed
  clsCoverage: number;
  hostileRecall: number;
  hostilePrecision: number;
  aggregateCer: number | null;
  unfavourableExchanges: number;
  collateralIncidents: number;
  roeViolations: number;
  leakers: number;
  leakRate: number;
  salMs: number | null;
  salScore: number | null;
  swarmSat: number | null;
  dScore: number;
  cScore: number;
  econScore: number;
  rScore: number;
  confusion: number[][]; // 7x7, rows true (UNKNOWN row always 0), cols predicted
}

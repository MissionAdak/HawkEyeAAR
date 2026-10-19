import type { TrackClass, TrueClass } from './taxonomy';
export type { TrackClass, TrueClass };


export type SensorMode = 'RADAR' | 'EOIR' | 'RF';
export type ZoneType = 'URBAN' | 'RIDGE' | 'FOREST';
export type Profile = 'DIRECT' | 'TERRAIN_HUG' | 'ORBIT_FEINT' | 'SWARM_SATURATE' | 'ERRATIC' | 'LOITER';
export type EffectorId = 'RF_SOFTKILL' | 'LASER' | 'GUN' | 'INTERCEPTOR' | 'MISSILE';
export type ChaosType = 'FOG' | 'JAMMING' | 'RAIN' | 'RADAR_DROPOUT';

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
  z: number;
}

export type DroneType =
  | 'RECON_QUAD'
  | 'FPV_ATTACK'
  | 'SWARM_ELEMENT'
  | 'LOITERING_MUNITION'
  | 'CIVIL_UAS'
  | 'BIRD'
  | 'FRIENDLY_UAS';

export interface TrackEntity {
  id: string;
  trackNo: string | null;
  trueClass: TrueClass;
  droneType: DroneType;
  pos: Vec3;
  prev: Vec3;
  vel: Vec3;
  rcsM2: number;
  valueInr: number | null;
  emitsRf: boolean;
  remoteId: boolean;
  iff: boolean;
  profile: Profile;
  spawnTMs: number;
  lifecycle: 'DORMANT' | 'ACTIVE' | 'NEUTRALISED' | 'LEAKED' | 'DEPARTED';
  traineeLabel: TrackClass | null;
  step: F2T2EAStep;
  q: number;
  cCls: number;
  masked: boolean;
  coastingSinceMs: number | null;
  ghostSigmaM: number;
  hitHistory: boolean[];
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
  polygon: [number, number][];
  heightM: number;
  shadowM: number;
  rho: number;
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
  asset: { x: 0; y: 0; rMinM: number };
  zones: ZoneSpec[];
  threats: ThreatSpawn[];
  decoys: ThreatSpawn[];
  chaos: ChaosSpec[];
  triggers: TriggerSpec[];
  roeText: string;
  levers: { id: string; reason: string }[];
  features: number[];
  benchId?: string;
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
  seq: number;
  tMs: number;
  tRawMs?: number;
  type: SimEventType;
  trackNo?: string;
  entityId?: string;
  payload: Record<string, unknown>;
}

export type Grade = 'PROFICIENT_IN_SIMULATION' | 'DEVELOPING' | 'NEEDS_RETRAINING';

export interface AARMetrics {
  sessionUid: string;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  score: number;
  grade: Grade;
  metMs: number | null;
  mdtMs: number | null;
  mctMs: number | null;
  s2sMs: number | null;
  detToTrackMs: number | null;
  clsAccuracy: number;
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
  confusion: number[][];
}

export interface UserAction {
  tRawMs: number;
  applyTick: number;
  action:
    | { type: 'DESIGNATE'; trackNo: string; via: 'KEY' | 'CLICK' }
    | { type: 'CLASSIFY'; trackNo: string; label: TrackClass }
    | { type: 'SELECT_EFFECTOR'; effectorId: EffectorId }
    | { type: 'FIRE'; trackNo: string }
    | { type: 'ASSESS'; trackNo: string; result: 'KILL' | 'NO_KILL' | 'UNKNOWN' }
    | { type: 'SET_SENSOR'; mode: SensorMode }
    | { type: 'SET_EOIR_AZIMUTH'; deg: number }
    | { type: 'CYCLE_TRACK'; direction: 'NEXT' | 'PREV' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' };
}

export interface WeaknessVector {
  d: number;
  c: number;
  econ: number;
  r: number;
  sal: number;
  sat: number;
}

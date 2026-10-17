/**
 * DRISHTI-CUAS IndexedDB Persistence with Dexie.js
 *
 * Rules: ZS-1, ZS-4, DT-7, DT-8
 * Schema per ARCHITECTURE.md Section 4.1
 */

import Dexie, { type Table } from 'dexie';
import type { Grade } from '../sim/types';

export interface Unit {
  uid: string;
  name: string;
}

export interface Trainee {
  uid: string;
  unitUid: string;
  callsign: string;
  role?: string;
  createdAt: number;
}

export interface ScenarioRecord {
  uid: string;
  seed: number;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  benchId?: string;
  createdAt: number;
  specJson: string;
  leversJson: string;
  featureVec: number[];
}

export interface SessionRecord {
  uid: string;
  traineeUid: string;
  scenarioId: string;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  startedAt: number;
  durationMs: number;
  dStart: number;
  score: number;
  grade: Grade;
  simVersion: string;
  configHash: string;
  metMs: number | null;
  mdtMs: number | null;
  mctMs: number | null;
  s2sMs: number | null;
  clsAccuracy: number;
  hostileRecall: number;
  aggregateCer: number | null;
  unfavourableExchanges: number;
  collateralIncidents: number;
  roeViolations: number;
  leakers: number;
  salMs: number | null;
  swarmSat: number | null;
}

export interface TrackResult {
  id?: number;
  sessionUid: string;
  trackNo: string;
  trueClass: string;
  predClass: string;
  rcsM2: number;
  valueInr: number | null;
  tSpawnMs: number;
  tVisMs: number | null;
  tTrkMs: number | null;
  tDesigMs: number | null;
  tClsMs: number | null;
  tEngMs: number | null;
  tPnrMs: number | null;
  effector: string | null;
  oracleEffector: string | null;
  cer: number | null;
  outcome: 'NEUTRALISED' | 'LEAKED' | 'HELD' | 'ENGAGED_NONHOSTILE';
  collateral: number;
  dScore: number;
  cScore: number;
  gScore: number;
  rScore: number;
  sTrack: number;
}

export interface EventRecord {
  id?: number;
  sessionUid: string;
  seq: number;
  tMs: number;
  tRawMs?: number;
  type: string;
  trackNo?: string;
  entityId?: string;
  payload: Record<string, unknown>;
}

export interface ChaosLog {
  id?: number;
  sessionUid: string;
  type: string;
  tStartMs: number;
  tEndMs: number;
  tSwitchMs?: number;
}

export interface TraineeProfile {
  traineeUid: string;
  metric: string;
  ema: number;
  n: number;
  updatedAt: number;
}

export interface DifficultyState {
  traineeUid: string;
  d: number;
  lastScore: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class DrishtiDatabase extends Dexie {
  units!: Table<Unit, string>;
  trainees!: Table<Trainee, string>;
  scenarios!: Table<ScenarioRecord, string>;
  sessions!: Table<SessionRecord, string>;
  trackResults!: Table<TrackResult, number>;
  events!: Table<EventRecord, number>;
  chaosLog!: Table<ChaosLog, number>;
  traineeProfile!: Table<TraineeProfile, [string, string]>;
  difficulty!: Table<DifficultyState, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('drishti_cuas_db');

    this.version(1).stores({
      units: 'uid, name',
      trainees: 'uid, unitUid, &callsign',
      scenarios: 'uid, seed, mode, benchId, createdAt',
      sessions: 'uid, traineeUid, mode, startedAt, [traineeUid+mode+startedAt], [mode+traineeUid+startedAt]',
      trackResults: '++id, sessionUid, [sessionUid+trackNo], trueClass',
      events: '++id, sessionUid, [sessionUid+tMs+seq], [sessionUid+type+tMs]',
      chaosLog: '++id, sessionUid, type',
      traineeProfile: '[traineeUid+metric]',
      difficulty: 'traineeUid',
      settings: 'key',
    });
  }
}

export const db = new DrishtiDatabase();

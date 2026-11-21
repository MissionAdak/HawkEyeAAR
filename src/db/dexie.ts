import Dexie, { type Table } from 'dexie';
import type { SimEvent, AARMetrics, Grade, TrueClass } from '@/sim/types';
import { aggregateAARMetrics } from '@/sim/metrics';
import { getScenarioCatalogEntry } from '@/director/catalog';

export interface UnitRow {
  uid: string;
  name: string;
}

export interface TraineeRow {
  uid: string;
  unitUid: string;
  callsign: string;
}

export interface ScenarioRow {
  uid: string;
  seed: number;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  benchId?: string;
  createdAt: number;
  specJson: string;
}

export interface SessionRow {
  uid: string;
  traineeUid: string;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  startedAt: number;
  durationMs: number;
  score: number;
  grade: Grade;
  dStart: number;
  metrics: AARMetrics;
  scenarioId?: string;
  aborted?: boolean;
  unverified?: boolean;
  isSynthetic?: boolean;
}

export interface TrackResultRow {
  id?: number;
  sessionUid: string;
  trackNo: string;
  trueClass: TrueClass;
  predClass: string;
  dScore: number;
  cScore: number;
  gScore: number;
  rScore: number;
  sTrack: number;
}

export interface StoredSimEvent extends SimEvent {
  id?: number;
  sessionUid: string;
}

export interface ChaosLogRow {
  id?: number;
  sessionUid: string;
  type: string;
  tStartMs: number;
  tEndMs: number;
  tSwitchMs?: number;
}

export interface TraineeProfileRow {
  traineeUid: string;
  metric: string;
  ema: number;
  n: number;
  updatedAt: number;
}

export interface DifficultyRow {
  traineeUid: string;
  d: number;
  lastScore: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export class DrishtiDatabase extends Dexie {
  public units!: Table<UnitRow, string>;
  public trainees!: Table<TraineeRow, string>;
  public scenarios!: Table<ScenarioRow, string>;
  public sessions!: Table<SessionRow, string>;
  public trackResults!: Table<TrackResultRow, number>;
  public events!: Table<StoredSimEvent, number>;
  public chaosLog!: Table<ChaosLogRow, number>;
  public traineeProfile!: Table<TraineeProfileRow, [string, string]>;
  public difficulty!: Table<DifficultyRow, string>;
  public settings!: Table<SettingRow, string>;

  constructor() {
    super('DrishtiCuasDb');
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

    this.version(2)
      .stores({
        sessions: 'uid, traineeUid, mode, startedAt, isSynthetic, [traineeUid+mode+startedAt], [mode+traineeUid+startedAt]',
      })
      .upgrade(async (tx) => {
        const sessionsTable = tx.table<SessionRow, string>('sessions');
        const eventsTable = tx.table<StoredSimEvent, number>('events');

        const sessions = await sessionsTable.toArray();
        for (const session of sessions) {
          let events: StoredSimEvent[] | undefined;
          if (
            session.metrics &&
            (session.metrics.gScore === undefined || session.metrics.gScore === null)
          ) {
            try {
              events = await eventsTable.where('sessionUid').equals(session.uid).sortBy('seq');
            } catch {
              events = undefined;
            }
          }
          migrateLegacySession(session, events);
          await sessionsTable.put(session);
        }
      });
  }
}

/**
 * Safe, repeatable migration logic for legacy Task 20 session records.
 * Identifies legacy synthetic records (uid pattern: demo-{callsign}-{timestamp}),
 * and reconstructs missing gScore if valid events are available.
 */
export function migrateLegacySession(
  session: SessionRow,
  storedEvents?: SimEvent[]
): SessionRow {
  // 1. Detect legacy synthetic records created by original Task 20 demo seeder
  if (session.uid && typeof session.uid === 'string' && session.uid.startsWith('demo-')) {
    session.isSynthetic = true;
  } else if (session.isSynthetic === undefined) {
    session.isSynthetic = false;
  }

  // 2. Reconstruct missing gScore if sufficient stored events exist
  if (
    session.metrics &&
    (session.metrics.gScore === undefined || session.metrics.gScore === null)
  ) {
    if (storedEvents && storedEvents.length > 0) {
      try {
        const entry = session.scenarioId
          ? getScenarioCatalogEntry(session.scenarioId)
          : undefined;
        const spec = entry ? entry.getSpec() : undefined;
        const reconstructed = aggregateAARMetrics(storedEvents, spec);
        if (reconstructed && typeof reconstructed.gScore === 'number') {
          session.metrics.gScore = reconstructed.gScore;
        }
      } catch {
        // If event reconstruction fails or data incomplete, do not invent G
      }
    }
  }

  return session;
}

export const db = new DrishtiDatabase();

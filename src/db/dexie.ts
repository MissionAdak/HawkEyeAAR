import Dexie, { type Table } from 'dexie';
import type { SimEvent, AARMetrics, Grade, TrueClass, ScenarioSpec, SessionMode } from '@/sim/types';
import { aggregateAARMetrics } from '@/sim/metrics';
import { loadCatalogScenario } from '@/director/catalog';

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
  // Immutable scenario configuration snapshot and metadata (TASK 20-A3)
  scenarioSpecSnapshot?: ScenarioSpec;
  scenarioSeed?: number;
  scenarioDifficulty?: number;
  scenarioConfigHash?: string;
  scenarioSimVersion?: string;
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

  constructor(databaseName = 'DrishtiCuasDb') {
    super(databaseName);
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

export interface EventLogValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates the completeness and integrity of a historical simulation event log
 * before permitting AAR metric reconstruction (e.g., G-score).
 *
 * Rules:
 * - Must contain at least SIM_START and terminal SESSION_END.
 * - Explicit, valid SIM_START.payload.mode ('TRAIN' | 'EVAL' | 'DEMO').
 * - Explicit, valid non-empty SIM_START.payload.scenarioId.
 * - Sequence numbers must be strictly 1-based and contiguous (seq = i + 1).
 * - All events must carry a valid sessionUid matching the owning session.
 * - Aborted sessions are rejected as incomplete.
 * - Mode and scenarioId must match between session metadata and SIM_START payload.
 * - If scenario snapshot is present, scenario identity (id, mode, seed, difficulty, configHash) must agree.
 */
export function validateHistoricalEventLog(
  events?: SimEvent[],
  session?: SessionRow
): EventLogValidationResult {
  if (!events || events.length < 2) {
    return {
      isValid: false,
      reason: 'Event stream must contain at least SIM_START and SESSION_END',
    };
  }

  const firstEvent = events[0];
  if (firstEvent.type !== 'SIM_START') {
    return {
      isValid: false,
      reason: `First event must be SIM_START, received ${firstEvent.type}`,
    };
  }

  const simStartPayload = firstEvent.payload as {
    mode?: string;
    scenarioId?: string;
    seed?: number;
    difficulty?: number;
    configHash?: string;
    simVersion?: string;
    schemaVersion?: number;
  } | undefined;

  // Explicit, valid SIM_START.payload.mode
  if (
    !simStartPayload?.mode ||
    !['TRAIN', 'EVAL', 'DEMO'].includes(simStartPayload.mode)
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain explicit valid mode ('TRAIN' | 'EVAL' | 'DEMO'), found: ${simStartPayload?.mode}`,
    };
  }

  // Explicit, valid SIM_START.payload.scenarioId
  if (
    !simStartPayload?.scenarioId ||
    typeof simStartPayload.scenarioId !== 'string' ||
    simStartPayload.scenarioId.trim() === ''
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain explicit non-empty scenarioId, found: ${simStartPayload?.scenarioId}`,
    };
  }

  const lastEvent = events[events.length - 1];
  if (lastEvent.type !== 'SESSION_END') {
    return {
      isValid: false,
      reason: `Terminal event must be SESSION_END, received ${lastEvent.type}`,
    };
  }

  if (Boolean(lastEvent.payload?.aborted) || Boolean(session?.aborted)) {
    return {
      isValid: false,
      reason: 'Session was aborted; event history is non-terminal or incomplete',
    };
  }

  const expectedSessionUid = session?.uid;
  const firstStoredUid = (firstEvent as StoredSimEvent).sessionUid;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.seq !== i + 1) {
      return {
        isValid: false,
        reason: `Discontinuous sequence number at index ${i}: expected seq ${i + 1}, found ${ev.seq}`,
      };
    }

    const storedEv = ev as StoredSimEvent;
    if (expectedSessionUid) {
      if (!storedEv.sessionUid || typeof storedEv.sessionUid !== 'string') {
        return {
          isValid: false,
          reason: `Event at seq ${ev.seq} is missing sessionUid`,
        };
      }
      if (storedEv.sessionUid !== expectedSessionUid) {
        return {
          isValid: false,
          reason: `Event sessionUid mismatch at seq ${ev.seq}: expected ${expectedSessionUid}, found ${storedEv.sessionUid}`,
        };
      }
    } else if (firstStoredUid) {
      if (storedEv.sessionUid !== firstStoredUid) {
        return {
          isValid: false,
          reason: `Inconsistent sessionUid within event stream at seq ${ev.seq}`,
        };
      }
    }
  }

  if (session) {
    if (session.mode !== simStartPayload.mode) {
      return {
        isValid: false,
        reason: `Session mode (${session.mode}) differs from SIM_START mode (${simStartPayload.mode})`,
      };
    }
    if (session.scenarioId !== simStartPayload.scenarioId) {
      return {
        isValid: false,
        reason: `Session scenarioId (${session.scenarioId}) differs from SIM_START scenarioId (${simStartPayload.scenarioId})`,
      };
    }

    // If scenarioSpecSnapshot is present, validate its identity
    if (session.scenarioSpecSnapshot) {
      const snap = session.scenarioSpecSnapshot;
      if (!snap.id || !Array.isArray(snap.threats) || !Array.isArray(snap.decoys) || !snap.asset) {
        return {
          isValid: false,
          reason: 'Corrupt or malformed scenarioSpecSnapshot schema',
        };
      }
      if (snap.id !== session.scenarioId || snap.id !== simStartPayload.scenarioId) {
        return {
          isValid: false,
          reason: `Scenario snapshot id (${snap.id}) does not match session scenarioId (${session.scenarioId})`,
        };
      }
      if (snap.mode !== session.mode || snap.mode !== simStartPayload.mode) {
        return {
          isValid: false,
          reason: `Scenario snapshot mode (${snap.mode}) does not match session mode (${session.mode})`,
        };
      }
      if (typeof simStartPayload.seed === 'number' && snap.seed !== simStartPayload.seed) {
        return {
          isValid: false,
          reason: `Scenario snapshot seed (${snap.seed}) does not match SIM_START seed (${simStartPayload.seed})`,
        };
      }
      if (
        typeof simStartPayload.difficulty === 'number' &&
        snap.difficulty !== simStartPayload.difficulty
      ) {
        return {
          isValid: false,
          reason: `Scenario snapshot difficulty (${snap.difficulty}) does not match SIM_START difficulty (${simStartPayload.difficulty})`,
        };
      }
      if (
        simStartPayload.configHash &&
        snap.configHash &&
        snap.configHash !== simStartPayload.configHash
      ) {
        return {
          isValid: false,
          reason: `Scenario snapshot configHash (${snap.configHash}) does not match SIM_START configHash (${simStartPayload.configHash})`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Resolves the exact immutable ScenarioSpec needed for historical G reconstruction.
 *
 * Rules:
 * 1. Prefer the stored scenarioSpecSnapshot whenever available and validated.
 * 2. Deterministic reconstruction from catalog is ONLY allowed if scenarioId is known
 *    and for dynamic/procedural scenarios, explicit finite seed and difficulty exist.
 * 3. Never call getSpec() with missing or default parameters.
 * 4. Never return undefined spec to aggregateAARMetrics() to avoid fallback hostile defaults.
 */
export function resolveHistoricalScenarioSpec(
  session: SessionRow,
  events: SimEvent[]
): ScenarioSpec | undefined {
  const firstEvent = events[0];
  const simStartPayload = firstEvent?.payload as {
    scenarioId?: string;
    mode?: SessionMode;
    seed?: number;
    difficulty?: number;
    configHash?: string;
    simVersion?: string;
    schemaVersion?: number;
  } | undefined;

  // 1. Immutable stored snapshot has absolute priority
  if (session.scenarioSpecSnapshot) {
    const snap = session.scenarioSpecSnapshot;
    if (
      !snap.id ||
      !Array.isArray(snap.threats) ||
      !Array.isArray(snap.decoys) ||
      !snap.asset
    ) {
      return undefined;
    }
    // Verify against session
    if (session.scenarioId && snap.id !== session.scenarioId) return undefined;
    if (session.mode && snap.mode !== session.mode) return undefined;

    // Verify against SIM_START event
    if (simStartPayload?.scenarioId && snap.id !== simStartPayload.scenarioId) return undefined;
    if (simStartPayload?.mode && snap.mode !== simStartPayload.mode) return undefined;
    if (typeof simStartPayload?.seed === 'number' && snap.seed !== simStartPayload.seed) return undefined;
    if (
      typeof simStartPayload?.difficulty === 'number' &&
      snap.difficulty !== simStartPayload.difficulty
    ) {
      return undefined;
    }
    if (
      simStartPayload?.configHash &&
      snap.configHash &&
      snap.configHash !== simStartPayload.configHash
    ) {
      return undefined;
    }

    return snap;
  }

  // 2. Deterministic recovery from catalog IF AND ONLY IF parameters are known and verified
  const scenarioId = session.scenarioId ?? simStartPayload?.scenarioId;
  if (!scenarioId) {
    return undefined;
  }

  const seed =
    typeof simStartPayload?.seed === 'number'
      ? simStartPayload.seed
      : session.scenarioSeed;
  const difficulty =
    typeof simStartPayload?.difficulty === 'number'
      ? simStartPayload.difficulty
      : session.scenarioDifficulty ?? session.dStart;

  // Fixed catalog scenarios (DEMO-1, DEMO-2, SWARM-1, COAST-1, SPECTRUM-1)
  const isFixedCatalog = ['DEMO-1', 'DEMO-2', 'SWARM-1', 'COAST-1', 'SPECTRUM-1'].includes(scenarioId);
  if (isFixedCatalog) {
    try {
      const { spec } = loadCatalogScenario(scenarioId, seed, difficulty);
      return spec;
    } catch {
      return undefined;
    }
  }

  // Dynamic / procedural scenarios (PROCEDURAL-*, RANDOM-*, FORMATION-*, POPUP-*)
  const isDynamic =
    scenarioId.startsWith('PROCEDURAL') ||
    scenarioId.startsWith('RANDOM') ||
    scenarioId.startsWith('FORMATION') ||
    scenarioId.startsWith('POPUP');

  if (isDynamic) {
    // Both seed and difficulty MUST be finite numbers. Never guess or default!
    if (typeof seed !== 'number' || !Number.isFinite(seed)) {
      return undefined;
    }
    if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) {
      return undefined;
    }
    try {
      const { spec } = loadCatalogScenario(scenarioId, seed, difficulty);
      return spec;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Safe, repeatable migration logic for legacy Task 20 session records.
 * Identifies legacy synthetic records (uid pattern: demo-{callsign}-{timestamp}),
 * and reconstructs missing gScore only if a complete, valid event log is available
 * AND an exact matching scenario specification is recoverable.
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

  // 2. Reconstruct missing gScore ONLY if complete, valid stored events exist AND exact scenario spec is recoverable
  if (
    session.metrics &&
    (session.metrics.gScore === undefined || session.metrics.gScore === null)
  ) {
    if (storedEvents && storedEvents.length > 0) {
      const validation = validateHistoricalEventLog(storedEvents, session);
      if (validation.isValid) {
        try {
          const spec = resolveHistoricalScenarioSpec(session, storedEvents);
          if (spec) {
            const reconstructed = aggregateAARMetrics(storedEvents, spec);
            if (reconstructed && typeof reconstructed.gScore === 'number') {
              session.metrics.gScore = reconstructed.gScore;
            }
          }
          // If spec cannot be recovered with confidence, session.metrics.gScore remains undefined
        } catch {
          // If event reconstruction fails, do not invent G
        }
      }
    }
  }

  return session;
}

export const db = new DrishtiDatabase();

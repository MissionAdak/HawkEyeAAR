import Dexie, { type Table } from 'dexie';
import type { SimEvent, AARMetrics, Grade, TrueClass, ScenarioSpec, SessionMode } from '@/sim/types';
import { SIM_VERSION, SCHEMA_VERSION } from '@/sim/types';
import { aggregateAARMetrics } from '@/sim/metrics';
import { loadCatalogScenario } from '@/director/catalog';
import { validate } from '@/director/validate';
import { CONFIG_HASH } from '@/config';
import { computeScenarioSnapshotHash, validateScenarioStructure } from '@/sim/snapshotHash';

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
  // Immutable scenario configuration snapshot and metadata (TASK 20-A3, TASK 20-A4)
  scenarioSpecSnapshot?: ScenarioSpec;
  scenarioSeed?: number;
  scenarioDifficulty?: number;
  scenarioConfigHash?: string;
  scenarioSnapshotHash?: string;
  scenarioSimVersion?: string;
  scenarioSchemaVersion?: number;
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

  const lastEvent = events[events.length - 1];
  if (lastEvent.type !== 'SESSION_END') {
    return {
      isValid: false,
      reason: `Terminal event must be SESSION_END, received ${lastEvent.type}`,
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

  // Strict check: SESSION_END.payload.aborted === false
  const lastPayload = lastEvent.payload as { aborted?: unknown } | undefined;
  if (!lastPayload || lastPayload.aborted !== false) {
    return {
      isValid: false,
      reason: `SESSION_END payload must explicitly have aborted === false, found: ${lastPayload?.aborted}`,
    };
  }

  if (session && session.aborted !== false && session.aborted !== undefined) {
    return {
      isValid: false,
      reason: `Session metadata indicates session was aborted or non-terminal (${session.aborted})`,
    };
  }

  const simStartPayload = firstEvent.payload as {
    mode?: string;
    scenarioId?: string;
    seed?: number;
    difficulty?: number;
    configHash?: string;
    scenarioSnapshotHash?: string;
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
  }

  // Finite numeric seed
  if (
    typeof simStartPayload.seed !== 'number' ||
    !Number.isFinite(simStartPayload.seed)
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain finite numeric seed, found: ${simStartPayload?.seed}`,
    };
  }

  // Finite numeric difficulty
  if (
    typeof simStartPayload.difficulty !== 'number' ||
    !Number.isFinite(simStartPayload.difficulty)
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain finite numeric difficulty, found: ${simStartPayload?.difficulty}`,
    };
  }

  // Non-empty application configHash
  if (
    !simStartPayload.configHash ||
    typeof simStartPayload.configHash !== 'string' ||
    simStartPayload.configHash.trim() === ''
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain non-empty application configHash, found: ${simStartPayload?.configHash}`,
    };
  }

  // Non-empty scenarioSnapshotHash
  if (
    !simStartPayload.scenarioSnapshotHash ||
    typeof simStartPayload.scenarioSnapshotHash !== 'string' ||
    simStartPayload.scenarioSnapshotHash.trim() === ''
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain non-empty scenarioSnapshotHash, found: ${simStartPayload?.scenarioSnapshotHash}`,
    };
  }

  // Non-empty simVersion
  if (
    !simStartPayload.simVersion ||
    typeof simStartPayload.simVersion !== 'string' ||
    simStartPayload.simVersion.trim() === ''
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain non-empty simVersion, found: ${simStartPayload?.simVersion}`,
    };
  }

  // Finite numeric schemaVersion
  if (
    typeof simStartPayload.schemaVersion !== 'number' ||
    !Number.isFinite(simStartPayload.schemaVersion)
  ) {
    return {
      isValid: false,
      reason: `SIM_START must contain finite numeric schemaVersion, found: ${simStartPayload?.schemaVersion}`,
    };
  }

  if (session) {
    if (session.scenarioSeed !== undefined && session.scenarioSeed !== simStartPayload.seed) {
      return {
        isValid: false,
        reason: `Session scenarioSeed (${session.scenarioSeed}) differs from SIM_START seed (${simStartPayload.seed})`,
      };
    }
    if (
      session.scenarioDifficulty !== undefined &&
      session.scenarioDifficulty !== simStartPayload.difficulty
    ) {
      return {
        isValid: false,
        reason: `Session scenarioDifficulty (${session.scenarioDifficulty}) differs from SIM_START difficulty (${simStartPayload.difficulty})`,
      };
    }
    if (session.scenarioConfigHash && session.scenarioConfigHash !== simStartPayload.configHash) {
      return {
        isValid: false,
        reason: `Session scenarioConfigHash (${session.scenarioConfigHash}) differs from SIM_START configHash (${simStartPayload.configHash})`,
      };
    }
    if (
      session.scenarioSnapshotHash &&
      session.scenarioSnapshotHash !== simStartPayload.scenarioSnapshotHash
    ) {
      return {
        isValid: false,
        reason: `Session scenarioSnapshotHash (${session.scenarioSnapshotHash}) differs from SIM_START scenarioSnapshotHash (${simStartPayload.scenarioSnapshotHash})`,
      };
    }
    if (
      session.scenarioSimVersion &&
      session.scenarioSimVersion !== simStartPayload.simVersion
    ) {
      return {
        isValid: false,
        reason: `Session scenarioSimVersion (${session.scenarioSimVersion}) differs from SIM_START simVersion (${simStartPayload.simVersion})`,
      };
    }
    if (
      session.scenarioSchemaVersion !== undefined &&
      session.scenarioSchemaVersion !== simStartPayload.schemaVersion
    ) {
      return {
        isValid: false,
        reason: `Session scenarioSchemaVersion (${session.scenarioSchemaVersion}) differs from SIM_START schemaVersion (${simStartPayload.schemaVersion})`,
      };
    }

    // If scenarioSpecSnapshot is present, validate structure, kinematic fairness, and digest
    if (session.scenarioSpecSnapshot) {
      const snap = session.scenarioSpecSnapshot;
      if (!validateScenarioStructure(snap)) {
        return {
          isValid: false,
          reason: 'Corrupt or malformed scenarioSpecSnapshot schema',
        };
      }
      if (!validate(snap)) {
        return {
          isValid: false,
          reason: 'Scenario snapshot failed kinematic or fairness validation',
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
      if (snap.seed !== simStartPayload.seed) {
        return {
          isValid: false,
          reason: `Scenario snapshot seed (${snap.seed}) does not match SIM_START seed (${simStartPayload.seed})`,
        };
      }
      if (snap.difficulty !== simStartPayload.difficulty) {
        return {
          isValid: false,
          reason: `Scenario snapshot difficulty (${snap.difficulty}) does not match SIM_START difficulty (${simStartPayload.difficulty})`,
        };
      }
      if (snap.simVersion !== simStartPayload.simVersion) {
        return {
          isValid: false,
          reason: `Scenario snapshot simVersion (${snap.simVersion}) does not match SIM_START simVersion (${simStartPayload.simVersion})`,
        };
      }
      if (snap.schemaVersion !== simStartPayload.schemaVersion) {
        return {
          isValid: false,
          reason: `Scenario snapshot schemaVersion (${snap.schemaVersion}) does not match SIM_START schemaVersion (${simStartPayload.schemaVersion})`,
        };
      }

      // Recompute canonical SHA-256 digest
      const computedHash = computeScenarioSnapshotHash(snap);
      if (computedHash !== simStartPayload.scenarioSnapshotHash) {
        return {
          isValid: false,
          reason: `Scenario snapshot digest mismatch: recomputed ${computedHash} does not match SIM_START scenarioSnapshotHash ${simStartPayload.scenarioSnapshotHash}`,
        };
      }
      if (session.scenarioSnapshotHash && session.scenarioSnapshotHash !== computedHash) {
        return {
          isValid: false,
          reason: `Scenario snapshot digest mismatch: recomputed ${computedHash} does not match session scenarioSnapshotHash ${session.scenarioSnapshotHash}`,
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
 * 2. Fail-closed catalog reconstruction for legacy records WITHOUT snapshot (Critical D).
 *    Permit catalog reconstruction ONLY when:
 *    - The historical catalog artifact is identifiable.
 *    - Its exact version is identifiable.
 *    - The original scenario parameters are present and valid (finite seed and difficulty).
 *    - The historical artifact's canonical scenario digest matches the value recorded in the session's original event provenance.
 *    - The simulation and application configuration versions are compatible with the historical record.
 * 3. Never return undefined spec to aggregateAARMetrics() to avoid fallback hostile defaults.
 */
export function resolveHistoricalScenarioSpec(
  session: SessionRow,
  events: SimEvent[]
): ScenarioSpec | undefined {
  if (!events || events.length < 2) return undefined;
  const firstEvent = events[0];
  const simStartPayload = firstEvent?.payload as {
    scenarioId?: string;
    mode?: SessionMode;
    seed?: number;
    difficulty?: number;
    configHash?: string;
    scenarioSnapshotHash?: string;
    simVersion?: string;
    schemaVersion?: number;
  } | undefined;

  // 1. Immutable stored snapshot has absolute priority
  if (session.scenarioSpecSnapshot) {
    const snap = session.scenarioSpecSnapshot;
    if (!validateScenarioStructure(snap)) return undefined;
    if (!validate(snap)) return undefined;

    // Verify against session
    if (session.scenarioId && snap.id !== session.scenarioId) return undefined;
    if (session.mode && snap.mode !== session.mode) return undefined;
    if (session.scenarioSeed !== undefined && snap.seed !== session.scenarioSeed) return undefined;
    if (session.scenarioDifficulty !== undefined && snap.difficulty !== session.scenarioDifficulty) return undefined;

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
    if (simStartPayload?.simVersion && snap.simVersion !== simStartPayload.simVersion) return undefined;
    if (simStartPayload?.schemaVersion !== undefined && snap.schemaVersion !== simStartPayload.schemaVersion) return undefined;

    // Canonical digest verification
    const computedDigest = computeScenarioSnapshotHash(snap);
    if (simStartPayload?.scenarioSnapshotHash && computedDigest !== simStartPayload.scenarioSnapshotHash) {
      return undefined;
    }
    if (session.scenarioSnapshotHash && computedDigest !== session.scenarioSnapshotHash) {
      return undefined;
    }

    return snap;
  }

  // 2. Fail-closed catalog reconstruction for legacy records WITHOUT snapshot (Critical D)
  const scenarioId = session.scenarioId ?? simStartPayload?.scenarioId;
  if (!scenarioId || typeof scenarioId !== 'string') return undefined;

  const seed =
    typeof simStartPayload?.seed === 'number' && Number.isFinite(simStartPayload.seed)
      ? simStartPayload.seed
      : (typeof session.scenarioSeed === 'number' && Number.isFinite(session.scenarioSeed) ? session.scenarioSeed : undefined);

  const difficulty =
    typeof simStartPayload?.difficulty === 'number' && Number.isFinite(simStartPayload.difficulty)
      ? simStartPayload.difficulty
      : (typeof session.scenarioDifficulty === 'number' && Number.isFinite(session.scenarioDifficulty) ? session.scenarioDifficulty : undefined);

  if (seed === undefined || difficulty === undefined) {
    return undefined;
  }

  // Require recorded scenarioSnapshotHash in SIM_START provenance
  const recordedSnapshotHash = simStartPayload?.scenarioSnapshotHash ?? session.scenarioSnapshotHash;
  if (!recordedSnapshotHash || typeof recordedSnapshotHash !== 'string' || recordedSnapshotHash.trim() === '') {
    return undefined;
  }

  // Require compatible application configHash
  const recordedConfigHash = simStartPayload?.configHash ?? session.scenarioConfigHash;
  if (!recordedConfigHash || recordedConfigHash !== CONFIG_HASH) {
    return undefined;
  }

  // Require compatible simVersion
  const recordedSimVersion = simStartPayload?.simVersion ?? session.scenarioSimVersion;
  if (!recordedSimVersion || recordedSimVersion !== SIM_VERSION) {
    return undefined;
  }

  // Require compatible schemaVersion
  const recordedSchemaVersion = simStartPayload?.schemaVersion ?? session.scenarioSchemaVersion;
  if (recordedSchemaVersion !== undefined && recordedSchemaVersion !== SCHEMA_VERSION) {
    return undefined;
  }

  // Attempt to load candidate scenario from catalog
  try {
    const { spec: candidateSpec } = loadCatalogScenario(scenarioId, seed, difficulty);
    const targetMode = session.mode ?? simStartPayload?.mode;
    if (targetMode) {
      candidateSpec.mode = targetMode;
    }
    if (!validateScenarioStructure(candidateSpec) || !validate(candidateSpec)) return undefined;

    // Verify canonical digest of candidate catalog artifact matches recorded provenance
    const candidateHash = computeScenarioSnapshotHash(candidateSpec);
    if (candidateHash !== recordedSnapshotHash) {
      return undefined;
    }

    return candidateSpec;
  } catch {
    return undefined;
  }
}

/**
 * Safe, repeatable migration logic for legacy Task 20 session records.
 * Identifies legacy synthetic records (uid pattern: demo-{callsign}-{timestamp}),
 * preserves any existing valid numeric G score without recomputation,
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

  // 2. Preserve any already-recorded valid numeric G score, including genuine zero, without recomputing it
  if (
    session.metrics &&
    typeof session.metrics.gScore === 'number' &&
    Number.isFinite(session.metrics.gScore)
  ) {
    return session;
  }

  // 3. Reconstruct missing gScore ONLY if complete, valid stored events exist AND exact scenario spec is recoverable
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

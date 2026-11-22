import {
  db,
  migrateLegacySession,
  type SessionRow,
  type TraineeRow,
  type UnitRow,
  type ProgressionLogRow,
} from './dexie';
import { createSessionUid, getMockPersistenceFailureMode } from './recorder';
import type { AARMetrics, Grade, SessionMode, WeaknessVector } from '@/sim/types';
import {
  computeNextDifficulty,
  updateWeaknessProfile,
  DEFAULT_TRAIN_DIFFICULTY,
  DEFAULT_METRIC_EMA,
} from '@/director/adaptive';

export interface UnitTraineeSummary {
  callsign: string;
  traineeUid: string;
  unitName: string;
  totalSessions: number;
  evalSessionsCount: number;
  trainSessionsCount: number;
  trainAttemptsCount: number;
  evalAttemptsCount: number;
  latestEvalScore: number | null; // null if no completed EVAL sessions (Rules.md R4.4)
  latestEvalGrade: Grade | null;
  highestTrainDifficulty: number; // max dStart among completed TRAIN sessions
  latestMetrics: AARMetrics | null;
  latestEvalMetrics: AARMetrics | null;
  meanEvalScore: number | null;
  evalPassRate: number | null; // Percentage of EVAL sessions with score >= 70
  isSynthetic?: boolean;
}

export interface UnitCohortStats {
  cohortMeanEvalScore: number | null;
  cohortEvalPassRate: number | null;
  totalEvalSessions: number;
  activeTraineesCount: number;
}

export type DatasetScope = 'REAL' | 'DEMO' | 'ALL';

// In-memory fallbacks for Node.js / unit test environments where indexedDB is undefined
const inMemorySessions: SessionRow[] = [];
const inMemoryTrainees: TraineeRow[] = [];
const inMemoryUnits: UnitRow[] = [];
const inMemoryDifficulties: Map<string, { d: number; lastScore: number }> = new Map();
const inMemoryProfiles: Map<string, WeaknessVector> = new Map();
const inMemoryProgressionLog: Map<string, ProgressionLogRow> = new Map();

export type MockTransactionFailurePoint = 'NONE' | 'PROGRESSION_TX_FAIL' | null;
let mockTxFailure: MockTransactionFailurePoint = 'NONE';

export function setMockProgressionTxFailure(mode: MockTransactionFailurePoint): void {
  mockTxFailure = mode;
}

export function getMockProgressionTxFailure(): MockTransactionFailurePoint {
  return mockTxFailure;
}

function resolveTraineeUid(traineeUidOrCallsign?: string): string {
  if (!traineeUidOrCallsign) {
    return 'trainee-viper-2';
  }
  if (traineeUidOrCallsign.startsWith('trainee-')) {
    return traineeUidOrCallsign;
  }
  return callsignToUid(traineeUidOrCallsign);
}

export async function getTraineeDifficulty(traineeUidOrCallsign?: string): Promise<number> {
  const traineeUid = resolveTraineeUid(traineeUidOrCallsign);

  if (typeof indexedDB === 'undefined') {
    return inMemoryDifficulties.get(traineeUid)?.d ?? DEFAULT_TRAIN_DIFFICULTY;
  }

  const row = await db.difficulty.get(traineeUid);
  return row?.d ?? DEFAULT_TRAIN_DIFFICULTY;
}

export async function getTraineeProfile(
  traineeUidOrCallsign?: string
): Promise<WeaknessVector | null> {
  const traineeUid = resolveTraineeUid(traineeUidOrCallsign);

  if (typeof indexedDB === 'undefined') {
    const cached = inMemoryProfiles.get(traineeUid);
    return cached ? { ...cached } : null;
  }

  const rows = await db.traineeProfile.where('traineeUid').equals(traineeUid).toArray();
  if (rows.length === 0) {
    return null;
  }

  const profile: WeaknessVector = {
    d: 50,
    c: 50,
    econ: 50,
    r: 50,
    sal: 50,
    sat: 50,
  };

  for (const r of rows) {
    if (r.metric in profile) {
      profile[r.metric as keyof WeaknessVector] = r.ema;
    }
  }

  return profile;
}

export async function getProgressionLogEntry(
  sessionUid: string
): Promise<ProgressionLogRow | null> {
  if (typeof indexedDB === 'undefined') {
    return inMemoryProgressionLog.get(sessionUid) ?? null;
  }
  return (await db.progressionLog.get(sessionUid)) ?? null;
}

function updateInMemoryProgression(
  session: SessionRow,
  traineeUid: string,
  sessionUid: string
): { d: number; profile: WeaknessVector } {
  // In-memory fallback: check persistent in-memory progression log
  if (inMemoryProgressionLog.has(sessionUid) || session.progressionApplied) {
    session.progressionApplied = true;
    const existingSession = inMemorySessions.find((s) => s.uid === sessionUid);
    if (existingSession) existingSession.progressionApplied = true;

    const currentD = inMemoryDifficulties.get(traineeUid)?.d ?? DEFAULT_TRAIN_DIFFICULTY;
    const currentProfile = inMemoryProfiles.get(traineeUid) ?? {
      d: DEFAULT_METRIC_EMA,
      c: DEFAULT_METRIC_EMA,
      econ: DEFAULT_METRIC_EMA,
      r: DEFAULT_METRIC_EMA,
      sal: DEFAULT_METRIC_EMA,
      sat: DEFAULT_METRIC_EMA,
    };
    return { d: currentD, profile: currentProfile };
  }

  const currentD = inMemoryDifficulties.get(traineeUid)?.d ?? DEFAULT_TRAIN_DIFFICULTY;
  const nextD = computeNextDifficulty(currentD, session.score);

  const currentProfile = inMemoryProfiles.get(traineeUid) ?? null;
  const updatedProfile = updateWeaknessProfile(
    currentProfile,
    session.metrics ?? { score: session.score }
  );

  // Save previous state for in-memory rollback simulation (TASK 21-PT-R2 Section 3)
  const prevD = inMemoryDifficulties.get(traineeUid);
  const prevProfile = inMemoryProfiles.get(traineeUid);

  // Commit atomically in-memory
  inMemoryDifficulties.set(traineeUid, { d: nextD, lastScore: session.score });
  inMemoryProfiles.set(traineeUid, updatedProfile);

  // In-transaction fault injection test hook (TASK 21-PT-R2 Section 3)
  if (getMockProgressionTxFailure() === 'PROGRESSION_TX_FAIL') {
    if (prevD) inMemoryDifficulties.set(traineeUid, prevD);
    else inMemoryDifficulties.delete(traineeUid);
    if (prevProfile) inMemoryProfiles.set(traineeUid, prevProfile);
    else inMemoryProfiles.delete(traineeUid);
    throw new Error('Simulated in-transaction progression write failure');
  }

  inMemoryProgressionLog.set(sessionUid, {
    sessionUid,
    traineeUid,
    appliedAt: Date.now(),
    dBefore: currentD,
    dAfter: nextD,
    score: session.score,
  });
  session.progressionApplied = true;
  const existingSession = inMemorySessions.find((s) => s.uid === sessionUid);
  if (existingSession) existingSession.progressionApplied = true;

  return { d: nextD, profile: updatedProfile };
}

export async function updateTraineeProgression(
  session: SessionRow
): Promise<{ d: number; profile: WeaknessVector } | null> {
  // Rules.md R4.4 & Task 21-PT: Only completed, non-aborted, verified TRAIN sessions update difficulty and EMA
  if (session.mode !== 'TRAIN' || session.aborted || session.unverified) {
    return null;
  }

  const traineeUid = session.traineeUid;
  const sessionUid = session.uid;
  if (!sessionUid) {
    return null;
  }

  if (typeof indexedDB === 'undefined') {
    return updateInMemoryProgression(session, traineeUid, sessionUid);
  }

  // Persistent, transactionally safe Dexie transaction (TASK 21-PT-R Fix 1)
  return await db.transaction(
    'rw',
    [db.difficulty, db.traineeProfile, db.progressionLog, db.sessions],
    async () => {
      // 1. Atomically check whether progression has already been applied for this session
      const storedSession = await db.sessions.get(sessionUid);
      const existingProg = await db.progressionLog.get(sessionUid);
      if (existingProg) {
        const diffRow = await db.difficulty.get(traineeUid);
        const profile = await getTraineeProfile(traineeUid);
        session.progressionApplied = true;
        if (storedSession && !storedSession.progressionApplied) {
          storedSession.progressionApplied = true;
          await db.sessions.put(storedSession);
        }
        return {
          d: diffRow?.d ?? DEFAULT_TRAIN_DIFFICULTY,
          profile: profile ?? {
            d: DEFAULT_METRIC_EMA,
            c: DEFAULT_METRIC_EMA,
            econ: DEFAULT_METRIC_EMA,
            r: DEFAULT_METRIC_EMA,
            sal: DEFAULT_METRIC_EMA,
            sat: DEFAULT_METRIC_EMA,
          },
        };
      }

      // Check stored session record if already present
      if (storedSession?.progressionApplied) {
        const diffRow = await db.difficulty.get(traineeUid);
        const profile = await getTraineeProfile(traineeUid);
        session.progressionApplied = true;
        return {
          d: diffRow?.d ?? DEFAULT_TRAIN_DIFFICULTY,
          profile: profile ?? {
            d: DEFAULT_METRIC_EMA,
            c: DEFAULT_METRIC_EMA,
            econ: DEFAULT_METRIC_EMA,
            r: DEFAULT_METRIC_EMA,
            sal: DEFAULT_METRIC_EMA,
            sat: DEFAULT_METRIC_EMA,
          },
        };
      }

      // 2. Compute difficulty and EMA updates
      const diffRow = await db.difficulty.get(traineeUid);
      const currentD = diffRow?.d ?? DEFAULT_TRAIN_DIFFICULTY;
      const nextD = computeNextDifficulty(currentD, session.score);

      const currentProfile = await getTraineeProfile(traineeUid);
      const updatedProfile = updateWeaknessProfile(
        currentProfile,
        session.metrics ?? { score: session.score }
      );

      // 3. Atomically commit difficulty, profile, progression log and session marker
      await db.difficulty.put({ traineeUid, d: nextD, lastScore: session.score });
      const now = Date.now();
      await Promise.all(
        Object.entries(updatedProfile).map(([metric, ema]) =>
          db.traineeProfile.put({
            traineeUid,
            metric,
            ema,
            n: currentProfile ? 2 : 1,
            updatedAt: now,
          })
        )
      );

      // In-transaction fault injection test hook (TASK 21-PT-R2 Section 3)
      // Throws AFTER difficulty and traineeProfile have been written in-transaction,
      // proving Dexie's atomic rollback of difficulty and all six EMA records.
      if (getMockProgressionTxFailure() === 'PROGRESSION_TX_FAIL') {
        throw new Error('Simulated in-transaction progression write failure');
      }

      await db.progressionLog.put({
        sessionUid,
        traineeUid,
        appliedAt: now,
        dBefore: currentD,
        dAfter: nextD,
        score: session.score,
      });

      if (storedSession) {
        storedSession.progressionApplied = true;
        await db.sessions.put(storedSession);
      }
      session.progressionApplied = true;

      return { d: nextD, profile: updatedProfile };
    }
  );
}

export function resetTraineeProgressionForTest(traineeUid?: string): void {
  if (traineeUid) {
    inMemoryDifficulties.delete(traineeUid);
    inMemoryProfiles.delete(traineeUid);
    for (const [k, v] of inMemoryProgressionLog.entries()) {
      if (v.traineeUid === traineeUid) {
        inMemoryProgressionLog.delete(k);
      }
    }
  } else {
    inMemoryDifficulties.clear();
    inMemoryProfiles.clear();
    inMemoryProgressionLog.clear();
  }
}

export function callsignToUid(callsign: string): string {
  return `trainee-${callsign.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

export function unitNameToUid(name: string): string {
  return `unit-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

function saveInMemorySession(
  sessionToSave: SessionRow,
  traineeUid: string,
  unitUid: string,
  unitName: string,
  resolvedCallsign: string
): void {
  if (!inMemoryUnits.some((u) => u.uid === unitUid)) {
    inMemoryUnits.push({ uid: unitUid, name: unitName });
  }
  if (!inMemoryTrainees.some((t) => t.uid === traineeUid)) {
    inMemoryTrainees.push({ uid: traineeUid, unitUid, callsign: resolvedCallsign });
  }
  const existingIndex = inMemorySessions.findIndex((s) => s.uid === sessionToSave.uid);
  if (existingIndex >= 0) {
    if (inMemorySessions[existingIndex].progressionApplied) {
      sessionToSave.progressionApplied = true;
    }
    inMemorySessions[existingIndex] = sessionToSave;
  } else {
    inMemorySessions.push(sessionToSave);
  }
}

export async function saveCompletedSession(
  session: SessionRow,
  traineeCallsign = 'VIPER-2',
  unitName = 'ALPHA COY'
): Promise<void> {
  if (
    getMockPersistenceFailureMode() === 'SESSION' ||
    getMockPersistenceFailureMode() === 'BOTH'
  ) {
    throw new Error('Simulated SessionRepo persistence failure');
  }

  const traineeUid = session.traineeUid || callsignToUid(traineeCallsign);
  const unitUid = unitNameToUid(unitName);
  const startedAt = session.startedAt && session.startedAt > 0 ? session.startedAt : Date.now();
  const resolvedCallsign = session.traineeUid?.startsWith('trainee-')
    ? session.traineeUid.replace(/^trainee-/, '').toUpperCase()
    : traineeCallsign;

  const sessionToSave: SessionRow = {
    ...session,
    startedAt,
    traineeUid,
    isSynthetic: session.isSynthetic ?? false,
  };

  if (typeof indexedDB === 'undefined') {
    saveInMemorySession(sessionToSave, traineeUid, unitUid, unitName, resolvedCallsign);
    await updateTraineeProgression(sessionToSave);
    if (sessionToSave.progressionApplied) {
      session.progressionApplied = true;
    }
    return;
  }

  await db.transaction('rw', [db.units, db.trainees, db.sessions, db.scenarios], async () => {
    const existingUnit = await db.units.get(unitUid);
    if (!existingUnit) {
      await db.units.put({ uid: unitUid, name: unitName });
    }

    const existingTrainee = await db.trainees.get(traineeUid);
    if (!existingTrainee) {
      await db.trainees.put({ uid: traineeUid, unitUid, callsign: resolvedCallsign });
    }

    // Preserve durable progressionApplied marker on duplicate saves across reloads (TASK 21-PT-R2 Section 4)
    const existingSession = await db.sessions.get(sessionToSave.uid);
    if (existingSession?.progressionApplied) {
      sessionToSave.progressionApplied = true;
    }

    await db.sessions.put(sessionToSave);

    if (sessionToSave.scenarioSpecSnapshot) {
      const existingScenario = await db.scenarios.get(sessionToSave.uid);
      if (!existingScenario) {
        await db.scenarios.put({
          uid: sessionToSave.uid,
          seed: sessionToSave.scenarioSeed ?? sessionToSave.scenarioSpecSnapshot.seed,
          mode: sessionToSave.mode,
          benchId: sessionToSave.scenarioSpecSnapshot.benchId,
          createdAt: sessionToSave.startedAt,
          specJson: JSON.stringify(sessionToSave.scenarioSpecSnapshot),
        });
      }
    }
  });

  await updateTraineeProgression(sessionToSave);
  if (sessionToSave.progressionApplied) {
    session.progressionApplied = true;
  }
}

export async function getStoredSession(uid: string): Promise<SessionRow | undefined> {
  if (typeof indexedDB === 'undefined') {
    return inMemorySessions.find((s) => s.uid === uid);
  }
  return await db.sessions.get(uid);
}

export async function getAllTrainees(): Promise<TraineeRow[]> {
  if (typeof indexedDB === 'undefined') {
    return [...inMemoryTrainees];
  }
  return await db.trainees.toArray();
}

export async function getTraineeSessions(
  traineeUidOrCallsign?: string,
  sortOrder: 'asc' | 'desc' = 'asc',
  scope: DatasetScope = 'ALL'
): Promise<SessionRow[]> {
  let targetUid = traineeUidOrCallsign;
  if (traineeUidOrCallsign && !traineeUidOrCallsign.startsWith('trainee-')) {
    targetUid = callsignToUid(traineeUidOrCallsign);
  }

  let sessions: SessionRow[];
  if (typeof indexedDB === 'undefined') {
    sessions = targetUid
      ? inMemorySessions.filter((s) => s.traineeUid === targetUid)
      : [...inMemorySessions];
  } else {
    sessions = targetUid
      ? await db.sessions.where('traineeUid').equals(targetUid).toArray()
      : await db.sessions.toArray();
  }

  // Ensure legacy records are normalized
  sessions = sessions.map((s) => migrateLegacySession(s));

  // Filter by dataset scope
  if (scope === 'REAL') {
    sessions = sessions.filter((s) => !s.isSynthetic);
  } else if (scope === 'DEMO') {
    sessions = sessions.filter((s) => Boolean(s.isSynthetic));
  }

  return sessions.sort((a, b) =>
    sortOrder === 'asc' ? a.startedAt - b.startedAt : b.startedAt - a.startedAt
  );
}

export async function getAllSessions(
  sortOrder: 'asc' | 'desc' = 'asc',
  scope: DatasetScope = 'ALL'
): Promise<SessionRow[]> {
  return await getTraineeSessions(undefined, sortOrder, scope);
}

export async function getUnitTraineeSummaries(
  scope: DatasetScope = 'REAL'
): Promise<UnitTraineeSummary[]> {
  const trainees = await getAllTrainees();
  const allSessions = await getAllSessions('asc', scope);

  // Map trainees by UID
  const traineeMap = new Map<string, TraineeRow>();
  for (const t of trainees) {
    traineeMap.set(t.uid, t);
  }

  // Also discover any trainees present in scoped sessions but not yet in trainees table
  for (const s of allSessions) {
    if (!traineeMap.has(s.traineeUid)) {
      const derivedCallsign = s.traineeUid.replace(/^trainee-/, '').toUpperCase();
      traineeMap.set(s.traineeUid, {
        uid: s.traineeUid,
        unitUid: 'unit-alpha-coy',
        callsign: derivedCallsign || 'OPERATOR',
      });
    }
  }

  const summaries: UnitTraineeSummary[] = [];

  for (const [traineeUid, trainee] of traineeMap.entries()) {
    const traineeSessions = allSessions.filter((s) => s.traineeUid === traineeUid);
    const totalSessions = traineeSessions.length;
    if (totalSessions === 0) {
      continue;
    }

    // Rules.md R4.4: Leaderboards and percentiles use EVAL sessions only.
    // Aborted and unverified sessions never enter aggregates.
    const validEvalSessions = traineeSessions.filter(
      (s) => s.mode === 'EVAL' && !s.aborted && !s.unverified
    );
    const validTrainSessions = traineeSessions.filter(
      (s) => s.mode === 'TRAIN' && !s.aborted && !s.unverified
    );

    const evalSessionsCount = validEvalSessions.length;
    const trainSessionsCount = validTrainSessions.length;
    const trainAttemptsCount = traineeSessions.filter((s) => s.mode === 'TRAIN').length;
    const evalAttemptsCount = traineeSessions.filter((s) => s.mode === 'EVAL').length;

    let latestEvalScore: number | null = null;
    let latestEvalGrade: Grade | null = null;
    let latestEvalMetrics: AARMetrics | null = null;
    let meanEvalScore: number | null = null;
    let evalPassRate: number | null = null;

    if (evalSessionsCount > 0) {
      const latestEval = validEvalSessions.at(-1)!;
      latestEvalScore = latestEval.score;
      latestEvalGrade = latestEval.grade;
      latestEvalMetrics = latestEval.metrics ?? null;

      const scoreSum = validEvalSessions.reduce((acc, s) => acc + s.score, 0);
      meanEvalScore = Math.round(scoreSum / evalSessionsCount);

      const passCount = validEvalSessions.filter((s) => s.score >= 70).length;
      evalPassRate = Math.round((passCount / evalSessionsCount) * 100);
    }

    const highestTrainDifficulty =
      validTrainSessions.length > 0
        ? Math.max(...validTrainSessions.map((s) => s.dStart ?? 0))
        : 0;

    summaries.push({
      callsign: trainee.callsign,
      traineeUid,
      unitName: 'ALPHA COY',
      totalSessions,
      evalSessionsCount,
      trainSessionsCount,
      trainAttemptsCount,
      evalAttemptsCount,
      latestEvalScore,
      latestEvalGrade,
      highestTrainDifficulty,
      latestMetrics: latestEvalMetrics,
      latestEvalMetrics,
      meanEvalScore,
      evalPassRate,
      isSynthetic: traineeSessions.some((s) => s.isSynthetic),
    });
  }

  // Rank according to Rules.md R4.4:
  // 1. Valid EVAL scores descending.
  // 2. Trainees with null EVAL scores (TRAIN-only) at the bottom, alphabetically.
  return summaries.sort((a, b) => {
    if (a.latestEvalScore !== null && b.latestEvalScore !== null) {
      return b.latestEvalScore - a.latestEvalScore;
    }
    if (a.latestEvalScore !== null && b.latestEvalScore === null) {
      return -1;
    }
    if (a.latestEvalScore === null && b.latestEvalScore !== null) {
      return 1;
    }
    return a.callsign.localeCompare(b.callsign);
  });
}

export async function getCohortStats(
  scope: DatasetScope = 'REAL'
): Promise<UnitCohortStats> {
  const summaries = await getUnitTraineeSummaries(scope);
  const traineesWithEval = summaries.filter((s) => s.latestEvalScore !== null);

  let cohortMeanEvalScore: number | null = null;
  let cohortEvalPassRate: number | null = null;
  let totalEvalSessions = 0;

  for (const s of summaries) {
    totalEvalSessions += s.evalSessionsCount;
  }

  if (traineesWithEval.length > 0) {
    const sum = traineesWithEval.reduce((acc, s) => acc + (s.latestEvalScore ?? 0), 0);
    cohortMeanEvalScore = Math.round(sum / traineesWithEval.length);

    const proficientCount = traineesWithEval.filter(
      (s) => (s.latestEvalScore ?? 0) >= 70
    ).length;
    cohortEvalPassRate = Math.round((proficientCount / traineesWithEval.length) * 100);
  }

  return {
    cohortMeanEvalScore,
    cohortEvalPassRate,
    totalEvalSessions,
    activeTraineesCount: summaries.length,
  };
}

export function createMockMetrics(
  score: number,
  grade: Grade,
  mode: SessionMode = 'TRAIN',
  overrides: Partial<AARMetrics> = {}
): AARMetrics {
  const gScore = Math.min(100, Math.round(score * 1.0 + 1));
  const econScore = Math.min(100, Math.round(score * 1.02 - 1));
  return {
    sessionUid: createSessionUid(),
    mode,
    score,
    grade,
    metMs: 3200,
    mdtMs: 1450,
    mctMs: 1800,
    s2sMs: 6450,
    detToTrackMs: 450,
    clsAccuracy: 0.9,
    clsCoverage: 1.0,
    hostileRecall: 1.0,
    hostilePrecision: 0.92,
    aggregateCer: 0.08,
    unfavourableExchanges: 0,
    collateralIncidents: 0,
    roeViolations: 0,
    leakers: 0,
    leakRate: 0,
    salMs: 3100,
    salScore: 90,
    swarmSat: 0.25,
    dScore: Math.min(100, Math.round(score * 0.95 + 4)),
    cScore: Math.min(100, Math.round(score * 0.98 + 2)),
    gScore,
    econScore,
    rScore: Math.min(100, Math.round(score * 1.0 + 1)),
    confusion: [
      [2, 0, 0, 0, 0, 0],
      [0, 2, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ],
    ...overrides,
  };
}

let activeSeedingPromise: Promise<void> | null = null;

/**
 * Pre-populates realistic longitudinal training and EVAL data for unit readiness
 * if the database has zero records.
 * Uses a shared in-flight promise to guarantee concurrency safety for all readers.
 */
export async function seedDemoSessionsIfEmpty(): Promise<void> {
  if (activeSeedingPromise) {
    return await activeSeedingPromise;
  }

  activeSeedingPromise = (async () => {
    try {
      const existing = await getAllSessions('asc', 'ALL');
      if (existing.length > 0) {
        return;
      }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;

  const demoSessions: {
    callsign: string;
    mode: 'TRAIN' | 'EVAL' | 'DEMO';
    score: number;
    grade: Grade;
    dStart: number;
    scenarioId: string;
    startedAt: number;
    durationMs: number;
  }[] = [
    // VIPER-2 (Default Operator - progressive improvement curve)
    {
      callsign: 'VIPER-2',
      mode: 'TRAIN',
      score: 62,
      grade: 'DEVELOPING',
      dStart: 0.3,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 3 * day - 2 * hour,
      durationMs: 95000,
    },
    {
      callsign: 'VIPER-2',
      mode: 'TRAIN',
      score: 71,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.45,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 2 * day - 1 * hour,
      durationMs: 110000,
    },
    {
      callsign: 'VIPER-2',
      mode: 'TRAIN',
      score: 79,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.6,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 1 * day - 3 * hour,
      durationMs: 120000,
    },
    {
      callsign: 'VIPER-2',
      mode: 'EVAL',
      score: 86,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.5,
      scenarioId: 'DEMO-1',
      startedAt: now - 4 * hour,
      durationMs: 120000,
    },

    // HAWK-1 (High-scoring proficient pilot)
    {
      callsign: 'HAWK-1',
      mode: 'TRAIN',
      score: 75,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.4,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 2 * day - 5 * hour,
      durationMs: 115000,
    },
    {
      callsign: 'HAWK-1',
      mode: 'EVAL',
      score: 93,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.5,
      scenarioId: 'DEMO-1',
      startedAt: now - 6 * hour,
      durationMs: 120000,
    },

    // COBRA-3 (Solid intermediate operator)
    {
      callsign: 'COBRA-3',
      mode: 'TRAIN',
      score: 68,
      grade: 'DEVELOPING',
      dStart: 0.35,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 3 * day - 4 * hour,
      durationMs: 100000,
    },
    {
      callsign: 'COBRA-3',
      mode: 'EVAL',
      score: 76,
      grade: 'PROFICIENT_IN_SIMULATION',
      dStart: 0.5,
      scenarioId: 'DEMO-1',
      startedAt: now - 8 * hour,
      durationMs: 120000,
    },

    // GHOST-4 (In training: strictly TRAIN sessions, demonstrates Rules.md R4.4 "—" EVAL display)
    {
      callsign: 'GHOST-4',
      mode: 'TRAIN',
      score: 54,
      grade: 'NEEDS_RETRAINING',
      dStart: 0.25,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 2 * day,
      durationMs: 85000,
    },
    {
      callsign: 'GHOST-4',
      mode: 'TRAIN',
      score: 64,
      grade: 'DEVELOPING',
      dStart: 0.3,
      scenarioId: 'PROCEDURAL-1',
      startedAt: now - 12 * hour,
      durationMs: 90000,
    },
  ];

  const seedItem = async (index: number): Promise<void> => {
    if (index >= demoSessions.length) return;
    const item = demoSessions[index];
    const sessionUid = `demo-${item.callsign.toLowerCase()}-${item.startedAt}`;
    const metrics = createMockMetrics(item.score, item.grade, item.mode);
    const sessionRow: SessionRow = {
      uid: sessionUid,
      traineeUid: callsignToUid(item.callsign),
      mode: item.mode,
      startedAt: item.startedAt,
      durationMs: item.durationMs,
      score: item.score,
      grade: item.grade,
      dStart: item.dStart,
      metrics,
      scenarioId: item.scenarioId,
      aborted: false,
      unverified: false,
      isSynthetic: true,
    };
    await saveCompletedSession(sessionRow, item.callsign, 'ALPHA COY');
    return seedItem(index + 1);
  };

  await seedItem(0);
} finally {
  activeSeedingPromise = null;
}
})();

  return await activeSeedingPromise;
}

export function clearSessionRepoForTest(): void {
  inMemorySessions.length = 0;
  inMemoryTrainees.length = 0;
  inMemoryUnits.length = 0;
  resetTraineeProgressionForTest();
}

export function addTestSessions(
  sessions: SessionRow[],
  trainees?: TraineeRow[],
  units?: UnitRow[]
): void {
  inMemorySessions.push(...sessions);
  if (trainees) inMemoryTrainees.push(...trainees);
  if (units) inMemoryUnits.push(...units);
}

import { db, type SessionRow, type TraineeRow, type UnitRow } from './dexie';
import { createSessionUid } from './recorder';
import type { AARMetrics, Grade, SessionMode } from '@/sim/types';

export interface UnitTraineeSummary {
  callsign: string;
  traineeUid: string;
  unitName: string;
  totalSessions: number;
  evalSessionsCount: number;
  trainSessionsCount: number;
  latestEvalScore: number | null; // null if no completed EVAL sessions (Rules.md R4.4)
  latestEvalGrade: Grade | null;
  highestTrainDifficulty: number; // max dStart among completed TRAIN sessions
  latestMetrics: AARMetrics | null;
  meanEvalScore: number | null;
  evalPassRate: number | null; // Percentage of EVAL sessions with score >= 70
}

export interface UnitCohortStats {
  cohortMeanEvalScore: number | null;
  cohortEvalPassRate: number | null;
  totalEvalSessions: number;
  activeTraineesCount: number;
}

// In-memory fallbacks for Node.js / unit test environments where indexedDB is undefined
const inMemorySessions: SessionRow[] = [];
const inMemoryTrainees: TraineeRow[] = [];
const inMemoryUnits: UnitRow[] = [];

function callsignToUid(callsign: string): string {
  return `trainee-${callsign.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

function unitNameToUid(name: string): string {
  return `unit-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

export async function saveCompletedSession(
  session: SessionRow,
  traineeCallsign = 'VIPER-2',
  unitName = 'ALPHA COY'
): Promise<void> {
  const traineeUid = session.traineeUid || callsignToUid(traineeCallsign);
  const unitUid = unitNameToUid(unitName);
  const startedAt = session.startedAt && session.startedAt > 0 ? session.startedAt : Date.now();
  const sessionToSave: SessionRow = {
    ...session,
    startedAt,
    traineeUid,
  };

  if (typeof indexedDB === 'undefined') {
    // In-memory fallback
    if (!inMemoryUnits.some((u) => u.uid === unitUid)) {
      inMemoryUnits.push({ uid: unitUid, name: unitName });
    }
    if (!inMemoryTrainees.some((t) => t.uid === traineeUid)) {
      inMemoryTrainees.push({ uid: traineeUid, unitUid, callsign: traineeCallsign });
    }
    const existingIndex = inMemorySessions.findIndex((s) => s.uid === sessionToSave.uid);
    if (existingIndex >= 0) {
      inMemorySessions[existingIndex] = sessionToSave;
    } else {
      inMemorySessions.push(sessionToSave);
    }
    return;
  }

  await db.transaction('rw', [db.units, db.trainees, db.sessions], async () => {
    const existingUnit = await db.units.get(unitUid);
    if (!existingUnit) {
      await db.units.put({ uid: unitUid, name: unitName });
    }

    const existingTrainee = await db.trainees.get(traineeUid);
    if (!existingTrainee) {
      await db.trainees.put({ uid: traineeUid, unitUid, callsign: traineeCallsign });
    }

    await db.sessions.put(sessionToSave);
  });
}

export async function getAllTrainees(): Promise<TraineeRow[]> {
  if (typeof indexedDB === 'undefined') {
    return [...inMemoryTrainees];
  }
  return await db.trainees.toArray();
}

export async function getTraineeSessions(
  traineeUidOrCallsign?: string,
  sortOrder: 'asc' | 'desc' = 'asc'
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

  return sessions.sort((a, b) =>
    sortOrder === 'asc' ? a.startedAt - b.startedAt : b.startedAt - a.startedAt
  );
}

export async function getAllSessions(
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<SessionRow[]> {
  return await getTraineeSessions(undefined, sortOrder);
}

export async function getUnitTraineeSummaries(): Promise<UnitTraineeSummary[]> {
  const trainees = await getAllTrainees();
  const allSessions = await getAllSessions('asc');

  // Map trainees by UID
  const traineeMap = new Map<string, TraineeRow>();
  for (const t of trainees) {
    traineeMap.set(t.uid, t);
  }

  // Also discover any trainees present in sessions but not yet in trainees table
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

    // Rules.md R4.4: Leaderboards and percentiles use EVAL sessions only.
    // Aborted and unverified sessions never enter aggregates.
    const validEvalSessions = traineeSessions.filter(
      (s) => s.mode === 'EVAL' && !s.aborted && !s.unverified
    );
    const trainSessions = traineeSessions.filter((s) => s.mode === 'TRAIN');

    const evalSessionsCount = validEvalSessions.length;
    const trainSessionsCount = trainSessions.length;

    let latestEvalScore: number | null = null;
    let latestEvalGrade: Grade | null = null;
    let meanEvalScore: number | null = null;
    let evalPassRate: number | null = null;

    if (evalSessionsCount > 0) {
      const latestEval = validEvalSessions[validEvalSessions.length - 1];
      latestEvalScore = latestEval.score;
      latestEvalGrade = latestEval.grade;

      const scoreSum = validEvalSessions.reduce((acc, s) => acc + s.score, 0);
      meanEvalScore = Math.round(scoreSum / evalSessionsCount);

      const passCount = validEvalSessions.filter((s) => s.score >= 70).length;
      evalPassRate = Math.round((passCount / evalSessionsCount) * 100);
    }

    const highestTrainDifficulty =
      trainSessions.length > 0
        ? Math.max(...trainSessions.map((s) => s.dStart ?? 0))
        : 0;

    const latestMetrics =
      traineeSessions.length > 0
        ? traineeSessions[traineeSessions.length - 1].metrics
        : null;

    summaries.push({
      callsign: trainee.callsign,
      traineeUid,
      unitName: 'ALPHA COY',
      totalSessions,
      evalSessionsCount,
      trainSessionsCount,
      latestEvalScore,
      latestEvalGrade,
      highestTrainDifficulty,
      latestMetrics,
      meanEvalScore,
      evalPassRate,
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

export async function getCohortStats(): Promise<UnitCohortStats> {
  const summaries = await getUnitTraineeSummaries();
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
    econScore: Math.min(100, Math.round(score * 1.02 - 1)),
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

/**
 * Pre-populates realistic longitudinal training and EVAL data for unit readiness
 * if the database has zero records.
 */
export async function seedDemoSessionsIfEmpty(): Promise<void> {
  const existing = await getAllSessions();
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

  for (const item of demoSessions) {
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
    };
    await saveCompletedSession(sessionRow, item.callsign, 'ALPHA COY');
  }
}

export function clearSessionRepoForTest(): void {
  inMemorySessions.length = 0;
  inMemoryTrainees.length = 0;
  inMemoryUnits.length = 0;
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

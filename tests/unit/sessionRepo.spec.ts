import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCompletedSession,
  getTraineeSessions,
  getAllSessions,
  getUnitTraineeSummaries,
  getCohortStats,
  seedDemoSessionsIfEmpty,
  clearSessionRepoForTest,
  createMockMetrics,
} from '@/db/sessionRepo';
import type { SessionRow } from '@/db/dexie';

describe('TASK 20 — Unit Performance Repository & Longitudinal Tracking (Rules.md R4.4, P3-09, P3-10)', () => {
  beforeEach(() => {
    clearSessionRepoForTest();
  });

  describe('1. Session Persistence & Trainee Association', () => {
    it('persists completed sessions and automatically assigns default operator VIPER-2 and unit ALPHA COY', async () => {
      const mockMetrics = createMockMetrics(82, 'PROFICIENT_IN_SIMULATION', 'TRAIN');
      const sessionRow: SessionRow = {
        uid: 'sess-001',
        traineeUid: '',
        mode: 'TRAIN',
        startedAt: 100000,
        durationMs: 60000,
        score: 82,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.45,
        metrics: mockMetrics,
        scenarioId: 'PROCEDURAL-1',
        aborted: false,
        unverified: false,
      };

      await saveCompletedSession(sessionRow, 'VIPER-2', 'ALPHA COY');

      const saved = await getTraineeSessions('VIPER-2');
      expect(saved).toHaveLength(1);
      expect(saved[0].uid).toBe('sess-001');
      expect(saved[0].traineeUid).toBe('trainee-viper-2');
      expect(saved[0].score).toBe(82);
      expect(saved[0].grade).toBe('PROFICIENT_IN_SIMULATION');
      expect(saved[0].dStart).toBe(0.45);
    });

    it('retrieves sessions sorted ascending or descending by timestamp', async () => {
      const m1 = createMockMetrics(60, 'DEVELOPING', 'TRAIN');
      const m2 = createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'TRAIN');

      await saveCompletedSession({
        uid: 'sess-001',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 30000,
        score: 60,
        grade: 'DEVELOPING',
        dStart: 0.3,
        metrics: m1,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'sess-002',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 2000,
        durationMs: 30000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: m2,
      }, 'VIPER-2');

      const asc = await getTraineeSessions('VIPER-2', 'asc');
      expect(asc[0].uid).toBe('sess-001');
      expect(asc[1].uid).toBe('sess-002');

      const desc = await getTraineeSessions('VIPER-2', 'desc');
      expect(desc[0].uid).toBe('sess-002');
      expect(desc[1].uid).toBe('sess-001');
    });
  });

  describe('2. Rules.md R4.4 Canonical Invariants: EVAL vs TRAIN Separation', () => {
    it('strictly calculates leaderboards using EVAL sessions only and displays null (—) for TRAIN-only trainees', async () => {
      // Operator A: 2 TRAIN sessions + 1 EVAL session
      const mA1 = createMockMetrics(65, 'DEVELOPING', 'TRAIN');
      const mA2 = createMockMetrics(78, 'PROFICIENT_IN_SIMULATION', 'TRAIN');
      const mA3 = createMockMetrics(88, 'PROFICIENT_IN_SIMULATION', 'EVAL');

      await saveCompletedSession({
        uid: 'sess-a1',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 40000,
        score: 65,
        grade: 'DEVELOPING',
        dStart: 0.3,
        metrics: mA1,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'sess-a2',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 2000,
        durationMs: 40000,
        score: 78,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.55,
        metrics: mA2,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'sess-a3',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 3000,
        durationMs: 40000,
        score: 88,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: mA3,
      }, 'VIPER-2');

      // Operator B: 1 EVAL session with score 94
      const mB1 = createMockMetrics(94, 'PROFICIENT_IN_SIMULATION', 'EVAL');
      await saveCompletedSession({
        uid: 'sess-b1',
        traineeUid: 'trainee-hawk-1',
        mode: 'EVAL',
        startedAt: 2500,
        durationMs: 40000,
        score: 94,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: mB1,
      }, 'HAWK-1');

      // Operator C: TRAIN ONLY (Demonstrating Rules.md R4.4 constraint)
      const mC1 = createMockMetrics(55, 'NEEDS_RETRAINING', 'TRAIN');
      const mC2 = createMockMetrics(68, 'DEVELOPING', 'TRAIN');
      await saveCompletedSession({
        uid: 'sess-c1',
        traineeUid: 'trainee-ghost-4',
        mode: 'TRAIN',
        startedAt: 1500,
        durationMs: 40000,
        score: 55,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.25,
        metrics: mC1,
      }, 'GHOST-4');

      await saveCompletedSession({
        uid: 'sess-c2',
        traineeUid: 'trainee-ghost-4',
        mode: 'TRAIN',
        startedAt: 2800,
        durationMs: 40000,
        score: 68,
        grade: 'DEVELOPING',
        dStart: 0.4,
        metrics: mC2,
      }, 'GHOST-4');

      const summaries = await getUnitTraineeSummaries();
      expect(summaries).toHaveLength(3);

      // Rank 1: HAWK-1 (EVAL score 94)
      expect(summaries[0].callsign).toBe('HAWK-1');
      expect(summaries[0].latestEvalScore).toBe(94);
      expect(summaries[0].latestEvalGrade).toBe('PROFICIENT_IN_SIMULATION');

      // Rank 2: VIPER-2 (EVAL score 88, highest TRAIN d = 0.55)
      expect(summaries[1].callsign).toBe('VIPER-2');
      expect(summaries[1].latestEvalScore).toBe(88);
      expect(summaries[1].highestTrainDifficulty).toBe(0.55);
      expect(summaries[1].totalSessions).toBe(3);
      expect(summaries[1].evalSessionsCount).toBe(1);
      expect(summaries[1].trainSessionsCount).toBe(2);

      // Rank 3: GHOST-4 (TRAIN ONLY => latestEvalScore MUST be null)
      expect(summaries[2].callsign).toBe('GHOST-4');
      expect(summaries[2].latestEvalScore).toBeNull();
      expect(summaries[2].latestEvalGrade).toBeNull();
      expect(summaries[2].highestTrainDifficulty).toBe(0.4);
      expect(summaries[2].evalSessionsCount).toBe(0);
      expect(summaries[2].trainSessionsCount).toBe(2);
    });

    it('excludes aborted and unverified sessions from EVAL aggregates', async () => {
      // Valid EVAL session with score 76
      const m1 = createMockMetrics(76, 'PROFICIENT_IN_SIMULATION', 'EVAL');
      await saveCompletedSession({
        uid: 'sess-valid',
        traineeUid: 'trainee-cobra-3',
        mode: 'EVAL',
        startedAt: 1000,
        durationMs: 40000,
        score: 76,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: m1,
        aborted: false,
        unverified: false,
      }, 'COBRA-3');

      // Aborted EVAL session with score 20
      const mAbort = createMockMetrics(20, 'NEEDS_RETRAINING', 'EVAL');
      await saveCompletedSession({
        uid: 'sess-aborted',
        traineeUid: 'trainee-cobra-3',
        mode: 'EVAL',
        startedAt: 2000,
        durationMs: 15000,
        score: 20,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.5,
        metrics: mAbort,
        aborted: true,
        unverified: false,
      }, 'COBRA-3');

      // Unverified session with score 100
      const mUnver = createMockMetrics(100, 'PROFICIENT_IN_SIMULATION', 'EVAL');
      await saveCompletedSession({
        uid: 'sess-unverified',
        traineeUid: 'trainee-cobra-3',
        mode: 'EVAL',
        startedAt: 3000,
        durationMs: 40000,
        score: 100,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: mUnver,
        aborted: false,
        unverified: true,
      }, 'COBRA-3');

      const summaries = await getUnitTraineeSummaries();
      expect(summaries).toHaveLength(1);
      // Aborted (score 20) and Unverified (score 100) are excluded; latest valid EVAL is 76!
      expect(summaries[0].latestEvalScore).toBe(76);
      expect(summaries[0].evalSessionsCount).toBe(1);
      expect(summaries[0].totalSessions).toBe(3);
    });
  });

  describe('3. Unit Cohort Statistics Roll-up', () => {
    it('accurately computes cohort mean EVAL score and pass rate', async () => {
      // Operator 1: EVAL score 90
      await saveCompletedSession({
        uid: 'sess-1',
        traineeUid: 'trainee-hawk-1',
        mode: 'EVAL',
        startedAt: 1000,
        durationMs: 40000,
        score: 90,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      }, 'HAWK-1');

      // Operator 2: EVAL score 80
      await saveCompletedSession({
        uid: 'sess-2',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 2000,
        durationMs: 40000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
      }, 'VIPER-2');

      // Operator 3: EVAL score 50 (Developing/Fail)
      await saveCompletedSession({
        uid: 'sess-3',
        traineeUid: 'trainee-rookie-5',
        mode: 'EVAL',
        startedAt: 3000,
        durationMs: 40000,
        score: 50,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.5,
        metrics: createMockMetrics(50, 'NEEDS_RETRAINING', 'EVAL'),
      }, 'ROOKIE-5');

      const stats = await getCohortStats();
      // Mean of 90, 80, 50 = 220 / 3 = 73.33 => 73
      expect(stats.cohortMeanEvalScore).toBe(73);
      // 2 of 3 proficient (>=70) = 66.67% => 67%
      expect(stats.cohortEvalPassRate).toBe(67);
      expect(stats.totalEvalSessions).toBe(3);
      expect(stats.activeTraineesCount).toBe(3);
    });
  });

  describe('4. Automated Demo Seeding & Synthetic Isolation (Remediation D)', () => {
    it('seeds demo sessions when database is empty, isolates them from real scope, and leaves existing data intact', async () => {
      const initial = await getAllSessions();
      expect(initial).toHaveLength(0);

      await seedDemoSessionsIfEmpty();

      const seeded = await getAllSessions('asc', 'ALL');
      expect(seeded.length).toBeGreaterThan(5);

      // In real scope, synthetic sessions are strictly isolated: 0 real records
      const realTrainees = await getUnitTraineeSummaries('REAL');
      expect(realTrainees).toHaveLength(0);
      const realCohort = await getCohortStats('REAL');
      expect(realCohort.totalEvalSessions).toBe(0);
      expect(realCohort.cohortMeanEvalScore).toBeNull();
      expect(realCohort.cohortEvalPassRate).toBeNull();

      // In demo scope, all 4 demo trainees are present
      const demoTrainees = await getUnitTraineeSummaries('DEMO');
      expect(demoTrainees.map((t) => t.callsign)).toContain('VIPER-2');
      expect(demoTrainees.map((t) => t.callsign)).toContain('HAWK-1');
      expect(demoTrainees.map((t) => t.callsign)).toContain('COBRA-3');
      expect(demoTrainees.map((t) => t.callsign)).toContain('GHOST-4');

      // GHOST-4 in demo data is TRAIN-only, so their latestEvalScore must be null
      const ghost = demoTrainees.find((t) => t.callsign === 'GHOST-4');
      expect(ghost).toBeDefined();
      expect(ghost?.latestEvalScore).toBeNull();

      // Running seedDemoSessionsIfEmpty a second time does not duplicate rows (concurrency/idempotence check)
      const countBefore = seeded.length;
      await seedDemoSessionsIfEmpty();
      const countAfter = (await getAllSessions('asc', 'ALL')).length;
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('5. Session Start Timestamp & EVAL Metric Separation (Remediations C & E)', () => {
    it('preserves real session startedAt timestamp without overwriting with current time', async () => {
      const explicitStart = 1700000000000;
      await saveCompletedSession({
        uid: 'sess-timestamp-test',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: explicitStart,
        durationMs: 45000,
        score: 85,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
      }, 'VIPER-2');

      const retrieved = await getTraineeSessions('VIPER-2', 'asc', 'REAL');
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].startedAt).toBe(explicitStart);
    });

    it('strictly separates latestEvalMetrics from later TRAIN sessions and excludes aborted TRAIN from highestTrainDifficulty', async () => {
      // 1. Valid EVAL session (score 90, dStart 0.5, MET 3200ms)
      const mEval = createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'EVAL', { metMs: 3200 });
      await saveCompletedSession({
        uid: 'sess-eval-1',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1000,
        durationMs: 40000,
        score: 90,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: mEval,
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      // 2. Aborted TRAIN session with high difficulty (dStart 0.9) - MUST NOT count as highestTrainDifficulty!
      const mAbortedTrain = createMockMetrics(40, 'NEEDS_RETRAINING', 'TRAIN');
      await saveCompletedSession({
        uid: 'sess-train-abort',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 2000,
        durationMs: 10000,
        score: 40,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.9,
        metrics: mAbortedTrain,
        aborted: true,
        unverified: false,
      }, 'VIPER-2');

      // 3. Completed valid TRAIN session (dStart 0.65, score 75, MET 8000ms)
      const mTrain = createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'TRAIN', { metMs: 8000 });
      await saveCompletedSession({
        uid: 'sess-train-valid',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 3000,
        durationMs: 40000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.65,
        metrics: mTrain,
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      const summaries = await getUnitTraineeSummaries('REAL');
      expect(summaries).toHaveLength(1);
      const viper = summaries[0];

      // Highest train difficulty must be 0.65 (not the aborted 0.9)
      expect(viper.highestTrainDifficulty).toBe(0.65);

      // Latest EVAL metrics must be from sess-eval-1 (score 90, metMs 3200), NOT from the later TRAIN session!
      expect(viper.latestEvalScore).toBe(90);
      expect(viper.latestEvalMetrics?.score).toBe(90);
      expect(viper.latestEvalMetrics?.metMs).toBe(3200);
      expect(viper.latestMetrics?.score).toBe(90);
    });
  });

  describe('5. Concurrency-Safe Seeding & Shared Completion (High-priority D)', () => {
    it('concurrent seedDemoSessionsIfEmpty() calls await the same promise and resolve without duplicate rows', async () => {
      // Execute 5 concurrent seeding requests simultaneously
      const results = await Promise.all([
        seedDemoSessionsIfEmpty(),
        seedDemoSessionsIfEmpty(),
        seedDemoSessionsIfEmpty(),
        seedDemoSessionsIfEmpty(),
        seedDemoSessionsIfEmpty(),
      ]);

      // All 5 must resolve cleanly
      expect(results).toHaveLength(5);

      // Verify exact count of demo sessions without duplication
      const allSessions = await getAllSessions('asc', 'ALL');
      // Demo dataset has exactly 10 sessions (4 for VIPER-2, 2 for HAWK-1, 2 for COBRA-3, 2 for GHOST-4)
      expect(allSessions).toHaveLength(10);

      // Verify that all seeded sessions are immediately visible to all callers
      const viperSessions = await getTraineeSessions('VIPER-2', 'asc', 'DEMO');
      expect(viperSessions).toHaveLength(4);

      // Verify idempotence on subsequent calls
      await seedDemoSessionsIfEmpty();
      const allSessionsAfterSecondCall = await getAllSessions('asc', 'ALL');
      expect(allSessionsAfterSecondCall).toHaveLength(10);
    });
  });

  describe('6. Explicit Training Session Counts (High-priority C)', () => {
    it('differentiates completed verified drills from total attempts, strictly excluding aborted, unverified, and synthetic runs from trainSessionsCount', async () => {
      // 1. Valid completed TRAIN drill
      await saveCompletedSession({
        uid: 'train-valid-1',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.4,
        metrics: createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      // 2. Aborted TRAIN drill
      await saveCompletedSession({
        uid: 'train-aborted-2',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 2000,
        durationMs: 15000,
        score: 30,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.5,
        metrics: createMockMetrics(30, 'NEEDS_RETRAINING', 'TRAIN'),
        aborted: true,
        unverified: false,
      }, 'VIPER-2');

      // 3. Unverified TRAIN drill
      await saveCompletedSession({
        uid: 'train-unverified-3',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 3000,
        durationMs: 60000,
        score: 90,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.6,
        metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
        aborted: false,
        unverified: true,
      }, 'VIPER-2');

      // 4. Valid completed EVAL drill
      await saveCompletedSession({
        uid: 'eval-valid-4',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 4000,
        durationMs: 120000,
        score: 88,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(88, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      const summaries = await getUnitTraineeSummaries('REAL');
      expect(summaries).toHaveLength(1);
      const viper = summaries[0];

      // Completed verified TRAIN drills must be exactly 1 (excluding aborted & unverified)
      expect(viper.trainSessionsCount).toBe(1);

      // Total TRAIN attempts must be 3 (all attempts regardless of outcome)
      expect(viper.trainAttemptsCount).toBe(3);

      // Valid EVAL drills must be 1
      expect(viper.evalSessionsCount).toBe(1);

      // Total session attempts recorded in repository is 4 (3 TRAIN + 1 EVAL)
      expect(viper.totalSessions).toBe(4);
    });
  });

  describe('7. Historical Metrics Handling & Missing Data Representation (Critical B)', () => {
    it('preserves undefined gScore for historical sessions without inventing zero or arbitrary scores', async () => {
      // Historical session where gScore is undefined
      const legacySession: SessionRow = {
        uid: 'sess-historical-missing-g',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1000,
        durationMs: 60000,
        score: 84,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: {
          ...createMockMetrics(84, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
      };

      await saveCompletedSession(legacySession, 'VIPER-2');

      const summaries = await getUnitTraineeSummaries('REAL');
      expect(summaries).toHaveLength(1);
      expect(summaries[0].latestEvalMetrics).toBeDefined();
      expect(summaries[0].latestEvalMetrics?.score).toBe(84);
      expect(summaries[0].latestEvalMetrics?.gScore).toBeUndefined();
      expect(summaries[0].latestEvalMetrics?.gScore).not.toBe(0);
    });

    it('correctly distinguishes a measured zero G score from missing data', async () => {
      const zeroGSession: SessionRow = {
        uid: 'sess-measured-zero-g',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 2000,
        durationMs: 60000,
        score: 40,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(40, 'NEEDS_RETRAINING', 'EVAL'),
          gScore: 0,
        },
      };

      await saveCompletedSession(zeroGSession, 'VIPER-2');

      const summaries = await getUnitTraineeSummaries('REAL');
      expect(summaries).toHaveLength(1);
      expect(summaries[0].latestEvalMetrics?.gScore).toBe(0);
      expect(summaries[0].latestEvalMetrics?.gScore).not.toBeUndefined();
    });
  });
});

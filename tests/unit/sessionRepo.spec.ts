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

  describe('4. Automated Demo Seeding', () => {
    it('seeds demo sessions when database is empty and leaves existing data intact', async () => {
      const initial = await getAllSessions();
      expect(initial).toHaveLength(0);

      await seedDemoSessionsIfEmpty();

      const seeded = await getAllSessions();
      expect(seeded.length).toBeGreaterThan(5);

      const trainees = await getUnitTraineeSummaries();
      expect(trainees.map((t) => t.callsign)).toContain('VIPER-2');
      expect(trainees.map((t) => t.callsign)).toContain('HAWK-1');
      expect(trainees.map((t) => t.callsign)).toContain('COBRA-3');
      expect(trainees.map((t) => t.callsign)).toContain('GHOST-4');

      // GHOST-4 in demo data is TRAIN-only, so their latestEvalScore must be null
      const ghost = trainees.find((t) => t.callsign === 'GHOST-4');
      expect(ghost).toBeDefined();
      expect(ghost?.latestEvalScore).toBeNull();

      // Running seedDemoSessionsIfEmpty a second time does not duplicate rows
      const countBefore = seeded.length;
      await seedDemoSessionsIfEmpty();
      const countAfter = (await getAllSessions()).length;
      expect(countAfter).toBe(countBefore);
    });
  });
});

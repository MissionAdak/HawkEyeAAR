import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLegacySession, type SessionRow } from '@/db/dexie';
import {
  saveCompletedSession,
  getTraineeSessions,
  clearSessionRepoForTest,
  createMockMetrics,
} from '@/db/sessionRepo';
import type { SimEvent } from '@/sim/types';

describe('TASK 20-A1 — Legacy IndexedDB Migration & Historical Metric Reconciliation (Critical A & B)', () => {
  beforeEach(() => {
    clearSessionRepoForTest();
  });

  describe('Critical A: Old-to-New Schema Migration & Synthetic Record Detection', () => {
    it('detects legacy synthetic records by historical demo-{callsign}-{timestamp} UID pattern and marks them isSynthetic: true', () => {
      const legacySyntheticEval: SessionRow = {
        uid: 'demo-viper2-1700000000000',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 120000,
        score: 86,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(86, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        aborted: false,
        unverified: false,
        // isSynthetic is undefined in legacy Task 20 records
      };

      const migrated = migrateLegacySession(legacySyntheticEval);
      expect(migrated.isSynthetic).toBe(true);
      expect(migrated.uid).toBe('demo-viper2-1700000000000');
      expect(migrated.startedAt).toBe(1700000000000);
      expect(migrated.traineeUid).toBe('trainee-viper-2');
    });

    it('preserves genuine real sessions and does not classify them as synthetic', () => {
      const legacyRealEval: SessionRow = {
        uid: 'session-20261121-viper2-001',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000005000,
        durationMs: 120000,
        score: 92,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(92, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        aborted: false,
        unverified: false,
      };

      const migrated = migrateLegacySession(legacyRealEval);
      expect(migrated.isSynthetic).toBe(false);
      expect(migrated.uid).toBe('session-20261121-viper2-001');
      expect(migrated.startedAt).toBe(1700000005000);
      expect(migrated.score).toBe(92);
    });

    it('preserves historical TRAIN records associated with correct trainee without duplication', async () => {
      const legacyTrain: SessionRow = {
        uid: 'session-train-ghost4-001',
        traineeUid: 'trainee-ghost-4',
        mode: 'TRAIN',
        startedAt: 1700000010000,
        durationMs: 90000,
        score: 64,
        grade: 'DEVELOPING',
        dStart: 0.35,
        metrics: createMockMetrics(64, 'DEVELOPING', 'TRAIN'),
        scenarioId: 'PROCEDURAL-1',
        aborted: false,
        unverified: false,
      };

      await saveCompletedSession(legacyTrain, 'GHOST-4');

      const sessions = await getTraineeSessions('GHOST-4', 'asc', 'REAL');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].uid).toBe('session-train-ghost4-001');
      expect(sessions[0].traineeUid).toBe('trainee-ghost-4');
      expect(sessions[0].isSynthetic).toBe(false);
      expect(sessions[0].startedAt).toBe(1700000010000);
    });

    it('excludes migrated legacy synthetic records from REAL operational scope while retaining them in DEMO scope', async () => {
      // 1. Insert legacy synthetic EVAL session
      await saveCompletedSession({
        uid: 'demo-viper2-1700000000000',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 120000,
        score: 86,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(86, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      }, 'VIPER-2');

      // 2. Insert real operational EVAL session
      await saveCompletedSession({
        uid: 'session-viper2-real-001',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000020000,
        durationMs: 120000,
        score: 95,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        isSynthetic: false,
      }, 'VIPER-2');

      // 3. Query under REAL scope: should only see the real session
      const realSessions = await getTraineeSessions('VIPER-2', 'asc', 'REAL');
      expect(realSessions).toHaveLength(1);
      expect(realSessions[0].uid).toBe('session-viper2-real-001');
      expect(realSessions[0].score).toBe(95);

      // 4. Query under DEMO scope: should see the migrated synthetic session
      const demoSessions = await getTraineeSessions('VIPER-2', 'asc', 'DEMO');
      expect(demoSessions).toHaveLength(1);
      expect(demoSessions[0].uid).toBe('demo-viper2-1700000000000');
      expect(demoSessions[0].score).toBe(86);
      expect(demoSessions[0].isSynthetic).toBe(true);
    });
  });

  describe('Critical B: Historical gScore Reconstruction and Missing Data Representation', () => {
    it('reconstructs actual G value from stored event history using authoritative aggregateAARMetrics()', () => {
      // Create representative stored event stream where a hostile attack drone was engaged and neutralized
      const storedEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        {
          seq: 2,
          tMs: 2000,
          type: 'TRACK_INIT',
          trackNo: 'T-01',
          entityId: 'H-1',
          payload: { trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK', valueInr: 100000 },
        },
        { seq: 3, tMs: 3000, type: 'DESIGNATE', trackNo: 'T-01', payload: {} },
        { seq: 4, tMs: 4000, type: 'CLASSIFY', trackNo: 'T-01', payload: { label: 'HOSTILE_ATTACK' } },
        {
          seq: 5,
          tMs: 5000,
          type: 'ENGAGE',
          trackNo: 'T-01',
          payload: { effector: 'RF_SOFTKILL', rangeM: 1800, cer: 0.001 },
        },
        {
          seq: 6,
          tMs: 6000,
          type: 'ENGAGE_RESULT',
          trackNo: 'T-01',
          payload: { success: true, effector: 'RF_SOFTKILL' },
        },
        { seq: 7, tMs: 7000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      // Legacy session whose metrics object lacked gScore
      const legacySession: SessionRow = {
        uid: 'session-legacy-with-events',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 7000,
        score: 95,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number, // Missing in historical record
        },
        scenarioId: 'DEMO-1',
      };

      expect(legacySession.metrics.gScore).toBeUndefined();

      const migrated = migrateLegacySession(legacySession, storedEvents);
      expect(migrated.metrics.gScore).toBeDefined();
      expect(typeof migrated.metrics.gScore).toBe('number');
      expect(migrated.metrics.gScore).toBeGreaterThan(0);
    });

    it('leaves gScore explicitly undefined when stored events are unavailable (never invents a value or defaults to zero)', () => {
      const legacySessionNoEvents: SessionRow = {
        uid: 'session-legacy-incomplete',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 120000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
      };

      // Pass empty events array
      const migrated = migrateLegacySession(legacySessionNoEvents, []);
      expect(migrated.metrics.gScore).toBeUndefined();
      expect(migrated.metrics.gScore).not.toBe(0);
    });

    it('preserves a genuine measured G value of zero without treating it as missing data', () => {
      const zeroGSession: SessionRow = {
        uid: 'session-genuine-zero-g',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 120000,
        score: 45,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(45, 'NEEDS_RETRAINING', 'EVAL'),
          gScore: 0, // Genuine 0 (e.g., unopposed leaker)
        },
        scenarioId: 'DEMO-1',
      };

      const migrated = migrateLegacySession(zeroGSession);
      expect(migrated.metrics.gScore).toBe(0);
      expect(migrated.metrics.gScore).not.toBeUndefined();
    });

    it('preserves a positive measured G score on newly created sessions', () => {
      const positiveGSession: SessionRow = {
        uid: 'session-positive-g',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 120000,
        score: 88,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: {
          ...createMockMetrics(88, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: 89,
        },
        scenarioId: 'DEMO-1',
      };

      const migrated = migrateLegacySession(positiveGSession);
      expect(migrated.metrics.gScore).toBe(89);
    });
  });
});

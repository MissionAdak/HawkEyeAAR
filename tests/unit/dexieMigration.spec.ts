import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateLegacySession,
  validateHistoricalEventLog,
  type SessionRow,
  type StoredSimEvent,
} from '@/db/dexie';
import {
  saveCompletedSession,
  getTraineeSessions,
  clearSessionRepoForTest,
  createMockMetrics,
} from '@/db/sessionRepo';
import type { SimEvent } from '@/sim/types';

describe('TASK 20-A2 — Legacy IndexedDB Migration & Historical Metric Reconciliation (Critical A & B)', () => {
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
      await saveCompletedSession(
        {
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
        },
        'VIPER-2'
      );

      // 2. Insert real operational EVAL session
      await saveCompletedSession(
        {
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
        },
        'VIPER-2'
      );

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

  describe('Critical B: Event Log Completeness Validation (validateHistoricalEventLog)', () => {
    it('rejects empty or single-event logs', () => {
      expect(validateHistoricalEventLog([]).isValid).toBe(false);
      expect(
        validateHistoricalEventLog([{ seq: 1, tMs: 0, type: 'SIM_START', payload: {} }]).isValid
      ).toBe(false);
    });

    it('rejects stream that does not begin with SIM_START', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 100, type: 'TRACK_INIT', trackNo: 'T-01', payload: {} },
        { seq: 2, tMs: 200, type: 'SESSION_END', payload: { aborted: false } },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('First event must be SIM_START');
    });

    it('rejects stream that does not terminate with SESSION_END', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL' } },
        { seq: 2, tMs: 1000, type: 'TRACK_INIT', trackNo: 'T-01', payload: {} },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Terminal event must be SESSION_END');
    });

    it('rejects aborted sessions as non-terminal / incomplete event history', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL' } },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: true } },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('aborted');
    });

    it('rejects stream with discontinuous sequence numbers', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL' } },
        { seq: 3, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } }, // seq 2 missing
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Discontinuous sequence number');
    });

    it('rejects stream with mismatched sessionUid in stored events', () => {
      const events: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL' }, sessionUid: 'sess-A' },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-B' },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Inconsistent sessionUid');
    });

    it('rejects stream where SIM_START mode disagrees with stored session mode', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'TRAIN', scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];
      const session: SessionRow = {
        uid: 'sess-mode-mismatch',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Session mode');
    });

    it('accepts complete, contiguous, matching event log', () => {
      const events: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' }, sessionUid: 'sess-valid' },
        { seq: 2, tMs: 1000, type: 'TRACK_INIT', trackNo: 'T-01', payload: {}, sessionUid: 'sess-valid' },
        { seq: 3, tMs: 2000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-valid' },
      ];
      const session: SessionRow = {
        uid: 'sess-valid',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 2000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Critical B: Historical gScore Reconstruction Fixtures & Missing Data Handling', () => {
    it('reconstructs exact numerical G = 100 for a neutralized hostile target', () => {
      const storedEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'SINGLE-TARGET-EVAL' } },
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
          payload: { effector: 'RF_SOFTKILL', rangeM: 1100, cer: 0.001 },
        },
        {
          seq: 6,
          tMs: 6000,
          type: 'ENGAGE_RESULT',
          trackNo: 'T-01',
          payload: { killed: true, effector: 'RF_SOFTKILL' },
        },
        { seq: 7, tMs: 7000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      const legacySession: SessionRow = {
        uid: 'session-reconstructed-100',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 7000,
        score: 95,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'SINGLE-TARGET-EVAL',
      };

      const migrated = migrateLegacySession(legacySession, storedEvents);
      expect(migrated.metrics.gScore).toBe(100);
    });

    it('reconstructs exact numerical G = 30 for an engaged but leaked hostile target', () => {
      const storedEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'SINGLE-TARGET-EVAL' } },
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
          payload: { effector: 'RF_SOFTKILL', rangeM: 1100, cer: 0.001 },
        },
        {
          seq: 6,
          tMs: 6000,
          type: 'ENGAGE_RESULT',
          trackNo: 'T-01',
          payload: { killed: false, effector: 'RF_SOFTKILL' },
        },
        { seq: 7, tMs: 7000, type: 'LEAK', trackNo: 'T-01', payload: {} },
        { seq: 8, tMs: 8000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      const legacySession: SessionRow = {
        uid: 'session-reconstructed-30',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 8000,
        score: 65,
        grade: 'DEVELOPING',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(65, 'DEVELOPING', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'SINGLE-TARGET-EVAL',
      };

      const migrated = migrateLegacySession(legacySession, storedEvents);
      expect(migrated.metrics.gScore).toBe(30);
    });

    it('reconstructs exact numerical G = 0 for an unopposed hostile leaker and preserves genuine zero', () => {
      const storedEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'SINGLE-TARGET-EVAL' } },
        {
          seq: 2,
          tMs: 2000,
          type: 'TRACK_INIT',
          trackNo: 'T-01',
          entityId: 'H-1',
          payload: { trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK', valueInr: 100000 },
        },
        { seq: 3, tMs: 7000, type: 'LEAK', trackNo: 'T-01', payload: {} },
        { seq: 4, tMs: 8000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      const legacySession: SessionRow = {
        uid: 'session-reconstructed-zero',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 8000,
        score: 40,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(40, 'NEEDS_RETRAINING', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'SINGLE-TARGET-EVAL',
      };

      const migrated = migrateLegacySession(legacySession, storedEvents);
      expect(migrated.metrics.gScore).toBe(0);
      expect(migrated.metrics.gScore).not.toBeUndefined();
    });

    it('leaves gScore undefined when event log is missing or invalid (never approximates or invents)', () => {
      const legacySession: SessionRow = {
        uid: 'session-invalid-stream',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 8000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
      };

      // Discontinuous events (missing seq 2)
      const invalidEvents: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 3, tMs: 8000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      const migrated = migrateLegacySession(legacySession, invalidEvents);
      expect(migrated.metrics.gScore).toBeUndefined();
    });

    it('preserves an existing genuine G score of zero without re-evaluating or treating as missing', () => {
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
          gScore: 0, // Genuine measured zero
        },
        scenarioId: 'DEMO-1',
      };

      const migrated = migrateLegacySession(zeroGSession);
      expect(migrated.metrics.gScore).toBe(0);
      expect(migrated.metrics.gScore).not.toBeUndefined();
    });

    it('preserves a positive measured G score without modification', () => {
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

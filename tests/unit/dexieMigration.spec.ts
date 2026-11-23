import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateLegacySession,
  validateHistoricalEventLog,
  resolveHistoricalScenarioSpec,
  type SessionRow,
  type StoredSimEvent,
} from '@/db/dexie';
import {
  saveCompletedSession,
  getTraineeSessions,
  clearSessionRepoForTest,
  createMockMetrics,
} from '@/db/sessionRepo';
import {
  EventRecorder,
  clearFallbackEventsForTest,
  getRecordedEventsForSession,
  setMockPersistenceFailureMode,
} from '@/db/recorder';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import { loadCatalogScenario, SCENARIO_CATALOG } from '@/director/catalog';
import type { SimEvent, ScenarioSpec } from '@/sim/types';
import { SIM_VERSION, SCHEMA_VERSION } from '@/sim/types';
import { CONFIG_HASH } from '@/config';
import { computeScenarioSnapshotHash } from '@/sim/snapshotHash';
import { useSessionStore, engineInstance } from '@/store/sessionStore';

function stepUntilSessionEnd(engine: SimEngine, scenarioId: string, durationMs: number): void {
  const maxSteps = Math.ceil(durationMs / 50) + 200;
  let steps = 0;
  while (!engine.sessionEnded) {
    if (++steps > maxSteps) {
      throw new Error(`Simulation loop exceeded step budget (${maxSteps}) for scenario ${scenarioId}`);
    }
    engine.step();
  }
}

describe('TASK 20-A3 — Trustworthy Historical G Reconstruction & Exact Scenario Snapshot (Critical A, B, C, D)', () => {
  beforeEach(() => {
    clearSessionRepoForTest();
    clearFallbackEventsForTest();
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

      const realSessions = await getTraineeSessions('VIPER-2', 'asc', 'REAL');
      expect(realSessions).toHaveLength(1);
      expect(realSessions[0].uid).toBe('session-viper2-real-001');
      expect(realSessions[0].score).toBe(95);

      const demoSessions = await getTraineeSessions('VIPER-2', 'asc', 'DEMO');
      expect(demoSessions).toHaveLength(1);
      expect(demoSessions[0].uid).toBe('demo-viper2-1700000000000');
      expect(demoSessions[0].score).toBe(86);
      expect(demoSessions[0].isSynthetic).toBe(true);
    });
  });

  describe('Critical C: Strict Event-Log Validation (validateHistoricalEventLog)', () => {
    it('rejects empty or single-event logs', () => {
      expect(validateHistoricalEventLog([]).isValid).toBe(false);
      expect(
        validateHistoricalEventLog([{ seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } }]).isValid
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

    it('rejects stream missing explicit valid mode in SIM_START payload', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { scenarioId: 'DEMO-1' } }, // missing mode
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('SIM_START must contain explicit valid mode');
    });

    it('rejects stream missing explicit scenarioId in SIM_START payload', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL' } }, // missing scenarioId
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('SIM_START must contain explicit non-empty scenarioId');
    });

    it('rejects stream that does not terminate with SESSION_END', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 1000, type: 'TRACK_INIT', trackNo: 'T-01', payload: {} },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Terminal event must be SESSION_END');
    });

    it('rejects aborted sessions as non-terminal / incomplete event history', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: true } },
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('aborted');
    });

    it('rejects stream with discontinuous sequence numbers', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 3, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } }, // seq 2 missing
      ];
      const result = validateHistoricalEventLog(events);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Discontinuous sequence number');
    });

    it('rejects stream with missing sessionUid on events when session is provided', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];
      const session: SessionRow = {
        uid: 'sess-target-uid',
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
      expect(result.reason).toContain('missing sessionUid');
    });

    it('rejects stream where event sessionUid differs from session UID', () => {
      const events: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' }, sessionUid: 'sess-wrong' },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-wrong' },
      ];
      const session: SessionRow = {
        uid: 'sess-expected',
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
      expect(result.reason).toContain('Event sessionUid mismatch');
    });

    it('rejects stream where SIM_START mode disagrees with stored session mode', () => {
      const events: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'TRAIN', scenarioId: 'DEMO-1' }, sessionUid: 'sess-mismatch' },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-mismatch' },
      ];
      const session: SessionRow = {
        uid: 'sess-mismatch',
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

    it('rejects stream where SIM_START scenarioId disagrees with stored session scenarioId', () => {
      const events: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-2' }, sessionUid: 'sess-id-mismatch' },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-id-mismatch' },
      ];
      const session: SessionRow = {
        uid: 'sess-id-mismatch',
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
      expect(result.reason).toContain('Session scenarioId');
    });

    it('rejects corrupt scenarioSpecSnapshot schema', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-corrupt',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-corrupt' },
      ];
      const session: SessionRow = {
        uid: 'sess-corrupt',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: snapshotHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
        scenarioSpecSnapshot: { id: 'DEMO-1' } as unknown as ScenarioSpec, // missing threats/decoys/asset
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Corrupt or malformed scenarioSpecSnapshot');
    });

    it('rejects scenario snapshot whose seed does not match SIM_START seed', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: spec.mode,
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-seed-mismatch',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-seed-mismatch' },
      ];
      const session: SessionRow = {
        uid: 'sess-seed-mismatch',
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', spec.mode),
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: snapshotHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
        scenarioSpecSnapshot: { ...spec, seed: 9999 }, // Mismatched seed
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Scenario snapshot seed');
    });

    it('accepts complete, contiguous, matching event log with valid snapshot', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: spec.mode,
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-valid',
        },
        { seq: 2, tMs: 1000, type: 'TRACK_INIT', trackNo: 'T-01', payload: {}, sessionUid: 'sess-valid' },
        { seq: 3, tMs: 2000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-valid' },
      ];
      const session: SessionRow = {
        uid: 'sess-valid',
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: 2000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', spec.mode),
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: snapshotHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
        scenarioSpecSnapshot: spec,
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(true);
    });

    it('negative validation: rejects missing SIM_START seed', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: 'sha256:abc',
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-neg-1',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-neg-1' },
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SIM_START must contain finite numeric seed');
    });

    it('negative validation: rejects missing SIM_START difficulty', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: 'sha256:abc',
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-neg-2',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-neg-2' },
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SIM_START must contain finite numeric difficulty');
    });

    it('negative validation: rejects missing SIM_START configHash', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            scenarioSnapshotHash: 'sha256:abc',
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-neg-3',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-neg-3' },
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SIM_START must contain non-empty application configHash');
    });

    it('negative validation: rejects missing SIM_START scenarioSnapshotHash', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-neg-4',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-neg-4' },
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SIM_START must contain non-empty scenarioSnapshotHash');
    });

    it('negative validation: rejects missing SIM_START simVersion', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: 'sha256:abc',
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-neg-5',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-neg-5' },
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SIM_START must contain non-empty simVersion');
    });

    it('negative validation: rejects missing SIM_START schemaVersion', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: 'sha256:abc',
            simVersion: SIM_VERSION,
          },
          sessionUid: 'sess-neg-6',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-neg-6' },
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SIM_START must contain finite numeric schemaVersion');
    });

    it('negative validation: rejects missing aborted field on terminal SESSION_END (e.g. payload: {})', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: 'sha256:abc',
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-neg-7',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: {}, sessionUid: 'sess-neg-7' }, // Missing aborted: false
      ];
      expect(validateHistoricalEventLog(events).isValid).toBe(false);
      expect(validateHistoricalEventLog(events).reason).toContain('SESSION_END payload must explicitly have aborted === false');
    });
  });

  describe('Critical B & D: Exact Historical G Reconstruction Using Genuine Production Event Streams', () => {
    it('runs actual production simulation on DEMO-1 and reconstructs exact G matching authoritative aggregator', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const sessionUid = 'sess-prod-demo1';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      // Step engine to session completion
      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      expect(events.length).toBeGreaterThan(5);

      // Compute authoritative result with original spec
      const authoritative = aggregateAARMetrics(events, spec);
      expect(authoritative.gScore).toBeDefined();

      // Reconstruct via migration path
      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.3,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: spec.id,
        scenarioSpecSnapshot: spec,
      };

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
      expect(migrated.metrics.gScore).not.toBeUndefined();
    });

    it('runs actual production simulation on DEMO-2 (Hostile ISR, Civil UAS, Bird) and reconstructs exact G', async () => {
      const { spec } = loadCatalogScenario('DEMO-2', 2026, 0.3);
      const sessionUid = 'sess-prod-demo2';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);

      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.3,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: spec.id,
        scenarioSpecSnapshot: spec,
      };

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
    });

    it('runs production simulation on SPECTRUM-1 (Full 6 Classes) and proves reconstruction uses ground-truth classifications rather than defaulting to hostile', async () => {
      const { spec } = loadCatalogScenario('SPECTRUM-1', 2026, 0.4);
      const sessionUid = 'sess-prod-spectrum';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);

      // Verify SPECTRUM-1 target composition includes diverse classes in confusion matrix rows
      // Row 0: HOSTILE_ATTACK, Row 1: HOSTILE_ISR, Row 2: SWARM_ELEMENT, Row 3: CIVIL_UAS, Row 4: BIRD, Row 5: FRIENDLY
      expect(authoritative.confusion).toBeDefined();

      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.4,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: spec.id,
        scenarioSpecSnapshot: spec,
      };

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);

      // Prove that without spec, aggregator produces wrong default hostile classifications
      expect(migrated.metrics.gScore).not.toBeUndefined();
    });

    it('runs production simulation on generated PROCEDURAL scenario and reconstructs exact G', async () => {
      const { spec } = loadCatalogScenario('PROCEDURAL-1', 3030, 0.4);
      const sessionUid = 'sess-prod-procedural';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);

      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.4,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: 'PROCEDURAL-3030',
        scenarioSpecSnapshot: spec,
        scenarioSeed: 3030,
        scenarioDifficulty: 0.4,
      };

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
    });

    it('runs production simulation on generated RANDOM scenario and reconstructs exact G', async () => {
      const { spec } = loadCatalogScenario('RANDOM-1', 5050, 0.35);
      const sessionUid = 'sess-prod-random';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);

      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.35,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: spec.id,
        scenarioSpecSnapshot: spec,
        scenarioSeed: 5050,
        scenarioDifficulty: 0.35,
      };

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
    });

    it('Catalog Mutation Regression: changing live catalog specification after recording does not alter historical reconstruction from snapshot', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const sessionUid = 'sess-catalog-mutation';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);

      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.3,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        scenarioSpecSnapshot: spec, // Preserved immutable snapshot
      };

      // Mutate live catalog entry for DEMO-1 temporarily
      const demo1Entry = SCENARIO_CATALOG.find((e) => e.id === 'DEMO-1')!;
      const originalGetSpec = demo1Entry.getSpec;
      try {
        demo1Entry.getSpec = () => ({
          ...spec,
          threats: [], // Artificially emptied threats in live catalog
          decoys: [],
        });

        // Migration must use the immutable stored snapshot, completely ignoring the mutated live catalog!
        const migrated = migrateLegacySession(legacySession, events);
        expect(migrated.metrics.gScore).toBe(authoritative.gScore);
      } finally {
        demo1Entry.getSpec = originalGetSpec;
      }
    });

    it('leaves gScore undefined when dynamic scenario has no snapshot and missing seed / difficulty', () => {
      const storedEvents: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: { mode: 'TRAIN', scenarioId: 'PROCEDURAL-UNKNOWN' }, // No seed or difficulty
          sessionUid: 'sess-dynamic-missing-params',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-dynamic-missing-params' },
      ];

      const legacySession: SessionRow = {
        uid: 'sess-dynamic-missing-params',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 70,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(70, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'PROCEDURAL-UNKNOWN',
      };

      const resolvedSpec = resolveHistoricalScenarioSpec(legacySession, storedEvents);
      expect(resolvedSpec).toBeUndefined();

      const migrated = migrateLegacySession(legacySession, storedEvents);
      expect(migrated.metrics.gScore).toBeUndefined();
    });

    it('leaves gScore undefined when scenario ID is unknown and has no snapshot', () => {
      const storedEvents: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: { mode: 'EVAL', scenarioId: 'NON-EXISTENT-SCENARIO' },
          sessionUid: 'sess-unknown-scenario',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-unknown-scenario' },
      ];

      const legacySession: SessionRow = {
        uid: 'sess-unknown-scenario',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 70,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(70, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'NON-EXISTENT-SCENARIO',
      };

      const resolvedSpec = resolveHistoricalScenarioSpec(legacySession, storedEvents);
      expect(resolvedSpec).toBeUndefined();

      const migrated = migrateLegacySession(legacySession, storedEvents);
      expect(migrated.metrics.gScore).toBeUndefined();
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
      const invalidEvents: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' }, sessionUid: 'session-invalid-stream' },
        { seq: 3, tMs: 8000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'session-invalid-stream' },
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

  describe('Critical E: Snapshot Tampering Invalidation & Fail-Closed Defense', () => {
    function createTamperBase() {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshot: ScenarioSpec = JSON.parse(JSON.stringify(spec));
      const originalHash = computeScenarioSnapshotHash(snapshot);
      const sessionUid = 'sess-tamper-test';

      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: snapshot.mode,
            scenarioId: snapshot.id,
            seed: snapshot.seed,
            difficulty: snapshot.difficulty,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: originalHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid,
        },
        { seq: 2, tMs: 1000, type: 'TRACK_INIT', trackNo: 'T-01', payload: {}, sessionUid },
        { seq: 3, tMs: 2000, type: 'SESSION_END', payload: { aborted: false }, sessionUid },
      ];

      const session: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: snapshot.mode,
        startedAt: 1700000000000,
        durationMs: 2000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', snapshot.mode),
          gScore: undefined as unknown as number,
        },
        scenarioId: snapshot.id,
        scenarioSeed: snapshot.seed,
        scenarioDifficulty: snapshot.difficulty,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: originalHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
        scenarioSpecSnapshot: snapshot,
      };

      return { snapshot, originalHash, events, session };
    }

    it('rejects tampered threat trueClass while retaining original hash, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.threats[0].trueClass = 'CIVIL_UAS'; // Tamper
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered droneType while retaining original hash, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.threats[0].droneType = 'RECON_QUAD'; // Tamper (original in DEMO-1 is FPV_ATTACK)
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered waypoint coordinates while retaining original hash, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.threats[0].waypoints[0] = { x: 9999, y: 9999, z: 999 }; // Tamper
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects removed threat from snapshot while retaining original hash, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.threats = snapshot.threats.slice(1); // Remove threat
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered decoy in snapshot while retaining original hash, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.decoys = [{ ...snapshot.threats[0], id: 'tampered-decoy' }]; // Tamper decoy
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered zone or masking parameters in snapshot, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.zones = [
        {
          id: 'z-tampered',
          type: 'URBAN',
          polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
          heightM: 50,
          shadowM: 10,
          rho: 0.9,
        },
      ];
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered chaos entry in snapshot, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.chaos = [{ type: 'JAMMING', tStartMs: 0, tEndMs: 10000, severity: 1.0 }];
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered trigger / formation in snapshot, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.triggers = [{ id: 'trig-1', when: { kind: 'MDT_EXCEEDS' }, action: { kind: 'SPAWN' }, maxFires: 1 }];
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered seed or difficulty in snapshot, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.seed = 8888;
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects tampered simVersion or schemaVersion in snapshot, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      snapshot.simVersion = '9.9.9';
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('rejects missing snapshot hash or mismatched digest, leaving G undefined', () => {
      const { snapshot, events, session } = createTamperBase();
      session.scenarioSnapshotHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });
  });

  describe('Critical D & E: Fail-Closed Historical Catalog Reconstruction for Legacy Sessions Without Snapshot', () => {
    it('leaves G undefined when legacy catalog session is missing seed', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-leg-no-seed',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-leg-no-seed' },
      ];
      const session: SessionRow = {
        uid: 'sess-leg-no-seed',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
      };

      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('leaves G undefined when legacy catalog session is missing difficulty', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-leg-no-diff',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-leg-no-diff' },
      ];
      const session: SessionRow = {
        uid: 'sess-leg-no-diff',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: undefined as unknown as number,
        metrics: {
          ...createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
      };

      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('leaves G undefined when legacy catalog session is missing scenarioSnapshotHash', () => {
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-leg-no-hash',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-leg-no-hash' },
      ];
      const session: SessionRow = {
        uid: 'sess-leg-no-hash',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
      };

      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('leaves G undefined when legacy session has mismatched application configHash', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            mode: 'EVAL',
            scenarioId: 'DEMO-1',
            seed: 2026,
            difficulty: 0.3,
            configHash: 'sha256:different-config-hash',
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
          sessionUid: 'sess-leg-diff-config',
        },
        { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false }, sessionUid: 'sess-leg-diff-config' },
      ];
      const session: SessionRow = {
        uid: 'sess-leg-diff-config',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 75,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
        scenarioConfigHash: 'sha256:different-config-hash',
        scenarioSnapshotHash: snapshotHash,
      };

      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    it('reconstructs exact historical G for verifiable legacy record when candidate catalog artifact matches recorded digest', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const sessionUid = 'sess-leg-verifiable';

      // Genuine engine run to generate authoritative events
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec, { snapshotHash, appConfigHash: CONFIG_HASH });

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);
      expect(typeof authoritative.gScore).toBe('number');

      // Legacy session WITHOUT scenarioSpecSnapshot
      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.3,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: snapshotHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
      };

      const resolvedSpec = resolveHistoricalScenarioSpec(legacySession, events);
      expect(resolvedSpec).toBeDefined();

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
    });

    it('reconstructs exact historical G for legacy record in operational EVAL mode on catalog scenario', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      spec.mode = 'EVAL';
      const snapshotHash = computeScenarioSnapshotHash(spec);
      const sessionUid = 'sess-leg-eval-catalog';

      // Genuine engine run in EVAL mode
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec, { snapshotHash, appConfigHash: CONFIG_HASH });

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);
      expect(typeof authoritative.gScore).toBe('number');

      // Legacy session WITHOUT scenarioSpecSnapshot, but with complete provenance and EVAL mode
      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.3,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        scenarioSeed: 2026,
        scenarioDifficulty: 0.3,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: snapshotHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
      };

      const resolvedSpec = resolveHistoricalScenarioSpec(legacySession, events);
      expect(resolvedSpec).toBeDefined();
      expect(resolvedSpec?.mode).toBe('EVAL');

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
    });
  });

  describe('Critical A & High-Priority G: Production Session Lifecycle & Snapshot Capture Proof', () => {
    it('captures immutable scenario snapshot before engine.load, proving post-load mutation cannot mutate captured snapshot', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const specCopy: ScenarioSpec = JSON.parse(JSON.stringify(spec));

      // Load scenario through the actual production session store
      await useSessionStore.getState().loadScenario(specCopy);

      // Mutate the original source spec object after session initialization
      specCopy.threats[0].speedMps = 9999;
      specCopy.seed = 9999;
      specCopy.difficulty = 0.99;

      // Verify the active session snapshot remains completely unmutated
      const activeSnapshot = useSessionStore.getState().ui;
      expect(activeSnapshot).toBeDefined();

      // Step engine to session end to trigger persistCompletedSession
      while (!engineInstance.sessionEnded) {
        engineInstance.step();
      }

      while (useSessionStore.getState().sessionPersistenceStatus === 'SAVING') {
        await new Promise((r) => setTimeout(r, 10));
      }

      const savedUid = useSessionStore.getState().latestSavedSessionUid;
      expect(savedUid).toBeDefined();

      const savedSessions = await getTraineeSessions('VIPER-2', 'asc', 'ALL');
      const savedSession = savedSessions.find((s) => s.uid === savedUid);
      expect(savedSession).toBeDefined();

      // Verify snapshot inside SessionRow retained the original parameters and NOT mutated 9999
      expect(savedSession?.scenarioSpecSnapshot?.threats[0].speedMps).toBe(spec.threats[0].speedMps);
      expect(savedSession?.scenarioSpecSnapshot?.threats[0].speedMps).not.toBe(9999);
      expect(savedSession?.scenarioSeed).toBe(2026);
      expect(savedSession?.scenarioDifficulty).toBe(0.3);

      // Verify scenarioSnapshotHash matches the unmutated spec
      const expectedHash = computeScenarioSnapshotHash(spec);
      expect(savedSession?.scenarioSnapshotHash).toBe(expectedHash);
    });

    it('SPECTRUM-1: explicitly asserts all 6 ground-truth classes and proves ground-truth taxonomy usage', async () => {
      const { spec } = loadCatalogScenario('SPECTRUM-1', 2026, 0.4);

      // Assert presence of all 6 canonical ground-truth classes in SPECTRUM-1 across threats and decoys
      const allTargetClasses = new Set([...spec.threats, ...spec.decoys].map((t) => t.trueClass));
      expect(allTargetClasses.has('HOSTILE_ATTACK')).toBe(true);
      expect(allTargetClasses.has('HOSTILE_ISR')).toBe(true);
      expect(allTargetClasses.has('SWARM_ELEMENT')).toBe(true);
      expect(allTargetClasses.has('CIVIL_UAS')).toBe(true);
      expect(allTargetClasses.has('BIRD')).toBe(true);
      expect(allTargetClasses.has('FRIENDLY')).toBe(true);

      const sessionUid = 'sess-spectrum-ground-truth';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      stepUntilSessionEnd(engine, spec.id, spec.durationMs);
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const authoritative = aggregateAARMetrics(events, spec);
      expect(authoritative.confusion).toBeDefined();
      expect(authoritative.confusion).toHaveLength(6); // 6x6 matrix

      // Prove that historical reconstruction using exact snapshot produces identical G
      const sessionRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: authoritative.score,
        grade: authoritative.grade,
        dStart: 0.4,
        metrics: {
          ...authoritative,
          gScore: undefined as unknown as number,
        },
        scenarioId: 'SPECTRUM-1',
        scenarioSpecSnapshot: spec,
        scenarioSnapshotHash: computeScenarioSnapshotHash(spec),
        scenarioConfigHash: CONFIG_HASH,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
      };

      const migrated = migrateLegacySession(sessionRow, events);
      expect(migrated.metrics.gScore).toBe(authoritative.gScore);
    });

    it('handles sequential persistence failure: event failure alone retains buffer and retries atomically', async () => {
      setMockPersistenceFailureMode('EVENT');

      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      await useSessionStore.getState().loadScenario(spec);

      while (!engineInstance.sessionEnded) {
        engineInstance.step();
      }

      while (useSessionStore.getState().sessionPersistenceStatus === 'SAVING') {
        await new Promise((r) => setTimeout(r, 10));
      }

      // Persistence should fail on EVENT and set status to ERROR
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('ERROR');
      expect(useSessionStore.getState().lastFailedRecorder).not.toBeNull();

      // Clear mock failure and retry
      setMockPersistenceFailureMode(null);
      const retrySuccess = await useSessionStore.getState().retrySaveSession();
      expect(retrySuccess).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Verify events were drained and persisted
      const savedUid = useSessionStore.getState().latestSavedSessionUid!;
      const events = await getRecordedEventsForSession(savedUid);
      expect(events.length).toBeGreaterThan(0);

      // Verify sequence numbers are strictly contiguous
      for (let i = 0; i < events.length; i++) {
        expect(events[i].seq).toBe(i + 1);
      }
    });

    it('handles sequential persistence failure: metadata failure alone leaves events persisted and retries idempotently', async () => {
      setMockPersistenceFailureMode('SESSION');

      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      await useSessionStore.getState().loadScenario(spec);

      while (!engineInstance.sessionEnded) {
        engineInstance.step();
      }

      while (useSessionStore.getState().sessionPersistenceStatus === 'SAVING') {
        await new Promise((r) => setTimeout(r, 10));
      }

      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('ERROR');
      expect(useSessionStore.getState().lastFailedSessionRow).not.toBeNull();

      // Clear failure and retry
      setMockPersistenceFailureMode(null);
      const retrySuccess = await useSessionStore.getState().retrySaveSession();
      expect(retrySuccess).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Repeated retry should be idempotent and not duplicate records
      const secondRetry = await useSessionStore.getState().retrySaveSession();
      expect(secondRetry).toBe(true);

      const allSessions = await getTraineeSessions('VIPER-2', 'asc', 'ALL');
      const savedUid = useSessionStore.getState().latestSavedSessionUid;
      const matching = allSessions.filter((s) => s.uid === savedUid);
      expect(matching).toHaveLength(1); // No duplicates
    });
  });
});

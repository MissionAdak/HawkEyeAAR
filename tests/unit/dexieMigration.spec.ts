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
import { EventRecorder, clearFallbackEventsForTest, getRecordedEventsForSession } from '@/db/recorder';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import { loadCatalogScenario, SCENARIO_CATALOG } from '@/director/catalog';
import type { SimEvent, ScenarioSpec } from '@/sim/types';

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
      const events: StoredSimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'DEMO-1' }, sessionUid: 'sess-corrupt' },
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
        scenarioSpecSnapshot: { id: 'DEMO-1' } as unknown as ScenarioSpec, // missing threats/decoys/asset
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Corrupt or malformed scenarioSpecSnapshot');
    });

    it('rejects scenario snapshot whose seed does not match SIM_START seed', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: { mode: spec.mode, scenarioId: 'DEMO-1', seed: 2026, difficulty: 0.3, configHash: spec.configHash },
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
        scenarioSpecSnapshot: { ...spec, seed: 9999 }, // Mismatched seed
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Scenario snapshot seed');
    });

    it('accepts complete, contiguous, matching event log with valid snapshot', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const events: StoredSimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: { mode: spec.mode, scenarioId: 'DEMO-1', seed: 2026, difficulty: 0.3, configHash: spec.configHash },
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
        scenarioSpecSnapshot: spec,
      };
      const result = validateHistoricalEventLog(events, session);
      expect(result.isValid).toBe(true);
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
      while (!engine.sessionEnded) {
        engine.step();
      }
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

      while (!engine.sessionEnded) {
        engine.step();
      }
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

      while (!engine.sessionEnded) {
        engine.step();
      }
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

      while (!engine.sessionEnded) {
        engine.step();
      }
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

      while (!engine.sessionEnded) {
        engine.step();
      }
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

      while (!engine.sessionEnded) {
        engine.step();
      }
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
});

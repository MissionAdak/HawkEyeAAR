import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useSessionStore,
  persistCompletedSession,
  engineInstance,
} from '@/store/sessionStore';
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
  getUnitTraineeSummaries,
  getCohortStats,
  seedDemoSessionsIfEmpty,
  clearSessionRepoForTest,
  createMockMetrics,
} from '@/db/sessionRepo';
import {
  EventRecorder,
  getRecordedEventsForSession,
  clearFallbackEventsForTest,
  setMockPersistenceFailureMode,
} from '@/db/recorder';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import { loadCatalogScenario, SCENARIO_CATALOG } from '@/director/catalog';
import { CONFIG_HASH } from '@/config';
import {
  SIM_VERSION,
  SCHEMA_VERSION,
  type ScenarioSpec,
  type SimEvent,
} from '@/sim/types';
import { computeScenarioSnapshotHash } from '@/sim/snapshotHash';
import { importSessionJson } from '@/db/aarTransfer';
import { reconstructAarReplayState } from '@/ui/aar/aarReplayData';

describe('TASK 20-A5 — Cross-Task Longitudinal Performance, Provenance & Persistence Integration Matrix', () => {
  beforeEach(() => {
    clearSessionRepoForTest();
    clearFallbackEventsForTest();
    setMockPersistenceFailureMode('NONE');
    useSessionStore.setState({
      sessionPersistenceStatus: 'IDLE',
      latestSavedSessionUid: null,
      lastFailedSessionRow: null,
      lastFailedRecorder: null,
      currentCallsign: 'VIPER-2',
      currentSessionTraineeUid: 'trainee-viper-2',
    });
    vi.restoreAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* A. Complete Production Session Lifecycle & Persistence Co-ordination      */
  /* -------------------------------------------------------------------------- */
  describe('A. Complete Production Session Lifecycle & Persistence Co-ordination', () => {
    it('produces exactly one authoritative terminal SESSION_END event per completed session and preserves contiguous sequence', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const sessionUid = 'sess-int-lifecycle-001';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      while (!engine.sessionEnded) {
        engine.step();
      }

      // Step engine further after sessionEnded to assert no duplicate terminal events
      engine.step();
      engine.step();
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe('SIM_START');

      const terminalEvents = events.filter((e) => e.type === 'SESSION_END');
      expect(terminalEvents).toHaveLength(1);
      expect(terminalEvents[0].payload.aborted).toBe(false);

      // Verify strictly contiguous 1-based sequence numbering
      for (let i = 0; i < events.length; i++) {
        expect(events[i].seq).toBe(i + 1);
        expect(events[i].sessionUid).toBe(sessionUid);
        if (i > 0) {
          expect(events[i].tMs).toBeGreaterThanOrEqual(events[i - 1].tMs);
        }
      }
    });

    it('produces exactly one authoritative terminal SESSION_END event for aborted session with non-zero abort status', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const sessionUid = 'sess-int-abort-002';
      const engine = new SimEngine();
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      engine.onEvent = (ev) => recorder.record(ev);
      recorder.start();
      engine.load(spec);

      for (let i = 0; i < 20; i++) {
        engine.step();
      }
      engine.abort('MANUAL_ABORT');
      engine.step(); // Extra step
      await recorder.stop();

      const events = await getRecordedEventsForSession(sessionUid);
      const terminalEvents = events.filter((e) => e.type === 'SESSION_END');
      expect(terminalEvents).toHaveLength(1);
      expect(terminalEvents[0].payload.aborted).toBe(true);
      expect(terminalEvents[0].payload.reason).toBe('MANUAL_ABORT');

      // Validation must fail-closed for aborted session evaluation
      const validation = validateHistoricalEventLog(events);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('aborted === false');
    });

    it('enforces immutable trainee attribution across persistence failure and callsign switching before retry', async () => {
      const originalTraineeUid = 'trainee-viper-2';
      const failedUid = 'sess-int-retry-attr-003';
      const mockRow: SessionRow = {
        uid: failedUid,
        traineeUid: originalTraineeUid,
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 60000,
        score: 91,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(91, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        isSynthetic: false,
      };

      useSessionStore.setState({
        sessionPersistenceStatus: 'ERROR',
        lastFailedSessionRow: mockRow,
        currentCallsign: 'HAWK-1', // Operator changed in UI modal header
      });

      const success = await useSessionStore.getState().retrySaveSession();
      expect(success).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      const viperSessions = await getTraineeSessions('VIPER-2');
      const hawkSessions = await getTraineeSessions('HAWK-1');
      expect(viperSessions.some((s) => s.uid === failedUid)).toBe(true);
      expect(hawkSessions.some((s) => s.uid === failedUid)).toBe(false);
    });

    it('handles metadata write failure alone: sets ERROR, prevents SAVED, and recovers without event duplication', async () => {
      setMockPersistenceFailureMode('SESSION');
      const sessionUid = 'sess-int-fail-session-004';
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      recorder.start();
      recorder.record({
        seq: 1,
        tMs: 0,
        type: 'SIM_START',
        payload: { mode: 'EVAL', scenarioId: 'DEMO-1' },
      });
      recorder.record({
        seq: 2,
        tMs: 1000,
        type: 'SESSION_END',
        payload: { aborted: false },
      });

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 85,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      await persistCompletedSession(mockRow, recorder, 'VIPER-2');
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('ERROR');
      expect(useSessionStore.getState().lastFailedSessionRow?.uid).toBe(sessionUid);

      // Clear failure and retry
      setMockPersistenceFailureMode('NONE');
      const retryResult = await useSessionStore.getState().retrySaveSession();
      expect(retryResult).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      // Verify events in repo
      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0].seq).toBe(1);
      expect(storedEvents[1].seq).toBe(2);
    });

    it('handles event write failure alone: sets ERROR, prevents SAVED, and flushes retained batch on retry', async () => {
      setMockPersistenceFailureMode('EVENTS');
      const sessionUid = 'sess-int-fail-events-005';
      const recorder = new EventRecorder(sessionUid, 1700000000000);
      recorder.start();
      recorder.record({
        seq: 1,
        tMs: 0,
        type: 'SIM_START',
        payload: { mode: 'EVAL', scenarioId: 'DEMO-1' },
      });
      recorder.record({
        seq: 2,
        tMs: 1000,
        type: 'SESSION_END',
        payload: { aborted: false },
      });

      const mockRow: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 85,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
      };

      await persistCompletedSession(mockRow, recorder, 'VIPER-2');
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('ERROR');
      expect(useSessionStore.getState().lastFailedRecorder).toBeDefined();

      // Clear failure and retry
      setMockPersistenceFailureMode('NONE');
      const retryResult = await useSessionStore.getState().retrySaveSession();
      expect(retryResult).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');

      const storedEvents = await getRecordedEventsForSession(sessionUid);
      expect(storedEvents).toHaveLength(2);
    });

    it('is strictly idempotent on repeat retry calls when already SAVED', async () => {
      useSessionStore.setState({
        sessionPersistenceStatus: 'SAVED',
        latestSavedSessionUid: 'sess-already-saved',
        lastFailedSessionRow: null,
      });

      const result = await useSessionStore.getState().retrySaveSession();
      expect(result).toBe(true);
      expect(useSessionStore.getState().sessionPersistenceStatus).toBe('SAVED');
    });

    it('cleans up simulation state on returnToBriefing without leaving dangling active sessions', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      engineInstance.load(spec);
      engineInstance.step();
      expect(engineInstance.tickIndex).toBeGreaterThan(0);

      useSessionStore.getState().returnToBriefing();
      expect(engineInstance.spec).toBeNull();
      expect(engineInstance.tickIndex).toBe(0);
      expect(engineInstance.curr).toHaveLength(0);
      expect(useSessionStore.getState().isBriefingOpen).toBe(true);
      expect(useSessionStore.getState().sessionStatus).toBe('READY');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* B & C. Scenario Provenance, Snapshot Verification & Adversarial Matrix    */
  /* -------------------------------------------------------------------------- */
  describe('B & C. Scenario Provenance, Snapshot Verification & Adversarial Matrix', () => {
    const buildVerifiableScenarioFixture = () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      spec.mode = 'EVAL';
      const snapshot: ScenarioSpec = JSON.parse(JSON.stringify(spec));
      const snapshotHash = computeScenarioSnapshotHash(snapshot);
      const sessionUid = 'sess-adv-base';

      const events: StoredSimEvent[] = [
        {
          sessionUid,
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            scenarioId: snapshot.id,
            mode: 'EVAL',
            seed: snapshot.seed,
            difficulty: snapshot.difficulty,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: snapshotHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
        },
        {
          sessionUid,
          seq: 2,
          tMs: 1000,
          type: 'TRACK_INIT',
          trackNo: 'T-01',
          payload: { rangeM: 1500 },
        },
        {
          sessionUid,
          seq: 3,
          tMs: 5000,
          type: 'SESSION_END',
          payload: { aborted: false },
        },
      ];

      const session: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 5000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: snapshot.id,
        scenarioSeed: snapshot.seed,
        scenarioDifficulty: snapshot.difficulty,
        scenarioConfigHash: CONFIG_HASH,
        scenarioSnapshotHash: snapshotHash,
        scenarioSimVersion: SIM_VERSION,
        scenarioSchemaVersion: SCHEMA_VERSION,
        scenarioSpecSnapshot: snapshot,
      };

      return { snapshot, snapshotHash, events, session };
    };

    // Adversarial Matrix Item 1: Changed scenario data with unchanged recorded digest
    it('Item 1: rejects altered scenario data when recorded digest is kept unchanged, leaving G undefined', () => {
      const { snapshot, events, session } = buildVerifiableScenarioFixture();
      snapshot.threats[0].speedMps = 999; // Mutated data
      session.scenarioSpecSnapshot = snapshot;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 2: Changed digest with unchanged scenario data
    it('Item 2: rejects altered snapshot digest when scenario data is unchanged, leaving G undefined', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      session.scenarioSnapshotHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      events[0].payload.scenarioSnapshotHash = session.scenarioSnapshotHash;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 3: Incorrect configuration hash
    it('Item 3: rejects incompatible configHash, leaving G undefined', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      session.scenarioSpecSnapshot = undefined;
      session.scenarioConfigHash = 'sha256:outdated-incompatible-hash';
      events[0].payload.configHash = 'sha256:outdated-incompatible-hash';

      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();

      events[0].payload.configHash = CONFIG_HASH;
      const validation = validateHistoricalEventLog(events, session);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('scenarioConfigHash');
    });

    // Adversarial Matrix Item 4: Incorrect simulation version
    it('Item 4: rejects incompatible simVersion, leaving G undefined', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      session.scenarioSimVersion = '9.9.9';
      events[0].payload.simVersion = '9.9.9';

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 5: Incorrect schema version
    it('Item 5: rejects invalid schemaVersion, leaving G undefined', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      session.scenarioSchemaVersion = 99;
      events[0].payload.schemaVersion = 99;

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 6: Missing scenario snapshot with missing parameters -> fail-closed
    it('Item 6: fails closed when scenario snapshot is missing and seed/difficulty cannot be identified', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      delete session.scenarioSpecSnapshot;
      delete session.scenarioSeed;
      delete events[0].payload.seed;

      expect(resolveHistoricalScenarioSpec(session, events)).toBeUndefined();
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 7: Missing or duplicated lifecycle events
    it('Item 7: rejects non-contiguous sequence numbers and duplicate lifecycle events', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      // Insert duplicate SIM_START with seq 1
      events.splice(1, 0, {
        sessionUid: session.uid,
        seq: 1, // Duplicate sequence
        tMs: 50,
        type: 'SIM_START',
        payload: {},
      });

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 8: Incomplete event stream (missing SESSION_END)
    it('Item 8: rejects truncated event stream lacking terminal SESSION_END', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      const truncatedEvents = events.filter((e) => e.type !== 'SESSION_END');

      expect(validateHistoricalEventLog(truncatedEvents, session).isValid).toBe(false);
      expect(migrateLegacySession(session, truncatedEvents).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 9: Aborted session presented as completed evaluation
    it('Item 9: rejects aborted session presented as completed evaluation', () => {
      const { events, session } = buildVerifiableScenarioFixture();
      events[events.length - 1].payload.aborted = true; // Stamped aborted

      expect(validateHistoricalEventLog(events, session).isValid).toBe(false);
      expect(migrateLegacySession(session, events).metrics.gScore).toBeUndefined();
    });

    // Adversarial Matrix Item 10: Historical catalog changes affecting reconstruction
    it('Item 10: snapshot takes precedence over mutated catalog; if snapshot missing and catalog altered, digest mismatch fails closed', () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      const snapshot: ScenarioSpec = JSON.parse(JSON.stringify(spec));
      const originalHash = computeScenarioSnapshotHash(snapshot);
      const sessionUid = 'sess-catalog-mut-10';

      const events: StoredSimEvent[] = [
        {
          sessionUid,
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: {
            scenarioId: 'DEMO-1',
            mode: spec.mode,
            seed: 2026,
            difficulty: 0.3,
            configHash: CONFIG_HASH,
            scenarioSnapshotHash: originalHash,
            simVersion: SIM_VERSION,
            schemaVersion: SCHEMA_VERSION,
          },
        },
        { sessionUid, seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      const sessionWithSnapshot: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: spec.mode,
        startedAt: 1700000000000,
        durationMs: 1000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', spec.mode),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        scenarioSpecSnapshot: snapshot,
        scenarioSnapshotHash: originalHash,
      };

      const sessionWithoutSnapshot: SessionRow = {
        ...sessionWithSnapshot,
        scenarioSpecSnapshot: undefined,
      };

      const demo1Entry = SCENARIO_CATALOG.find((e) => e.id === 'DEMO-1')!;
      const origGetSpec = demo1Entry.getSpec;
      try {
        // Artificially mutate live catalog
        demo1Entry.getSpec = () => ({
          ...spec,
          threats: [], // Emptied live catalog
        });

        // 1. Session with preserved snapshot reconstructs successfully from snapshot
        expect(resolveHistoricalScenarioSpec(sessionWithSnapshot, events)).toBeDefined();

        // 2. Session WITHOUT snapshot attempts catalog fallback, hits digest mismatch, and FAILS CLOSED
        expect(resolveHistoricalScenarioSpec(sessionWithoutSnapshot, events)).toBeUndefined();
        expect(migrateLegacySession(sessionWithoutSnapshot, events).metrics.gScore).toBeUndefined();
      } finally {
        demo1Entry.getSpec = origGetSpec;
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* D. Historical G Reconstruction & Genuine Zero G Distinction               */
  /* -------------------------------------------------------------------------- */
  describe('D. Historical G Reconstruction & Genuine Zero G Distinction', () => {
    it('distinguishes between genuine zero G=0 and missing historical G (undefined)', () => {
      // 1. Genuine zero G session (unneutralized hostile leaker, E_econ=100, G=0)
      const genuineZeroSession: SessionRow = {
        uid: 'sess-genuine-zero-001',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 60000,
        score: 65,
        grade: 'DEVELOPING',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(65, 'DEVELOPING', 'EVAL'),
          gScore: 0, // Genuine 0
        },
        scenarioId: 'DEMO-1',
      };

      // 2. Missing historical G session (legacy record without events)
      const missingGSession: SessionRow = {
        uid: 'sess-missing-g-002',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 60000,
        score: 65,
        grade: 'DEVELOPING',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(65, 'DEVELOPING', 'EVAL'),
          gScore: undefined as unknown as number, // Missing
        },
        scenarioId: 'DEMO-1',
      };

      const migratedZero = migrateLegacySession(genuineZeroSession, []);
      const migratedMissing = migrateLegacySession(missingGSession, []);

      // Genuine zero MUST NOT become undefined
      expect(migratedZero.metrics.gScore).toBe(0);
      expect(typeof migratedZero.metrics.gScore).toBe('number');

      // Missing G MUST NOT become zero
      expect(migratedMissing.metrics.gScore).toBeUndefined();
    });

    it('reconstructs exact historical G matching authoritative aggregateAARMetrics bitwise on valid event sequence', async () => {
      const { spec } = loadCatalogScenario('DEMO-1', 2026, 0.3);
      spec.mode = 'EVAL';
      const sessionUid = 'sess-authoritative-g-003';

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
      const expectedMetrics = aggregateAARMetrics(events, spec);
      expect(typeof expectedMetrics.gScore).toBe('number');

      const legacySession: SessionRow = {
        uid: sessionUid,
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: spec.durationMs,
        score: expectedMetrics.score,
        grade: expectedMetrics.grade,
        dStart: 0.3,
        metrics: {
          ...expectedMetrics,
          gScore: undefined as unknown as number,
        },
        scenarioId: spec.id,
        scenarioSpecSnapshot: spec,
      };

      const migrated = migrateLegacySession(legacySession, events);
      expect(migrated.metrics.gScore).toBe(expectedMetrics.gScore);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* E. Longitudinal History, EVAL Compliance & Aggregator Mutual Consistency   */
  /* -------------------------------------------------------------------------- */
  describe('E. Longitudinal History, EVAL Compliance & Aggregator Mutual Consistency', () => {
    it('enforces mutual consistency across all aggregation consumers (Rules.md R4.4)', async () => {
      // Setup dataset:
      // - VIPER-2: 2 valid completed EVAL sessions, 1 aborted EVAL, 1 TRAIN
      // - GHOST-4: 2 completed TRAIN sessions (TRAIN-only)
      // - Demo seed: 1 synthetic session
      await saveCompletedSession({
        uid: 'eval-v2-1',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000000000,
        durationMs: 60000,
        score: 80,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        metrics: {
          ...createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
          gScore: undefined as unknown as number,
        },
        scenarioId: 'DEMO-1',
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'eval-v2-2',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000010000,
        durationMs: 60000,
        score: 90,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.4,
        metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'eval-v2-aborted',
        traineeUid: 'trainee-viper-2',
        mode: 'EVAL',
        startedAt: 1700000020000,
        durationMs: 15000,
        score: 40,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.3,
        metrics: createMockMetrics(40, 'NEEDS_RETRAINING', 'EVAL'),
        scenarioId: 'DEMO-1',
        aborted: true, // ABORTED
        unverified: false,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'train-v2-1',
        traineeUid: 'trainee-viper-2',
        mode: 'TRAIN',
        startedAt: 1700000030000,
        durationMs: 60000,
        score: 95,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
        scenarioId: 'DEMO-1',
        aborted: false,
        unverified: false,
      }, 'VIPER-2');

      await saveCompletedSession({
        uid: 'train-g4-1',
        traineeUid: 'trainee-ghost-4',
        mode: 'TRAIN',
        startedAt: 1700000040000,
        durationMs: 60000,
        score: 72,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.35,
        metrics: createMockMetrics(72, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
        scenarioId: 'DEMO-1',
        aborted: false,
        unverified: false,
      }, 'GHOST-4');

      // Synthetic demo session
      await saveCompletedSession({
        uid: 'demo-hawk1-1700000000000',
        traineeUid: 'trainee-hawk-1',
        mode: 'EVAL',
        startedAt: 1700000050000,
        durationMs: 60000,
        score: 99,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        metrics: createMockMetrics(99, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        scenarioId: 'DEMO-1',
        isSynthetic: true,
        aborted: false,
        unverified: false,
      }, 'HAWK-1');

      const realSummaries = await getUnitTraineeSummaries('REAL');
      const cohortStats = await getCohortStats('REAL');

      // 1. Synthetic session excluded from REAL summaries
      expect(realSummaries.some((s) => s.callsign === 'HAWK-1')).toBe(false);

      // 2. VIPER-2 has 2 valid EVAL sessions (aborted and train excluded from evalSessionsCount)
      const viper = realSummaries.find((s) => s.callsign === 'VIPER-2')!;
      expect(viper).toBeDefined();
      expect(viper.evalSessionsCount).toBe(2);
      expect(viper.trainSessionsCount).toBe(1);
      expect(viper.evalAttemptsCount).toBe(3); // 2 completed + 1 aborted
      expect(viper.latestEvalScore).toBe(90);
      expect(viper.meanEvalScore).toBe(85); // (80 + 90) / 2 = 85
      expect(viper.evalPassRate).toBe(100);

      // 3. GHOST-4 has null EVAL score and displays 'IN TRAINING' (TRAIN-only)
      const ghost = realSummaries.find((s) => s.callsign === 'GHOST-4')!;
      expect(ghost).toBeDefined();
      expect(ghost.evalSessionsCount).toBe(0);
      expect(ghost.latestEvalScore).toBeNull();
      expect(ghost.highestTrainDifficulty).toBe(0.35);

      // 4. Ranking order: VIPER-2 ranked first (#1), GHOST-4 at bottom
      expect(realSummaries[0].callsign).toBe('VIPER-2');
      expect(realSummaries[1].callsign).toBe('GHOST-4');

      // 5. Cohort stats consistency (cohortMeanEvalScore is the mean of each trainee's latest EVAL score: VIPER-2 = 90)
      expect(cohortStats.totalEvalSessions).toBe(2);
      expect(cohortStats.activeTraineesCount).toBe(2);
      expect(cohortStats.cohortMeanEvalScore).toBe(90);
      expect(cohortStats.cohortEvalPassRate).toBe(100);
      expect(viper.meanEvalScore).toBe(85);
    });

    it('returns honest empty states when no sessions exist', async () => {
      const summaries = await getUnitTraineeSummaries('REAL');
      const cohort = await getCohortStats('REAL');

      expect(summaries).toHaveLength(0);
      expect(cohort.totalEvalSessions).toBe(0);
      expect(cohort.activeTraineesCount).toBe(0);
      expect(cohort.cohortMeanEvalScore).toBeNull();
      expect(cohort.cohortEvalPassRate).toBeNull();
    });

    it('seeds demo sessions concurrently with exactly one shared in-flight promise and 0 duplicate rows', async () => {
      const p1 = seedDemoSessionsIfEmpty();
      const p2 = seedDemoSessionsIfEmpty();
      const p3 = seedDemoSessionsIfEmpty();

      await Promise.all([p1, p2, p3]);

      const demoSummaries = await getUnitTraineeSummaries('DEMO');
      expect(demoSummaries.length).toBeGreaterThanOrEqual(1);

      // Subsequent call does not duplicate
      await seedDemoSessionsIfEmpty();
      const demoSummaries2 = await getUnitTraineeSummaries('DEMO');
      expect(demoSummaries2.length).toBe(demoSummaries.length);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* F. Export, Import & Replay Durability                                      */
  /* -------------------------------------------------------------------------- */
  describe('F. Export, Import & Replay Durability', () => {
    it('rejects tampered import payload without committing partial writes to database', async () => {
      const payloadString = JSON.stringify({
        format: 'drishti-aar-events',
        version: 1,
        sessionUid: 'sess-transfer-tampered',
        eventCount: 2,
        exportedAt: new Date().toISOString(),
        events: [
          { seq: 1, tMs: 0, type: 'SIM_START', payload: {} },
          { seq: 2, tMs: 1000, type: 'SESSION_END', payload: { aborted: false } },
        ],
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      });
      const file = new File([payloadString], 'aar-tampered.json', { type: 'application/json' });

      await expect(importSessionJson(file)).rejects.toThrow('SHA-256 verification failed');

      // Verify zero records were written to events table
      const storedEvents = await getRecordedEventsForSession('sess-transfer-tampered');
      expect(storedEvents.length).toBe(0);
    });

    it('reconstructs deterministic AAR replay states for scrubber navigation', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { scenarioId: 'DEMO-1' } },
        { seq: 2, tMs: 0, type: 'SNAPSHOT', payload: { entities: [] } },
        {
          seq: 3,
          tMs: 1000,
          type: 'SNAPSHOT',
          payload: {
            entities: [
              {
                id: 'H-1',
                tNo: 'T-01',
                x: 2000,
                y: 1500,
                z: 100,
                step: 'TRACK',
                q: 0.8,
                lbl: 'HOSTILE_ATTACK',
                trueClass: 'HOSTILE_ATTACK',
              },
            ],
          },
        },
        { seq: 4, tMs: 5000, type: 'SESSION_END', payload: { aborted: false } },
      ];

      const stateAt1500 = reconstructAarReplayState(events, 1500);
      expect(stateAt1500.tracks).toHaveLength(1);
      expect(stateAt1500.tracks[0].id).toBe('H-1');

      const stateAt500 = reconstructAarReplayState(events, 500);
      expect(stateAt500.tracks).toHaveLength(0);
    });
  });
});

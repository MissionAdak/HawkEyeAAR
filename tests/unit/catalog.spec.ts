import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SCENARIO_CATALOG,
  DEFAULT_SCENARIO_ID,
  getScenarioCatalogEntry,
  loadCatalogScenario,
  demo2Spec,
  swarmSpec,
  spectrumSpec,
} from '@/director/catalog';
import { validateDetailed, validate } from '@/director/validate';
import { TRUE_CLASSES, type TrueClass } from '@/sim/taxonomy';
import {
  useSessionStore,
  engineInstance,
  getActiveRecorder,
} from '@/store/sessionStore';
import {
  getRecordedEventsForSession,
  clearFallbackEventsForTest,
  setMockPersistenceFailureForTest,
} from '@/db/recorder';
import type { ScenarioSpec } from '@/sim/types';

describe('Scenario Catalog & Validation (TASK 12 & TASK 12A)', () => {
  beforeEach(async () => {
    clearFallbackEventsForTest();
    setMockPersistenceFailureForTest(false);
    // Reset engine session state before loading default scenario
    engineInstance.abort('TEST_RESET');
    await useSessionStore.getState().loadScenarioById(DEFAULT_SCENARIO_ID);
  });

  afterEach(() => {
    setMockPersistenceFailureForTest(false);
    engineInstance.abort('TEST_CLEANUP');
  });

  it('contains the 8 required catalog entries with unique stable IDs', () => {
    expect(SCENARIO_CATALOG).toHaveLength(8);
    const ids = SCENARIO_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toEqual(['DEMO-1', 'DEMO-2', 'SWARM-1', 'SPECTRUM-1', 'PROCEDURAL-1', 'RANDOM-1', 'FORMATION-1', 'POPUP-1']);
  });

  it('sets DEMO-1 as the startup default scenario ID', () => {
    expect(DEFAULT_SCENARIO_ID).toBe('DEMO-1');
    const defaultEntry = getScenarioCatalogEntry(DEFAULT_SCENARIO_ID);
    expect(defaultEntry).toBeDefined();
    expect(defaultEntry?.id).toBe('DEMO-1');
  });

  it('verifies that every catalog scenario has durationSec: 120 matching ScenarioSpec.durationMs', () => {
    for (const entry of SCENARIO_CATALOG) {
      expect(entry.durationSec).toBe(120);
      const spec = entry.getSpec();
      expect(spec.durationMs).toBe(120_000);
      expect(spec.durationMs).toBe(entry.durationSec * 1000);
    }
  });

  it('verifies that all catalog entries apply seed overrides when passed to getSpec', () => {
    const testSeed = 7777;
    for (const entry of SCENARIO_CATALOG) {
      const specWithSeed = entry.getSpec(testSeed);
      expect(specWithSeed.seed).toBe(testSeed);
      expect(validate(specWithSeed)).toBe(true);
    }
  });

  it('validates DEMO-1 against the fairness validator', () => {
    const entry = getScenarioCatalogEntry('DEMO-1');
    const spec = entry!.getSpec();
    const res = validateDetailed(spec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
  });

  it('validates DEMO-2 against the fairness validator and contains HOSTILE_ISR', () => {
    const res = validateDetailed(demo2Spec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(validate(demo2Spec)).toBe(true);

    const hasHostileIsr = demo2Spec.threats.some((t) => t.trueClass === 'HOSTILE_ISR');
    expect(hasHostileIsr).toBe(true);
  });

  it('validates SWARM-1 against the fairness validator and contains multiple SWARM_ELEMENTs', () => {
    const res = validateDetailed(swarmSpec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(validate(swarmSpec)).toBe(true);

    const swarmElements = swarmSpec.threats.filter((t) => t.trueClass === 'SWARM_ELEMENT');
    expect(swarmElements.length).toBeGreaterThanOrEqual(3);
  });

  it('validates SPECTRUM-1 and contains ALL SIX ground-truth classes', () => {
    const res = validateDetailed(spectrumSpec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(validate(spectrumSpec)).toBe(true);

    const allClassesInSpectrum = new Set<TrueClass>();
    for (const t of spectrumSpec.threats) {
      allClassesInSpectrum.add(t.trueClass);
    }
    for (const d of spectrumSpec.decoys) {
      allClassesInSpectrum.add(d.trueClass);
    }

    for (const cls of TRUE_CLASSES) {
      expect(
        allClassesInSpectrum.has(cls),
        `Expected class ${cls} to be present in SPECTRUM-1 scenario`
      ).toBe(true);
    }
    expect(allClassesInSpectrum.size).toBe(6);
  });

  it('validates PROCEDURAL-1 generated scenario with default difficulty 0.3', () => {
    const entry = getScenarioCatalogEntry('PROCEDURAL-1');
    expect(entry).toBeDefined();
    const defaultSpec = entry!.getSpec();
    expect(defaultSpec.difficulty).toBe(0.3);
    expect(defaultSpec.durationMs).toBe(120_000);
    expect(validate(defaultSpec)).toBe(true);

    const spec = entry!.getSpec(1337, 0.4);
    const res = validateDetailed(spec);
    expect(res.valid).toBe(true);
    expect(validate(spec)).toBe(true);
  });

  it('accurately notes procedural generator adaptive limitation', () => {
    const entry = getScenarioCatalogEntry('PROCEDURAL-1');
    expect(entry?.isAdaptive).toBe(false);
    expect(entry?.adaptiveNote).toBeDefined();
    expect(entry?.adaptiveNote).toContain('unlinked');
    expect(entry?.adaptiveNote).toContain('0.3');
  });

  it('validates FORMATION-1 against the fairness validator and contains cohesive formations', () => {
    const entry = getScenarioCatalogEntry('FORMATION-1');
    expect(entry).toBeDefined();
    const spec = entry!.getSpec(1234, 0.35);
    expect(spec.formations).toBeDefined();
    expect(spec.formations!.length).toBeGreaterThan(0);
    expect(spec.durationMs).toBe(120_000);
    const res = validateDetailed(spec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(validate(spec)).toBe(true);
  });

  it('validates POPUP-1 against the fairness validator and contains POP_UP_DIVE threats', () => {
    const entry = getScenarioCatalogEntry('POPUP-1');
    expect(entry).toBeDefined();
    const spec = entry!.getSpec(5678, 0.3);
    expect(spec.threats.some((t) => t.profile === 'POP_UP_DIVE')).toBe(true);
    expect(spec.durationMs).toBe(120_000);
    const res = validateDetailed(spec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(validate(spec)).toBe(true);
  });

  it('throws an error when loading an unknown scenario ID via loadCatalogScenario', () => {
    expect(() => loadCatalogScenario('UNKNOWN_SCENARIO_XYZ')).toThrowError(/Unknown scenario ID/);
  });

  it('successfully loads all catalog scenarios with loadCatalogScenario', () => {
    for (const entry of SCENARIO_CATALOG) {
      const { spec, entry: loadedEntry } = loadCatalogScenario(entry.id);
      expect(loadedEntry.id).toBe(entry.id);
      expect(spec).toBeDefined();
      expect(validate(spec)).toBe(true);
    }
  });

  describe('Session Store Scenario Lifecycle & Sequencing', () => {
    it('initializes with DEFAULT_SCENARIO_ID (DEMO-1)', () => {
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-1');
      expect(engineInstance.spec?.id).toBe('DEMO-1');
    });

    it('loads DEMO-2 and records SIM_START with DEMO-2 metadata', async () => {
      const store = useSessionStore.getState();
      const loaded = await store.loadScenarioById('DEMO-2');
      expect(loaded).toBe(true);
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-2');
      expect(engineInstance.spec?.id).toBe('DEMO-2');

      const startEvent = engineInstance.events.find((e) => e.type === 'SIM_START');
      expect(startEvent).toBeDefined();
      expect(startEvent?.payload.scenarioId).toBe('DEMO-2');
      expect(startEvent?.payload.seed).toBe(2026);
    });

    it('finalizes previous active session with SCENARIO_SWITCH and persists exactly one SESSION_END event before switching', async () => {
      const store = useSessionStore.getState();
      // Ensure DEMO-1 is running
      await store.loadScenarioById('DEMO-1');
      const oldSessionUid = getActiveRecorder()!.getSessionUid();

      // Advance engine by 10 ticks (500 ms) so session is actively running
      for (let i = 0; i < 10; i++) {
        engineInstance.step();
      }
      expect(engineInstance.tickIndex).toBe(10);
      expect(engineInstance.sessionEnded).toBe(false);

      // Now switch scenario to DEMO-2 while old session was active
      const switched = await store.loadScenarioById('DEMO-2');
      expect(switched).toBe(true);

      // Verify old session's persisted events in recorder storage
      const oldSessionEvents = await getRecordedEventsForSession(oldSessionUid);
      expect(oldSessionEvents.length).toBeGreaterThan(0);

      const sessionEndEvents = oldSessionEvents.filter((e) => e.type === 'SESSION_END');
      expect(sessionEndEvents).toHaveLength(1);

      const endEvent = sessionEndEvents[0];
      expect(endEvent.payload.reason).toBe('SCENARIO_SWITCH');
      expect(endEvent.payload.aborted).toBe(true);
      expect(endEvent.payload.durationMs).toBe(500);
      expect(endEvent.payload.metrics).toBeDefined();

      // Verify new session is freshly initialized
      const newSessionUid = getActiveRecorder()!.getSessionUid();
      expect(newSessionUid).not.toBe(oldSessionUid);
      expect(engineInstance.tickIndex).toBe(0);
      expect(engineInstance.spec?.id).toBe('DEMO-2');

      const newSessionEvents = await getRecordedEventsForSession(newSessionUid);
      const newStartEvent = newSessionEvents.find((e) => e.type === 'SIM_START');
      expect(newStartEvent?.payload.scenarioId).toBe('DEMO-2');
    });

    it('does not append duplicate SESSION_END if session had already ended naturally before switching', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('DEMO-1');
      const oldSessionUid = getActiveRecorder()!.getSessionUid();

      // Run 5 ticks and end naturally / abort
      for (let i = 0; i < 5; i++) engineInstance.step();
      store.abortSession('USER_MANUAL_ABORT');
      expect(engineInstance.sessionEnded).toBe(true);

      const eventsBeforeSwitch = await getRecordedEventsForSession(oldSessionUid);
      const endsBefore = eventsBeforeSwitch.filter((e) => e.type === 'SESSION_END');
      expect(endsBefore).toHaveLength(1);
      expect(endsBefore[0].payload.reason).toBe('USER_MANUAL_ABORT');

      // Now switch scenario to SWARM-1
      await store.loadScenarioById('SWARM-1');

      // The old session must STILL have exactly one SESSION_END
      const eventsAfterSwitch = await getRecordedEventsForSession(oldSessionUid);
      const endsAfter = eventsAfterSwitch.filter((e) => e.type === 'SESSION_END');
      expect(endsAfter).toHaveLength(1);
      expect(endsAfter[0].payload.reason).toBe('USER_MANUAL_ABORT');
    });

    it('handles recorder persistence errors honestly and refuses to replace session if flush fails', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('DEMO-1');
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-1');

      // Step 5 ticks
      for (let i = 0; i < 5; i++) engineInstance.step();

      // Simulate a persistence failure during recorder flush
      setMockPersistenceFailureForTest(true);

      const success = await store.loadScenarioById('SWARM-1');
      expect(success).toBe(false);

      // Interface state must NOT claim SWARM-1 is loaded
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-1');

      setMockPersistenceFailureForTest(false);
    });

    it('restartSession reloads active scenario with a fresh seed and preserves previous session replay data', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('SWARM-1');
      const initialSeed = engineInstance.spec?.seed;
      expect(initialSeed).toBe(4040);
      const oldSessionUid = getActiveRecorder()!.getSessionUid();

      // Run 10 ticks
      for (let i = 0; i < 10; i++) engineInstance.step();

      // Execute fresh restart
      await store.restartSession();

      // Selected scenario is preserved
      expect(useSessionStore.getState().currentScenarioId).toBe('SWARM-1');
      expect(engineInstance.spec?.id).toBe('SWARM-1');

      // Seed must be fresh (different from initial 4040)
      const freshSeed = engineInstance.spec?.seed;
      expect(freshSeed).toBeDefined();
      expect(typeof freshSeed).toBe('number');
      expect(freshSeed).not.toBe(4040);

      // SIM_START records the actual new seed
      const startEvent = engineInstance.events.find((e) => e.type === 'SIM_START');
      expect(startEvent?.payload.scenarioId).toBe('SWARM-1');
      expect(startEvent?.payload.seed).toBe(freshSeed);

      // Previous session's replay data was preserved
      const oldEvents = await getRecordedEventsForSession(oldSessionUid);
      expect(oldEvents.some((e) => e.type === 'SESSION_END')).toBe(true);
      expect(oldEvents.find((e) => e.type === 'SIM_START')?.payload.seed).toBe(4040);
    });

    it('rerunExactSeedSession retains the exact seed for benchmarking', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('DEMO-2', 8888);
      expect(engineInstance.spec?.seed).toBe(8888);

      for (let i = 0; i < 5; i++) engineInstance.step();

      await store.rerunExactSeedSession();

      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-2');
      expect(engineInstance.spec?.seed).toBe(8888);

      const startEvent = engineInstance.events.find((e) => e.type === 'SIM_START');
      expect(startEvent?.payload.seed).toBe(8888);
    });

    it('drops user actions while session is ended', () => {
      const store = useSessionStore.getState();
      engineInstance.abort('TEST_ACTION_DROP');
      expect(engineInstance.sessionEnded).toBe(true);

      const initialQueueLen = engineInstance.inputQueue.getPendingCount();
      store.designate('T-01');
      store.classify('T-01', 'HOSTILE_ATTACK');
      store.fire('T-01');
      store.assess('T-01', 'KILL');

      expect(engineInstance.inputQueue.getPendingCount()).toBe(initialQueueLen);
    });

    it('repeated scenario loading resets event sequences and preserves isolation', async () => {
      const store = useSessionStore.getState();

      // Load DEMO-1, simulate 5 ticks
      await store.loadScenarioById('DEMO-1');
      for (let i = 0; i < 5; i++) engineInstance.step();
      const eventsDemo1 = [...engineInstance.events];
      expect(eventsDemo1.length).toBeGreaterThan(0);

      // Load SPECTRUM-1
      await store.loadScenarioById('SPECTRUM-1');
      expect(engineInstance.tickIndex).toBe(0);
      expect(useSessionStore.getState().currentScenarioId).toBe('SPECTRUM-1');

      // The events array should only contain SPECTRUM-1 events starting at tick 0
      const startEv = engineInstance.events.find((e) => e.type === 'SIM_START');
      expect(startEv?.payload.scenarioId).toBe('SPECTRUM-1');
      expect(engineInstance.events.every((e) => e.payload.scenarioId !== 'DEMO-1' || e.type !== 'SIM_START')).toBe(true);
    });

    it('a failed scenario load does not silently replace the current session', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('DEMO-1');
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-1');

      // Attempt to load an invalid spec (budget < 6s)
      const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(demo2Spec));
      unfairSpec.id = 'UNFAIR-FAIL';
      unfairSpec.threats[0].waypoints = [
        { x: 520, y: 0, z: 20 },
        { x: 0, y: 0, z: 20 },
      ];
      unfairSpec.threats[0].speedMps = 50; // Violates time budget

      await store.loadScenario(unfairSpec);

      // The store must NOT claim UNFAIR-FAIL is loaded
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-1');
      expect(engineInstance.spec?.id).toBe('DEMO-1');
    });

    it('strictly locks scenario changes mid-EVAL session', async () => {
      const store = useSessionStore.getState();

      // Configure an EVAL spec
      const evalSpec: ScenarioSpec = JSON.parse(JSON.stringify(demo2Spec));
      evalSpec.id = 'EVAL-DRILL';
      evalSpec.mode = 'EVAL';

      // Load initial EVAL scenario
      await store.loadScenario(evalSpec);
      expect(engineInstance.mode).toBe('EVAL');

      // Run 2 ticks so session is active
      engineInstance.step();
      engineInstance.step();
      expect(engineInstance.tickIndex).toBe(2);

      // Attempt mid-EVAL switch to SWARM-1
      const switchSuccess = await store.loadScenarioById('SWARM-1');
      expect(switchSuccess).toBe(false);

      // Must remain on EVAL-DRILL
      expect(engineInstance.spec?.id).toBe('EVAL-DRILL');
      expect(useSessionStore.getState().currentScenarioId).toBe('EVAL-DRILL');
    });

    it('modal open/close state toggles cleanly', () => {
      const store = useSessionStore.getState();
      expect(store.isScenarioModalOpen).toBe(false);

      store.openScenarioModal();
      expect(useSessionStore.getState().isScenarioModalOpen).toBe(true);

      store.closeScenarioModal();
      expect(useSessionStore.getState().isScenarioModalOpen).toBe(false);
    });
  });
});

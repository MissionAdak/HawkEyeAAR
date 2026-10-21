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
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import type { ScenarioSpec } from '@/sim/types';

describe('Scenario Catalog & Validation (TASK 12)', () => {
  beforeEach(async () => {
    // Reset engine session state before loading default scenario
    engineInstance.abort('TEST_RESET');
    await useSessionStore.getState().loadScenarioById(DEFAULT_SCENARIO_ID);
  });

  afterEach(() => {
    engineInstance.abort('TEST_CLEANUP');
  });

  it('contains the 5 required catalog entries with unique stable IDs', () => {
    expect(SCENARIO_CATALOG).toHaveLength(5);
    const ids = SCENARIO_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual(['DEMO-1', 'DEMO-2', 'SWARM-1', 'SPECTRUM-1', 'PROCEDURAL-1']);
  });

  it('sets DEMO-1 as the startup default scenario ID', () => {
    expect(DEFAULT_SCENARIO_ID).toBe('DEMO-1');
    const defaultEntry = getScenarioCatalogEntry(DEFAULT_SCENARIO_ID);
    expect(defaultEntry).toBeDefined();
    expect(defaultEntry?.id).toBe('DEMO-1');
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

  it('validates PROCEDURAL-1 generated scenario', () => {
    const entry = getScenarioCatalogEntry('PROCEDURAL-1');
    expect(entry).toBeDefined();
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

    it('restartSession reloads the active scenario and its seed, not always DEMO-1', async () => {
      const store = useSessionStore.getState();
      // First load SWARM-1
      await store.loadScenarioById('SWARM-1');
      expect(useSessionStore.getState().currentScenarioId).toBe('SWARM-1');
      expect(engineInstance.spec?.id).toBe('SWARM-1');
      expect(engineInstance.spec?.seed).toBe(4040);

      // Now call restartSession
      await store.restartSession();

      // Must reload SWARM-1, not DEMO-1
      expect(useSessionStore.getState().currentScenarioId).toBe('SWARM-1');
      expect(engineInstance.spec?.id).toBe('SWARM-1');
      expect(engineInstance.spec?.seed).toBe(4040);

      const startEvent = engineInstance.events.find((e) => e.type === 'SIM_START');
      expect(startEvent?.payload.scenarioId).toBe('SWARM-1');
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

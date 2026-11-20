import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  useSessionStore,
  engineInstance,
  getActiveRecorder,
} from '@/store/sessionStore';
import {
  SCENARIO_CATALOG,
  loadCatalogScenario,
  getScenarioCatalogEntry,
} from '@/director/catalog';
import { validate } from '@/director/validate';
import { SimEngine } from '@/sim/engine';

describe('TASK 19.1 — Complete Scenario Lifecycle & State Isolation', () => {
  beforeEach(() => {
    useSessionStore.getState().returnToBriefing();
  });

  afterEach(() => {
    engineInstance.abort('TEST_CLEANUP');
    useSessionStore.getState().returnToBriefing();
  });

  describe('1. Scenario Catalog Validation & Configuration Integrity', () => {
    it('contains exactly 8 catalog scenarios, all satisfying fairness validation', () => {
      expect(SCENARIO_CATALOG.length).toBe(8);

      const expectedIds = [
        'DEMO-1',
        'DEMO-2',
        'SWARM-1',
        'SPECTRUM-1',
        'PROCEDURAL-1',
        'RANDOM-1',
        'FORMATION-1',
        'POPUP-1',
      ];

      for (const id of expectedIds) {
        const entry = getScenarioCatalogEntry(id);
        expect(entry, `Scenario ${id} must exist in catalog`).toBeDefined();
        expect(entry!.id).toBe(id);
        expect(entry!.name.length).toBeGreaterThan(0);
        expect(entry!.description.length).toBeGreaterThan(0);
        expect(entry!.objective.length).toBeGreaterThan(0);
        expect(entry!.durationSec).toBe(120);
        expect(entry!.classes.length).toBeGreaterThan(0);

        // Load spec and validate fairness
        const { spec } = loadCatalogScenario(id, 2026);
        expect(validate(spec), `Scenario ${id} spec must satisfy fairness validator`).toBe(true);
        expect(spec.durationMs).toBe(120000);
        expect(spec.asset).toBeDefined();
        expect(spec.asset.rMinM).toBe(500);
      }
    });

    it('generates deterministic specs when fixed seeds are provided', () => {
      const fixedSeed = 54321;
      const procedural1 = loadCatalogScenario('PROCEDURAL-1', fixedSeed);
      const procedural2 = loadCatalogScenario('PROCEDURAL-1', fixedSeed);
      expect(procedural1.spec.threats.length).toBe(procedural2.spec.threats.length);
      expect(procedural1.spec.seed).toBe(procedural2.spec.seed);

      const formation1 = loadCatalogScenario('FORMATION-1', fixedSeed);
      const formation2 = loadCatalogScenario('FORMATION-1', fixedSeed);
      expect(formation1.spec.threats.length).toBe(formation2.spec.threats.length);
      expect(formation1.spec.seed).toBe(formation2.spec.seed);
    });
  });

  describe('2. Scenario Initialization & Progression Lifecycle', () => {
    it('initializes SimEngine cleanly and progresses through 20 Hz simulation ticks', () => {
      const { spec } = loadCatalogScenario('DEMO-1');
      const engine = new SimEngine();
      engine.load(spec);

      expect(engine.tickIndex).toBe(0);
      expect(engine.events.length).toBeGreaterThanOrEqual(1);
      expect(engine.events[0].type).toBe('SIM_START');
      expect(engine.events[0].payload.scenarioId).toBe('DEMO-1');
      expect(engine.sessionEnded).toBe(false);

      // Verify track entities are initialized
      expect(engine.curr.length).toBe((spec.threats?.length || 0) + (spec.decoys?.length || 0));
      for (const entity of engine.curr) {
        expect(entity.trackNo).toMatch(/^T-\d{2}$/);
        expect(['UNDETECTED', 'FIND']).toContain(entity.step);
        expect(entity.lifecycle).toBe('ACTIVE');
      }

      // Step 40 ticks (2.0s = 1 radar sweep cycle)
      for (let i = 0; i < 40; i++) {
        engine.step();
      }

      expect(engine.tickIndex).toBe(40);
      // Radar sweep evaluated at tick 40 produces DETECT events
      const detectEvents = engine.events.filter((e) => e.type === 'DETECT');
      expect(detectEvents.length).toBeGreaterThan(0);
    });

    it('advances to genuine SESSION_END upon reaching durationMs with terminal AAR metrics', () => {
      const { spec } = loadCatalogScenario('DEMO-2');
      const engine = new SimEngine();
      engine.load(spec);

      const totalTicks = Math.ceil(spec.durationMs / 50); // 2400 ticks
      for (let i = 0; i < totalTicks; i++) {
        engine.step();
      }

      expect(engine.sessionEnded).toBe(true);
      const endEvent = engine.events.find((e) => e.type === 'SESSION_END');
      expect(endEvent).toBeDefined();
      expect(endEvent!.payload.reason).toBe('COMPLETE');
      expect(endEvent!.payload.aborted).toBe(false);
      expect(endEvent!.payload.durationMs).toBe(120000);
      expect(endEvent!.payload.metrics).toBeDefined();
    });
  });

  describe('3. Scenario Switching & Cross-Session Isolation', () => {
    it('switching scenarios cleanly flushes old tracks, events, and resets session state', async () => {
      const store = useSessionStore.getState();

      // 1. Start DEMO-1
      const start1 = await store.startSession('DEMO-1');
      expect(start1).toBe(true);
      expect(engineInstance.spec?.id).toBe('DEMO-1');
      const demo1TrackCount = engineInstance.curr.length;
      expect(demo1TrackCount).toBeGreaterThan(0);

      // Advance 20 ticks
      for (let i = 0; i < 20; i++) {
        engineInstance.step();
      }
      expect(engineInstance.tickIndex).toBe(20);

      // 2. Switch to SWARM-1
      const start2 = await store.startSession('SWARM-1');
      expect(start2).toBe(true);

      // Verify that engine was completely reset and reloaded with SWARM-1
      expect(engineInstance.spec?.id).toBe('SWARM-1');
      expect(engineInstance.tickIndex).toBe(0);
      expect(useSessionStore.getState().currentScenarioId).toBe('SWARM-1');
      expect(useSessionStore.getState().sessionStatus).toBe('RUNNING');

      // Verify threats are exclusively from SWARM-1, zero old tracks from DEMO-1 surviving
      const { spec: swarmSpec } = loadCatalogScenario('SWARM-1');
      const expectedSwarmThreats = (swarmSpec.threats?.length || 0) + (swarmSpec.decoys?.length || 0);
      expect(engineInstance.curr.length).toBe(expectedSwarmThreats);
      for (const e of engineInstance.curr) {
        expect(e.id).toMatch(/^(H-SWM|B-|C-)/);
      }

      // Verify events stream reset with new SIM_START
      const simStartEvents = engineInstance.events.filter((e) => e.type === 'SIM_START');
      expect(simStartEvents.length).toBe(1);
      expect(simStartEvents[0].payload.scenarioId).toBe('SWARM-1');
    });

    it('returnToBriefing completely clears engine, tracker, and store state', async () => {
      const store = useSessionStore.getState();
      await store.startSession('DEMO-1');

      // Step to generate tracks and tracker estimates
      for (let i = 0; i < 45; i++) {
        engineInstance.step();
      }
      expect(engineInstance.tracker.getAllEstimates().length).toBeGreaterThan(0);

      // Return to briefing
      store.returnToBriefing();

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('READY');
      expect(state.isSimRunning).toBe(false);
      expect(state.isBriefingOpen).toBe(true);
      expect(state.ui.trackRows.length).toBe(0);
      expect(state.ui.selectedTrackNo).toBeNull();

      expect(engineInstance.spec).toBeNull();
      expect(engineInstance.curr.length).toBe(0);
      expect(engineInstance.prev.length).toBe(0);
      expect(engineInstance.events.length).toBe(0);
      expect(engineInstance.tracker.getAllEstimates().length).toBe(0);
      expect(engineInstance.rfMeasurements.length).toBe(0);
      expect(engineInstance.tickIndex).toBe(0);
      expect(getActiveRecorder()).toBeNull();
    });

    it('aborting a running session preserves AAR and emits aborted SESSION_END', async () => {
      const store = useSessionStore.getState();
      await store.startSession('SPECTRUM-1');

      // Step 50 ticks
      for (let i = 0; i < 50; i++) {
        engineInstance.step();
      }

      // Abort
      store.abortSession('OPERATOR_ABORT');

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('ABORTED');
      expect(state.isSimRunning).toBe(false);
      expect(state.isAarOpen).toBe(true);

      const endEvent = engineInstance.events.find((e) => e.type === 'SESSION_END');
      expect(endEvent).toBeDefined();
      expect(endEvent!.payload.aborted).toBe(true);
      expect(endEvent!.payload.reason).toBe('OPERATOR_ABORT');
      expect(endEvent!.payload.durationMs).toBe(2500); // 50 ticks * 50ms
    });
  });
});

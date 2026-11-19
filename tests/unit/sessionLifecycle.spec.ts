import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useSessionStore,
  engineInstance,
  clockInstance,
  getActiveRecorder,
} from '@/store/sessionStore';
import { DEFAULT_SCENARIO_ID } from '@/director/catalog';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('TASK 15 — Explicit Start Session, Mission Briefing & Session Lifecycle', () => {
  beforeEach(() => {
    // Reset session store to initial idle briefing state
    useSessionStore.getState().returnToBriefing();
  });

  afterEach(() => {
    engineInstance.abort('TEST_CLEANUP');
  });

  describe('1. Initial Idle Briefing State & Page Mount Invariants', () => {
    it('initializes in READY status with DEMO-1 pending and briefing open', () => {
      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('READY');
      expect(state.isSimRunning).toBe(false);
      expect(state.isBriefingOpen).toBe(true);
      expect(state.selectedScenarioId).toBe(DEFAULT_SCENARIO_ID);
    });

    it('does not load a scenario into engine on mount (engine spec remains null)', () => {
      expect(engineInstance.spec).toBeNull();
      expect(engineInstance.curr.length).toBe(0);
    });

    it('holds clock at T+00:00.000 and tick index at 0 before explicit start', () => {
      expect(engineInstance.tickIndex).toBe(0);
      expect(clockInstance.getRawMs()).toBe(0);
      expect(useSessionStore.getState().ui.formattedClock).toBe('T+00:00.000');
    });

    it('does not start an EventRecorder or emit SIM_START before explicit start', () => {
      expect(getActiveRecorder()).toBeNull();
      const simStartEvents = engineInstance.events.filter((e) => e.type === 'SIM_START');
      expect(simStartEvents.length).toBe(0);
    });
  });

  describe('2. Scenario Selection vs Scenario Execution', () => {
    it('selecting a scenario updates selectedScenarioId without loading engine or starting clock', () => {
      const store = useSessionStore.getState();
      store.selectScenario('DEMO-2');

      const updated = useSessionStore.getState();
      expect(updated.selectedScenarioId).toBe('DEMO-2');
      expect(updated.sessionStatus).toBe('READY');
      expect(updated.isSimRunning).toBe(false);
      expect(engineInstance.spec).toBeNull();
      expect(engineInstance.tickIndex).toBe(0);
      expect(getActiveRecorder()).toBeNull();
    });

    it('selecting RANDOM-1 retains briefing state without prematurely generating random encounters', () => {
      const store = useSessionStore.getState();
      store.selectScenario('RANDOM-1');

      expect(useSessionStore.getState().selectedScenarioId).toBe('RANDOM-1');
      expect(useSessionStore.getState().sessionStatus).toBe('READY');
      expect(engineInstance.spec).toBeNull();
      expect(engineInstance.events.length).toBe(0);
    });
  });

  describe('3. Explicit Session Start & Lifecycle Transition', () => {
    it('startSession loads catalog spec, records SIM_START, and transitions to RUNNING', async () => {
      const store = useSessionStore.getState();
      store.selectScenario('DEMO-1');

      const started = await store.startSession();
      expect(started).toBe(true);

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('RUNNING');
      expect(state.isSimRunning).toBe(true);
      expect(state.isBriefingOpen).toBe(false);
      expect(state.currentScenarioId).toBe('DEMO-1');

      // Verify engine received spec
      expect(engineInstance.spec).not.toBeNull();
      expect(engineInstance.spec?.id).toBe('DEMO-1');

      // Verify exactly one SIM_START event captured
      const simStartEvents = engineInstance.events.filter((e) => e.type === 'SIM_START');
      expect(simStartEvents.length).toBe(1);

      // Verify active recorder is connected
      expect(getActiveRecorder()).not.toBeNull();
    });

    it('startSession guards against concurrent double-starts (reentrancy)', async () => {
      const store = useSessionStore.getState();
      const p1 = store.startSession('DEMO-1');
      const p2 = store.startSession('DEMO-1');

      const [res1, res2] = await Promise.all([p1, p2]);
      // Exactly one succeeds, second is rejected by reentrancy guard
      expect((res1 && !res2) || (!res1 && res2)).toBe(true);
      expect(useSessionStore.getState().sessionStatus).toBe('RUNNING');
    });

    it('startSession with RANDOM-1 generates a fresh procedural scenario and starts cleanly', async () => {
      const store = useSessionStore.getState();
      const ok = await store.startSession('RANDOM-1');
      expect(ok).toBe(true);

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('RUNNING');
      expect(state.currentScenarioId).toBe('RANDOM-1');
      expect(engineInstance.spec).not.toBeNull();
      expect(engineInstance.spec?.id).toMatch(/^RANDOM-1/);
    });

    it('refuses to start an invalid scenario specification', async () => {
      const store = useSessionStore.getState();
      store.returnToBriefing();

      const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(demo1Json));
      unfairSpec.id = 'UNFAIR-FAIL';
      unfairSpec.threats[0].waypoints = [
        { x: 520, y: 0, z: 20 },
        { x: 0, y: 0, z: 20 },
      ];
      unfairSpec.threats[0].speedMps = 50; // Violates time budget

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await store.loadScenario(unfairSpec);
      consoleSpy.mockRestore();

      expect(useSessionStore.getState().sessionStatus).toBe('READY');
      expect(engineInstance.spec).toBeNull();
    });
  });

  describe('4. Session Completion, Abort & Return to Briefing', () => {
    it('abortSession transitions to ABORTED, halts clock, and opens AAR', async () => {
      const store = useSessionStore.getState();
      await store.startSession('DEMO-1');
      expect(useSessionStore.getState().sessionStatus).toBe('RUNNING');

      store.abortSession('OPERATOR_STOP');

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('ABORTED');
      expect(state.isSimRunning).toBe(false);
      expect(state.isAarOpen).toBe(true);
      expect(engineInstance.sessionEnded).toBe(true);
    });

    it('returnToBriefing clears active session state and resets to READY briefing', async () => {
      const store = useSessionStore.getState();
      await store.startSession('DEMO-1');
      expect(useSessionStore.getState().sessionStatus).toBe('RUNNING');

      store.returnToBriefing();

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('READY');
      expect(state.isSimRunning).toBe(false);
      expect(state.isBriefingOpen).toBe(true);
      expect(state.isAarOpen).toBe(false);
      expect(engineInstance.spec).toBeNull();
      expect(engineInstance.tickIndex).toBe(0);
      expect(engineInstance.curr.length).toBe(0);
    });

    it('restartSession starts a fresh run with a new seed', async () => {
      const store = useSessionStore.getState();
      await store.startSession('DEMO-1');
      const seed1 = engineInstance.spec?.seed;

      const ok = await store.restartSession({ freshSeed: true });
      expect(ok).toBe(true);

      const state = useSessionStore.getState();
      expect(state.sessionStatus).toBe('RUNNING');
      // New seed generated
      expect(engineInstance.spec?.seed).toBeDefined();
      expect(engineInstance.spec?.seed).not.toBe(seed1);
    });

    it('rerunExactSeedSession preserves the exact scenario seed', async () => {
      const store = useSessionStore.getState();
      await store.startSession('DEMO-1', 998877);
      expect(engineInstance.spec?.seed).toBe(998877);

      const ok = await store.rerunExactSeedSession();
      expect(ok).toBe(true);
      expect(engineInstance.spec?.seed).toBe(998877);
    });
  });

  describe('5. Mode Safety & EVAL Lock Rules', () => {
    it('prohibits scenario switching or restarting mid-EVAL', async () => {
      const store = useSessionStore.getState();
      await store.startSession('DEMO-1');
      if (engineInstance.spec) {
        (engineInstance.spec as unknown as { mode: string }).mode = 'EVAL';
      }
      engineInstance.tickIndex = 10;
      engineInstance.sessionEnded = false;

      const switchOk = await store.loadScenarioById('DEMO-2');
      expect(switchOk).toBe(false);

      const restartOk = await store.restartSession();
      expect(restartOk).toBe(false);

      // Verify DEMO-1 remained active
      expect(useSessionStore.getState().currentScenarioId).toBe('DEMO-1');
    });
  });
});

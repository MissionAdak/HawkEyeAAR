import { describe, it, expect, beforeEach } from 'vitest';
import { engineInstance, useSessionStore, clockInstance } from '@/store/sessionStore';
import demo1Spec from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Zustand sessionStore & InputQueue Facade', () => {
  beforeEach(() => {
    clockInstance.reset();
    engineInstance.load(demo1Spec as unknown as ScenarioSpec);
  });

  it('dispatching 1,000 actions leaves sim state untouched until the next tick', () => {
    const store = useSessionStore.getState();

    // Verify initial tick is 0
    expect(engineInstance.tickIndex).toBe(0);
    expect(engineInstance.inputQueue.getPendingCount()).toBe(0);

    // Dispatch 1,000 user actions
    for (let i = 0; i < 1000; i++) {
      store.designate(`T-${i % 10}`);
    }

    // Input queue should have 1,000 actions queued
    expect(engineInstance.inputQueue.getPendingCount()).toBe(1000);
    // Sim engine tick and state must be untouched!
    expect(engineInstance.tickIndex).toBe(0);

    // Now advance one tick
    engineInstance.step();
    expect(engineInstance.tickIndex).toBe(1);

    // After step() drains for tick 1, actions with applyTick <= 1 are executed
    expect(engineInstance.inputQueue.getPendingCount()).toBe(0);
  });

  it('caps UI snapshot track rows at 150', () => {
    // Inject 200 dummy active entities into engine
    engineInstance.curr = [];
    for (let i = 1; i <= 200; i++) {
      engineInstance.curr.push({
        id: `DUMMY-${i}`,
        trackNo: `T-${String(i).padStart(3, '0')}`,
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: i * 20, y: i * 20, z: 50 },
        prev: { x: i * 20, y: i * 20, z: 50 },
        vel: { x: 10, y: 10, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
        step: 'FIND',
        q: 0.8,
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 0,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      });
    }

    const snapshot = engineInstance.buildUiSnapshot();
    expect(snapshot.trackRows.length).toBeLessThanOrEqual(150);
    expect(snapshot.trackRows).toHaveLength(150);
  });

  it('sessionStore.fire does not permit duplicate releases for the same track in the same tick', () => {
    const store = useSessionStore.getState();
    const target = engineInstance.curr[0];
    expect(target).toBeDefined();
    const trackNo = target.trackNo ?? 'T-01';

    expect(engineInstance.inputQueue.getPendingCount()).toBe(0);

    // Call store.fire 10 times consecutively
    for (let i = 0; i < 10; i++) {
      store.fire(trackNo);
    }

    // Only 1 FIRE action should be queued; 9 duplicate releases must be rejected
    expect(engineInstance.inputQueue.getPendingCount()).toBe(1);
    expect(engineInstance.inputQueue.hasPendingFire(trackNo)).toBe(true);
  });

  it('sessionStore.fire rejects firing on targets with step ASSESS or CLOSED or lifecycle !== ACTIVE', () => {
    const store = useSessionStore.getState();
    const target = engineInstance.curr[0];
    expect(target).toBeDefined();
    const trackNo = target.trackNo ?? 'T-01';

    // 1. ASSESS step
    target.step = 'ASSESS';
    engineInstance.inputQueue.clear();
    store.fire(trackNo);
    expect(engineInstance.inputQueue.getPendingCount()).toBe(0);

    // 2. CLOSED step
    target.step = 'CLOSED';
    engineInstance.inputQueue.clear();
    store.fire(trackNo);
    expect(engineInstance.inputQueue.getPendingCount()).toBe(0);

    // 3. Inactive lifecycle
    target.step = 'TARGET';
    target.lifecycle = 'NEUTRALISED';
    engineInstance.inputQueue.clear();
    store.fire(trackNo);
    expect(engineInstance.inputQueue.getPendingCount()).toBe(0);
  });
});

describe('SimEngine.buildUiSnapshot & sessionStore Difficulty Integrity (TASK 21-PT-R2-FINAL-R)', () => {
  beforeEach(() => {
    clockInstance.reset();
  });

  const testCases: Array<{ name: string; input: number | undefined; expected: number }> = [
    { name: 'difficulty: 0 (zero boundary value)', input: 0, expected: 0 },
    { name: 'difficulty: 0.3 (standard default)', input: 0.3, expected: 0.3 },
    { name: 'difficulty: 0.75 (mid-high progression)', input: 0.75, expected: 0.75 },
    { name: 'difficulty: 1 (maximum bound)', input: 1, expected: 1 },
    { name: 'difficulty: undefined (missing property fallback)', input: undefined, expected: 0.3 },
    { name: 'difficulty: NaN (non-finite fallback)', input: NaN, expected: 0.3 },
    { name: 'difficulty: Infinity (non-finite fallback)', input: Infinity, expected: 0.3 },
    { name: 'difficulty: -Infinity (non-finite fallback)', input: -Infinity, expected: 0.3 },
  ];

  for (const tc of testCases) {
    it(`evaluates buildUiSnapshot() correctly for ${tc.name} -> ${tc.expected}`, () => {
      const fixtureSpec = structuredClone(demo1Spec as unknown as ScenarioSpec);
      fixtureSpec.difficulty = tc.input as unknown as number;

      engineInstance.load(fixtureSpec);
      const snapshot = engineInstance.buildUiSnapshot();

      expect(snapshot.difficulty).toBe(tc.expected);

      // Verify that calling buildUiSnapshot() did not mutate the scenario specification
      expect(fixtureSpec.difficulty).toBe(tc.input);
      // Verify that simulation state is unmutated
      expect(engineInstance.tickIndex).toBe(0);
    });
  }

  it('preserves zero difficulty through the sessionStore setUiSnapshot update path', () => {
    const store = useSessionStore.getState();
    const zeroSpec = structuredClone(demo1Spec as unknown as ScenarioSpec);
    zeroSpec.difficulty = 0;

    engineInstance.load(zeroSpec);
    const snapshot = engineInstance.buildUiSnapshot();
    expect(snapshot.difficulty).toBe(0);

    store.setUiSnapshot(snapshot);
    expect(useSessionStore.getState().ui.difficulty).toBe(0);
  });

  it('preserves idle persisted difficulty against idle snapshot overwrites and supports active zero-difficulty scenarios', () => {
    const store = useSessionStore.getState();

    // 1. Trainee has a persisted non-default difficulty (e.g. 0.42) while idle
    useSessionStore.setState((s) => ({ ui: { ...s.ui, difficulty: 0.42 } }));
    engineInstance.spec = null;

    // Idle engine snapshot produces default 0.3 because engine has no active scenario
    const idleSnapshot = engineInstance.buildUiSnapshot();
    expect(idleSnapshot.difficulty).toBe(0.3);

    // Calling setUiSnapshot during idle MUST NOT overwrite persisted trainee difficulty 0.42 with 0.3
    store.setUiSnapshot(idleSnapshot);
    expect(useSessionStore.getState().ui.difficulty).toBe(0.42);

    // 2. Legitimate trainee update while idle is preserved and not overwritten
    useSessionStore.setState((s) => ({ ui: { ...s.ui, difficulty: 0.15 } }));
    store.setUiSnapshot(idleSnapshot);
    expect(useSessionStore.getState().ui.difficulty).toBe(0.15);

    // 3. When an active scenario with difficulty zero is loaded, store correctly updates to 0
    const zeroSpec = structuredClone(demo1Spec as unknown as ScenarioSpec);
    zeroSpec.difficulty = 0;
    engineInstance.load(zeroSpec);
    const activeZeroSnapshot = engineInstance.buildUiSnapshot();
    expect(activeZeroSnapshot.difficulty).toBe(0);

    store.setUiSnapshot(activeZeroSnapshot);
    expect(useSessionStore.getState().ui.difficulty).toBe(0);

    // 4. When an active scenario with difficulty 0.75 is loaded, store correctly updates to 0.75
    const highSpec = structuredClone(demo1Spec as unknown as ScenarioSpec);
    highSpec.difficulty = 0.75;
    engineInstance.load(highSpec);
    const activeHighSnapshot = engineInstance.buildUiSnapshot();
    expect(activeHighSnapshot.difficulty).toBe(0.75);

    store.setUiSnapshot(activeHighSnapshot);
    expect(useSessionStore.getState().ui.difficulty).toBe(0.75);
  });
});


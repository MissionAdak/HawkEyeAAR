import { describe, it, expect, beforeEach } from 'vitest';
import { engineInstance, useSessionStore } from '@/store/sessionStore';
import demo1Spec from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Zustand sessionStore & InputQueue Facade', () => {
  beforeEach(() => {
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
});

import { describe, it, expect } from 'vitest';
import { useSessionStore } from '../../src/store/sessionStore';
import { SimEngine } from '../../src/sim/engine';
import type { ScenarioSpec } from '../../src/sim/types';

describe('Zustand Session Store & Input Queue (TASK-P0-05)', () => {
  const dummySpec: ScenarioSpec = {
    id: 'TEST-SCENARIO',
    schemaVersion: 1,
    simVersion: '1.1.0',
    configHash: 'sha256:test',
    mode: 'TRAIN',
    seed: 42,
    difficulty: 0.3,
    dayNight: 'DAY',
    durationMs: 120_000,
    asset: { x: 0, y: 0, rMinM: 500 },
    zones: [],
    threats: [
      {
        id: 'H-1',
        droneType: 'FPV_ATTACK',
        trueClass: 'HOSTILE_ATTACK',
        spawnTMs: 0,
        waypoints: [{ x: 1000, y: 1000, z: 100 }],
        speedMps: 40,
        profile: 'DIRECT',
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
      },
    ],
    decoys: [],
    chaos: [],
    triggers: [],
    roeText: 'TEST ROE',
    levers: [],
    features: Array(33).fill(0),
  };

  it('guarantees that dispatching 1,000 actions leaves sim state untouched until the next tick (AC: TASK-P0-05)', () => {
    const engine = new SimEngine();
    engine.load(dummySpec);

    // Initial state check
    const initialTick = engine.currentTick;
    expect(initialTick).toBe(0);
    expect(engine.events).toHaveLength(1); // SIM_START
    expect(engine.inputQueue.size()).toBe(0);

    // Bind engine to store
    useSessionStore.getState().setEngine(engine);

    // Dispatch 1,000 actions through the Zustand facade
    for (let i = 0; i < 1000; i++) {
      if (i % 4 === 0) {
        useSessionStore.getState().designate('T-01');
      } else if (i % 4 === 1) {
        useSessionStore.getState().classify('T-01', 'HOSTILE_ATTACK');
      } else if (i % 4 === 2) {
        useSessionStore.getState().selectEffector('RF_SOFTKILL');
      } else {
        useSessionStore.getState().setSensor('RF');
      }
    }

    // CRITICAL ASSERTION:
    // Engine tick, events, and entity state must remain 100% UNTOUCHED
    expect(engine.currentTick).toBe(0);
    expect(engine.events).toHaveLength(1); // Still only SIM_START
    expect(engine.inputQueue.size()).toBe(1000);

    // Now advance exactly one tick
    engine.step();

    // Now actions for tick 1 are drained and processed
    expect(engine.currentTick).toBe(1);
    expect(engine.inputQueue.size()).toBe(0);
    expect(engine.events.length).toBeGreaterThan(1);
  });
});

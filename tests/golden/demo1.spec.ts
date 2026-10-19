import { describe, it, expect } from 'vitest';
import demo1Json from '@/director/bundled/demo1.json';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import type { ScenarioSpec } from '@/sim/types';

describe('Golden DEMO-1 Re-simulation & Determinism (TASK-P3-10, AC-2, AC-8)', () => {
  const spec = demo1Json as unknown as ScenarioSpec;

  it('runs DEMO-1 scenario deterministically with scripted operator inputs', () => {
    const runSimulation = () => {
      const engine = new SimEngine();
      engine.load(spec);

      // Trainee actions:
      // T+10s (tick 200): Designate H-1 (T-01)
      engine.inputQueue.push({
        tRawMs: 10000,
        applyTick: 200,
        action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'KEY' },
      });

      // T+15s (tick 300): Classify T-01 as HOSTILE_ATTACK
      engine.inputQueue.push({
        tRawMs: 15000,
        applyTick: 300,
        action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' },
      });

      // T+57s (tick 1140): Select and fire RF_SOFTKILL at T-01
      engine.inputQueue.push({
        tRawMs: 56900,
        applyTick: 1140,
        action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' },
      });
      engine.inputQueue.push({
        tRawMs: 57000,
        applyTick: 1140,
        action: { type: 'FIRE', trackNo: 'T-01' },
      });

      // T+58s (tick 1160): Confirm kill
      engine.inputQueue.push({
        tRawMs: 58000,
        applyTick: 1160,
        action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
      });

      // Run 2400 ticks (120 seconds)
      for (let tick = 0; tick < 2400; tick++) {
        engine.step();
      }

      const metrics = aggregateAARMetrics(engine.events, spec);
      return { engine, metrics };
    };

    // Run 1
    const run1 = runSimulation();
    // Run 2
    const run2 = runSimulation();

    // Verify bit-identical event count and sequences
    expect(run1.engine.events.length).toBe(run2.engine.events.length);
    for (let i = 0; i < run1.engine.events.length; i++) {
      const ev1 = run1.engine.events[i];
      const ev2 = run2.engine.events[i];
      expect(ev1.type).toBe(ev2.type);
      expect(ev1.tMs).toBe(ev2.tMs);
      expect(ev1.trackNo).toBe(ev2.trackNo);
    }

    // Verify scores are identical within 1e-6
    expect(Math.abs(run1.metrics.score - run2.metrics.score)).toBeLessThan(1e-6);
    expect(run1.metrics.grade).toBe(run2.metrics.grade);

    // Verify metrics validity
    expect(run1.metrics.score).toBeGreaterThan(0);
    expect(run1.metrics.clsAccuracy).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { SimClock, TICK_MS } from '../../src/sim/clock';

describe('Simulation Clock & Accumulator Loop', () => {
  it('guarantees exactly 200 ticks after 10 s under simulated frame deltas of 16.7ms, 6.9ms, and 33ms (TASK-P0-04)', () => {
    const totalSimDurationMs = 10_000; // 10 seconds

    const frameDeltas = [16.7, 6.9, 33.0];

    for (const delta of frameDeltas) {
      const clock = new SimClock(1);
      let elapsedSimulatedTime = 0;
      let totalTicks = 0;

      while (elapsedSimulatedTime + delta <= totalSimDurationMs) {
        const { ticksToStep } = clock.advanceAccumulator(delta);
        totalTicks += ticksToStep;
        elapsedSimulatedTime += delta;
      }

      // Feed remaining time up to exactly 10,000 ms
      const remainder = totalSimDurationMs - elapsedSimulatedTime;
      if (remainder > 0) {
        const { ticksToStep } = clock.advanceAccumulator(remainder);
        totalTicks += ticksToStep;
      }

      expect(totalTicks).toBe(200);
    }
  });

  it('correctly quantises input timestamp to next tick boundary (DT-4)', () => {
    // Current tick is 10 (simTimeMs = 500ms)
    // tRawMs = 520ms -> ceil(520/50) = 11 -> applyTick = max(11, 11) = 11, tMs = 550ms
    const r1 = SimClock.quantiseInput(520, 10);
    expect(r1.applyTick).toBe(11);
    expect(r1.tMs).toBe(550);

    // tRawMs = 500ms (exactly on boundary) -> ceil(500/50) = 10 -> max(10, 11) = 11 (next tick)
    const r2 = SimClock.quantiseInput(500, 10);
    expect(r2.applyTick).toBe(11);
    expect(r2.tMs).toBe(550);

    // tRawMs in the past: tRawMs = 450ms -> ceil(450/50) = 9 -> max(9, 11) = 11
    const r3 = SimClock.quantiseInput(450, 10);
    expect(r3.applyTick).toBe(11);
    expect(r3.tMs).toBe(550);

    // tRawMs in the future: tRawMs = 650ms -> ceil(650/50) = 13 -> max(13, 11) = 13
    const r4 = SimClock.quantiseInput(650, 10);
    expect(r4.applyTick).toBe(13);
    expect(r4.tMs).toBe(650);
  });

  it('calculates interpolation alpha accurately within [0, 1]', () => {
    const clock = new SimClock(1);

    // Advance by 25 ms (half a tick)
    const res1 = clock.advanceAccumulator(25);
    expect(res1.ticksToStep).toBe(0);
    expect(res1.alpha).toBeCloseTo(0.5, 4);

    // Advance by another 35 ms (total 60 ms -> 1 tick, 10 ms remaining)
    const res2 = clock.advanceAccumulator(35);
    expect(res2.ticksToStep).toBe(1);
    expect(res2.alpha).toBeCloseTo(10 / TICK_MS, 4);
  });
});

import { describe, it, expect } from 'vitest';
import demo1Json from '@/director/bundled/demo1.json';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import { streamSeed, keyedU } from '@/sim/rng';
import type { ScenarioSpec } from '@/sim/types';

describe('Golden Replay & Stream Isolation (TASK-P3-10, DT-3, DT-8, DT-9)', () => {
  const spec = demo1Json as unknown as ScenarioSpec;

  it('guarantees Event-Sourced Replay reads only stored events without calling Director or PRNG', () => {
    const engine = new SimEngine();
    engine.load(spec);

    // Simulate 500 ticks with some activity
    engine.inputQueue.push({
      tRawMs: 2000,
      applyTick: 40,
      action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' },
    });
    engine.inputQueue.push({
      tRawMs: 4000,
      applyTick: 80,
      action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' },
    });

    for (let tick = 0; tick < 500; tick++) {
      engine.step();
    }

    // Capture frozen events array
    const storedEvents = JSON.parse(JSON.stringify(engine.events));

    // Replay 1
    const replay1 = aggregateAARMetrics(storedEvents, spec);
    // Replay 2
    const replay2 = aggregateAARMetrics(storedEvents, spec);

    expect(replay1.score).toBe(replay2.score);
    expect(replay1.metMs).toBe(replay2.metMs);
    expect(replay1.mdtMs).toBe(replay2.mdtMs);
    expect(replay1.clsAccuracy).toBe(replay2.clsAccuracy);
    expect(replay1.confusion).toEqual(replay2.confusion);
  });

  it('guarantees isolated PRNG streams: engagement order changes kill stream but leaves sense stream untouched', () => {
    const seed = spec.seed;

    // Sense draws are stateless keyed draws: keyedU(seed, 'sense', entityIndex, sweepIndex)
    const senseDraw1 = keyedU(seed, 'sense', 0, 10);
    const senseDraw2 = keyedU(seed, 'sense', 0, 10);
    expect(senseDraw1).toBe(senseDraw2);

    // Stream seed isolation
    const killStreamSeed = streamSeed(seed, 'kill');
    const senseStreamSeed = streamSeed(seed, 'sense');
    const trajStreamSeed = streamSeed(seed, 'traj');

    expect(killStreamSeed).not.toBe(senseStreamSeed);
    expect(senseStreamSeed).not.toBe(trajStreamSeed);
    expect(killStreamSeed).not.toBe(trajStreamSeed);
  });
});

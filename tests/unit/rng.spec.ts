import { describe, it, expect } from 'vitest';
import { mulberry32, hash32, streamSeed, createStream, keyedU } from '../../src/sim/rng';

describe('Deterministic PRNG Core (mulberry32)', () => {
  it('produces identical sequences given the same seed', () => {
    const seed = 42;
    const rngA = mulberry32(seed);
    const rngB = mulberry32(seed);

    const seqA = Array.from({ length: 10 }, () => rngA());
    const seqB = Array.from({ length: 10 }, () => rngB());

    expect(seqA).toEqual(seqB);
    for (const val of seqA) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const rngA = mulberry32(100);
    const rngB = mulberry32(200);

    const valA = rngA();
    const valB = rngB();

    expect(valA).not.toEqual(valB);
  });

  it('computes deterministic string hash with hash32', () => {
    const str = 'DRISHTI-CUAS-SIH26247';
    const h1 = hash32(str);
    const h2 = hash32(str);

    expect(h1).toEqual(h2);
    expect(typeof h1).toBe('number');
    expect(h1).toBeGreaterThanOrEqual(0);
  });

  it('derives independent seeds per stream label and key', () => {
    const scenarioSeed = 1337;
    const trajSeed = streamSeed(scenarioSeed, 'traj', 1);
    const senseSeed = streamSeed(scenarioSeed, 'sense', 1);
    const killSeed = streamSeed(scenarioSeed, 'kill', 1);

    expect(trajSeed).not.toEqual(senseSeed);
    expect(senseSeed).not.toEqual(killSeed);
    expect(trajSeed).not.toEqual(killSeed);

    // Same parameters yield same seed
    expect(streamSeed(scenarioSeed, 'traj', 1)).toEqual(trajSeed);
  });

  it('executes stateless keyed draws with keyedU', () => {
    const scenarioSeed = 9999;
    const draw1 = keyedU(scenarioSeed, 'sense', 5, 12);
    const draw2 = keyedU(scenarioSeed, 'sense', 5, 12);
    const draw3 = keyedU(scenarioSeed, 'sense', 5, 13); // different sweep
    const draw4 = keyedU(scenarioSeed, 'sense', 6, 12); // different entity

    expect(draw1).toEqual(draw2);
    expect(draw1).not.toEqual(draw3);
    expect(draw1).not.toEqual(draw4);
  });

  it('isolates stream draws so advancing one stream leaves another untouched', () => {
    const seed = 54321;
    const killStream = createStream(seed, 'kill');
    const genStream = createStream(seed, 'gen');

    const genInitial = genStream();

    // Advance kill stream 100 times
    for (let i = 0; i < 100; i++) {
      killStream();
    }

    // Recreate gen stream and verify it matches original
    const genFresh = createStream(seed, 'gen');
    expect(genFresh()).toEqual(genInitial);
  });
});

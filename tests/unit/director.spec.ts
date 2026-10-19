import { describe, it, expect } from 'vitest';
import { generateScenario, normalizeFeatures } from '@/director/generator';
import { computeCosineSimilarity, isNovel } from '@/director/novelty';
import { updateEMA, computeWeaknessWeights } from '@/director/adaptive';
import { validate } from '@/director/validate';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Adaptive Red Team Director & Determinism (TASK-P4-01, P4-02, P4-03)', () => {
  it('generates a valid, deterministic scenario from traineeId, sessionIdx, and difficulty', () => {
    const spec1 = generateScenario('TRAINEE-ALPHA', 1, 0.4);
    const spec2 = generateScenario('TRAINEE-ALPHA', 1, 0.4);

    expect(spec1.seed).toBe(spec2.seed);
    expect(spec1.id).toBe(spec2.id);
    expect(spec1.threats.length).toBe(spec2.threats.length);
    expect(spec1.features).toEqual(spec2.features);
    expect(validate(spec1)).toBe(true);
  });

  it('guarantees different sessionIdx or traineeId produces different scenario seeds', () => {
    const specA = generateScenario('TRAINEE-ALPHA', 1, 0.4);
    const specB = generateScenario('TRAINEE-ALPHA', 2, 0.4);
    const specC = generateScenario('TRAINEE-BRAVO', 1, 0.4);

    expect(specA.seed).not.toBe(specB.seed);
    expect(specA.seed).not.toBe(specC.seed);
  });

  it('enforces cosine similarity novelty filter (AC-6, max cosine < 0.85)', () => {
    const v1 = normalizeFeatures([1, 0, 0, 0]);
    const v2 = normalizeFeatures([0, 1, 0, 0]);
    const vIdentical = normalizeFeatures([1, 0, 0, 0]);
    const vSimilar = normalizeFeatures([0.95, 0.1, 0, 0]);

    expect(computeCosineSimilarity(v1, v2)).toBe(0);
    expect(computeCosineSimilarity(v1, vIdentical)).toBeCloseTo(1.0, 4);

    expect(isNovel(v2, [v1])).toBe(true);
    expect(isNovel(vSimilar, [v1])).toBe(false); // Cosine >= 0.85 -> not novel
  });

  it('updates EMA metrics with alpha = 0.4 and seeds on first sample', () => {
    // First sample seeds directly
    const seeded = updateEMA(null, 80);
    expect(seeded).toBe(80);

    // Second sample: 0.4 * 60 + 0.6 * 80 = 24 + 48 = 72
    const updated = updateEMA(80, 60);
    expect(updated).toBeCloseTo(72, 4);
  });

  it('computes normalized softmax weakness weights with beta = 4.0', () => {
    const weights = computeWeaknessWeights({
      d: 40, // Weakest
      c: 90,
      econ: 85,
      r: 80,
      sal: 75,
      sat: 80,
    });

    // Lowest score (highest weakness) should have the largest weight
    expect(weights.d).toBeGreaterThan(weights.c);
    expect(weights.d).toBeGreaterThan(weights.econ);

    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it('strictly rejects instant transitions from UNDETECTED to FIX (PRD 3.4 & ARCHITECTURE.md 3.3)', () => {
    const engine = new SimEngine();
    const spec = JSON.parse(JSON.stringify(demo1Json)) as ScenarioSpec;
    engine.load(spec);

    // Find an entity in UNDETECTED or set one
    const entity = engine.curr[0];
    entity.step = 'UNDETECTED';

    // Attempt to designate directly while UNDETECTED
    engine.inputQueue.push({
      tRawMs: 100,
      applyTick: 2,
      action: { type: 'DESIGNATE', trackNo: entity.trackNo!, via: 'KEY' },
    });

    engine.step();
    engine.step();

    // Verify entity did NOT transition to FIX
    expect(entity.step).not.toBe('FIX');
    expect(entity.tDesig).toBeNull();
  });
});

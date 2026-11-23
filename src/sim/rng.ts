/**
 * Mulberry32 32-bit PRNG and deterministic keyed draw streams.
 * Complies strictly with Rules.md DT-2, DT-3.
 */

export function mulberry32(seed: number): () => number {
  let s = seed | 0; // NOSONAR typescript:S7767
  return function () {
    s = (s + 0x6d2b79f5) | 0; // NOSONAR typescript:S7767
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 32-bit FNV-1a hash for string inputs.
 */
export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.codePointAt(i) ?? 0;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Stream seed derivation to isolate PRNG sequences between subsystems.
 */
export function streamSeed(scenarioSeed: number, label: string, key: number | string = 0): number {
  return hash32(`${scenarioSeed}|${label}|${key}`);
}

/**
 * Stateless keyed uniform draw in [0, 1).
 * Used for sensor checks per (entityIndex, sweepIndex) so looking at other tracks
 * cannot shift PRNG cursors (Rules.md DT-3, R-7).
 */
export function keyedU(seed: number, label: string, a: number, b: number): number {
  const h = hash32(`${seed}|${label}|${a}|${b}`);
  const rng = mulberry32(h);
  return rng();
}

/**
 * Stateless keyed Gaussian draw ~ N(0, 1), clamped to [-3.5, 3.5] sigma.
 * Uses Box-Muller transform over two orthogonal keyed uniform draws.
 * Deterministic, repeatable, and independent of frame rate or entity ordering.
 */
export function keyedGaussian(seed: number, label: string, a: number, b: number): number {
  const u1 = Math.max(1e-7, keyedU(seed, `${label}:u1`, a, b));
  const u2 = keyedU(seed, `${label}:u2`, a, b);
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.max(-3.5, Math.min(3.5, z));
}

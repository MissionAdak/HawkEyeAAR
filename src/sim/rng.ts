/**
 * Mulberry32 32-bit PRNG and deterministic keyed draw streams.
 * Complies strictly with Rules.md DT-2, DT-3.
 */

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
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
    h ^= str.charCodeAt(i);
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

/**
 * DRISHTI-CUAS Seeded PRNG Streams (mulberry32)
 *
 * Rules: DT-2, DT-3
 * Math.random() is FATAL everywhere in simulation logic.
 * All pseudo-randomness comes from seeded mulberry32 streams.
 * Four independent streams: traj, sense, kill, gen.
 */

/**
 * 32-bit FNV-1a string hash function returning an unsigned 32-bit integer.
 */
export function hash32(str: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Mulberry32 PRNG generator.
 * Produces deterministic 32-bit floating point numbers in [0, 1).
 */
export function mulberry32(seed32: number): () => number {
  let s = seed32 >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives an isolated 32-bit stream seed from the scenario seed and stream label.
 */
export function streamSeed(scenarioSeed: number, label: string, key = 0): number {
  return hash32(`${scenarioSeed}|${label}|${key}`);
}

/**
 * Creates an isolated mulberry32 PRNG stream instance for a given label and key.
 */
export function createStream(scenarioSeed: number, label: string, key = 0): () => number {
  return mulberry32(streamSeed(scenarioSeed, label, key));
}

/**
 * Stateless keyed draw for sensing: u = keyedU(seed, 'sense', entityIndex, sweepIndex).
 * Guaranteed to be stateless so inspecting or targeting an entity does not affect any other draw.
 */
export function keyedU(scenarioSeed: number, label: string, a: number, b: number): number {
  const seed = hash32(`${scenarioSeed}|${label}|${a}|${b}`);
  const next = mulberry32(seed);
  return next();
}

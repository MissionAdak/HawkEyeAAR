import type { ScenarioSpec } from './types';
import { stableJson } from './serialization';

/**
 * Standard pure-TypeScript SHA-256 implementation (FIPS 180-4).
 * Completely synchronous, zero external network, zero dependencies.
 * Produces identical bit-for-bit results across Node.js, Chromium, and Web Workers.
 */
export function sha256Sync(input: string): string {
  // Convert UTF-8 string to binary byte string
  const binary = unescape(encodeURIComponent(input));

  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const asciiBitLength = binary.length * 8;
  const words: number[] = [];
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let ascii = binary + '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';

  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);

      w[i] =
        i < 16
          ? w[i]
          : ((w[i - 16] + s0 + w[i - 7] + s1) | 0);

      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ch +
        k[i] +
        w[i];

      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + maj;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Computes a deterministic canonical SHA-256 digest of an immutable ScenarioSpec.
 * Uses recursive lexicographical key sorting (stableJson) so object key ordering
 * cannot alter the digest. Returns a prefixed string `sha256:<64 hex chars>`.
 */
export function computeScenarioSnapshotHash(spec: ScenarioSpec): string {
  const canonical = stableJson(spec);
  return `sha256:${sha256Sync(canonical)}`;
}

/**
 * Validates a ScenarioSpec snapshot against an expected SHA-256 digest.
 * Tolerates case differences and optional `sha256:` prefix.
 */
export function verifyScenarioSnapshotHash(
  spec: ScenarioSpec,
  expectedHash: string
): boolean {
  if (!expectedHash || typeof expectedHash !== 'string') return false;
  const actualHash = computeScenarioSnapshotHash(spec);
  const normExpected = expectedHash.toLowerCase().trim();
  const normActual = actualHash.toLowerCase().trim();

  if (normActual === normExpected) return true;
  const bareActual = normActual.replace(/^sha256:/, '');
  const bareExpected = normExpected.replace(/^sha256:/, '');
  return bareActual === bareExpected;
}

/**
 * Validates the complete structural integrity of a ScenarioSpec object.
 * Ensures all mandatory scenario fields exist, have correct types, and finite numeric values.
 */
export function validateScenarioStructure(
  val: unknown
): val is ScenarioSpec {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const s = val as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id.trim() === '') return false;
  if (typeof s.simVersion !== 'string' || s.simVersion.trim() === '') return false;
  if (typeof s.schemaVersion !== 'number' || !Number.isFinite(s.schemaVersion)) return false;
  if (s.mode !== 'TRAIN' && s.mode !== 'EVAL' && s.mode !== 'DEMO') return false;
  if (typeof s.seed !== 'number' || !Number.isFinite(s.seed)) return false;
  if (typeof s.difficulty !== 'number' || !Number.isFinite(s.difficulty)) return false;
  if (typeof s.durationMs !== 'number' || !Number.isFinite(s.durationMs) || s.durationMs <= 0) return false;
  if (s.dayNight !== 'DAY' && s.dayNight !== 'NIGHT') return false;

  // Asset validation
  if (!s.asset || typeof s.asset !== 'object') return false;
  const asset = s.asset as Record<string, unknown>;
  if (typeof asset.rMinM !== 'number' || !Number.isFinite(asset.rMinM)) return false;

  // Threats array validation
  if (!Array.isArray(s.threats) || s.threats.length === 0) return false;
  for (const t of s.threats as unknown[]) {
    if (!t || typeof t !== 'object') return false;
    const threat = t as Record<string, unknown>;
    if (typeof threat.id !== 'string' || threat.id.trim() === '') return false;
    if (typeof threat.speedMps !== 'number' || !Number.isFinite(threat.speedMps)) return false;
    if (typeof threat.rcsM2 !== 'number' || !Number.isFinite(threat.rcsM2)) return false;
    if (typeof threat.spawnTMs !== 'number' || !Number.isFinite(threat.spawnTMs)) return false;
    if (typeof threat.trueClass !== 'string') return false;
    if (!Array.isArray(threat.waypoints) || threat.waypoints.length === 0) return false;
    for (const wp of threat.waypoints as unknown[]) {
      if (!wp || typeof wp !== 'object') return false;
      const point = wp as Record<string, unknown>;
      if (typeof point.x !== 'number' || !Number.isFinite(point.x)) return false;
      if (typeof point.y !== 'number' || !Number.isFinite(point.y)) return false;
    }
  }

  // Decoys, zones, chaos, triggers
  if (!Array.isArray(s.decoys)) return false;
  if (!Array.isArray(s.zones)) return false;
  if (!Array.isArray(s.chaos)) return false;
  if (!Array.isArray(s.triggers)) return false;

  return true;
}

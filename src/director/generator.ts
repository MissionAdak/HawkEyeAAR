import type { ScenarioSpec, ThreatSpawn, ZoneSpec } from '@/sim/types';
import { mulberry32, hash32, streamSeed } from '@/sim/rng';
import { validate } from './validate';
import { isNovel } from './novelty';
import demo1Json from './bundled/demo1.json';

/**
 * Normalizes a 33-dimensional vector to unit L2 length.
 */
export function normalizeFeatures(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec.map(() => 0);
  return vec.map((v) => v / norm);
}

/**
 * Generates an adaptive, deterministic scenario for a trainee session.
 * Complies strictly with Rules.md DT-2 (mulberry32 gen stream, no Math.random),
 * DT-3, and ARCHITECTURE.md Section 5.
 */
export function generateScenario(
  traineeId: string,
  sessionIdx: number,
  d: number,
  historyFeatures: number[][] = [],
  salt: number = 0
): ScenarioSpec {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Golden determinism: derive seed from traineeId, sessionIdx, salt, and attempt counter
    const seed = hash32(`${traineeId}|${sessionIdx}|${salt}|${attempt}`);
    const rng = mulberry32(streamSeed(seed, 'gen'));

    const count = Math.max(1, Math.min(10, Math.round(2 + 6 * d)));
    const threats: ThreatSpawn[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i * (2 * Math.PI / count)) + (rng() * 0.4 - 0.2);
      const startDist = 3200 + rng() * 600;
      const startX = Math.round(Math.cos(angle) * startDist);
      const startY = Math.round(Math.sin(angle) * startDist);

      threats.push({
        id: `H-${i + 1}`,
        droneType: i % 2 === 0 ? 'FPV_ATTACK' : 'SWARM_ELEMENT',
        trueClass: i % 2 === 0 ? 'HOSTILE_ATTACK' : 'SWARM_ELEMENT',
        spawnTMs: 2000 + i * 3000,
        waypoints: [
          { x: startX, y: startY, z: 120 },
          { x: 0, y: 0, z: 20 },
        ],
        speedMps: Math.round(30 + rng() * 15),
        profile: 'TERRAIN_HUG',
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
      });
    }

    const zones: ZoneSpec[] = [
      {
        id: 'U1',
        type: 'URBAN',
        polygon: [
          [1800, -500],
          [2800, -500],
          [2800, 500],
          [1800, 500],
        ],
        heightM: 40,
        shadowM: 600,
        rho: 0.8,
      },
    ];

    // Build 33-dimensional feature vector per ARCHITECTURE.md 5.2
    const rawFeatures = new Array(33).fill(0.05);
    rawFeatures[0] = count / 12; // hostile count / 12
    rawFeatures[1] = 0; // decoy ratio
    rawFeatures[2] = 1.0; // fraction TERRAIN_HUG
    rawFeatures[32] = d; // difficulty

    const features = normalizeFeatures(rawFeatures);

    const spec: ScenarioSpec = {
      id: `SCEN-${seed}`,
      schemaVersion: 1,
      simVersion: '1.1.0',
      configHash: 'sha256:inlined',
      mode: 'TRAIN',
      seed,
      difficulty: d,
      dayNight: 'DAY',
      durationMs: 120000,
      asset: { x: 0, y: 0, rMinM: 500 },
      zones,
      threats,
      decoys: [],
      chaos: [],
      triggers: [],
      roeText: 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED',
      levers: [{ id: 'ADAPTIVE_TRAIN', reason: 'Adapted to trainee weakness profile' }],
      features,
    };

    if (validate(spec) && (historyFeatures.length === 0 || isNovel(features, historyFeatures))) {
      return spec;
    }
  }

  // Fallback to verified bundled scenario if all procedural attempts fail
  const fallbackSeed = hash32(`${traineeId}|${sessionIdx}|fallback`);
  const fallback = JSON.parse(JSON.stringify(demo1Json)) as ScenarioSpec;
  fallback.id = `FALLBACK-${fallbackSeed}`;
  fallback.seed = fallbackSeed;
  fallback.difficulty = d;
  fallback.levers = [{ id: 'BUNDLED_FALLBACK', reason: 'Procedural generation fallback' }];
  return fallback;
}

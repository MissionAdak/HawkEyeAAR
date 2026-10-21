import type { ScenarioSpec, ThreatSpawn, ZoneSpec } from '@/sim/types';
import { mulberry32, hash32, streamSeed } from '@/sim/rng';
import { validateDetailed } from './validate';
import { normalizeFeatures } from './generator';

export interface PopUpDiveScenarioOptions {
  seed?: number;
  difficulty?: number;
  speedMps?: number;
}

/**
 * Generates a valid, deterministic ScenarioSpec featuring the notional POP_UP_DIVE profile.
 * Every generated scenario passes through the fairness validator before being returned.
 */
export function generatePopUpDiveScenario(
  options: PopUpDiveScenarioOptions = {}
): ScenarioSpec {
  const seed =
    typeof options.seed === 'number' && Number.isFinite(options.seed)
      ? Math.floor(options.seed)
      : 7777;

  const d = options.difficulty ?? 0.3;
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = hash32(`${seed}|popup_dive|${attempt}`);
    const rng = mulberry32(streamSeed(attemptSeed, 'popup_gen'));

    // Approach angle and start distance
    const angle = rng() * 2 * Math.PI;
    const startDist = 3200 + Math.round(rng() * 400); // 3200 - 3600m
    const startX = Math.round(Math.cos(angle) * startDist);
    const startY = Math.round(Math.sin(angle) * startDist);

    const speedMps = options.speedMps ?? Math.round(28 + rng() * 6); // 28 - 34 m/s
    const spawnTMs = 1000 + Math.round(rng() * 2000);

    const threats: ThreatSpawn[] = [
      {
        id: 'H-POPUP-1',
        droneType: 'FPV_ATTACK',
        trueClass: 'HOSTILE_ATTACK',
        spawnTMs,
        waypoints: [
          { x: startX, y: startY, z: 20 },
          { x: 0, y: 0, z: 20 },
        ],
        speedMps,
        profile: 'POP_UP_DIVE',
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
      },
    ];

    // Optional second hostile at higher difficulty
    if (d >= 0.5) {
      const angle2 = angle + Math.PI * 0.75;
      const startDist2 = 3400;
      threats.push({
        id: 'H-POPUP-2',
        droneType: 'RECON_QUAD',
        trueClass: 'HOSTILE_ISR',
        spawnTMs: spawnTMs + 5000,
        waypoints: [
          { x: Math.round(Math.cos(angle2) * startDist2), y: Math.round(Math.sin(angle2) * startDist2), z: 20 },
          { x: 0, y: 0, z: 20 },
        ],
        speedMps: 25,
        profile: 'POP_UP_DIVE',
        rcsM2: 0.01,
        valueInr: 40000,
        emitsRf: true,
        remoteId: false,
        iff: false,
      });
    }

    // Urban masking zone placed along the corridor to demonstrate pop-up emergence
    // Zone placed between range 1800m and 2600m
    const zoneDist = 2200;
    const zoneX = Math.round(Math.cos(angle) * zoneDist);
    const zoneY = Math.round(Math.sin(angle) * zoneDist);

    const zones: ZoneSpec[] = [
      {
        id: 'U-POPUP-1',
        type: 'URBAN',
        polygon: [
          [zoneX - 250, zoneY - 250],
          [zoneX + 250, zoneY - 250],
          [zoneX + 250, zoneY + 250],
          [zoneX - 250, zoneY + 250],
        ],
        heightM: 40,
        shadowM: 600,
        rho: 0.8,
      },
    ];

    // Build 33-dimensional normalized feature vector
    const rawFeatures = new Array(33).fill(0.05);
    rawFeatures[0] = threats.length / 12;
    rawFeatures[1] = 0; // decoy ratio
    rawFeatures[2] = 0.0; // fraction terrain hug
    rawFeatures[8] = 1.0; // fraction POP_UP_DIVE profile
    rawFeatures[32] = d;

    const features = normalizeFeatures(rawFeatures);

    const spec: ScenarioSpec = {
      id: `POPUP-${seed}`,
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
      roeText: 'WEAPONS TIGHT URBAN | ENGAGE ELEVATED TARGETS ON CORRIDOR CLEARANCE',
      levers: [{ id: 'POP_UP_DIVE_PROFILE', reason: 'Notional climb-then-dive trajectory drill' }],
      features,
    };

    const validation = validateDetailed(spec);
    if (validation.valid) {
      return spec;
    }
  }

  throw new Error(`Failed to generate valid POP_UP_DIVE scenario after ${maxAttempts} attempts.`);
}

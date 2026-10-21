import type {
  ScenarioSpec,
  ThreatSpawn,
  ZoneSpec,
  TrueClass,
  DroneType,
  Profile,
} from '@/sim/types';
import { mulberry32, hash32, streamSeed } from '@/sim/rng';
import { validateDetailed } from './validate';
import { normalizeFeatures } from './generator';

export const RANDOM_SCENARIO_GENERATOR_VERSION = '1.0.0';

function generateRandomZones(rng: () => number): ZoneSpec[] {
  const quad = Math.floor(rng() * 4);
  const signX = quad === 0 || quad === 3 ? 1 : -1;
  const signY = quad === 0 || quad === 1 ? 1 : -1;

  const zoneOriginX = signX * (1600 + Math.round(rng() * 400));
  const zoneOriginY = signY * (1600 + Math.round(rng() * 400));
  const zoneW = 600 + Math.round(rng() * 300);
  const zoneH = 600 + Math.round(rng() * 300);

  const minX = Math.min(zoneOriginX, zoneOriginX + signX * zoneW);
  const maxX = Math.max(zoneOriginX, zoneOriginX + signX * zoneW);
  const minY = Math.min(zoneOriginY, zoneOriginY + signY * zoneH);
  const maxY = Math.max(zoneOriginY, zoneOriginY + signY * zoneH);

  return [
    {
      id: 'Z-URBAN-1',
      type: 'URBAN',
      polygon: [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      heightM: 35 + Math.round(rng() * 15),
      shadowM: 500 + Math.round(rng() * 150),
      rho: 0.8,
    },
  ];
}

function generateRandomHostiles(rng: () => number): ThreatSpawn[] {
  const numHostiles = 2 + Math.floor(rng() * 3);
  const threats: ThreatSpawn[] = [];
  const baseAngle = rng() * 2 * Math.PI;

  let currentSpawnTMs = 1500 + Math.round(rng() * 2500);

  for (let i = 0; i < numHostiles; i++) {
    // Vary ground truth class among supported hostile types
    const hostileRoll = rng();
    let droneType: DroneType;
    let trueClass: TrueClass;
    let profile: Profile;
    let speedMps: number;
    let rcsM2: number;
    const emitsRf = true;
    let valueInr: number | null;

    if (hostileRoll < 0.35) {
      droneType = 'FPV_ATTACK';
      trueClass = 'HOSTILE_ATTACK';
      const pRoll = rng();
      if (pRoll < 0.33) {
        profile = 'POP_UP_DIVE';
      } else if (pRoll < 0.66) {
        profile = 'TERRAIN_HUG';
      } else {
        profile = 'DIRECT';
      }
      speedMps = 32 + Math.round(rng() * 6);
      rcsM2 = 0.01;
      valueInr = 100000;
    } else if (hostileRoll < 0.7) {
      droneType = 'RECON_QUAD';
      trueClass = 'HOSTILE_ISR';
      profile = 'DIRECT';
      speedMps = 20 + Math.round(rng() * 5); // 20 - 25 m/s
      rcsM2 = 0.015;
      valueInr = 40000;
    } else {
      droneType = 'SWARM_ELEMENT';
      trueClass = 'SWARM_ELEMENT';
      profile = rng() < 0.5 ? 'SWARM_SATURATE' : 'DIRECT';
      speedMps = 24 + Math.round(rng() * 6); // 24 - 30 m/s
      rcsM2 = 0.008;
      valueInr = 25000;
    }

    // Approach angle staggered around perimeter
    const angle =
      baseAngle +
      (i * (2 * Math.PI)) / numHostiles +
      (rng() * 0.4 - 0.2);

    // Coordinate distance and speed so tPnr is safely within session
    const maxTravelTimeSec = Math.max(30, Math.floor((117000 - currentSpawnTMs) / 1000));
    const targetTravelTimeSec = Math.min(
      maxTravelTimeSec,
      65 + Math.round(rng() * 25)
    );
    const startDist = Math.max(
      3100,
      Math.min(3800, Math.round(500 + targetTravelTimeSec * speedMps))
    );

    // Re-verify speed so target reaches PNR before 118s
    const actualTravelSec = (startDist - 500) / speedMps;
    if (currentSpawnTMs + actualTravelSec * 1000 > 118000) {
      speedMps = Math.ceil((startDist - 500) / ((118000 - currentSpawnTMs) / 1000));
    }

    const startX = Math.round(Math.cos(angle) * startDist);
    const startY = Math.round(Math.sin(angle) * startDist);
    const zStart = 80 + Math.round(rng() * 60);

    threats.push({
      id: `H-RND-${i + 1}`,
      droneType,
      trueClass,
      spawnTMs: currentSpawnTMs,
      waypoints: [
        { x: startX, y: startY, z: zStart },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps,
      profile,
      rcsM2,
      valueInr,
      emitsRf,
      remoteId: false,
      iff: false,
    });

    // Stagger next hostile spawn by 12s to 24s
    currentSpawnTMs += 12000 + Math.round(rng() * 12000);
  }

  return threats;
}

function generateRandomDecoys(rng: () => number): ThreatSpawn[] {
  const numDecoys = 2 + Math.floor(rng() * 3);
  const decoys: ThreatSpawn[] = [];

  for (let j = 0; j < numDecoys; j++) {
    const decoyRoll = rng();
    const decoyAngle = rng() * 2 * Math.PI;
    const decoyDist = 1200 + Math.round(rng() * 1200);
    const spawnTMs = 2000 + Math.round(rng() * 25000);

    if (decoyRoll < 0.38) {
      // Civil UAS: loitering civilian quadcopter
      const dX = Math.round(Math.cos(decoyAngle) * decoyDist);
      const dY = Math.round(Math.sin(decoyAngle) * decoyDist);
      decoys.push({
        id: `D-CIV-${j + 1}`,
        droneType: 'CIVIL_UAS',
        trueClass: 'CIVIL_UAS',
        spawnTMs,
        waypoints: [
          { x: dX, y: dY, z: 45 + Math.round(rng() * 25) },
        ],
        speedMps: 8 + Math.round(rng() * 5),
        profile: 'LOITER',
        rcsM2: 0.02,
        valueInr: null,
        emitsRf: true,
        remoteId: true,
        iff: false,
      });
    } else if (decoyRoll < 0.72) {
      // Bird: erratic low-RCS biological clutter
      const bX = Math.round(Math.cos(decoyAngle) * decoyDist);
      const bY = Math.round(Math.sin(decoyAngle) * decoyDist);
      decoys.push({
        id: `D-BRD-${j + 1}`,
        droneType: 'BIRD',
        trueClass: 'BIRD',
        spawnTMs,
        waypoints: [
          { x: bX, y: bY, z: 25 + Math.round(rng() * 20) },
        ],
        speedMps: 5 + Math.round(rng() * 4),
        profile: 'ERRATIC',
        rcsM2: 0.003,
        valueInr: null,
        emitsRf: false,
        remoteId: false,
        iff: false,
      });
    } else {
      // Friendly: high-altitude transit with active IFF and RemoteID
      const fAngle = rng() * 2 * Math.PI;
      const fDist = 2400;
      const fStartX = Math.round(Math.cos(fAngle) * fDist);
      const fStartY = Math.round(Math.sin(fAngle) * fDist);
      const fEndX = -fStartX;
      const fEndY = -fStartY;

      decoys.push({
        id: `D-FRN-${j + 1}`,
        droneType: 'FRIENDLY_UAS',
        trueClass: 'FRIENDLY',
        spawnTMs,
        waypoints: [
          { x: fStartX, y: fStartY, z: 140 },
          { x: fEndX, y: fEndY, z: 140 },
        ],
        speedMps: 24 + Math.round(rng() * 6),
        profile: 'DIRECT',
        rcsM2: 0.05,
        valueInr: null,
        emitsRf: true,
        remoteId: true,
        iff: true,
      });
    }
  }

  return decoys;
}

/**
 * Generates a fully randomized, unpredictable, valid ScenarioSpec.
 * Every unique seed deterministically produces a distinct tactical encounter.
 * Within simulation rules, class composition, counts, arrival times,
 * and spawn vectors vary meaningfully.
 */
export function generateRandomScenario(
  seedInput?: number,
  difficulty = 0.3
): ScenarioSpec {
  const seed =
    typeof seedInput === 'number' && Number.isFinite(seedInput)
      ? Math.floor(seedInput)
      : 1337;

  const maxAttempts = 30;
  let lastReasons: string[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = hash32(`${seed}|RANDOM-1|v1|${attempt}`);
    const rng = mulberry32(streamSeed(attemptSeed, 'random_scenario'));

    // 1. Asset definition
    const asset = { x: 0 as const, y: 0 as const, rMinM: 500 };

    // 2. Dynamic terrain masking zone placed in a random quadrant
    const zones = generateRandomZones(rng);

    // 3. Meaningfully randomized hostiles (2 to 4 threats)
    const threats = generateRandomHostiles(rng);

    // 4. Meaningfully randomized clutter and decoys (2 to 4 entities)
    const decoys = generateRandomDecoys(rng);

    // 5. Build 33-dimensional feature vector
    const rawFeatures = new Array(33).fill(0.05);
    rawFeatures[0] = threats.length / 12;
    rawFeatures[1] = decoys.length / (threats.length + decoys.length);
    rawFeatures[32] = difficulty;
    const features = normalizeFeatures(rawFeatures);

    const spec: ScenarioSpec = {
      id: 'RANDOM-1',
      schemaVersion: 1,
      simVersion: '1.1.0',
      configHash: 'inlined',
      mode: 'TRAIN',
      seed,
      difficulty,
      dayNight: 'DAY',
      durationMs: 120000,
      asset,
      zones,
      threats,
      decoys,
      chaos: [],
      triggers: [],
      roeText:
        'DYNAMIC COMBAT ASSESSMENT | DISCRIMINATE ALL 6 CLASSES | PROPORTIONAL RESPONSE REQUIRED',
      levers: [
        {
          id: 'RANDOM_ENCOUNTER',
          reason: 'Unpredictable multi-class combat evaluation',
        },
      ],
      features,
    };

    const validation = validateDetailed(spec);
    if (validation.valid) {
      return spec;
    }
    lastReasons = validation.reasons;
  }

  throw new Error(
    `[RandomGenerator] Failed to generate valid RANDOM-1 scenario for seed ${seed} after ${maxAttempts} attempts: ${lastReasons.join('; ')}`
  );
}

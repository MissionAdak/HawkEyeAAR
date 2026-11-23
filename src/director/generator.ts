import type {
  ScenarioSpec,
  ThreatSpawn,
  ZoneSpec,
  FormationKind,
  FormationGroupSpec,
  WeaknessVector,
  ChaosSpec,
} from '@/sim/types';
import { mulberry32, hash32, streamSeed } from '@/sim/rng';
import { validate } from './validate';
import { isNovel } from './novelty';
import { expandFormation, resolveFormationSpacing } from './formations';
import { WEAKNESS_LEVER_MAP, getWeakestDimension } from './adaptive';
import demo1Json from './bundled/demo1.json';

export interface GenerateScenarioOptions {
  useFormations?: boolean;
  formationKind?: FormationKind;
  spacingM?: number;
  weaknessVector?: WeaknessVector;
  targetLever?: string;
}

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

function generateAttemptThreats(count: number, rng: () => number): ThreatSpawn[] {
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
  return threats;
}

function buildScenarioFormations(
  seed: number,
  threats: ThreatSpawn[],
  options?: GenerateScenarioOptions
): { finalThreats: ThreatSpawn[]; formations?: FormationGroupSpec[] } {
  if (!options?.useFormations || threats.length < 2) {
    return { finalThreats: threats };
  }

  const kind: FormationKind = options.formationKind ?? 'V_WEDGE';
  const formCount = Math.min(threats.length, 4);
  const baseThreat = threats[0];
  const spacingM = resolveFormationSpacing(kind, options.spacingM);
  const expanded = expandFormation({
    groupId: `GRP-${seed}`,
    kind,
    count: formCount,
    spacingM,
    baseSpawn: baseThreat,
  });

  return {
    finalThreats: expanded,
    formations: [
      {
        groupId: `GRP-${seed}`,
        kind,
        leaderId: baseThreat.id,
        memberIds: expanded.map((t) => t.id),
        spacingM,
      },
    ],
  };
}

function buildScenarioFeatures(
  finalThreats: ThreatSpawn[],
  formations: FormationGroupSpec[] | undefined,
  d: number
): number[] {
  const rawFeatures = new Array(33).fill(0.05);
  rawFeatures[0] = finalThreats.length / 12; // hostile count / 12
  rawFeatures[1] = 0; // decoy ratio
  rawFeatures[2] = 1.0; // fraction TERRAIN_HUG
  if (formations && formations.length > 0) {
    const k = formations[0].kind;
    rawFeatures[3] = k === 'LINE_ABREAST' ? 1 : 0;
    rawFeatures[4] = k === 'V_WEDGE' ? 1 : 0;
    rawFeatures[5] = k === 'STACK' ? 1 : 0;
    rawFeatures[6] = k === 'DECOY_LEAD' ? 1 : 0;
    rawFeatures[7] = k === 'HELIX' ? 1 : 0;
  }
  rawFeatures[32] = d; // difficulty
  return normalizeFeatures(rawFeatures);
}

/**
 * Generates an adaptive, deterministic scenario for a trainee session.
 * Complies strictly with Rules.md DT-2 (mulberry32 gen stream, no Math.random),
 * DT-3, and ARCHITECTURE.md Section 5.
 */
function applyWeaknessLever(
  activeLeverId: string | null,
  seed: number,
  finalThreats: ThreatSpawn[]
): { leverId: string; leverReason: string; decoys: ThreatSpawn[]; chaos: ChaosSpec[] } {
  let leverId = 'ADAPTIVE_TRAIN';
  let leverReason = 'Adapted to trainee weakness profile';
  let decoys: ThreatSpawn[] = [];
  const chaos: ChaosSpec[] = [];

  if (activeLeverId === 'SWARM_SATURATION') {
    leverId = 'SWARM_SATURATION';
    leverReason = WEAKNESS_LEVER_MAP.sat.reason;
    for (const t of finalThreats) {
      t.droneType = 'SWARM_ELEMENT';
      t.trueClass = 'SWARM_ELEMENT';
      t.profile = 'SWARM_SATURATE';
      t.valueInr = 50000;
    }
  } else if (activeLeverId === 'PROPORTIONALITY_DRILL') {
    leverId = 'PROPORTIONALITY_DRILL';
    leverReason = WEAKNESS_LEVER_MAP.econ.reason;
    for (const t of finalThreats) {
      t.droneType = 'RECON_QUAD';
      t.trueClass = 'HOSTILE_ISR';
      t.valueInr = 40000;
      t.speedMps = Math.max(30, Math.min(36, t.speedMps));
    }
  } else if (activeLeverId === 'DECOY_FLOOD') {
    leverId = 'DECOY_FLOOD';
    leverReason = WEAKNESS_LEVER_MAP.c.reason;
    decoys = [
      {
        id: `C-CIV-${seed}`,
        droneType: 'CIVIL_UAS',
        trueClass: 'CIVIL_UAS',
        spawnTMs: 5000,
        waypoints: [{ x: 1200, y: 1200, z: 60 }],
        speedMps: 10,
        profile: 'LOITER',
        rcsM2: 0.02,
        valueInr: null,
        emitsRf: true,
        remoteId: true,
        iff: false,
      },
      {
        id: `B-BRD-${seed}`,
        droneType: 'BIRD',
        trueClass: 'BIRD',
        spawnTMs: 10000,
        waypoints: [{ x: -600, y: 1000, z: 40 }],
        speedMps: 6,
        profile: 'ERRATIC',
        rcsM2: 0.003,
        valueInr: null,
        emitsRf: false,
        remoteId: false,
        iff: false,
      },
    ];
  } else if (activeLeverId === 'SENSOR_CHAOS_CHALLENGE') {
    leverId = 'SENSOR_CHAOS_CHALLENGE';
    leverReason = WEAKNESS_LEVER_MAP.sal.reason;
    chaos.push({
      type: 'RADAR_DROPOUT',
      tStartMs: 15000,
      tEndMs: 30000,
      severity: 1.0,
    });
  } else if (activeLeverId === 'LOW_RCS_MASKED') {
    leverId = 'LOW_RCS_MASKED';
    leverReason = WEAKNESS_LEVER_MAP.d.reason;
    for (const t of finalThreats) {
      t.rcsM2 = 0.005;
      t.profile = 'TERRAIN_HUG';
    }
  } else if (activeLeverId === 'URBAN_COLLATERAL_RISK') {
    leverId = 'URBAN_COLLATERAL_RISK';
    leverReason = WEAKNESS_LEVER_MAP.r.reason;
  }

  return { leverId, leverReason, decoys, chaos };
}

function buildAttemptCandidate(
  traineeId: string,
  sessionIdx: number,
  salt: number,
  attempt: number,
  d: number,
  options?: GenerateScenarioOptions
): ScenarioSpec {
  const seed = hash32(`${traineeId}|${sessionIdx}|${salt}|${attempt}`);
  const rng = mulberry32(streamSeed(seed, 'gen'));

  const count = Math.max(1, Math.min(10, Math.round(2 + 6 * d)));
  const threats = generateAttemptThreats(count, rng);
  const { finalThreats, formations } = buildScenarioFormations(seed, threats, options);

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

  const features = buildScenarioFeatures(finalThreats, formations, d);

  const activeLeverId =
    options?.targetLever ??
    (options?.weaknessVector
      ? getWeakestDimension(options.weaknessVector).lever.leverId
      : null);

  const { leverId, leverReason, decoys, chaos } = applyWeaknessLever(activeLeverId, seed, finalThreats);

  return {
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
    threats: finalThreats,
    decoys,
    chaos,
    triggers: [],
    formations,
    roeText: 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED',
    levers: [
      {
        id: formations ? 'PROCEDURAL_FORMATION' : leverId,
        reason: formations ? `Procedural formation ${formations[0].kind}` : leverReason,
      },
    ],
    features,
  };
}

export function generateScenario(
  traineeId: string,
  sessionIdx: number,
  d: number,
  historyFeatures: number[][] = [],
  salt: number = 0,
  options?: GenerateScenarioOptions
): ScenarioSpec {
  const maxAttempts = 20;
  let lastValidCandidate: ScenarioSpec | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const spec = buildAttemptCandidate(traineeId, sessionIdx, salt, attempt, d, options);

    if (validate(spec)) {
      lastValidCandidate = spec;
      if (historyFeatures.length === 0 || isNovel(spec.features ?? [], historyFeatures)) {
        return spec;
      }
    }
  }

  // Fallback to last valid candidate if novelty could not be satisfied
  if (lastValidCandidate) {
    if (validate(lastValidCandidate)) {
      return lastValidCandidate;
    }
  }

  // Fallback to verified bundled scenario if all procedural attempts fail validation (Fix 7)
  const fallbackSeed = hash32(`${traineeId}|${sessionIdx}|fallback`);
  const fallback = structuredClone(demo1Json) as unknown as ScenarioSpec;
  fallback.id = `FALLBACK-${fallbackSeed}`;
  fallback.seed = fallbackSeed;
  fallback.difficulty = d;
  fallback.levers = [{ id: 'BUNDLED_FALLBACK', reason: 'Procedural generation fallback' }];

  // Authoritative validation of mutated fallback before returning
  if (!validate(fallback)) {
    throw new Error(
      `[Generator] Procedural fallback scenario "${fallback.id}" failed authoritative fairness validation.`
    );
  }

  return fallback;
}

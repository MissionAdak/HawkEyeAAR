import type {
  ScenarioSpec,
  ThreatSpawn,
  ZoneSpec,
  TrueClass,
  DroneType,
  Profile,
  FormationKind,
  FormationMemberSpec,
  FormationGroupSpec,
} from '@/sim/types';
import { mulberry32, hash32, streamSeed } from '@/sim/rng';
import { validateDetailed } from './validate';
import { normalizeFeatures } from './generator';
import { isNovel } from './novelty';

export type { FormationKind, FormationMemberSpec, FormationGroupSpec };

export interface FormationDefinition {
  groupId: string;
  kind: FormationKind;
  count: number;
  spacingM?: number;
  baseSpawn: ThreatSpawn;
  followerDroneType?: DroneType;
  followerTrueClass?: TrueClass;
  followerProfile?: Profile;
}

export interface FormationOffset {
  dx: number;
  dy: number;
  dz?: number;
  rcsM2?: number;
  emitsRf?: boolean;
}

function computeLineAbreastOffsets(n: number, spacingM: number, perpX: number, perpY: number): FormationOffset[] {
  const offsets: FormationOffset[] = [];
  for (let k = 0; k < n; k++) {
    const lateralDist = (k - (n - 1) / 2) * spacingM;
    offsets.push({
      dx: Math.round(lateralDist * perpX) || 0,
      dy: Math.round(lateralDist * perpY) || 0,
      dz: undefined,
    });
  }
  return offsets;
}

function computeVWedgeOffsets(
  n: number,
  spacingM: number,
  ux: number,
  uy: number,
  perpX: number,
  perpY: number
): FormationOffset[] {
  const alphaRad = (35 * Math.PI) / 180;
  const cosA = Math.cos(alphaRad);
  const sinA = Math.sin(alphaRad);
  const offsets: FormationOffset[] = [];

  for (let k = 0; k < n; k++) {
    if (k === 0) {
      offsets.push({ dx: 0, dy: 0, dz: undefined });
    } else {
      const wingStep = Math.floor((k + 1) / 2);
      const side = k % 2 === 1 ? -1 : 1;
      const backDist = -wingStep * spacingM * cosA;
      const lateralDist = side * wingStep * spacingM * sinA;
      offsets.push({
        dx: Math.round(backDist * ux + lateralDist * perpX) || 0,
        dy: Math.round(backDist * uy + lateralDist * perpY) || 0,
        dz: undefined,
      });
    }
  }
  return offsets;
}

function computeStackOffsets(n: number, spacingM: number, ux: number, uy: number): FormationOffset[] {
  const offsets: FormationOffset[] = [];
  for (let k = 0; k < n; k++) {
    const backDist = -k * spacingM;
    const layerZ = 40 + 50 * k;
    offsets.push({
      dx: Math.round(backDist * ux) || 0,
      dy: Math.round(backDist * uy) || 0,
      dz: layerZ,
    });
  }
  return offsets;
}

function computeDecoyLeadOffsets(
  n: number,
  spacingM: number,
  ux: number,
  uy: number,
  perpX: number,
  perpY: number
): FormationOffset[] {
  const offsets: FormationOffset[] = [];
  for (let k = 0; k < n; k++) {
    if (k === 0) {
      offsets.push({
        dx: 0,
        dy: 0,
        dz: undefined,
        rcsM2: 0.05,
        emitsRf: true,
      });
    } else {
      const backDist = -spacingM;
      const lateralDist = n > 2 ? (k - (n / 2)) * 40 : 0;
      offsets.push({
        dx: Math.round(backDist * ux + lateralDist * perpX) || 0,
        dy: Math.round(backDist * uy + lateralDist * perpY) || 0,
        dz: undefined,
        rcsM2: 0.01,
        emitsRf: false,
      });
    }
  }
  return offsets;
}

function computeHelixOffsets(n: number, perpX: number, perpY: number): FormationOffset[] {
  const radius = 80;
  const offsets: FormationOffset[] = [];
  for (let k = 0; k < n; k++) {
    const phase = (2 * Math.PI * k) / n;
    const lateralDist = radius * Math.cos(phase);
    const vertDist = Math.round(radius * Math.sin(phase)) || 0;
    offsets.push({
      dx: Math.round(lateralDist * perpX) || 0,
      dy: Math.round(lateralDist * perpY) || 0,
      dz: vertDist,
    });
  }
  return offsets;
}

/**
 * Computes deterministic geometric offsets for formation members relative to the group leader.
 * Heading vector (ux, uy) points along the flight path; (perpX, perpY) points to the lateral right.
 */
export function computeFormationOffsets(
  kind: FormationKind,
  count: number,
  spacingM: number,
  ux: number,
  uy: number
): FormationOffset[] {
  const n = Math.max(1, count);
  const perpX = -uy;
  const perpY = ux;

  switch (kind) {
    case 'LINE_ABREAST':
      return computeLineAbreastOffsets(n, spacingM, perpX, perpY);
    case 'V_WEDGE':
      return computeVWedgeOffsets(n, spacingM, ux, uy, perpX, perpY);
    case 'STACK':
      return computeStackOffsets(n, spacingM, ux, uy);
    case 'DECOY_LEAD':
      return computeDecoyLeadOffsets(n, spacingM, ux, uy, perpX, perpY);
    case 'HELIX':
      return computeHelixOffsets(n, perpX, perpY);
  }
}

/**
 * Expands a FormationDefinition into concrete independent ThreatSpawn entities.
 * The core simulation treats each entity as an independent spawn; formation parameters
 * are explicit, seed-deterministic metadata preserved for replay and post-mission AAR.
 */
export function expandFormation(definition: FormationDefinition): ThreatSpawn[] {
  const { groupId, kind, count, baseSpawn } = definition;
  const n = Math.max(1, count);
  let defaultSpacing = 100;
  if (kind === 'STACK') {
    defaultSpacing = 60;
  } else if (kind === 'DECOY_LEAD') {
    defaultSpacing = 150;
  }
  const spacingM = definition.spacingM ?? defaultSpacing;

  const w0 = baseSpawn.waypoints[0] ?? { x: 0, y: 0, z: 80 };
  const w1 = baseSpawn.waypoints[1] ?? { x: 0, y: 0, z: 20 };
  const dx = w1.x - w0.x;
  const dy = w1.y - w0.y;
  const dist = Math.hypot(dx, dy);

  const ux = dist > 0 ? dx / dist : 1;
  const uy = dist > 0 ? dy / dist : 0;

  const offsets = computeFormationOffsets(kind, n, spacingM, ux, uy);
  const expanded: ThreatSpawn[] = [];

  for (let k = 0; k < n; k++) {
    const offset = offsets[k] ?? { dx: 0, dy: 0 };
    const memberId = k === 0 ? baseSpawn.id : `${baseSpawn.id}-F${k}`;

    const memberWaypoints = baseSpawn.waypoints.map((wp) => {
      let zVal = wp.z ?? 80;
      if (kind === 'STACK' && offset.dz !== undefined) {
        zVal = offset.dz;
      } else if (kind === 'HELIX' && offset.dz !== undefined) {
        zVal = Math.max(20, (wp.z ?? 80) + offset.dz);
      }

      return {
        x: wp.x + offset.dx,
        y: wp.y + offset.dy,
        z: zVal,
      };
    });

    const isLeader = k === 0;
    const droneType: DroneType = isLeader
      ? baseSpawn.droneType
      : (definition.followerDroneType ?? baseSpawn.droneType);
    const trueClass: TrueClass = isLeader
      ? baseSpawn.trueClass
      : (definition.followerTrueClass ?? baseSpawn.trueClass);
    const profile: Profile = isLeader
      ? baseSpawn.profile
      : (definition.followerProfile ?? baseSpawn.profile);

    const rcsM2 = offset.rcsM2 ?? baseSpawn.rcsM2;
    const emitsRf = offset.emitsRf ?? baseSpawn.emitsRf;

    const formationSpec: FormationMemberSpec = {
      groupId,
      kind,
      index: k,
      count: n,
      leaderId: baseSpawn.id,
      spacingM,
    };

    expanded.push({
      ...baseSpawn,
      id: memberId,
      droneType,
      trueClass,
      profile,
      rcsM2,
      emitsRf,
      waypoints: memberWaypoints,
      formation: formationSpec,
    });
  }

  return expanded;
}

export interface FormationScenarioOptions {
  seed?: number;
  difficulty?: number;
  formationKind?: FormationKind;
  count?: number;
  traineeId?: string;
  sessionIdx?: number;
  historyFeatures?: number[][];
}

function buildFormationAttemptSpec(
  attemptSeed: number,
  rng: () => number,
  options: FormationScenarioOptions,
  d: number,
  seed: number
): ScenarioSpec {
  const formationKinds: FormationKind[] = [
    'LINE_ABREAST',
    'V_WEDGE',
    'STACK',
    'DECOY_LEAD',
  ];
  const kind =
    options.formationKind ??
    formationKinds[Math.floor(rng() * formationKinds.length)];

  // Number of members in the formation (2 to 4)
  const count =
    options.count ?? Math.max(2, Math.min(4, Math.round(2 + 2 * d)));

  // Approach angle and distance
  const baseAngle = rng() * 2 * Math.PI;
  const startDist = 3200 + Math.round(rng() * 400); // 3200 - 3600m
  const startX = Math.round(Math.cos(baseAngle) * startDist);
  const startY = Math.round(Math.sin(baseAngle) * startDist);

  const speedMps = Math.round(28 + rng() * 6); // 28 - 34 m/s
  const spawnTMs = 1000 + Math.round(rng() * 2000);

  const baseSpawn: ThreatSpawn = {
    id: 'H-LEAD-1',
    droneType: kind === 'DECOY_LEAD' ? 'RECON_QUAD' : 'SWARM_ELEMENT',
    trueClass: kind === 'DECOY_LEAD' ? 'HOSTILE_ISR' : 'SWARM_ELEMENT',
    spawnTMs,
    waypoints: [
      { x: startX, y: startY, z: 90 },
      { x: 0, y: 0, z: 20 },
    ],
    speedMps,
    profile: 'DIRECT',
    rcsM2: 0.01,
    valueInr: 60000,
    emitsRf: true,
    remoteId: false,
    iff: false,
  };

  const formationDef: FormationDefinition = {
    groupId: `GRP-${attemptSeed}`,
    kind,
    count,
    baseSpawn,
    followerDroneType: kind === 'DECOY_LEAD' ? 'FPV_ATTACK' : 'SWARM_ELEMENT',
    followerTrueClass: kind === 'DECOY_LEAD' ? 'HOSTILE_ATTACK' : 'SWARM_ELEMENT',
    followerProfile: 'DIRECT',
  };

  const threats = expandFormation(formationDef);

  let defaultGroupSpacing = 100;
  if (kind === 'STACK') {
    defaultGroupSpacing = 60;
  } else if (kind === 'DECOY_LEAD') {
    defaultGroupSpacing = 150;
  }

  const groupSpec: FormationGroupSpec = {
    groupId: formationDef.groupId,
    kind,
    leaderId: baseSpawn.id,
    memberIds: threats.map((t) => t.id),
    spacingM: formationDef.spacingM ?? defaultGroupSpacing,
  };

  // Safe urban masking zone placed away from the approach axis
  const oppAngle = baseAngle + Math.PI;
  const zoneX = Math.round(Math.cos(oppAngle) * 2000);
  const zoneY = Math.round(Math.sin(oppAngle) * 2000);

  const zones: ZoneSpec[] = [
    {
      id: 'U-FORMATION-1',
      type: 'URBAN',
      polygon: [
        [zoneX - 300, zoneY - 300],
        [zoneX + 300, zoneY - 300],
        [zoneX + 300, zoneY + 300],
        [zoneX - 300, zoneY + 300],
      ],
      heightM: 35,
      shadowM: 500,
      rho: 0.8,
    },
  ];

  // Build 33-dimensional normalized feature vector
  // Slots 3..6 encode formation kind fractions
  const rawFeatures = new Array(33).fill(0.05);
  rawFeatures[0] = threats.length / 12;
  rawFeatures[1] = 0; // decoy ratio
  rawFeatures[2] = 0; // fraction terrain hug
  rawFeatures[3] = kind === 'LINE_ABREAST' ? 1.0 : 0.0;
  rawFeatures[4] = kind === 'V_WEDGE' ? 1.0 : 0.0;
  rawFeatures[5] = kind === 'STACK' ? 1.0 : 0.0;
  rawFeatures[6] = kind === 'DECOY_LEAD' ? 1.0 : 0.0;
  rawFeatures[7] = kind === 'HELIX' ? 1.0 : 0.0;
  rawFeatures[32] = d;

  const features = normalizeFeatures(rawFeatures);

  return {
    id: `FORMATION-${seed}`,
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
    formations: [groupSpec],
    roeText: 'WEAPONS TIGHT URBAN | ENGAGE COHESIVE FORMATIONS ON CORRIDOR CLEARANCE',
    levers: [{ id: 'PROCEDURAL_FORMATION', reason: `Procedural formation ${kind} with ${count} entities` }],
    features,
  };
}

/**
 * Generates a valid, deterministic, formation-driven ScenarioSpec.
 * Every generated scenario passes through validateDetailed() after expansion.
 * Never returns an unvalidated candidate.
 */
export function generateFormationScenario(
  options: FormationScenarioOptions = {}
): ScenarioSpec {
  const seed =
    typeof options.seed === 'number' && Number.isFinite(options.seed)
      ? Math.floor(options.seed)
      : hash32(`${options.traineeId ?? 'trainee'}|${options.sessionIdx ?? 1}|formation`);

  const d = options.difficulty ?? 0.3;
  const maxAttempts = 30;
  let lastValidCandidate: ScenarioSpec | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = hash32(`${seed}|formation_director|${attempt}`);
    const rng = mulberry32(streamSeed(attemptSeed, 'formation_gen'));

    const spec = buildFormationAttemptSpec(attemptSeed, rng, options, d, seed);

    // Strict validator check after full expansion and mutation
    const validation = validateDetailed(spec);
    if (validation.valid) {
      lastValidCandidate = spec;
      if (options.historyFeatures && options.historyFeatures.length > 0) {
        if (!isNovel(spec.features, options.historyFeatures)) {
          continue; // Mutate and retry if novelty threshold not met
        }
      }
      return spec;
    }
  }

  if (lastValidCandidate) {
    return lastValidCandidate;
  }

  throw new Error(`Failed to generate valid formation scenario after ${maxAttempts} attempts.`);
}

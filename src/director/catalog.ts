import type { ScenarioSpec, TrueClass } from '@/sim/types';
import demo1Json from './bundled/demo1.json';
import { generateScenario } from './generator';
import { validate } from './validate';

export interface ScenarioCatalogEntry {
  id: string;
  name: string;
  category: 'DEMO' | 'TRAIN';
  description: string;
  objective: string;
  classes: TrueClass[];
  tags: string[];
  isAdaptive: boolean;
  adaptiveNote?: string;
  getSpec: (seed?: number, difficulty?: number) => ScenarioSpec;
}

/**
 * Predefined DEMO-2 Proportionality Drill Scenario Spec.
 * Focuses on HOSTILE_ISR (low-cost RECON_QUAD), requiring non-kinetic or proportional effectors.
 */
export const demo2Spec: ScenarioSpec = {
  id: 'DEMO-2',
  schemaVersion: 1,
  simVersion: '1.1.0',
  configHash: 'inlined',
  mode: 'TRAIN',
  seed: 2026,
  difficulty: 0.3,
  dayNight: 'DAY',
  durationMs: 120000,
  asset: { x: 0, y: 0, rMinM: 500 },
  zones: [
    {
      id: 'U1',
      type: 'URBAN',
      polygon: [
        [1500, 1500],
        [2200, 1500],
        [2200, 2200],
        [1500, 2200],
      ],
      heightM: 40,
      shadowM: 600,
      rho: 0.8,
    },
  ],
  threats: [
    {
      id: 'H-ISR-1',
      droneType: 'RECON_QUAD',
      trueClass: 'HOSTILE_ISR',
      spawnTMs: 0,
      waypoints: [
        { x: 2400, y: 1600, z: 90 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 25,
      profile: 'DIRECT',
      rcsM2: 0.01,
      valueInr: 40000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
  ],
  decoys: [
    {
      id: 'C-1',
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
      id: 'B-1',
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
  ],
  chaos: [],
  triggers: [],
  roeText: 'PROPORTIONAL RESPONSE MANDATORY | CER > 10 PENALIZED | RF/LASER RECOMMENDED',
  levers: [{ id: 'PROPORTIONALITY', reason: 'Recon quad proportionality drill' }],
  features: new Array(33).fill(0.05),
};

/**
 * Predefined SWARM INVASION Saturation Scenario Spec.
 * Stresses multi-target track handling and wide-beam RF defense against coordinated SWARM_ELEMENT drones.
 */
export const swarmSpec: ScenarioSpec = {
  id: 'SWARM-1',
  schemaVersion: 1,
  simVersion: '1.1.0',
  configHash: 'inlined',
  mode: 'TRAIN',
  seed: 4040,
  difficulty: 0.5,
  dayNight: 'DAY',
  durationMs: 120000,
  asset: { x: 0, y: 0, rMinM: 500 },
  zones: [],
  threats: [
    {
      id: 'H-SWM-1',
      droneType: 'SWARM_ELEMENT',
      trueClass: 'SWARM_ELEMENT',
      spawnTMs: 0,
      waypoints: [
        { x: 2500, y: 1000, z: 80 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 30,
      profile: 'SWARM_SATURATE',
      rcsM2: 0.01,
      valueInr: 50000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
    {
      id: 'H-SWM-2',
      droneType: 'SWARM_ELEMENT',
      trueClass: 'SWARM_ELEMENT',
      spawnTMs: 6000,
      waypoints: [
        { x: -2200, y: 1600, z: 90 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 30,
      profile: 'SWARM_SATURATE',
      rcsM2: 0.01,
      valueInr: 50000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
    {
      id: 'H-SWM-3',
      droneType: 'SWARM_ELEMENT',
      trueClass: 'SWARM_ELEMENT',
      spawnTMs: 12000,
      waypoints: [
        { x: 1400, y: -2300, z: 85 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 30,
      profile: 'SWARM_SATURATE',
      rcsM2: 0.01,
      valueInr: 50000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
  ],
  decoys: [
    {
      id: 'B-1',
      droneType: 'BIRD',
      trueClass: 'BIRD',
      spawnTMs: 8000,
      waypoints: [{ x: 400, y: 1200, z: 40 }],
      speedMps: 6,
      profile: 'ERRATIC',
      rcsM2: 0.003,
      valueInr: null,
      emitsRf: false,
      remoteId: false,
      iff: false,
    },
    {
      id: 'C-1',
      droneType: 'CIVIL_UAS',
      trueClass: 'CIVIL_UAS',
      spawnTMs: 10000,
      waypoints: [{ x: -1200, y: -1200, z: 50 }],
      speedMps: 10,
      profile: 'LOITER',
      rcsM2: 0.02,
      valueInr: null,
      emitsRf: true,
      remoteId: true,
      iff: false,
    },
  ],
  chaos: [],
  triggers: [],
  roeText: 'WIDE-BEAM RF AUTHORIZED | TARGET MULTI-AXIS SWARM | PREVENT SATURATION',
  levers: [{ id: 'SWARM_SATURATION', reason: 'Multi-axis saturation defense drill' }],
  features: new Array(33).fill(0.05),
};

/**
 * Predefined FULL SPECTRUM Mixed-Class Scenario Spec.
 * Encompasses all six ground-truth classes supported by the DRISHTI-CUAS simulation model.
 */
export const spectrumSpec: ScenarioSpec = {
  id: 'SPECTRUM-1',
  schemaVersion: 1,
  simVersion: '1.1.0',
  configHash: 'inlined',
  mode: 'TRAIN',
  seed: 9999,
  difficulty: 0.6,
  dayNight: 'DAY',
  durationMs: 120000,
  asset: { x: 0, y: 0, rMinM: 500 },
  zones: [],
  threats: [
    {
      id: 'H-ATK-1',
      droneType: 'FPV_ATTACK',
      trueClass: 'HOSTILE_ATTACK',
      spawnTMs: 0,
      waypoints: [
        { x: 2600, y: 1200, z: 120 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 35,
      profile: 'DIRECT',
      rcsM2: 0.01,
      valueInr: 100000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
    {
      id: 'H-ISR-1',
      droneType: 'RECON_QUAD',
      trueClass: 'HOSTILE_ISR',
      spawnTMs: 10000,
      waypoints: [
        { x: -2200, y: 1800, z: 90 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 25,
      profile: 'DIRECT',
      rcsM2: 0.01,
      valueInr: 40000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
    {
      id: 'H-SWM-1',
      droneType: 'SWARM_ELEMENT',
      trueClass: 'SWARM_ELEMENT',
      spawnTMs: 15000,
      waypoints: [
        { x: 1500, y: -2300, z: 80 },
        { x: 0, y: 0, z: 20 },
      ],
      speedMps: 30,
      profile: 'SWARM_SATURATE',
      rcsM2: 0.01,
      valueInr: 50000,
      emitsRf: true,
      remoteId: false,
      iff: false,
    },
  ],
  decoys: [
    {
      id: 'D-CIV-1',
      droneType: 'CIVIL_UAS',
      trueClass: 'CIVIL_UAS',
      spawnTMs: 5000,
      waypoints: [{ x: 1400, y: 1400, z: 60 }],
      speedMps: 10,
      profile: 'LOITER',
      rcsM2: 0.02,
      valueInr: null,
      emitsRf: true,
      remoteId: true,
      iff: false,
    },
    {
      id: 'D-BRD-1',
      droneType: 'BIRD',
      trueClass: 'BIRD',
      spawnTMs: 8000,
      waypoints: [{ x: -600, y: 800, z: 40 }],
      speedMps: 6,
      profile: 'ERRATIC',
      rcsM2: 0.003,
      valueInr: null,
      emitsRf: false,
      remoteId: false,
      iff: false,
    },
    {
      id: 'D-FRN-1',
      droneType: 'FRIENDLY_UAS',
      trueClass: 'FRIENDLY',
      spawnTMs: 2000,
      waypoints: [
        { x: -2000, y: -1500, z: 150 },
        { x: 2000, y: 1500, z: 150 },
      ],
      speedMps: 25,
      profile: 'DIRECT',
      rcsM2: 0.05,
      valueInr: null,
      emitsRf: true,
      remoteId: true,
      iff: true,
    },
  ],
  chaos: [],
  triggers: [],
  roeText: 'FULL SPECTRUM AIR DEFENSE | DISCRIMINATE ALL 6 CLASSES | STRICT IFF & CIVIL ROE',
  levers: [{ id: 'FULL_SPECTRUM', reason: 'Comprehensive 6-class air defense drill' }],
  features: new Array(33).fill(0.05),
};

export const DEFAULT_SCENARIO_ID = 'DEMO-1';

export const SCENARIO_CATALOG: ScenarioCatalogEntry[] = [
  {
    id: 'DEMO-1',
    name: 'DEMO-1 — Urban Masking',
    category: 'DEMO',
    description: 'Baseline urban terrain masking scenario featuring low-altitude FPV attack and airspace clutter.',
    objective: 'Test radar terrain masking line-of-sight awareness, civilian quadcopter restraint, and avian discrimination.',
    classes: ['HOSTILE_ATTACK', 'CIVIL_UAS', 'BIRD'],
    tags: ['BASELINE', 'URBAN', 'TERRAIN-MASKING'],
    isAdaptive: false,
    getSpec: () => structuredClone(demo1Json) as unknown as ScenarioSpec,
  },
  {
    id: 'DEMO-2',
    name: 'DEMO-2 — Proportionality Drill',
    category: 'TRAIN',
    description: 'Low-cost ISR recon drone drill with civil and bird clutter, evaluating ROE and CER proportionality.',
    objective: 'Demonstrate restraint and cost-effective engagement against low-value ISR quads using RF softkill or laser rather than expensive kinetic munitions.',
    classes: ['HOSTILE_ISR', 'CIVIL_UAS', 'BIRD'],
    tags: ['PROPORTIONALITY', 'CER', 'ISR', 'NON-KINETIC'],
    isAdaptive: false,
    getSpec: () => structuredClone(demo2Spec),
  },
  {
    id: 'SWARM-1',
    name: 'SWARM INVASION — Saturation Scenario',
    category: 'TRAIN',
    description: 'Multi-axis saturation attack featuring coordinated micro-swarm elements attacking simultaneously.',
    objective: 'Practice rapid target classification and wide-beam RF softkill counter-swarm engagement under high track density.',
    classes: ['SWARM_ELEMENT', 'CIVIL_UAS', 'BIRD'],
    tags: ['SWARM', 'SATURATION', 'HIGH-DENSITY', 'MULTI-AXIS'],
    isAdaptive: false,
    getSpec: () => structuredClone(swarmSpec),
  },
  {
    id: 'SPECTRUM-1',
    name: 'FULL SPECTRUM — Mixed-Class Scenario',
    category: 'TRAIN',
    description: 'Comprehensive operational air defense exercise including all six ground-truth airspace classes.',
    objective: 'Correctly classify and engage or hold fire on all 6 target classes: FPV Attack, Recon Quad, Swarm Element, Civilian UAS, Bird, and Friendly with IFF.',
    classes: [
      'HOSTILE_ATTACK',
      'HOSTILE_ISR',
      'SWARM_ELEMENT',
      'CIVIL_UAS',
      'BIRD',
      'FRIENDLY',
    ],
    tags: ['ALL-CLASSES', '6-CLASS', 'IFF', 'FULL-SPECTRUM'],
    isAdaptive: false,
    getSpec: () => structuredClone(spectrumSpec),
  },
  {
    id: 'PROCEDURAL-1',
    name: 'PROCEDURAL TRAIN — Difficulty-Scaled Scenario',
    category: 'TRAIN',
    description: 'Procedurally generated training scenario scaling threat density and approach vectors to difficulty d.',
    objective: 'Exercise tactical response against dynamically generated threat axes and urban masking geometry.',
    classes: ['HOSTILE_ATTACK', 'SWARM_ELEMENT'],
    tags: ['PROCEDURAL', 'VARIABLE-AXIS', 'DIFFICULTY-SCALED'],
    isAdaptive: false,
    adaptiveNote:
      'Dynamically generated threat geometry scaled to difficulty d. (Historical EMA weakness vector adaptation is unlinked in generator v1.1.0).',
    getSpec: (seed = 42, difficulty = 0.3) => {
      const generated = generateScenario('trainee-default', 1, difficulty, [], seed);
      generated.id = `PROCEDURAL-${seed}`;
      return generated;
    },
  },
];

export function getScenarioCatalogEntry(id: string): ScenarioCatalogEntry | undefined {
  return SCENARIO_CATALOG.find((entry) => entry.id === id);
}

export function loadCatalogScenario(
  id: string,
  seed?: number,
  difficulty?: number
): { spec: ScenarioSpec; entry: ScenarioCatalogEntry } {
  const entry = getScenarioCatalogEntry(id);
  if (!entry) {
    throw new Error(`Unknown scenario ID: "${id}". Available: ${SCENARIO_CATALOG.map((s) => s.id).join(', ')}`);
  }
  const spec = entry.getSpec(seed, difficulty);
  const isValid = validate(spec);
  if (!isValid) {
    throw new Error(`Catalog scenario "${id}" failed fairness validation.`);
  }
  return { spec, entry };
}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const configJsonPath = path.join(rootDir, 'public', 'config.json');
const outputPath = path.join(rootDir, 'src', 'config', 'config.generated.ts');

const DroneClassConfigSchema = z.object({
  name: z.string(),
  cruiseSpeedMps: z.number().positive(),
  valueInr: z.number().positive().nullable(),
  rcsM2: z.number().positive(),
  defaultAltitudeM: z.number().positive(),
});

const EffectorConfigSchema = z.object({
  name: z.string(),
  tier: z.enum(['T1_NON_KINETIC', 'T2_KINETIC', 'T3_HEAVY']),
  costInr: z.number().nonnegative(),
  pk0: z.number().min(0).max(1),
  pkRfSilent: z.number().min(0).max(1).optional(),
  pkSwarmPerElement: z.number().min(0).max(1).optional(),
  envelopeMinM: z.number().nonnegative(),
  envelopeMaxM: z.number().positive(),
  we: z.number().min(0).max(1),
  debrisRadiusM: z.number().nonnegative(),
  fogPkMultiplier: z.number().min(0).max(1).optional(),
  holdTimeMs: z.number().nonnegative().optional(),
});

const WeightsConfigSchema = z.object({
  hostile: z.object({
    d: z.number().min(0).max(1),
    c: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    r: z.number().min(0).max(1),
  }),
  nonHostile: z.object({
    c: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    r: z.number().min(0).max(1),
  }),
  threatOmega: z.object({
    HOSTILE_ATTACK: z.number().positive(),
    HOSTILE_ISR: z.number().positive(),
    SWARM_ELEMENT: z.number().positive(),
    DECOY: z.number().positive(),
  }),
  deductions: z.object({
    leaker: z.number().nonnegative(),
    criticalEvent: z.number().nonnegative(),
  }),
});

const ThresholdsConfigSchema = z.object({
  qMin: z.number().min(0).max(1),
  rMinM: z.number().positive(),
  rRefM: z.number().positive(),
  rcsRefM2: z.number().positive(),
  hrM: z.number().positive(),
  tBudgetMinMs: z.number().positive(),
  sensingWindowMinMs: z.number().positive(),
  unfavourableCerThreshold: z.number().positive(),
  maxLiveEntities: z.number().int().positive(),
});

const ClassificationMatrixConfigSchema = z.object({
  HOSTILE_ATTACK: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  HOSTILE_ISR: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  SWARM_ELEMENT: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  CIVIL_UAS: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  BIRD: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  FRIENDLY: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
});

const ZoneDefaultsSchema = z.object({
  defaultHeightM: z.number().positive(),
  defaultShadowM: z.number().positive(),
  defaultRho: z.number().min(0).max(1),
});

const ChaosItemDefaultsSchema = z.object({
  durationMinMs: z.number().positive(),
  durationMaxMs: z.number().positive(),
  eoirRangeMultiplier: z.number().min(0).max(1).optional(),
  laserPkMultiplier: z.number().min(0).max(1).optional(),
  rfDetectionMultiplier: z.number().min(0).max(1).optional(),
  softKillPk: z.number().min(0).max(1).optional(),
  aEnv: z.number().min(0).max(1).optional(),
  falsePlotsMin: z.number().int().nonnegative().optional(),
  falsePlotsMax: z.number().int().nonnegative().optional(),
});

const ConfigSchema = z.object({
  _meta: z.object({
    notional: z.literal(true),
    description: z.string(),
    version: z.string(),
    updatedAt: z.string(),
  }),
  droneClasses: z.object({
    RECON_QUAD: DroneClassConfigSchema,
    FPV_ATTACK: DroneClassConfigSchema,
    SWARM_ELEMENT: DroneClassConfigSchema,
    LOITERING_MUNITION: DroneClassConfigSchema,
    CIVIL_UAS: DroneClassConfigSchema,
    BIRD: DroneClassConfigSchema,
    FRIENDLY_UAS: DroneClassConfigSchema,
  }),
  effectors: z.object({
    RF_SOFTKILL: EffectorConfigSchema,
    LASER: EffectorConfigSchema,
    GUN: EffectorConfigSchema,
    INTERCEPTOR: EffectorConfigSchema,
    MISSILE: EffectorConfigSchema,
  }),
  weights: WeightsConfigSchema,
  thresholds: ThresholdsConfigSchema,
  classificationMatrix: ClassificationMatrixConfigSchema,
  zones: z.object({
    URBAN: ZoneDefaultsSchema,
    RIDGE: ZoneDefaultsSchema,
    FOREST: ZoneDefaultsSchema,
  }),
  chaos: z.object({
    FOG: ChaosItemDefaultsSchema,
    JAMMING: ChaosItemDefaultsSchema,
    RAIN: ChaosItemDefaultsSchema,
    RADAR_DROPOUT: ChaosItemDefaultsSchema,
  }),
  grades: z.object({
    proficientMin: z.number().positive(),
    developingMin: z.number().positive(),
    labels: z.object({
      PROFICIENT: z.literal('PROFICIENT_IN_SIMULATION'),
      DEVELOPING: z.literal('DEVELOPING'),
      NEEDS_RETRAINING: z.literal('NEEDS_RETRAINING'),
    }),
  }),
});

function main() {
  if (!fs.existsSync(configJsonPath)) {
    console.error(`[inline-config] FATAL: File not found: ${configJsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(configJsonPath, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`[inline-config] FATAL: Failed to parse JSON in ${configJsonPath}:`, err);
    process.exit(1);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    console.error(`[inline-config] FATAL: Validation failed for ${configJsonPath}:`);
    for (const issue of result.error.issues) {
      console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
    }
    process.exit(1);
  }

  const hash = 'sha256:' + crypto.createHash('sha256').update(raw).digest('hex');

  const fileContent = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Generated by scripts/inline-config.mjs from public/config.json
// Validated with Zod schema against Zero-Server and Deterministic constraints.
import type { SimConfig } from './schema';

export const CONFIG_HASH = ${JSON.stringify(hash)};

export const CONFIG: SimConfig = ${JSON.stringify(result.data, null, 2)} as const;
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`[inline-config] SUCCESS: Validated config.json (hash: ${hash}) -> generated ${path.relative(rootDir, outputPath)}`);
}

main();

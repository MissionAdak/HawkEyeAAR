import { z } from 'zod';

export const DroneClassConfigSchema = z.object({
  name: z.string(),
  cruiseSpeedMps: z.number().positive(),
  valueInr: z.number().positive().nullable(),
  rcsM2: z.number().positive(),
  defaultAltitudeM: z.number().positive(),
});

export const EffectorConfigSchema = z.object({
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

export const WeightsConfigSchema = z.object({
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

export const ThresholdsConfigSchema = z.object({
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

// 6 true classes x 7 trainee labels
// HA, HI, SW, CU, BI, FR, UNK
export const ClassificationMatrixConfigSchema = z.object({
  HOSTILE_ATTACK: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  HOSTILE_ISR: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  SWARM_ELEMENT: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  CIVIL_UAS: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  BIRD: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  FRIENDLY: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
});

export const ZoneDefaultsSchema = z.object({
  defaultHeightM: z.number().positive(),
  defaultShadowM: z.number().positive(),
  defaultRho: z.number().min(0).max(1),
});

export const ChaosItemDefaultsSchema = z.object({
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

export const ConfigSchema = z.object({
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

export type SimConfig = z.infer<typeof ConfigSchema>;

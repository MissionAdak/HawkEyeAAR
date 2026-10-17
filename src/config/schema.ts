import { z } from 'zod';

export const DroneClassSchema = z.object({
  speedMps: z.number().positive(),
  valueInr: z.number().nullable(),
  rcsM2: z.number().positive(),
  defaultClass: z.string(),
});

export const EffectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  costInr: z.number().nonnegative(),
  pk0: z.number().min(0).max(1),
  pk0RfSilent: z.number().min(0).max(1),
  pk0Swarm: z.number().min(0).max(1).optional(),
  envelopeMinM: z.number().nonnegative(),
  envelopeMaxM: z.number().positive(),
  we: z.number().min(0).max(1),
  debrisRadiusM: z.number().nonnegative(),
  tier: z.enum(['T1_NON_KINETIC', 'T2_KINETIC', 'T3_HEAVY']),
  keyHint: z.string(),
  holdTimeMs: z.number().nonnegative(),
});

export const ThresholdsSchema = z.object({
  qMin: z.number().min(0).max(1),
  rMinM: z.number().positive(),
  cerUnfavourableThreshold: z.number().positive(),
  radarMaxRangeM: z.number().positive(),
  eoirMaxRangeDayM: z.number().positive(),
  eoirMaxRangeNightM: z.number().positive(),
  rfMaxRangeM: z.number().positive(),
  radarSweepPeriodMs: z.number().positive(),
  radarRpm: z.number().positive(),
  antennaHeightM: z.number().positive(),
});

export const ZoneConfigSchema = z.object({
  defaultHeightM: z.number().positive(),
  defaultShadowM: z.number().positive(),
  defaultRho: z.number().min(0).max(1),
});

export const ScoringWeightsSchema = z.object({
  hostile: z.object({
    d: z.number(),
    c: z.number(),
    g: z.number(),
    r: z.number(),
  }),
  nonHostile: z.object({
    c: z.number(),
    g: z.number(),
    r: z.number(),
  }),
  threatWeights: z.record(z.string(), z.number()),
  penalties: z.object({
    leakerSessionDeduction: z.number(),
    criticalEventDeduction: z.number(),
    roeViolationDeduction: z.number(),
  }),
});

export const ConfigSchema = z.object({
  _meta: z.object({
    notional: z.boolean(),
    disclaimer: z.string(),
    version: z.string(),
  }),
  droneClasses: z.record(z.string(), DroneClassSchema),
  effectors: z.record(z.string(), EffectorSchema),
  thresholds: ThresholdsSchema,
  zones: z.record(z.string(), ZoneConfigSchema),
  scoringWeights: ScoringWeightsSchema,
  classificationMatrix: z.record(z.string(), z.record(z.string(), z.number())),
  chaos: z.record(z.string(), z.record(z.string(), z.any())),
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;

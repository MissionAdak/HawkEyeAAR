import { CONFIG } from '@/config';
import type { EffectorId, DroneType, TrackEntity } from './types';

export interface EffectorEnvelopePlateau {
  envelopeMinM: number;
  envelopeMaxM: number;
  plateauMinM: number;
  plateauMaxM: number;
  rOptM: number;
}

export interface EngagementContext {
  isFogActive?: boolean;
  isJammingActive?: boolean;
}

/**
 * Calculates envelope plateau boundaries for an effector.
 * The middle 60% of the envelope is the optimal plateau (Rules.md SC-6, TASK-P2-03).
 */
export function getEnvelopePlateau(effectorId: EffectorId): EffectorEnvelopePlateau {
  const eff = CONFIG.effectors[effectorId];
  const envelopeMinM = eff.envelopeMinM;
  const envelopeMaxM = eff.envelopeMaxM;
  const envelopeWidth = envelopeMaxM - envelopeMinM;

  const plateauMinM = envelopeMinM + 0.2 * envelopeWidth;
  const plateauMaxM = envelopeMinM + 0.8 * envelopeWidth;
  const rOptM = (envelopeMinM + envelopeMaxM) / 2;

  return {
    envelopeMinM,
    envelopeMaxM,
    plateauMinM,
    plateauMaxM,
    rOptM,
  };
}

/**
 * Calculates range attenuation factor g(R) in [0, 1].
 * - Middle 60% plateau: g(R) = 1.0
 * - Linear taper to 0 at envelope edges (min and max)
 * - Outside envelope: g(R) = 0.0
 */
export function computeRangeAttenuation(rangeM: number, effectorId: EffectorId): number {
  const { envelopeMinM, envelopeMaxM, plateauMinM, plateauMaxM } = getEnvelopePlateau(effectorId);

  if (rangeM < envelopeMinM || rangeM > envelopeMaxM) {
    return 0.0;
  }

  if (rangeM >= plateauMinM && rangeM <= plateauMaxM) {
    return 1.0;
  }

  if (rangeM < plateauMinM) {
    const taperWidth = plateauMinM - envelopeMinM;
    if (taperWidth <= 0) return 1.0;
    return (rangeM - envelopeMinM) / taperWidth;
  } else {
    const taperWidth = envelopeMaxM - plateauMaxM;
    if (taperWidth <= 0) return 1.0;
    return (envelopeMaxM - rangeM) / taperWidth;
  }
}

/**
 * Derives base Pk0 based on effector, target type, and RF emission status.
 */
export function computeBasePk0(
  effectorId: EffectorId,
  target: { droneType: DroneType; emitsRf: boolean }
): number {
  const eff = CONFIG.effectors[effectorId];
  if (!eff) return 0;

  // 1. Swarm element target (e.g. Gun dispersion gives 0.35 per element)
  if (target.droneType === 'SWARM_ELEMENT' && eff.pk0Swarm !== undefined) {
    return eff.pk0Swarm;
  }

  // 2. RF-silent drone (e.g. autonomous flight / link loss)
  if (!target.emitsRf) {
    return eff.pk0RfSilent ?? (effectorId === 'RF_SOFTKILL' ? 0.1 : eff.pk0);
  }

  // 3. Nominal base Pk0
  return eff.pk0;
}

/**
 * Calculates environmental chaos multiplier h(chaos) in [0, 1].
 * - Laser: fog halves Pk (h = 0.5)
 * - RF Soft-kill: jamming completely denies soft-kill (h = 0.0)
 */
export function computeChaosMultiplier(
  effectorId: EffectorId,
  context: EngagementContext = {}
): number {
  const { isFogActive = false, isJammingActive = false } = context;

  if (effectorId === 'LASER' && isFogActive) {
    return CONFIG.chaos.FOG.laserPkMultiplier ?? 0.5;
  }

  if (effectorId === 'RF_SOFTKILL' && isJammingActive) {
    return CONFIG.chaos.JAMMING.softKillPkMultiplier ?? 0.0;
  }

  return 1.0;
}

/**
 * Calculates effective Probability of Kill (Pk) in [0, 1].
 * Pk = Pk0 * g(R) * h(chaos)
 */
export function computeEffectivePk(
  effectorId: EffectorId,
  rangeM: number,
  target: { droneType: DroneType; emitsRf: boolean },
  context: EngagementContext = {}
): number {
  const pk0 = computeBasePk0(effectorId, target);
  const g = computeRangeAttenuation(rangeM, effectorId);
  const h = computeChaosMultiplier(effectorId, context);

  const pk = pk0 * g * h;
  return Math.min(1.0, Math.max(0.0, pk));
}

export interface EngagementResolutionResult {
  killed: boolean;
  pk: number;
  u: number;
  pk0?: number;
  g?: number;
  h?: number;
}

/**
 * Resolves an engagement draw using the seeded PRNG kill stream.
 * Exactly one draw u from killRng is consumed per engagement (Rules.md DT-3, SC-15).
 */
export function resolveEngagement(
  effectorId: EffectorId,
  rangeM: number,
  target: TrackEntity,
  killRng: () => number,
  context: EngagementContext = {}
): EngagementResolutionResult {
  const pk0 = computeBasePk0(effectorId, target);
  const g = computeRangeAttenuation(rangeM, effectorId);
  const h = computeChaosMultiplier(effectorId, context);
  const rawPk = pk0 * g * h;
  const pk = Math.min(1.0, Math.max(0.0, rawPk));
  const u = killRng();
  const killed = u <= pk;

  return {
    killed,
    pk,
    u,
    pk0,
    g,
    h,
  };
}

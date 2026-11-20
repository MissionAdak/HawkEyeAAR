import { CONFIG } from '@/config';
import type { TrueClass, DroneType, EffectorId } from './types';
import { isHostile } from './taxonomy';

export interface OracleQuery {
  rangeM: number;
  trueClass: TrueClass;
  emitsRf?: boolean;
  droneType?: DroneType;
  isOverDenseZone?: boolean;
  isJammingActive?: boolean;
  isFogActive?: boolean;
}

export interface OracleResult {
  oracleEffector: EffectorId | 'HOLD_FIRE';
  oracleCostInr: number;
  admissible: boolean;
  reason: string;
}

export interface CostRegretResult {
  regretInr: number;
  isOptimal: boolean;
  text: string;
}

/**
 * Computes the Oracle ("school solution") decision:
 * The cheapest admissible effector with Pk >= 0.6, inside range envelope, and ROE compliant.
 */
function isEffectorAdmissible(id: EffectorId, query: OracleQuery): boolean {
  const eff = CONFIG.effectors[id];
  if (!eff) return false;

  const {
    rangeM,
    emitsRf = true,
    isJammingActive = false,
    isFogActive = false,
    isOverDenseZone = false,
    droneType,
  } = query;

  if (rangeM < eff.envelopeMinM || rangeM > eff.envelopeMaxM) {
    return false;
  }

  if (id === 'RF_SOFTKILL' && (!emitsRf || isJammingActive)) {
    return false;
  }

  if (id === 'LASER' && isFogActive) {
    return false;
  }

  if (isOverDenseZone && eff.tier !== 'T1_NON_KINETIC') {
    const laser = CONFIG.effectors.LASER;
    if (!isFogActive && rangeM >= laser.envelopeMinM && rangeM <= laser.envelopeMaxM) {
      return false;
    }
  }

  let pk = eff.pk0;
  if (!emitsRf) {
    pk = eff.pk0RfSilent;
  }
  if (droneType === 'SWARM_ELEMENT' && eff.pk0Swarm !== undefined) {
    pk = eff.pk0Swarm;
  }

  return pk >= 0.6;
}

/**
 * Computes the Oracle ("school solution") decision:
 * The cheapest admissible effector with Pk >= 0.6, inside range envelope, and ROE compliant.
 */
export function computeOracleEffector(query: OracleQuery): OracleResult {
  const { trueClass } = query;

  // 1. If target is non-hostile (Friendly, Civil, Bird), optimal decision is to Hold Fire!
  if (!isHostile(trueClass)) {
    return {
      oracleEffector: 'HOLD_FIRE',
      oracleCostInr: 0,
      admissible: true,
      reason: `Target is non-hostile (${trueClass}). ROE dictates HOLD FIRE.`,
    };
  }

  // 2. Candidate effectors sorted by cost ascending (cheapest admissible first)
  const candidateIds: EffectorId[] = ['RF_SOFTKILL', 'LASER', 'GUN', 'INTERCEPTOR', 'MISSILE'];

  for (const id of candidateIds) {
    if (isEffectorAdmissible(id, query)) {
      const eff = CONFIG.effectors[id];
      return {
        oracleEffector: id,
        oracleCostInr: eff.costInr,
        admissible: true,
        reason: `Cheapest admissible: ${eff.name} (₹${eff.costInr.toLocaleString('en-IN')})`,
      };
    }
  }

  // Fallback if target is outside standard envelopes or emergency
  return {
    oracleEffector: 'MISSILE',
    oracleCostInr: CONFIG.effectors.MISSILE.costInr,
    admissible: false,
    reason: 'Emergency intercept: heavy missile required.',
  };
}

/**
 * Calculates the cost regret between the trainee's chosen effector and the Oracle choice.
 */
export function computeCostRegret(
  traineeEffector: EffectorId,
  oracleEffector: EffectorId | 'HOLD_FIRE'
): CostRegretResult {
  const traineeCost = CONFIG.effectors[traineeEffector]?.costInr ?? 0;
  const oracleCost = oracleEffector === 'HOLD_FIRE' ? 0 : (CONFIG.effectors[oracleEffector]?.costInr ?? 0);

  const regretInr = Math.max(0, traineeCost - oracleCost);
  const isOptimal = traineeEffector === oracleEffector;

  let text = 'OPTIMAL (₹0)';
  if (oracleEffector === 'HOLD_FIRE') {
    text = `ROE VIOLATION (+₹${traineeCost.toLocaleString('en-IN')})`;
  } else if (!isOptimal && regretInr > 0) {
    text = `+₹${regretInr.toLocaleString('en-IN')} REGRET`;
  } else if (!isOptimal) {
    text = `SUBOPTIMAL (ORACLE: ${oracleEffector})`;
  }

  return { regretInr, isOptimal, text };
}

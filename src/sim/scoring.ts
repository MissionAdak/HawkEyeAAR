import { CONFIG } from '@/config';
import type { TrueClass, TrackClass } from './taxonomy';
import type { Grade, EffectorId } from './types';

export function clamp(val: number, min: number = 0, max: number = 100): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Calculates Detection Speed score D in [0, 100].
 * Timestamps must start at tTrk, never tVis (Rules.md SC-4, R-3).
 */
export function computeDScore(
  tTrk: number | null,
  tDesig: number | null,
  tPnr: number | null
): number {
  if (tTrk === null || tDesig === null || tPnr === null) return 0;
  const tBudget = tPnr - tTrk;
  if (tBudget <= 0) return 0;

  const latency = tDesig - tTrk;
  if (latency < 0) return 100;

  const score = 100 * (1 - latency / tBudget);
  return clamp(score);
}

/**
 * Calculates Classification Accuracy score C in [0, 100] from the 6x7 cost-weighted matrix.
 */
export function computeCScore(trueClass: TrueClass, traineeLabel: TrackClass | null): number {
  if (!traineeLabel) return 0;

  const matrix = CONFIG.classificationMatrix as Record<string, Record<string, number>>;
  const row = matrix[trueClass];
  if (!row) return 0;

  const score = row[traineeLabel] ?? 0;
  return clamp(score);
}

/**
 * Calculates Economic score E_econ from Cost Exchange Ratio (CER).
 * If CER <= 1: 100.
 * Else: clamp(100 - 40 * log10(CER)).
 */
export function computeEconScore(cer: number): { econScore: number; isUnfavourable: boolean } {
  if (cer <= 1.0) {
    return { econScore: 100, isUnfavourable: false };
  }

  const score = 100 - 40 * Math.log10(cer);
  const isUnfavourable = cer > CONFIG.thresholds.cerUnfavourableThreshold;
  return {
    econScore: clamp(score),
    isUnfavourable,
  };
}

/**
 * Calculates Timing score E_time based on optimal engagement envelope plateau center:
 * R_opt = (envelopeMin + envelopeMax) / 2
 */
export function computeTimeScore(rangeM: number, envelopeMinM: number, envelopeMaxM: number): number {
  const rOpt = (envelopeMinM + envelopeMaxM) / 2;
  if (rOpt <= 0) return 0;

  const deviation = Math.abs(rangeM - rOpt);
  const score = 100 * (1 - deviation / rOpt);
  return clamp(score);
}

/**
 * Calculates Engagement Decision score G in [0, 100].
 */
export function computeGScore(params: {
  isHostile: boolean;
  neutralisedBeforePnr: boolean;
  engaged: boolean;
  econScore: number;
  timeScore: number;
  kineticOverDenseZone: boolean;
  unclassifiedFired?: boolean;
}): number {
  const {
    isHostile,
    neutralisedBeforePnr,
    engaged,
    econScore,
    timeScore,
    kineticOverDenseZone,
    unclassifiedFired = false,
  } = params;

  let g = 0;

  if (isHostile) {
    if (neutralisedBeforePnr) {
      g = 0.6 * econScore + 0.4 * timeScore;
    } else if (engaged) {
      // Attempted engagement but target leaked
      g = 0.3 * econScore;
    } else {
      // Unopposed leaker
      g = 0;
    }

    // ROE rules SC-8 & SC-9: Kinetic over dense zone or firing on UNK caps G at 40
    if (kineticOverDenseZone || unclassifiedFired) {
      g = Math.min(g, 40);
    }
  } else {
    // Non-hostile track
    if (!engaged) {
      // Correctly held fire
      g = 100;
    } else {
      // Erroneous engagement of neutral/friendly
      g = 0;
    }

    if (kineticOverDenseZone || unclassifiedFired) {
      g = Math.min(g, 40);
    }
  }

  return clamp(g);
}

/**
 * Calculates ROE score R in [0, 100].
 */
export function computeRScore(params: {
  effectorId: EffectorId | null;
  rhoZone: number;
  isInsideZoneOverlap: boolean;
  civilEngaged: boolean;
  friendlyEngaged: boolean;
  unclassifiedFired: boolean;
}): number {
  const {
    effectorId,
    rhoZone,
    isInsideZoneOverlap,
    civilEngaged,
    friendlyEngaged,
    unclassifiedFired,
  } = params;

  let deduction = 0;

  if (effectorId && isInsideZoneOverlap) {
    const eff = CONFIG.effectors[effectorId];
    const we = eff?.we ?? 0.1;
    deduction += 100 * we * rhoZone;
  }

  if (civilEngaged) deduction += 50;
  if (friendlyEngaged) deduction += 100;
  if (unclassifiedFired) deduction += CONFIG.scoringWeights.penalties.roeViolationDeduction;

  return clamp(100 - deduction);
}

/**
 * Calculates single Track Score S in [0, 100].
 */
export function computeTrackScore(params: {
  isHostile: boolean;
  d: number;
  c: number;
  g: number;
  r: number;
}): number {
  const { isHostile, d, c, g, r } = params;
  const clampedD = clamp(d);
  const clampedC = clamp(c);
  const clampedG = clamp(g);
  const clampedR = clamp(r);

  const { hostile, nonHostile } = CONFIG.scoringWeights;
  if (isHostile) {
    const s =
      hostile.d * clampedD +
      hostile.c * clampedC +
      hostile.g * clampedG +
      hostile.r * clampedR;
    return clamp(s);
  } else {
    const s =
      nonHostile.c * clampedC +
      nonHostile.g * clampedG +
      nonHostile.r * clampedR;
    return clamp(s);
  }
}

/**
 * Derives Grade label from session score.
 */
export function getGrade(score: number): Grade {
  if (score >= 70) return 'PROFICIENT_IN_SIMULATION';
  if (score >= 50) return 'DEVELOPING';
  return 'NEEDS_RETRAINING';
}

/**
 * Calculates global Session Score in [0, 100] (Rules.md SC-3).
 * Score = clamp(sum(w_i * S_i) / sum(w_i) - 20 * leakers - 25 * critical)
 */
export function computeSessionScore(params: {
  trackScores: { trackScore: number; trueClass: TrueClass }[];
  leakersCount: number;
  criticalEventsCount: number;
}): number {
  const { trackScores, leakersCount, criticalEventsCount } = params;
  if (trackScores.length === 0) return 100;

  const threatWeights = CONFIG.scoringWeights.threatWeights as Record<string, number>;
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const { trackScore, trueClass } of trackScores) {
    const w = threatWeights[trueClass] ?? 0.3;
    totalWeightedScore += w * clamp(trackScore);
    totalWeight += w;
  }

  const baseScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 100;
  const leakerPenalty = leakersCount * CONFIG.scoringWeights.penalties.leakerSessionDeduction;
  const criticalPenalty = criticalEventsCount * CONFIG.scoringWeights.penalties.criticalEventDeduction;

  return clamp(baseScore - leakerPenalty - criticalPenalty);
}


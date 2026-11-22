import type { WeaknessVector, AARMetrics } from '@/sim/types';
import { mulberry32 } from '@/sim/rng';

export const DEFAULT_TRAIN_DIFFICULTY = 0.3;
export const DEFAULT_METRIC_EMA = 50.0;

/**
 * Updates Exponential Moving Average (EMA) for trainee performance metrics.
 * Complies with ARCHITECTURE.md 5.3: alpha = 0.4, first valid sample seeds the EMA.
 */
export function updateEMA(currentEMA: number | null, observation: number, alpha = 0.4): number {
  if (currentEMA === null) return observation;
  return alpha * observation + (1 - alpha) * currentEMA;
}

/**
 * Computes difficulty adjustment according to Rules.md R4.2 & PRD.md §4.9:
 * d_{n+1} = clamp(d_n + 0.15 * (Score_n - 70) / 30, 0, 1)
 * Scores > 70 increase d; scores < 70 decrease d; score = 70 preserves d.
 * Clamped strictly to [0, 1].
 */
export function computeNextDifficulty(currentD: number, sessionScore: number): number {
  if (!Number.isFinite(currentD) || !Number.isFinite(sessionScore)) {
    return Math.max(0, Math.min(1, Number.isFinite(currentD) ? currentD : DEFAULT_TRAIN_DIFFICULTY));
  }
  const delta = 0.15 * ((sessionScore - 70) / 30);
  const next = currentD + delta;
  return Math.max(0, Math.min(1, Math.round(next * 10000) / 10000));
}

/**
 * Computes weakness weights from EMA metrics: w_k = 1 - EMA_k / 100.
 * Normalised via softmax with beta = 4.0 per ARCHITECTURE.md 5.3.
 */
export function computeWeaknessWeights(ema: WeaknessVector): Record<string, number> {
  const raw = {
    d: Math.max(0, 1 - ema.d / 100),
    c: Math.max(0, 1 - ema.c / 100),
    econ: Math.max(0, 1 - ema.econ / 100),
    r: Math.max(0, 1 - ema.r / 100),
    sal: Math.max(0, 1 - ema.sal / 100),
    sat: Math.max(0, 1 - ema.sat / 100),
  };

  const beta = 4.0;
  const expWeights: Record<string, number> = {};
  let sum = 0;

  for (const [k, v] of Object.entries(raw)) {
    const ew = Math.exp(beta * v);
    expWeights[k] = ew;
    sum += ew;
  }

  const normalized: Record<string, number> = {};
  for (const [k, ew] of Object.entries(expWeights)) {
    normalized[k] = sum > 0 ? ew / sum : 1 / 6;
  }

  return normalized;
}

/**
 * Updates full trainee EMA performance profile across all 6 skill dimensions.
 * Missing metrics in a session (e.g. no chaos event -> sal is null) are skipped
 * and retain their previous EMA without zeroing (PRD.md §4.9).
 */
export function updateWeaknessProfile(
  currentProfile: WeaknessVector | null,
  metrics: Partial<AARMetrics>
): WeaknessVector {
  const current: WeaknessVector = currentProfile ?? {
    d: DEFAULT_METRIC_EMA,
    c: DEFAULT_METRIC_EMA,
    econ: DEFAULT_METRIC_EMA,
    r: DEFAULT_METRIC_EMA,
    sal: DEFAULT_METRIC_EMA,
    sat: DEFAULT_METRIC_EMA,
  };

  const isColdStart = currentProfile === null;

  const updateDim = (curr: number, obs: number | null | undefined): number => {
    if (obs === null || obs === undefined || !Number.isFinite(obs)) {
      return curr;
    }
    const clampedObs = Math.max(0, Math.min(100, obs));
    if (isColdStart) {
      return clampedObs;
    }
    return Math.round(updateEMA(curr, clampedObs, 0.4) * 100) / 100;
  };

  const satObs =
    metrics.swarmSat !== null && metrics.swarmSat !== undefined && Number.isFinite(metrics.swarmSat)
      ? Math.round(metrics.swarmSat * 100)
      : null;

  return {
    d: updateDim(current.d, metrics.dScore),
    c: updateDim(current.c, metrics.cScore),
    econ: updateDim(current.econ, metrics.econScore),
    r: updateDim(current.r, metrics.rScore),
    sal: updateDim(current.sal, metrics.salScore),
    sat: updateDim(current.sat, satObs),
  };
}

export type WeaknessDimension = keyof WeaknessVector;

export interface AdaptiveLeverInfo {
  dimension: WeaknessDimension;
  leverId: string;
  name: string;
  reason: string;
}

/**
 * Weakness to lever mapping per PRD.md §5.4 (what the Adaptive Red Team exploits).
 */
export const WEAKNESS_LEVER_MAP: Record<WeaknessDimension, AdaptiveLeverInfo> = {
  d: {
    dimension: 'd',
    leverId: 'LOW_RCS_MASKED',
    name: 'Terrain-Masked Ingress',
    reason: 'Detection latency weak; stressing radar masking line-of-sight awareness and terrain hugging.',
  },
  c: {
    dimension: 'c',
    leverId: 'DECOY_FLOOD',
    name: 'Civilian & Avian Clutter',
    reason: 'Classification accuracy weak; deploying high civilian and bird clutter with ambiguous signatures.',
  },
  econ: {
    dimension: 'econ',
    leverId: 'PROPORTIONALITY_DRILL',
    name: 'Cost-Exchange Proportionality',
    reason: 'Cost-exchange ratio (CER) weak; fielding low-cost ISR recon quads demanding softkill or laser response.',
  },
  r: {
    dimension: 'r',
    leverId: 'URBAN_COLLATERAL_RISK',
    name: 'Urban Buffer ROE Gating',
    reason: 'ROE compliance weak; routing hostiles over urban collateral zones where kinetic release is penalized.',
  },
  sal: {
    dimension: 'sal',
    leverId: 'SENSOR_CHAOS_CHALLENGE',
    name: 'Sensor Jamming & Clutter',
    reason: 'Sensor adaptation latency slow; scheduling environmental sensor dropout to force cross-modality switching.',
  },
  sat: {
    dimension: 'sat',
    leverId: 'SWARM_SATURATION',
    name: 'Coordinated Multi-Axis Swarm',
    reason: 'Swarm saturation handling weak; scheduling multi-axis simultaneous elements attacking asset perimeter.',
  },
};

export function getWeakestDimension(ema: WeaknessVector): {
  dimension: WeaknessDimension;
  emaValue: number;
  weaknessWeight: number;
  lever: AdaptiveLeverInfo;
} {
  const weights = computeWeaknessWeights(ema);
  let weakestDim: WeaknessDimension = 'd';
  let minEma = ema.d;

  const dims: WeaknessDimension[] = ['d', 'c', 'econ', 'r', 'sal', 'sat'];
  for (const dim of dims) {
    if (ema[dim] < minEma) {
      minEma = ema[dim];
      weakestDim = dim;
    }
  }

  return {
    dimension: weakestDim,
    emaValue: minEma,
    weaknessWeight: weights[weakestDim] ?? 0.1667,
    lever: WEAKNESS_LEVER_MAP[weakestDim],
  };
}

/**
 * Samples 1 or 2 distinct scenario levers according to softmax weakness probabilities:
 * P(k) = e^{4 w_k} / \sum_j e^{4 w_j} (PRD.md §5.4).
 * Uses deterministic PRNG seeded by seed/rng. Never uses Math.random().
 */
export function sampleAdaptiveLevers(
  profile: WeaknessVector,
  rngOrSeed: (() => number) | number,
  count: 1 | 2 = 1
): AdaptiveLeverInfo[] {
  const rng = typeof rngOrSeed === 'number' ? mulberry32(rngOrSeed) : rngOrSeed;
  const weights = computeWeaknessWeights(profile);
  const dims: WeaknessDimension[] = ['d', 'c', 'econ', 'r', 'sal', 'sat'];

  const selected: AdaptiveLeverInfo[] = [];

  // 1. Sample first lever from full distribution
  const draw1 = rng();
  let cumulative1 = 0;
  let chosenDim1: WeaknessDimension = dims[dims.length - 1];
  for (const dim of dims) {
    cumulative1 += weights[dim] ?? 0;
    if (draw1 <= cumulative1) {
      chosenDim1 = dim;
      break;
    }
  }
  selected.push(WEAKNESS_LEVER_MAP[chosenDim1]);

  // 2. If count is 2, sample second lever without replacement by re-normalizing remaining 5
  if (count === 2) {
    const remainingDims = dims.filter((d) => d !== chosenDim1);
    const sumRemaining = remainingDims.reduce((acc, d) => acc + (weights[d] ?? 0), 0);
    const draw2 = rng();
    let cumulative2 = 0;
    let chosenDim2: WeaknessDimension = remainingDims[remainingDims.length - 1];
    for (const dim of remainingDims) {
      const prob = sumRemaining > 0 ? (weights[dim] ?? 0) / sumRemaining : 1 / remainingDims.length;
      cumulative2 += prob;
      if (draw2 <= cumulative2) {
        chosenDim2 = dim;
        break;
      }
    }
    selected.push(WEAKNESS_LEVER_MAP[chosenDim2]);
  }

  return selected;
}

export interface AdaptivePlanOptions {
  seed?: number;
  sessionStartDifficulty?: number;
}

export interface AdaptivePlan {
  traineeId: string;
  currentDifficulty: number;
  nextDifficulty: number;
  weakestDimension: WeaknessDimension;
  weakestEma: number;
  targetLever: string;
  leverName: string;
  rationale: string;
  recommendedScenarioId: string;
  profile: WeaknessVector;
  weights: Record<string, number>;
}

export function getAdaptivePlan(
  traineeId: string,
  profile: WeaknessVector | null,
  currentDifficulty: number = DEFAULT_TRAIN_DIFFICULTY,
  lastScore?: number,
  options?: AdaptivePlanOptions
): AdaptivePlan {
  const effectiveProfile = profile ?? {
    d: DEFAULT_METRIC_EMA,
    c: DEFAULT_METRIC_EMA,
    econ: DEFAULT_METRIC_EMA,
    r: DEFAULT_METRIC_EMA,
    sal: DEFAULT_METRIC_EMA,
    sat: DEFAULT_METRIC_EMA,
  };

  // Prevent double difficulty adjustment (Fix 6):
  // If sessionStartDifficulty is explicitly provided, currentDifficulty is already d_{n+1}.
  // If not provided, and lastScore is given, compute nextDifficulty from currentDifficulty.
  let startingD = currentDifficulty;
  let nextD = currentDifficulty;

  if (typeof options?.sessionStartDifficulty === 'number') {
    startingD = options.sessionStartDifficulty;
    nextD = typeof lastScore === 'number'
      ? computeNextDifficulty(startingD, lastScore)
      : currentDifficulty;
  } else if (typeof lastScore === 'number') {
    nextD = computeNextDifficulty(currentDifficulty, lastScore);
  }

  const weakest = getWeakestDimension(effectiveProfile);
  const weights = computeWeaknessWeights(effectiveProfile);

  // If seed provided, use softmax sampling; otherwise select primary weakness lever
  const sampledLevers = typeof options?.seed === 'number'
    ? sampleAdaptiveLevers(effectiveProfile, options.seed, 1)
    : [weakest.lever];

  const targetLeverInfo = sampledLevers[0];

  return {
    traineeId,
    currentDifficulty: startingD,
    nextDifficulty: nextD,
    weakestDimension: weakest.dimension,
    weakestEma: weakest.emaValue,
    targetLever: targetLeverInfo.leverId,
    leverName: targetLeverInfo.name,
    rationale: targetLeverInfo.reason,
    recommendedScenarioId: `ADAPTIVE-${targetLeverInfo.leverId}`,
    profile: effectiveProfile,
    weights,
  };
}


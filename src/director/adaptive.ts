import type { WeaknessVector } from '@/sim/types';

/**
 * Updates Exponential Moving Average (EMA) for trainee performance metrics.
 * Complies with ARCHITECTURE.md 5.3: alpha = 0.4, first valid sample seeds the EMA.
 */
export function updateEMA(currentEMA: number | null, observation: number, alpha = 0.4): number {
  if (currentEMA === null) return observation;
  return alpha * observation + (1 - alpha) * currentEMA;
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

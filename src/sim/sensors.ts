/**
 * Sensor mathematics: SNR, Probability of Detection (Pd), Track Quality (q),
 * and Classification Confidence (c_cls).
 * Complies strictly with PRD 3.2, 5.3 and ARCHITECTURE.md 5.1.
 */

export const RCS_REF = 0.01; // m^2
export const R_REF = 3000;   // metres

/**
 * Radar Probability of Detection based on 4th-power range decay and radar equation SNR.
 * Pd = 1 - exp(-2.303 * SNR)
 */
export function computeRadarPd(rcsM2: number, rangeM: number, aEnv: number = 1.0): number {
  if (rangeM <= 0) return 1.0;
  if (aEnv <= 0) return 0.0;

  const snr = (rcsM2 / RCS_REF) * Math.pow(R_REF / rangeM, 4) * aEnv;
  const pd = 1 - Math.exp(-2.303 * snr);
  return Math.max(0, Math.min(1, pd));
}

/**
 * Fuses track quality q across active sensing modalities:
 * q = 1 - (1 - q_radar) * (1 - q_eo) * (1 - q_rf)
 */
export function fuseTrackQuality(qRadar: number, qEo: number, qRf: number): number {
  const q = 1 - (1 - qRadar) * (1 - qEo) * (1 - qRf);
  return Math.max(0, Math.min(1, q));
}

/**
 * Fuses classification confidence hint c_cls across sensors currently observing:
 * c_cls = 1 - product(1 - c_i)
 */
export function fuseClassificationConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  let complement = 1.0;
  for (const c of confidences) {
    complement *= 1.0 - Math.max(0, Math.min(1, c));
  }
  return Math.max(0, Math.min(1, 1.0 - complement));
}

/**
 * Computes ghost coasting uncertainty ellipse sigma(t) and decayed track quality q(t)
 * during terrain/sensor masking.
 * sigma(t) = sigma0 + 12 * dt
 * q decays linearly to 0 over 8000 ms.
 */
export function computeCoastingState(
  elapsedMaskedMs: number,
  initialQ: number = 0.8
): { q: number; ghostSigmaM: number } {
  const dtSec = elapsedMaskedMs / 1000;
  const ghostSigmaM = 10 + 12 * dtSec;

  const qDecay = Math.max(0, 1 - elapsedMaskedMs / 8000);
  const q = initialQ * qDecay;

  return { q, ghostSigmaM };
}

/**
 * Calculates Radar SNR and Probability of Detection (Pd) based on RCS, Range, and environment attenuation.
 * Complies with PRD 3.2 radar equation.
 */
export function calculateRadarPd(
  rcsM2: number,
  rangeM: number,
  aEnv: number = 1.0
): { snr: number; pd: number } {
  if (rangeM <= 0 || aEnv <= 0) return { snr: 0, pd: 0 };
  const snr = (rcsM2 / RCS_REF) * Math.pow(R_REF / rangeM, 4) * aEnv;
  const pd = Math.max(0, Math.min(1, 1 - Math.exp(-2.303 * Math.max(0, snr))));
  return { snr, pd };
}

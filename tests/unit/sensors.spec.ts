import { describe, it, expect } from 'vitest';
import {
  computeRadarPd,
  fuseTrackQuality,
  computeCoastingState,
  fuseClassificationConfidence,
} from '@/sim/sensors';

describe('Radar & Sensor Mathematics (SNR, Pd, Fused Quality, Coasting)', () => {
  it('reference target (RCS 0.01 m^2) at 3 km gives Pd approx 0.90', () => {
    const pd = computeRadarPd(0.01, 3000, 1.0);
    expect(pd).toBeCloseTo(0.9, 2);
  });

  it('reference target at 6 km gives Pd approx 0.14', () => {
    const pd = computeRadarPd(0.01, 6000, 1.0);
    expect(pd).toBeCloseTo(0.134, 2);
  });

  it('severe rain clutter (A_env = 0.6) degrades Pd at 3 km', () => {
    const clearPd = computeRadarPd(0.01, 3000, 1.0);
    const rainPd = computeRadarPd(0.01, 3000, 0.6);
    expect(rainPd).toBeLessThan(clearPd);
    expect(rainPd).toBeCloseTo(0.75, 2);
  });

  it('radar dropout (A_env = 0) zeroes Pd completely', () => {
    const dropoutPd = computeRadarPd(0.01, 3000, 0.0);
    expect(dropoutPd).toBe(0.0);
  });

  it('track quality fusion correctly fuses multiple modalities', () => {
    // Single radar: 0.8 -> fused = 0.8
    expect(fuseTrackQuality(0.8, 0, 0)).toBeCloseTo(0.8, 2);

    // Radar (0.8) + EO/IR (0.7) -> 1 - (1 - 0.8)(1 - 0.7) = 1 - 0.2 * 0.3 = 0.94
    expect(fuseTrackQuality(0.8, 0.7, 0)).toBeCloseTo(0.94, 2);

    // RF alone (0.4) is below Q_min (0.6)
    expect(fuseTrackQuality(0, 0, 0.4)).toBe(0.4);
    expect(fuseTrackQuality(0, 0, 0.4)).toBeLessThan(0.6);
  });

  it('classification confidence fuses correctly', () => {
    // Radar (0.5) + RF (0.9) -> 1 - (1 - 0.5)(1 - 0.9) = 1 - 0.05 = 0.95
    const fused = fuseClassificationConfidence([0.5, 0.9]);
    expect(fused).toBeCloseTo(0.95, 2);
  });

  it('coasting decays track quality q below Q_min (0.6) within 2.1 seconds', () => {
    // At t = 0
    const state0 = computeCoastingState(0, 0.8);
    expect(state0.q).toBe(0.8);

    // At t = 2100 ms (> 2 s)
    const state21 = computeCoastingState(2100, 0.8);
    // 0.8 * (1 - 2100 / 8000) = 0.8 * (1 - 0.2625) = 0.8 * 0.7375 = 0.59 < 0.60
    expect(state21.q).toBeLessThan(0.6);

    // At t = 8000 ms, q is completely 0
    const state80 = computeCoastingState(8000, 0.8);
    expect(state80.q).toBe(0.0);
  });
});

import { describe, it, expect } from 'vitest';
import { evaluateMasking, isPointInPolygon, isMasked } from '@/sim/masking';
import type { ZoneSpec } from '@/sim/types';

describe('Terrain Masking Engine (URBAN, RIDGE, FOREST)', () => {
  const testUrbanZone: ZoneSpec = {
    id: 'U1',
    type: 'URBAN',
    polygon: [
      [1000, 1000],
      [2000, 1000],
      [2000, 2000],
      [1000, 2000],
    ],
    heightM: 40,
    shadowM: 800,
    rho: 0.8,
  };

  it('correctly tests point in polygon', () => {
    expect(isPointInPolygon(1500, 1500, testUrbanZone.polygon)).toBe(true);
    expect(isPointInPolygon(500, 500, testUrbanZone.polygon)).toBe(false);
  });

  it('masks target inside zone below roofline', () => {
    // Inside zone at 1500, 1500, z = 20m (< 40m roofline)
    const result = evaluateMasking({ x: 1500, y: 1500, z: 20 }, [testUrbanZone]);
    expect(result.isMasked).toBe(true);
  });

  it('does NOT mask target inside zone flying above roofline', () => {
    // Inside zone at 1500, 1500, z = 120m (> 40m roofline)
    const result = evaluateMasking({ x: 1500, y: 1500, z: 120 }, [testUrbanZone]);
    expect(result.isMasked).toBe(false);
  });

  it('masks target behind zone within shadow distance when elevation is below mask angle', () => {
    // Ray from (0,0) passes through (1000, 1000) at range ~1414m.
    // Target at (1800, 1800) is at range ~2545m (1131m past near edge > 800m shadow).
    // Let's place target at (1300, 1300):
    // Near edge intersection at (1000, 1000) ~ 1414m. Target at (1300, 1300) ~ 1838m.
    // 1838 - 1414 = 424m <= 800m shadow.
    // Near edge: d_n = 1414m. H = 40m, h_r = 15m.
    // theta_mask = atan2(40 - 15, 1414) = atan2(25, 1414) = 0.01768 rad.
    // Target z = 20m -> theta_t = atan2(20 - 15, 1838) = atan2(5, 1838) = 0.00272 rad < theta_mask.
    // Target is masked!
    const maskedBehind = evaluateMasking({ x: 1300, y: 1300, z: 20 }, [testUrbanZone]);
    expect(maskedBehind.isMasked).toBe(true);
  });

  it('does NOT mask target located beyond the shadow length L', () => {
    // Target at (2500, 2500) is range ~3535m.
    // Dist past near edge is 3535 - 1414 = 2121m > 800m shadow.
    const beyondShadow = evaluateMasking({ x: 2500, y: 2500, z: 20 }, [testUrbanZone]);
    expect(beyondShadow.isMasked).toBe(false);
  });

  it('does NOT mask target that does not cross the polygon ray path', () => {
    // Target on negative X axis (-2000, 0, z = 20)
    const unmasked = evaluateMasking({ x: -2000, y: 0, z: 20 }, [testUrbanZone]);
    expect(unmasked.isMasked).toBe(false);
  });

  it('isMasked helper evaluates elevation angle and shadow range', () => {
    const res = isMasked({ x: 2000, y: 1500, z: 20 }, { x: 0, y: 0, antennaHeightM: 15 }, testUrbanZone);
    expect(res).toHaveProperty('masked');
    expect(res).toHaveProperty('thetaT');
    expect(res).toHaveProperty('thetaMask');
  });
});

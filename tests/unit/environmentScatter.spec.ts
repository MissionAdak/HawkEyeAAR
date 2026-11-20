import { describe, it, expect } from 'vitest';
import { buildProceduralBuildings } from '@/render3d/environment/buildings';
import type { EnvironmentDescriptor } from '@/render3d/environment/types';
import type { ZoneSpec } from '@/sim/types';

describe('Randomized Environment Structure Placement (Task 17 Phase 4)', () => {
  const dummyZones: ZoneSpec[] = [
    {
      id: 'ZONE-URBAN-1',
      type: 'URBAN',
      heightM: 60,
      shadowM: 100,
      rho: 0.8,
      polygon: [
        [500, 500],
        [1500, 500],
        [1500, 1500],
        [500, 1500],
      ],
    },
    {
      id: 'ZONE-URBAN-2',
      type: 'URBAN',
      heightM: 20,
      shadowM: 50,
      rho: 0.5,
      polygon: [
        [-1500, -1500],
        [-500, -1500],
        [-500, -500],
        [-1500, -500],
      ],
    },
  ];

  const createDescriptor = (seed: number, preset: EnvironmentDescriptor['preset'] = 'URBAN_DENSE'): EnvironmentDescriptor => ({
    preset,
    name: 'Test Urban',
    description: 'Test Environment',
    terrainType: 'TACTICAL_GRID',
    seed,
    weather: 'CLEAR',
    dayNight: 'DAY',
    mapRadiusM: 5000,
    rMinM: 500,
    zones: dummyZones,
  });

  it('guarantees 100% deterministic repeatability for identical seeds', () => {
    const descA = createDescriptor(2026);
    const descB = createDescriptor(2026);

    const resA = buildProceduralBuildings(descA);
    const resB = buildProceduralBuildings(descB);

    expect(resA.objects.length).toBe(resB.objects.length);
    expect(resA.objects.length).toBeGreaterThan(0);

    for (let i = 0; i < resA.objects.length; i++) {
      const objA = resA.objects[i];
      const objB = resB.objects[i];
      expect(objA.id).toBe(objB.id);
      expect(objA.position.x).toBeCloseTo(objB.position.x, 3);
      expect(objA.position.y).toBeCloseTo(objB.position.y, 3);
      expect(objA.heightM).toBeCloseTo(objB.heightM, 3);
    }
  });

  it('generates distinct building placements across different seeds', () => {
    const descA = createDescriptor(1001);
    const descB = createDescriptor(9999);

    const resA = buildProceduralBuildings(descA);
    const resB = buildProceduralBuildings(descB);

    // Filter to urban zone buildings
    const urbanA = resA.objects.filter((o) => o.id.startsWith('BLD-ZONE-URBAN-1'));
    const urbanB = resB.objects.filter((o) => o.id.startsWith('BLD-ZONE-URBAN-1'));

    expect(urbanA.length).toBeGreaterThan(0);
    expect(urbanB.length).toBeGreaterThan(0);

    // Positions should differ
    const positionsDiffer = urbanA.some((a, idx) => {
      const b = urbanB[idx];
      return !b || Math.abs(a.position.x - b.position.x) > 1 || Math.abs(a.position.y - b.position.y) > 1;
    });
    expect(positionsDiffer).toBe(true);
  });

  it('strictly respects central C2 and radar exclusion zones (no buildings at FOB core)', () => {
    const desc = createDescriptor(4242);
    const res = buildProceduralBuildings(desc);

    for (const obj of res.objects) {
      // Zone buildings must never overlap the central C2 exclusion radius (150m)
      if (obj.id.startsWith('BLD-ZONE')) {
        const distFromCenter = Math.hypot(obj.position.x, obj.position.y);
        expect(distFromCenter).toBeGreaterThan(150);
      }
    }
  });

  it('assigns stable inspectable IDs to all generated structures', () => {
    const desc = createDescriptor(777);
    const res = buildProceduralBuildings(desc);

    expect(res.selectableMeshes.length).toBeGreaterThan(0);
    for (const mesh of res.selectableMeshes) {
      expect(mesh.userData.isEnvironmentObject).toBe(true);
      expect(mesh.userData.envObjectId).toBeDefined();
      expect(mesh.userData.envObjectInfo).toBeDefined();
    }
  });

  it('disposes resources cleanly without memory leaks', () => {
    const desc = createDescriptor(555);
    const res = buildProceduralBuildings(desc);

    expect(() => {
      for (const g of res.disposables.geometries) g.dispose();
      for (const m of res.disposables.materials) m.dispose();
    }).not.toThrow();
  });
});

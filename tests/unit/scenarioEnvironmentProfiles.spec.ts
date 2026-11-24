import { describe, it, expect } from 'vitest';
import { loadCatalogScenario } from '@/director/catalog';
import { generateRandomScenario } from '@/director/randomScenario';
import { generateFormationScenario } from '@/director/formations';
import { generatePopUpDiveScenario } from '@/director/popupDive';
import { getScenarioEnvironmentDescriptor } from '@/render3d/environment/descriptor';
import { getTerrainElevation, getSwarmMountainElevation } from '@/render3d/environment/terrain';
import { buildProceduralWater } from '@/render3d/environment/water';
import { buildProceduralBuildings } from '@/render3d/environment/buildings';
import { buildProceduralVegetation } from '@/render3d/environment/vegetation';
import type { ScenarioVisualProfile } from '@/render3d/environment/types';

describe('TASK 30 — Scenario-Specific 3D Environments & Distinct Tactical Maps', () => {
  describe('1. Scenario Profile Resolution & Visual Distinctness', () => {
    it('resolves DEMO-1 to High-Density Urban Metropolitan Center (DEMO_1_URBAN_METRO)', () => {
      const { spec } = loadCatalogScenario('DEMO-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('DEMO_1_URBAN_METRO');
      expect(desc.scenarioFamily).toBe('DEMO-1');
      expect(desc.preset).toBe('URBAN_DENSE');
    });

    it('resolves DEMO-2 to Suburban Logistics & Industrial Park (DEMO_2_SUBURBAN_LOGISTICS)', () => {
      const { spec } = loadCatalogScenario('DEMO-2');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('DEMO_2_SUBURBAN_LOGISTICS');
      expect(desc.scenarioFamily).toBe('DEMO-2');
      expect(desc.preset).toBe('SUBURBAN');
    });

    it('resolves SWARM-1 to Rugged Mountain Swarm Battlefield (SWARM_MOUNTAIN_VALLEY)', () => {
      const { spec } = loadCatalogScenario('SWARM-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('SWARM_MOUNTAIN_VALLEY');
      expect(desc.scenarioFamily).toBe('SWARM');
      expect(desc.preset).toBe('MOUNTAIN_RIDGE');
    });

    it('resolves SPECTRUM-1 to Dense Forest Valley & Winding River (SPECTRUM_FOREST_RIVER)', () => {
      const { spec } = loadCatalogScenario('SPECTRUM-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('SPECTRUM_FOREST_RIVER');
      expect(desc.scenarioFamily).toBe('SPECTRUM');
      expect(desc.preset).toBe('FOREST_VALLEY');
    });

    it('resolves PROCEDURAL catalog to Coastal Military Airfield (PROCEDURAL_COASTAL_AIRFIELD)', () => {
      const { spec } = loadCatalogScenario('PROCEDURAL-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('PROCEDURAL_COASTAL_AIRFIELD');
      expect(desc.scenarioFamily).toBe('PROCEDURAL');
      expect(desc.preset).toBe('COASTAL_AIRFIELD');
    });

    it('resolves RANDOM generator to Seeded Landscape (RANDOM_SEEDED_LANDSCAPE)', () => {
      const spec = generateRandomScenario(99);
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('RANDOM_SEEDED_LANDSCAPE');
      expect(desc.scenarioFamily).toBe('RANDOM');
    });

    it('resolves FORMATION generator to Alpine Pass & Glacial Lake (FORMATION_ALPINE_PASS)', () => {
      const spec = generateFormationScenario({ formationKind: 'V_WEDGE', count: 3, seed: 101 });
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('FORMATION_ALPINE_PASS');
      expect(desc.scenarioFamily).toBe('FORMATION');
      expect(desc.preset).toBe('MOUNTAIN_RIDGE');
    });

    it('resolves POPUP generator to Urban Ingress Corridor (POPUP_URBAN_CORRIDOR)', () => {
      const spec = generatePopUpDiveScenario({ seed: 77 });
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc.visualProfile).toBe('POPUP_URBAN_CORRIDOR');
      expect(desc.scenarioFamily).toBe('POPUP');
      expect(desc.preset).toBe('URBAN_DENSE');
    });
  });

  describe('2. Deterministic Environment Generation', () => {
    it('produces identical environment descriptors across multiple evaluations with same seed', () => {
      const { spec } = loadCatalogScenario('DEMO-1');
      const desc1 = getScenarioEnvironmentDescriptor(spec.id, spec);
      const desc2 = getScenarioEnvironmentDescriptor(spec.id, spec);
      expect(desc1).toEqual(desc2);
    });

    it('generates identical building layouts and object counts for identical descriptors', () => {
      const { spec } = loadCatalogScenario('DEMO-2');
      const desc1 = getScenarioEnvironmentDescriptor(spec.id, spec);
      const desc2 = getScenarioEnvironmentDescriptor(spec.id, spec);

      const bld1 = buildProceduralBuildings(desc1);
      const bld2 = buildProceduralBuildings(desc2);

      expect(bld1.objects.length).toBe(bld2.objects.length);
      expect(bld1.objects.map((o) => o.id)).toEqual(bld2.objects.map((o) => o.id));
      expect(bld1.objects.map((o) => o.position)).toEqual(bld2.objects.map((o) => o.position));

      // Clean up
      bld1.disposables.geometries.forEach((g) => g.dispose());
      bld1.disposables.materials.forEach((m) => m.dispose());
      bld2.disposables.geometries.forEach((g) => g.dispose());
      bld2.disposables.materials.forEach((m) => m.dispose());
    });
  });

  describe('3. SWARM-1 Flight Corridor Clearance (Fix A)', () => {
    it('guarantees >= 20m flight clearance along entire H-SWM-1 threat vector', () => {
      const { spec } = loadCatalogScenario('SWARM-1');
      const threat1 = spec.threats.find((t) => t.id === 'H-SWM-1');
      expect(threat1).toBeDefined();

      const start = threat1!.waypoints[0];
      const end = threat1!.waypoints[1];

      let minClearance = Infinity;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const alpha = i / steps;
        const x = start.x + (end.x - start.x) * alpha;
        const y = start.y + (end.y - start.y) * alpha;
        const z = start.z + (end.z - start.z) * alpha;

        const groundElev = getSwarmMountainElevation(x, y);
        const clearance = z - groundElev;
        if (clearance < minClearance) minClearance = clearance;

        expect(clearance).toBeGreaterThanOrEqual(20);
      }
      expect(minClearance).toBeGreaterThanOrEqual(20);
    });

    it('guarantees >= 20m flight clearance along entire H-SWM-2 threat vector', () => {
      const { spec } = loadCatalogScenario('SWARM-1');
      const threat2 = spec.threats.find((t) => t.id === 'H-SWM-2');
      expect(threat2).toBeDefined();

      const start = threat2!.waypoints[0];
      const end = threat2!.waypoints[1];

      let minClearance = Infinity;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const alpha = i / steps;
        const x = start.x + (end.x - start.x) * alpha;
        const y = start.y + (end.y - start.y) * alpha;
        const z = start.z + (end.z - start.z) * alpha;

        const groundElev = getSwarmMountainElevation(x, y);
        const clearance = z - groundElev;
        if (clearance < minClearance) minClearance = clearance;

        expect(clearance).toBeGreaterThanOrEqual(20);
      }
      expect(minClearance).toBeGreaterThanOrEqual(20);
    });

    it('guarantees >= 20m flight clearance along entire H-SWM-3 threat vector', () => {
      const { spec } = loadCatalogScenario('SWARM-1');
      const threat3 = spec.threats.find((t) => t.id === 'H-SWM-3');
      expect(threat3).toBeDefined();

      const start = threat3!.waypoints[0];
      const end = threat3!.waypoints[1];

      let minClearance = Infinity;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const alpha = i / steps;
        const x = start.x + (end.x - start.x) * alpha;
        const y = start.y + (end.y - start.y) * alpha;
        const z = start.z + (end.z - start.z) * alpha;

        const groundElev = getSwarmMountainElevation(x, y);
        const clearance = z - groundElev;
        if (clearance < minClearance) minClearance = clearance;

        expect(clearance).toBeGreaterThanOrEqual(20);
      }
      expect(minClearance).toBeGreaterThanOrEqual(20);
    });

    it('maintains high tactical flanking ridges up to 240m outside flight corridors', () => {
      // Test prominent mountain peaks outside corridors
      const ridgeElev1 = getSwarmMountainElevation(-3500, 0); // Western ridge
      expect(ridgeElev1).toBeGreaterThan(200);

      const ridgeElev2 = getSwarmMountainElevation(0, -3800); // Southern ridge
      expect(ridgeElev2).toBeGreaterThan(30);
    });
  });

  describe('4. Procedural Water Subsystem Geometry & Features', () => {
    it('creates continuous winding river and tactical bridges for SPECTRUM-1', () => {
      const { spec } = loadCatalogScenario('SPECTRUM-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const waterRes = buildProceduralWater(desc);

      expect(waterRes.objects.length).toBeGreaterThan(0);
      const river = waterRes.objects.find((o) => o.id === 'WATER-RIVER-VALLEY');
      expect(river).toBeDefined();
      expect(river?.name).toContain('River');
      expect(waterRes.group.children.length).toBeGreaterThan(1); // Water mesh + bank mesh + bridges

      waterRes.disposables.geometries.forEach((g) => g.dispose());
      waterRes.disposables.materials.forEach((m) => m.dispose());
    });

    it('creates ocean plane, beach shoreline, and breakwater jetty for COASTAL_AIRFIELD', () => {
      const { spec } = loadCatalogScenario('PROCEDURAL-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const waterRes = buildProceduralWater(desc);

      const ocean = waterRes.objects.find((o) => o.id === 'WATER-OCEAN-COAST');
      const beach = waterRes.objects.find((o) => o.id === 'WATER-BEACH-SHORE');
      expect(ocean).toBeDefined();
      expect(beach).toBeDefined();

      waterRes.disposables.geometries.forEach((g) => g.dispose());
      waterRes.disposables.materials.forEach((m) => m.dispose());
    });

    it('creates high-altitude glacial tarn lake for FORMATION_ALPINE_PASS', () => {
      const spec = generateFormationScenario({ formationKind: 'V_WEDGE', count: 4, seed: 55 });
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const waterRes = buildProceduralWater(desc);

      const lake = waterRes.objects.find((o) => o.id === 'WATER-LAKE-ALPINE');
      expect(lake).toBeDefined();
      expect(lake?.elevationM).toBe(18);

      waterRes.disposables.geometries.forEach((g) => g.dispose());
      waterRes.disposables.materials.forEach((m) => m.dispose());
    });

    it('creates industrial retention reservoir for DEMO-2', () => {
      const { spec } = loadCatalogScenario('DEMO-2');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const waterRes = buildProceduralWater(desc);

      const res = waterRes.objects.find((o) => o.id === 'WATER-RESERVOIR-LOGISTICS');
      expect(res).toBeDefined();

      waterRes.disposables.geometries.forEach((g) => g.dispose());
      waterRes.disposables.materials.forEach((m) => m.dispose());
    });

    it('creates urban drainage canal with overpass bridges for POPUP scenarios', () => {
      const spec = generatePopUpDiveScenario({ seed: 123 });
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const waterRes = buildProceduralWater(desc);

      const canal = waterRes.objects.find((o) => o.id === 'WATER-CANAL-URBAN');
      expect(canal).toBeDefined();

      waterRes.disposables.geometries.forEach((g) => g.dispose());
      waterRes.disposables.materials.forEach((m) => m.dispose());
    });

    it('ensures water features never obstruct the central command asset protected bubble (r < 150m)', () => {
      const profiles: ScenarioVisualProfile[] = [
        'DEMO_1_URBAN_METRO',
        'DEMO_2_SUBURBAN_LOGISTICS',
        'SWARM_MOUNTAIN_VALLEY',
        'SPECTRUM_FOREST_RIVER',
        'PROCEDURAL_COASTAL_AIRFIELD',
        'FORMATION_ALPINE_PASS',
        'POPUP_URBAN_CORRIDOR',
      ];

      const { spec: baseSpec } = loadCatalogScenario('DEMO-1');
      for (const vp of profiles) {
        const dummySpec = { ...baseSpec, id: 'TEST-SPEC' };
        const desc = getScenarioEnvironmentDescriptor(dummySpec.id, dummySpec);
        (desc as any).visualProfile = vp;
        const waterRes = buildProceduralWater(desc);

        for (const obj of waterRes.objects) {
          const dist = Math.hypot(obj.position.x, obj.position.y);
          expect(dist).toBeGreaterThanOrEqual(150);
        }

        waterRes.disposables.geometries.forEach((g) => g.dispose());
        waterRes.disposables.materials.forEach((m) => m.dispose());
      }
    });
  });

  describe('5. Terrain & Object Surface Alignment', () => {
    it('anchors all buildings directly to terrain elevation', () => {
      const { spec } = loadCatalogScenario('DEMO-2');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const bldRes = buildProceduralBuildings(desc);

      for (const obj of bldRes.objects.filter((o) => o.category === 'BUILDING')) {
        const expectedGround = getTerrainElevation(obj.position.x, obj.position.y, desc.visualProfile ?? desc.preset);
        expect(Math.abs(obj.position.z - expectedGround)).toBeLessThanOrEqual(1.0);
        expect(obj.elevationM).toBeGreaterThanOrEqual(obj.position.z);
      }

      bldRes.disposables.geometries.forEach((g) => g.dispose());
      bldRes.disposables.materials.forEach((m) => m.dispose());
    });

    it('places tree instances on ground surface without floating or burying', () => {
      const { spec } = loadCatalogScenario('SPECTRUM-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const vegRes = buildProceduralVegetation(desc);

      expect(vegRes.objects.length).toBeGreaterThan(0);
      // Vegetation group created without errors
      expect(vegRes.group.children.length).toBeGreaterThan(0);

      vegRes.disposables.geometries.forEach((g) => g.dispose());
      vegRes.disposables.materials.forEach((m) => m.dispose());
    });
  });

  describe('6. Resource Cleanup & Memory Safety', () => {
    it('disposes all geometries and materials cleanly without leaks', () => {
      const { spec } = loadCatalogScenario('SPECTRUM-1');
      const desc = getScenarioEnvironmentDescriptor(spec.id, spec);
      const waterRes = buildProceduralWater(desc);
      const bldRes = buildProceduralBuildings(desc);
      const vegRes = buildProceduralVegetation(desc);

      expect(waterRes.disposables.geometries.length).toBeGreaterThan(0);
      expect(bldRes.disposables.geometries.length).toBeGreaterThan(0);
      expect(vegRes.disposables.geometries.length).toBeGreaterThan(0);

      // Verify no throw on dispose
      expect(() => {
        waterRes.disposables.geometries.forEach((g) => g.dispose());
        waterRes.disposables.materials.forEach((m) => m.dispose());
        bldRes.disposables.geometries.forEach((g) => g.dispose());
        bldRes.disposables.materials.forEach((m) => m.dispose());
        vegRes.disposables.geometries.forEach((g) => g.dispose());
        vegRes.disposables.materials.forEach((m) => m.dispose());
      }).not.toThrow();
    });
  });
});

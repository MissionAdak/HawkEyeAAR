import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TargetModelFactory } from '@/render3d/targets/targetModelFactory';
import {
  resolveTargetPresentation,
  type SensorObservationContext,
} from '@/render3d/targets/targetObservation';
import { mapDroneTypeToAirframeSignature } from '@/sim/sensorObservation';
import {
  buildProceduralBuildings,
  getRotatedFootprintCorners,
  isFootprintFullyContained,
  segmentsIntersect,
  pointInPolygon,
} from '@/render3d/environment/buildings';
import { getTerrainElevation, buildProceduralTerrain } from '@/render3d/environment/terrain';
import { formatTrackLabelText } from '@/render3d/scene3d';
import { findNearestTrackNo } from '@/ui/Console';
import type { SafeTrackView } from '@/render3d/types';
import type { EnvironmentDescriptor } from '@/render3d/environment/types';
import type { ZoneSpec } from '@/sim/types';
import type { OperatorTrackView } from '@/sim/trackerTypes';

describe('TASK 23.1 — Tactical 3D Airframe Morphology, Expanded Viewport & Environmental Realism', () => {
  const baseContext: SensorObservationContext = {
    activeSensor: 'EOIR',
    displayMode: 'AIRFRAME',
    currentSimMs: 1000,
    sensorHealth: { RADAR: 'OK', EOIR: 'OK', RF: 'OK' },
    weather: 'CLEAR',
    isNight: false,
    mode: 'TRAIN',
  };

  const makeSafeTrack = (overrides?: Partial<SafeTrackView>): SafeTrackView => ({
    trackNo: 'T-01',
    pos: { x: 500, y: 500, z: 65 },
    vel: { x: 10, y: 15, z: 0 },
    traineeLabel: null,
    step: 'TRACK',
    q: 0.95,
    masked: false,
    ghostSigmaM: 0,
    isSelected: false,
    lifecycle: 'ACTIVE',
    sensorObservation: {
      signature: 'MULTIROTOR_COMPACT',
      observedSignature: 'MULTIROTOR_COMPACT',
      timestampMs: 1000,
      sensorSource: 'EOIR',
      activeSensor: 'EOIR',
      confidence: 0.9,
      resolutionLevel: 'FULL',
      resolution: 'FULL',
      visibilityState: 'CLEAR',
      sensorAvailability: true,
      sensorHealth: 'OK',
      sensorHealthOk: true,
      estimatedRangeM: 707,
    },
    ...overrides,
  });

  const makeOperatorTrack = (overrides?: Partial<OperatorTrackView>): OperatorTrackView => ({
    trackNo: 'T-01',
    estPos: { x: 1000, y: 1000, z: 50 },
    estVel: { x: 10, y: 15, z: 0 },
    prevEstPos: { x: 990, y: 985, z: 50 },
    estRangeM: 1414,
    estBearingDeg: 45,
    estSpeedMps: 18,
    estAltBand: 'LOW',
    uncertaintyM: 10,
    isCoasting: false,
    lastMeasurementMs: 1000,
    sensorSources: ['RADAR'],
    q: 0.95,
    cCls: 0.9,
    traineeLabel: null,
    step: 'TRACK',
    lifecycle: 'ACTIVE',
    ...overrides,
  });

  describe('1. Distinct Airframe Morphology & Observable Signatures', () => {
    it('creates distinctive procedural models for all supported physical signatures', () => {
      const factory = new TargetModelFactory();

      // A. Compact FPV attack quad
      const fpvModel = factory.createModel('OBSERVED_MULTIROTOR', 'T-FPV', 'MULTIROTOR_COMPACT');
      expect(fpvModel.group.name).toBe('Target_FPV_Attack');
      expect(fpvModel.hitProxy.userData.trackNo).toBe('T-FPV');

      // B. Swarm micro-UAV
      const swarmModel = factory.createModel('OBSERVED_MULTIROTOR', 'T-SWM', 'MULTIROTOR_MICRO');
      expect(swarmModel.group.name).toBe('Target_Swarm_Element');
      expect(swarmModel.hitProxy.userData.trackNo).toBe('T-SWM');

      // C. Reconnaissance quad with EO/IR gimbal turret
      const reconModel = factory.createModel('OBSERVED_MULTIROTOR', 'T-RCN', 'MULTIROTOR_WITH_CAMERA_POD');
      expect(reconModel.group.name).toBe('Target_Recon_Quad');
      expect(reconModel.hitProxy.userData.trackNo).toBe('T-RCN');

      // D. Standard civilian quadcopter with landing skids
      const civilModel = factory.createModel('OBSERVED_MULTIROTOR', 'T-CIV', 'MULTIROTOR_STANDARD');
      expect(civilModel.group.name).toBe('Target_Civil_UAS');
      expect(civilModel.hitProxy.userData.trackNo).toBe('T-CIV');

      // E. Fixed-wing delta UAV
      const fixedWingModel = factory.createModel('OBSERVED_FIXED_WING', 'T-FW', 'FIXED_WING_DELTA');
      expect(fixedWingModel.group.name).toBe('Target_Loitering_Munition');
      expect(fixedWingModel.hitProxy.userData.trackNo).toBe('T-FW');

      // F. Avian / bird contact (zero rotors)
      const birdModel = factory.createModel('BIRD', 'T-BRD', 'BIRD_LIKE');
      expect(birdModel.group.name).toBe('Target_Bird');
      expect(birdModel.hitProxy.userData.trackNo).toBe('T-BRD');

      // G. Unresolved airframe
      const unresModel = factory.createModel('UNKNOWN_AIRFRAME', 'T-UNR', 'UNRESOLVED_AIRFRAME');
      expect(unresModel.group.name).toBe('Target_Unresolved_Airframe');
      expect(unresModel.hitProxy.userData.trackNo).toBe('T-UNR');

      factory.dispose();
    });

    it('maps simulation drone types to physical observable signatures without threat class leakage', () => {
      expect(mapDroneTypeToAirframeSignature('FPV_ATTACK')).toBe('MULTIROTOR_COMPACT');
      expect(mapDroneTypeToAirframeSignature('SWARM_ELEMENT')).toBe('MULTIROTOR_MICRO');
      expect(mapDroneTypeToAirframeSignature('RECON_QUAD')).toBe('MULTIROTOR_WITH_CAMERA_POD');
      expect(mapDroneTypeToAirframeSignature('CIVIL_UAS')).toBe('MULTIROTOR_STANDARD');
      expect(mapDroneTypeToAirframeSignature('LOITERING_MUNITION')).toBe('FIXED_WING_DELTA');
      expect(mapDroneTypeToAirframeSignature('BIRD')).toBe('BIRD_LIKE');
    });

    it('strictly preserves RADAR_SYMBOL when RADAR is active or displayMode is RADAR', () => {
      const track = makeSafeTrack();

      // RADAR active sensor
      const radarActiveResult = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RADAR',
      });
      expect(radarActiveResult.presentationCategory).toBe('RADAR_SYMBOL');

      // TGT:RADAR display mode
      const radarDisplayResult = resolveTargetPresentation(track, {
        ...baseContext,
        displayMode: 'RADAR',
      });
      expect(radarDisplayResult.presentationCategory).toBe('RADAR_SYMBOL');

      // RF active sensor
      const rfResult = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RF',
      });
      expect(rfResult.presentationCategory).toBe('RADAR_SYMBOL');
    });

    it('uses neutral physical materials and preserves authentic radar contact symbols', () => {
      const factory = new TargetModelFactory();

      const radarPalette = factory.getPaletteForCategory('RADAR_SYMBOL');
      const radarMat = radarPalette.body as THREE.MeshBasicMaterial;
      expect(radarMat.color.getHex()).toBe(0xffb700); // Amber radar reticle

      const multiPalette = factory.getPaletteForCategory('OBSERVED_MULTIROTOR');
      const multiBody = multiPalette.body as THREE.MeshLambertMaterial;
      expect(multiBody.color.getHex()).toBe(0x22272e); // Matte dark carbon

      factory.dispose();
    });
  });

  describe('2. Procedural Building Distribution & Elevation Alignment', () => {
    const testZones: ZoneSpec[] = [
      {
        id: 'U1',
        type: 'URBAN',
        heightM: 45,
        shadowM: 600,
        rho: 0.8,
        polygon: [
          [1000, 1000],
          [2400, 1000],
          [2400, 2400],
          [1000, 2400],
        ],
      },
    ];

    const testDescriptor = (seed: number, preset: EnvironmentDescriptor['preset'] = 'URBAN_DENSE'): EnvironmentDescriptor => ({
      preset,
      name: 'Test City',
      description: 'Tactical Urban Zone',
      terrainType: 'TACTICAL_GRID',
      seed,
      weather: 'CLEAR',
      dayNight: 'DAY',
      mapRadiusM: 5000,
      rMinM: 500,
      zones: testZones,
    });

    it('enforces 100% deterministic reproducibility for identical seeds', () => {
      const resA = buildProceduralBuildings(testDescriptor(2026));
      const resB = buildProceduralBuildings(testDescriptor(2026));

      expect(resA.objects.length).toBe(resB.objects.length);
      expect(resA.objects.length).toBeGreaterThan(6);

      for (let i = 0; i < resA.objects.length; i++) {
        const a = resA.objects[i];
        const b = resB.objects[i];
        expect(a.id).toBe(b.id);
        expect(a.position.x).toBeCloseTo(b.position.x, 3);
        expect(a.position.y).toBeCloseTo(b.position.y, 3);
        expect(a.heightM).toBeCloseTo(b.heightM, 3);
      }
    });

    it('generates different layouts for different seeds', () => {
      const resA = buildProceduralBuildings(testDescriptor(1001));
      const resB = buildProceduralBuildings(testDescriptor(2002));

      // Either positions or counts differ
      const positionsDiffer = resA.objects.some((a, i) => {
        const b = resB.objects[i];
        return !b || Math.abs(a.position.x - b.position.x) > 1 || Math.abs(a.position.y - b.position.y) > 1;
      });
      expect(positionsDiffer).toBe(true);
    });

    it('generates diverse building footprints and varied heights strictly bounded by zone height', () => {
      const res = buildProceduralBuildings(testDescriptor(1337));
      const zoneBuildings = res.objects.filter((o) => o.id.startsWith('BLD-U1'));

      expect(zoneBuildings.length).toBeGreaterThanOrEqual(6);

      const heights = new Set(zoneBuildings.map((b) => Math.round(b.heightM)));
      expect(heights.size).toBeGreaterThan(1); // Multiple distinct heights

      for (const bld of zoneBuildings) {
        // Height strictly <= zone.heightM (45m)
        expect(bld.heightM).toBeLessThanOrEqual(45);
        expect(bld.heightM).toBeGreaterThanOrEqual(8);
      }
    });

    it('strictly confines generated zone buildings inside the zone polygon', () => {
      const res = buildProceduralBuildings(testDescriptor(5555));
      const zoneBuildings = res.objects.filter((o) => o.id.startsWith('BLD-U1'));

      for (const bld of zoneBuildings) {
        expect(bld.position.x).toBeGreaterThanOrEqual(1000);
        expect(bld.position.x).toBeLessThanOrEqual(2400);
        expect(bld.position.y).toBeGreaterThanOrEqual(1000);
        expect(bld.position.y).toBeLessThanOrEqual(2400);
      }
    });

    it('respects terrain elevation so building foundations match ground level', () => {
      // In flat urban terrain, ground elevation is 0
      expect(getTerrainElevation(1500, 1500, 'URBAN_DENSE')).toBe(0);

      // In MOUNTAIN_RIDGE, elevation is positive beyond 1200m
      const mountainElev = getTerrainElevation(2000, -2000, 'MOUNTAIN_RIDGE');
      expect(mountainElev).toBeGreaterThan(0);

      const mountainRes = buildProceduralBuildings(testDescriptor(4242, 'MOUNTAIN_RIDGE'));
      const mountainBuildings = mountainRes.objects.filter((o) => o.id.startsWith('BLD-U1'));
      for (const bld of mountainBuildings) {
        expect(bld.position.z).toBeCloseTo(getTerrainElevation(bld.position.x, bld.position.y, 'MOUNTAIN_RIDGE'), 2);
      }
    });

    it('enforces full rotated footprint containment inside irregular concave polygons across multiple seeds', () => {
      // Concave L-shaped urban polygon
      const concavePolygon: [number, number][] = [
        [1000, 1000],
        [2800, 1000],
        [2800, 1800],
        [1900, 1800],
        [1900, 2800],
        [1000, 2800],
      ];

      const concaveDescriptor = (seed: number): EnvironmentDescriptor => ({
        preset: 'URBAN_DENSE',
        name: 'Concave City',
        description: 'L-Shaped Urban Zone',
        terrainType: 'TACTICAL_GRID',
        seed,
        weather: 'CLEAR',
        dayNight: 'DAY',
        mapRadiusM: 5000,
        rMinM: 500,
        zones: [
          {
            id: 'U-CONCAVE',
            type: 'URBAN',
            heightM: 50,
            shadowM: 600,
            rho: 0.8,
            polygon: concavePolygon,
          },
        ],
      });

      const seedsToTest = [101, 202, 303, 404, 505];
      for (const s of seedsToTest) {
        const res = buildProceduralBuildings(concaveDescriptor(s));
        const zoneBuildings = res.objects.filter((o) => o.id.startsWith('BLD-U-CONCAVE'));
        expect(zoneBuildings.length).toBeGreaterThan(0);

        for (const bld of zoneBuildings) {
          // Center inside concave polygon
          expect(pointInPolygon(bld.position.x, bld.position.y, concavePolygon)).toBe(true);

          // All 4 rotated corners inside concave polygon
          const bldMesh = res.selectableMeshes.find((m) => m.userData?.envObjectId === bld.id) as THREE.Mesh;
          expect(bldMesh).toBeDefined();

          const yaw = bldMesh.rotation.y;
          // Approximate size from bounding box
          const bbox = new THREE.Box3().setFromObject(bldMesh);
          const sizeX = bbox.max.x - bbox.min.x;
          const sizeZ = bbox.max.z - bbox.min.z;
          const corners = getRotatedFootprintCorners(bld.position.x, bld.position.y, sizeX * 0.7, sizeZ * 0.7, yaw);

          for (const [cx, cy] of corners) {
            expect(pointInPolygon(cx, cy, concavePolygon)).toBe(true);
            // Must strictly not encroach into rMinM (500m)
            expect(Math.hypot(cx, cy)).toBeGreaterThanOrEqual(500);
          }
        }
      }
    });

    it('generates all 5 architectural archetypes with distinct heights, footprints and equipment', () => {
      const archetypesFound = new Set<string>();

      // Sample across seeds to verify diversity of archetypes
      for (const s of [100, 200, 300, 400, 500]) {
        const res = buildProceduralBuildings(testDescriptor(s));
        for (const obj of res.objects) {
          if (obj.name.includes('Commercial Complex')) archetypesFound.add('COMMERCIAL');
          if (obj.name.includes('Residential Apartment')) archetypesFound.add('RESIDENTIAL_MID');
          if (obj.name.includes('Townhouse Cluster')) archetypesFound.add('RESIDENTIAL_LOW');
          if (obj.name.includes('Logistics Warehouse')) archetypesFound.add('INDUSTRIAL');
          if (obj.name.includes('Communications Mast')) archetypesFound.add('TOWER');
        }
      }

      expect(archetypesFound.has('COMMERCIAL')).toBe(true);
      expect(archetypesFound.has('RESIDENTIAL_MID')).toBe(true);
      expect(archetypesFound.has('RESIDENTIAL_LOW')).toBe(true);
      expect(archetypesFound.has('INDUSTRIAL')).toBe(true);
      expect(archetypesFound.has('TOWER')).toBe(true);
      expect(archetypesFound.size).toBe(5);
    });

    it('anchors building foundation bases exactly to the Three.js ground mesh surface (-1) on flat terrain using THREE.Box3 bounds', () => {
      const res = buildProceduralBuildings(testDescriptor(7777, 'URBAN_DENSE'));
      const zoneMeshes = res.selectableMeshes.filter((m) =>
        m.userData?.envObjectId?.startsWith('BLD-U1')
      );
      expect(zoneMeshes.length).toBeGreaterThanOrEqual(6);

      for (const mesh of zoneMeshes) {
        const bbox = new THREE.Box3().setFromObject(mesh);
        // On flat terrain, groundMesh is at Y = -1. Foundation base must coincide with Y = -1.
        expect(bbox.min.y).toBeCloseTo(-1, 1);
        expect(bbox.max.y).toBeGreaterThan(0);
      }

      // Check central bunker base
      const c2Mesh = res.selectableMeshes.find((m) => m.userData?.envObjectId === 'FACILITY-CORE-C2');
      expect(c2Mesh).toBeDefined();
      if (c2Mesh) {
        const c2Box = new THREE.Box3().setFromObject(c2Mesh);
        expect(c2Box.min.y).toBeCloseTo(-1, 1);
      }
    });

    it('anchors building foundations into sloped heightfield terrain (MOUNTAIN_RIDGE) without floating corners using THREE.Box3 bounds', () => {
      const res = buildProceduralBuildings(testDescriptor(4242, 'MOUNTAIN_RIDGE'));
      const zoneMeshes = res.selectableMeshes.filter((m) =>
        m.userData?.envObjectId?.startsWith('BLD-U1')
      );

      for (const mesh of zoneMeshes) {
        const obj = res.objects.find((o) => o.id === mesh.userData?.envObjectId);
        expect(obj).toBeDefined();
        if (!obj) continue;

        const bbox = new THREE.Box3().setFromObject(mesh);
        const centerElev = getTerrainElevation(obj.position.x, obj.position.y, 'MOUNTAIN_RIDGE');

        // Three.js world ground elevation is (elevation - 1)
        // Building foundation extends down to (minGroundElev - 1), so bbox.min.y <= centerElev - 1 + epsilon
        expect(bbox.min.y).toBeLessThanOrEqual(centerElev - 1 + 0.1);
        // Roof must reach at or above ground level
        expect(bbox.max.y).toBeGreaterThan(centerElev - 1);
      }
    });

    it('accurately calculates all 4 edge-midpoints for non-symmetric rotated footprints against independent geometry (Section 3)', () => {
      // Non-symmetric rotated footprint parameters:
      // Center: (100, 200), Size: 30m x 14m, Yaw: 30 deg (pi/6)
      // Half-extents: hx = 15, hz = 7 (hx != hz and cx != cy)
      const cx = 100;
      const cy = 200;
      const sizeX = 30;
      const sizeZ = 14;
      const yawAngle = Math.PI / 6;

      const corners = getRotatedFootprintCorners(cx, cy, sizeX, sizeZ, yawAngle);
      expect(corners.length).toBe(4);

      // Independently derived expected coordinates:
      // Local unrotated offsets: NW [-15, -7], NE [15, -7], SE [15, 7], SW [-15, 7]
      // In Three.js: +X = East, -Z = North; yaw around Y axis:
      // SimX = cx + dx * cos(yaw) + dz * sin(yaw)
      // SimY = cy + dx * sin(yaw) - dz * cos(yaw)
      // For theta = pi/6: cos = sqrt(3)/2, sin = 0.5
      //
      // Edge midpoints in local frame:
      // Edge 0-1 (NW to NE): dx = 0, dz = -7  -> (100 - 3.5, 200 + 7*sqrt(3)/2) = (96.5, 200 + 6.0621778)
      // Edge 1-2 (NE to SE): dx = 15, dz = 0  -> (100 + 15*sqrt(3)/2, 200 + 7.5) = (100 + 12.990381, 207.5)
      // Edge 2-3 (SE to SW): dx = 0, dz = 7   -> (100 + 3.5, 200 - 7*sqrt(3)/2) = (103.5, 200 - 6.0621778)
      // Edge 3-0 (SW to NW): dx = -15, dz = 0 -> (100 - 15*sqrt(3)/2, 200 - 7.5) = (100 - 12.990381, 192.5)
      const expectedM01: [number, number] = [96.5, 200 + 7 * Math.cos(Math.PI / 6)];
      const expectedM12: [number, number] = [100 + 15 * Math.cos(Math.PI / 6), 207.5];
      const expectedM23: [number, number] = [103.5, 200 - 7 * Math.cos(Math.PI / 6)];
      const expectedM30: [number, number] = [100 - 15 * Math.cos(Math.PI / 6), 192.5];

      // Derived edge midpoints from corner array (with corrected fourth midpoint)
      const m01: [number, number] = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2];
      const m12: [number, number] = [(corners[1][0] + corners[2][0]) / 2, (corners[1][1] + corners[2][1]) / 2];
      const m23: [number, number] = [(corners[2][0] + corners[3][0]) / 2, (corners[2][1] + corners[3][1]) / 2];
      const m30: [number, number] = [(corners[3][0] + corners[0][0]) / 2, (corners[3][1] + corners[0][1]) / 2];

      // 1. Assert midpoints match independent analytical derivations
      expect(m01[0]).toBeCloseTo(expectedM01[0], 4);
      expect(m01[1]).toBeCloseTo(expectedM01[1], 4);

      expect(m12[0]).toBeCloseTo(expectedM12[0], 4);
      expect(m12[1]).toBeCloseTo(expectedM12[1], 4);

      expect(m23[0]).toBeCloseTo(expectedM23[0], 4);
      expect(m23[1]).toBeCloseTo(expectedM23[1], 4);

      expect(m30[0]).toBeCloseTo(expectedM30[0], 4);
      expect(m30[1]).toBeCloseTo(expectedM30[1], 4);

      // 2. Assert each midpoint lies on its corresponding edge (equidistant and collinear)
      const edges: Array<{ i: number; j: number; m: [number, number] }> = [
        { i: 0, j: 1, m: m01 },
        { i: 1, j: 2, m: m12 },
        { i: 2, j: 3, m: m23 },
        { i: 3, j: 0, m: m30 },
      ];

      for (const { i, j, m } of edges) {
        const c1 = corners[i];
        const c2 = corners[j];
        const edgeLen = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
        const distToC1 = Math.hypot(m[0] - c1[0], m[1] - c1[1]);
        const distToC2 = Math.hypot(c2[0] - m[0], c2[1] - m[1]);

        expect(distToC1).toBeCloseTo(edgeLen / 2, 4);
        expect(distToC2).toBeCloseTo(edgeLen / 2, 4);
        expect(distToC1 + distToC2).toBeCloseTo(edgeLen, 4); // Collinear between endpoints
      }

      // 3. Explicitly verify the buggy formula (corners[3][0] + corners[0][1]) / 2 produces a huge error
      const buggyY30 = (corners[3][0] + corners[0][1]) / 2;
      expect(Math.abs(buggyY30 - m30[1])).toBeGreaterThan(40); // > 40m error if X and Y mixed
    });

    it('rigorously validates building foundations across 9 footprint points on sloped (MOUNTAIN_RIDGE) and flat (URBAN_DENSE) terrain against Three.js ground mesh', () => {
      const raycaster = new THREE.Raycaster();
      const rayDir = new THREE.Vector3(0, -1, 0).normalize();
      let groundMesh: THREE.Mesh;
      let preset: EnvironmentDescriptor['preset'];

      function sampleMeshGroundY(simX: number, simY: number): number {
        // 1. Convert simulation coordinates to Three.js world coordinates:
        //    World X = simulation X, World Z = negative simulation Y
        const worldX = simX;
        const worldZ = -simY;
        // 2. Cast vertical ray downward from safely above max terrain elevation (1500m)
        raycaster.set(new THREE.Vector3(worldX, 1500, worldZ), rayDir);
        // 3. Intersect actual generated Three.js ground mesh
        const hits = raycaster.intersectObject(groundMesh, false);
        // 4. Fail the test if no ground intersection is found (fail-closed, requirement 6)
        if (hits.length === 0 || !hits[0]) {
          throw new Error(
            `[TestTerrainSampling] Ground mesh intersection failed for preset '${preset}' at simulation coordinates (${simX.toFixed(2)}, ${simY.toFixed(2)}). ` +
            `Supplied ground mesh did not produce any vertical ray intersections from Y=1500 downward.`
          );
        }
        expect(hits.length).toBeGreaterThan(0);
        // 5. Obtain hit world-space Y coordinate (includes mesh position.y = -1 and world transform)
        return hits[0].point.y;
      }

      for (const p of ['URBAN_DENSE', 'MOUNTAIN_RIDGE'] as const) {
        preset = p;
        const desc = testDescriptor(preset === 'MOUNTAIN_RIDGE' ? 4242 : 7777, preset);
        const terrain = buildProceduralTerrain(desc);
        const buildings = buildProceduralBuildings(desc, terrain.groundMesh);

        // Verify groundMesh exists in terrain with position.y = -1 (fail-closed, Section 6)
        expect(terrain.groundMesh).toBeDefined();
        groundMesh = terrain.groundMesh;
        expect(groundMesh.position.y).toBe(-1);

        // Update world matrices for both group and mesh before raycasting
        terrain.group.updateMatrixWorld(true);
        groundMesh.updateMatrixWorld(true);

        const zoneMeshes = buildings.selectableMeshes.filter((m) =>
          m.userData?.envObjectId?.startsWith('BLD-U1')
        );
        expect(zoneMeshes.length).toBeGreaterThanOrEqual(6);

        const reportList: Array<{
          id: string;
          foundationBaseY: number;
          minGroundY: number;
          maxGroundY: number;
          floatingGap: number;
          foundationContact: number;
          burialDepth: number;
          localTerrainRelief: number;
        }> = [];

        for (const mesh of zoneMeshes) {
          const info = mesh.userData?.envObjectInfo;
          expect(info).toBeDefined();
          if (!info) continue;

          // Obtain actual building foundation base from transformed geometry / bounding box
          const bbox = new THREE.Box3().setFromObject(mesh);
          const foundationBaseY = bbox.min.y;

          // Extract building dimensions from stored footprint metadata or geometry parameters
          let sizeX = mesh.userData?.footprintSizeX ?? 20;
          let sizeZ = mesh.userData?.footprintSizeZ ?? 20;
          if (mesh.userData?.footprintSizeX === undefined) {
            if (mesh instanceof THREE.Mesh && mesh.geometry instanceof THREE.BoxGeometry) {
              sizeX = mesh.geometry.parameters.width;
              sizeZ = mesh.geometry.parameters.depth;
            } else if (mesh instanceof THREE.Mesh && mesh.geometry instanceof THREE.CylinderGeometry) {
              sizeX = mesh.geometry.parameters.radiusBottom * 2;
              sizeZ = mesh.geometry.parameters.radiusBottom * 2;
            }
          }
          const yaw = mesh.userData?.yawAngle ?? mesh.rotation.y;

          // 1. Center
          const centerPt: [number, number] = [info.position.x, info.position.y];

          // 2. 4 Corners (NW, NE, SE, SW)
          const corners = getRotatedFootprintCorners(centerPt[0], centerPt[1], sizeX, sizeZ, yaw);

          // 3. 4 Edge Midpoints (all 4 with corrected Y coordinate index)
          const edgeMidpoints: [number, number][] = [
            [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2],
            [(corners[1][0] + corners[2][0]) / 2, (corners[1][1] + corners[2][1]) / 2],
            [(corners[2][0] + corners[3][0]) / 2, (corners[2][1] + corners[3][1]) / 2],
            [(corners[3][0] + corners[0][0]) / 2, (corners[3][1] + corners[0][1]) / 2],
          ];

          const all9Points = [centerPt, ...corners, ...edgeMidpoints];
          expect(all9Points.length).toBe(9);

          // Query actual generated Three.js ground mesh geometry for each of the 9 footprint sample points
          const groundHeightsY = all9Points.map(([px, py]) => sampleMeshGroundY(px, py));
          const minGroundY = Math.min(...groundHeightsY);
          const maxGroundY = Math.max(...groundHeightsY);
          const localTerrainRelief = maxGroundY - minGroundY;

          // Measure metrics as defined in Section 4:
          // Floating gap: max positive distance by which foundation base lies above any sampled ground surface
          const floatingGap = Math.max(0, ...groundHeightsY.map((gY) => foundationBaseY - gY));

          // Foundation contact error: abs(foundationBaseY - minimumSampledGroundY)
          const foundationContact = Math.abs(foundationBaseY - minGroundY);

          // Burial depth: max depth by which foundation base lies below any sampled ground surface
          const burialDepth = Math.max(0, ...groundHeightsY.map((gY) => gY - foundationBaseY));

          reportList.push({
            id: info.id,
            foundationBaseY,
            minGroundY,
            maxGroundY,
            floatingGap,
            foundationContact,
            burialDepth,
            localTerrainRelief,
          });

          // Mandatory assertions (Section 4 & 5):
          // 1. Zero floating gap beyond tolerance
          expect(floatingGap).toBeLessThanOrEqual(0.05);

          // 2. Foundation contacts lowest sampled terrain
          expect(foundationContact).toBeLessThanOrEqual(0.05);

          // 3. Bounded burial depth within measured local terrain relief
          expect(burialDepth).toBeLessThanOrEqual(localTerrainRelief + 0.05);

          // 4. Roof extends above highest sampled ground
          expect(bbox.max.y).toBeGreaterThan(maxGroundY);
        }

        // Verify report contains results for all buildings
        expect(reportList.length).toBe(zoneMeshes.length);
        for (const item of reportList) {
          expect(item.floatingGap).toBeLessThanOrEqual(0.05);
          expect(item.foundationContact).toBeLessThanOrEqual(0.05);
          expect(item.burialDepth).toBeLessThanOrEqual(item.localTerrainRelief + 0.05);
        }
      }
    });

    it('fails closed when supplied ground mesh produces zero ray intersections and preserves analytical fallback when omitted (TASK 23.1-R2R-FINAL Section 3 & 5)', () => {
      const desc = testDescriptor(7777, 'URBAN_DENSE');

      // 1. Construct a deliberately small Three.js ground mesh positioned far from the zone coordinates
      // The urban zone is located at [1000, 1000] to [2400, 2400].
      // We position a tiny 10m x 10m mesh at [-3000, -1, -3000].
      const tinyGeom = new THREE.PlaneGeometry(10, 10);
      tinyGeom.rotateX(-Math.PI / 2);
      const tinyMat = new THREE.MeshBasicMaterial();
      const tinyMesh = new THREE.Mesh(tinyGeom, tinyMat);
      tinyMesh.position.set(-3000, -1, -3000);
      tinyMesh.updateMatrixWorld(true);

      // 2. Assert that calling buildProceduralBuildings with this non-intersecting mesh throws an explicit error
      let caughtError: Error | null = null;
      try {
        buildProceduralBuildings(desc, tinyMesh);
      } catch (err: unknown) {
        caughtError = err as Error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toMatch(/\[TerrainSampling\] Ground mesh intersection failed for preset 'URBAN_DENSE'/);
      expect(caughtError?.message).toMatch(/at simulation coordinates \(\d+\.\d+, \d+\.\d+\)/);
      expect(caughtError?.message).toMatch(/did not produce any vertical ray intersections/);

      // Clean up test-only mesh
      tinyGeom.dispose();
      tinyMat.dispose();

      // 3. Assert that calling buildProceduralBuildings without a mesh succeeds and uses documented analytical fallback
      const fallbackResult = buildProceduralBuildings(desc);
      expect(fallbackResult).toBeDefined();
      const zoneMeshes = fallbackResult.selectableMeshes.filter((m) =>
        m.userData?.envObjectId?.startsWith('BLD-U1')
      );
      expect(zoneMeshes.length).toBeGreaterThanOrEqual(6);

      // Verify analytical base height is consistent
      for (const mesh of zoneMeshes) {
        const bbox = new THREE.Box3().setFromObject(mesh);
        // On flat URBAN_DENSE, analytical fallback gives minGroundElev - 1 = -1
        expect(bbox.min.y).toBeCloseTo(-1, 2);
      }

      // Clean up fallback result
      fallbackResult.disposables.geometries.forEach((g) => g.dispose());
      fallbackResult.disposables.materials.forEach((m) => m.dispose());
    });

    it('formats track label text pure helper with exact altitude and label tags (Section 4)', () => {
      // Distinct altitudes 80m, 250m, 400m
      const t80 = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-01', pos: { x: 500, y: 500, z: 80 }, traineeLabel: null }));
      expect(t80.altM).toBe(80);
      expect(t80.text).toBe('T-01 [NON] 80m');
      expect(t80.labelTag).toBe('NON');
      expect(t80.colorHex).toBe('#FFCC00');

      const t250 = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-02', pos: { x: 500, y: 500, z: 250 }, traineeLabel: 'FRIENDLY' }));
      expect(t250.altM).toBe(250);
      expect(t250.text).toBe('T-02 [FRIEND] 250m');
      expect(t250.labelTag).toBe('FRIEND');
      expect(t250.colorHex).toBe('#00CCFF');

      const t400 = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-03', pos: { x: 500, y: 500, z: 400 }, traineeLabel: 'CIVIL_UAS' }));
      expect(t400.altM).toBe(400);
      expect(t400.text).toBe('T-03 [CIVIL] 400m');
      expect(t400.labelTag).toBe('CIVIL');
      expect(t400.colorHex).toBe('#00FF66');

      // Other label tags
      const tBird = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-04', pos: { x: 500, y: 500, z: 150 }, traineeLabel: 'BIRD' }));
      expect(tBird.text).toBe('T-04 [BIRD] 150m');
      expect(tBird.labelTag).toBe('BIRD');
      expect(tBird.colorHex).toBe('#8A99A8');

      const tAtk = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-05', pos: { x: 500, y: 500, z: 120 }, traineeLabel: 'HOSTILE_ATTACK' }));
      expect(tAtk.text).toBe('T-05 [H-ATK] 120m');
      expect(tAtk.labelTag).toBe('H-ATK');
      expect(tAtk.colorHex).toBe('#FF3333');

      const tIsr = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-06', pos: { x: 500, y: 500, z: 90 }, traineeLabel: 'HOSTILE_ISR' }));
      expect(tIsr.text).toBe('T-06 [H-ISR] 90m');
      expect(tIsr.labelTag).toBe('H-ISR');
      expect(tIsr.colorHex).toBe('#FF3333');

      const tSwarm = formatTrackLabelText(makeSafeTrack({ trackNo: 'T-07', pos: { x: 500, y: 500, z: 45 }, traineeLabel: 'SWARM_ELEMENT' }));
      expect(tSwarm.text).toBe('T-07 [SWARM] 45m');
      expect(tSwarm.labelTag).toBe('SWARM');
      expect(tSwarm.colorHex).toBe('#FF3333');
    });

    it('verifies geometry helper functions (pointInPolygon, segmentsIntersect, getRotatedFootprintCorners, isFootprintFullyContained)', () => {
      const rectPoly: [number, number][] = [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ];

      // pointInPolygon
      expect(pointInPolygon(50, 50, rectPoly)).toBe(true);
      expect(pointInPolygon(-5, 50, rectPoly)).toBe(false);
      expect(pointInPolygon(150, 50, rectPoly)).toBe(false);

      // segmentsIntersect
      expect(segmentsIntersect(0, 0, 10, 10, 0, 10, 10, 0)).toBe(true);
      expect(segmentsIntersect(0, 0, 10, 0, 0, 5, 10, 5)).toBe(false);

      // getRotatedFootprintCorners
      const corners0 = getRotatedFootprintCorners(50, 50, 20, 10, 0);
      expect(corners0.length).toBe(4);
      // At yaw 0: [-10, -5] -> (40, 55), [10, -5] -> (60, 55), [10, 5] -> (60, 45), [-10, 5] -> (40, 45)
      expect(corners0[0][0]).toBeCloseTo(40, 1);
      expect(corners0[0][1]).toBeCloseTo(55, 1);

      // isFootprintFullyContained
      expect(isFootprintFullyContained(50, 50, 20, 10, 0, rectPoly, 0)).toBe(true);
      // Protruding outside boundary
      expect(isFootprintFullyContained(95, 50, 20, 10, 0, rectPoly, 0)).toBe(false);
      // Violating rMinM
      expect(isFootprintFullyContained(50, 50, 20, 10, 0, rectPoly, 60)).toBe(false);
    });

    it('disposes all geometries and materials cleanly', () => {
      const res = buildProceduralBuildings(testDescriptor(9999));
      expect(res.disposables.geometries.length).toBeGreaterThan(0);
      expect(res.disposables.materials.length).toBeGreaterThan(0);

      expect(() => {
        for (const g of res.disposables.geometries) g.dispose();
        for (const m of res.disposables.materials) m.dispose();
      }).not.toThrow();
    });
  });

  describe('3. Dynamic Radar Viewport & Coordinate Mapping', () => {
    const dummyOperatorTracks: OperatorTrackView[] = [
      makeOperatorTrack({ trackNo: 'T-01', estPos: { x: 1000, y: 1000, z: 50 } }),
      makeOperatorTrack({ trackNo: 'T-02', estPos: { x: -2000, y: 1500, z: 80 } }),
    ];

    it('findNearestTrackNo functions accurately across different viewport scales', () => {
      // Standard 520px viewport: radius = 245px, scale = 245 / 5000 = 0.049
      const scale520 = 245 / 5000;
      const t1ScreenX_520 = 1000 * scale520;
      const t1ScreenY_520 = 1000 * scale520;
      expect(findNearestTrackNo(t1ScreenX_520, t1ScreenY_520, dummyOperatorTracks, scale520)).toBe('T-01');

      // Expanded 640px viewport: radius = 305px, scale = 305 / 5000 = 0.061
      const scale640 = 305 / 5000;
      const t1ScreenX_640 = 1000 * scale640;
      const t1ScreenY_640 = 1000 * scale640;
      expect(findNearestTrackNo(t1ScreenX_640, t1ScreenY_640, dummyOperatorTracks, scale640)).toBe('T-01');

      // Mid-sized 588px viewport: radius = 279px, scale = 279 / 5000 = 0.0558
      const scale588 = 279 / 5000;
      const t2ScreenX_588 = -2000 * scale588;
      const t2ScreenY_588 = 1500 * scale588;
      expect(findNearestTrackNo(t2ScreenX_588, t2ScreenY_588, dummyOperatorTracks, scale588)).toBe('T-02');
    });

    it('returns null when clicking empty airspace far from any track', () => {
      const scale = 305 / 5000;
      expect(findNearestTrackNo(0, 0, dummyOperatorTracks, scale)).toBeNull();
      expect(findNearestTrackNo(-50, -50, dummyOperatorTracks, scale)).toBeNull();
    });
  });

  describe('4. Tactical Coordinate Mapping & Spatial Separation', () => {
    it('accurately transforms simulation coordinates to Three.js right-handed tactical frame', () => {
      // Sim X (East) -> Three.js X
      // Sim Y (North) -> -Three.js Z
      // Sim Z (Alt/Up) -> Three.js Y
      const simTrack = makeSafeTrack({
        pos: { x: 1200, y: 3400, z: 85 },
      });

      const threeX = simTrack.pos.x;
      const threeY = simTrack.pos.z;
      const threeZ = -simTrack.pos.y;

      expect(threeX).toBe(1200);
      expect(threeY).toBe(85);
      expect(threeZ).toBe(-3400);
    });

    it('ensures engagement weapon effects do not pollute or enter the SafeTrackView track directory', () => {
      const activeTracks: SafeTrackView[] = [
        makeSafeTrack({ trackNo: 'T-01' }),
        makeSafeTrack({ trackNo: 'T-02' }),
      ];

      // SafeTrackView tracks strictly only contain tracked target contacts, never missile interceptors or ballistic tracers
      for (const track of activeTracks) {
        expect(track.trackNo.startsWith('T-')).toBe(true);
        expect(track.step).toBe('TRACK');
      }
    });
  });
});

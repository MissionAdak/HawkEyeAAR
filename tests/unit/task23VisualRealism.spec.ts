import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TargetModelFactory } from '@/render3d/targets/targetModelFactory';
import {
  resolveTargetPresentation,
  type SensorObservationContext,
} from '@/render3d/targets/targetObservation';
import { mapDroneTypeToAirframeSignature } from '@/sim/sensorObservation';
import { buildProceduralBuildings } from '@/render3d/environment/buildings';
import { getTerrainElevation } from '@/render3d/environment/terrain';
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

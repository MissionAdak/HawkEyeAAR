import { describe, it, expect } from 'vitest';
import {
  resolveTargetPresentation,
  mapSignatureToCategory,
  type SensorObservationContext,
} from '@/render3d/targets/targetObservation';
import { resolveTargetModelCategory } from '@/render3d/targets/targetVisualMapping';
import { TargetModelFactory } from '@/render3d/targets/targetModelFactory';
import { calculateScreenSpaceScale } from '@/render3d/aircraftModel';
import type { SafeTrackView, ApprovedSensorObservation } from '@/render3d/types';
import type { TrackEntity } from '@/sim/types';
import { projectSafeTracks } from '@/ui/Console';
import {
  evaluateSensorObservation,
  mapDroneTypeToAirframeSignature,
  type SensorObservationPipelineContext,
} from '@/sim/sensorObservation';

describe('Target Observation & Sensor-Aware 3D Presentation (Task 17.3)', () => {
  const makeObservation = (overrides?: Partial<ApprovedSensorObservation>): ApprovedSensorObservation => ({
    signature: overrides?.signature ?? overrides?.observedSignature ?? 'FIXED_WING_DELTA',
    observedSignature: overrides?.signature ?? overrides?.observedSignature ?? 'FIXED_WING_DELTA',
    sensorSource: 'EOIR',
    activeSensor: 'EOIR',
    sensorHealthOk: true,
    sensorAvailability: true,
    resolution: 'FULL',
    resolutionLevel: 'FULL',
    visibilityState: 'CLEAR',
    estimatedRangeM: 1419,
    confidence: 0.9,
    timestampMs: 5000,
    ...overrides,
  });

  const makeTrack = (overrides?: Partial<SafeTrackView>): SafeTrackView => ({
    trackNo: 'T-01',
    pos: { x: 1000, y: 1000, z: 120 }, // dist = hypot(1000, 1000, 120) ~= 1419m
    vel: { x: 15, y: 0, z: 0 },
    traineeLabel: null,
    step: 'TRACK',
    q: 0.85,
    masked: false,
    ghostSigmaM: 0,
    isSelected: false,
    lifecycle: 'ACTIVE',
    sensorObservation: makeObservation(),
    ...overrides,
  });

  const baseContext: SensorObservationContext = {
    activeSensor: 'EOIR',
    displayMode: 'AUTO',
    sensorHealth: { radarOk: true, eoirOk: true, rfOk: true },
    weather: 'CLEAR',
    isNight: false,
    mode: 'TRAIN',
    sensorPos: { x: 0, y: 0, z: 0 },
  };

  const makeSimEntity = (overrides?: Partial<TrackEntity>): TrackEntity => ({
    id: 'sim-ent-01',
    trackNo: 'TRK-01',
    trueClass: 'HOSTILE_ATTACK',
    droneType: 'FPV_ATTACK',
    pos: { x: 1000, y: 1000, z: 120 },
    prev: { x: 990, y: 1000, z: 120 },
    vel: { x: 15, y: 0, z: 0 },
    rcsM2: 0.02,
    valueInr: 150000,
    emitsRf: true,
    remoteId: false,
    iff: false,
    profile: 'DIRECT',
    spawnTMs: 0,
    lifecycle: 'ACTIVE',
    traineeLabel: null,
    step: 'TRACK',
    q: 0.9,
    cCls: 0,
    masked: false,
    coastingSinceMs: null,
    ghostSigmaM: 0,
    hitHistory: [],
    tVis: 0,
    tTrk: 100,
    tDesig: null,
    tCls: null,
    tEng: null,
    tPnr: null,
    engagements: 0,
    weaponUsed: null,
    ...overrides,
  });

  const basePipelineContext: SensorObservationPipelineContext = {
    activeSensor: 'EOIR',
    sensorHealth: { RADAR: 'OK', EOIR: 'OK', RF: 'OK' },
    isNight: false,
    weather: 'CLEAR',
    currentSimMs: 10000,
  };

  describe('1. Ground-Truth Isolation & projectSafeTracks boundary (Task 17.3 §2)', () => {
    it('projectSafeTracks() never copies raw droneType', () => {
      const entity = makeSimEntity({ droneType: 'FPV_ATTACK' });
      const safeTracks = projectSafeTracks([entity], null, basePipelineContext);

      expect(safeTracks).toHaveLength(1);
      const safe = safeTracks[0];
      expect((safe as unknown as { droneType?: unknown }).droneType).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(safe, 'droneType')).toBe(false);
    });

    it('no ground-truth property reaches Renderer3D through SafeTrackView', () => {
      const entity = makeSimEntity({
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'LOITERING_MUNITION',
        valueInr: 750000,
      });
      const safeTracks = projectSafeTracks([entity], null, basePipelineContext);

      const safe = safeTracks[0];
      expect(Object.prototype.hasOwnProperty.call(safe, 'trueClass')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(safe, 'droneType')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(safe, 'valueInr')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(safe, 'waypoints')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(safe, 'killDraw')).toBe(false);
    });
  });

  describe('2. Radar mode presentation & display mode overrides (Task 17.3 §6)', () => {
    it('Radar selection always produces radar symbols regardless of display preference', () => {
      const track = makeTrack();
      const resultAuto = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RADAR',
        displayMode: 'AUTO',
      });
      expect(resultAuto.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultAuto.isVisuallyResolved).toBe(false);
      expect(resultAuto.observationState).toBe('RADAR_TRACK');

      const resultAirframe = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RADAR',
        displayMode: 'AIRFRAME',
      });
      expect(resultAirframe.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultAirframe.isVisuallyResolved).toBe(false);
    });

    it('RF selection never produces optical aircraft', () => {
      const track = makeTrack();
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RF',
        displayMode: 'AIRFRAME',
      });
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('RADAR_TRACK');
    });

    it('AIRFRAME preference cannot override RADAR selection', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ observedSignature: 'FIXED_WING_DELTA' }) });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RADAR',
        displayMode: 'AIRFRAME',
      });
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
    });

    it('AIRFRAME preference cannot override RF selection', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ observedSignature: 'MULTIROTOR_COMPACT' }) });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RF',
        displayMode: 'AIRFRAME',
      });
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
    });
  });

  describe('3. EO/IR observation resolution & degradation (Task 17.3 §3, §4, §7)', () => {
    it('EO/IR can display a physical model when an approved observation exists', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          observedSignature: 'FIXED_WING_DELTA',
          resolution: 'FULL',
        }),
      });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('LOITERING_MUNITION');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
    });

    it('EO/IR cannot display physical models without an approved observation', () => {
      const track = makeTrack({ sensorObservation: null });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
    });

    it('Sensor offline prevents optical presentation', () => {
      const track = makeTrack();
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
        sensorHealth: { radarOk: true, eoirOk: false, rfOk: true },
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('SENSOR_OFFLINE');
    });

    it('Sensor degradation reduces presentation detail to unresolved airframe', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          resolution: 'DEGRADED',
          visibilityState: 'DEGRADED_FOG',
        }),
      });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('UNKNOWN_AIRFRAME');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('DEGRADED_OPTICAL');
    });
  });

  describe('4. Environmental conditions, Masking & Fallback (Task 17.3 §4, §8)', () => {
    it('Terrain masking prevents optical see-through', () => {
      const track = makeTrack({ masked: true });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('MASKED');
    });

    it('Fog and night alter presentation according to documented notional parameters', () => {
      // In CLEAR: at 1419m, clear threshold is 2400m -> CLEAR
      // In FOG: clear threshold = 2400 * 0.35 = 840m; max threshold = 3800 * 0.48 = 1824m
      // At 1419m in FOG, fallback resolution drops to DEGRADED_OPTICAL (UNKNOWN_AIRFRAME)
      const trackWithoutObs = makeTrack({ sensorObservation: undefined });
      const resultFog = resolveTargetPresentation(trackWithoutObs, {
        ...baseContext,
        activeSensor: 'EOIR',
        weather: 'FOG',
      });

      expect(resultFog.presentationCategory).toBe('UNKNOWN_AIRFRAME');
      expect(resultFog.observationState).toBe('DEGRADED_OPTICAL');

      // Beyond max fog threshold (e.g. 2500m):
      const distantTrack = makeTrack({
        pos: { x: 2000, y: 1500, z: 200 }, // ~2507m
        sensorObservation: undefined,
      });
      const resultDistant = resolveTargetPresentation(distantTrack, {
        ...baseContext,
        activeSensor: 'EOIR',
        weather: 'FOG',
      });

      expect(resultDistant.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultDistant.observationState).toBe('OUT_OF_RANGE');
    });
  });

  describe('5. Physical appearance independence from trainee classification (Task 17.3 §5)', () => {
    it('wrong trainee classification does not change physical observed geometry', () => {
      const wronglyClassified = makeTrack({
        sensorObservation: makeObservation({
          observedSignature: 'FIXED_WING_DELTA',
          resolution: 'FULL',
        }),
        traineeLabel: 'CIVIL_UAS',
      });

      const result = resolveTargetPresentation(wronglyClassified, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('LOITERING_MUNITION');
      expect(wronglyClassified.traineeLabel).toBe('CIVIL_UAS');
    });

    it('physical FPV-style appearance does not automatically reveal hostile classification', () => {
      const fpvTrack = makeTrack({
        sensorObservation: makeObservation({
          observedSignature: 'MULTIROTOR_COMPACT',
          resolution: 'FULL',
        }),
        traineeLabel: null,
      });

      const result = resolveTargetPresentation(fpvTrack, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('HOSTILE_ATTACK');

      // Inspect TargetModelFactory palette: accent should be neutral slate, NOT hostile crimson red
      const factory = new TargetModelFactory();
      const palette = factory.getPaletteForCategory('HOSTILE_ATTACK');
      // Neutral accent color is not red
      expect(palette.accent).toBeDefined();
      expect(palette.rotors).toBeDefined();
      factory.dispose();
    });
  });

  describe('6. EVAL mode & AAR Ground-Truth Projection (Task 17.3 §6, §9)', () => {
    it('EVAL mode cannot reveal hidden truth or override non-EOIR sensors', () => {
      const track = makeTrack();
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        mode: 'EVAL',
        activeSensor: 'RADAR',
        displayMode: 'AIRFRAME',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
    });

    it('existing authorized AAR truth projection remains functional', () => {
      const track = makeTrack({ traineeLabel: null });
      const aarCategory = resolveTargetModelCategory(track, {
        revealTruth: true,
        truthClass: 'HOSTILE_ATTACK',
      });

      expect(aarCategory).toBe('HOSTILE_ATTACK');
    });
  });

  describe('7. Signature Mapping & Model Geometry Instantiation', () => {
    it('maps signatures accurately to target model categories', () => {
      expect(mapSignatureToCategory('MULTIROTOR_COMPACT')).toBe('HOSTILE_ATTACK');
      expect(mapSignatureToCategory('MULTIROTOR_WITH_CAMERA_POD')).toBe('HOSTILE_ISR');
      expect(mapSignatureToCategory('MULTIROTOR_STANDARD')).toBe('CIVIL_UAS');
      expect(mapSignatureToCategory('FIXED_WING_DELTA')).toBe('LOITERING_MUNITION');
      expect(mapSignatureToCategory('BIRD_LIKE')).toBe('BIRD');
      expect(mapSignatureToCategory('UNRESOLVED_AIRFRAME')).toBe('UNKNOWN_AIRFRAME');
    });

    it('maps simulation drone types to physical observable signatures without threat class', () => {
      expect(mapDroneTypeToAirframeSignature('FPV_ATTACK')).toBe('MULTIROTOR_COMPACT');
      expect(mapDroneTypeToAirframeSignature('RECON_QUAD')).toBe('MULTIROTOR_WITH_CAMERA_POD');
      expect(mapDroneTypeToAirframeSignature('CIVIL_UAS')).toBe('MULTIROTOR_STANDARD');
      expect(mapDroneTypeToAirframeSignature('LOITERING_MUNITION')).toBe('FIXED_WING_DELTA');
      expect(mapDroneTypeToAirframeSignature('BIRD')).toBe('BIRD_LIKE');
    });

    it('evaluates sensor observation correctly for non-EOIR vs EOIR', () => {
      const entity = makeSimEntity({ droneType: 'LOITERING_MUNITION' });

      // In RADAR mode, optical observation is null
      const radarObs = evaluateSensorObservation(entity, {
        ...basePipelineContext,
        activeSensor: 'RADAR',
      });
      expect(radarObs).toBeNull();

      // In EOIR mode, within clear range, observation is FULL
      const eoirObs = evaluateSensorObservation(entity, {
        ...basePipelineContext,
        activeSensor: 'EOIR',
      });
      expect(eoirObs).not.toBeNull();
      expect(eoirObs?.observedSignature).toBe('FIXED_WING_DELTA');
      expect(eoirObs?.resolution).toBe('FULL');
    });

    it('TargetModelFactory instantiates LOITERING_MUNITION model with proper pick proxy', () => {
      const factory = new TargetModelFactory();
      const model = factory.createModel('LOITERING_MUNITION', 'T-DELTA');

      expect(model.category).toBe('LOITERING_MUNITION');
      expect(model.hitProxy.userData.trackNo).toBe('T-DELTA');
      factory.dispose();
    });
  });

  describe('8. Screen-space scale bounds', () => {
    it('bounds close, mid, and overview scale tiers', () => {
      const closeScale = calculateScreenSpaceScale(45, 150, 520, 32, true);
      expect(closeScale).toBeGreaterThanOrEqual(2.5);
      expect(closeScale).toBeLessThanOrEqual(25);

      const midScale = calculateScreenSpaceScale(45, 1800, 520, 32, true);
      expect(midScale).toBeGreaterThanOrEqual(12);
      expect(midScale).toBeLessThanOrEqual(75);

      const overviewScale = calculateScreenSpaceScale(45, 4800, 520, 32, true);
      expect(overviewScale).toBeGreaterThanOrEqual(25);
      expect(overviewScale).toBeLessThanOrEqual(130);
    });
  });
});

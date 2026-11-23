import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resolveTargetPresentation,
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
  validateProducerSensorHealth,
  isValidProducerSimTime,
  type SensorObservationPipelineContext,
} from '@/sim/sensorObservation';

describe('Target Observation & Sensor-Aware 3D Presentation (Task 17.3 & Task 17.4)', () => {
  const makeObservation = (overrides?: Partial<ApprovedSensorObservation>): ApprovedSensorObservation => {
    const sig = overrides?.signature ?? overrides?.observedSignature ?? 'FIXED_WING_DELTA';
    const res = overrides?.resolutionLevel ?? overrides?.resolution ?? 'FULL';
    const vis = overrides?.visibilityState ?? (res === 'DEGRADED' ? 'DEGRADED' : 'CLEAR');
    return {
      signature: sig,
      observedSignature: sig,
      sensorSource: 'EOIR',
      activeSensor: 'EOIR',
      sensorHealth: 'OK',
      sensorHealthOk: true,
      sensorAvailability: true,
      resolution: res,
      resolutionLevel: res,
      visibilityState: vis,
      estimatedRangeM: 1419,
      confidence: 0.9,
      timestampMs: 5000,
      ...overrides,
    };
  };

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
    sensorHealth: { RADAR: 'OK', EOIR: 'OK', RF: 'OK' },
    currentSimMs: 5000,
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
    currentSimMs: 5000,
  };

  describe('1. Ground-Truth Isolation & projectSafeTracks boundary (Task 17.3 §2)', () => {
    it('projectSafeTracks() never copies raw droneType', () => {
      const opTrack = {
        trackNo: 'TRK-01',
        entityId: 'sim-ent-01',
        estPos: { x: 1000, y: 1000, z: 120 },
        estVel: { x: 15, y: 0, z: 0 },
        estRangeM: 1419,
        estBearingDeg: 45,
        estSpeedMps: 15,
        estAltBand: 'LOW' as const,
        uncertaintyM: 18,
        isCoasting: false,
        lastMeasurementMs: 5000,
        lastSensorType: 'RADAR' as const,
        sensorSources: ['RADAR' as const],
        q: 0.9,
        cCls: 0,
        traineeLabel: null,
        step: 'TRACK' as const,
        lifecycle: 'ACTIVE' as const,
        sensorObservation: null,
        droneType: 'FPV_ATTACK',
      } as unknown as import('@/sim/trackerTypes').OperatorTrackView;
      const safeTracks = projectSafeTracks([opTrack], null);

      expect(safeTracks).toHaveLength(1);
      const safe = safeTracks[0];
      expect((safe as unknown as { droneType?: unknown }).droneType).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(safe, 'droneType')).toBe(false);
    });

    it('no ground-truth property reaches Renderer3D through SafeTrackView', () => {
      const opTrack = {
        trackNo: 'TRK-01',
        entityId: 'sim-ent-01',
        estPos: { x: 1000, y: 1000, z: 120 },
        estVel: { x: 15, y: 0, z: 0 },
        estRangeM: 1419,
        estBearingDeg: 45,
        estSpeedMps: 15,
        estAltBand: 'LOW' as const,
        uncertaintyM: 18,
        isCoasting: false,
        lastMeasurementMs: 5000,
        lastSensorType: 'RADAR' as const,
        sensorSources: ['RADAR' as const],
        q: 0.9,
        cCls: 0,
        traineeLabel: null,
        step: 'TRACK' as const,
        lifecycle: 'ACTIVE' as const,
        sensorObservation: null,
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'LOITERING_MUNITION',
        valueInr: 750000,
        waypoints: [{ x: 0, y: 0, z: 0 }],
        killDraw: 0.5,
      } as unknown as import('@/sim/trackerTypes').OperatorTrackView;
      const safeTracks = projectSafeTracks([opTrack], null);

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

  describe('3. Sensor Health Semantics & EO/IR Observation (Task 17.4 §1)', () => {
    it('EO/IR can display a physical model when sensor is OK and observation is FULL', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          observedSignature: 'FIXED_WING_DELTA',
          resolution: 'FULL',
          sensorHealth: 'OK',
        }),
      });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
        sensorHealth: { RADAR: 'OK', EOIR: 'OK', RF: 'OK' },
      });

      expect(result.presentationCategory).toBe('OBSERVED_FIXED_WING');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
    });

    it('Sensor health DEG produces UNKNOWN_AIRFRAME and DEGRADED_OPTICAL, not SENSOR_OFFLINE', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          observedSignature: 'UNRESOLVED_AIRFRAME',
          resolution: 'DEGRADED',
          sensorHealth: 'DEG',
        }),
      });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
        sensorHealth: { RADAR: 'OK', EOIR: 'DEG', RF: 'OK' },
      });

      // DEG permits degraded observation (generic fuselage model), not offline
      expect(result.presentationCategory).toBe('UNKNOWN_AIRFRAME');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('DEGRADED_OPTICAL');
    });

    it('Sensor health OUT strictly prohibits optical models and produces SENSOR_OFFLINE', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          sensorHealth: 'OUT',
          sensorAvailability: false,
        }),
      });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
        sensorHealth: { RADAR: 'OK', EOIR: 'OUT', RF: 'OK' },
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('SENSOR_OFFLINE');
    });

    it('Both null and undefined observations produce safe unresolved RADAR_SYMBOL (Task 17.4 §2)', () => {
      // Null observation:
      const trackNull = makeTrack({ sensorObservation: null });
      const resultNull = resolveTargetPresentation(trackNull, {
        ...baseContext,
        activeSensor: 'EOIR',
      });
      expect(resultNull.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultNull.isVisuallyResolved).toBe(false);
      expect(resultNull.observationState).toBe('OUT_OF_RANGE');

      // Undefined observation:
      const trackUndef = makeTrack({ sensorObservation: undefined });
      const resultUndef = resolveTargetPresentation(trackUndef, {
        ...baseContext,
        activeSensor: 'EOIR',
      });
      expect(resultUndef.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultUndef.isVisuallyResolved).toBe(false);
      expect(resultUndef.observationState).toBe('OUT_OF_RANGE');
    });
  });

  describe('4. Environmental conditions & Masking (Task 17.3 §4, Task 17.4 §3)', () => {
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

    it('Fog alters observation resolution via genuine pipeline', () => {
      // Entity at 1419m in CLEAR daylight: within 2400m -> FULL resolution
      const entity = makeSimEntity({ pos: { x: 1000, y: 1000, z: 120 } });
      const clearObs = evaluateSensorObservation(entity, {
        ...basePipelineContext,
        weather: 'CLEAR',
        isNight: false,
      });
      expect(clearObs?.resolutionLevel).toBe('FULL');
      const clearResult = resolveTargetPresentation(makeTrack({ sensorObservation: clearObs }), baseContext);
      expect(clearResult.presentationCategory).toBe('OBSERVED_MULTIROTOR');

      // Entity at 1419m in FOG: clear threshold drops to 840m, so 1419m becomes DEGRADED
      const fogObs = evaluateSensorObservation(entity, {
        ...basePipelineContext,
        weather: 'FOG',
      });
      expect(fogObs?.resolutionLevel).toBe('DEGRADED');
      const fogResult = resolveTargetPresentation(makeTrack({ sensorObservation: fogObs }), {
        ...baseContext,
        weather: 'FOG',
      });
      expect(fogResult.presentationCategory).toBe('UNKNOWN_AIRFRAME');
      expect(fogResult.observationState).toBe('DEGRADED_OPTICAL');

      // Distant entity at 2500m in FOG: exceeds max fog threshold (~1824m) -> UNRESOLVED
      const distantEntity = makeSimEntity({ pos: { x: 2000, y: 1500, z: 200 } });
      const distantObs = evaluateSensorObservation(distantEntity, {
        ...basePipelineContext,
        weather: 'FOG',
      });
      expect(distantObs?.resolutionLevel).toBe('UNRESOLVED');
      const distantResult = resolveTargetPresentation(makeTrack({ sensorObservation: distantObs }), {
        ...baseContext,
        weather: 'FOG',
      });
      expect(distantResult.presentationCategory).toBe('RADAR_SYMBOL');
      expect(distantResult.observationState).toBe('OUT_OF_RANGE');
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

      expect(result.presentationCategory).toBe('OBSERVED_FIXED_WING');
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

      expect(result.presentationCategory).toBe('OBSERVED_MULTIROTOR');

      // Inspect TargetModelFactory palette: accent should be neutral slate/amber, NOT hostile crimson red
      const factory = new TargetModelFactory();
      const palette = factory.getPaletteForCategory('OBSERVED_MULTIROTOR');
      expect(palette.accent).toBeDefined();
      expect(palette.rotors).toBeDefined();
      const accentMat = palette.accent as THREE.MeshBasicMaterial;
      expect(accentMat.color.getHex()).toBe(0xffaa00);
      expect(accentMat.color.getHex()).not.toBe(0xff0033);
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

  describe('7. Observation Provenance & Integrity (Task 17.4 §3)', () => {
    it('observation source is strictly EOIR and non-EOIR sensors return null', () => {
      const entity = makeSimEntity({ droneType: 'LOITERING_MUNITION' });

      // Non-EOIR returns null
      expect(evaluateSensorObservation(entity, { ...basePipelineContext, activeSensor: 'RADAR' })).toBeNull();
      expect(evaluateSensorObservation(entity, { ...basePipelineContext, activeSensor: 'RF' })).toBeNull();

      // EOIR returns EOIR source
      const eoirObs = evaluateSensorObservation(entity, { ...basePipelineContext, activeSensor: 'EOIR' });
      expect(eoirObs).not.toBeNull();
      expect(eoirObs?.sensorSource).toBe('EOIR');
    });

    it('observation timestamp is consistent with simulation clock', () => {
      const entity = makeSimEntity();
      const testSimTimeMs = 42550;
      const obs = evaluateSensorObservation(entity, {
        ...basePipelineContext,
        currentSimMs: testSimTimeMs,
      });

      expect(obs?.timestampMs).toBe(testSimTimeMs);
    });

    it('observation confidence is strictly within [0, 1]', () => {
      const entity = makeSimEntity();
      const obs = evaluateSensorObservation(entity, basePipelineContext);

      expect(obs?.confidence).toBeGreaterThanOrEqual(0.0);
      expect(obs?.confidence).toBeLessThanOrEqual(1.0);
    });

    it('maps simulation drone types to physical observable signatures without threat class', () => {
      expect(mapDroneTypeToAirframeSignature('FPV_ATTACK')).toBe('MULTIROTOR_COMPACT');
      expect(mapDroneTypeToAirframeSignature('RECON_QUAD')).toBe('MULTIROTOR_WITH_CAMERA_POD');
      expect(mapDroneTypeToAirframeSignature('CIVIL_UAS')).toBe('MULTIROTOR_STANDARD');
      expect(mapDroneTypeToAirframeSignature('LOITERING_MUNITION')).toBe('FIXED_WING_DELTA');
      expect(mapDroneTypeToAirframeSignature('BIRD')).toBe('BIRD_LIKE');
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

  describe('9. Sensor-Health Lifecycle & Deterministic Recovery (Task 17.5 §4)', () => {
    it('combineSensorHealth strictly enforces severity precedence OK < DEG < OUT', async () => {
      const { combineSensorHealth } = await import('@/sim/engine');

      // OK with others
      expect(combineSensorHealth('OK', 'OK')).toBe('OK');
      expect(combineSensorHealth('OK', 'DEG')).toBe('DEG');
      expect(combineSensorHealth('OK', 'OUT')).toBe('OUT');

      // DEG with others (cannot heal OUT, cannot be healed by OK)
      expect(combineSensorHealth('DEG', 'OK')).toBe('DEG');
      expect(combineSensorHealth('DEG', 'DEG')).toBe('DEG');
      expect(combineSensorHealth('DEG', 'OUT')).toBe('OUT');

      // OUT with others (never healed by OK or DEG)
      expect(combineSensorHealth('OUT', 'OK')).toBe('OUT');
      expect(combineSensorHealth('OUT', 'DEG')).toBe('OUT');
      expect(combineSensorHealth('OUT', 'OUT')).toBe('OUT');
    });

    it('temporary chaos automatically recovers to baseline when chaos ends', async () => {
      const { SimEngine } = await import('@/sim/engine');
      const engine = new SimEngine();
      engine.load({
        id: 'test-chaos-recovery',
        mode: 'TRAIN',
        difficulty: 0.3,
        durationMs: 30000,
        seed: 42,
        threats: [],
        chaos: [
          { type: 'FOG', severity: 0.8, tStartMs: 5000, tEndMs: 10000 },
          { type: 'JAMMING', severity: 1.0, tStartMs: 12000, tEndMs: 18000 },
        ],
      } as unknown as import('@/sim/types').ScenarioSpec);

      // At t = 0ms: All OK
      const h0 = engine.getEffectiveSensorHealth(0);
      expect(h0.EOIR).toBe('OK');
      expect(h0.RF).toBe('OK');

      // At t = 7000ms: During FOG -> EOIR is DEG
      const hFog = engine.getEffectiveSensorHealth(7000);
      expect(hFog.EOIR).toBe('DEG');

      // At t = 11000ms: After FOG ended -> EOIR automatically recovers to OK!
      const hFogEnded = engine.getEffectiveSensorHealth(11000);
      expect(hFogEnded.EOIR).toBe('OK');

      // At t = 15000ms: During JAMMING -> RF is OUT
      const hJam = engine.getEffectiveSensorHealth(15000);
      expect(hJam.RF).toBe('OUT');

      // At t = 20000ms: After JAMMING ended -> RF automatically recovers to OK!
      const hJamEnded = engine.getEffectiveSensorHealth(20000);
      expect(hJamEnded.RF).toBe('OK');
    });

    it('temporary environmental chaos never repairs a damaged baseline sensor', async () => {
      const { SimEngine } = await import('@/sim/engine');
      const engine = new SimEngine();
      engine.load({
        id: 'test-damaged-baseline',
        mode: 'TRAIN',
        difficulty: 0.3,
        durationMs: 30000,
        seed: 42,
        threats: [],
        chaos: [
          { type: 'FOG', severity: 0.8, tStartMs: 5000, tEndMs: 10000 },
        ],
      } as unknown as import('@/sim/types').ScenarioSpec);

      // Baseline damaged sensor (e.g. damaged during maintenance)
      engine.baselineSensorHealth.EOIR = 'OUT';

      // Clear conditions cannot repair it:
      expect(engine.getEffectiveSensorHealth(0).EOIR).toBe('OUT');
      // Fog cannot downgrade OUT to DEG:
      expect(engine.getEffectiveSensorHealth(7000).EOIR).toBe('OUT');
      // Fog ending cannot repair it:
      expect(engine.getEffectiveSensorHealth(12000).EOIR).toBe('OUT');
    });
  });

  describe('10. Neutral Airframe Recognition & Morphology Diversity (Task 17.5 §5)', () => {
    it('different threat classes display identical neutral category', () => {
      // FPV Attack drone (threat class HOSTILE_ATTACK)
      const fpvEntity = makeSimEntity({ trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK' });
      const fpvObs = evaluateSensorObservation(fpvEntity, basePipelineContext);
      const fpvResult = resolveTargetPresentation(makeTrack({ sensorObservation: fpvObs }), baseContext);

      // Swarm element (threat class SWARM_ELEMENT)
      const swarmEntity = makeSimEntity({ trueClass: 'SWARM_ELEMENT', droneType: 'SWARM_ELEMENT' });
      const swarmObs = evaluateSensorObservation(swarmEntity, basePipelineContext);
      const swarmResult = resolveTargetPresentation(makeTrack({ sensorObservation: swarmObs }), baseContext);

      expect(fpvResult.presentationCategory).toBe('OBSERVED_MULTIROTOR');
      expect(swarmResult.presentationCategory).toBe('OBSERVED_MULTIROTOR');
      expect(fpvResult.presentationCategory).toBe(swarmResult.presentationCategory);
    });

    it('procedural model factory instantiates distinct morphology variants under neutral category', () => {
      const factory = new TargetModelFactory();

      // Compact variant (FPV geometry)
      const compactModel = factory.createModel('OBSERVED_MULTIROTOR', 'T-01', 'MULTIROTOR_COMPACT');
      expect(compactModel.category).toBe('OBSERVED_MULTIROTOR');

      // Recon quad variant (Camera pod geometry)
      const podModel = factory.createModel('OBSERVED_MULTIROTOR', 'T-02', 'MULTIROTOR_WITH_CAMERA_POD');
      expect(podModel.category).toBe('OBSERVED_MULTIROTOR');

      // Fixed wing variant
      const fixedWingModel = factory.createModel('OBSERVED_FIXED_WING', 'T-03');
      expect(fixedWingModel.category).toBe('OBSERVED_FIXED_WING');

      // Morphology features: podModel features a spherical camera-pod / gimbal turret,
      // while compactModel features a forward-canted camera snout and box avionics body
      expect(podModel.accentMesh.geometry.type).toBe('SphereGeometry');
      expect(compactModel.accentMesh.geometry.type).toBe('ConeGeometry');
      expect(podModel.bodyMesh.geometry.type).toBe('CylinderGeometry');
      expect(compactModel.bodyMesh.geometry.type).toBe('BoxGeometry');

      factory.dispose();
    });

    it('invalid observation provenance fails safely to RADAR_SYMBOL', () => {
      // Provenance invalid: negative confidence
      const badTrack = makeTrack({
        sensorObservation: makeObservation({
          confidence: -0.5,
        }),
      });
      const result = resolveTargetPresentation(badTrack, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.reason).toMatch(/validation|provenance/i);
    });
  });

  describe('11. Fail-Closed Sensor Health & Contract Validation (Task 17.5.1 Part B & C)', () => {
    it('1. missing sensor-health record fails closed to SENSOR_OFFLINE and RADAR_SYMBOL', () => {
      const track = makeTrack();
      const ctx: SensorObservationContext = {
        ...baseContext,
        sensorHealth: undefined,
      };
      const result = resolveTargetPresentation(track, ctx);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('SENSOR_OFFLINE');
      expect(result.reason).toContain('Sensor health validation failed');
    });

    it('2. missing EOIR health key fails closed to SENSOR_OFFLINE and RADAR_SYMBOL', () => {
      const track = makeTrack();
      const ctx: SensorObservationContext = {
        ...baseContext,
        sensorHealth: { RADAR: 'OK', RF: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/render3d/targets/targetObservation').SensorHealthState>,
      };
      const result = resolveTargetPresentation(track, ctx);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('SENSOR_OFFLINE');
      expect(result.reason).toContain('Missing sensor health key: EOIR');
    });

    it('3. invalid sensor-health string fails closed to SENSOR_OFFLINE and RADAR_SYMBOL', () => {
      const track = makeTrack();
      const ctx: SensorObservationContext = {
        ...baseContext,
        sensorHealth: { RADAR: 'OK', EOIR: 'NOMINAL', RF: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/render3d/targets/targetObservation').SensorHealthState>,
      };
      const result = resolveTargetPresentation(track, ctx);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('SENSOR_OFFLINE');
      expect(result.reason).toContain('Invalid sensor health state for EOIR');
    });

    it('4. valid OK health allows resolved optical model when observation is clear', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          resolution: 'FULL',
          resolutionLevel: 'FULL',
          visibilityState: 'CLEAR',
          sensorHealth: 'OK',
          sensorAvailability: true,
          signature: 'MULTIROTOR_COMPACT',
        }),
      });
      const ctx: SensorObservationContext = {
        ...baseContext,
        sensorHealth: { RADAR: 'OK', EOIR: 'OK', RF: 'OK' },
      };
      const result = resolveTargetPresentation(track, ctx);
      expect(result.presentationCategory).toBe('OBSERVED_MULTIROTOR');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
    });

    it('5. valid DEG health restricts presentation to UNKNOWN_AIRFRAME / DEGRADED_OPTICAL', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          resolution: 'DEGRADED',
          resolutionLevel: 'DEGRADED',
          visibilityState: 'DEGRADED',
          sensorHealth: 'DEG',
          sensorAvailability: true,
        }),
      });
      const ctx: SensorObservationContext = {
        ...baseContext,
        sensorHealth: { RADAR: 'OK', EOIR: 'DEG', RF: 'OK' },
      };
      const result = resolveTargetPresentation(track, ctx);
      expect(result.presentationCategory).toBe('UNKNOWN_AIRFRAME');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('DEGRADED_OPTICAL');
    });

    it('6. valid OUT health forces RADAR_SYMBOL / SENSOR_OFFLINE', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          sensorHealth: 'OUT',
          sensorAvailability: false,
          resolution: 'UNRESOLVED',
          resolutionLevel: 'UNRESOLVED',
        }),
      });
      const ctx: SensorObservationContext = {
        ...baseContext,
        sensorHealth: { RADAR: 'OK', EOIR: 'OUT', RF: 'OK' },
      };
      const result = resolveTargetPresentation(track, ctx);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('SENSOR_OFFLINE');
    });

    it('7. NaN timestamp fails validation and produces RADAR_SYMBOL', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: NaN,
        }),
      });
      const result = resolveTargetPresentation(track, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('must be finite number');
    });

    it('8. infinite timestamp fails validation and produces RADAR_SYMBOL', () => {
      const trackPosInf = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: Infinity,
        }),
      });
      const resultPos = resolveTargetPresentation(trackPosInf, baseContext);
      expect(resultPos.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultPos.isVisuallyResolved).toBe(false);

      const trackNegInf = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: -Infinity,
        }),
      });
      const resultNeg = resolveTargetPresentation(trackNegInf, baseContext);
      expect(resultNeg.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultNeg.isVisuallyResolved).toBe(false);
    });

    it('9. future timestamp beyond tolerance fails validation and produces RADAR_SYMBOL', () => {
      // baseContext currentSimMs = 5000, tolerance = 50ms. Timestamp 5100 is > 5050ms.
      const track = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: 5100,
        }),
      });
      const result = resolveTargetPresentation(track, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('future');
    });

    it('10. stale timestamp beyond max age fails validation and produces RADAR_SYMBOL', () => {
      // baseContext currentSimMs = 5000, max age = 1000ms. Timestamp 3500 is < 4000ms.
      const track = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: 3500,
        }),
      });
      const result = resolveTargetPresentation(track, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('stale');
    });

    it('11. valid current timestamp within tolerance passes validation', () => {
      // Timestamp within [4000, 5050]
      const trackExact = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: 5000,
        }),
      });
      const resultExact = resolveTargetPresentation(trackExact, baseContext);
      expect(resultExact.isVisuallyResolved).toBe(true);

      const trackWithinTol = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: 5030,
        }),
      });
      const resultWithinTol = resolveTargetPresentation(trackWithinTol, baseContext);
      expect(resultWithinTol.isVisuallyResolved).toBe(true);
    });

    it('12. sensor availability and health inconsistency is rejected fail-closed', () => {
      // sensorHealth OUT but availability true
      const trackInconsistent1 = makeTrack({
        sensorObservation: makeObservation({
          sensorHealth: 'OUT',
          sensorAvailability: true,
        }),
      });
      const result1 = resolveTargetPresentation(trackInconsistent1, baseContext);
      expect(result1.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result1.isVisuallyResolved).toBe(false);
      expect(result1.reason).toContain('Inconsistent');

      // sensorHealth OK but availability false
      const trackInconsistent2 = makeTrack({
        sensorObservation: makeObservation({
          sensorHealth: 'OK',
          sensorAvailability: false,
        }),
      });
      const result2 = resolveTargetPresentation(trackInconsistent2, baseContext);
      expect(result2.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result2.isVisuallyResolved).toBe(false);
      expect(result2.reason).toContain('Inconsistent');
    });

    it('13. invalid sensor source fails validation for optical airframe model', () => {
      const trackRadar = makeTrack({
        sensorObservation: makeObservation({
          sensorSource: 'RADAR' as unknown as 'EOIR',
        }),
      });
      const resultRadar = resolveTargetPresentation(trackRadar, baseContext);
      expect(resultRadar.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultRadar.isVisuallyResolved).toBe(false);
      expect(resultRadar.reason).toContain('Invalid observation sensorSource');

      const trackInvalid = makeTrack({
        sensorObservation: makeObservation({
          sensorSource: 'SONAR' as unknown as 'EOIR',
        }),
      });
      const resultInvalid = resolveTargetPresentation(trackInvalid, baseContext);
      expect(resultInvalid.presentationCategory).toBe('RADAR_SYMBOL');
      expect(resultInvalid.isVisuallyResolved).toBe(false);
    });

    it('14. inconsistent resolution fields are rejected fail-closed', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          resolutionLevel: 'FULL',
          resolution: 'DEGRADED',
        }),
      });
      const result = resolveTargetPresentation(track, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Inconsistent observation resolution fields');
    });

    it('15. every valid visibility-state value in the declared union is accepted', () => {
      const validVisibilityStates: Array<import('@/render3d/types').OpticalVisibilityState> = [
        'CLEAR',
        'DEGRADED',
        'DEGRADED_FOG',
        'DEGRADED_RAIN',
        'DEGRADED_NIGHT_THERMAL',
        'MASKED',
        'OUT_OF_RANGE',
      ];

      for (const visState of validVisibilityStates) {
        const isResolved = visState === 'CLEAR';
        const isDegraded = visState.startsWith('DEGRADED');
        const track = makeTrack({
          sensorObservation: makeObservation({
            visibilityState: visState,
            resolutionLevel: isResolved ? 'FULL' : isDegraded ? 'DEGRADED' : 'UNRESOLVED',
            resolution: isResolved ? 'FULL' : isDegraded ? 'DEGRADED' : 'UNRESOLVED',
          }),
        });
        const result = resolveTargetPresentation(track, baseContext);
        // None of these should fail with "Invalid observation visibilityState"
        expect(result.reason).not.toContain('Invalid observation visibilityState');
      }
    });

    it('16. invalid/corrupted observation never produces a resolved physical model', () => {
      const corruptedPayloads = [
        makeObservation({ confidence: -1 }),
        makeObservation({ confidence: 1.5 }),
        makeObservation({ timestampMs: NaN }),
        makeObservation({ timestampMs: 999999 }), // far future
        makeObservation({ sensorHealth: 'OUT', resolutionLevel: 'FULL' }),
        makeObservation({ sensorAvailability: false, resolutionLevel: 'FULL' }),
        makeObservation({ visibilityState: 'MASKED', resolutionLevel: 'FULL' }),
        makeObservation({ signature: 'UNRESOLVED_AIRFRAME', resolutionLevel: 'FULL' }),
        makeObservation({ signature: 'MULTIROTOR_COMPACT', observedSignature: 'FIXED_WING_DELTA' }),
      ];

      for (const payload of corruptedPayloads) {
        const track = makeTrack({ sensorObservation: payload });
        const result = resolveTargetPresentation(track, baseContext);
        expect(result.isVisuallyResolved).toBe(false);
        expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      }
    });
  });

  describe('12. Mandatory Simulation Clock & Exact Timestamp Boundaries (Task 17.5.2)', () => {
    it('1. missing currentSimMs is rejected fail-closed to RADAR_SYMBOL', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ timestampMs: 5000 }) });
      const contextWithoutSimTime = {
        activeSensor: 'EOIR' as const,
        displayMode: 'AUTO' as const,
        sensorHealth: { RADAR: 'OK' as const, EOIR: 'OK' as const, RF: 'OK' as const },
      } as unknown as SensorObservationContext;
      const result = resolveTargetPresentation(track, contextWithoutSimTime);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Simulation clock missing or invalid');
    });

    it('2. null currentSimMs is rejected fail-closed to RADAR_SYMBOL', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ timestampMs: 5000 }) });
      const contextNullSimTime = {
        ...baseContext,
        currentSimMs: null as unknown as number,
      };
      const result = resolveTargetPresentation(track, contextNullSimTime);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Simulation clock missing or invalid');
    });

    it('3. NaN currentSimMs is rejected fail-closed to RADAR_SYMBOL', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ timestampMs: 5000 }) });
      const contextNanSimTime = {
        ...baseContext,
        currentSimMs: NaN,
      };
      const result = resolveTargetPresentation(track, contextNanSimTime);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Simulation clock missing or invalid');
    });

    it('4. Infinity currentSimMs is rejected fail-closed to RADAR_SYMBOL', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ timestampMs: 5000 }) });
      for (const inf of [Infinity, -Infinity]) {
        const contextInfSimTime = {
          ...baseContext,
          currentSimMs: inf,
        };
        const result = resolveTargetPresentation(track, contextInfSimTime);
        expect(result.presentationCategory).toBe('RADAR_SYMBOL');
        expect(result.isVisuallyResolved).toBe(false);
        expect(result.reason).toContain('Simulation clock missing or invalid');
      }
    });

    it('5. negative currentSimMs is rejected fail-closed to RADAR_SYMBOL', () => {
      const track = makeTrack({ sensorObservation: makeObservation({ timestampMs: -50 }) });
      const contextNegSimTime = {
        ...baseContext,
        currentSimMs: -100,
      };
      const result = resolveTargetPresentation(track, contextNegSimTime);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Simulation clock missing or invalid');
    });

    it('6. valid currentSimMs = 5000 is accepted when observation is valid', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          signature: 'FIXED_WING_DELTA',
          observedSignature: 'FIXED_WING_DELTA',
          timestampMs: 5000,
        }),
      });
      const contextValid = {
        ...baseContext,
        currentSimMs: 5000,
      };
      const result = resolveTargetPresentation(track, contextValid);
      expect(result.presentationCategory).toBe('OBSERVED_FIXED_WING');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
    });

    it('7. exact future boundary: observation timestamp = currentSimMs + 50 is accepted', () => {
      const currentSimMs = 5000;
      const track = makeTrack({
        sensorObservation: makeObservation({
          signature: 'MULTIROTOR_COMPACT',
          observedSignature: 'MULTIROTOR_COMPACT',
          timestampMs: currentSimMs + 50, // exactly +50ms
        }),
      });
      const context = { ...baseContext, currentSimMs };
      const result = resolveTargetPresentation(track, context);
      expect(result.presentationCategory).toBe('OBSERVED_MULTIROTOR');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
    });

    it('8. future beyond boundary: observation timestamp = currentSimMs + 51 is rejected to RADAR_SYMBOL', () => {
      const currentSimMs = 5000;
      const track = makeTrack({
        sensorObservation: makeObservation({
          signature: 'MULTIROTOR_COMPACT',
          observedSignature: 'MULTIROTOR_COMPACT',
          timestampMs: currentSimMs + 51, // +51ms (> 50ms)
        }),
      });
      const context = { ...baseContext, currentSimMs };
      const result = resolveTargetPresentation(track, context);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('exceeds future tolerance');
    });

    it('9. exact age boundary: observation timestamp = currentSimMs - 1000 is accepted', () => {
      const currentSimMs = 5000;
      const track = makeTrack({
        sensorObservation: makeObservation({
          signature: 'FIXED_WING_DELTA',
          observedSignature: 'FIXED_WING_DELTA',
          timestampMs: currentSimMs - 1000, // exactly -1000ms
        }),
      });
      const context = { ...baseContext, currentSimMs };
      const result = resolveTargetPresentation(track, context);
      expect(result.presentationCategory).toBe('OBSERVED_FIXED_WING');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
    });

    it('10. stale beyond boundary: observation timestamp = currentSimMs - 1001 is rejected to RADAR_SYMBOL', () => {
      const currentSimMs = 5000;
      const track = makeTrack({
        sensorObservation: makeObservation({
          signature: 'FIXED_WING_DELTA',
          observedSignature: 'FIXED_WING_DELTA',
          timestampMs: currentSimMs - 1001, // -1001ms (< -1000ms)
        }),
      });
      const context = { ...baseContext, currentSimMs };
      const result = resolveTargetPresentation(track, context);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('is stale');
    });

    it('11. missing observation timestamp is rejected to RADAR_SYMBOL', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: undefined as unknown as number,
        }),
      });
      const result = resolveTargetPresentation(track, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Invalid observation timestampMs');
    });

    it('12. NaN observation timestamp is rejected to RADAR_SYMBOL', () => {
      const track = makeTrack({
        sensorObservation: makeObservation({
          timestampMs: NaN,
        }),
      });
      const result = resolveTargetPresentation(track, baseContext);
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.reason).toContain('Invalid observation timestampMs');
    });

    it('13. infinite observation timestamp is rejected to RADAR_SYMBOL', () => {
      for (const inf of [Infinity, -Infinity]) {
        const track = makeTrack({
          sensorObservation: makeObservation({
            timestampMs: inf,
          }),
        });
        const result = resolveTargetPresentation(track, baseContext);
        expect(result.presentationCategory).toBe('RADAR_SYMBOL');
        expect(result.isVisuallyResolved).toBe(false);
        expect(result.reason).toContain('Invalid observation timestampMs');
      }
    });

    it('14. missing or invalid simulation clock never resolves OBSERVED_MULTIROTOR, OBSERVED_FIXED_WING, or BIRD', () => {
      const opticalSignatures = ['MULTIROTOR_COMPACT', 'FIXED_WING_DELTA', 'BIRD_LIKE'] as const;
      const invalidSimTimes = [undefined, null, NaN, Infinity, -Infinity, -1, -500];

      for (const sig of opticalSignatures) {
        for (const simTime of invalidSimTimes) {
          const track = makeTrack({
            sensorObservation: makeObservation({
              signature: sig,
              observedSignature: sig,
              timestampMs: 5000,
            }),
          });
          const context = {
            ...baseContext,
            currentSimMs: simTime as unknown as number,
          };
          const presentation = resolveTargetPresentation(track, context);
          expect(presentation.isVisuallyResolved).toBe(false);
          expect(presentation.presentationCategory).toBe('RADAR_SYMBOL');
          expect(['OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING', 'BIRD']).not.toContain(
            presentation.presentationCategory
          );

          // Also verify resolveTargetModelCategory fail-closed
          const modelCat = resolveTargetModelCategory(track, { context });
          expect(modelCat).toBe('RADAR_SYMBOL');
        }
      }
    });
  });

  describe('13. Observation Timestamp Epoch Validation & Producer Sensor-Health Hardening (Task 17.5.3)', () => {
    const validPipelineContext: SensorObservationPipelineContext = {
      activeSensor: 'EOIR',
      sensorHealth: { RADAR: 'OK', EOIR: 'OK', RF: 'OK' },
      currentSimMs: 5000,
      weather: 'CLEAR',
      isNight: false,
      sensorPos: { x: 0, y: 0, z: 0 },
    };

    describe('A. Producer Sensor-Health Validation', () => {
      it('1. missing or non-object sensorHealth returns null from producer', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const invalidHealths: unknown[] = [undefined, null, 'OK', 123, true, [], {}];
        for (const h of invalidHealths) {
          const ctx = { ...validPipelineContext, sensorHealth: h as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus> };
          expect(evaluateSensorObservation(entity, ctx)).toBeNull();
          expect(validateProducerSensorHealth(h).isValid).toBe(false);
        }
      });

      it('2. missing RADAR key fails closed and returns null from producer', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx = {
          ...validPipelineContext,
          sensorHealth: { EOIR: 'OK', RF: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus>,
        };
        expect(evaluateSensorObservation(entity, ctx)).toBeNull();
        const v = validateProducerSensorHealth(ctx.sensorHealth);
        expect(v.isValid).toBe(false);
        expect((v as { error: string }).error).toContain('Missing sensor health key: RADAR');
      });

      it('3. missing EOIR key fails closed and returns null from producer (never defaults to OK)', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx = {
          ...validPipelineContext,
          sensorHealth: { RADAR: 'OK', RF: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus>,
        };
        expect(evaluateSensorObservation(entity, ctx)).toBeNull();
        const v = validateProducerSensorHealth(ctx.sensorHealth);
        expect(v.isValid).toBe(false);
        expect((v as { error: string }).error).toContain('Missing sensor health key: EOIR');
      });

      it('4. missing RF key fails closed and returns null from producer', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx = {
          ...validPipelineContext,
          sensorHealth: { RADAR: 'OK', EOIR: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus>,
        };
        expect(evaluateSensorObservation(entity, ctx)).toBeNull();
        const v = validateProducerSensorHealth(ctx.sensorHealth);
        expect(v.isValid).toBe(false);
        expect((v as { error: string }).error).toContain('Missing sensor health key: RF');
      });

      it('5. null, undefined, or invalid health string on any mode fails closed', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const badRecords: Array<Record<string, unknown>> = [
          { RADAR: 'OK', EOIR: null, RF: 'OK' },
          { RADAR: 'OK', EOIR: undefined, RF: 'OK' },
          { RADAR: 'OK', EOIR: 'BROKEN', RF: 'OK' },
          { RADAR: 'UNKNOWN', EOIR: 'OK', RF: 'OK' },
          { RADAR: 'OK', EOIR: 'OK', RF: 'OFFLINE' },
          { RADAR: 'OK', EOIR: 1, RF: 'OK' },
        ];
        for (const bad of badRecords) {
          const ctx = { ...validPipelineContext, sensorHealth: bad as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus> };
          expect(evaluateSensorObservation(entity, ctx)).toBeNull();
          expect(validateProducerSensorHealth(bad).isValid).toBe(false);
        }
      });

      it('6. explicit OK behavior remains valid and produces approved optical observation', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const obs = evaluateSensorObservation(entity, validPipelineContext);
        expect(obs).not.toBeNull();
        expect(obs?.resolutionLevel).toBe('FULL');
        expect(obs?.sensorHealth).toBe('OK');
        expect(obs?.sensorAvailability).toBe(true);
      });

      it('7. explicit DEG behavior remains degraded and produces DEGRADED observation', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx: SensorObservationPipelineContext = {
          ...validPipelineContext,
          sensorHealth: {
            RADAR: 'OK' as const,
            EOIR: 'DEG' as const,
            RF: 'OK' as const,
          },
        };
        const obs = evaluateSensorObservation(entity, ctx);
        expect(obs).not.toBeNull();
        expect(obs?.resolutionLevel).toBe('DEGRADED');
        expect(obs?.sensorHealth).toBe('DEG');
        expect(obs?.sensorAvailability).toBe(true);
      });

      it('8. explicit OUT behavior remains offline and produces UNRESOLVED observation', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx: SensorObservationPipelineContext = {
          ...validPipelineContext,
          sensorHealth: {
            RADAR: 'OK' as const,
            EOIR: 'OUT' as const,
            RF: 'OK' as const,
          },
        };
        const obs = evaluateSensorObservation(entity, ctx);
        expect(obs).not.toBeNull();
        expect(obs?.resolutionLevel).toBe('UNRESOLVED');
        expect(obs?.sensorHealth).toBe('OUT');
        expect(obs?.sensorAvailability).toBe(false);
      });
    });

    describe('B. Producer Simulation Clock Validation', () => {
      it('1. missing, null, NaN, or infinite simMs returns null from producer', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const badTimes: unknown[] = [undefined, null, NaN, Infinity, -Infinity, '5000', {}];
        for (const t of badTimes) {
          const ctx = { ...validPipelineContext, currentSimMs: t as unknown as number };
          expect(evaluateSensorObservation(entity, ctx)).toBeNull();
          expect(isValidProducerSimTime(t)).toBe(false);
        }
      });

      it('2. negative simulation time (< 0) returns null from producer', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        for (const neg of [-1, -50, -1000]) {
          const ctx = { ...validPipelineContext, currentSimMs: neg };
          expect(evaluateSensorObservation(entity, ctx)).toBeNull();
          expect(isValidProducerSimTime(neg)).toBe(false);
        }
      });

      it('3. zero simulation time (0) is accepted and generates timestampMs = 0', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx = { ...validPipelineContext, currentSimMs: 0 };
        const obs = evaluateSensorObservation(entity, ctx);
        expect(obs).not.toBeNull();
        expect(obs?.timestampMs).toBe(0);
        expect(isValidProducerSimTime(0)).toBe(true);
      });

      it('4. valid positive simulation time generates timestampMs = currentSimMs', () => {
        const entity = makeSimEntity({ pos: { x: 800, y: 800, z: 100 } });
        const ctx = { ...validPipelineContext, currentSimMs: 12500 };
        const obs = evaluateSensorObservation(entity, ctx);
        expect(obs).not.toBeNull();
        expect(obs?.timestampMs).toBe(12500);
        expect(isValidProducerSimTime(12500)).toBe(true);
      });
    });

    describe('C. Observation Timestamp Epoch Validation & Boundaries', () => {
      it.each([
        { id: '1', simMs: 0, timestampMs: -1, label: 'simMs = 0, timestampMs = -1' },
        { id: '2', simMs: 0, timestampMs: -50, label: 'simMs = 0, timestampMs = -50' },
        { id: '3', simMs: 5000, timestampMs: -1, label: 'simMs = 5000, timestampMs = -1' },
      ])('$id. negative timestamp at $label is rejected to RADAR_SYMBOL', ({ simMs, timestampMs }) => {
        const track = makeTrack({
          sensorObservation: makeObservation({
            timestampMs,
          }),
        });
        const context: SensorObservationContext = {
          ...baseContext,
          currentSimMs: simMs,
        };
        const result = resolveTargetPresentation(track, context);
        expect(result.presentationCategory).toBe('RADAR_SYMBOL');
        expect(result.isVisuallyResolved).toBe(false);
        expect(result.reason).toContain('Invalid observation timestampMs');
      });

      it('4. timestamp exactly zero at simulation time zero (simMs = 0, timestampMs = 0) is accepted', () => {
        const track = makeTrack({
          sensorObservation: makeObservation({
            signature: 'MULTIROTOR_COMPACT',
            observedSignature: 'MULTIROTOR_COMPACT',
            timestampMs: 0,
          }),
        });
        const context: SensorObservationContext = {
          ...baseContext,
          currentSimMs: 0,
        };
        const result = resolveTargetPresentation(track, context);
        expect(result.presentationCategory).toBe('OBSERVED_MULTIROTOR');
        expect(result.isVisuallyResolved).toBe(true);
        expect(result.observationState).toBe('CLEAR_OPTICAL');
      });

      it('5. exact future boundary: simMs = 5000, timestampMs = 5050 is accepted', () => {
        const track = makeTrack({
          sensorObservation: makeObservation({
            signature: 'FIXED_WING_DELTA',
            observedSignature: 'FIXED_WING_DELTA',
            timestampMs: 5050,
          }),
        });
        const context: SensorObservationContext = {
          ...baseContext,
          currentSimMs: 5000,
        };
        const result = resolveTargetPresentation(track, context);
        expect(result.presentationCategory).toBe('OBSERVED_FIXED_WING');
        expect(result.isVisuallyResolved).toBe(true);
      });

      it('7. exact age boundary: simMs = 5000, timestampMs = 4000 is accepted', () => {
        const track = makeTrack({
          sensorObservation: makeObservation({
            signature: 'FIXED_WING_DELTA',
            observedSignature: 'FIXED_WING_DELTA',
            timestampMs: 4000,
          }),
        });
        const context: SensorObservationContext = {
          ...baseContext,
          currentSimMs: 5000,
        };
        const result = resolveTargetPresentation(track, context);
        expect(result.presentationCategory).toBe('OBSERVED_FIXED_WING');
        expect(result.isVisuallyResolved).toBe(true);
      });

      it.each([
        { id: '6', timestampMs: 5051, label: 'future beyond boundary: simMs = 5000, timestampMs = 5051', reasonSubstring: 'exceeds future tolerance' },
        { id: '8', timestampMs: 3999, label: 'stale beyond boundary: simMs = 5000, timestampMs = 3999', reasonSubstring: 'is stale' },
        { id: '9', timestampMs: 0, label: 'stale beyond boundary: simMs = 5000, timestampMs = 0 (5s stale)', reasonSubstring: 'is stale' },
      ])('$id. $label is rejected to RADAR_SYMBOL', ({ timestampMs, reasonSubstring }) => {
        const track = makeTrack({
          sensorObservation: makeObservation({
            signature: 'FIXED_WING_DELTA',
            observedSignature: 'FIXED_WING_DELTA',
            timestampMs,
          }),
        });
        const context: SensorObservationContext = {
          ...baseContext,
          currentSimMs: 5000,
        };
        const result = resolveTargetPresentation(track, context);
        expect(result.presentationCategory).toBe('RADAR_SYMBOL');
        expect(result.isVisuallyResolved).toBe(false);
        expect(result.reason).toContain(reasonSubstring);
      });

      it('10. negative timestamps never resolve OBSERVED_MULTIROTOR, OBSERVED_FIXED_WING, or BIRD', () => {
        const opticalSignatures = ['MULTIROTOR_COMPACT', 'FIXED_WING_DELTA', 'BIRD_LIKE'] as const;
        const negativeTimestamps = [-1, -50, -100, -9999];

        for (const sig of opticalSignatures) {
          for (const ts of negativeTimestamps) {
            const track = makeTrack({
              sensorObservation: makeObservation({
                signature: sig,
                observedSignature: sig,
                timestampMs: ts,
              }),
            });
            const context: SensorObservationContext = {
              ...baseContext,
              currentSimMs: 0,
            };
            const presentation = resolveTargetPresentation(track, context);
            expect(presentation.isVisuallyResolved).toBe(false);
            expect(presentation.presentationCategory).toBe('RADAR_SYMBOL');
            expect(['OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING', 'BIRD']).not.toContain(
              presentation.presentationCategory
            );
          }
        }
      });
    });

    describe('D. End-to-End Pipeline: Malformed Producer Inputs Fail Closed to RADAR_SYMBOL', () => {
      it('1. tracks created with malformed producer inputs fail closed to RADAR_SYMBOL', () => {
        const entity = makeSimEntity({ droneType: 'FPV_ATTACK' });
        const malformedContexts: SensorObservationPipelineContext[] = [
          { ...validPipelineContext, sensorHealth: { RADAR: 'OK', RF: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus> },
          { ...validPipelineContext, sensorHealth: null as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus> },
          { ...validPipelineContext, sensorHealth: { RADAR: 'OK', EOIR: 'MALFUNCTION', RF: 'OK' } as unknown as Record<import('@/sim/types').SensorMode, import('@/sim/engine').SensorHealthStatus> },
          { ...validPipelineContext, currentSimMs: -1 },
          { ...validPipelineContext, currentSimMs: NaN },
        ];

        for (const badCtx of malformedContexts) {
          const obs = evaluateSensorObservation(entity, badCtx);
          const opTrack = {
            trackNo: 'TRK-01',
            entityId: 'sim-ent-01',
            estPos: { x: 1000, y: 1000, z: 120 },
            estVel: { x: 15, y: 0, z: 0 },
            estRangeM: 1419,
            estBearingDeg: 45,
            estSpeedMps: 15,
            estAltBand: 'LOW' as const,
            uncertaintyM: 18,
            isCoasting: false,
            lastMeasurementMs: 5000,
            lastSensorType: 'RADAR' as const,
            sensorSources: ['RADAR' as const],
            q: 0.9,
            cCls: 0,
            traineeLabel: null,
            step: 'TRACK' as const,
            lifecycle: 'ACTIVE' as const,
            sensorObservation: obs,
          } as unknown as import('@/sim/trackerTypes').OperatorTrackView;
          const safeTracks = projectSafeTracks([opTrack], null);
          expect(safeTracks[0].sensorObservation).toBeNull();

          const presentation = resolveTargetPresentation(safeTracks[0], baseContext);
          expect(presentation.isVisuallyResolved).toBe(false);
          expect(presentation.presentationCategory).toBe('RADAR_SYMBOL');
          expect(['OBSERVED_MULTIROTOR', 'OBSERVED_FIXED_WING', 'BIRD']).not.toContain(
            presentation.presentationCategory
          );
        }
      });
    });
  });
});

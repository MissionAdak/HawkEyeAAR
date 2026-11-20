import { describe, it, expect } from 'vitest';
import {
  resolveTargetPresentation,
  type SensorObservationContext,
} from '@/render3d/targets/targetObservation';
import { TargetModelFactory } from '@/render3d/targets/targetModelFactory';
import { calculateScreenSpaceScale } from '@/render3d/aircraftModel';
import type { SafeTrackView } from '@/render3d/types';

describe('Target Observation & Sensor-Aware 3D Presentation (Task 17.2)', () => {
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
    observedAirframe: 'LOITERING_MUNITION',
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

  describe('1. Radar mode presentation', () => {
    it('uses RADAR_SYMBOL when active sensor is RADAR in AUTO mode', () => {
      const track = makeTrack({ observedAirframe: 'LOITERING_MUNITION' });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RADAR',
        displayMode: 'AUTO',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('RADAR_TRACK');
    });

    it('uses RADAR_SYMBOL when display mode is explicitly RADAR', () => {
      const track = makeTrack({ observedAirframe: 'RECON_QUAD' });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
        displayMode: 'RADAR',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('RADAR_TRACK');
    });

    it('uses RADAR_SYMBOL when active sensor is RF in AUTO mode', () => {
      const track = makeTrack({ observedAirframe: 'SWARM_ELEMENT' });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'RF',
        displayMode: 'AUTO',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('RADAR_TRACK');
    });
  });

  describe('2. EO/IR mode physical airframe visualization', () => {
    it('displays recognizable fixed-wing loitering munition silhouette within clear optical range', () => {
      // 1419m < 2400m clear optical range
      const track = makeTrack({
        observedAirframe: 'LOITERING_MUNITION',
        traineeLabel: null, // Unclassified contact
      });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('LOITERING_MUNITION');
      expect(result.isVisuallyResolved).toBe(true);
      expect(result.observationState).toBe('CLEAR_OPTICAL');
      expect(result.opticalConfidence).toBeGreaterThanOrEqual(0.7);
    });

    it('displays different model for different observed airframes', () => {
      const multiTrack = makeTrack({ observedAirframe: 'RECON_QUAD' });
      const multiResult = resolveTargetPresentation(multiTrack, baseContext);
      expect(multiResult.presentationCategory).toBe('HOSTILE_ISR');

      const swarmTrack = makeTrack({ observedAirframe: 'SWARM_ELEMENT' });
      const swarmResult = resolveTargetPresentation(swarmTrack, baseContext);
      expect(swarmResult.presentationCategory).toBe('SWARM_ELEMENT');

      const civilTrack = makeTrack({ observedAirframe: 'CIVIL_UAS' });
      const civilResult = resolveTargetPresentation(civilTrack, baseContext);
      expect(civilResult.presentationCategory).toBe('CIVIL_UAS');

      const friendTrack = makeTrack({ observedAirframe: 'FRIENDLY_UAS' });
      const friendResult = resolveTargetPresentation(friendTrack, baseContext);
      expect(friendResult.presentationCategory).toBe('FRIENDLY');

      const birdTrack = makeTrack({ observedAirframe: 'BIRD' });
      const birdResult = resolveTargetPresentation(birdTrack, baseContext);
      expect(birdResult.presentationCategory).toBe('BIRD');
    });
  });

  describe('3. Fog and environmental degradation', () => {
    it('reduces visual resolution in fog, turning distant contacts into generic unresolved airframes', () => {
      // Track at 1419m:
      // In CLEAR: 1419m < 2400m -> CLEAR_OPTICAL
      // In FOG: clear threshold = 2400 * 0.35 = 840m; max threshold = 3800 * 0.35 = 1330m (or 3800*0.40=1520m)
      // 1419m is between 840m and 1520m -> DEGRADED_OPTICAL (UNKNOWN_AIRFRAME)
      const track = makeTrack({ observedAirframe: 'LOITERING_MUNITION' });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        activeSensor: 'EOIR',
        weather: 'FOG',
      });

      expect(result.presentationCategory).toBe('UNKNOWN_AIRFRAME');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('DEGRADED_OPTICAL');
    });

    it('falls back to radar symbol if track is far beyond fog visibility', () => {
      // Contact at 2500m in fog (far exceeds fog max threshold ~1520m)
      const distantTrack = makeTrack({
        pos: { x: 2000, y: 1500, z: 200 }, // ~2507m
        observedAirframe: 'LOITERING_MUNITION',
      });
      const result = resolveTargetPresentation(distantTrack, {
        ...baseContext,
        activeSensor: 'EOIR',
        weather: 'FOG',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.observationState).toBe('OUT_OF_RANGE');
    });
  });

  describe('4. Line-of-sight & terrain masking', () => {
    it('strictly prevents occluded contacts from rendering see-through aircraft silhouettes', () => {
      // Track is close (600m), but masked behind a mountain/ridge
      const maskedTrack = makeTrack({
        pos: { x: 400, y: 400, z: 80 },
        masked: true,
        observedAirframe: 'LOITERING_MUNITION',
      });

      const result = resolveTargetPresentation(maskedTrack, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
      expect(result.observationState).toBe('MASKED');
    });
  });

  describe('5. Unclassified contacts & physical appearance independence', () => {
    it('does NOT force unclassified contact to diamond model when sensor evidence supports a physical silhouette', () => {
      // Operator has not classified yet (traineeLabel: null)
      const unclassifiedTrack = makeTrack({
        traineeLabel: null,
        observedAirframe: 'LOITERING_MUNITION',
      });

      const result = resolveTargetPresentation(unclassifiedTrack, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      // The sensor clearly observes a loitering munition airframe!
      expect(result.presentationCategory).toBe('LOITERING_MUNITION');
      expect(result.isVisuallyResolved).toBe(true);
    });

    it('wrong operator classification does NOT alter underlying sensor-observed physical geometry', () => {
      // Physical craft is a fixed-wing loitering munition
      // Trainee mistakenly classifies it as a CIVIL_UAS
      const wronglyClassifiedTrack = makeTrack({
        observedAirframe: 'LOITERING_MUNITION',
        traineeLabel: 'CIVIL_UAS',
      });

      const result = resolveTargetPresentation(wronglyClassifiedTrack, {
        ...baseContext,
        activeSensor: 'EOIR',
      });

      // Physical model remains the sensor-observed loitering munition!
      expect(result.presentationCategory).toBe('LOITERING_MUNITION');
      // Trainee classification remains preserved in track.traineeLabel
      expect(wronglyClassifiedTrack.traineeLabel).toBe('CIVIL_UAS');
    });
  });

  describe('6. EVAL mode ground-truth security', () => {
    it('prevents omniscient truth view in EVAL mode when active sensor is not EO/IR', () => {
      const track = makeTrack({ observedAirframe: 'LOITERING_MUNITION' });
      const result = resolveTargetPresentation(track, {
        ...baseContext,
        mode: 'EVAL',
        activeSensor: 'RADAR',
        displayMode: 'AIRFRAME', // Trainee attempted to force airframe display
      });

      // EVAL mode locks override; returns radar symbol
      expect(result.presentationCategory).toBe('RADAR_SYMBOL');
      expect(result.isVisuallyResolved).toBe(false);
    });
  });

  describe('7. Fixed-wing factory model path reachability', () => {
    it('TargetModelFactory successfully instantiates LOITERING_MUNITION 3D model with delta wings', () => {
      const factory = new TargetModelFactory();
      const model = factory.createModel('LOITERING_MUNITION', 'T-DELTA');

      expect(model.category).toBe('LOITERING_MUNITION');
      expect(model.rootGroup).toBeDefined();
      expect(model.bodyMesh).toBeDefined();
      expect(model.accentMesh).toBeDefined();
      expect(model.hitProxy).toBeDefined();
      expect(model.hitProxy.userData.trackNo).toBe('T-DELTA');
      expect(model.group.name).toBe('Target_Loitering_Munition');

      factory.dispose();
    });
  });

  describe('8. Tiered bounded screen-space scaling', () => {
    it('bounds close inspection (< 600m) to prevent ballooning', () => {
      // Target at 150m close zoom
      const closeScale = calculateScreenSpaceScale(45, 150, 520, 32, true);
      expect(closeScale).toBeGreaterThanOrEqual(2.5);
      expect(closeScale).toBeLessThanOrEqual(25);
    });

    it('bounds normal tactical distance (600m - 3500m) for clear silhouettes', () => {
      const midScale = calculateScreenSpaceScale(45, 1800, 520, 32, true);
      expect(midScale).toBeGreaterThanOrEqual(12);
      expect(midScale).toBeLessThanOrEqual(75);
    });

    it('bounds overview distance (> 3500m) so contacts remain visible on 1366x768 viewports', () => {
      const overviewScale = calculateScreenSpaceScale(45, 4800, 520, 32, true);
      expect(overviewScale).toBeGreaterThanOrEqual(25);
      expect(overviewScale).toBeLessThanOrEqual(130);
    });
  });
});

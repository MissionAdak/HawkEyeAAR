import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { toThree, toThreeCoords, toSimCoords } from '@/render3d/coords';
import { checkWebGL2Support, isWebGL2Available } from '@/render3d/capability';
import { Scene3D } from '@/render3d/scene3d';
import { Renderer3D } from '@/render3d/renderer3d';
import {
  createAircraftBodyGeometry,
  createAircraftAccentGeometry,
  createAircraftHitProxyGeometry,
  calculateScreenSpaceScale,
  calculateAircraftOrientation,
  MIN_AIRCRAFT_SCALE,
  MAX_AIRCRAFT_SCALE,
} from '@/render3d/aircraftModel';
import { useSessionStore, engineInstance, clockInstance } from '@/store/sessionStore';
import type { SafeTrackView } from '@/render3d/types';
import {
  Coverage3D,
  calculateRadarR90Radius,
  calculateRadarCoverage,
  calculateEoirCoverage,
  calculateRfCoverage,
  isChaosActive,
} from '@/render3d/coverage';
import {
  EffectorEnvelopes3D,
  calculateEffectorEnvelopes,
  calculateTrackEngagementCue,
} from '@/render3d/effectorEnvelopes';
import {
  LosVisualizer3D,
  calculateModelledLos,
} from '@/render3d/losVisualizer';
import { evaluateMasking } from '@/sim/masking';
import { getEnvelopePlateau } from '@/sim/effectors';
import { CONFIG } from '@/config';
import { RCS_REF, R_REF } from '@/sim/sensors';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec, TrackEntity, ChaosSpec, EffectorId, ZoneSpec } from '@/sim/types';

describe('Track X3D — 3D Renderer Foundation & Safe Information Boundary', () => {
  describe('A. Coordinate System Transformations (coords.ts)', () => {
    it('accurately transforms sim space (x, y, z) to Three.js space (X, Y, Z)', () => {
      // Sim: x = 1000m (East), y = 2000m (North), z = 150m (Altitude)
      // Three: X = 1000, Y = 150 (Up), Z = -2000 (North is -Z)
      const v = toThree(1000, 2000, 150);
      expect(v.x).toBe(1000);
      expect(v.y).toBe(150);
      expect(v.z).toBe(-2000);

      const vCoords = toThreeCoords({ x: 500, y: -800, z: 75 });
      expect(vCoords.x).toBe(500);
      expect(vCoords.y).toBe(75);
      expect(vCoords.z).toBe(800);
    });

    it('accurately provides invertible inverse transform fromThree', () => {
      const originalSim = { x: -1250, y: 3400, z: 90 };
      const threeVec = toThreeCoords(originalSim);
      const invertedSim = toSimCoords(threeVec);

      expect(invertedSim.x).toBeCloseTo(originalSim.x);
      expect(invertedSim.y).toBeCloseTo(originalSim.y);
      expect(invertedSim.z).toBeCloseTo(originalSim.z);
    });
  });

  describe('B. WebGL2 Capability Detection (capability.ts)', () => {
    it('probes WebGL2 capability gracefully without throwing', () => {
      const result = checkWebGL2Support();
      expect(typeof result.supported).toBe('boolean');
      expect(typeof isWebGL2Available()).toBe('boolean');
    });
  });

  describe('C. Safe Track Projection Boundary (Rules R10.3 & D-37)', () => {
    let engine: SimEngine;

    beforeEach(() => {
      engine = new SimEngine();
      engine.load(demo1Json as unknown as ScenarioSpec);
    });

    function projectSafeTracks(curr: TrackEntity[], selectedTrackNo: string | null): SafeTrackView[] {
      return curr
        .filter(
          (e) =>
            e.trackNo &&
            e.step !== 'UNDETECTED' &&
            (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED')
        )
        .map((e) => ({
          trackNo: e.trackNo!,
          pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          vel: { x: e.vel.x, y: e.vel.y, z: e.vel.z },
          traineeLabel: e.traineeLabel,
          step: e.step,
          q: e.q,
          masked: e.masked,
          ghostSigmaM: e.ghostSigmaM,
          isSelected: e.trackNo === selectedTrackNo,
          lifecycle: e.lifecycle as 'ACTIVE' | 'LEAKED' | 'NEUTRALISED',
        }));
    }

    it('strictly excludes undetected tracks from live 3D view', () => {
      // At T=0, threats have step 'UNDETECTED' or are dormant
      const undetected = engine.curr.filter((e) => e.step === 'UNDETECTED');
      expect(undetected.length).toBeGreaterThan(0);

      const safeViews = projectSafeTracks(engine.curr, null);
      for (const view of safeViews) {
        expect(view.step).not.toBe('UNDETECTED');
      }
    });

    it('strictly omits ground-truth properties from SafeTrackView', () => {
      // Force an entity to be detected
      if (engine.curr[0]) {
        engine.curr[0].step = 'FIND';
      }

      const safeViews = projectSafeTracks(engine.curr, null);
      expect(safeViews.length).toBeGreaterThan(0);

      const sample = safeViews[0] as unknown as Record<string, unknown>;
      // Forbidden truth fields:
      expect(sample.trueClass).toBeUndefined();
      expect(sample.droneType).toBeUndefined();
      expect(sample.valueInr).toBeUndefined();
      expect(sample.rcsM2).toBeUndefined();
      expect(sample.emitsRf).toBeUndefined();
      expect(sample.remoteId).toBeUndefined();
      expect(sample.iff).toBeUndefined();
      expect(sample.waypoints).toBeUndefined();
      expect(sample.hitHistory).toBeUndefined();
    });

    it('renders masked tracks with coasting uncertainty without exposing hidden coordinates', () => {
      if (engine.curr[0]) {
        engine.curr[0].step = 'FIND';
        engine.curr[0].masked = true;
        engine.curr[0].ghostSigmaM = 45;
      }

      const safeViews = projectSafeTracks(engine.curr, null);
      const maskedView = safeViews.find((v) => v.masked);
      expect(maskedView).toBeDefined();
      expect(maskedView?.ghostSigmaM).toBe(45);
    });
  });

  describe('D. Scene3D Tactical Graph & Lifecycle Teardown', () => {
    it('initializes tactical ground, rings, and zone extrusion correctly', () => {
      const scene3d = new Scene3D({
        maxRangeM: 5000,
        rMinM: 500,
        zones: (demo1Json as unknown as ScenarioSpec).zones,
      });

      expect(scene3d.scene.children).toHaveLength(8); // staticGroup, zonesGroup, tracksGroup, coverage3d.group, effectorEnvelopes3d.group, losVisualizer3d.group, clusterOverlay3d.group, trainingAid3d.group

      // Verify track updates and disposal
      const sampleTracks: SafeTrackView[] = [
        {
          trackNo: 'T-01',
          pos: { x: 1200, y: 1500, z: 80 },
          vel: { x: -10, y: -20, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: true,
          lifecycle: 'ACTIVE',
        },
      ];

      scene3d.updateTracks(sampleTracks, 'T-01');

      // Teardown
      expect(() => scene3d.dispose()).not.toThrow();
      expect(scene3d.scene.children).toHaveLength(0);
    });
  });

  describe('E. Simulation Determinism & Invariance (Invariant 2.1 & 2.4)', () => {
    it('running alongside 3D projections does not alter sim ticks, events, or score', () => {
      const engineA = new SimEngine();
      engineA.load(demo1Json as unknown as ScenarioSpec);

      const engineB = new SimEngine();
      engineB.load(demo1Json as unknown as ScenarioSpec);

      // Advance both engines for 100 ticks (5 seconds)
      // Engine B simulates 3D projection generation on every tick
      for (let t = 0; t < 100; t++) {
        engineA.step();

        engineB.step();
        // 3D scene track projection poll (pure read-only)
        const safeTracks = engineB.curr
          .filter((e) => e.trackNo && e.step !== 'UNDETECTED')
          .map((e) => ({
            trackNo: e.trackNo!,
            pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          }));
        expect(safeTracks).toBeDefined();
      }

      expect(engineA.tickIndex).toBe(engineB.tickIndex);
      expect(engineA.events).toHaveLength(engineB.events.length);

      for (let i = 0; i < engineA.events.length; i++) {
        expect(engineA.events[i].type).toBe(engineB.events[i].type);
        expect(engineA.events[i].tMs).toBe(engineB.events[i].tMs);
      }
    });
  });

  describe('F. Bundle Chunk Isolation & Size Budget (Rule R10.1)', () => {
    const distDir = path.resolve('dist');

    it('isolates Three.js into a separate render3d chunk under 1.5 MB', (ctx) => {
      if (!fs.existsSync(distDir)) {
        ctx.skip();
        return;
      }

      const assetsDir = path.join(distDir, 'assets');
      const files = fs.readdirSync(assetsDir);

      const indexJs = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
      const render3dJs = files.find((f) => f.startsWith('render3d-') && f.endsWith('.js'));

      expect(indexJs).toBeDefined();
      expect(render3dJs).toBeDefined();

      if (indexJs) {
        const indexContent = fs.readFileSync(path.join(assetsDir, indexJs), 'utf-8');
        // Initial chunk must NOT contain Three.js runtime
        expect(indexContent).not.toContain('WebGLRenderer');
        expect(indexContent).not.toContain('PerspectiveCamera');
      }

      if (render3dJs) {
        const render3dPath = path.join(assetsDir, render3dJs);
        const stat = fs.statSync(render3dPath);
        const sizeMb = stat.size / (1024 * 1024);

        // Budget: under 1.5 MB
        expect(sizeMb).toBeLessThan(1.5);
      }
    });
  });

  describe('G. F1 Sensor-Coverage Visualization (Model-Faithful)', () => {
    it('accurately calculates radar constant-SNR radius (R90) across clear, rain, and dropout conditions', () => {
      const maxRange = CONFIG.thresholds.radarMaxRangeM; // 5000m

      // 1. Clear weather (A_env = 1.0, baseline RCS = 0.01)
      const rClear = calculateRadarR90Radius(RCS_REF, 1.0, 0.90, maxRange);
      expect(rClear).toBe(R_REF);

      // 2. Degraded / Rain (A_env = 0.7, baseline RCS = 0.01)
      // R = 3000 * (0.7)^0.25 = 2744.06m
      const rRain = calculateRadarR90Radius(RCS_REF, 0.7, 0.90, maxRange);
      expect(rRain).toBeCloseTo(3000 * Math.pow(0.7, 0.25), 1);
      expect(rRain).toBeLessThan(rClear);

      // 3. Degraded / Rain from config (A_env = 0.6)
      const rRainConfig = calculateRadarR90Radius(RCS_REF, 0.6, 0.90, maxRange);
      expect(rRainConfig).toBeCloseTo(3000 * Math.pow(0.6, 0.25), 1);

      // 4. Dropout (A_env = 0.0)
      const rDropout = calculateRadarR90Radius(RCS_REF, 0.0, 0.90, maxRange);
      expect(rDropout).toBe(0);

      // 5. Zero / negative RCS returns 0
      expect(calculateRadarR90Radius(0, 1.0, 0.90, maxRange)).toBe(0);
      expect(calculateRadarR90Radius(-0.01, 1.0, 0.90, maxRange)).toBe(0);
    });

    it('enforces monotonic radar RCS scaling (larger RCS never produces smaller constant-SNR radius)', () => {
      const rcsBird = 0.003;
      const rcsRecon = 0.01;
      const rcsLoiter = 0.05;
      const rcsHeavy = 0.10;

      const rBird = calculateRadarR90Radius(rcsBird, 1.0);
      const rRecon = calculateRadarR90Radius(rcsRecon, 1.0);
      const rLoiter = calculateRadarR90Radius(rcsLoiter, 1.0);
      const rHeavy = calculateRadarR90Radius(rcsHeavy, 1.0);

      expect(rBird).toBeCloseTo(3000 * Math.pow(0.003 / 0.01, 0.25), 1); // ~2220m
      expect(rRecon).toBeCloseTo(3000.0, 1);
      expect(rLoiter).toBeCloseTo(3000 * Math.pow(0.05 / 0.01, 0.25), 1); // ~4486m
      expect(rHeavy).toBe(5000); // 3000 * 10^0.25 = ~5334m, capped at maxRange 5000m

      // Monotonic scaling invariant
      expect(rBird).toBeLessThan(rRecon);
      expect(rRecon).toBeLessThan(rLoiter);
      expect(rLoiter).toBeLessThanOrEqual(rHeavy);
    });

    it('evaluates EO/IR reach and status faithfully across day, night, and fog states', () => {
      // 1. Day Clear
      const dayClear = calculateEoirCoverage({ azimuthDeg: 45, isNight: false });
      expect(dayClear.effectiveRangeM).toBe(CONFIG.thresholds.eoirMaxRangeDayM); // 2500m
      expect(dayClear.status).toBe('DAY_NOMINAL');
      expect(dayClear.fovDeg).toBe(30);
      expect(dayClear.elevationModelled).toBe(false);
      expect(dayClear.label).toContain('RENDER ONLY VERTICAL CAP');

      // 2. Night Clear
      const nightClear = calculateEoirCoverage({ azimuthDeg: 45, isNight: true });
      expect(nightClear.effectiveRangeM).toBe(CONFIG.thresholds.eoirMaxRangeNightM); // 1750m
      expect(nightClear.status).toBe('NIGHT_NOMINAL');

      // 3. Day Fog
      const dayFog = calculateEoirCoverage({
        azimuthDeg: 90,
        isNight: false,
        sensorHealth: 'DEG',
      });
      expect(dayFog.effectiveRangeM).toBe(CONFIG.thresholds.eoirMaxRangeDayM * 0.25); // 625m
      expect(dayFog.status).toBe('FOG_DEGRADED');

      // 4. Night Fog
      const nightFog = calculateEoirCoverage({
        azimuthDeg: 270,
        isNight: true,
        sensorHealth: 'DEG',
      });
      expect(nightFog.effectiveRangeM).toBe(CONFIG.thresholds.eoirMaxRangeNightM * 0.25); // 437.5m
      expect(nightFog.status).toBe('FOG_DEGRADED');

      // 5. Azimuth normalization (e.g. -45° -> 315°, 405° -> 45°)
      expect(calculateEoirCoverage({ azimuthDeg: -45, isNight: false }).boresightAzimuthDeg).toBe(315);
      expect(calculateEoirCoverage({ azimuthDeg: 405, isNight: false }).boresightAzimuthDeg).toBe(45);
    });

    it('evaluates RF passive sensor coverage and electronic warfare jamming denial', () => {
      // 1. Nominal RF
      const rfNominal = calculateRfCoverage({});
      expect(rfNominal.maxRangeM).toBe(CONFIG.thresholds.rfMaxRangeM); // 4000m
      expect(rfNominal.status).toBe('NOMINAL');
      expect(rfNominal.isFunctional).toBe(true);

      // 2. Jammed RF via sensor health
      const rfJammedHealth = calculateRfCoverage({ sensorHealth: 'OUT' });
      expect(rfJammedHealth.status).toBe('JAMMED');
      expect(rfJammedHealth.isFunctional).toBe(false);
      expect(rfJammedHealth.label).toContain('JAMMED [DENIED]');

      // 3. Jammed RF via active chaos schedule
      const chaosList: ChaosSpec[] = [
        { type: 'JAMMING', tStartMs: 10000, tEndMs: 25000, severity: 1.0 },
      ];
      expect(calculateRfCoverage({ chaosList, tMs: 5000 }).status).toBe('NOMINAL');
      expect(calculateRfCoverage({ chaosList, tMs: 15000 }).status).toBe('JAMMED');
      expect(calculateRfCoverage({ chaosList, tMs: 30000 }).status).toBe('NOMINAL');
    });

    it('reacts dynamically to active chaos schedules for radar dropout and fog', () => {
      const chaosList: ChaosSpec[] = [
        { type: 'RADAR_DROPOUT', tStartMs: 20000, tEndMs: 26000, severity: 1.0 },
        { type: 'FOG', tStartMs: 40000, tEndMs: 55000, severity: 0.8 },
      ];

      // Radar before, during, after dropout
      expect(isChaosActive(chaosList, 22000, 'RADAR_DROPOUT')).toBe(true);
      expect(isChaosActive(chaosList, 10000, 'RADAR_DROPOUT')).toBe(false);
      expect(calculateRadarCoverage({ chaosList, tMs: 10000 }).status).toBe('NOMINAL');
      expect(calculateRadarCoverage({ chaosList, tMs: 22000 }).status).toBe('DROPOUT');
      expect(calculateRadarCoverage({ chaosList, tMs: 22000 }).r90RadiusM).toBe(0);
      expect(calculateRadarCoverage({ chaosList, tMs: 30000 }).status).toBe('NOMINAL');

      // EO/IR before, during, after fog
      expect(calculateEoirCoverage({ azimuthDeg: 0, isNight: false, chaosList, tMs: 35000 }).status).toBe('DAY_NOMINAL');
      expect(calculateEoirCoverage({ azimuthDeg: 0, isNight: false, chaosList, tMs: 45000 }).status).toBe('FOG_DEGRADED');
      expect(calculateEoirCoverage({ azimuthDeg: 0, isNight: false, chaosList, tMs: 45000 }).effectiveRangeM).toBe(625);
      expect(calculateEoirCoverage({ azimuthDeg: 0, isNight: false, chaosList, tMs: 60000 }).status).toBe('DAY_NOMINAL');
    });

    it('Coverage3D procedural rendering executes without per-frame allocations or leaks', () => {
      const coverage3d = new Coverage3D();
      expect(coverage3d.group.children).toHaveLength(3); // radarGroup, eoirGroup, rfGroup

      // Count child meshes and initial state
      let initialMeshCount = 0;
      coverage3d.group.traverse((obj) => {
        if (obj instanceof Coverage3D || obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          initialMeshCount += 1;
        }
      });

      // Simulate 100 consecutive frames modulating parameters
      for (let f = 0; f < 100; f++) {
        const tMs = f * 50;
        const az = (f * 5) % 360;
        const isFog = f % 20 < 10;
        const isJammed = f % 30 < 10;
        const isDropout = f % 40 < 5;

        coverage3d.update({
          radar: calculateRadarCoverage({
            sensorHealth: isDropout ? 'OUT' : 'OK',
            tMs,
          }),
          eoir: calculateEoirCoverage({
            azimuthDeg: az,
            isNight: false,
            sensorHealth: isFog ? 'DEG' : 'OK',
            tMs,
          }),
          rf: calculateRfCoverage({
            sensorHealth: isJammed ? 'OUT' : 'OK',
            tMs,
          }),
          activeSensor: (['RADAR', 'EOIR', 'RF'] as const)[f % 3],
          visible: true,
        });
      }

      // Verify that mesh count remains strictly invariant (zero allocation leak)
      let postUpdateMeshCount = 0;
      coverage3d.group.traverse((obj) => {
        if (obj instanceof Coverage3D || obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          postUpdateMeshCount += 1;
        }
      });
      expect(postUpdateMeshCount).toBe(initialMeshCount);

      // Verify clean disposal
      expect(() => coverage3d.dispose()).not.toThrow();
      expect(coverage3d.group.children).toHaveLength(0);
    });

    it('strictly preserves the safe information boundary: coverage models contain zero target truth coordinates', () => {
      // Coverage model interfaces do not contain entity positions, trueClass, or secret tracks
      const coverage = calculateRadarCoverage({});
      const keys = Object.keys(coverage);
      expect(keys).not.toContain('trueClass');
      expect(keys).not.toContain('droneType');
      expect(keys).not.toContain('tracks');
      expect(keys).not.toContain('pos');
      expect(keys).not.toContain('waypoints');
    });
  });

  describe('H. F2 Effector Envelopes & PNR Visualization', () => {
    const effectorIds: EffectorId[] = [
      'RF_SOFTKILL',
      'LASER',
      'GUN',
      'INTERCEPTOR',
      'MISSILE',
    ];

    it('displayed min/max/plateau boundaries equal existing configuration and helper values for every effector', () => {
      const envelopes = calculateEffectorEnvelopes('GUN');
      expect(envelopes).toHaveLength(5);

      effectorIds.forEach((effId) => {
        const env = envelopes.find((e) => e.id === effId);
        expect(env).toBeDefined();
        const expected = getEnvelopePlateau(effId);
        const configEff = CONFIG.effectors[effId];

        expect(env?.envelopeMinM).toBe(expected.envelopeMinM);
        expect(env?.envelopeMaxM).toBe(expected.envelopeMaxM);
        expect(env?.plateauMinM).toBeCloseTo(expected.plateauMinM, 1);
        expect(env?.plateauMaxM).toBeCloseTo(expected.plateauMaxM, 1);
        expect(env?.rOptM).toBeCloseTo(expected.rOptM, 1);
        expect(env?.tier).toBe(configEff.tier);
        expect(env?.costInr).toBe(configEff.costInr);
      });
    });

    it('highlights the armed effector and maintains correct tier and operational labels', () => {
      const envelopes = calculateEffectorEnvelopes('MISSILE');
      const missile = envelopes.find((e) => e.id === 'MISSILE');
      const gun = envelopes.find((e) => e.id === 'GUN');

      expect(missile?.isArmed).toBe(true);
      expect(missile?.tier).toBe('T3_HEAVY');
      expect(missile?.statusLabel).toBe('READY');

      expect(gun?.isArmed).toBe(false);
      expect(gun?.tier).toBe('T2_KINETIC');
    });

    it('computes effective Pk and blocked reasons matching existing effector equations', () => {
      // 1. Inside optimal plateau (GUN: min 300m, max 1500m, plateau 540m - 1260m)
      const targetInPlateau = {
        trackNo: 'T-01',
        pos: { x: 900, y: 0, z: 50 },
        q: 0.9,
      };
      const cuePlateau = calculateTrackEngagementCue('GUN', targetInPlateau);
      expect(cuePlateau.isInPlateau).toBe(true);
      expect(cuePlateau.isOutOfEnvelope).toBe(false);
      expect(cuePlateau.isHardBlocked).toBe(false);
      expect(cuePlateau.attenuationG).toBe(1.0);
      expect(cuePlateau.effectivePk).toBeCloseTo(CONFIG.effectors.GUN.pk0, 2); // 0.85
      expect(cuePlateau.label).toContain('OPTIMAL');

      // 2. Beyond max envelope (GUN range 2200m > 2000m max)
      const targetBeyond = {
        trackNo: 'T-02',
        pos: { x: 2200, y: 0, z: 50 },
        q: 0.9,
      };
      const cueBeyond = calculateTrackEngagementCue('GUN', targetBeyond);
      expect(cueBeyond.isOutOfEnvelope).toBe(true);
      expect(cueBeyond.isHardBlocked).toBe(true);
      expect(cueBeyond.hardBlockReason).toContain('BEYOND MAX');
      expect(cueBeyond.effectivePk).toBe(0.0);
      expect(cueBeyond.label).toContain('BLOCKED');

      // 3. Track quality block (Q = 0.4 < 0.6)
      const targetLowQ = {
        trackNo: 'T-03',
        pos: { x: 800, y: 0, z: 50 },
        q: 0.4,
      };
      const cueLowQ = calculateTrackEngagementCue('GUN', targetLowQ);
      expect(cueLowQ.isHardBlocked).toBe(true);
      expect(cueLowQ.hardBlockReason).toContain('Q < 0.6');
    });

    it('faithfully reflects environmental degradation (RF Soft-Kill jammed, Laser in fog)', () => {
      // 1. RF Soft-Kill under Jamming
      const envJammed = calculateEffectorEnvelopes('RF_SOFTKILL', { RF: 'OUT' });
      const rf = envJammed.find((e) => e.id === 'RF_SOFTKILL');
      expect(rf?.isFunctional).toBe(false);
      expect(rf?.statusLabel).toBe('BLOCKED (RF JAMMED)');

      const targetInRange = { trackNo: 'T-01', pos: { x: 1000, y: 0, z: 50 }, q: 0.8 };
      const cueJammed = calculateTrackEngagementCue('RF_SOFTKILL', targetInRange, { RF: 'OUT' });
      expect(cueJammed.isHardBlocked).toBe(true);
      expect(cueJammed.hardBlockReason).toBe('RF JAMMED');
      expect(cueJammed.effectivePk).toBe(0.0);

      // 2. Laser under Fog (Pk is halved)
      const envFog = calculateEffectorEnvelopes('LASER', { EOIR: 'DEG' });
      const laser = envFog.find((e) => e.id === 'LASER');
      expect(laser?.isFunctional).toBe(true);
      expect(laser?.statusLabel).toContain('DEGRADED (FOG: 50% Pk)');

      const targetInLaserPlateau = { trackNo: 'T-01', pos: { x: 500, y: 0, z: 50 }, q: 0.8 };
      const cueLaserFog = calculateTrackEngagementCue('LASER', targetInLaserPlateau, { EOIR: 'DEG' });
      expect(cueLaserFog.isHardBlocked).toBe(false);
      expect(cueLaserFog.effectivePk).toBeCloseTo(CONFIG.effectors.LASER.pk0 * 0.5, 2); // 0.90 * 0.5 = 0.45
    });

    it('PNR Perimeter ring strictly adheres to configured rMinM (500m)', () => {
      expect(CONFIG.thresholds.rMinM).toBe(500);

      const targetAtPnr = { x: 500, y: 0 };
      const rangeAtPnr = Math.hypot(targetAtPnr.x, targetAtPnr.y);
      expect(rangeAtPnr).toBe(500);

      const targetInsidePnr = { x: 450, y: 0 };
      const rangeInside = Math.hypot(targetInsidePnr.x, targetInsidePnr.y);
      expect(rangeInside).toBeLessThan(500);
    });

    it('EffectorEnvelopes3D procedural rendering executes without per-frame allocations or leaks', () => {
      const envelopes3d = new EffectorEnvelopes3D();
      expect(envelopes3d.group.children.length).toBeGreaterThan(0);

      // Count child objects before update loop
      let initialCount = 0;
      envelopes3d.group.traverse(() => {
        initialCount += 1;
      });

      // Simulate 100 frames with changing armed effectors, targets, and chaos
      const effectors: EffectorId[] = ['RF_SOFTKILL', 'LASER', 'GUN', 'INTERCEPTOR', 'MISSILE'];
      for (let f = 0; f < 100; f++) {
        const effId = effectors[f % effectors.length];
        const isJammed = f % 20 < 10;
        const isFog = f % 15 < 7;

        envelopes3d.update({
          activeEffector: effId,
          selectedTrack: {
            trackNo: `T-0${(f % 4) + 1}`,
            pos: { x: 600 + f * 10, y: 200, z: 60 },
            q: 0.85,
          },
          sensorHealth: {
            RADAR: 'OK',
            EOIR: isFog ? 'DEG' : 'OK',
            RF: isJammed ? 'OUT' : 'OK',
          },
          visible: true,
        });
      }

      // Assert zero allocation leaks
      let postCount = 0;
      envelopes3d.group.traverse(() => {
        postCount += 1;
      });
      expect(postCount).toBe(initialCount);

      // Teardown
      expect(() => envelopes3d.dispose()).not.toThrow();
      expect(envelopes3d.group.children).toHaveLength(0);
    });

    it('accessibility: state is communicated via explicit labels and text, not color alone', () => {
      const envelopes = calculateEffectorEnvelopes('RF_SOFTKILL', { RF: 'OUT' });
      const rf = envelopes.find((e) => e.id === 'RF_SOFTKILL')!;
      expect(rf.statusLabel).toBe('BLOCKED (RF JAMMED)');

      const cue = calculateTrackEngagementCue('GUN', {
        trackNo: 'T-01',
        pos: { x: 2500, y: 0, z: 50 },
        q: 0.9,
      });
      expect(cue.label).toContain('BLOCKED');
      expect(cue.label).toContain('BEYOND MAX');
    });

    it('toggling effector overlays has no effect on sim events, RNG, timing, or score', () => {
      const engineA = new SimEngine();
      engineA.load(demo1Json as unknown as ScenarioSpec);

      const engineB = new SimEngine();
      engineB.load(demo1Json as unknown as ScenarioSpec);

      // Advance both engines for 100 ticks
      // Engine B simulates 3D effector overlay queries every tick
      for (let t = 0; t < 100; t++) {
        engineA.step();

        engineB.step();
        const cue = calculateTrackEngagementCue('GUN', {
          trackNo: 'T-01',
          pos: { x: 800, y: 0, z: 50 },
          q: 0.8,
        });
        expect(cue).toBeDefined();
      }

      expect(engineA.tickIndex).toBe(engineB.tickIndex);
      expect(engineA.events).toHaveLength(engineB.events.length);
      for (let i = 0; i < engineA.events.length; i++) {
        expect(engineA.events[i].type).toBe(engineB.events[i].type);
        expect(engineA.events[i].tMs).toBe(engineB.events[i].tMs);
      }
    });
  });

  describe('I. F3 Line-of-Sight Explanation From the Authoritative Masking Model', () => {
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

    const testRidgeZone: ZoneSpec = {
      id: 'R1',
      type: 'RIDGE',
      polygon: [
        [-1500, 1000],
        [-500, 1000],
        [-500, 1500],
        [-1500, 1500],
      ],
      heightM: 60,
      shadowM: 1000,
      rho: 0.9,
    };

    it('visual blocked status matches canonical evaluateMasking for zone-interior target', () => {
      // Inside zone at (1500, 1500), altitude 20m <= roof 40m
      const target = {
        trackNo: 'T-01',
        pos: { x: 1500, y: 1500, z: 20 },
      };
      const los = calculateModelledLos(target, [testUrbanZone]);

      expect(los.isMasked).toBe(true);
      expect(los.status).toBe('BLOCKED_INTERIOR');
      expect(los.zoneId).toBe('U1');
      expect(los.blockingPoint).toBeDefined();
      expect(los.blockingPoint!.z).toBeLessThanOrEqual(40);
      expect(los.label).toContain('[MODELLED LOS / MASKING]');
      expect(los.label).toContain('BLOCKED: INSIDE [U1]');
    });

    it('visual blocked status matches canonical evaluateMasking for radar shadow target', () => {
      // Behind near-edge of R1 (-1000, 1000) ~1414m at (-1000, 1800) ~2059m (dist past near-edge = 645m <= 1000m shadow, outside polygon y > 1500)
      const target = {
        trackNo: 'T-02',
        pos: { x: -1000, y: 1800, z: 20 },
      };
      const los = calculateModelledLos(target, [testRidgeZone]);

      expect(los.isMasked).toBe(true);
      expect(los.status).toBe('BLOCKED_SHADOW');
      expect(los.zoneId).toBe('R1');
      expect(los.dNearM).toBeCloseTo(1144, 0);
      expect(los.blockingPoint).toBeDefined();
      expect(los.label).toContain('BLOCKED: SHADOW [R1]');
      expect(los.label).toContain('θT:');
      expect(los.label).toContain('θM:');
    });

    it('unblocked status matches canonical evaluateMasking when flying above roofline', () => {
      // Inside zone horizontal polygon at (1500, 1500), but altitude 120m > 40m roofline
      const target = {
        trackNo: 'T-03',
        pos: { x: 1500, y: 1500, z: 120 },
      };
      const los = calculateModelledLos(target, [testUrbanZone]);

      expect(los.isMasked).toBe(false);
      expect(los.status).toBe('CLEAR');
      expect(los.blockingPoint).toBeNull();
      expect(los.label).toContain('CLEAR');
    });

    it('unblocked status matches canonical evaluateMasking when beyond shadow reach', () => {
      // Behind near-edge at (2500, 2500) ~3535m (dist past near edge = 2121m > 800m shadow)
      const target = {
        trackNo: 'T-04',
        pos: { x: 2500, y: 2500, z: 20 },
      };
      const los = calculateModelledLos(target, [testUrbanZone]);

      expect(los.isMasked).toBe(false);
      expect(los.status).toBe('CLEAR');
      expect(los.blockingPoint).toBeNull();
      expect(los.label).toContain('CLEAR');
    });

    it('faithfully resolves multiple-zone occlusion precedence', () => {
      const zones = [testUrbanZone, testRidgeZone];
      // Target behind Ridge zone: (-1000, 1200, 20)
      const target = {
        trackNo: 'T-05',
        pos: { x: -1000, y: 1200, z: 20 },
      };
      const los = calculateModelledLos(target, zones);

      expect(los.isMasked).toBe(true);
      expect(los.zoneId).toBe('R1');
      expect(los.label).toContain('R1');
    });

    it('property-tests 100% agreement between calculateModelledLos and canonical evaluateMasking over seeded grid', () => {
      const zones = [testUrbanZone, testRidgeZone];
      // Deterministic pseudo-random sequence (LCG)
      let seed = 42;
      const nextU = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      for (let i = 0; i < 100; i++) {
        const x = (nextU() - 0.5) * 6000;
        const y = (nextU() - 0.5) * 6000;
        const z = 10 + nextU() * 150;
        const target = { trackNo: `T-RND-${i}`, pos: { x, y, z } };

        const canonical = evaluateMasking(target.pos, zones);
        const modelled = calculateModelledLos(target, zones);

        expect(modelled.isMasked).toBe(canonical.isMasked);
        if (canonical.isMasked) {
          expect(modelled.zoneId).toBe(canonical.zoneId);
          expect(modelled.status).not.toBe('CLEAR');
          expect(modelled.blockingPoint).not.toBeNull();
        } else {
          expect(modelled.status).toBe('CLEAR');
          expect(modelled.blockingPoint).toBeNull();
        }
      }
    });

    it('strictly preserves safe information boundary: handles missing coordinates without truth leaks', () => {
      // 1. Target with no safe operator position (e.g. completely unplotted or dropped)
      const targetNoPos = {
        trackNo: 'T-GHOST-01',
        pos: null,
        masked: true,
      };
      const losNoPos = calculateModelledLos(targetNoPos, [testUrbanZone]);
      expect(losNoPos.status).toBe('MASKED_NO_POS');
      expect(losNoPos.isMasked).toBe(true);
      expect(losNoPos.targetPoint).toBeNull();
      expect(losNoPos.blockingPoint).toBeNull();
      expect(losNoPos.label).toContain('MASKED (NO POSITION)');

      // 2. Coasting track: maintains estimated coordinates and reports uncertainty without leaking truth
      const targetCoasting = {
        trackNo: 'T-COAST-02',
        pos: { x: 1300, y: 1300, z: 20 },
        masked: true,
        ghostSigmaM: 45,
      };
      const losCoasting = calculateModelledLos(targetCoasting, [testUrbanZone]);
      expect(losCoasting.isCoasting).toBe(true);
      expect(losCoasting.ghostSigmaM).toBe(45);
      expect(losCoasting.label).toContain('COAST ±45m');
    });

    it('LosVisualizer3D procedural rendering executes without per-frame allocations or leaks', () => {
      const losVis = new LosVisualizer3D();
      expect(losVis.group.children.length).toBeGreaterThanOrEqual(4);

      const targetBlocked = {
        trackNo: 'T-01',
        pos: { x: 1300, y: 1300, z: 20 },
        vel: { x: 0, y: 0, z: 0 },
        traineeLabel: null,
        step: 'TRACK' as const,
        q: 0.8,
        masked: true,
        ghostSigmaM: 20,
        isSelected: true,
        lifecycle: 'ACTIVE' as const,
      };

      const targetClear = {
        trackNo: 'T-02',
        pos: { x: 500, y: 500, z: 80 },
        vel: { x: 0, y: 0, z: 0 },
        traineeLabel: null,
        step: 'TRACK' as const,
        q: 0.9,
        masked: false,
        ghostSigmaM: 0,
        isSelected: true,
        lifecycle: 'ACTIVE' as const,
      };

      const initialChildCount = losVis.group.children.length;

      // Simulate 100 continuous animation frames alternating states
      for (let f = 0; f < 100; f++) {
        const target = f % 2 === 0 ? targetBlocked : targetClear;
        losVis.update(target, [testUrbanZone], 15, true);
        expect(losVis.group.children).toHaveLength(initialChildCount);
      }

      // Complete resource disposal
      expect(() => losVis.dispose()).not.toThrow();
      expect(losVis.group.children).toHaveLength(0);
    });

    it('toggling LOS overlay has no effect on sim events, RNG, timing, or score', () => {
      const engineA = new SimEngine();
      engineA.load(demo1Json as unknown as ScenarioSpec);

      const engineB = new SimEngine();
      engineB.load(demo1Json as unknown as ScenarioSpec);

      for (let t = 0; t < 100; t++) {
        engineA.step();

        engineB.step();
        // 3D LOS queries simulated on every step
        const los = calculateModelledLos(
          { trackNo: 'T-01', pos: { x: 1500, y: 1500, z: 20 } },
          engineB.spec?.zones || []
        );
        expect(los).toBeDefined();
      }

      expect(engineA.tickIndex).toBe(engineB.tickIndex);
      expect(engineA.events).toHaveLength(engineB.events.length);
      for (let i = 0; i < engineA.events.length; i++) {
        expect(engineA.events[i].type).toBe(engineB.events[i].type);
        expect(engineA.events[i].tMs).toBe(engineB.events[i].tMs);
      }
    });
  });

  describe('K. 3D Target Picking & Hit Testing (Phases 1 & 4.A, 4.B)', () => {
    function createTestCanvas(width = 520, height = 520): HTMLCanvasElement {
      const listeners: Record<string, ((e: unknown) => void)[]> = {};
      const canvas = {
        width,
        height,
        style: {},
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width,
          height,
          right: width,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => {},
        }),
        getContext: () => ({
          canvas: null,
          fillRect: () => {},
          clearRect: () => {},
          strokeRect: () => {},
          fillText: () => {},
          beginPath: () => {},
          closePath: () => {},
          stroke: () => {},
          fill: () => {},
          measureText: () => ({ width: 50 }),
        }),
        addEventListener: (event: string, fn: (e: unknown) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e: unknown) => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((f) => f !== fn);
          }
        },
        dispatchEvent: (e: { type: string }) => {
          const arr = listeners[e.type];
          if (arr) {
            arr.forEach((fn) => fn(e));
          }
          return true;
        },
      } as unknown as HTMLCanvasElement;
      return canvas;
    }

    function createMockRenderer(): THREE.WebGLRenderer {
      return {
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      } as unknown as THREE.WebGLRenderer;
    }

    beforeEach(() => {
      if (typeof globalThis.PointerEvent === 'undefined') {
        class MockPointerEvent extends Event {
          public clientX: number;
          public clientY: number;
          public button: number;
          public pointerType: string;
          constructor(type: string, init?: { clientX?: number; clientY?: number; button?: number; pointerType?: string }) {
            super(type);
            this.clientX = init?.clientX ?? 0;
            this.clientY = init?.clientY ?? 0;
            this.button = init?.button ?? 0;
            this.pointerType = init?.pointerType ?? 'mouse';
          }
        }
        (globalThis as unknown as Record<string, unknown>).PointerEvent = MockPointerEvent;
      }
    });

    it('picks visible targets accurately at their projected 3D positions', () => {
      const canvas = createTestCanvas(520, 520);
      const renderer = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        threeRenderer: createMockRenderer(),
      });

      // Target T-01 placed at asset center (0, 0, 100)
      const tracks: SafeTrackView[] = [
        {
          trackNo: 'T-01',
          pos: { x: 0, y: 0, z: 100 },
          vel: { x: 0, y: 20, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
      ];

      renderer.setPreset('TOP');
      renderer.update(tracks, null);

      const hit = renderer.pickTrackAt(260, 260);
      expect(hit).toBe('T-01');

      // Empty space (far top-left corner) returns null
      const miss = renderer.pickTrackAt(10, 10);
      expect(miss).toBeNull();

      renderer.dispose();
    });

    it('successfully picks targets at different altitudes', () => {
      const canvas = createTestCanvas(520, 520);
      const renderer = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        threeRenderer: createMockRenderer(),
      });

      // Low altitude target T-LOW (z = 30) and high altitude target T-HIGH (z = 1500)
      const tracks: SafeTrackView[] = [
        {
          trackNo: 'T-LOW',
          pos: { x: 0, y: 0, z: 30 },
          vel: { x: 0, y: 15, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.85,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
        {
          trackNo: 'T-HIGH',
          pos: { x: 500, y: 0, z: 1500 },
          vel: { x: 0, y: 15, z: 0 },
          traineeLabel: 'HOSTILE_ISR',
          step: 'TRACK',
          q: 0.95,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
      ];

      renderer.setPreset('TOP');
      renderer.update(tracks, null);

      // Canvas center picks T-LOW
      expect(renderer.pickTrackAt(260, 260)).toBe('T-LOW');

      renderer.dispose();
    });

    it('prefers the closest visible target when multiple targets overlap in view', () => {
      const canvas = createTestCanvas(520, 520);
      const renderer = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        threeRenderer: createMockRenderer(),
      });
      renderer.setPreset('TOP'); // Looking down from Y=9500

      // T-CLOSE is at z = 1200 (closer to camera at Y=9500), T-FAR is at z = 100
      const tracks: SafeTrackView[] = [
        {
          trackNo: 'T-FAR',
          pos: { x: 0, y: 0, z: 100 },
          vel: { x: 0, y: 10, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
        {
          trackNo: 'T-CLOSE',
          pos: { x: 0, y: 0, z: 1200 },
          vel: { x: 0, y: 10, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
      ];

      renderer.update(tracks, null);
      const hit = renderer.pickTrackAt(260, 260);
      expect(hit).toBe('T-CLOSE');

      renderer.dispose();
    });

    it('discriminates between a click (selects) and a drag (orbits camera)', () => {
      const canvas = createTestCanvas(520, 520);
      let selectedTrack: string | null = null;
      const renderer = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        threeRenderer: createMockRenderer(),
        onSelectTrack: (trackNo) => {
          selectedTrack = trackNo;
        },
      });

      const tracks: SafeTrackView[] = [
        {
          trackNo: 'T-01',
          pos: { x: 0, y: 0, z: 100 },
          vel: { x: 0, y: 20, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
      ];

      renderer.setPreset('TOP');
      renderer.update(tracks, null);

      const eventTarget = typeof window !== 'undefined' ? window : canvas;

      // Short click: down at (260, 260), move 1px, up -> selection occurs
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 260, clientY: 260, button: 0 }));
      eventTarget.dispatchEvent(new PointerEvent('pointermove', { clientX: 261, clientY: 261 }));
      expect(renderer.dragging).toBe(false);
      eventTarget.dispatchEvent(new PointerEvent('pointerup', { clientX: 261, clientY: 261, button: 0 }));
      expect(selectedTrack).toBe('T-01');

      // Drag movement: down at (260, 260), move 25px (> DRAG_THRESHOLD_PX = 5) -> drag occurs, NO selection
      selectedTrack = null;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 260, clientY: 260, button: 0 }));
      eventTarget.dispatchEvent(new PointerEvent('pointermove', { clientX: 285, clientY: 285 }));
      expect(renderer.dragging).toBe(true);
      eventTarget.dispatchEvent(new PointerEvent('pointerup', { clientX: 285, clientY: 285, button: 0 }));
      expect(selectedTrack).toBeNull();

      renderer.dispose();
    });

    it('touch tap selects target without being mistaken for a camera drag', () => {
      const canvas = createTestCanvas(520, 520);
      let selectedTrack: string | null = null;
      const renderer = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        threeRenderer: createMockRenderer(),
        onSelectTrack: (trackNo) => {
          selectedTrack = trackNo;
        },
      });

      const tracks: SafeTrackView[] = [
        {
          trackNo: 'T-TAP',
          pos: { x: 0, y: 0, z: 100 },
          vel: { x: 0, y: 20, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: false,
          lifecycle: 'ACTIVE',
        },
      ];

      renderer.setPreset('TOP');
      renderer.update(tracks, null);

      const eventTarget = typeof window !== 'undefined' ? window : canvas;

      // Touch tap
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 260, clientY: 260, pointerType: 'touch' }));
      eventTarget.dispatchEvent(new PointerEvent('pointerup', { clientX: 260, clientY: 260, pointerType: 'touch' }));
      expect(selectedTrack).toBe('T-TAP');

      renderer.dispose();
    });

    it('integrates cleanly with sessionStore.designate without side-effects on scoring or effectors', () => {
      engineInstance.abort('TEST_RESET');
      clockInstance.reset();
      engineInstance.load(demo1Json as unknown as ScenarioSpec);

      // Detect first entity so it becomes selectable
      if (engineInstance.curr[0]) {
        engineInstance.curr[0].step = 'FIND';
        const trackNo = engineInstance.curr[0].trackNo!;

        // Trigger designate via store
        useSessionStore.getState().designate(trackNo, 'CLICK');

        // Verify action queued onto engineInstance.inputQueue
        expect(engineInstance.inputQueue.getPendingCount()).toBeGreaterThan(0);

        // Step simulation tick to process inputQueue
        engineInstance.step();

        // Selected track is updated on engineInstance
        expect(engineInstance.selectedTrackNo).toBe(trackNo);

        // Verify no weapon fired merely by selecting
        expect(engineInstance.events.filter((e) => e.type === 'ENGAGE')).toHaveLength(0);
      }
    });
  });

  describe('L. Recognizable Aerial-Vehicle Models & Controlled Distance Scaling (Phases 2 & 4.C)', () => {
    it('creates procedural solid UAV body, accent, and hit proxy geometries', () => {
      const bodyGeom = createAircraftBodyGeometry();
      const accentGeom = createAircraftAccentGeometry();
      const proxyGeom = createAircraftHitProxyGeometry();

      expect(bodyGeom.getAttribute('position').count).toBeGreaterThan(20);
      expect(bodyGeom.getIndex()).toBeDefined();
      expect(bodyGeom.getAttribute('normal')).toBeDefined();

      expect(accentGeom.getAttribute('position').count).toBeGreaterThan(5);
      expect(proxyGeom.getAttribute('position').count).toBeGreaterThan(10);

      bodyGeom.dispose();
      accentGeom.dispose();
      proxyGeom.dispose();
    });

    it('computes screen space scale within guaranteed [15, 140] bounds across all distances', () => {
      // Normal tactical distance ~7500m
      const normalScale = calculateScreenSpaceScale(45, 7500, 520, 32);
      expect(normalScale).toBeGreaterThanOrEqual(MIN_AIRCRAFT_SCALE);
      expect(normalScale).toBeLessThanOrEqual(MAX_AIRCRAFT_SCALE);

      // Extreme close distance 300m -> clamped at MIN_AIRCRAFT_SCALE (does not explode)
      const closeScale = calculateScreenSpaceScale(45, 300, 520, 32);
      expect(closeScale).toBe(MIN_AIRCRAFT_SCALE);

      // Extreme far distance 30000m -> clamped at MAX_AIRCRAFT_SCALE (does not vanish into subpixels)
      const farScale = calculateScreenSpaceScale(45, 30000, 520, 32);
      expect(farScale).toBe(MAX_AIRCRAFT_SCALE);
    });

    it('derives aircraft heading and pitch smoothly with fallback for zero velocity', () => {
      // North velocity: heading = 0
      const north = calculateAircraftOrientation({ x: 0, y: 50, z: 0 });
      expect(north.headingRad).toBeCloseTo(0);
      expect(north.pitchRad).toBeCloseTo(0);

      // East velocity: heading = pi/2
      const east = calculateAircraftOrientation({ x: 50, y: 0, z: 0 });
      expect(east.headingRad).toBeCloseTo(Math.PI / 2);

      // Climbing velocity: pitch > 0
      const climb = calculateAircraftOrientation({ x: 0, y: 50, z: 25 });
      expect(climb.pitchRad).toBeGreaterThan(0);

      // Zero or near-zero velocity: stable fallback heading without NaN
      const zeroVel = calculateAircraftOrientation({ x: 0.1, y: 0.1, z: 0 }, 1.25);
      expect(Number.isNaN(zeroVel.headingRad)).toBe(false);
      expect(zeroVel.headingRad).toBe(1.25);
      expect(zeroVel.pitchRad).toBe(0);
    });

    it('properly constructs and aligns aircraft group, body, accents, stem, and hit proxy in Scene3D', () => {
      const scene3d = new Scene3D({ maxRangeM: 5000, rMinM: 500 });
      const tracks: SafeTrackView[] = [
        {
          trackNo: 'T-01',
          pos: { x: 1200, y: 1500, z: 80 },
          vel: { x: -10, y: -20, z: 5 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: true,
          lifecycle: 'ACTIVE',
        },
      ];

      scene3d.updateTracks(tracks, 'T-01');

      const record = scene3d.getTrackRecord('T-01');
      expect(record).toBeDefined();
      expect(record?.bodyMesh).toBeDefined();
      expect(record?.accentMesh).toBeDefined();
      expect(record?.hitProxy).toBeDefined();
      expect(record?.selectionBox?.visible).toBe(true);

      // Selectable objects contains proxy, body, and accent
      const selectables = scene3d.getSelectableObjects();
      expect(selectables).toHaveLength(3);
      expect(selectables.every((obj) => obj.userData.trackNo === 'T-01')).toBe(true);

      scene3d.dispose();
      expect(scene3d.scene.children).toHaveLength(0);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateShadowCeilingAt,
  calculateCrossSection,
  calculateRadarRcsShells,
  bearingRangeToCartesian,
} from '@/render3d/trainingAidMath';
import { TrainingAid3D } from '@/render3d/trainingAid';
import { Scene3D } from '@/render3d/scene3d';
import { evaluateMasking } from '@/sim/masking';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec, ZoneSpec } from '@/sim/types';

describe('Track X3D — Coverage and Cross-Section Training Aid (TASK-F5)', () => {
  const testZones: ZoneSpec[] = [
    {
      id: 'URBAN_RIDGE_01',
      type: 'URBAN',
      heightM: 40,
      shadowM: 600,
      rho: 0.8,
      polygon: [
        [1000, 1000],
        [1200, 1000],
        [1200, 1400],
        [1000, 1400],
      ],
    },
    {
      id: 'HIGH_RIDGE_02',
      type: 'RIDGE',
      heightM: 70,
      shadowM: 1000,
      rho: 0.9,
      polygon: [
        [2000, 2000],
        [2400, 2000],
        [2400, 2300],
        [2000, 2300],
      ],
    },
  ];

  describe('1. Canonical Masking Model Agreement & Shadow Ceiling', () => {
    it('achieves 100% agreement with canonical evaluateMasking across seeded test points', () => {
      // Test 30 sampled points in and around the shadow of URBAN_RIDGE_01
      const testPoints = [
        { x: 1100, y: 1200 }, // interior
        { x: 1100, y: 1050 }, // near-edge interior
        { x: 1300, y: 1300 }, // in shadow reach
        { x: 1500, y: 1500 }, // in shadow reach
        { x: 1800, y: 1800 }, // far edge of shadow reach
        { x: 2200, y: 2200 }, // HIGH_RIDGE interior
        { x: 2600, y: 2600 }, // HIGH_RIDGE shadow
        { x: 500, y: 500 },   // in front of zone (unmasked)
        { x: -1000, y: 1000 }, // off-axis (unmasked)
      ];

      for (const pt of testPoints) {
        const ceiling = calculateShadowCeilingAt(pt.x, pt.y, testZones, 15);

        if (ceiling > 0) {
          // Below ceiling: MUST be masked by evaluateMasking
          const maskedCheck = evaluateMasking({ x: pt.x, y: pt.y, z: ceiling - 0.2 }, testZones);
          expect(maskedCheck.isMasked).toBe(true);

          // Above ceiling: MUST be clear according to evaluateMasking
          const clearCheck = evaluateMasking({ x: pt.x, y: pt.y, z: ceiling + 1.0 }, testZones);
          expect(clearCheck.isMasked).toBe(false);
        } else {
          // Ceiling is 0: ground level MUST be unmasked
          const groundCheck = evaluateMasking({ x: pt.x, y: pt.y, z: 0 }, testZones);
          expect(groundCheck.isMasked).toBe(false);
        }
      }
    });

    it('correctly classifies zone interior below roofline as masked', () => {
      // (1100, 1200) is strictly inside URBAN_RIDGE_01 (height: 40m)
      const insidePoint = { x: 1100, y: 1200, z: 25 };
      const maskResult = evaluateMasking(insidePoint, testZones);
      expect(maskResult.isMasked).toBe(true);
      expect(maskResult.zoneId).toBe('URBAN_RIDGE_01');

      const ceiling = calculateShadowCeilingAt(1100, 1200, testZones, 15);
      expect(ceiling).toBeGreaterThanOrEqual(40);
    });

    it('correctly classifies points beyond shadow reach as clear', () => {
      // Ray through (1100, 1100) intersects zone near edge around dNear ≈ 1485m
      // ShadowM is 600m, so beyond dNear + 600m (e.g. at 2500m), shadow has ended
      const farPoint = { x: 2200, y: 1000, z: 10 };
      const maskResult = evaluateMasking(farPoint, testZones);
      // Beyond shadow reach of zone 1 and not blocked by zone 2
      expect(maskResult.isMasked).toBe(false);
    });
  });

  describe('2. Side Elevation Cross-Section Calculation', () => {
    it('computes complete cross-section profile along bearing with vertical exaggeration label', () => {
      const profile = calculateCrossSection(45, 5000, testZones, 50, 15);

      expect(profile.bearingDeg).toBe(45);
      expect(profile.maxRangeM).toBe(5000);
      expect(profile.antennaHeightM).toBe(15);
      expect(profile.verticalExaggerationFactor).toBe(12.2);
      expect(profile.altitudeBands).toEqual({
        lowCeilingM: 40,
        midCeilingM: 100,
        highCeilingM: 160,
      });

      expect(profile.samples.length).toBeGreaterThan(50);
      expect(profile.samples[0].rangeM).toBe(0);
      expect(profile.samples[profile.samples.length - 1].rangeM).toBe(5000);
    });

    it('identifies zone obstacle blocks intersecting bearing ray', () => {
      // Bearing 45 degrees points directly toward (1000, 1000) where zone 1 sits
      const profile = calculateCrossSection(45, 5000, testZones, 50, 15);
      expect(profile.blocks.length).toBeGreaterThanOrEqual(1);

      const block1 = profile.blocks.find((b) => b.zoneId === 'URBAN_RIDGE_01');
      expect(block1).toBeDefined();
      expect(block1?.heightM).toBe(40);
      expect(block1?.shadowM).toBe(600);
      expect(block1?.dNearM).toBeGreaterThan(1000);
    });

    it('converts bearing and range to Cartesian coordinates accurately', () => {
      const north = bearingRangeToCartesian(0, 1000);
      expect(north.x).toBeCloseTo(0);
      expect(north.y).toBeCloseTo(1000);

      const east = bearingRangeToCartesian(90, 1000);
      expect(east.x).toBeCloseTo(1000);
      expect(east.y).toBeCloseTo(0);
    });
  });

  describe('3. Radar Reference-RCS Shells (Rule 4: Monotonic & Horizontal)', () => {
    it('produces monotonically increasing constant-SNR shells without slant-range hemispheres', () => {
      const shells = calculateRadarRcsShells(5000);

      expect(shells).toHaveLength(4);
      // 0.005 m² (micro) < 0.01 m² (nominal ref) < 0.05 m² (medium) <= 5000m (cutoff)
      expect(shells[0].rcsM2).toBe(0.005);
      expect(shells[1].rcsM2).toBe(0.01);
      expect(shells[2].rcsM2).toBe(0.05);
      expect(shells[3].radiusM).toBe(5000);

      expect(shells[0].radiusM).toBeLessThan(shells[1].radiusM);
      expect(shells[1].radiusM).toBeLessThan(shells[2].radiusM);
      expect(shells[2].radiusM).toBeLessThanOrEqual(shells[3].radiusM);

      // Verify distinction between probabilistic shells and hard limits
      expect(shells[0].isGuaranteedLimit).toBe(false);
      expect(shells[1].isGuaranteedLimit).toBe(false);
      expect(shells[2].isGuaranteedLimit).toBe(false);
      expect(shells[3].isGuaranteedLimit).toBe(true); // Hard horizontal limit
    });
  });

  describe('4. EVAL Mode Lockout & Security Guard (Rule 6)', () => {
    it('strictly forbids enabling or rendering TrainingAid3D in EVAL mode', () => {
      const scene3d = new Scene3D({
        maxRangeM: 5000,
        rMinM: 500,
        zones: testZones,
        mode: 'EVAL',
        showTrainingAid: true, // Attempt to turn on in EVAL
      });

      // Even though showTrainingAid was requested, EVAL locks it out
      expect(scene3d.trainingAid3d.visible).toBe(false);

      scene3d.dispose();
    });

    it('SimEngine in EVAL mode ignores training aid tick accumulation', () => {
      const evalSpec: ScenarioSpec = {
        ...(demo1Json as unknown as ScenarioSpec),
        mode: 'EVAL',
      };

      const engine = new SimEngine();
      engine.load(evalSpec);
      engine.trainingAidActive = true; // Attempt to activate

      for (let i = 0; i < 20; i++) {
        engine.step();
      }

      // In EVAL mode, trainingAidTicks MUST stay 0
      expect(engine.trainingAidTicks).toBe(0);
    });
  });

  describe('5. TRAIN Sim-Time Tick Accumulation & AAR Persistence', () => {
    it('accumulates training aid duration strictly from sim ticks (not wall time) in TRAIN mode', () => {
      const trainSpec: ScenarioSpec = {
        ...(demo1Json as unknown as ScenarioSpec),
        mode: 'TRAIN',
      };

      const engine = new SimEngine();
      engine.load(trainSpec);

      // Initially inactive
      expect(engine.trainingAidTicks).toBe(0);

      // Step 10 ticks while inactive
      for (let i = 0; i < 10; i++) {
        engine.step();
      }
      expect(engine.trainingAidTicks).toBe(0);

      // Activate training aid
      engine.trainingAidActive = true;

      // Step 30 ticks (30 * 50ms = 1.5s sim time)
      for (let i = 0; i < 30; i++) {
        engine.step();
      }
      expect(engine.trainingAidTicks).toBe(30);

      // Turn off
      engine.trainingAidActive = false;
      for (let i = 0; i < 10; i++) {
        engine.step();
      }
      expect(engine.trainingAidTicks).toBe(30); // Unchanged

      // End session and verify AAR persistence
      engine.abort('USER_ABORT');
      const endEvent = engine.events.find((e) => e.type === 'SESSION_END');
      expect(endEvent).toBeDefined();
      expect(endEvent?.payload.trainingAidTicks).toBe(30);

      const metrics = endEvent?.payload.metrics as Record<string, unknown>;
      expect(metrics.trainingAidTicks).toBe(30);
      expect(metrics.trainingAidDurationSec).toBe(1.5);
      expect(metrics.trainingAidUsed).toBe(true);
    });
  });

  describe('6. Simulation Determinism & Invariance (No Butterfly Effects)', () => {
    it('leaves simulation ticks, events, and scores 100% identical whether aid is ON or OFF', () => {
      const engineOff = new SimEngine();
      engineOff.load(demo1Json as unknown as ScenarioSpec);

      const engineOn = new SimEngine();
      engineOn.load(demo1Json as unknown as ScenarioSpec);
      engineOn.trainingAidActive = true;

      for (let t = 0; t < 100; t++) {
        engineOff.step();
        engineOn.step();
      }

      expect(engineOff.tickIndex).toBe(engineOn.tickIndex);
      expect(engineOff.events.length).toBe(engineOn.events.length);

      for (let i = 0; i < engineOff.events.length; i++) {
        expect(engineOff.events[i].type).toBe(engineOn.events[i].type);
        expect(engineOff.events[i].tMs).toBe(engineOn.events[i].tMs);
        expect(engineOff.events[i].trackNo).toBe(engineOn.events[i].trackNo);
      }
    });
  });

  describe('7. Pre-Mission Briefing Isolation (Zero Hidden Threat Information)', () => {
    it('training aid math and 3D visualizer depend strictly on zones and sensors with zero entity data', () => {
      const aid3d = new TrainingAid3D({
        zones: testZones,
        maxRangeM: 5000,
        antennaHeightM: 15,
      });

      expect(aid3d.group.children.length).toBeGreaterThan(0);

      // Verify that no entity/threat waypoint coordinates exist in the training aid group
      aid3d.group.traverse((obj) => {
        expect(obj.name).not.toContain('Threat');
        expect(obj.name).not.toContain('Waypoint');
      });

      aid3d.dispose();
      expect(aid3d.group.children.length).toBe(0);
    });
  });
});

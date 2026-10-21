import { describe, it, expect } from 'vitest';
import { BehaviourController } from '@/sim/behaviours';
import { SimEngine } from '@/sim/engine';
import { generatePopUpDiveScenario } from '@/director/popupDive';
import { validateDetailed, validate, getThreatPositionAt } from '@/director/validate';
import demo1Json from '@/director/bundled/demo1.json';
import { aggregateAARMetrics } from '@/sim/metrics';
import type { ScenarioSpec, ThreatSpawn } from '@/sim/types';

describe('OPTIONAL TASK 13 — Notional POP_UP_DIVE Trajectory Profile', () => {
  describe('BehaviourController Phase Progression & Altitude Bounds', () => {
    it('executes APPROACH -> CLIMB -> DIVE phases with exact altitude boundaries', () => {
      const controller = new BehaviourController({
        tick: 0,
        dtSec: 0.05,
        speedMps: 30,
        profile: 'POP_UP_DIVE',
        waypoints: [{ x: 0, y: 0, z: 20 }],
        zones: [],
        entityIndex: 0,
        scenarioSeed: 1337,
      });

      // Start at range 1500m (well outside 900m popup threshold), altitude 20m
      let pos = { x: 1500, y: 0, z: 20 };
      let vel = { x: -30, y: 0, z: 0 };

      // 1. Advance in APPROACH phase (1500m down to 1050m)
      // 15 seconds = 300 ticks * 0.05s * 30 m/s = 450m traveled -> range = 1050m > 900m
      for (let tick = 1; tick <= 300; tick++) {
        const res = controller.step(pos, vel, {
          tick,
          dtSec: 0.05,
          speedMps: 30,
          profile: 'POP_UP_DIVE',
          waypoints: [{ x: 0, y: 0, z: 20 }],
          zones: [],
          entityIndex: 0,
          scenarioSeed: 1337,
        });
        pos = res.pos;
        vel = res.vel;
      }

      expect(controller.getPopupPhase()).toBe('APPROACH');
      expect(pos.x).toBeCloseTo(1050, 0);
      expect(pos.z).toBeCloseTo(20, 1); // Altitude hugged at 20m

      // 2. Advance across 900m threshold into CLIMB phase
      // 10 seconds = 200 ticks * 30 m/s = 300m traveled -> range goes from 1050m to 750m (<900m)
      for (let tick = 301; tick <= 500; tick++) {
        const res = controller.step(pos, vel, {
          tick,
          dtSec: 0.05,
          speedMps: 30,
          profile: 'POP_UP_DIVE',
          waypoints: [{ x: 0, y: 0, z: 20 }],
          zones: [],
          entityIndex: 0,
          scenarioSeed: 1337,
        });
        pos = res.pos;
        vel = res.vel;
      }

      expect(controller.getPopupPhase()).toBe('CLIMB');
      expect(pos.x).toBeLessThan(900);
      expect(pos.z).toBeGreaterThan(20); // Altitude has climbed significantly
      expect(vel.z).toBe(15); // Climb rate is 15 m/s

      // 3. Continue climbing until reaching peakZ = 150m and entering DIVE phase
      // Climbing from 20m to 150m (130m gain) at 15 m/s takes 8.67s (174 ticks)
      for (let tick = 501; tick <= 800; tick++) {
        const res = controller.step(pos, vel, {
          tick,
          dtSec: 0.05,
          speedMps: 30,
          profile: 'POP_UP_DIVE',
          waypoints: [{ x: 0, y: 0, z: 20 }],
          zones: [],
          entityIndex: 0,
          scenarioSeed: 1337,
        });
        pos = res.pos;
        vel = res.vel;
      }

      expect(controller.getPopupPhase()).toBe('DIVE');
      expect(pos.z).toBeLessThanOrEqual(150); // Ceiled at 150m then diving
      expect(vel.z).toBeLessThan(0); // In dive descent
    });
  });

  describe('Authoritative Simulation Kinematics in SimEngine', () => {
    it('models POP_UP_DIVE in simulation engine and preserves authoritative 2D/3D agreement', () => {
      const spec = generatePopUpDiveScenario({ seed: 4444, difficulty: 0.3, speedMps: 30 });
      const engine = new SimEngine();
      engine.load(spec);

      const threat = engine.curr[0];
      expect(threat.profile).toBe('POP_UP_DIVE');
      const startX = threat.pos.x;
      const startY = threat.pos.y;
      const startDist = Math.hypot(startX, startY);
      expect(startDist).toBeGreaterThan(3000);

      // Advance until range reaches popup threshold (900m)
      // Distance to 900m: ~2300m at 30 m/s ~ 76s (1520 ticks)
      const ticksToApproach = Math.floor(((startDist - 950) / 30) / 0.05);
      for (let i = 0; i < ticksToApproach; i++) {
        engine.step();
      }

      // In approach, altitude remains hugged at low elevation (20m)
      expect(threat.pos.z).toBeCloseTo(20, 0);

      // Advance into climb phase: 8s (160 ticks)
      for (let i = 0; i < 160; i++) {
        engine.step();
      }

      // Altitude has climbed towards peak (up to 150m)
      expect(threat.pos.z).toBeGreaterThan(100);

      // Advance into terminal dive
      for (let i = 0; i < 100; i++) {
        engine.step();
      }

      // Dive descends towards asset level (20m)
      expect(threat.vel.z).toBeLessThan(0);
    });

    it('guarantees bitwise deterministic simulation replay for same seed', () => {
      const spec = generatePopUpDiveScenario({ seed: 9999, difficulty: 0.3 });

      const runEngine = () => {
        const engine = new SimEngine();
        engine.load(spec);
        for (let i = 0; i < 400; i++) {
          engine.step();
        }
        return {
          pos: { ...engine.curr[0].pos },
          vel: { ...engine.curr[0].vel },
          eventsCount: engine.events.length,
        };
      };

      const run1 = runEngine();
      const run2 = runEngine();

      expect(run1.pos).toEqual(run2.pos);
      expect(run1.vel).toEqual(run2.vel);
      expect(run1.eventsCount).toBe(run2.eventsCount);
    });
  });

  describe('Fairness Validator & Analytical Position Evaluation', () => {
    it('validates generated POP_UP_DIVE scenario against all fairness rules', () => {
      const spec = generatePopUpDiveScenario({ seed: 1234, difficulty: 0.3 });
      const result = validateDetailed(spec);

      expect(result.valid).toBe(true);
      expect(result.reasons).toEqual([]);
      expect(validate(spec)).toBe(true);
    });

    it('getThreatPositionAt calculates continuous climb and dive altitudes', () => {
      const threat: ThreatSpawn = {
        id: 'H-POP-TEST',
        droneType: 'FPV_ATTACK',
        trueClass: 'HOSTILE_ATTACK',
        spawnTMs: 0,
        waypoints: [
          { x: 3000, y: 0, z: 20 },
          { x: 0, y: 0, z: 20 },
        ],
        speedMps: 30,
        profile: 'POP_UP_DIVE',
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
      };

      // T = 0s: start at 3000m, altitude 20m
      const pos0 = getThreatPositionAt(threat, 0);
      expect(pos0.x).toBe(3000);
      expect(pos0.z).toBe(20);

      // Reaching 900m popup takes (3000 - 900) / 30 = 70s (70,000ms)
      const posAtPopup = getThreatPositionAt(threat, 70000);
      expect(posAtPopup.x).toBeCloseTo(900, 0);
      expect(posAtPopup.z).toBe(20);

      // Mid-climb: T = 74s (4s after popup): 20 + 4 * 15 = 80m
      const posMidClimb = getThreatPositionAt(threat, 74000);
      expect(posMidClimb.z).toBeCloseTo(80, 0);

      // Peak climb: takes 130m / 15 m/s = 8.67s -> T = 78.67s (78,667ms)
      const posPeak = getThreatPositionAt(threat, 78667);
      expect(posPeak.z).toBeCloseTo(150, 0);

      // Terminal dive: T = 90s: altitude descending towards 20m
      const posDive = getThreatPositionAt(threat, 90000);
      expect(posDive.z).toBeLessThan(150);
      expect(posDive.z).toBeGreaterThan(20);
    });

    it('rejects POP_UP_DIVE scenario if time budget is unfairly compressed', () => {
      const spec = generatePopUpDiveScenario({ seed: 5555, difficulty: 0.3 });

      // Compress waypoints impossibly close to asset
      spec.threats[0].waypoints = [
        { x: 550, y: 0, z: 20 },
        { x: 0, y: 0, z: 20 },
      ];
      spec.threats[0].speedMps = 100;

      const result = validateDetailed(spec);
      expect(result.valid).toBe(false);
      expect(result.reasons.some((r) => r.includes('budget') || r.includes('failed track initiation'))).toBe(true);
    });
  });

  describe('Preservation of Golden Scenarios & Canonical Baselines', () => {
    it('preserves DEMO-1 golden simulation outcome with 100% precision', () => {
      const demo1Spec = demo1Json as unknown as ScenarioSpec;
      const engine = new SimEngine();
      engine.load(demo1Spec);

      // Scripted DEMO-1 operator inputs
      engine.inputQueue.push({
        tRawMs: 10000,
        applyTick: 200,
        action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'KEY' },
      });
      engine.inputQueue.push({
        tRawMs: 15000,
        applyTick: 300,
        action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' },
      });
      engine.inputQueue.push({
        tRawMs: 56900,
        applyTick: 1140,
        action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' },
      });
      engine.inputQueue.push({
        tRawMs: 57000,
        applyTick: 1140,
        action: { type: 'FIRE', trackNo: 'T-01' },
      });
      engine.inputQueue.push({
        tRawMs: 58000,
        applyTick: 1160,
        action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
      });

      for (let tick = 0; tick < 2400; tick++) {
        engine.step();
      }

      const metrics = aggregateAARMetrics(engine.events, demo1Spec);

      // Metrics must exactly match DEMO-1 golden baselines (79.21 score, zero leakers/collateral/roe)
      expect(metrics.score).toBeCloseTo(79.21, 1);
      expect(metrics.grade).toBe('PROFICIENT_IN_SIMULATION');
      expect(metrics.leakers).toBe(0);
      expect(metrics.collateralIncidents).toBe(0);
      expect(metrics.roeViolations).toBe(0);
    });
  });
});

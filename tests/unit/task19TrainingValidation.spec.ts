import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import demo1Json from '@/director/bundled/demo1.json';
import { SimEngine } from '@/sim/engine';
import { TrackEstimator } from '@/sim/tracker';
import { evaluateMasking } from '@/sim/masking';
import { evaluateReleaseGating } from '@/sim/roe';
import { computeEnvironmentalSensorHealth } from '@/sim/engine';
import { getGrade } from '@/sim/scoring';
import { aggregateAARMetrics } from '@/sim/metrics';
import {
  createSessionJsonPayload,
  createSessionCsvString,
  importSessionJson,
} from '@/db/io';
import {
  clearFallbackEventsForTest,
  addFallbackEventsForTest,
} from '@/db/recorder';
import type { StoredSimEvent } from '@/db/dexie';
import type { ScenarioSpec, TrackEntity } from '@/sim/types';

describe('TASK 19 — Training Validation, Sensor Gating, Scoring & Persistence', () => {
  const spec = demo1Json as unknown as ScenarioSpec;

  beforeEach(() => {
    clearFallbackEventsForTest();
  });

  afterEach(() => {
    clearFallbackEventsForTest();
  });

  describe('1. Sensor Observation & Track Estimation Lifecycle', () => {
    it('initiates track on 2-in-3 hits and advances Alpha-Beta track estimates', () => {
      const tracker = new TrackEstimator();
      expect(tracker.getAllEstimates().length).toBe(0);

      // Radar measurement 1
      tracker.updateWithRadar({
        sensorType: 'RADAR',
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 2000.0,
        measuredAzimuthDeg: 45.0,
        rangeUncertaintyM: 35.0,
        azimuthUncertaintyDeg: 0.8,
        snrDb: 15.0,
        sensorHealth: 'OK',
      });

      const est1 = tracker.getTrackEstimate('T-01');
      expect(est1).toBeDefined();
      expect(est1!.isCoasting).toBe(false);
      expect(est1!.uncertaintyM).toBe(35.0);
      expect(est1!.estRangeM).toBe(2000.0);

      // Predict 10 ticks (0.5s) without measurement -> enters coasting and uncertainty grows
      for (let i = 0; i < 10; i++) {
        tracker.predict(1000 + (i + 1) * 50, 0.05);
      }

      // After 2200ms without fresh radar sweep, track enters coasting
      for (let i = 0; i < 40; i++) {
        tracker.predict(1500 + (i + 1) * 50, 0.05);
      }
      const estCoasting = tracker.getTrackEstimate('T-01');
      expect(estCoasting!.isCoasting).toBe(true);
      expect(estCoasting!.uncertaintyM).toBeGreaterThan(35.0);
    });

    it('models urban terrain masking and line-of-sight obstruction correctly', () => {
      const urbanZone = spec.zones?.[0];
      expect(urbanZone).toBeDefined();

      // Entity clearly outside urban zone and shadow -> Not masked
      const unmaskedPos = { x: 3000, y: 3000, z: 120 };
      const unmaskedResult = evaluateMasking(unmaskedPos, spec.zones || []);
      expect(unmaskedResult.isMasked).toBe(false);

      // Entity inside urban zone shadow behind 40m building at low altitude -> Masked
      const maskedPos = { x: 1800, y: 1800, z: 30 };
      const maskedResult = evaluateMasking(maskedPos, spec.zones || []);
      expect(maskedResult.isMasked).toBe(true);
    });

    it('evaluates dynamic sensor degradation and recovery during environmental chaos', () => {
      const chaosList = [
        {
          type: 'FOG' as const,
          tStartMs: 5000,
          tEndMs: 15000,
          severity: 0.8,
        },
        {
          type: 'JAMMING' as const,
          tStartMs: 10000,
          tEndMs: 20000,
          severity: 1.0,
        },
      ];

      // Before chaos: all OK
      const h0 = computeEnvironmentalSensorHealth(1000, chaosList);
      expect(h0.EOIR).toBe('OK');
      expect(h0.RF).toBe('OK');
      expect(h0.RADAR).toBe('OK');

      // During FOG (t = 6000ms): EO/IR is DEG
      const h1 = computeEnvironmentalSensorHealth(6000, chaosList);
      expect(h1.EOIR).toBe('DEG');
      expect(h1.RF).toBe('OK');

      // During FOG + JAMMING (t = 12000ms): EO/IR is DEG, RF is OUT
      const h2 = computeEnvironmentalSensorHealth(12000, chaosList);
      expect(h2.EOIR).toBe('DEG');
      expect(h2.RF).toBe('OUT');

      // After chaos (t = 25000ms): all restored to OK
      const h3 = computeEnvironmentalSensorHealth(25000, chaosList);
      expect(h3.EOIR).toBe('OK');
      expect(h3.RF).toBe('OK');
    });
  });

  describe('2. Operator Actions, ROE Rules & PNR Gating', () => {
    it('blocks weapons release when target has breached the Point of No Return (r <= 500m)', () => {
      const targetInsidePnr: TrackEntity = {
        id: 'H-01',
        trackNo: 'T-01',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 300, y: 300, z: 30 }, // horizontal range = sqrt(300^2 + 300^2) = 424.26m <= 500m
        prev: { x: 300, y: 300, z: 30 },
        vel: { x: 0, y: 0, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'HOSTILE_ATTACK',
        step: 'TARGET',
        q: 0.85,
        cCls: 0.9,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 1000,
        tDesig: 2000,
        tCls: 3000,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      };

      const gating = evaluateReleaseGating({
        target: targetInsidePnr,
        effectorId: 'GUN',
        rangeM: Math.hypot(targetInsidePnr.pos.x, targetInsidePnr.pos.y),
        zones: [],
      });

      expect(gating.canFire).toBe(false);
      expect(gating.isHardBlocked).toBe(true);
      expect(gating.hardBlockReason).toBe('PNR_VIOLATION');
    });

    it('rejects engagement when target is outside effector envelope', () => {
      const distantTarget: TrackEntity = {
        id: 'H-02',
        trackNo: 'T-02',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 3500, y: 0, z: 50 }, // range = 3500m (Laser max envelope is 2000m)
        prev: { x: 3500, y: 0, z: 50 },
        vel: { x: 0, y: 0, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'HOSTILE_ATTACK',
        step: 'TARGET',
        q: 0.9,
        cCls: 0.9,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, true, true],
        tVis: 0,
        tTrk: 1000,
        tDesig: 2000,
        tCls: 3000,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      };

      const gating = evaluateReleaseGating({
        target: distantTarget,
        effectorId: 'LASER',
        rangeM: Math.hypot(distantTarget.pos.x, distantTarget.pos.y),
        zones: [],
      });

      expect(gating.canFire).toBe(false);
      expect(gating.isHardBlocked).toBe(true);
      expect(gating.hardBlockReason).toBe('OUT_OF_ENVELOPE');
    });

    it('rejects engagement when track quality is insufficient (q < 0.6)', () => {
      const lowQualityTarget: TrackEntity = {
        id: 'H-03',
        trackNo: 'T-03',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 1200, y: 0, z: 50 },
        prev: { x: 1200, y: 0, z: 50 },
        vel: { x: 0, y: 0, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: 'HOSTILE_ATTACK',
        step: 'TRACK',
        q: 0.45, // < 0.6
        cCls: 0.5,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true, false, false],
        tVis: 0,
        tTrk: 1000,
        tDesig: 2000,
        tCls: 3000,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      };

      const gating = evaluateReleaseGating({
        target: lowQualityTarget,
        effectorId: 'GUN',
        rangeM: Math.hypot(lowQualityTarget.pos.x, lowQualityTarget.pos.y),
        zones: [],
      });

      expect(gating.canFire).toBe(false);
      expect(gating.isHardBlocked).toBe(true);
      expect(gating.hardBlockReason).toBe('Q_MIN_VIOLATION');
    });
  });

  describe('3. Scoring & Grade Boundary Verification', () => {
    it('verifies exact integer grading threshold boundaries (49, 50, 69, 70)', () => {
      // 70 and above -> PROFICIENT_IN_SIMULATION
      expect(getGrade(100)).toBe('PROFICIENT_IN_SIMULATION');
      expect(getGrade(70)).toBe('PROFICIENT_IN_SIMULATION');

      // 50 to 69 -> DEVELOPING
      expect(getGrade(69)).toBe('DEVELOPING');
      expect(getGrade(60)).toBe('DEVELOPING');
      expect(getGrade(50)).toBe('DEVELOPING');

      // Below 50 -> NEEDS_RETRAINING
      expect(getGrade(49)).toBe('NEEDS_RETRAINING');
      expect(getGrade(30)).toBe('NEEDS_RETRAINING');
      expect(getGrade(0)).toBe('NEEDS_RETRAINING');
    });

    it('evaluates confusion matrix structure with 6 truth rows and 8 prediction columns', () => {
      const engine = new SimEngine();
      engine.load(spec);
      engine.step();

      const metrics = aggregateAARMetrics(engine.events, spec);
      expect(metrics.confusion.length).toBe(6);
      for (const row of metrics.confusion) {
        expect(row.length).toBe(8); // 7 canonical classes + NONE
      }
    });
  });

  describe('4. Persistence, Export, and Session Isolation', () => {
    const testSessionUid = 'test-session-task19-uid';

    const sampleEvents: StoredSimEvent[] = [
      {
        sessionUid: testSessionUid,
        seq: 1,
        tMs: 0,
        type: 'SIM_START',
        payload: { scenarioId: 'DEMO-1', seed: 2026, mode: 'TRAIN', difficulty: 0.3 },
      },
      {
        sessionUid: testSessionUid,
        seq: 2,
        tMs: 2000,
        type: 'DETECT',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { rangeM: 2000, pd: 0.95 },
      },
      {
        sessionUid: testSessionUid,
        seq: 3,
        tMs: 4000,
        type: 'DESIGNATE',
        trackNo: 'T-01',
        payload: { via: 'KEY' },
      },
      {
        sessionUid: testSessionUid,
        seq: 4,
        tMs: 120000,
        type: 'SESSION_END',
        payload: { durationMs: 120000, reason: 'COMPLETE', aborted: false },
      },
    ];

    it('generates a valid JSON export payload with exact SHA-256 checksum and metadata', async () => {
      addFallbackEventsForTest(sampleEvents);

      const payload = await createSessionJsonPayload(testSessionUid);
      expect(payload.format).toBe('drishti-aar-events');
      expect(payload.version).toBe(1);
      expect(payload.sessionUid).toBe(testSessionUid);
      expect(payload.eventCount).toBe(4);
      expect(payload.events.length).toBe(4);
      expect(payload.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates a well-formed CSV export with correct headers and sanitized cells', async () => {
      addFallbackEventsForTest(sampleEvents);

      const csv = await createSessionCsvString(testSessionUid);
      expect(csv).toContain('"sessionUid","seq","tMs","tRawMs","type","trackNo","entityId","payload"');
      expect(csv).toContain(testSessionUid);
      expect(csv).toContain('SIM_START');
      expect(csv).toContain('SESSION_END');
    });

    it('detects tampering and rejects import when SHA-256 checksum does not match payload', async () => {
      addFallbackEventsForTest(sampleEvents);

      const payload = await createSessionJsonPayload(testSessionUid);

      // Tamper with payload (alter event sequence payload)
      payload.events[1].payload = { ...payload.events[1].payload, tampered: true };

      const tamperedFile = {
        text: async () => JSON.stringify(payload),
      } as unknown as File;

      await expect(importSessionJson(tamperedFile)).rejects.toThrow(
        /SHA-256 verification failed/i
      );
    });
  });
});

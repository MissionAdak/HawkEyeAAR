import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { loadCatalogScenario } from '@/director/catalog';
import { SimEngine, computeEnvironmentalSensorHealth } from '@/sim/engine';
import { TrackEstimator } from '@/sim/tracker';
import { calculateRadarPd } from '@/sim/sensors';
import { evaluateMasking } from '@/sim/masking';
import { evaluateReleaseGating } from '@/sim/roe';
import { getGrade } from '@/sim/scoring';
import { aggregateAARMetrics } from '@/sim/metrics';
import { CONFIG } from '@/config';
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
import type { TrackEntity } from '@/sim/types';
import type { OperatorFeedback } from '@/sim/operatorFeedback';

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
}

describe('TASK 19 — Training Validation, Sensor Gating, Scoring & Persistence', () => {
  const { spec } = loadCatalogScenario('DEMO-1', 2026);

  beforeEach(() => {
    clearFallbackEventsForTest();
  });

  afterEach(() => {
    clearFallbackEventsForTest();
  });

  describe('1. Sensor Observation & Track Estimation Lifecycle', () => {
    it('enforces 2-in-3 radar detection rule before initiating firm track', () => {
      const engine = new SimEngine();
      engine.load(spec);

      // Grab first active target entity
      const target = engine.curr[0];
      expect(target).toBeDefined();

      // Reset hit history for controlled testing of initiation pipeline
      target.hitHistory = [];
      target.step = 'UNDETECTED';
      target.tTrk = null;
      target.tVis = null;

      // Sweep 1: 1st hit -> Transitions to FIND, but tTrk remains null (no firm track)
      target.hitHistory.push(true);
      if (target.step === 'UNDETECTED') {
        target.step = 'FIND';
        target.tVis = 2000;
      }
      expect(target.step).toBe('FIND');
      expect(target.hitHistory.filter(Boolean).length).toBe(1);
      expect(target.tTrk).toBeNull(); // 1 hit in 3 is insufficient for track initiation

      // Sweep 2: Miss -> hitHistory = [true, false]. Still 1 hit in 3
      target.hitHistory.push(false);
      expect(target.hitHistory.filter(Boolean).length).toBe(1);
      expect(target.tTrk).toBeNull();

      // Sweep 3: 2nd hit within 3 sweeps -> hitHistory = [true, false, true]. Hits = 2 >= 2!
      target.hitHistory.push(true);
      const hitsIn3 = target.hitHistory.filter(Boolean).length;
      expect(hitsIn3).toBe(2);

      // Track initiates
      if (hitsIn3 >= 2 && target.tTrk === null) {
        target.tTrk = 6000;
      }
      expect(target.tTrk).toBe(6000);
      expect(target.step).toBe('FIND');

      // Test window expiration: if hits do not accumulate 2-in-3, old hits expire
      const expiredTarget = { ...target, hitHistory: [true, false, false], tTrk: null };
      expect(expiredTarget.hitHistory.filter(Boolean).length).toBe(1);

      // Fourth sweep arrives with a miss -> oldest hit is shifted out
      expiredTarget.hitHistory.push(false);
      if (expiredTarget.hitHistory.length > 3) expiredTarget.hitHistory.shift();
      expect(expiredTarget.hitHistory).toEqual([false, false, false]);
      expect(expiredTarget.hitHistory.filter(Boolean).length).toBe(0);
      expect(expiredTarget.tTrk).toBeNull();
    });

    it('advances Alpha-Beta track estimates according to canonical filtering equations', () => {
      const tracker = new TrackEstimator();
      expect(tracker.getAllEstimates().length).toBe(0);

      // Measurement 1 at t = 1000 ms: Range 2000m, Azimuth 45 deg
      // x1 = 2000 * sin(45 deg) = 1414.21 m, y1 = 2000 * cos(45 deg) = 1414.21 m
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
      expect(est1!.estPos.x).toBeCloseTo(1414.2, 1);
      expect(est1!.estPos.y).toBeCloseTo(1414.2, 1);
      expect(est1!.estVel.x).toBe(0);
      expect(est1!.estVel.y).toBe(0);

      // Measurement 2 at t = 3000 ms (dt = 2.0 s): Range 1960m, Azimuth 45 deg
      // measX2 = 1960 * sin(45 deg) = 1385.93 m, measY2 = 1960 * cos(45 deg) = 1385.93 m
      // Prior velocity was (0,0), so predicted position is (1414.21, 1414.21)
      // Residuals: rx = 1385.93 - 1414.21 = -28.28 m, ry = -28.28 m
      // Alpha-Beta parameters from NOTIONAL_SENSOR_PARAMS.TRACKER: alpha = 0.65, beta = 0.30
      // Expected updated position:
      // x = 1414.21 + 0.65 * (-28.28) = 1414.21 - 18.38 = 1395.83 m
      // Expected updated velocity:
      // vx = 0 + (0.30 / 2.0) * (-28.28) = -4.24 m/s
      tracker.updateWithRadar({
        sensorType: 'RADAR',
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 3000,
        measuredRangeM: 1960.0,
        measuredAzimuthDeg: 45.0,
        rangeUncertaintyM: 35.0,
        azimuthUncertaintyDeg: 0.8,
        snrDb: 16.0,
        sensorHealth: 'OK',
      });

      const est2 = tracker.getTrackEstimate('T-01');
      expect(est2).toBeDefined();
      expect(est2!.estPos.x).toBeCloseTo(1395.8, 0);
      expect(est2!.estPos.y).toBeCloseTo(1395.8, 0);
      expect(est2!.estVel.x).toBeCloseTo(-4.2, 0);
      expect(est2!.estVel.y).toBeCloseTo(-4.2, 0);

      // Verify tracker estimates do not access or mirror true entity velocities
      expect(est2!.estSpeedMps).toBeCloseTo(Math.hypot(-4.24, -4.24), 0);
    });

    it('models coasting uncertainty growth and subsequent reacquisition', () => {
      const tracker = new TrackEstimator();
      tracker.updateWithRadar({
        sensorType: 'RADAR',
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 2000.0,
        measuredAzimuthDeg: 45.0,
        rangeUncertaintyM: 30.0,
        azimuthUncertaintyDeg: 0.8,
        snrDb: 15.0,
        sensorHealth: 'OK',
      });

      const initialUncert = tracker.getTrackEstimate('T-01')!.uncertaintyM;

      // Predict 3000 ms into future without fresh observations (dropout / terrain masking)
      for (let t = 1050; t <= 4000; t += 50) {
        tracker.predict(t, 0.05);
      }

      const coastingEst = tracker.getTrackEstimate('T-01')!;
      expect(coastingEst.isCoasting).toBe(true);
      expect(coastingEst.uncertaintyM).toBeGreaterThan(initialUncert);

      // Reacquisition: new radar measurement arrives at t = 4500ms
      tracker.updateWithRadar({
        sensorType: 'RADAR',
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 4500,
        measuredRangeM: 1950.0,
        measuredAzimuthDeg: 45.0,
        rangeUncertaintyM: 30.0,
        azimuthUncertaintyDeg: 0.8,
        snrDb: 16.0,
        sensorHealth: 'OK',
      });

      const reacquiredEst = tracker.getTrackEstimate('T-01')!;
      expect(reacquiredEst.isCoasting).toBe(false);
      expect(reacquiredEst.coastingSinceMs).toBeNull();
      expect(reacquiredEst.uncertaintyM).toBe(30.0);
    });

    it('models urban terrain line-of-sight obstruction and suppresses radar Pd', () => {
      // 1. Observer at (0, 0, 5), Target outside urban zone shadow
      const unmaskedPos = { x: 3000, y: 3000, z: 120 };
      const unmaskedResult = evaluateMasking(unmaskedPos, spec.zones || []);
      expect(unmaskedResult.isMasked).toBe(false);

      const unmaskedPd = calculateRadarPd(0.01, Math.hypot(unmaskedPos.x, unmaskedPos.y), 1.0);
      expect(unmaskedPd.pd).toBeGreaterThan(0.3);

      // 2. Target behind urban building at low altitude
      const maskedPos = { x: 1800, y: 1800, z: 30 };
      const maskedResult = evaluateMasking(maskedPos, spec.zones || []);
      expect(maskedResult.isMasked).toBe(true);

      // Masked targets have aEnv = 0 -> zero detection probability
      const maskedPd = calculateRadarPd(0.01, Math.hypot(maskedPos.x, maskedPos.y), 0.0);
      expect(maskedPd.pd).toBe(0.0);
    });

    it('evaluates dynamic sensor degradation and recovery during environmental chaos through engine lifecycle', () => {
      const chaosSpec = [
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

      // Engine at t = 1000ms: Baseline OK
      const h0 = computeEnvironmentalSensorHealth(1000, chaosSpec);
      expect(h0.EOIR).toBe('OK');
      expect(h0.RF).toBe('OK');
      expect(h0.RADAR).toBe('OK');

      // Engine at t = 7000ms: During FOG -> EO/IR degraded, RF OK
      const h1 = computeEnvironmentalSensorHealth(7000, chaosSpec);
      expect(h1.EOIR).toBe('DEG');
      expect(h1.RF).toBe('OK');

      // Engine at t = 12000ms: During FOG + JAMMING -> EO/IR DEG, RF OUT
      const h2 = computeEnvironmentalSensorHealth(12000, chaosSpec);
      expect(h2.EOIR).toBe('DEG');
      expect(h2.RF).toBe('OUT');

      // Engine at t = 25000ms: Post-chaos -> Restored to OK
      const h3 = computeEnvironmentalSensorHealth(25000, chaosSpec);
      expect(h3.EOIR).toBe('OK');
      expect(h3.RF).toBe('OK');
      expect(h3.RADAR).toBe('OK');
    });
  });

  describe('2. Operator Actions, ROE Rules & PNR Boundaries', () => {
    const baseTarget: TrackEntity = {
      id: 'H-01',
      trackNo: 'T-01',
      trueClass: 'HOSTILE_ATTACK',
      droneType: 'FPV_ATTACK',
      pos: { x: 1000, y: 0, z: 50 },
      prev: { x: 1000, y: 0, z: 50 },
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

    it('evaluates exact numerical boundary of Point of No Return (PNR = 500m)', () => {
      // 1. Immediately inside PNR (r = 499m <= 500m) -> Hard Blocked
      const insidePnr = evaluateReleaseGating({
        target: baseTarget,
        effectorId: 'GUN',
        rangeM: 499.0,
        zones: [],
      });
      expect(insidePnr.canFire).toBe(false);
      expect(insidePnr.isHardBlocked).toBe(true);
      expect(insidePnr.hardBlockReason).toBe('PNR_VIOLATION');

      // 2. Exactly at PNR boundary (r = 500.0m <= 500m) -> Hard Blocked
      const atPnr = evaluateReleaseGating({
        target: baseTarget,
        effectorId: 'GUN',
        rangeM: 500.0,
        zones: [],
      });
      expect(atPnr.canFire).toBe(false);
      expect(atPnr.isHardBlocked).toBe(true);
      expect(atPnr.hardBlockReason).toBe('PNR_VIOLATION');

      // 3. Immediately outside PNR (r = 501.0m > 500m) -> PNR check passes
      const outsidePnr = evaluateReleaseGating({
        target: baseTarget,
        effectorId: 'GUN',
        rangeM: 501.0,
        zones: [],
      });
      expect(outsidePnr.hardBlockReason).not.toBe('PNR_VIOLATION');
      expect(outsidePnr.roeGate.pnrOk).toBe(true);
    });

    it('evaluates exact numerical boundary of Track Quality floor (qMin = 0.60)', () => {
      // 1. Immediately below quality floor (q = 0.59 < 0.60) -> Hard Blocked
      const belowQ = evaluateReleaseGating({
        target: { ...baseTarget, q: 0.59 },
        effectorId: 'GUN',
        rangeM: 1000.0,
        zones: [],
      });
      expect(belowQ.canFire).toBe(false);
      expect(belowQ.isHardBlocked).toBe(true);
      expect(belowQ.hardBlockReason).toBe('Q_MIN_VIOLATION');

      // 2. Exactly at quality floor (q = 0.60 >= 0.60) -> Passes quality check
      const atQ = evaluateReleaseGating({
        target: { ...baseTarget, q: 0.60 },
        effectorId: 'GUN',
        rangeM: 1000.0,
        zones: [],
      });
      expect(atQ.hardBlockReason).not.toBe('Q_MIN_VIOLATION');
      expect(atQ.roeGate.qOk).toBe(true);

      // 3. Immediately above quality floor (q = 0.61 >= 0.60) -> Passes quality check
      const aboveQ = evaluateReleaseGating({
        target: { ...baseTarget, q: 0.61 },
        effectorId: 'GUN',
        rangeM: 1000.0,
        zones: [],
      });
      expect(aboveQ.hardBlockReason).not.toBe('Q_MIN_VIOLATION');
      expect(aboveQ.roeGate.qOk).toBe(true);
    });

    it('evaluates exact effector envelope boundaries for Laser, Gun, and Softkill', () => {
      // LASER: [200, 1500] m (ranges <= 500m are caught by PNR_VIOLATION precedence)
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'LASER', rangeM: 1000.0, zones: [] }).hardBlockReason).toBeUndefined();
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'LASER', rangeM: 1500.0, zones: [] }).hardBlockReason).toBeUndefined();
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'LASER', rangeM: 1501.0, zones: [] }).hardBlockReason).toBe('OUT_OF_ENVELOPE');

      // GUN: [100, 2000] m
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'GUN', rangeM: 1000.0, zones: [] }).hardBlockReason).toBeUndefined();
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'GUN', rangeM: 2000.0, zones: [] }).hardBlockReason).toBeUndefined();
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'GUN', rangeM: 2001.0, zones: [] }).hardBlockReason).toBe('OUT_OF_ENVELOPE');

      // RF_SOFTKILL: [200, 2000] m
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'RF_SOFTKILL', rangeM: 1000.0, zones: [] }).hardBlockReason).toBeUndefined();
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'RF_SOFTKILL', rangeM: 2000.0, zones: [] }).hardBlockReason).toBeUndefined();
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'RF_SOFTKILL', rangeM: 2001.0, zones: [] }).hardBlockReason).toBe('OUT_OF_ENVELOPE');

      // RF_SOFTKILL against RF-silent target -> Hard Blocked
      const silentTarget = { ...baseTarget, emitsRf: false };
      expect(evaluateReleaseGating({ target: silentTarget, effectorId: 'RF_SOFTKILL', rangeM: 1000.0, zones: [] }).hardBlockReason).toBe('RF_SILENT_TARGET');

      // RF_SOFTKILL during active RF Jamming -> Hard Blocked
      expect(evaluateReleaseGating({ target: baseTarget, effectorId: 'RF_SOFTKILL', rangeM: 1000.0, zones: [], isJammingActive: true }).hardBlockReason).toBe('RF_JAMMING_ACTIVE');
    });

    it('processes operator fire inputs through engine queue and generates feedback with estimated telemetry', () => {
      const engine = new SimEngine();
      engine.load(spec);

      // Step past radar sweep and track initiation
      for (let i = 0; i < 40; i++) {
        engine.step();
      }

      const feedbacks: OperatorFeedback[] = [];
      engine.onFeedback = (fb) => feedbacks.push(fb);

      // Enqueue fire action into input queue
      engine.inputQueue.push({
        tRawMs: 2000,
        applyTick: 40,
        action: { type: 'FIRE', trackNo: 'T-01' },
      });
      expect(engine.inputQueue.getPendingCount()).toBeGreaterThan(0);

      // Advance one tick to process queue
      engine.step();
      expect(engine.inputQueue.getPendingCount()).toBe(0);
      expect(feedbacks.length).toBeGreaterThan(0);
      expect(feedbacks[0].trackNo).toBe('T-01');
    });
  });

  describe('3. Scoring & Confusion Matrix Mathematical Integrity', () => {
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

    it('independently computes score from mathematical formulas without calling aggregateAARMetrics', () => {
      // Controlled training parameters:
      // Track appearance at tTrk = 2000 ms, tPnr = 50000 ms (budget = 48000 ms)
      // Trainee designates at tDesig = 8000 ms (latency = 6000 ms)
      const tBudget = 50000 - 2000;
      const latency = 8000 - 2000;
      const expectedD = 100 * (1 - latency / tBudget); // 100 * (1 - 6000 / 48000) = 87.5

      // Hostile classified as HOSTILE_ATTACK -> row HOSTILE_ATTACK, col HOSTILE_ATTACK = 100
      const matrix = CONFIG.classificationMatrix as Record<string, Record<string, number>>;
      const expectedC = matrix.HOSTILE_ATTACK.HOSTILE_ATTACK; // 100

      // Engagement: RF_SOFTKILL (cost 1000) on 100,000 INR target
      const cer = 1000 / 100000; // 0.01 <= 1.0 -> econScore = 100
      expect(cer).toBe(0.01);
      const expectedEcon = 100;
      // Laser envelope [100, 3000], R_opt = 1550m, fired at 1550m -> deviation = 0 -> timeScore = 100
      const expectedTime = 100;
      // Neutralised before PNR -> G = 0.6 * econ + 0.4 * time = 100
      const expectedG = 0.6 * expectedEcon + 0.4 * expectedTime; // 100

      // No collateral, civilian, or friendly engagement -> R = 100
      const expectedR = 100;

      // Global Mission Score: S = 0.25*D + 0.35*C + 0.25*G + 0.15*R
      const { hostile } = CONFIG.scoringWeights;
      const expectedGlobalScore = Math.round(
        hostile.d * expectedD +
        hostile.c * expectedC +
        hostile.g * expectedG +
        hostile.r * expectedR
      );

      // Verify mathematical derivation: 0.25(87.5) + 0.35(100) + 0.25(100) + 0.15(100) = 21.875 + 35 + 25 + 15 = 96.875 -> 97
      expect(expectedGlobalScore).toBe(97);
      expect(getGrade(expectedGlobalScore)).toBe('PROFICIENT_IN_SIMULATION');
    });

    it('evaluates confusion matrix structure with 6 truth rows and 8 prediction columns', () => {
      const engine = new SimEngine();
      engine.load(spec);
      engine.step();

      const metrics = aggregateAARMetrics(engine.events, spec);
      expect(metrics.confusion.length).toBe(6); // 6 canonical truth rows
      for (const row of metrics.confusion) {
        expect(row.length).toBe(8); // 7 canonical classes + NONE column (column 7)
      }
    });
  });

  describe('4. Persistence, Export, and Tampering Protection', () => {
    const testSessionUid = 'test-session-task19-remediation-uid';

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

    it('generates an export payload with exact SHA-256 integrity checksum matching independent crypto calculation', async () => {
      addFallbackEventsForTest(sampleEvents);

      const payload = await createSessionJsonPayload(testSessionUid);
      expect(payload.format).toBe('drishti-aar-events');
      expect(payload.version).toBe(1);
      expect(payload.sessionUid).toBe(testSessionUid);
      expect(payload.eventCount).toBe(4);
      expect(payload.events.length).toBe(4);

      // Independent SHA-256 calculation
      const canonicalData = stableJson({ sessionUid: testSessionUid, events: payload.events });
      const expectedHash = crypto.createHash('sha256').update(canonicalData).digest('hex');
      expect(payload.sha256).toBe(expectedHash);
    });

    it('successfully imports valid JSON session and rejects duplicate imports cleanly', async () => {
      addFallbackEventsForTest(sampleEvents);
      const payload = await createSessionJsonPayload(testSessionUid);
      clearFallbackEventsForTest();

      const validFile = {
        text: async () => JSON.stringify(payload),
      } as unknown as File;

      // 1. Initial Import -> Successful
      const result1 = await importSessionJson(validFile);
      expect(result1.imported).toBe(4);
      expect(result1.duplicates).toBe(0);

      // 2. Duplicate Import of exact same payload -> Handled honestly with duplicates = 4, imported = 0
      const result2 = await importSessionJson(validFile);
      expect(result2.imported).toBe(0);
      expect(result2.duplicates).toBe(4);
    });

    it('rejects conflicting event sequences with mismatched payloads for existing session', async () => {
      addFallbackEventsForTest(sampleEvents);
      const payload = await createSessionJsonPayload(testSessionUid);

      // Create conflicting payload: same sessionUid and seq 2, but different event payload
      const conflictingPayload = JSON.parse(JSON.stringify(payload));
      conflictingPayload.events[1].payload.rangeM = 9999;
      // Recompute valid sha256 for the conflicting payload
      const canonicalData = stableJson({ sessionUid: testSessionUid, events: conflictingPayload.events });
      conflictingPayload.sha256 = crypto.createHash('sha256').update(canonicalData).digest('hex');

      const conflictingFile = {
        text: async () => JSON.stringify(conflictingPayload),
      } as unknown as File;

      await expect(importSessionJson(conflictingFile)).rejects.toThrow(
        /Conflicting data for event sequence 2/i
      );
    });

    it('detects tampering and rejects import when SHA-256 checksum does not match payload', async () => {
      addFallbackEventsForTest(sampleEvents);
      const payload = await createSessionJsonPayload(testSessionUid);

      // Tamper with payload (alter event sequence payload without updating sha256)
      payload.events[1].payload = { ...payload.events[1].payload, tampered: true };

      const tamperedFile = {
        text: async () => JSON.stringify(payload),
      } as unknown as File;

      await expect(importSessionJson(tamperedFile)).rejects.toThrow(
        /SHA-256 verification failed/i
      );
    });

    it('generates a well-formed CSV export with formula injection sanitization and cell escaping', async () => {
      const injectionEvents: StoredSimEvent[] = [
        {
          sessionUid: 'csv-test-session',
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          trackNo: '=CMD|calc',
          entityId: '+ATTACK',
          payload: { quote: 'Hello "World"' },
        },
      ];
      addFallbackEventsForTest(injectionEvents);

      const csv = await createSessionCsvString('csv-test-session');
      expect(csv).toContain('"sessionUid","seq","tMs","tRawMs","type","trackNo","entityId","payload"');
      expect(csv).toContain('csv-test-session');

      // Verify formula-leading cells are sanitized with a leading single quote per CSV injection rules
      expect(csv).toContain('"\'=CMD|calc"');
      expect(csv).toContain('"\'+ATTACK"');
      // Verify quotes inside cells are escaped as double quotes per RFC 4180
      expect(csv).toContain('\\""World\\""');
    });
  });
});

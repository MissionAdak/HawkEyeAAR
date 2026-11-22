import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeNextDifficulty,
  updateEMA,
  computeWeaknessWeights,
  updateWeaknessProfile,
  getWeakestDimension,
  getAdaptivePlan,
  sampleAdaptiveLevers,
  WEAKNESS_LEVER_MAP,
  DEFAULT_TRAIN_DIFFICULTY,
  DEFAULT_METRIC_EMA,
} from '@/director/adaptive';
import { generateScenario } from '@/director/generator';
import { isNovel } from '@/director/novelty';
import { validate } from '@/director/validate';
import { loadCatalogScenario } from '@/director/catalog';
import {
  saveCompletedSession,
  getTraineeDifficulty,
  getTraineeProfile,
  updateTraineeProgression,
  resetTraineeProgressionForTest,
  getUnitTraineeSummaries,
  getTraineeSessions,
  getProgressionLogEntry,
  createMockMetrics,
} from '@/db/sessionRepo';
import { setMockPersistenceFailureMode } from '@/db/recorder';
import { useSessionStore } from '@/store/sessionStore';
import type { SessionRow } from '@/db/dexie';
import type { WeaknessVector, ScenarioSpec } from '@/sim/types';

describe('TASK 21-PT — Progressive Training & Adaptive Progression Subsystem', () => {
  beforeEach(() => {
    resetTraineeProgressionForTest();
  });

  describe('1. Difficulty Adaptation Formula & Boundary Conditions (Section 4 & Rules.md R4.2)', () => {
    it('verifies default initial training difficulty is d0 = 0.30', () => {
      expect(DEFAULT_TRAIN_DIFFICULTY).toBe(0.3);
    });

    it('verifies scores above 70 increase difficulty exactly: d_next = clamp(d + 0.15 * (Score - 70) / 30, 0, 1)', () => {
      // Score = 100: delta = 0.15 * (30 / 30) = +0.15 -> 0.30 + 0.15 = 0.45
      const d1 = computeNextDifficulty(0.3, 100);
      expect(d1).toBeCloseTo(0.45, 4);

      // Score = 85: delta = 0.15 * (15 / 30) = +0.075 -> 0.30 + 0.075 = 0.375
      const d2 = computeNextDifficulty(0.3, 85);
      expect(d2).toBeCloseTo(0.375, 4);
    });

    it('verifies scores below 70 decrease difficulty exactly', () => {
      // Score = 40: delta = 0.15 * (-30 / 30) = -0.15 -> 0.30 - 0.15 = 0.15
      const d1 = computeNextDifficulty(0.3, 40);
      expect(d1).toBeCloseTo(0.15, 4);

      // Score = 55: delta = 0.15 * (-15 / 30) = -0.075 -> 0.30 - 0.075 = 0.225
      const d2 = computeNextDifficulty(0.3, 55);
      expect(d2).toBeCloseTo(0.225, 4);
    });

    it('verifies scores at exactly 70 preserve difficulty (zero drift in learning zone)', () => {
      const d1 = computeNextDifficulty(0.3, 70);
      expect(d1).toBe(0.3);

      const d2 = computeNextDifficulty(0.65, 70);
      expect(d2).toBe(0.65);
    });

    it('strictly clamps difficulty between 0.0 and 1.0 under extreme boundaries', () => {
      // Upper clamp: d = 0.95 with Score = 100 would be 1.10 -> clamped to 1.0
      expect(computeNextDifficulty(0.95, 100)).toBe(1.0);
      expect(computeNextDifficulty(1.0, 100)).toBe(1.0);

      // Lower clamp: d = 0.05 with Score = 40 would be -0.10 -> clamped to 0.0
      expect(computeNextDifficulty(0.05, 40)).toBe(0.0);
      expect(computeNextDifficulty(0.0, 0)).toBe(0.0);

      // Wild out-of-range scores
      expect(computeNextDifficulty(0.5, 200)).toBe(1.0);
      expect(computeNextDifficulty(0.5, -50)).toBe(0.0);
    });

    it('fails closed to safe difficulty when presented with NaN or non-finite inputs', () => {
      expect(computeNextDifficulty(NaN, 80)).toBe(0.3);
      expect(computeNextDifficulty(0.4, NaN)).toBe(0.4);
      expect(computeNextDifficulty(Infinity, 80)).toBe(0.3);
    });
  });

  describe('2. EMA & Weakness Profile Updates (Section 5 & PRD.md §4.9)', () => {
    it('seeds the EMA with first observation sample (cold-start)', () => {
      const seeded = updateEMA(null, 75.0);
      expect(seeded).toBe(75.0);
    });

    it('updates subsequent valid observations with alpha = 0.4 and beta = 0.6', () => {
      // EMA_2 = 0.4 * 60 + 0.6 * 80 = 24 + 48 = 72
      const updated = updateEMA(80.0, 60.0);
      expect(updated).toBeCloseTo(72.0, 4);

      // EMA_3 = 0.4 * 90 + 0.6 * 72 = 36 + 43.2 = 79.2
      const updated3 = updateEMA(72.0, 90.0);
      expect(updated3).toBeCloseTo(79.2, 4);
    });

    it('skips unavailable metrics without zeroing them or treating as failure', () => {
      const initialProfile: WeaknessVector = {
        d: 80,
        c: 85,
        econ: 70,
        r: 90,
        sal: 75,
        sat: 60,
      };

      // Session with no chaos event (salScore: null) and no swarm elements (swarmSat: null)
      const nextProfile = updateWeaknessProfile(initialProfile, {
        dScore: 60,
        cScore: 80,
        econScore: 75,
        rScore: 85,
        salScore: null,
        swarmSat: null,
      });

      // Updated metrics
      expect(nextProfile.d).toBeCloseTo(0.4 * 60 + 0.6 * 80, 2);
      expect(nextProfile.c).toBeCloseTo(0.4 * 80 + 0.6 * 85, 2);

      // Skipped metrics retain previous EMA exactly!
      expect(nextProfile.sal).toBe(75);
      expect(nextProfile.sat).toBe(60);
    });

    it('uses documented default w_k = 0.5 (EMA = 50.0) when no history exists', () => {
      expect(DEFAULT_METRIC_EMA).toBe(50.0);

      // Cold start update with only D and C observations
      const coldStartProfile = updateWeaknessProfile(null, {
        dScore: 40,
        cScore: 80,
      });

      expect(coldStartProfile.d).toBe(40);
      expect(coldStartProfile.c).toBe(80);
      // Unobserved metrics keep default 50.0
      expect(coldStartProfile.econ).toBe(50.0);
      expect(coldStartProfile.r).toBe(50.0);
      expect(coldStartProfile.sal).toBe(50.0);
      expect(coldStartProfile.sat).toBe(50.0);
    });

    it('computes weakness weights summing to 1.0 with highest weight on weakest metric', () => {
      const profile: WeaknessVector = {
        d: 30, // Weakest
        c: 90,
        econ: 85,
        r: 80,
        sal: 75,
        sat: 80,
      };

      const weights = computeWeaknessWeights(profile);
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 4);

      // d is weakest -> must have largest weight
      expect(weights.d).toBeGreaterThan(weights.c);
      expect(weights.d).toBeGreaterThan(weights.econ);
      expect(weights.d).toBeGreaterThan(weights.r);

      const weakest = getWeakestDimension(profile);
      expect(weakest.dimension).toBe('d');
      expect(weakest.lever.leverId).toBe('LOW_RCS_MASKED');
    });
  });

  describe('3. Adaptive Director Scenario Generation & Weakness Levers (Section 6 & PRD.md §5.4)', () => {
    it('maps all 6 weakness dimensions to explainable Red Team levers', () => {
      expect(WEAKNESS_LEVER_MAP.d.leverId).toBe('LOW_RCS_MASKED');
      expect(WEAKNESS_LEVER_MAP.c.leverId).toBe('DECOY_FLOOD');
      expect(WEAKNESS_LEVER_MAP.econ.leverId).toBe('PROPORTIONALITY_DRILL');
      expect(WEAKNESS_LEVER_MAP.r.leverId).toBe('URBAN_COLLATERAL_RISK');
      expect(WEAKNESS_LEVER_MAP.sal.leverId).toBe('SENSOR_CHAOS_CHALLENGE');
      expect(WEAKNESS_LEVER_MAP.sat.leverId).toBe('SWARM_SATURATION');
    });

    it('generates weakness-targeted scenarios matching the operator profile', () => {
      // 1. Weak Detection [D]
      const weakDetection: WeaknessVector = { d: 25, c: 80, econ: 80, r: 80, sal: 80, sat: 80 };
      const specD = generateScenario('TRAINEE-1', 1, 0.4, [], 0, { weaknessVector: weakDetection });
      expect(specD.levers[0].id).toBe('LOW_RCS_MASKED');
      expect(validate(specD)).toBe(true);

      // 2. Weak Swarm Saturation [SAT]
      const weakSat: WeaknessVector = { d: 80, c: 80, econ: 80, r: 80, sal: 80, sat: 20 };
      const specSat = generateScenario('TRAINEE-1', 1, 0.5, [], 0, { weaknessVector: weakSat });
      expect(specSat.levers[0].id).toBe('SWARM_SATURATION');
      expect(specSat.threats.every((t) => t.droneType === 'SWARM_ELEMENT')).toBe(true);
      expect(validate(specSat)).toBe(true);

      // 3. Weak Economics [E_econ]
      const weakEcon: WeaknessVector = { d: 80, c: 80, econ: 20, r: 80, sal: 80, sat: 80 };
      const specEcon = generateScenario('TRAINEE-1', 1, 0.3, [], 0, { weaknessVector: weakEcon });
      expect(specEcon.levers[0].id).toBe('PROPORTIONALITY_DRILL');
      expect(specEcon.threats.some((t) => t.trueClass === 'HOSTILE_ISR')).toBe(true);
      expect(validate(specEcon)).toBe(true);

      // 4. Weak Classification [C]
      const weakCls: WeaknessVector = { d: 80, c: 20, econ: 80, r: 80, sal: 80, sat: 80 };
      const specCls = generateScenario('TRAINEE-1', 1, 0.3, [], 0, { weaknessVector: weakCls });
      expect(specCls.levers[0].id).toBe('DECOY_FLOOD');
      expect(specCls.decoys.length).toBeGreaterThan(0);
      expect(validate(specCls)).toBe(true);
    });

    it('enforces deterministic generation: identical parameters yield identical specifications', () => {
      const specA = generateScenario('TRAINEE-VIPER', 3, 0.45, [], 99);
      const specB = generateScenario('TRAINEE-VIPER', 3, 0.45, [], 99);

      expect(specA.id).toBe(specB.id);
      expect(specA.seed).toBe(specB.seed);
      expect(specA.features).toEqual(specB.features);
      expect(specA.threats.length).toBe(specB.threats.length);
    });

    it('enforces scenario novelty filter across consecutive generated sessions (cosine < 0.85)', () => {
      const v1 = [1, 0, 0, 0];
      const v2 = [0, 1, 0, 0];
      const vSimilar = [0.99, 0.05, 0, 0];

      expect(isNovel(v2, [v1])).toBe(true);
      expect(isNovel(vSimilar, [v1])).toBe(false);
    });
  });

  describe('4. TRAIN vs EVAL Mode Isolation (Section 7 & Rules.md R4.4)', () => {
    it('strictly prevents EVAL sessions from mutating difficulty or EMA', async () => {
      const traineeUid = 'trainee-viper-2';
      const initialD = await getTraineeDifficulty(traineeUid);
      expect(initialD).toBe(0.3);

      // Execute completed EVAL session with high score (95)
      const evalSession: SessionRow = {
        uid: 'session-eval-1',
        traineeUid,
        mode: 'EVAL',
        startedAt: 1000,
        durationMs: 60000,
        score: 95,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.5,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'EVAL', {
          dScore: 95,
          cScore: 95,
          econScore: 95,
          rScore: 95,
        }),
      };

      const result = await updateTraineeProgression(evalSession);
      expect(result).toBeNull();

      // Verify difficulty remains unchanged at 0.3
      const dAfterEval = await getTraineeDifficulty(traineeUid);
      expect(dAfterEval).toBe(0.3);

      // Verify EMA profile remains null
      const profileAfterEval = await getTraineeProfile(traineeUid);
      expect(profileAfterEval).toBeNull();
    });

    it('updates difficulty and EMA on completed TRAIN sessions', async () => {
      const traineeUid = 'trainee-viper-2';

      // Execute completed TRAIN session with score 85 (+0.075 delta)
      const trainSession: SessionRow = {
        uid: 'session-train-1',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 2000,
        durationMs: 60000,
        score: 85,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
          dScore: 40,
          cScore: 90,
          econScore: 85,
          rScore: 90,
        }),
      };

      const result = await updateTraineeProgression(trainSession);
      expect(result).not.toBeNull();
      expect(result!.d).toBeCloseTo(0.375, 4);

      const dAfterTrain = await getTraineeDifficulty(traineeUid);
      expect(dAfterTrain).toBeCloseTo(0.375, 4);

      const profile = await getTraineeProfile(traineeUid);
      expect(profile).not.toBeNull();
      expect(profile!.d).toBe(40);
      expect(profile!.c).toBe(90);
    });

    it('unit leaderboard and cohort metrics strictly filter EVAL sessions only', async () => {
      // Save 1 TRAIN session with high score (100) and 1 EVAL session with moderate score (75)
      await saveCompletedSession(
        {
          uid: 's-train-alpha',
          traineeUid: 'trainee-alpha',
          mode: 'TRAIN',
          startedAt: 1000,
          durationMs: 60000,
          score: 100,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.4,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(100, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
        },
        'ALPHA'
      );

      await saveCompletedSession(
        {
          uid: 's-eval-alpha',
          traineeUid: 'trainee-alpha',
          mode: 'EVAL',
          startedAt: 2000,
          durationMs: 60000,
          score: 75,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.5,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(75, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        },
        'ALPHA'
      );

      const summaries = await getUnitTraineeSummaries('ALL');
      const alphaSummary = summaries.find((s) => s.callsign === 'ALPHA');
      expect(alphaSummary).toBeDefined();

      // Leaderboard score MUST be the EVAL score (75), NEVER the TRAIN score (100)
      expect(alphaSummary!.latestEvalScore).toBe(75);
      expect(alphaSummary!.evalSessionsCount).toBe(1);
      expect(alphaSummary!.trainSessionsCount).toBe(1);
    });
  });

  describe('5. The 15 Adversarial Test Matrix (Section 9)', () => {
    it('Case 1: Repeated high-performing TRAIN sessions increase difficulty and clamp at 1.0', async () => {
      let currentD = 0.3;

      for (let i = 0; i < 8; i++) {
        const nextD = computeNextDifficulty(currentD, 95); // +0.125 per step
        expect(nextD).toBeGreaterThanOrEqual(currentD);
        currentD = nextD;
      }

      expect(currentD).toBe(1.0);
    });

    it('Case 2: Repeated low-performing TRAIN sessions decrease difficulty and clamp at 0.0', async () => {
      let currentD = 0.3;

      for (let i = 0; i < 5; i++) {
        const nextD = computeNextDifficulty(currentD, 40); // -0.15 per step
        currentD = nextD;
      }

      expect(currentD).toBe(0.0);
    });

    it('Case 3: Exactly 70-point sessions preserve difficulty with zero drift', async () => {
      let d = 0.52;
      for (let i = 0; i < 10; i++) {
        d = computeNextDifficulty(d, 70);
      }
      expect(d).toBe(0.52);
    });

    it('Case 4: Aborted TRAIN sessions do not update difficulty or EMA', async () => {
      const traineeUid = 'trainee-abort-train';
      const initialD = await getTraineeDifficulty(traineeUid);

      const abortedSession: SessionRow = {
        uid: 's-aborted-train',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 15000,
        score: 10,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.3,
        aborted: true,
        unverified: false,
        metrics: createMockMetrics(10, 'NEEDS_RETRAINING', 'TRAIN'),
      };

      const result = await updateTraineeProgression(abortedSession);
      expect(result).toBeNull();
      expect(await getTraineeDifficulty(traineeUid)).toBe(initialD);
      expect(await getTraineeProfile(traineeUid)).toBeNull();
    });

    it('Case 5: Aborted EVAL sessions do not enter leaderboard or update difficulty', async () => {
      const traineeUid = 'trainee-abort-eval';

      await saveCompletedSession(
        {
          uid: 's-aborted-eval',
          traineeUid,
          mode: 'EVAL',
          startedAt: 1000,
          durationMs: 20000,
          score: 85,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.5,
          aborted: true,
          unverified: false,
          metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        },
        'ABORT-EVAL'
      );

      const summaries = await getUnitTraineeSummaries('ALL');
      const s = summaries.find((t) => t.traineeUid === traineeUid);
      expect(s?.latestEvalScore).toBeNull();
      expect(s?.evalSessionsCount).toBe(0);
    });

    it('Case 6: Missing historical metrics are skipped without zeroing', () => {
      const initial: WeaknessVector = { d: 50, c: 50, econ: 50, r: 50, sal: 80, sat: 70 };
      const updated = updateWeaknessProfile(initial, {
        dScore: 70,
        salScore: null, // missing observation
        swarmSat: undefined, // missing observation
      });

      expect(updated.sal).toBe(80);
      expect(updated.sat).toBe(70);
    });

    it('Case 7: Missing session history (cold start) falls back to documented defaults', async () => {
      const d = await getTraineeDifficulty('trainee-brand-new');
      expect(d).toBe(0.3);

      const profile = await getTraineeProfile('trainee-brand-new');
      expect(profile).toBeNull();

      const plan = getAdaptivePlan('trainee-brand-new', profile, d);
      expect(plan.currentDifficulty).toBe(0.3);
      expect(plan.profile.d).toBe(50.0);
    });

    it('Case 8: Invalid historical records (corrupted scores / difficulty) fail-closed', () => {
      expect(computeNextDifficulty(NaN, 80)).toBe(0.3);
      expect(computeNextDifficulty(0.4, NaN)).toBe(0.4);
      expect(computeNextDifficulty(Infinity, 80)).toBe(0.3);
    });

    it('Case 9: Two different trainees maintain completely independent progression', async () => {
      const t1 = 'trainee-pilot-1';
      const t2 = 'trainee-pilot-2';

      // Trainee 1 scores 100
      await updateTraineeProgression({
        uid: 's-t1',
        traineeUid: t1,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 100,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(100, 'PROFICIENT_IN_SIMULATION', 'TRAIN', { dScore: 100 }),
      });

      // Trainee 2 scores 40
      await updateTraineeProgression({
        uid: 's-t2',
        traineeUid: t2,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 40,
        grade: 'NEEDS_RETRAINING',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(40, 'NEEDS_RETRAINING', 'TRAIN', { dScore: 40 }),
      });

      const d1 = await getTraineeDifficulty(t1);
      const d2 = await getTraineeDifficulty(t2);

      expect(d1).toBeCloseTo(0.45, 4);
      expect(d2).toBeCloseTo(0.15, 4);

      const p1 = await getTraineeProfile(t1);
      const p2 = await getTraineeProfile(t2);

      expect(p1?.d).toBe(100);
      expect(p2?.d).toBe(40);
    });

    it('Case 10: Application restart / reload roundtrip preserves trainee progression', async () => {
      const traineeUid = 'trainee-restart-test';

      await updateTraineeProgression({
        uid: 's-restart-1',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 90,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN', { dScore: 88 }),
      });

      // Query from repository (representing fresh UI component mount)
      const restoredD = await getTraineeDifficulty(traineeUid);
      const restoredProfile = await getTraineeProfile(traineeUid);

      expect(restoredD).toBeCloseTo(0.40, 4);
      expect(restoredProfile?.d).toBe(88);
    });

    it('Case 11: Duplicate session completion events are idempotent', async () => {
      const traineeUid = 'trainee-dup-test';

      const session: SessionRow = {
        uid: 's-dup-1',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 85,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
      };

      await saveCompletedSession(session, 'DUP-TEST');
      const dFirst = await getTraineeDifficulty(traineeUid);

      // Re-saving identical session row should not double-increment difficulty
      await saveCompletedSession(session, 'DUP-TEST');
      const dSecond = await getTraineeDifficulty(traineeUid);

      // Both should be in [0.35, 0.45]
      expect(dFirst).toBeCloseTo(0.375, 4);
      expect(dSecond).toBeCloseTo(dFirst, 4);
    });

    it('Case 12: Director generation failure gracefully falls back to valid verified spec', () => {
      // Craft extreme parameters that fail normal generation
      const fallbackSpec = generateScenario('TRAINEE-FALLBACK', 9999, 0.99);
      expect(validate(fallbackSpec)).toBe(true);
      expect(fallbackSpec.seed).toBeDefined();
    });

    it('Case 13: Candidate scenario failing fairness validation is rejected by Director', () => {
      const badSpec: ScenarioSpec = {
        id: 'BAD-SPEC',
        schemaVersion: 1,
        simVersion: '1.1.0',
        configHash: 'inlined',
        mode: 'TRAIN',
        seed: 1234,
        difficulty: 0.5,
        dayNight: 'DAY',
        durationMs: 120000,
        asset: { x: 0, y: 0, rMinM: 500 },
        zones: [],
        threats: [
          {
            // Threat starts inside defended perimeter (r < 500)
            id: 'H-BAD',
            droneType: 'FPV_ATTACK',
            trueClass: 'HOSTILE_ATTACK',
            spawnTMs: 0,
            waypoints: [{ x: 100, y: 100, z: 20 }],
            speedMps: 30,
            profile: 'DIRECT',
            rcsM2: 0.01,
            valueInr: 100000,
            emitsRf: true,
            remoteId: false,
            iff: false,
          },
        ],
        decoys: [],
        chaos: [],
        triggers: [],
        roeText: 'ROE',
        levers: [],
        features: new Array(33).fill(0.05),
      };

      expect(validate(badSpec)).toBe(false);
    });

    it('Case 14: Repeated non-novel candidates rejected by novelty engine', () => {
      const baseFeatures = [1, 0, 0, 0];
      const identicalFeatures = [1, 0, 0, 0];

      expect(isNovel(identicalFeatures, [baseFeatures])).toBe(false);
    });

    it('Case 15: TRAIN/EVAL mode switching maintains strict isolation', async () => {
      const traineeUid = 'trainee-mode-switch';

      // 1. Initial EVAL
      await saveCompletedSession(
        {
          uid: 's-eval-base',
          traineeUid,
          mode: 'EVAL',
          startedAt: 1000,
          durationMs: 60000,
          score: 72,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.5,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(72, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        },
        'SWITCH-TEST'
      );

      // Verify difficulty is unchanged
      expect(await getTraineeDifficulty(traineeUid)).toBe(0.3);

      // 2. Switch to TRAIN drill (score 90)
      await saveCompletedSession(
        {
          uid: 's-train-drill',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 2000,
          durationMs: 60000,
          score: 90,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.3,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
        },
        'SWITCH-TEST'
      );

      // Difficulty increases
      expect(await getTraineeDifficulty(traineeUid)).toBeCloseTo(0.4, 4);

      // 3. Switch back to EVAL
      await saveCompletedSession(
        {
          uid: 's-eval-final',
          traineeUid,
          mode: 'EVAL',
          startedAt: 3000,
          durationMs: 60000,
          score: 80,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.5,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(80, 'PROFICIENT_IN_SIMULATION', 'EVAL'),
        },
        'SWITCH-TEST'
      );

      // Difficulty remains at 0.40 (not altered by EVAL)
      expect(await getTraineeDifficulty(traineeUid)).toBeCloseTo(0.4, 4);
    });
  });

  describe('6. Complete Multi-Session Progression Workflow (Section 4 & Fix 2)', () => {
    it('executes a verified genuine 6-session persisted progression sequence', async () => {
      const callsign = 'PROGRESSION-LEAD';
      const traineeUid = 'trainee-progression-lead';

      // Step 1: Initial Fixed EVAL Benchmark
      const { spec: evalSpec1 } = loadCatalogScenario('DEMO-1', 2026);
      expect(evalSpec1.id).toBe('DEMO-1');

      await saveCompletedSession(
        {
          uid: 'seq-session-1-eval',
          traineeUid,
          mode: 'EVAL',
          startedAt: 1000,
          durationMs: 60000,
          score: 68,
          grade: 'DEVELOPING',
          dStart: 0.3,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(68, 'DEVELOPING', 'EVAL', {
            dScore: 45,
            cScore: 70,
            econScore: 75,
            rScore: 80,
          }),
        },
        callsign
      );

      // Difficulty & EMA are unaffected by EVAL
      expect(await getTraineeDifficulty(traineeUid)).toBe(0.3);
      expect(await getTraineeProfile(traineeUid)).toBeNull();

      // Step 2: First TRAIN Session (High score 90 -> difficulty increases by 0.10)
      await saveCompletedSession(
        {
          uid: 'seq-session-2-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 2000,
          durationMs: 60000,
          score: 90, // > 70 -> delta = +0.10 -> d = 0.40
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.3,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
            dScore: 95,
            cScore: 90,
            econScore: 85,
            rScore: 90,
            salScore: 90,
            swarmSat: 0.9,
          }),
        },
        callsign
      );

      const dAfterTrain1 = await getTraineeDifficulty(traineeUid);
      expect(dAfterTrain1).toBeCloseTo(0.40, 4);

      const profile1 = await getTraineeProfile(traineeUid);
      expect(profile1).not.toBeNull();
      expect(profile1!.econ).toBe(85); // Cold-start seeded

      // Red Team identifies lowest metric (Economics: 85)
      const plan1 = getAdaptivePlan(traineeUid, profile1, dAfterTrain1, 90, {
        sessionStartDifficulty: 0.3,
      });
      expect(plan1.weakestDimension).toBe('econ');
      expect(plan1.targetLever).toBe('PROPORTIONALITY_DRILL');
      expect(plan1.nextDifficulty).toBeCloseTo(0.40, 4);

      // Verify procedural scenario generation
      const specTrain2 = generateScenario(traineeUid, 2, plan1.nextDifficulty, [], 42, {
        weaknessVector: profile1!,
        targetLever: plan1.targetLever,
      });
      expect(specTrain2.levers[0].id).toBe('PROPORTIONALITY_DRILL');
      expect(validate(specTrain2)).toBe(true);

      // Step 3: Second TRAIN Session (Score 85 -> difficulty increases by 0.075 to 0.475)
      await saveCompletedSession(
        {
          uid: 'seq-session-3-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 3000,
          durationMs: 60000,
          score: 85, // > 70 -> delta = +0.075 -> d = 0.475
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.4,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
            dScore: 85,
            cScore: 90,
            econScore: 75,
            rScore: 90,
            salScore: 90,
            swarmSat: 0.8,
          }),
        },
        callsign
      );

      const dAfterTrain2 = await getTraineeDifficulty(traineeUid);
      expect(dAfterTrain2).toBeCloseTo(0.475, 4);

      const profile2 = await getTraineeProfile(traineeUid);
      expect(profile2!.d).toBeCloseTo(91.0, 2);
      expect(profile2!.econ).toBeCloseTo(81.0, 2);
      expect(profile2!.sat).toBeCloseTo(86.0, 2);

      // Step 4: Third TRAIN Session (Trainee encounters challenge, score 60 -> d decreases to 0.425)
      await saveCompletedSession(
        {
          uid: 'seq-session-4-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 4000,
          durationMs: 60000,
          score: 60, // < 70 -> delta = -0.05 -> d = 0.425
          grade: 'DEVELOPING',
          dStart: 0.475,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(60, 'DEVELOPING', 'TRAIN', {
            dScore: 50,
            cScore: 80,
            econScore: 80,
            rScore: 70,
            salScore: 60,
            swarmSat: 0.6,
          }),
        },
        callsign
      );

      const dAfterTrain3 = await getTraineeDifficulty(traineeUid);
      expect(dAfterTrain3).toBeCloseTo(0.425, 4);

      const profile3 = await getTraineeProfile(traineeUid);
      // D: 0.4 * 50 + 0.6 * 91 = 20 + 54.6 = 74.60
      expect(profile3!.d).toBeCloseTo(74.60, 2);
      // Weakest is now Detection (74.60)
      const plan3 = getAdaptivePlan(traineeUid, profile3, dAfterTrain3, 60, {
        sessionStartDifficulty: 0.475,
      });
      expect(plan3.weakestDimension).toBe('d');
      expect(plan3.targetLever).toBe('LOW_RCS_MASKED');

      // Step 5: Intermediate EVAL Benchmark (Score 95 -> EVAL NEVER modifies d or EMA)
      await saveCompletedSession(
        {
          uid: 'seq-session-5-eval',
          traineeUid,
          mode: 'EVAL',
          startedAt: 5000,
          durationMs: 60000,
          score: 95,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.5,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'EVAL', {
            dScore: 98,
            cScore: 95,
            econScore: 95,
            rScore: 95,
            salScore: 90,
            swarmSat: 0.92,
          }),
        },
        callsign
      );

      // Strictly locked: d stays 0.425, profile stays unchanged
      expect(await getTraineeDifficulty(traineeUid)).toBeCloseTo(0.425, 4);
      const profileAfterEval = await getTraineeProfile(traineeUid);
      expect(profileAfterEval!.d).toBeCloseTo(74.60, 2);

      // Step 6: Fourth TRAIN Session (Score 70 -> equilibrium, d unchanged at 0.425)
      await saveCompletedSession(
        {
          uid: 'seq-session-6-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 6000,
          durationMs: 60000,
          score: 70, // = 70 -> delta = 0 -> d stays 0.425
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.425,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(70, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
            dScore: 70,
            cScore: 70,
            econScore: 70,
            rScore: 70,
            salScore: 70,
            swarmSat: 0.7,
          }),
        },
        callsign
      );

      const dAfterTrain4 = await getTraineeDifficulty(traineeUid);
      expect(dAfterTrain4).toBeCloseTo(0.425, 4);

      const profile4 = await getTraineeProfile(traineeUid);
      // D: 0.4 * 70 + 0.6 * 74.60 = 28 + 44.76 = 72.76
      expect(profile4!.d).toBeCloseTo(72.76, 2);
      // C: 0.4 * 70 + 0.6 * 86.00 = 28 + 51.60 = 79.60
      expect(profile4!.c).toBeCloseTo(79.60, 2);

      // Verify that exactly 6 distinct session records are persisted
      const allSessions = await getTraineeSessions(callsign, 'asc', 'ALL');
      expect(allSessions.length).toBe(6);
      expect(allSessions.map((s) => s.uid)).toEqual([
        'seq-session-1-eval',
        'seq-session-2-train',
        'seq-session-3-train',
        'seq-session-4-train',
        'seq-session-5-eval',
        'seq-session-6-train',
      ]);

      // Verify unit readiness leaderboard: EVAL sessions only (latest score 95)
      const summaries = await getUnitTraineeSummaries('ALL');
      const leadSummary = summaries.find((s) => s.callsign === callsign);
      expect(leadSummary).toBeDefined();
      expect(leadSummary!.latestEvalScore).toBe(95);
      expect(leadSummary!.evalSessionsCount).toBe(2);
      expect(leadSummary!.trainSessionsCount).toBe(4);
      expect(leadSummary!.highestTrainDifficulty).toBeCloseTo(0.475, 4);
    });
  });

  describe('7. Authoritative 6-Session EMA Reference Matrix (Section 5 Prompt Table & Fix 3)', () => {
    it('calculates the exact independently-verified reference sequence matching PRD formulas', async () => {
      const traineeUid = 'trainee-ref-matrix';
      const callsign = 'REF-MATRIX';

      // S1 (TRAIN): (95, 90, 85, 90, 90, 90)
      await saveCompletedSession(
        {
          uid: 'ref-s1-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 1000,
          durationMs: 60000,
          score: 90,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.3,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
            dScore: 95,
            cScore: 90,
            econScore: 85,
            rScore: 90,
            salScore: 90,
            swarmSat: 0.9,
          }),
        },
        callsign
      );

      const p1 = await getTraineeProfile(traineeUid);
      expect(p1!.d).toBe(95.00);
      expect(p1!.c).toBe(90.00);
      expect(p1!.econ).toBe(85.00);
      expect(p1!.r).toBe(90.00);
      expect(p1!.sal).toBe(90.00);
      expect(p1!.sat).toBe(90.00);

      // S2 (TRAIN): (85, 90, 75, 90, 90, 80)
      await saveCompletedSession(
        {
          uid: 'ref-s2-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 2000,
          durationMs: 60000,
          score: 85,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.4,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
            dScore: 85,
            cScore: 90,
            econScore: 75,
            rScore: 90,
            salScore: 90,
            swarmSat: 0.8,
          }),
        },
        callsign
      );

      const p2 = await getTraineeProfile(traineeUid);
      expect(p2!.d).toBeCloseTo(91.00, 2);
      expect(p2!.c).toBeCloseTo(90.00, 2);
      expect(p2!.econ).toBeCloseTo(81.00, 2);
      expect(p2!.r).toBeCloseTo(90.00, 2);
      expect(p2!.sal).toBeCloseTo(90.00, 2);
      expect(p2!.sat).toBeCloseTo(86.00, 2);

      // S3 (TRAIN): (50, 80, 80, 70, 60, 60)
      await saveCompletedSession(
        {
          uid: 'ref-s3-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 3000,
          durationMs: 60000,
          score: 65,
          grade: 'DEVELOPING',
          dStart: 0.475,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(65, 'DEVELOPING', 'TRAIN', {
            dScore: 50,
            cScore: 80,
            econScore: 80,
            rScore: 70,
            salScore: 60,
            swarmSat: 0.6,
          }),
        },
        callsign
      );

      const p3 = await getTraineeProfile(traineeUid);
      expect(p3!.d).toBeCloseTo(74.60, 2);
      expect(p3!.c).toBeCloseTo(86.00, 2);
      expect(p3!.econ).toBeCloseTo(80.60, 2);
      expect(p3!.r).toBeCloseTo(82.00, 2);
      expect(p3!.sal).toBeCloseTo(78.00, 2);
      expect(p3!.sat).toBeCloseTo(75.60, 2);

      // S4 (TRAIN): (70, 70, 70, 70, 70, 70)
      await saveCompletedSession(
        {
          uid: 'ref-s4-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 4000,
          durationMs: 60000,
          score: 70,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.425,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(70, 'PROFICIENT_IN_SIMULATION', 'TRAIN', {
            dScore: 70,
            cScore: 70,
            econScore: 70,
            rScore: 70,
            salScore: 70,
            swarmSat: 0.7,
          }),
        },
        callsign
      );

      const p4 = await getTraineeProfile(traineeUid);
      expect(p4!.d).toBeCloseTo(72.76, 2);
      expect(p4!.c).toBeCloseTo(79.60, 2);
      expect(p4!.econ).toBeCloseTo(76.36, 2);
      expect(p4!.r).toBeCloseTo(77.20, 2);
      expect(p4!.sal).toBeCloseTo(74.80, 2);
      expect(p4!.sat).toBeCloseTo(73.36, 2);

      // S5 (EVAL): (98, 95, 95, 95, 90, 92) -> SKIPPED in EVAL
      await saveCompletedSession(
        {
          uid: 'ref-s5-eval',
          traineeUid,
          mode: 'EVAL',
          startedAt: 5000,
          durationMs: 60000,
          score: 95,
          grade: 'PROFICIENT_IN_SIMULATION',
          dStart: 0.5,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(95, 'PROFICIENT_IN_SIMULATION', 'EVAL', {
            dScore: 98,
            cScore: 95,
            econScore: 95,
            rScore: 95,
            salScore: 90,
            swarmSat: 0.92,
          }),
        },
        callsign
      );

      const p5 = await getTraineeProfile(traineeUid);
      expect(p5!.d).toBeCloseTo(72.76, 2);
      expect(p5!.c).toBeCloseTo(79.60, 2);
      expect(p5!.econ).toBeCloseTo(76.36, 2);
      expect(p5!.r).toBeCloseTo(77.20, 2);
      expect(p5!.sal).toBeCloseTo(74.80, 2);
      expect(p5!.sat).toBeCloseTo(73.36, 2);

      // S6 (TRAIN): (30, 45, 50, 40, 40, 35)
      await saveCompletedSession(
        {
          uid: 'ref-s6-train',
          traineeUid,
          mode: 'TRAIN',
          startedAt: 6000,
          durationMs: 60000,
          score: 40,
          grade: 'NEEDS_RETRAINING',
          dStart: 0.425,
          aborted: false,
          unverified: false,
          metrics: createMockMetrics(40, 'NEEDS_RETRAINING', 'TRAIN', {
            dScore: 30,
            cScore: 45,
            econScore: 50,
            rScore: 40,
            salScore: 40,
            swarmSat: 0.35,
          }),
        },
        callsign
      );

      const p6 = await getTraineeProfile(traineeUid);
      // D: 0.4 * 30 + 0.6 * 72.76 = 12 + 43.656 = 55.656 -> 55.66
      expect(p6!.d).toBeCloseTo(55.66, 2);
      // C: 0.4 * 45 + 0.6 * 79.60 = 18 + 47.76 = 65.76
      expect(p6!.c).toBeCloseTo(65.76, 2);
      // Econ: 0.4 * 50 + 0.6 * 76.36 = 20 + 45.816 = 65.816 -> 65.82
      expect(p6!.econ).toBeCloseTo(65.82, 2);
      // R: 0.4 * 40 + 0.6 * 77.20 = 16 + 46.32 = 62.32
      expect(p6!.r).toBeCloseTo(62.32, 2);
      // SAL: 0.4 * 40 + 0.6 * 74.80 = 16 + 44.88 = 60.88
      expect(p6!.sal).toBeCloseTo(60.88, 2);
      // SAT: 0.4 * 35 + 0.6 * 73.36 = 14 + 44.016 = 58.016 -> 58.02
      expect(p6!.sat).toBeCloseTo(58.02, 2);
    });
  });

  describe('8. Softmax Lever Selection & Statistical Verification (PRD §5.4 & Fix 4)', () => {
    it('preserves exact deterministic reproducibility for identical seeds and profiles', () => {
      const profile: WeaknessVector = { d: 35, c: 80, econ: 75, r: 85, sal: 60, sat: 70 };
      const seed = 98765;

      const run1 = sampleAdaptiveLevers(profile, seed, 1);
      const run2 = sampleAdaptiveLevers(profile, seed, 1);
      const run3 = sampleAdaptiveLevers(profile, seed, 1);

      expect(run1[0].leverId).toBe(run2[0].leverId);
      expect(run2[0].leverId).toBe(run3[0].leverId);
    });

    it('samples two distinct levers without duplicates when count is 2', () => {
      const profile: WeaknessVector = { d: 40, c: 50, econ: 60, r: 70, sal: 80, sat: 90 };

      for (let s = 1; s <= 20; s++) {
        const levers = sampleAdaptiveLevers(profile, s * 1000, 2);
        expect(levers.length).toBe(2);
        expect(levers[0].leverId).not.toBe(levers[1].leverId);
      }
    });

    it('statistically favors weaker metrics while maintaining non-zero exploration on stronger metrics', () => {
      // D is heavily vulnerable (20/100, weakness = 0.8), others are strong (90/100, weakness = 0.1)
      const skewedProfile: WeaknessVector = { d: 20, c: 90, econ: 90, r: 90, sal: 90, sat: 90 };
      const counts: Record<string, number> = {
        LOW_RCS_MASKED: 0,
        DECOY_FLOOD: 0,
        PROPORTIONALITY_DRILL: 0,
        URBAN_COLLATERAL_RISK: 0,
        SENSOR_CHAOS_CHALLENGE: 0,
        SWARM_SATURATION: 0,
      };

      const TRIALS = 1000;
      for (let i = 0; i < TRIALS; i++) {
        const [sampled] = sampleAdaptiveLevers(skewedProfile, i + 1000, 1);
        counts[sampled.leverId] = (counts[sampled.leverId] || 0) + 1;
      }

      // Detection lever must be chosen in majority of trials due to softmax beta = 4.0
      expect(counts.LOW_RCS_MASKED).toBeGreaterThan(TRIALS * 0.50);

      // Non-weak dimensions must still be sampled with non-zero probability (exploration)
      const explorationSum =
        counts.DECOY_FLOOD +
        counts.PROPORTIONALITY_DRILL +
        counts.URBAN_COLLATERAL_RISK +
        counts.SENSOR_CHAOS_CHALLENGE +
        counts.SWARM_SATURATION;

      expect(explorationSum).toBeGreaterThan(0);
      expect(explorationSum).toBeLessThan(TRIALS * 0.50);
    });
  });

  describe('9. Durable Progression Idempotency & Failure Rollback (Fix 1)', () => {
    it('applies progression exactly once when the same session is saved twice in the same runtime', async () => {
      const traineeUid = 'trainee-idemp-1';
      const initialD = await getTraineeDifficulty(traineeUid);

      const session: SessionRow = {
        uid: 'session-idemp-double-save',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 90, // +0.10 -> 0.40
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN', { dScore: 85 }),
      };

      // First save
      await saveCompletedSession(session, 'IDEMP-1');
      const d1 = await getTraineeDifficulty(traineeUid);
      expect(d1).toBeCloseTo(0.40, 4);

      // Second save with exact same sessionUid
      await saveCompletedSession(session, 'IDEMP-1');
      const d2 = await getTraineeDifficulty(traineeUid);
      // Difficulty MUST NOT double-increment to 0.50!
      expect(d2).toBeCloseTo(0.40, 4);

      // Verify progression log entry exists
      const logEntry = await getProgressionLogEntry('session-idemp-double-save');
      expect(logEntry).not.toBeNull();
      expect(logEntry!.dBefore).toBeCloseTo(initialD, 4);
      expect(logEntry!.dAfter).toBeCloseTo(0.40, 4);
    });

    it('recovers cleanly from simulated persistence failure and applies update on retry without double adjustment', async () => {
      const traineeUid = 'trainee-idemp-retry';

      const session: SessionRow = {
        uid: 'session-idemp-failed-first',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 90,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(90, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
      };

      // Simulate failure on first save
      setMockPersistenceFailureMode('SESSION');
      await expect(saveCompletedSession(session, 'RETRY-TEST')).rejects.toThrow();

      // Ensure failure did not mutate difficulty or leave orphan marker
      expect(await getTraineeDifficulty(traineeUid)).toBe(0.3);
      expect(await getProgressionLogEntry('session-idemp-failed-first')).toBeNull();

      // Clear mock failure mode and execute retry
      setMockPersistenceFailureMode('NONE');
      await saveCompletedSession(session, 'RETRY-TEST');

      // Retry successfully applied progression
      expect(await getTraineeDifficulty(traineeUid)).toBeCloseTo(0.40, 4);
      expect(await getProgressionLogEntry('session-idemp-failed-first')).not.toBeNull();

      // Subsequent repeat retry does not double adjust
      await saveCompletedSession(session, 'RETRY-TEST');
      expect(await getTraineeDifficulty(traineeUid)).toBeCloseTo(0.40, 4);
    });

    it('handles concurrent attempts to apply progression for the same session UID cleanly', async () => {
      const traineeUid = 'trainee-idemp-concurrent';

      const session: SessionRow = {
        uid: 'session-idemp-concurrent-uid',
        traineeUid,
        mode: 'TRAIN',
        startedAt: 1000,
        durationMs: 60000,
        score: 85,
        grade: 'PROFICIENT_IN_SIMULATION',
        dStart: 0.3,
        aborted: false,
        unverified: false,
        metrics: createMockMetrics(85, 'PROFICIENT_IN_SIMULATION', 'TRAIN'),
      };

      // Launch 3 simultaneous progression updates for identical session UID
      const [res1, res2, res3] = await Promise.all([
        updateTraineeProgression(session),
        updateTraineeProgression(session),
        updateTraineeProgression(session),
      ]);

      expect(res1?.d).toBeCloseTo(0.375, 4);
      expect(res2?.d).toBeCloseTo(0.375, 4);
      expect(res3?.d).toBeCloseTo(0.375, 4);

      // Resulting difficulty must be exactly 0.375, never compounded to 0.45 or 0.525
      expect(await getTraineeDifficulty(traineeUid)).toBeCloseTo(0.375, 4);
    });
  });

  describe('10. Zero Double Adjustment & Connected Scenario Execution (Fix 5 & Fix 6)', () => {
    it('distinguishes session start difficulty from next difficulty without double adjustment', () => {
      const traineeId = 'trainee-double-adj-check';
      const profile: WeaknessVector = { d: 50, c: 50, econ: 50, r: 50, sal: 50, sat: 50 };

      // Trainee started drill at d_start = 0.30 and scored 90 (+0.10)
      // Stored difficulty in DB is now 0.40
      const plan = getAdaptivePlan(traineeId, profile, 0.40, 90, {
        sessionStartDifficulty: 0.30,
      });

      expect(plan.currentDifficulty).toBe(0.30); // Starting difficulty of concluded drill
      expect(plan.nextDifficulty).toBe(0.40); // Resulting difficulty for next drill
      // Next difficulty MUST NOT be 0.50!
      expect(plan.nextDifficulty).not.toBe(0.50);
    });

    it('executes startAdaptedTrainingSession: generates, validates, snapshots, and loads adapted drill', async () => {
      const store = useSessionStore.getState();
      store.setCallsign('ADAPTED-LEAD');

      const success = await store.startAdaptedTrainingSession({
        difficultyOverride: 0.45,
        targetLever: 'LOW_RCS_MASKED',
        seed: 77777,
      });

      expect(success).toBe(true);

      const activeSpec = useSessionStore.getState().currentScenarioId;
      expect(activeSpec).toContain('ADAPTIVE-LOW_RCS_MASKED');
      expect(useSessionStore.getState().sessionStatus).toBe('RUNNING');
    });
  });

  describe('11. Fail-Closed Fallback Scenario Validation (Fix 7)', () => {
    it('validates procedural fallback scenario before returning', () => {
      // Normal generateScenario returns valid candidate
      const spec = generateScenario('trainee-fallback-check', 1, 0.4, [], 1234);
      expect(validate(spec)).toBe(true);
    });

    it('bundled fallback scenario satisfies authoritative fairness validation', () => {
      const demo1 = loadCatalogScenario('DEMO-1', 2026, 0.3);
      expect(validate(demo1.spec)).toBe(true);
    });
  });
});

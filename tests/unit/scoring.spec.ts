import { describe, it, expect } from 'vitest';
import {
  computeDScore,
  computeCScore,
  computeEconScore,
  computeGScore,
  computeRScore,
  computeTrackScore,
  computeSessionScore,
  getGrade,
} from '@/sim/scoring';

describe('Scoring Mathematics & Boundary Verification', () => {
  describe('D Score (Detection Speed)', () => {
    it('gives 100 when designated immediately at tTrk', () => {
      const d = computeDScore(1000, 1000, 10000);
      expect(d).toBe(100);
    });

    it('gives 50 when designated at halfway of T_budget', () => {
      // tTrk = 1000, tPnr = 5000 -> T_budget = 4000. Designated at 3000 (elapsed = 2000 = 50% budget)
      const d = computeDScore(1000, 3000, 5000);
      expect(d).toBe(50);
    });

    it('gives 0 when never designated or designated past PNR', () => {
      expect(computeDScore(null, null, 5000)).toBe(0);
      expect(computeDScore(1000, 6000, 5000)).toBe(0);
    });
  });

  describe('C Score (Classification Accuracy)', () => {
    it('scores 100 for correct diagonal (Hostile Attack labelled Hostile Attack)', () => {
      expect(computeCScore('HOSTILE_ATTACK', 'HOSTILE_ATTACK')).toBe(100);
      expect(computeCScore('CIVIL_UAS', 'CIVIL_UAS')).toBe(100);
    });

    it('scores 60 for intra-hostile confusion (Hostile Attack labelled Hostile ISR)', () => {
      expect(computeCScore('HOSTILE_ATTACK', 'HOSTILE_ISR')).toBe(60);
      expect(computeCScore('HOSTILE_ISR', 'SWARM_ELEMENT')).toBe(60);
    });

    it('scores 0 for hostile misclassified as civilian/bird/friendly (critical miss)', () => {
      expect(computeCScore('HOSTILE_ATTACK', 'CIVIL_UAS')).toBe(0);
      expect(computeCScore('HOSTILE_ATTACK', 'BIRD')).toBe(0);
      expect(computeCScore('HOSTILE_ATTACK', 'FRIENDLY')).toBe(0);
    });

    it('scores 25 for hostile explicitly labelled UNKNOWN_EVIDENCE_INSUFFICIENT', () => {
      expect(computeCScore('HOSTILE_ATTACK', 'UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe(25);
    });
  });

  describe('E_econ & Cost Exchange Ratio (CER) - AC-5 Verification', () => {
    it('CER = 1.0 yields Econ score 100', () => {
      const { econScore, isUnfavourable } = computeEconScore(1.0);
      expect(econScore).toBe(100);
      expect(isUnfavourable).toBe(false);
    });

    it('CER = 10 yields Econ score 60', () => {
      // 100 - 40 * log10(10) = 100 - 40 = 60
      const { econScore, isUnfavourable } = computeEconScore(10);
      expect(econScore).toBeCloseTo(60, 1);
      expect(isUnfavourable).toBe(false);
    });

    it('Missile (₹30L) on Recon Quad (₹40k) has CER 75 -> Econ score 25 and UNFAVOURABLE flag (AC-5)', () => {
      // CER = 3000000 / 40000 = 75
      // log10(75) = 1.87506
      // 100 - 40 * 1.87506 = 100 - 75.002 = 24.998 ~ 25
      const cer = 3000000 / 40000;
      expect(cer).toBe(75);

      const { econScore, isUnfavourable } = computeEconScore(cer);
      expect(econScore).toBeCloseTo(25, 0);
      expect(isUnfavourable).toBe(true);
    });

    it('Missile (₹30L) on FPV (₹1L) has CER 30 -> Econ score approx 41 and UNFAVOURABLE flag (AC-5)', () => {
      // CER = 3000000 / 100000 = 30
      // log10(30) = 1.47712
      // 100 - 40 * 1.47712 = 100 - 59.08 = 40.91 ~ 41
      const cer = 3000000 / 100000;
      expect(cer).toBe(30);

      const { econScore, isUnfavourable } = computeEconScore(cer);
      expect(econScore).toBeCloseTo(41, 0);
      expect(isUnfavourable).toBe(true);
    });
  });

  describe('G Score & ROE Overlap Caps', () => {
    it('kinetic release over dense urban zone caps G score at 40', () => {
      const g = computeGScore({
        isHostile: true,
        neutralisedBeforePnr: true,
        engaged: true,
        econScore: 100,
        timeScore: 100,
        kineticOverDenseZone: true,
      });
      expect(g).toBe(40);
    });

    it('firing on unclassified target caps G score at 40 (Rules.md SC-9)', () => {
      const g = computeGScore({
        isHostile: true,
        neutralisedBeforePnr: true,
        engaged: true,
        econScore: 100,
        timeScore: 100,
        kineticOverDenseZone: false,
        unclassifiedFired: true,
      });
      expect(g).toBe(40);
    });

    it('non-hostile correctly left alone scores 100', () => {
      const g = computeGScore({
        isHostile: false,
        neutralisedBeforePnr: false,
        engaged: false,
        econScore: 100,
        timeScore: 100,
        kineticOverDenseZone: false,
      });
      expect(g).toBe(100);
    });

    it('non-hostile engaged scores 0', () => {
      const g = computeGScore({
        isHostile: false,
        neutralisedBeforePnr: false,
        engaged: true,
        econScore: 100,
        timeScore: 100,
        kineticOverDenseZone: false,
      });
      expect(g).toBe(0);
    });
  });

  describe('R Score (ROE & Collateral)', () => {
    it('kinetic fire inside zone with debris overlap penalizes score', () => {
      // Gun (we = 0.6) inside zone with rho = 0.8: deduction = 100 * 0.6 * 0.8 = 48 -> R = 52
      const r = computeRScore({
        effectorId: 'GUN',
        rhoZone: 0.8,
        isInsideZoneOverlap: true,
        civilEngaged: false,
        friendlyEngaged: false,
        unclassifiedFired: false,
      });
      expect(r).toBeCloseTo(52, 1);
    });

    it('firing on unclassified target deducts 20 points', () => {
      const r = computeRScore({
        effectorId: 'RF_SOFTKILL',
        rhoZone: 0,
        isInsideZoneOverlap: false,
        civilEngaged: false,
        friendlyEngaged: false,
        unclassifiedFired: true,
      });
      expect(r).toBe(80);
    });
  });

  describe('Track Score Clamping & Grade Derivation', () => {
    it('track score never goes below 0 even with severe penalties', () => {
      const s = computeTrackScore({
        isHostile: true,
        d: -50,
        c: 0,
        g: -100,
        r: -200,
      });
      expect(s).toBe(0);
      expect(s).toBeGreaterThanOrEqual(0);
    });

    it('grades map strictly to 3 canonical levels', () => {
      expect(getGrade(85)).toBe('PROFICIENT_IN_SIMULATION');
      expect(getGrade(70)).toBe('PROFICIENT_IN_SIMULATION');
      expect(getGrade(69.9)).toBe('DEVELOPING');
      expect(getGrade(50)).toBe('DEVELOPING');
      expect(getGrade(49.9)).toBe('NEEDS_RETRAINING');
      expect(getGrade(0)).toBe('NEEDS_RETRAINING');
    });
  });

  describe('Session Score Aggregation (Rules.md SC-3)', () => {
    it('calculates weighted score across hostile and decoy tracks', () => {
      // 1 Hostile Attack (weight 1.0, score 100) and 1 Decoy Civil UAS (weight 0.3, score 100)
      const score = computeSessionScore({
        trackScores: [
          { trackScore: 100, trueClass: 'HOSTILE_ATTACK' },
          { trackScore: 100, trueClass: 'CIVIL_UAS' },
        ],
        leakersCount: 0,
        criticalEventsCount: 0,
      });
      expect(score).toBe(100);
    });

    it('penalizes leakers by 20 points per leaker', () => {
      const score = computeSessionScore({
        trackScores: [
          { trackScore: 100, trueClass: 'HOSTILE_ATTACK' },
        ],
        leakersCount: 1,
        criticalEventsCount: 0,
      });
      expect(score).toBe(80);
    });

    it('penalizes critical events (civilian/friendly engaged) by 25 points', () => {
      const score = computeSessionScore({
        trackScores: [
          { trackScore: 100, trueClass: 'HOSTILE_ATTACK' },
        ],
        leakersCount: 0,
        criticalEventsCount: 1,
      });
      expect(score).toBe(75);
    });

    it('clamps session score strictly between 0 and 100', () => {
      const score = computeSessionScore({
        trackScores: [
          { trackScore: 20, trueClass: 'HOSTILE_ATTACK' },
        ],
        leakersCount: 3, // -60
        criticalEventsCount: 2, // -50
      });
      // 20 - 60 - 50 = -90 -> clamped to 0
      expect(score).toBe(0);
    });
  });
});

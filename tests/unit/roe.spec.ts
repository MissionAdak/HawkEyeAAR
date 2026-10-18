import { describe, it, expect } from 'vitest';
import {
  canTransition,
  evaluateReleaseGating,
  isPointInsideZoneExpanded,
  pointToSegmentDistance,
} from '@/sim/roe';
import type { F2T2EAStep, TrackEntity, ZoneSpec } from '@/sim/types';

describe('Rules of Engagement & F2T2EA State Machine (TASK-P2-01, TASK-P2-04)', () => {
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
    rho: 0.8, // Dense urban zone (rho > 0.5)
  };

  const createDummyEntity = (overrides: Partial<TrackEntity> = {}): TrackEntity => ({
    id: 'H-1',
    trackNo: 'T-01',
    trueClass: 'HOSTILE_ATTACK',
    droneType: 'FPV_ATTACK',
    pos: { x: 800, y: 0, z: 20 },
    prev: { x: 800, y: 0, z: 20 },
    vel: { x: -40, y: 0, z: 0 },
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
    q: 0.8,
    cCls: 0.9,
    masked: false,
    coastingSinceMs: null,
    ghostSigmaM: 0,
    hitHistory: [true, true, true],
    tVis: 0,
    tTrk: 0,
    tDesig: 500,
    tCls: 1000,
    tEng: null,
    tPnr: null,
    engagements: 0,
    weaponUsed: null,
    ...overrides,
  });

  describe('F2T2EA Transition Guards', () => {
    it('allows legal forward progression: FIND -> FIX -> TRACK -> TARGET -> ENGAGE -> ASSESS -> CLOSED', () => {
      // 1. FIND -> FIX when designated
      expect(
        canTransition('FIND', 'FIX', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: false,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(true);

      // 2. FIX -> TRACK when q >= Q_min
      expect(
        canTransition('FIX', 'TRACK', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: false,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(true);

      // 3. TRACK -> TARGET when classified with non-unknown label
      expect(
        canTransition('TRACK', 'TARGET', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(true);

      // 4. TARGET -> ENGAGE when q >= Q_min
      expect(
        canTransition('TARGET', 'ENGAGE', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(true);

      // 5. ENGAGE -> ASSESS
      expect(
        canTransition('ENGAGE', 'ASSESS', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: true,
          isLeaked: false,
        })
      ).toBe(true);

      // 6. ASSESS -> CLOSED on confirm kill
      expect(
        canTransition('ASSESS', 'CLOSED', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: true,
          isLeaked: false,
          assessResult: 'KILL',
        })
      ).toBe(true);
    });

    it('returns alive target from ASSESS back to TARGET on NO_KILL', () => {
      expect(
        canTransition('ASSESS', 'TARGET', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
          assessResult: 'NO_KILL',
        })
      ).toBe(true);
    });

    it('demotes tracked entity to FIX whenever q < Q_min (Rules.md R-14, SC-10)', () => {
      // q < 0.6 always allows returning to FIX
      expect(
        canTransition('TRACK', 'FIX', {
          q: 0.5,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(true);

      expect(
        canTransition('TARGET', 'FIX', {
          q: 0.4,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(true);

      // Weapons release and TARGET advance are blocked when q < Q_min
      expect(
        canTransition('FIX', 'TARGET', {
          q: 0.5,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(false);

      expect(
        canTransition('TARGET', 'ENGAGE', {
          q: 0.5,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(false);
    });

    it('rejects illegal step jumps (e.g. UNDETECTED -> ENGAGE, FIND -> TARGET)', () => {
      expect(
        canTransition('UNDETECTED', 'ENGAGE', {
          q: 0.8,
          isDesignated: false,
          hasNonUnknownLabel: false,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(false);

      expect(
        canTransition('FIND', 'TARGET', {
          q: 0.8,
          isDesignated: false,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(false);

      expect(
        canTransition('CLOSED', 'TRACK', {
          q: 0.8,
          isDesignated: true,
          hasNonUnknownLabel: true,
          isNeutralised: false,
          isLeaked: false,
        })
      ).toBe(false);
    });

    it('property test: random sequence of transitions never enters an illegal state', () => {
      const allSteps: F2T2EAStep[] = [
        'UNDETECTED',
        'FIND',
        'FIX',
        'TRACK',
        'TARGET',
        'ENGAGE',
        'ASSESS',
        'CLOSED',
      ];

      for (const from of allSteps) {
        for (const to of allSteps) {
          // If neither condition is fulfilled, random illegal steps must be false
          const result = canTransition(from, to, {
            q: 0.0,
            isDesignated: false,
            hasNonUnknownLabel: false,
            isNeutralised: false,
            isLeaked: false,
          });

          if (from === 'CLOSED') {
            expect(result).toBe(false);
          }
          if (from === 'UNDETECTED' && to !== 'FIND') {
            expect(result).toBe(false);
          }
        }
      }
    });
  });

  describe('Debris Radius Polygon Expansion & Collateral Math', () => {
    it('calculates point to line segment distance accurately', () => {
      // Segment from (0, 0) to (10, 0). Point at (5, 5) -> dist = 5
      expect(pointToSegmentDistance(5, 5, 0, 0, 10, 0)).toBeCloseTo(5, 4);

      // Point past segment endpoint at (15, 0) -> dist to (10, 0) = 5
      expect(pointToSegmentDistance(15, 0, 0, 0, 10, 0)).toBeCloseTo(5, 4);
    });

    it('determines point is inside zone expanded by debris radius', () => {
      // testUrbanZone: X in [1000, 2000], Y in [1000, 2000]
      // Directly inside
      expect(isPointInsideZoneExpanded(1500, 1500, testUrbanZone, 0)).toBe(true);

      // Outside by 50m at (950, 1500). With 0 debris radius: false
      expect(isPointInsideZoneExpanded(950, 1500, testUrbanZone, 0)).toBe(false);

      // Outside by 50m at (950, 1500). With Gun debris radius (150m): true!
      expect(isPointInsideZoneExpanded(950, 1500, testUrbanZone, 150)).toBe(true);

      // Outside by 200m at (800, 1500). With Gun debris radius (150m): false!
      expect(isPointInsideZoneExpanded(800, 1500, testUrbanZone, 150)).toBe(false);

      // Outside by 200m at (800, 1500). With Missile debris radius (400m): true!
      expect(isPointInsideZoneExpanded(800, 1500, testUrbanZone, 400)).toBe(true);
    });
  });

  describe('Weapon Release Gating: Hard Blocks vs Soft Gates (SC-10)', () => {
    it('hard-blocks release when track quality q < Q_min (0.6)', () => {
      const target = createDummyEntity({ q: 0.5 });
      const gating = evaluateReleaseGating({
        target,
        effectorId: 'RF_SOFTKILL',
        rangeM: 800,
        zones: [testUrbanZone],
      });

      expect(gating.canFire).toBe(false);
      expect(gating.isHardBlocked).toBe(true);
      expect(gating.hardBlockReason).toBe('Q_MIN_VIOLATION');
      expect(gating.roeGate.qOk).toBe(false);
    });

    it('hard-blocks release when target is outside effector range envelope', () => {
      // RF_SOFTKILL envelope is [200, 2000]. Target at 2500m
      const target = createDummyEntity({ q: 0.8 });
      const gating = evaluateReleaseGating({
        target,
        effectorId: 'RF_SOFTKILL',
        rangeM: 2500,
        zones: [testUrbanZone],
      });

      expect(gating.canFire).toBe(false);
      expect(gating.isHardBlocked).toBe(true);
      expect(gating.hardBlockReason).toBe('OUT_OF_ENVELOPE');
    });

    it('hard-blocks RF_SOFTKILL when Jamming chaos is active or target is RF-silent', () => {
      const targetEmitting = createDummyEntity({ q: 0.8, emitsRf: true });
      const gatingJam = evaluateReleaseGating({
        target: targetEmitting,
        effectorId: 'RF_SOFTKILL',
        rangeM: 800,
        zones: [testUrbanZone],
        isJammingActive: true,
      });
      expect(gatingJam.canFire).toBe(false);
      expect(gatingJam.hardBlockReason).toBe('RF_JAMMING_ACTIVE');

      const targetSilent = createDummyEntity({ q: 0.8, emitsRf: false });
      const gatingSilent = evaluateReleaseGating({
        target: targetSilent,
        effectorId: 'RF_SOFTKILL',
        rangeM: 800,
        zones: [testUrbanZone],
        isJammingActive: false,
      });
      expect(gatingSilent.canFire).toBe(false);
      expect(gatingSilent.hardBlockReason).toBe('RF_SILENT_TARGET');
    });

    it('permits release on unclassified target but records ROE violation (SC-9, SC-10)', () => {
      const unclassifiedTarget = createDummyEntity({
        q: 0.8,
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
      });

      const gating = evaluateReleaseGating({
        target: unclassifiedTarget,
        effectorId: 'RF_SOFTKILL',
        rangeM: 800,
        zones: [testUrbanZone],
      });

      expect(gating.canFire).toBe(true);
      expect(gating.isHardBlocked).toBe(false);
      expect(gating.roeGate.classifiedOk).toBe(false);
      expect(gating.violations).toContain('UNCLASSIFIED_RELEASE');
    });

    it('permits kinetic fire over dense urban zone but records violation and flags kineticOverDenseZone', () => {
      // Target at (1500, 1500) directly inside testUrbanZone (rho = 0.8 > 0.5)
      const targetOverUrban = createDummyEntity({
        pos: { x: 1500, y: 1500, z: 20 },
        q: 0.8,
        traineeLabel: 'HOSTILE_ATTACK',
      });

      const gating = evaluateReleaseGating({
        target: targetOverUrban,
        effectorId: 'GUN', // Kinetic: we = 0.6 >= 0.3
        rangeM: 1000,
        zones: [testUrbanZone],
      });

      expect(gating.canFire).toBe(true);
      expect(gating.isHardBlocked).toBe(false);
      expect(gating.roeGate.zoneOk).toBe(false);
      expect(gating.isKineticOverDenseZone).toBe(true);
      expect(gating.violations).toContain('KINETIC_OVER_DENSE_ZONE');
    });

    it('does not flag zone violation for non-kinetic laser over urban zone', () => {
      const targetOverUrban = createDummyEntity({
        pos: { x: 1500, y: 1500, z: 20 },
        q: 0.8,
        traineeLabel: 'HOSTILE_ATTACK',
      });

      const gating = evaluateReleaseGating({
        target: targetOverUrban,
        effectorId: 'LASER', // we = 0.1 < 0.3
        rangeM: 1000,
        zones: [testUrbanZone],
      });

      expect(gating.canFire).toBe(true);
      expect(gating.isKineticOverDenseZone).toBe(false);
      expect(gating.violations).not.toContain('KINETIC_OVER_DENSE_ZONE');
    });
  });
});

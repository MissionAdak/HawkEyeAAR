import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  evaluateDecisionLuck,
  extractEngagementInspectionData,
} from '@/ui/aar/engagementInspectorData';
import { AarEngagementInspector } from '@/ui/aar/AarEngagementInspector';
import { resolveEngagement } from '@/sim/effectors';
import type { SimEvent, TrackEntity, ScenarioSpec } from '@/sim/types';
import demo1Json from '@/director/bundled/demo1.json';

describe('AAR Engagement Inspector (TASK-F8)', () => {
  const dummyTarget: TrackEntity = {
    id: 'T1',
    trackNo: 'T-01',
    droneType: 'FPV_ATTACK',
    trueClass: 'HOSTILE_ATTACK',
    traineeLabel: 'HOSTILE_ATTACK',
    spawnTMs: 1000,
    pos: { x: 900, y: 0, z: 50 },
    prev: { x: 910, y: 0, z: 50 },
    vel: { x: -10, y: 0, z: 0 },
    rcsM2: 0.05,
    valueInr: 50000,
    emitsRf: true,
    remoteId: false,
    iff: false,
    profile: 'DIRECT',
    hitHistory: [true, true],
    step: 'ENGAGE',
    q: 0.9,
    cCls: 0.9,
    masked: false,
    coastingSinceMs: null,
    ghostSigmaM: 0,
    tVis: 1000,
    tTrk: 3000,
    tDesig: null,
    tCls: null,
    tEng: 5000,
    tPnr: null,
    engagements: 1,
    weaponUsed: 'GUN',
    lifecycle: 'ACTIVE',
  };

  describe('1. Decision vs. Luck Teaching Heuristic Thresholds', () => {
    it('evaluates LUCKY HIT when target is killed with Pk < 0.40', () => {
      const luck = evaluateDecisionLuck(true, 0.35, 0.20);
      expect(luck.category).toBe('LUCKY_HIT');
      expect(luck.title).toBe('LUCKY HIT');
      expect(luck.badgeClass).toContain('border-amber');
      expect(luck.description).toContain('Teaching Heuristic');
      expect(luck.comparisonText).toContain('u = 0.2000 ≤ Pk 0.3500 → HIT');
    });

    it('evaluates AS EXPECTED when target is killed at boundary Pk = 0.40', () => {
      const luck = evaluateDecisionLuck(true, 0.40, 0.30);
      expect(luck.category).toBe('AS_EXPECTED');
      expect(luck.title).toBe('AS EXPECTED');
      expect(luck.badgeClass).toContain('border-phosphor');
    });

    it('evaluates UNLUCKY MISS when target survives with Pk >= 0.70', () => {
      const luck = evaluateDecisionLuck(false, 0.85, 0.92);
      expect(luck.category).toBe('UNLUCKY_MISS');
      expect(luck.title).toBe('UNLUCKY MISS');
      expect(luck.badgeClass).toContain('border-threat');
      expect(luck.description).toContain('Teaching Heuristic');
      expect(luck.comparisonText).toContain('u = 0.9200 > Pk 0.8500 → MISS');
    });

    it('evaluates AS EXPECTED when target survives with boundary Pk = 0.69', () => {
      const luck = evaluateDecisionLuck(false, 0.69, 0.75);
      expect(luck.category).toBe('AS_EXPECTED');
      expect(luck.title).toBe('AS EXPECTED');
    });

    it('evaluates AS EXPECTED when target is killed with high probability Pk = 0.85', () => {
      const luck = evaluateDecisionLuck(true, 0.85, 0.45);
      expect(luck.category).toBe('AS_EXPECTED');
      expect(luck.title).toBe('AS EXPECTED');
      expect(luck.comparisonText).toContain('u = 0.4500 ≤ Pk 0.8500 → HIT');
    });
  });

  describe('2. Breakdown Equation Verification (Pk = pk0 * g * h)', () => {
    it('verifies Pk = pk0 * g * h within 1e-9 tolerance for nominal engagement', () => {
      // Mock killRng returning 0.30
      const killRng = () => 0.30;
      const res = resolveEngagement('GUN', 900, dummyTarget, killRng, {});

      expect(res.pk0).toBeDefined();
      expect(res.g).toBeDefined();
      expect(res.h).toBeDefined();

      const expectedPk = res.pk0! * res.g! * res.h!;
      expect(Math.abs(res.pk - expectedPk)).toBeLessThanOrEqual(1e-9);
      expect(res.killed).toBe(true);
      expect(res.u).toBe(0.30);
    });

    it('verifies chaos degradation factor h in fog and jamming within 1e-9', () => {
      // Laser in Fog (h = 0.5)
      const resLaserFog = resolveEngagement('LASER', 600, dummyTarget, () => 0.8, { isFogActive: true });
      expect(resLaserFog.h).toBe(0.5);
      expect(Math.abs(resLaserFog.pk - (resLaserFog.pk0! * resLaserFog.g! * 0.5))).toBeLessThanOrEqual(1e-9);

      // RF Soft-Kill under Jamming (h = 0.0)
      const resJam = resolveEngagement('RF_SOFTKILL', 500, dummyTarget, () => 0.1, { isJammingActive: true });
      expect(resJam.h).toBe(0.0);
      expect(resJam.pk).toBe(0.0);
      expect(resJam.killed).toBe(false);
    });
  });

  describe('3. Event Extraction & Stored Values Parity', () => {
    it('accurately extracts all recorded fields from an ENGAGE event', () => {
      const engageEvent: SimEvent = {
        seq: 42,
        tMs: 57000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: {
          effector: 'GUN',
          rangeM: 900,
          pk: 0.60,
          u: 0.25,
          killed: true,
          pk0: 0.60,
          g: 1.0,
          h: 1.0,
          costInr: 20000,
          cer: 0.40,
          roeGate: { classifiedOk: true, zoneOk: true },
          zoneId: 'Z-URBAN-1',
          rhoZone: 0.3,
          targetPos: { x: 900, y: 0, z: 50 },
        },
      };

      const spec = demo1Json as unknown as ScenarioSpec;
      const data = extractEngagementInspectionData(engageEvent, [engageEvent], spec, [dummyTarget]);

      expect(data).not.toBeNull();
      expect(data!.seq).toBe(42);
      expect(data!.tMs).toBe(57000);
      expect(data!.trackNo).toBe('T-01');
      expect(data!.effector).toBe('GUN');
      expect(data!.rangeM).toBe(900);
      expect(data!.pk).toBeCloseTo(0.60, 4);
      expect(data!.u).toBeCloseTo(0.25, 4);
      expect(data!.killed).toBe(true);
      expect(data!.pk0).toBe(0.60);
      expect(data!.g).toBe(1.0);
      expect(data!.h).toBe(1.0);
      expect(data!.costInr).toBe(20000);
      expect(data!.cer).toBeCloseTo(0.40, 2);
      expect(data!.isUnfavourableCer).toBe(false);
      expect(data!.roeGate?.classifiedOk).toBe(true);
      expect(data!.decisionLuck.category).toBe('AS_EXPECTED');
    });

    it('gracefully handles legacy event records without pk0/g/h without crashing', () => {
      const legacyEvent: SimEvent = {
        seq: 10,
        tMs: 25000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: {
          effector: 'MISSILE',
          rangeM: 3000,
          pk: 0.90,
          u: 0.40,
          killed: true,
        },
      };

      const data = extractEngagementInspectionData(legacyEvent, [legacyEvent]);
      expect(data).not.toBeNull();
      expect(data!.pk).toBe(0.90);
      expect(data!.pk0).toBeUndefined();
      expect(data!.decisionLuck.category).toBe('AS_EXPECTED');
    });

    it('resolves ENGAGE_RESULT event to its corresponding ENGAGE record', () => {
      const engageEvent: SimEvent = {
        seq: 15,
        tMs: 30000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: { effector: 'GUN', rangeM: 800, pk: 0.6, u: 0.8, killed: false },
      };
      const resultEvent: SimEvent = {
        seq: 16,
        tMs: 30000,
        type: 'ENGAGE_RESULT',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: { killed: false, u: 0.8, pk: 0.6 },
      };

      const data = extractEngagementInspectionData(resultEvent, [engageEvent, resultEvent]);
      expect(data).not.toBeNull();
      expect(data!.seq).toBe(15);
      expect(data!.killed).toBe(false);
    });
  });

  describe('4. ROE and Cost Regret Audit Integration', () => {
    it('flags unclassified firing penalty and kinetic over dense zone', () => {
      const roeViolationEvent: SimEvent = {
        seq: 20,
        tMs: 40000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: {
          effector: 'GUN', // Kinetic
          rangeM: 800,
          pk: 0.6,
          u: 0.5,
          killed: true,
          roeGate: { classifiedOk: false, zoneOk: false },
          zoneId: 'Z-URBAN-DENSE',
          rhoZone: 0.8, // Dense zone
        },
      };

      const data = extractEngagementInspectionData(roeViolationEvent, [roeViolationEvent]);
      expect(data!.roeGate?.classifiedOk).toBe(false);
      expect(data!.isKineticOverDenseZone).toBe(true);
    });

    it('correctly calculates Oracle choice and cost regret in AAR inspection data', () => {
      const civilTarget: TrackEntity = {
        ...dummyTarget,
        trueClass: 'CIVIL_UAS',
      };
      const engageCivil: SimEvent = {
        seq: 22,
        tMs: 45000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: { effector: 'MISSILE', rangeM: 2000, pk: 0.9, u: 0.1, killed: true },
      };

      const data = extractEngagementInspectionData(engageCivil, [engageCivil], undefined, [civilTarget]);
      expect(data!.trueClass).toBe('CIVIL_UAS');
      expect(data!.oracleEffector).toBe('HOLD_FIRE');
      expect(data!.isOptimalChoice).toBe(false);
    });
  });

  describe('5. Mandatory Illustrative Caption & Non-Kill-Cam Rendering', () => {
    it('renders server-side HTML with the mandatory illustrative probability caption', () => {
      const inspectionData = extractEngagementInspectionData({
        seq: 50,
        tMs: 65000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'T1',
        payload: {
          effector: 'INTERCEPTOR',
          rangeM: 2500,
          pk: 0.80,
          u: 0.35,
          killed: true,
          pk0: 0.80,
          g: 1.0,
          h: 1.0,
          costInr: 200000,
          cer: 4.0,
          roeGate: { classifiedOk: true, zoneOk: true },
        },
      })!;

      const html = renderToString(
        <AarEngagementInspector data={inspectionData} onClose={() => {}} />
      );

      // Verify mandatory wording (Prompt & Rule R10.3)
      expect(html).toContain('ILLUSTRATIVE — OUTCOME IS A SEEDED PROBABILITY DRAW');
      expect(html).toContain('TEACHING HEURISTIC &amp; RECORDED PROBABILITY BREAKDOWN — NOT A PHYSICAL KILL-CAM');
      expect(html).toContain('AAR ENGAGEMENT PROBABILITY INSPECTOR');
      expect(html).toContain('Pk = Pk0 · g(R) · h(chaos)');
    });
  });
});

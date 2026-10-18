import { describe, it, expect } from 'vitest';
import {
  getEnvelopePlateau,
  computeRangeAttenuation,
  computeBasePk0,
  computeChaosMultiplier,
  computeEffectivePk,
  resolveEngagement,
} from '@/sim/effectors';
import { CONFIG } from '@/config';
import { mulberry32, streamSeed } from '@/sim/rng';
import type { EffectorId } from '@/sim/types';

describe('Effector Catalog, Pk Equations & Combat Resolution (TASK-P2-03)', () => {
  const effectorIds: EffectorId[] = [
    'RF_SOFTKILL',
    'LASER',
    'GUN',
    'INTERCEPTOR',
    'MISSILE',
  ];

  describe('Envelope Plateau & Range Attenuation g(R)', () => {
    effectorIds.forEach((effId) => {
      describe(`Effector: ${effId}`, () => {
        const { envelopeMinM, envelopeMaxM, plateauMinM, plateauMaxM, rOptM } =
          getEnvelopePlateau(effId);
        const width = envelopeMaxM - envelopeMinM;

        it('calculates middle 60% plateau correctly', () => {
          expect(plateauMinM).toBeCloseTo(envelopeMinM + 0.2 * width, 1);
          expect(plateauMaxM).toBeCloseTo(envelopeMinM + 0.8 * width, 1);
          expect(rOptM).toBeCloseTo((envelopeMinM + envelopeMaxM) / 2, 1);
        });

        it('yields g(R) = 0 at or outside envelope boundaries', () => {
          expect(computeRangeAttenuation(envelopeMinM - 10, effId)).toBe(0);
          expect(computeRangeAttenuation(envelopeMinM, effId)).toBe(0);
          expect(computeRangeAttenuation(envelopeMaxM, effId)).toBe(0);
          expect(computeRangeAttenuation(envelopeMaxM + 10, effId)).toBe(0);
        });

        it('yields g(R) = 1.0 everywhere across the middle 60% plateau', () => {
          expect(computeRangeAttenuation(plateauMinM, effId)).toBe(1.0);
          expect(computeRangeAttenuation(rOptM, effId)).toBe(1.0);
          expect(computeRangeAttenuation(plateauMaxM, effId)).toBe(1.0);
        });

        it('linearly tapers between envelope edge and plateau edge', () => {
          // Halfway into inner taper
          const midInnerTaper = (envelopeMinM + plateauMinM) / 2;
          expect(computeRangeAttenuation(midInnerTaper, effId)).toBeCloseTo(0.5, 2);

          // Halfway into outer taper
          const midOuterTaper = (plateauMaxM + envelopeMaxM) / 2;
          expect(computeRangeAttenuation(midOuterTaper, effId)).toBeCloseTo(0.5, 2);
        });
      });
    });
  });

  describe('Base Pk0 Modifiers (Swarm & RF-Silent targets)', () => {
    it('sets base Pk0 = 0.35 per element for GUN against SWARM_ELEMENT', () => {
      const pk0 = computeBasePk0('GUN', {
        droneType: 'SWARM_ELEMENT',
        emitsRf: true,
      });
      expect(pk0).toBe(0.35);
    });

    it('sets base Pk0 = 0.1 for RF_SOFTKILL against RF-silent target', () => {
      const pk0 = computeBasePk0('RF_SOFTKILL', {
        droneType: 'FPV_ATTACK',
        emitsRf: false,
      });
      expect(pk0).toBe(0.1);
    });

    it('maintains nominal Pk0 for kinetic interceptor against RF-silent target', () => {
      const pk0 = computeBasePk0('INTERCEPTOR', {
        droneType: 'FPV_ATTACK',
        emitsRf: false,
      });
      expect(pk0).toBe(CONFIG.effectors.INTERCEPTOR.pk0);
    });
  });

  describe('Environmental Chaos Multiplier h(chaos)', () => {
    it('halves laser Pk in fog (h = 0.5)', () => {
      const hFog = computeChaosMultiplier('LASER', { isFogActive: true });
      expect(hFog).toBe(0.5);

      const hClear = computeChaosMultiplier('LASER', { isFogActive: false });
      expect(hClear).toBe(1.0);
    });

    it('zeroes RF soft-kill Pk under jamming (h = 0.0)', () => {
      const hJam = computeChaosMultiplier('RF_SOFTKILL', { isJammingActive: true });
      expect(hJam).toBe(0.0);

      const hClear = computeChaosMultiplier('RF_SOFTKILL', { isJammingActive: false });
      expect(hClear).toBe(1.0);
    });

    it('does not affect kinetic weapons in fog or jamming', () => {
      expect(computeChaosMultiplier('GUN', { isFogActive: true, isJammingActive: true })).toBe(1.0);
      expect(computeChaosMultiplier('MISSILE', { isFogActive: true, isJammingActive: true })).toBe(1.0);
    });
  });

  describe('Table-Driven Effective Pk Verification', () => {
    it('calculates expected Pk at envelope edges and plateau center', () => {
      // LASER: envelope [200, 1500], plateau center 850m, base pk0 = 0.7
      const pkCenter = computeEffectivePk('LASER', 850, { droneType: 'FPV_ATTACK', emitsRf: true });
      expect(pkCenter).toBeCloseTo(0.7, 2);

      // In fog: 0.7 * 1.0 * 0.5 = 0.35
      const pkCenterFog = computeEffectivePk('LASER', 850, { droneType: 'FPV_ATTACK', emitsRf: true }, { isFogActive: true });
      expect(pkCenterFog).toBeCloseTo(0.35, 2);

      // Outside envelope (> 1500m): Pk = 0
      const pkOut = computeEffectivePk('LASER', 1600, { droneType: 'FPV_ATTACK', emitsRf: true });
      expect(pkOut).toBe(0);
    });
  });

  describe('Seeded Kill Stream Resolution & Determinism', () => {
    it('produces identical kill sequences from identical seeds', () => {
      const seed = 42;
      const rng1 = mulberry32(streamSeed(seed, 'kill'));
      const rng2 = mulberry32(streamSeed(seed, 'kill'));

      const dummyTarget = {
        id: 'H-1',
        trackNo: 'T-01',
        trueClass: 'HOSTILE_ATTACK' as const,
        droneType: 'FPV_ATTACK' as const,
        pos: { x: 800, y: 0, z: 20 },
        prev: { x: 800, y: 0, z: 20 },
        vel: { x: -40, y: 0, z: 0 },
        rcsM2: 0.01,
        valueInr: 100000,
        emitsRf: true,
        remoteId: false,
        iff: false,
        profile: 'DIRECT' as const,
        spawnTMs: 0,
        lifecycle: 'ACTIVE' as const,
        traineeLabel: 'HOSTILE_ATTACK' as const,
        step: 'TARGET' as const,
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
      };

      const res1 = resolveEngagement('RF_SOFTKILL', 800, dummyTarget, rng1);
      const res2 = resolveEngagement('RF_SOFTKILL', 800, dummyTarget, rng2);

      expect(res1.u).toBe(res2.u);
      expect(res1.pk).toBe(res2.pk);
      expect(res1.killed).toBe(res2.killed);
    });
  });
});

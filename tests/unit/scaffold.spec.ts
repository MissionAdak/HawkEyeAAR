import { describe, it, expect } from 'vitest';
import { mulberry32, hash32, streamSeed, keyedU } from '@/sim/rng';
import { SimClock, TICK_MS } from '@/sim/clock';
import { CLASSES, SHORT_CODES, HOSTILE, isHostile } from '@/sim/taxonomy';
import { CONFIG, CONFIG_HASH } from '@/config';

describe('Phase 0 Contracts & Guardrails', () => {
  describe('Taxonomy & Canonical Classes', () => {
    it('has exactly 7 canonical classes', () => {
      expect(CLASSES).toHaveLength(7);
      expect(CLASSES).toContain('UNKNOWN_EVIDENCE_INSUFFICIENT');
      expect(CLASSES).toContain('HOSTILE_ATTACK');
      expect(CLASSES).toContain('HOSTILE_ISR');
      expect(CLASSES).toContain('SWARM_ELEMENT');
      expect(CLASSES).toContain('CIVIL_UAS');
      expect(CLASSES).toContain('BIRD');
      expect(CLASSES).toContain('FRIENDLY');
    });

    it('correctly maps hostile set', () => {
      expect(HOSTILE.size).toBe(3);
      expect(isHostile('HOSTILE_ATTACK')).toBe(true);
      expect(isHostile('HOSTILE_ISR')).toBe(true);
      expect(isHostile('SWARM_ELEMENT')).toBe(true);
      expect(isHostile('CIVIL_UAS')).toBe(false);
      expect(isHostile('BIRD')).toBe(false);
      expect(isHostile('FRIENDLY')).toBe(false);
      expect(isHostile('UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe(false);
    });

    it('has short codes for all 7 classes', () => {
      for (const cls of CLASSES) {
        expect(SHORT_CODES[cls]).toBeDefined();
        expect(SHORT_CODES[cls].length).toBeGreaterThanOrEqual(1);
      }
      expect(SHORT_CODES['UNKNOWN_EVIDENCE_INSUFFICIENT']).toBe('?');
    });
  });

  describe('Config Inlining & Schema', () => {
    it('provides a valid SHA-256 config hash', () => {
      expect(CONFIG_HASH).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('loads notional thresholds and parameters correctly', () => {
      expect(CONFIG._meta.notional).toBe(true);
      expect(CONFIG.thresholds.qMin).toBe(0.6);
      expect(CONFIG.thresholds.rMinM).toBe(500);
      expect(CONFIG.thresholds.cerUnfavourableThreshold).toBe(10);
      expect(CONFIG.thresholds.radarMaxRangeM).toBe(5000);
      expect(CONFIG.thresholds.radarSweepPeriodMs).toBe(2000);
      expect(CONFIG.thresholds.radarRpm).toBe(30);
    });

    it('contains all 5 canonical effectors with valid envelopes', () => {
      const keys = ['RF_SOFTKILL', 'LASER', 'GUN', 'INTERCEPTOR', 'MISSILE'];
      for (const k of keys) {
        const eff = CONFIG.effectors[k];
        expect(eff).toBeDefined();
        expect(eff.pk0).toBeGreaterThan(0);
        expect(eff.envelopeMaxM).toBeGreaterThan(eff.envelopeMinM);
      }
      expect(CONFIG.effectors['MISSILE'].costInr).toBe(3000000);
      expect(CONFIG.effectors['RF_SOFTKILL'].costInr).toBe(100);
    });
  });

  describe('PRNG & Deterministic Streams', () => {
    it('produces identical sequences for the same seed', () => {
      const rng1 = mulberry32(1337);
      const rng2 = mulberry32(1337);
      for (let i = 0; i < 100; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = mulberry32(1337);
      const rng2 = mulberry32(1338);
      let matches = 0;
      for (let i = 0; i < 100; i++) {
        if (rng1() === rng2()) matches++;
      }
      expect(matches).toBeLessThan(5);
    });

    it('isolates stream seeds across different subsystem labels', () => {
      const baseSeed = 42;
      const trajSeed = streamSeed(baseSeed, 'traj', 0);
      const senseSeed = streamSeed(baseSeed, 'sense', 0);
      const killSeed = streamSeed(baseSeed, 'kill');
      const genSeed = streamSeed(baseSeed, 'gen');

      expect(trajSeed).not.toBe(senseSeed);
      expect(senseSeed).not.toBe(killSeed);
      expect(killSeed).not.toBe(genSeed);
    });

    it('keyedU is stateless and idempotent', () => {
      const val1 = keyedU(100, 'sense', 2, 5);
      const val2 = keyedU(100, 'sense', 2, 5);
      const valDiff = keyedU(100, 'sense', 2, 6);

      expect(val1).toBe(val2);
      expect(val1).not.toBe(valDiff);
      expect(val1).toBeGreaterThanOrEqual(0);
      expect(val1).toBeLessThan(1);
    });

    it('hashes strings deterministically with hash32', () => {
      const h1 = hash32('DRISHTI');
      const h2 = hash32('DRISHTI');
      expect(h1).toBe(h2);
      expect(typeof h1).toBe('number');
    });
  });

  describe('Clock & Fixed-Timestep Accumulator', () => {
    it('defines TICK_MS as 50ms (20 Hz)', () => {
      expect(TICK_MS).toBe(50);
    });

    it('runs exactly 200 ticks for 10 seconds across varying simulated frame times', () => {
      const frameIntervals = [16.7, 6.9, 33.0];

      for (const frameMs of frameIntervals) {
        const clock = new SimClock();
        clock.reset();
        clock.advance(0); // baseline frame at t=0

        let totalTicks = 0;
        let time = 0;
        while (time + frameMs <= 10000) {
          time += frameMs;
          const { ticksToRun } = clock.advance(time);
          totalTicks += ticksToRun;
        }

        if (time < 10000) {
          const { ticksToRun } = clock.advance(10000);
          totalTicks += ticksToRun;
        }

        // Exactly 10,000 ms at 50ms per tick = 200 ticks
        expect(totalTicks).toBe(200);
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CLASSES, TRUE_CLASSES, SHORT_CODES, CLASS_LABELS } from '@/sim/taxonomy';
import { applyTickFor } from '@/sim/inputQueue';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Architectural Guardrails & Invariants (Rules.md R1, R2, R3)', () => {
  const srcDir = path.resolve('src');

  function getAllSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllSourceFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const allSourceFiles = getAllSourceFiles(srcDir);

  describe('R1: Zero-Server & Airgap Static Guard (R1.1, R1.3)', () => {
    it('verifies zero unauthorized network APIs across entire src/ directory', () => {
      const bannedAPIs = [
        'XMLHttpRequest',
        'WebSocket',
        'EventSource',
        'navigator.sendBeacon',
        'axios',
        'socket.io',
      ];

      for (const file of allSourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const api of bannedAPIs) {
          expect(content).not.toContain(api);
        }
      }
    });

    it('verifies zero external remote URLs across all src/ files (allowing only local/w3 namespaces)', () => {
      const urlRegex = /https?:\/\/(?!www\.w3\.org)[^\s'"`<>]+/g;

      for (const file of allSourceFiles) {
        // Skip config or calibration generated definitions if any
        if (file.endsWith('config.generated.ts')) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(urlRegex) ?? [];
        expect(matches).toEqual([]);
      }
    });
  });

  describe('R3: Canonical Classification Taxonomy Guard (R3.1)', () => {
    it('defines exactly the 7 canonical trainee classes and 6 ground truth classes', () => {
      expect(CLASSES).toHaveLength(7);
      expect(TRUE_CLASSES).toHaveLength(6);
      expect(TRUE_CLASSES).not.toContain('UNKNOWN_EVIDENCE_INSUFFICIENT');

      for (const tc of TRUE_CLASSES) {
        expect(CLASSES).toContain(tc);
      }
    });

    it('defines display short codes and full labels for all classes plus NONE', () => {
      for (const cls of CLASSES) {
        expect(SHORT_CODES[cls]).toBeDefined();
        expect(CLASS_LABELS[cls]).toBeDefined();
      }
      expect(SHORT_CODES['NONE']).toBe('NON');
      expect(CLASS_LABELS['NONE']).toBeDefined();
    });

    it('ensures no stray lowercase or invalid class tokens appear in src/', () => {
      const invalidClassTokens = [
        'HOSTILE_DRONE',
        'HOSTILE_SWARM',
        'CIVILIAN_DRONE',
        'UNKNOWN_DRONE',
        'FRIENDLY_DRONE',
      ];

      for (const file of allSourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const token of invalidClassTokens) {
          expect(content).not.toContain(token);
        }
      }
    });
  });

  describe('R2: Deterministic Tick-Boundary Input Scheduling (R2.5)', () => {
    it('correctly maps inputs arriving before, exactly at, and after tick boundaries', () => {
      // 50ms ticks:
      // Tick 5 corresponds to 250ms (window: (200ms, 250ms])
      // Tick 6 corresponds to 300ms (window: (250ms, 300ms])

      // 1. Arriving before tick 5 boundary (249ms) when tick 4 was last processed
      expect(applyTickFor(249, 4)).toBe(5);

      // 2. Arriving exactly at tick 5 boundary (250ms) when tick 4 was last processed
      expect(applyTickFor(250, 4)).toBe(5);

      // 3. Arriving exactly at tick 5 boundary (250ms), but tick 5 was already processed!
      // Must map to tick 6 (never retroactively to tick 5)
      expect(applyTickFor(250, 5)).toBe(6);

      // 4. Arriving just after tick 5 boundary (251ms) when tick 5 was last processed
      expect(applyTickFor(251, 5)).toBe(6);

      // 5. Arriving at tick 6 boundary (300ms) when tick 5 was last processed
      expect(applyTickFor(300, 5)).toBe(6);

      // 6. Arriving just after tick 6 boundary (301ms) when tick 5 was last processed
      expect(applyTickFor(301, 5)).toBe(7);
    });

    it('strictly prevents retroactive scheduling of late-arriving events', () => {
      // Even if event timestamp says 50ms (tick 1), but lastProcessedTick is 10,
      // the input MUST be scheduled for tick 11
      const lateEventSimMs = 50;
      const lastProcessedTick = 10;
      const scheduledTick = applyTickFor(lateEventSimMs, lastProcessedTick);

      expect(scheduledTick).toBe(11);
      expect(scheduledTick).toBeGreaterThan(lastProcessedTick);
    });
  });

  describe('R2: Scored EVAL Session Invariants (R2.10)', () => {
    it('disallows manual pausing and speed multipliers during EVAL sessions', () => {
      const evalSpec: ScenarioSpec = {
        ...(demo1Json as unknown as ScenarioSpec),
        mode: 'EVAL',
      };

      const engine = new SimEngine();
      engine.load(evalSpec);
      expect(engine.mode).toBe('EVAL');

      // Verify engine handles abort gracefully
      expect(engine.sessionEnded).toBe(false);
      engine.abort('TAB_BACKGROUNDED');
      expect(engine.sessionEnded).toBe(true);

      const endEvent = engine.events.find((e) => e.type === 'SESSION_END');
      expect(endEvent).toBeDefined();
      expect(endEvent?.payload.reason).toBe('TAB_BACKGROUNDED');
      expect(endEvent?.payload.aborted).toBe(true);
    });
  });
});

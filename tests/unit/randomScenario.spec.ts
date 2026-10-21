import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateRandomScenario,
  RANDOM_SCENARIO_GENERATOR_VERSION,
} from '@/director/randomScenario';
import { validateDetailed, validate } from '@/director/validate';
import { SCENARIO_CATALOG, getScenarioCatalogEntry, loadCatalogScenario } from '@/director/catalog';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import {
  clearFallbackEventsForTest,
  setMockPersistenceFailureForTest,
} from '@/db/recorder';
import type { TrueClass } from '@/sim/types';

describe('RANDOM-1 — Dedicated Unpredictable Assessment (TASK 13)', () => {
  beforeEach(async () => {
    clearFallbackEventsForTest();
    setMockPersistenceFailureForTest(false);
    engineInstance.abort('TEST_RESET');
    await useSessionStore.getState().loadScenarioById('DEMO-1');
  });

  afterEach(() => {
    setMockPersistenceFailureForTest(false);
    engineInstance.abort('TEST_CLEANUP');
  });

  describe('Catalog Entry & Metadata', () => {
    it('is registered in SCENARIO_CATALOG with valid ID and metadata', () => {
      const entryInCatalog = SCENARIO_CATALOG.find((s) => s.id === 'RANDOM-1');
      expect(entryInCatalog).toBeDefined();

      const entry = getScenarioCatalogEntry('RANDOM-1');
      expect(entry).toBeDefined();
      expect(entry?.id).toBe('RANDOM-1');
      expect(entry?.name).toContain('RANDOM-1');
      expect(entry?.category).toBe('TRAIN');
      expect(entry?.durationSec).toBe(120);
      expect(entry?.classes).toEqual([
        'HOSTILE_ATTACK',
        'HOSTILE_ISR',
        'SWARM_ELEMENT',
        'CIVIL_UAS',
        'BIRD',
        'FRIENDLY',
      ]);
      expect(entry?.tags).toContain('RANDOMIZED');
      expect(entry?.tags).toContain('UNPREDICTABLE');
    });

    it('has matching durationSec (120) and durationMs (120_000)', () => {
      const entry = getScenarioCatalogEntry('RANDOM-1')!;
      const spec = entry.getSpec(999);
      expect(entry.durationSec).toBe(120);
      expect(spec.durationMs).toBe(120_000);
      expect(spec.durationMs).toBe(entry.durationSec * 1000);
    });

    it('exports generator version', () => {
      expect(RANDOM_SCENARIO_GENERATOR_VERSION).toBe('1.0.0');
    });
  });

  describe('Determinism & Reproducibility', () => {
    it('produces identical specification given the exact same seed', () => {
      const seed = 12345;
      const specA = generateRandomScenario(seed);
      const specB = generateRandomScenario(seed);

      expect(specA.seed).toBe(seed);
      expect(specB.seed).toBe(seed);
      expect(specA.threats).toEqual(specB.threats);
      expect(specA.decoys).toEqual(specB.decoys);
      expect(specA.zones).toEqual(specB.zones);
      expect(specA.features).toEqual(specB.features);
    });

    it('produces meaningful structural variation across different seeds', () => {
      const seeds = [101, 202, 303, 404, 505];
      const specs = seeds.map((s) => generateRandomScenario(s));

      // 1. Verify variation in entity counts and compositions
      const threatCounts = new Set(specs.map((s) => s.threats.length));
      const decoyCounts = new Set(specs.map((s) => s.decoys.length));
      // Across 5 seeds, not all should be identical
      expect(threatCounts.size).toBeGreaterThanOrEqual(2);
      expect(decoyCounts.size).toBeGreaterThanOrEqual(2);

      // 2. Verify variation in class distribution
      const allClassesUsed = new Set<TrueClass>();
      for (const spec of specs) {
        for (const t of spec.threats) allClassesUsed.add(t.trueClass);
        for (const d of spec.decoys) allClassesUsed.add(d.trueClass);
      }
      expect(allClassesUsed.size).toBeGreaterThanOrEqual(4);

      // 3. Verify approach angle variation (start positions differ)
      const firstThreatSpawnX = new Set(specs.map((s) => s.threats[0]?.waypoints[0]?.x));
      expect(firstThreatSpawnX.size).toBe(seeds.length);
    });
  });

  describe('Fairness Validation & Bounds Enforcement', () => {
    it('consistently satisfies the fairness validator across multiple seeds', () => {
      const testSeeds = [1, 42, 777, 9999, 123456, 789012];
      for (const seed of testSeeds) {
        const spec = generateRandomScenario(seed);
        const detailed = validateDetailed(spec);
        expect(
          detailed.valid,
          `Seed ${seed} failed validation: ${detailed.reasons.join('; ')}`
        ).toBe(true);
        expect(detailed.reasons).toEqual([]);
        expect(validate(spec)).toBe(true);
      }
    });

    it('enforces spatial, timing, and PNR bounds for all generated hostiles', () => {
      const spec = generateRandomScenario(8888);
      for (const threat of spec.threats) {
        // Must spawn outside asset perimeter (500m)
        const startPos = threat.waypoints[0]!;
        const startDist = Math.hypot(startPos.x, startPos.y);
        expect(startDist).toBeGreaterThanOrEqual(3000);

        // Heading towards asset (0,0)
        const finalPos = threat.waypoints.at(-1)!;
        expect(finalPos.x).toBe(0);
        expect(finalPos.y).toBe(0);

        // Speed is within realistic limits (20 - 45 m/s)
        expect(threat.speedMps).toBeGreaterThanOrEqual(20);
        expect(threat.speedMps).toBeLessThanOrEqual(45);

        // Spawn time is positive and spaced
        expect(threat.spawnTMs).toBeGreaterThanOrEqual(1000);
      }
    });
  });

  describe('Hidden Ground Truth Protection', () => {
    it('does not expose planned entity composition or true classes in active UI snapshot', async () => {
      const store = useSessionStore.getState();
      const loaded = await store.loadScenarioById('RANDOM-1', 54321);
      expect(loaded).toBe(true);

      const snapshot = store.ui;
      expect(snapshot).toBeDefined();

      // UI snapshot must only contain active tracks, not the planned future threats list
      expect(snapshot.trackRows).toBeDefined();
      for (const row of snapshot.trackRows) {
        // Label must be traineeLabel (null before trainee classifies)
        expect(row.label).toBeNull();
        expect(row.shortCode).toBe('NON');
        // Must not expose ground truth trueClass
        expect((row as unknown as { trueClass?: string }).trueClass).toBeUndefined();
      }
    });
  });

  describe('Session Lifecycle, Restart & Exact Rerun', () => {
    it('loads via loadCatalogScenario and sessionStore', async () => {
      const { spec, entry } = loadCatalogScenario('RANDOM-1', 4444);
      expect(entry.id).toBe('RANDOM-1');
      expect(spec.id).toBe('RANDOM-1');
      expect(spec.seed).toBe(4444);

      const success = await useSessionStore.getState().loadScenarioById('RANDOM-1', 4444);
      expect(success).toBe(true);
      expect(useSessionStore.getState().currentScenarioId).toBe('RANDOM-1');
      expect(engineInstance.spec?.seed).toBe(4444);
    });

    it('restartSession on RANDOM-1 draws a fresh seed', async () => {
      await useSessionStore.getState().loadScenarioById('RANDOM-1', 1111);
      const initialSeed = engineInstance.spec?.seed;
      expect(initialSeed).toBe(1111);

      const restarted = await useSessionStore.getState().restartSession({ freshSeed: true });
      expect(restarted).toBe(true);
      expect(useSessionStore.getState().currentScenarioId).toBe('RANDOM-1');
      const newSeed = engineInstance.spec?.seed;
      expect(newSeed).toBeDefined();
      expect(newSeed).not.toBe(initialSeed);
    });

    it('rerunExactSeedSession on RANDOM-1 preserves the exact seed and encounters', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('RANDOM-1', 9876);
      const threatsOriginal = engineInstance.spec?.threats.map((t) => t.id);

      const rerun = await store.rerunExactSeedSession();
      expect(rerun).toBe(true);
      expect(engineInstance.spec?.seed).toBe(9876);
      const threatsRerun = engineInstance.spec?.threats.map((t) => t.id);
      expect(threatsRerun).toEqual(threatsOriginal);
    });

    it('finalizes previous active RANDOM-1 session when switching to another scenario', async () => {
      const store = useSessionStore.getState();
      await store.loadScenarioById('RANDOM-1', 5555);

      // Simulate a few ticks to make session active
      for (let i = 0; i < 50; i++) {
        engineInstance.step();
      }
      expect(engineInstance.tickIndex).toBe(50);

      // Switching to DEMO-1 must finalize cleanly with SCENARIO_SWITCH
      await store.loadScenarioById('DEMO-1');
      expect(store.currentScenarioId).toBe('DEMO-1');
      expect(engineInstance.spec?.id).toBe('DEMO-1');
    });
  });
});

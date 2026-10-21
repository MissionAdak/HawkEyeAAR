import { describe, it, expect } from 'vitest';
import {
  expandFormation,
  computeFormationOffsets,
  generateFormationScenario,
  type FormationDefinition,
} from '@/director/formations';
import { generateScenario } from '@/director/generator';
import { validateDetailed, validate } from '@/director/validate';
import { isNovel, computeCosineSimilarity } from '@/director/novelty';
import { SimEngine } from '@/sim/engine';
import { reconstructAarReplayState } from '@/ui/aar/aarReplayData';
import type { ThreatSpawn } from '@/sim/types';

describe('OPTIONAL TASK 12 — Procedural Scenario Formations', () => {
  const baseThreat: ThreatSpawn = {
    id: 'H-LEAD',
    droneType: 'SWARM_ELEMENT',
    trueClass: 'SWARM_ELEMENT',
    spawnTMs: 1000,
    waypoints: [
      { x: 3000, y: 0, z: 80 },
      { x: 0, y: 0, z: 20 },
    ],
    speedMps: 30,
    profile: 'DIRECT',
    rcsM2: 0.01,
    valueInr: 50000,
    emitsRf: true,
    remoteId: false,
    iff: false,
  };

  describe('Formation Geometry Calculations', () => {
    it('computes LINE_ABREAST geometry with lateral spacing and same altitude', () => {
      // Flight heading from (3000, 0) to (0, 0) is along -X: ux = -1, uy = 0
      // Lateral perpendicular vector: perpX = -uy = 0, perpY = ux = -1
      const count = 3;
      const spacingM = 100;
      const offsets = computeFormationOffsets('LINE_ABREAST', count, spacingM, -1, 0);

      expect(offsets).toHaveLength(3);
      // For k = 0, 1, 2, lateralDist = (k - 1) * 100 = -100, 0, +100
      // dx = 0, dy = lateralDist * (-1)
      expect(offsets[0].dx).toBe(0);
      expect(offsets[0].dy).toBe(100);
      expect(offsets[0].dz).toBeUndefined();

      expect(offsets[1].dx).toBe(0);
      expect(offsets[1].dy).toBe(0);
      expect(offsets[1].dz).toBeUndefined();

      expect(offsets[2].dx).toBe(0);
      expect(offsets[2].dy).toBe(-100);
      expect(offsets[2].dz).toBeUndefined();

      // Expand formation
      const def: FormationDefinition = {
        groupId: 'GRP-LINE',
        kind: 'LINE_ABREAST',
        count: 3,
        spacingM: 100,
        baseSpawn: baseThreat,
      };
      const expanded = expandFormation(def);
      expect(expanded).toHaveLength(3);
      expect(expanded[0].id).toBe('H-LEAD');
      expect(expanded[1].id).toBe('H-LEAD-F1');
      expect(expanded[2].id).toBe('H-LEAD-F2');

      // Member 0: y shifted by 100
      expect(expanded[0].waypoints[0]).toEqual({ x: 3000, y: 100, z: 80 });
      // Member 1: center
      expect(expanded[1].waypoints[0]).toEqual({ x: 3000, y: 0, z: 80 });
      // Member 2: y shifted by -100
      expect(expanded[2].waypoints[0]).toEqual({ x: 3000, y: -100, z: 80 });

      // All share identical speed, spawn time, and altitude
      expanded.forEach((m, idx) => {
        expect(m.speedMps).toBe(30);
        expect(m.spawnTMs).toBe(1000);
        expect(m.waypoints[0].z).toBe(80);
        expect(m.formation).toEqual({
          groupId: 'GRP-LINE',
          kind: 'LINE_ABREAST',
          index: idx,
          count: 3,
          leaderId: 'H-LEAD',
          spacingM: 100,
        });
      });
    });

    it('computes V_WEDGE geometry with apex leader and ±35 deg followers', () => {
      // Flight heading from (0, 3000) to (0, 0) is along -Y: ux = 0, uy = -1
      // Perpendicular: perpX = -(-1) = 1, perpY = 0
      const count = 3;
      const spacingM = 100;
      const offsets = computeFormationOffsets('V_WEDGE', count, spacingM, 0, -1);

      expect(offsets).toHaveLength(3);
      // Leader at apex
      expect(offsets[0].dx).toBe(0);
      expect(offsets[0].dy).toBe(0);

      // Follower 1 (odd -> left): side = -1, backDist = -100 * cos(35 deg) ~ -81.9
      // dy = backDist * uy = -81.9 * (-1) = 82 (trailing behind approach)
      // dx = lateralDist * perpX = (-1) * 100 * sin(35 deg) * 1 = -57
      const cos35 = Math.cos((35 * Math.PI) / 180);
      const sin35 = Math.sin((35 * Math.PI) / 180);

      expect(offsets[1].dy).toBe(Math.round(-100 * cos35 * -1));
      expect(offsets[1].dx).toBe(Math.round(-100 * sin35 * 1));

      // Follower 2 (even -> right): side = +1
      expect(offsets[2].dy).toBe(Math.round(-100 * cos35 * -1));
      expect(offsets[2].dx).toBe(Math.round(100 * sin35 * 1));

      // Wing angles from apex are exactly 35 degrees
      const angleLeftDeg = (Math.atan2(Math.abs(offsets[1].dx), offsets[1].dy) * 180) / Math.PI;
      const angleRightDeg = (Math.atan2(Math.abs(offsets[2].dx), offsets[2].dy) * 180) / Math.PI;
      expect(angleLeftDeg).toBeCloseTo(35, 0);
      expect(angleRightDeg).toBeCloseTo(35, 0);
    });

    it('computes STACK geometry with longitudinal spacing and tiered altitude layers', () => {
      const count = 3;
      const spacingM = 60;
      const offsets = computeFormationOffsets('STACK', count, spacingM, 1, 0);

      expect(offsets).toHaveLength(3);
      // Layer altitudes: z_k = 40 + 50*k
      expect(offsets[0].dz).toBe(40);
      expect(offsets[1].dz).toBe(90);
      expect(offsets[2].dz).toBe(140);

      // Longitudinal spacing along track: backDist = -k * 60
      expect(offsets[0].dx).toBe(0);
      expect(offsets[1].dx).toBe(-60);
      expect(offsets[2].dx).toBe(-120);

      const def: FormationDefinition = {
        groupId: 'GRP-STACK',
        kind: 'STACK',
        count: 3,
        spacingM: 60,
        baseSpawn: baseThreat,
      };
      const expanded = expandFormation(def);
      expect(expanded[0].waypoints[0].z).toBe(40);
      expect(expanded[1].waypoints[0].z).toBe(90);
      expect(expanded[2].waypoints[0].z).toBe(140);
    });

    it('computes DECOY_LEAD geometry with RF-emitting lead and trailing RF-silent followers', () => {
      const def: FormationDefinition = {
        groupId: 'GRP-DECOY',
        kind: 'DECOY_LEAD',
        count: 2,
        spacingM: 150,
        baseSpawn: baseThreat,
      };
      const expanded = expandFormation(def);

      expect(expanded).toHaveLength(2);
      // Leader is forward decoy with higher RCS and RF emission
      expect(expanded[0].rcsM2).toBe(0.05);
      expect(expanded[0].emitsRf).toBe(true);

      // Follower trails 150m behind, RF silent, low RCS
      expect(expanded[1].rcsM2).toBe(0.01);
      expect(expanded[1].emitsRf).toBe(false);

      // Distance between lead and follower along flight axis is ~150m
      const p0 = expanded[0].waypoints[0];
      const p1 = expanded[1].waypoints[0];
      const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      expect(dist).toBeCloseTo(150, 0);
    });
  });

  describe('Seed Determinism and Replayability', () => {
    it('produces identical formation specs for the same seed', () => {
      const specA = generateFormationScenario({ seed: 8888, difficulty: 0.4 });
      const specB = generateFormationScenario({ seed: 8888, difficulty: 0.4 });

      expect(specA.id).toBe(specB.id);
      expect(specA.seed).toBe(specB.seed);
      expect(specA.threats).toHaveLength(specB.threats.length);
      expect(specA.features).toEqual(specB.features);
      expect(specA.formations).toEqual(specB.formations);

      // Deep compare waypoint coordinates
      for (let i = 0; i < specA.threats.length; i++) {
        expect(specA.threats[i].waypoints).toEqual(specB.threats[i].waypoints);
        expect(specA.threats[i].formation).toEqual(specB.threats[i].formation);
      }
    });

    it('produces distinct formation encounters for different seeds', () => {
      const spec1 = generateFormationScenario({ seed: 1001, difficulty: 0.3 });
      const spec2 = generateFormationScenario({ seed: 2002, difficulty: 0.3 });

      expect(spec1.seed).not.toBe(spec2.seed);
      expect(spec1.threats[0].waypoints[0]).not.toEqual(spec2.threats[0].waypoints[0]);
    });
  });

  describe('Fairness Validator Integration & Edge Cases', () => {
    it('validates generated formation scenarios across all formation kinds', () => {
      const kinds = ['LINE_ABREAST', 'V_WEDGE', 'STACK', 'DECOY_LEAD'] as const;

      for (const kind of kinds) {
        const spec = generateFormationScenario({
          seed: 4242,
          difficulty: 0.35,
          formationKind: kind,
        });

        const result = validateDetailed(spec);
        expect(result.valid).toBe(true);
        expect(result.reasons).toEqual([]);
        expect(validate(spec)).toBe(true);
      }
    });

    it('rejects formation scenario when time budget is unfairly compressed (<6000ms)', () => {
      const spec = generateFormationScenario({ seed: 5050, difficulty: 0.3 });

      // Corrupt waypoints so threats start inside rMinM (500m) or with impossible budget
      spec.threats = spec.threats.map((t) => ({
        ...t,
        waypoints: [
          { x: 550, y: 0, z: 30 },
          { x: 0, y: 0, z: 20 },
        ],
        speedMps: 100, // Enters rMinM in 0.5s -> budget < 6000ms
      }));

      const res = validateDetailed(spec);
      expect(res.valid).toBe(false);
      expect(res.reasons.some((r) => r.includes('time budget') || r.includes('failed track initiation'))).toBe(true);
    });

    it('rejects formation scenario when load check is exceeded', () => {
      const spec = generateFormationScenario({ seed: 6060, difficulty: 0.3 });

      // Add 20 hostiles with nearly simultaneous spawn and arrival so spanSec is tiny
      const compressedThreats: ThreatSpawn[] = [];
      for (let i = 0; i < 15; i++) {
        compressedThreats.push({
          ...spec.threats[0],
          id: `H-LOAD-${i}`,
          spawnTMs: 1000,
          waypoints: [
            { x: 2000, y: 0, z: 80 },
            { x: 0, y: 0, z: 20 },
          ],
          speedMps: 30,
        });
      }
      spec.threats = compressedThreats;

      const res = validateDetailed(spec);
      expect(res.valid).toBe(false);
      expect(res.reasons.some((r) => r.includes('load check failed'))).toBe(true);
    });

    it('rejects formation scenario with overlapping concurrent chaos', () => {
      const spec = generateFormationScenario({ seed: 7070, difficulty: 0.3 });

      spec.chaos = [
        { type: 'RAIN', tStartMs: 10000, tEndMs: 20000, severity: 0.5 },
        { type: 'FOG', tStartMs: 15000, tEndMs: 25000, severity: 0.5 }, // Overlaps
      ];

      const res = validateDetailed(spec);
      expect(res.valid).toBe(false);
      expect(res.reasons[0]).toContain('Chaos schedule violation');
    });
  });

  describe('Novelty Engine & Feature Vector', () => {
    it('generates 33-dimensional normalized feature vectors for formation scenarios', () => {
      const spec = generateFormationScenario({ seed: 1234, difficulty: 0.4 });

      expect(spec.features).toHaveLength(33);
      // Unit length L2 norm
      const norm = Math.hypot(...spec.features);
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('enforces novelty filter rejection on identical candidate vector', () => {
      const spec = generateFormationScenario({ seed: 3333, difficulty: 0.35 });

      // Identical scenario vector has cosine 1.0 >= 0.85 -> NOT novel
      const novel = isNovel(spec.features, [spec.features]);
      expect(novel).toBe(false);
    });

    it('accepts distinct formation configurations as novel (< 0.85 similarity)', () => {
      const specLine = generateFormationScenario({
        seed: 4001,
        difficulty: 0.3,
        formationKind: 'LINE_ABREAST',
      });
      const specStack = generateFormationScenario({
        seed: 4002,
        difficulty: 0.3,
        formationKind: 'STACK',
      });

      const sim = computeCosineSimilarity(specLine.features, specStack.features);
      expect(sim).toBeLessThan(0.85);
      expect(isNovel(specLine.features, [specStack.features])).toBe(true);
    });

    it('retains and returns the last valid candidate when novelty is exhausted instead of throwing', () => {
      const blockingKinds = ['LINE_ABREAST', 'V_WEDGE', 'STACK', 'DECOY_LEAD'] as const;
      const historyFeatures = blockingKinds.map((k) =>
        generateFormationScenario({ seed: 100, formationKind: k, difficulty: 0.3 }).features
      );

      expect(() => {
        const fallbackSpec = generateFormationScenario({
          seed: 5555,
          difficulty: 0.3,
          historyFeatures,
        });
        expect(fallbackSpec).toBeDefined();
        expect(fallbackSpec.formations).toBeDefined();
        expect(fallbackSpec.formations?.length).toBeGreaterThan(0);
        expect(validateDetailed(fallbackSpec).valid).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Live Operator Airgap vs AAR Truth Gating', () => {
    it('strictly hides formation metadata from live console trackRows', () => {
      const spec = generateFormationScenario({
        seed: 9999,
        difficulty: 0.3,
        formationKind: 'V_WEDGE',
      });

      const engine = new SimEngine();
      engine.load(spec);
      // Advance simulation several ticks so tracks are initiated
      for (let i = 0; i < 40; i++) {
        engine.step();
      }

      const snapshot = engine.buildUiSnapshot();
      expect(snapshot.trackRows.length).toBeGreaterThan(0);

      // Verify each live track row contains ONLY operator-visible telemetry
      for (const row of snapshot.trackRows) {
        expect(row).not.toHaveProperty('formation');
        expect(row).not.toHaveProperty('trueClass');
        expect(row).not.toHaveProperty('droneType');
        expect(row).not.toHaveProperty('waypoints');
        expect(row).toHaveProperty('trackNo');
        expect(row).toHaveProperty('rangeKm');
        expect(row).toHaveProperty('bearingDeg');
        expect(row).toHaveProperty('speedMps');
      }
    });

    it('exposes ground-truth formation metadata in post-session AAR replay', () => {
      const spec = generateFormationScenario({
        seed: 9999,
        difficulty: 0.3,
        formationKind: 'LINE_ABREAST',
      });

      const engine = new SimEngine();
      engine.load(spec);
      // Run at least 40 ticks so track initiation and periodic snapshots occur
      for (let i = 0; i < 40; i++) {
        engine.step();
      }

      // Capture recorded events
      const events = [...engine.events];
      const replayState = reconstructAarReplayState(events, 1000, spec);

      expect(replayState.tracks.length).toBeGreaterThan(0);
      const leadTrack = replayState.tracks.find((t) => t.id === 'H-LEAD-1');
      expect(leadTrack).toBeDefined();
      expect(leadTrack?.formation).toBeDefined();
      expect(leadTrack?.formation?.kind).toBe('LINE_ABREAST');
      expect(leadTrack?.formation?.leaderId).toBe('H-LEAD-1');
    });
  });

  describe('Director generateScenario with Formations Option', () => {
    it('generates a valid formation scenario when useFormations is true', () => {
      const spec = generateScenario('TRAINEE-FORMATION', 1, 0.4, [], 0, {
        useFormations: true,
        formationKind: 'V_WEDGE',
        spacingM: 100,
      });

      expect(spec.formations).toBeDefined();
      expect(spec.formations).toHaveLength(1);
      expect(spec.formations![0].kind).toBe('V_WEDGE');
      expect(spec.threats.length).toBeGreaterThanOrEqual(2);
      expect(spec.threats[0].formation?.kind).toBe('V_WEDGE');
      expect(validate(spec)).toBe(true);
    });

    it('returns last valid candidate with formations intact when novelty is exhausted in generateScenario', () => {
      const initial = generateScenario('TRAINEE-FORMATION', 1, 0.4, [], 0, {
        useFormations: true,
        formationKind: 'V_WEDGE',
        spacingM: 100,
      });

      const spec = generateScenario('TRAINEE-FORMATION', 1, 0.4, [initial.features], 0, {
        useFormations: true,
        formationKind: 'V_WEDGE',
        spacingM: 100,
      });

      expect(spec.formations).toBeDefined();
      expect(spec.formations).toHaveLength(1);
      expect(spec.formations![0].kind).toBe('V_WEDGE');
      expect(spec.threats.length).toBeGreaterThanOrEqual(2);
      expect(validate(spec)).toBe(true);
    });
  });
});

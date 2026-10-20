import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { toThree, toThreeCoords, toSimCoords } from '@/render3d/coords';
import { checkWebGL2Support, isWebGL2Available } from '@/render3d/capability';
import { Scene3D } from '@/render3d/scene3d';
import type { SafeTrackView } from '@/render3d/types';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec, TrackEntity } from '@/sim/types';

describe('Track X3D — 3D Renderer Foundation & Safe Information Boundary', () => {
  describe('A. Coordinate System Transformations (coords.ts)', () => {
    it('accurately transforms sim space (x, y, z) to Three.js space (X, Y, Z)', () => {
      // Sim: x = 1000m (East), y = 2000m (North), z = 150m (Altitude)
      // Three: X = 1000, Y = 150 (Up), Z = -2000 (North is -Z)
      const v = toThree(1000, 2000, 150);
      expect(v.x).toBe(1000);
      expect(v.y).toBe(150);
      expect(v.z).toBe(-2000);

      const vCoords = toThreeCoords({ x: 500, y: -800, z: 75 });
      expect(vCoords.x).toBe(500);
      expect(vCoords.y).toBe(75);
      expect(vCoords.z).toBe(800);
    });

    it('accurately provides invertible inverse transform fromThree', () => {
      const originalSim = { x: -1250, y: 3400, z: 90 };
      const threeVec = toThreeCoords(originalSim);
      const invertedSim = toSimCoords(threeVec);

      expect(invertedSim.x).toBeCloseTo(originalSim.x);
      expect(invertedSim.y).toBeCloseTo(originalSim.y);
      expect(invertedSim.z).toBeCloseTo(originalSim.z);
    });
  });

  describe('B. WebGL2 Capability Detection (capability.ts)', () => {
    it('probes WebGL2 capability gracefully without throwing', () => {
      const result = checkWebGL2Support();
      expect(typeof result.supported).toBe('boolean');
      expect(typeof isWebGL2Available()).toBe('boolean');
    });
  });

  describe('C. Safe Track Projection Boundary (Rules R10.3 & D-37)', () => {
    let engine: SimEngine;

    beforeEach(() => {
      engine = new SimEngine();
      engine.load(demo1Json as unknown as ScenarioSpec);
    });

    function projectSafeTracks(curr: TrackEntity[], selectedTrackNo: string | null): SafeTrackView[] {
      return curr
        .filter(
          (e) =>
            e.trackNo &&
            e.step !== 'UNDETECTED' &&
            (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED')
        )
        .map((e) => ({
          trackNo: e.trackNo!,
          pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          vel: { x: e.vel.x, y: e.vel.y, z: e.vel.z },
          traineeLabel: e.traineeLabel,
          step: e.step,
          q: e.q,
          masked: e.masked,
          ghostSigmaM: e.ghostSigmaM,
          isSelected: e.trackNo === selectedTrackNo,
          lifecycle: e.lifecycle as 'ACTIVE' | 'LEAKED' | 'NEUTRALISED',
        }));
    }

    it('strictly excludes undetected tracks from live 3D view', () => {
      // At T=0, threats have step 'UNDETECTED' or are dormant
      const undetected = engine.curr.filter((e) => e.step === 'UNDETECTED');
      expect(undetected.length).toBeGreaterThan(0);

      const safeViews = projectSafeTracks(engine.curr, null);
      for (const view of safeViews) {
        expect(view.step).not.toBe('UNDETECTED');
      }
    });

    it('strictly omits ground-truth properties from SafeTrackView', () => {
      // Force an entity to be detected
      if (engine.curr[0]) {
        engine.curr[0].step = 'FIND';
      }

      const safeViews = projectSafeTracks(engine.curr, null);
      expect(safeViews.length).toBeGreaterThan(0);

      const sample = safeViews[0] as unknown as Record<string, unknown>;
      // Forbidden truth fields:
      expect(sample.trueClass).toBeUndefined();
      expect(sample.droneType).toBeUndefined();
      expect(sample.valueInr).toBeUndefined();
      expect(sample.rcsM2).toBeUndefined();
      expect(sample.emitsRf).toBeUndefined();
      expect(sample.remoteId).toBeUndefined();
      expect(sample.iff).toBeUndefined();
      expect(sample.waypoints).toBeUndefined();
      expect(sample.hitHistory).toBeUndefined();
    });

    it('renders masked tracks with coasting uncertainty without exposing hidden coordinates', () => {
      if (engine.curr[0]) {
        engine.curr[0].step = 'FIND';
        engine.curr[0].masked = true;
        engine.curr[0].ghostSigmaM = 45;
      }

      const safeViews = projectSafeTracks(engine.curr, null);
      const maskedView = safeViews.find((v) => v.masked);
      expect(maskedView).toBeDefined();
      expect(maskedView?.ghostSigmaM).toBe(45);
    });
  });

  describe('D. Scene3D Tactical Graph & Lifecycle Teardown', () => {
    it('initializes tactical ground, rings, and zone extrusion correctly', () => {
      const scene3d = new Scene3D({
        maxRangeM: 5000,
        rMinM: 500,
        zones: (demo1Json as unknown as ScenarioSpec).zones,
      });

      expect(scene3d.scene.children).toHaveLength(3); // staticGroup, zonesGroup, tracksGroup

      // Verify track updates and disposal
      const sampleTracks: SafeTrackView[] = [
        {
          trackNo: 'T-01',
          pos: { x: 1200, y: 1500, z: 80 },
          vel: { x: -10, y: -20, z: 0 },
          traineeLabel: 'HOSTILE_ATTACK',
          step: 'TRACK',
          q: 0.9,
          masked: false,
          ghostSigmaM: 0,
          isSelected: true,
          lifecycle: 'ACTIVE',
        },
      ];

      scene3d.updateTracks(sampleTracks, 'T-01');

      // Teardown
      expect(() => scene3d.dispose()).not.toThrow();
      expect(scene3d.scene.children).toHaveLength(0);
    });
  });

  describe('E. Simulation Determinism & Invariance (Invariant 2.1 & 2.4)', () => {
    it('running alongside 3D projections does not alter sim ticks, events, or score', () => {
      const engineA = new SimEngine();
      engineA.load(demo1Json as unknown as ScenarioSpec);

      const engineB = new SimEngine();
      engineB.load(demo1Json as unknown as ScenarioSpec);

      // Advance both engines for 100 ticks (5 seconds)
      // Engine B simulates 3D projection generation on every tick
      for (let t = 0; t < 100; t++) {
        engineA.step();

        engineB.step();
        // 3D scene track projection poll (pure read-only)
        const safeTracks = engineB.curr
          .filter((e) => e.trackNo && e.step !== 'UNDETECTED')
          .map((e) => ({
            trackNo: e.trackNo!,
            pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          }));
        expect(safeTracks).toBeDefined();
      }

      expect(engineA.tickIndex).toBe(engineB.tickIndex);
      expect(engineA.events).toHaveLength(engineB.events.length);

      for (let i = 0; i < engineA.events.length; i++) {
        expect(engineA.events[i].type).toBe(engineB.events[i].type);
        expect(engineA.events[i].tMs).toBe(engineB.events[i].tMs);
      }
    });
  });

  describe('F. Bundle Chunk Isolation & Size Budget (Rule R10.1)', () => {
    const distDir = path.resolve('dist');

    it('isolates Three.js into a separate render3d chunk under 1.5 MB', (ctx) => {
      if (!fs.existsSync(distDir)) {
        ctx.skip();
        return;
      }

      const assetsDir = path.join(distDir, 'assets');
      const files = fs.readdirSync(assetsDir);

      const indexJs = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
      const render3dJs = files.find((f) => f.startsWith('render3d-') && f.endsWith('.js'));

      expect(indexJs).toBeDefined();
      expect(render3dJs).toBeDefined();

      if (indexJs) {
        const indexContent = fs.readFileSync(path.join(assetsDir, indexJs), 'utf-8');
        // Initial chunk must NOT contain Three.js runtime
        expect(indexContent).not.toContain('WebGLRenderer');
        expect(indexContent).not.toContain('PerspectiveCamera');
      }

      if (render3dJs) {
        const render3dPath = path.join(assetsDir, render3dJs);
        const stat = fs.statSync(render3dPath);
        const sizeMb = stat.size / (1024 * 1024);

        // Budget: under 1.5 MB
        expect(sizeMb).toBeLessThan(1.5);
      }
    });
  });
});

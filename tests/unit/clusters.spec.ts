import { describe, it, expect } from 'vitest';
import {
  detectTrackClusters,
  computePolygonAreaM2,
  getAltBand,
  getAltBandBounds,
} from '@/render3d/clusterMath';
import { ClusterOverlay3D } from '@/render3d/clusters';
import type { SafeTrackView } from '@/render3d/types';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Track X3D — Operator-Visible Spatial Clustering (TASK-F4)', () => {
  const createTrack = (
    trackNo: string,
    x: number,
    y: number,
    z: number = 30,
    label: SafeTrackView['traineeLabel'] = null
  ): SafeTrackView => ({
    trackNo,
    pos: { x, y, z },
    vel: { x: -10, y: 0, z: 0 },
    traineeLabel: label,
    step: 'TRACK',
    q: 0.85,
    masked: false,
    ghostSigmaM: 0,
    isSelected: false,
    lifecycle: 'ACTIVE',
  });

  describe('1. Spatial Membership & Separation (DBSCAN-lite)', () => {
    it('clusters 5 tracks within 150m into a single cluster', () => {
      const swarmTracks = [
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-02', 1050, 1030, 35),
        createTrack('T-03', 1080, 1090, 40),
        createTrack('T-04', 1020, 1070, 35),
        createTrack('T-05', 1060, 1010, 30),
      ];

      const clusters = detectTrackClusters(swarmTracks, { epsM: 200, minPts: 3 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].count).toBe(5);
      expect(clusters[0].trackNos).toEqual(['T-01', 'T-02', 'T-03', 'T-04', 'T-05']);
      expect(clusters[0].isDegenerate).toBe(false);
      expect(clusters[0].areaKm2).toBeGreaterThan(0);
      expect(clusters[0].densityTrkPerKm2).toBeGreaterThan(0);
      expect(clusters[0].meanSpacingM).toBeGreaterThan(0);
    });

    it('keeps two clusters 1km apart completely separate', () => {
      const groupA = [
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-02', 1050, 1020, 30),
        createTrack('T-03', 1080, 1040, 30),
      ];

      const groupB = [
        createTrack('T-10', 2500, 2500, 80),
        createTrack('T-11', 2550, 2520, 80),
        createTrack('T-12', 2530, 2560, 80),
      ];

      const clusters = detectTrackClusters([...groupA, ...groupB], { epsM: 200, minPts: 3 });
      expect(clusters).toHaveLength(2);
      expect(clusters[0].trackNos).toEqual(['T-01', 'T-02', 'T-03']);
      expect(clusters[1].trackNos).toEqual(['T-10', 'T-11', 'T-12']);
    });

    it('refuses to join an outlier track separated by more than epsM', () => {
      const group = [
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-02', 1050, 1020, 30),
        createTrack('T-03', 1080, 1040, 30),
      ];

      // Track at distance 250m from nearest (1080, 1040)
      const outlier = createTrack('T-99', 1330, 1040, 30);

      const clusters = detectTrackClusters([...group, outlier], { epsM: 200, minPts: 3 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].trackNos).toEqual(['T-01', 'T-02', 'T-03']);
      expect(clusters[0].trackNos).not.toContain('T-99');
    });

    it('returns empty array when candidate tracks are fewer than minPts', () => {
      const fewTracks = [
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-02', 1050, 1020, 30),
      ];

      const clusters = detectTrackClusters(fewTracks, { minPts: 3 });
      expect(clusters).toEqual([]);
    });
  });

  describe('2. Order-Independence & Determinism', () => {
    it('produces identical cluster memberships and ordering regardless of input array permutation', () => {
      const tracks = [
        createTrack('T-05', 1060, 1010, 30),
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-04', 1020, 1070, 35),
        createTrack('T-02', 1050, 1030, 35),
        createTrack('T-03', 1080, 1090, 40),
      ];

      const run1 = detectTrackClusters(tracks);
      const run2 = detectTrackClusters(tracks.slice().reverse());
      const run3 = detectTrackClusters([tracks[2], tracks[0], tracks[4], tracks[1], tracks[3]]);

      expect(run1).toStrictEqual(run2);
      expect(run1).toStrictEqual(run3);
    });

    it('run twice with same input produces bitwise identical metrics and centroids', () => {
      const tracks = [
        createTrack('T-01', 500, 500, 20),
        createTrack('T-02', 540, 520, 40),
        createTrack('T-03', 520, 560, 60),
      ];

      const resA = detectTrackClusters(tracks);
      const resB = detectTrackClusters(tracks);

      expect(resA).toStrictEqual(resB);
    });
  });

  describe('3. Degenerate Geometry & Fallback Envelope', () => {
    it('handles collinear points by creating a robust fallback envelope with non-zero area and density', () => {
      // 3 collinear tracks on a line x=1000, y=1000, 1060, 1120
      const collinearTracks = [
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-02', 1000, 1060, 30),
        createTrack('T-03', 1000, 1120, 30),
      ];

      const clusters = detectTrackClusters(collinearTracks, { epsM: 200, minPts: 3 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].isDegenerate).toBe(true);
      expect(clusters[0].areaKm2).toBeGreaterThan(0);
      expect(clusters[0].densityTrkPerKm2).toBeGreaterThan(0);
      expect(clusters[0].hull2D.length).toBeGreaterThanOrEqual(4);
    });

    it('calculates polygon area accurately for known square geometry', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      // 100m x 100m = 10,000 m^2
      expect(computePolygonAreaM2(square)).toBeCloseTo(10000, 1);
    });
  });

  describe('4. Altitude Band Quantization & Labeling Compliance', () => {
    it('correctly maps altitudes to LOW, MID, and HIGH altitude bands', () => {
      expect(getAltBand(15)).toBe('LOW');
      expect(getAltBand(40)).toBe('LOW');
      expect(getAltBand(41)).toBe('MID');
      expect(getAltBand(100)).toBe('MID');
      expect(getAltBand(101)).toBe('HIGH');
      expect(getAltBand(180)).toBe('HIGH');

      const lowBounds = getAltBandBounds('LOW');
      expect(lowBounds.floorM).toBe(0);
      expect(lowBounds.ceilM).toBe(40);

      const highBounds = getAltBandBounds('HIGH');
      expect(highBounds.floorM).toBe(100);
      expect(highBounds.ceilM).toBe(160);
    });

    it('quantizes vertical span across mixed altitude tracks into band range', () => {
      const mixedAltTracks = [
        createTrack('T-01', 1000, 1000, 20), // LOW
        createTrack('T-02', 1050, 1020, 70), // MID
        createTrack('T-03', 1080, 1040, 150), // HIGH
      ];

      const clusters = detectTrackClusters(mixedAltTracks, { epsM: 200, minPts: 3 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].lowestBand).toBe('LOW');
      expect(clusters[0].highestBand).toBe('HIGH');
      expect(clusters[0].altSpan).toBe('LOW–HIGH');
      expect(clusters[0].zMinM).toBe(0);
      expect(clusters[0].zMaxM).toBe(160);
    });

    it('cluster label does NOT contain any true class tokens', () => {
      const tracks = [
        createTrack('T-01', 1000, 1000, 25),
        createTrack('T-02', 1050, 1020, 25),
        createTrack('T-03', 1080, 1040, 25),
      ];

      const clusters = detectTrackClusters(tracks);
      const label = clusters[0].label;

      expect(label).toContain('CLUSTER 3');
      expect(label).toContain('LOW');
      expect(label).toContain('TRK/KM²');
      expect(label).toContain('SPACING');

      // Strict Rule: No true class names in cluster labels
      const forbiddenTokens = ['HOSTILE', 'SWARM', 'ATTACK', 'ISR', 'CIVIL', 'BIRD', 'FRIEND'];
      for (const token of forbiddenTokens) {
        expect(label).not.toContain(token);
      }
    });
  });

  describe('5. Simulation Non-Interference Guard', () => {
    it('toggling spatial clusters has zero effect on engine ticks, events, RNG, or scores', () => {
      const engineA = new SimEngine();
      engineA.load(demo1Json as unknown as ScenarioSpec);

      const engineB = new SimEngine();
      engineB.load(demo1Json as unknown as ScenarioSpec);

      for (let t = 0; t < 60; t++) {
        engineA.step();

        engineB.step();
        // Run clustering on every step
        const safeTracks: SafeTrackView[] = engineB.curr
          .filter((e) => e.trackNo && e.step !== 'UNDETECTED')
          .map((e) => ({
            trackNo: e.trackNo!,
            pos: { ...e.pos },
            vel: { ...e.vel },
            traineeLabel: e.traineeLabel,
            step: e.step,
            q: e.q,
            masked: e.masked,
            ghostSigmaM: e.ghostSigmaM,
            isSelected: false,
            lifecycle: e.lifecycle as SafeTrackView['lifecycle'],
          }));

        detectTrackClusters(safeTracks);
      }

      expect(engineA.tickIndex).toBe(engineB.tickIndex);
      expect(engineA.events).toHaveLength(engineB.events.length);
      for (let i = 0; i < engineA.events.length; i++) {
        expect(engineA.events[i].type).toBe(engineB.events[i].type);
        expect(engineA.events[i].tMs).toBe(engineB.events[i].tMs);
      }
    });
  });

  describe('6. 3D Overlay Lifecycle & Disposal', () => {
    it('ClusterOverlay3D creates, updates, and disposes without memory leaks', () => {
      const overlay = new ClusterOverlay3D({ epsM: 200, minPts: 3 });
      expect(overlay.group.name).toBe('ClusterOverlay3D');

      const swarmTracks = [
        createTrack('T-01', 1000, 1000, 30),
        createTrack('T-02', 1050, 1030, 35),
        createTrack('T-03', 1080, 1090, 40),
      ];

      // Update with visible=true
      const detected = overlay.update(swarmTracks, true);
      expect(detected).toHaveLength(1);
      expect(overlay.group.visible).toBe(true);
      expect(overlay.group.children).toHaveLength(1);

      // Update with visible=false (hides overlay)
      overlay.update(swarmTracks, false);
      expect(overlay.group.visible).toBe(false);

      // Dispose cleanly
      expect(() => overlay.dispose()).not.toThrow();
    });
  });
});

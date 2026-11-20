import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TargetModelFactory,
  resolveTargetModelCategory,
  type TargetModelCategory,
} from '@/render3d/targets';
import type { SafeTrackView } from '@/render3d/types';

describe('Target 3D Models & Ground-Truth Protection (Task 17 Phase 1)', () => {
  let factory: TargetModelFactory;

  beforeEach(() => {
    factory = new TargetModelFactory();
  });

  afterEach(() => {
    factory.dispose();
  });

  describe('TargetModelFactory instantiation and tagging', () => {
    const categories: TargetModelCategory[] = [
      'HOSTILE_ATTACK',
      'HOSTILE_ISR',
      'SWARM_ELEMENT',
      'CIVIL_UAS',
      'FRIENDLY',
      'BIRD',
      'UNKNOWN',
    ];

    it.each(categories)('generates robust 3D model for category %s', (cat) => {
      const model = factory.createModel(cat, 'TRK-01');
      expect(model.rootGroup).toBeDefined();
      expect(model.bodyMesh).toBeDefined();
      expect(model.accentMesh).toBeDefined();
      expect(model.hitProxy).toBeDefined();
      expect(model.category).toBe(cat);

      // Verify hit-testing userData tagging for raycasting
      expect(model.bodyMesh.userData.trackNo).toBe('TRK-01');
      expect(model.accentMesh.userData.trackNo).toBe('TRK-01');
      expect(model.hitProxy.userData.trackNo).toBe('TRK-01');
      expect(model.hitProxy.userData.targetCategory).toBe(cat);
    });

    it('generates multirotor variants with rotor discs', () => {
      const fpv = factory.createModel('HOSTILE_ATTACK', 'TRK-02');
      expect(fpv.animatedComponents).toBeDefined();
      expect(fpv.animatedComponents!.length).toBeGreaterThanOrEqual(1);

      const swarm = factory.createModel('SWARM_ELEMENT', 'TRK-03');
      expect(swarm.animatedComponents).toBeDefined();
      expect(swarm.animatedComponents!.length).toBeGreaterThanOrEqual(1);
    });

    it('generates fixed-wing bird model with organic geometry', () => {
      const bird = factory.createModel('BIRD', 'TRK-BIRD');
      expect(bird.category).toBe('BIRD');
      expect(bird.group.children.length).toBeGreaterThan(0);
    });
  });

  describe('Strict Ground-Truth Protection (Rules R3.3, R3.4)', () => {
    const makeTrack = (traineeLabel: SafeTrackView['traineeLabel']): SafeTrackView => ({
      trackNo: 'TRK-10',
      pos: { x: 1000, y: 1000, z: 150 },
      vel: { x: 10, y: 0, z: 0 },
      q: 0.85,
      traineeLabel,
      step: 'TRACK',
      isSelected: false,
      masked: false,
      ghostSigmaM: 0,
      lifecycle: 'ACTIVE',
    });

    it('displays neutral UNKNOWN contact beacon when unclassified', () => {
      const track = makeTrack(null);
      const category = resolveTargetModelCategory(track);
      expect(category).toBe('UNKNOWN');
    });

    it('displays neutral UNKNOWN contact beacon when evidence insufficient', () => {
      const track = makeTrack('UNKNOWN_EVIDENCE_INSUFFICIENT');
      const category = resolveTargetModelCategory(track);
      expect(category).toBe('UNKNOWN');
    });

    it('strictly follows trainee assessment even if wrong (no truth leakage)', () => {
      // Operator mistakenly classified an incoming FPV attack drone as a civilian drone
      const track = makeTrack('CIVIL_UAS');
      const category = resolveTargetModelCategory(track);

      // Visuals must confirm operator choice ('CIVIL_UAS'), NOT reveal hostile truth
      expect(category).toBe('CIVIL_UAS');
    });

    it('displays threat model when operator classifies as threat', () => {
      const track = makeTrack('HOSTILE_ATTACK');
      const category = resolveTargetModelCategory(track);
      expect(category).toBe('HOSTILE_ATTACK');
    });

    it('projects ground truth only in post-session AAR when explicitly authorized', () => {
      const track = makeTrack('CIVIL_UAS'); // Operator assessed as civil

      // AAR with authorized truth revelation
      const category = resolveTargetModelCategory(track, {
        revealTruth: true,
        truthClass: 'HOSTILE_ATTACK',
      });

      expect(category).toBe('HOSTILE_ATTACK');
    });
  });
});

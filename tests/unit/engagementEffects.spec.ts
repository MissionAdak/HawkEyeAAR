import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  EngagementEffectManager,
  createEngagementEffect,
} from '@/render3d/effects';
import type { SimEvent } from '@/sim/types';

describe('3D Engagement Animations & AAR Scrubbing (Task 17 Phase 2 & 3)', () => {
  let manager: EngagementEffectManager;

  beforeEach(() => {
    manager = new EngagementEffectManager();
  });

  it('instantiates weapon effects for all 5 effectors', () => {
    const originPos = new THREE.Vector3(0, 10, 0);
    const targetPos = new THREE.Vector3(500, 100, -800);

    const gun = createEngagementEffect({
      id: 'eff-gun',
      seq: 1,
      effectorId: 'GUN',
      trackNo: 'TRK-01',
      startTMs: 1000,
      originPos,
      targetPos,
      killed: true,
    });
    expect(gun.effectorId).toBe('GUN');
    expect(gun.group.children.length).toBeGreaterThan(0);
    gun.dispose();

    const laser = createEngagementEffect({
      id: 'eff-laser',
      seq: 2,
      effectorId: 'LASER',
      trackNo: 'TRK-02',
      startTMs: 1000,
      originPos,
      targetPos,
      killed: true,
    });
    expect(laser.effectorId).toBe('LASER');
    laser.dispose();

    const rf = createEngagementEffect({
      id: 'eff-rf',
      seq: 3,
      effectorId: 'RF_SOFTKILL',
      trackNo: 'TRK-03',
      startTMs: 1000,
      originPos,
      targetPos,
      killed: false,
    });
    expect(rf.effectorId).toBe('RF_SOFTKILL');
    rf.dispose();

    const interceptor = createEngagementEffect({
      id: 'eff-int',
      seq: 4,
      effectorId: 'INTERCEPTOR',
      trackNo: 'TRK-04',
      startTMs: 1000,
      originPos,
      targetPos,
      killed: true,
    });
    expect(interceptor.effectorId).toBe('INTERCEPTOR');
    interceptor.dispose();

    const missile = createEngagementEffect({
      id: 'eff-mis',
      seq: 5,
      effectorId: 'MISSILE',
      trackNo: 'TRK-05',
      startTMs: 1000,
      originPos,
      targetPos,
      killed: true,
    });
    expect(missile.effectorId).toBe('MISSILE');
    missile.dispose();
  });

  it('synchronizes engagement animations from ENGAGE event stream', () => {
    const events: SimEvent[] = [
      {
        seq: 1,
        tMs: 500,
        type: 'ENGAGE',
        payload: {
          trackNo: 'TRK-01',
          effector: 'GUN',
          hit: true,
          pk: 0.85,
        },
      },
      {
        seq: 2,
        tMs: 800,
        type: 'ENGAGE',
        payload: {
          trackNo: 'TRK-02',
          effector: 'LASER',
          hit: false,
          pk: 0.70,
        },
      },
    ];

    const getPos = (trk: string) => {
      if (trk === 'TRK-01') return new THREE.Vector3(400, 150, -500);
      if (trk === 'TRK-02') return new THREE.Vector3(700, 200, -900);
      return null;
    };

    // At t=400ms: no events active
    manager.syncEvents(events, 400, getPos);
    expect(manager.group.children.length).toBe(0);

    // At t=600ms: event 1 active
    manager.syncEvents(events, 600, getPos);
    expect(manager.group.children.length).toBe(1);

    // At t=900ms: events 1 and 2 active
    manager.syncEvents(events, 900, getPos);
    expect(manager.group.children.length).toBe(2);
  });

  it('strictly ignores RELEASE_BLOCKED events (no fire animation on blocked release)', () => {
    const events: SimEvent[] = [
      {
        seq: 1,
        tMs: 500,
        type: 'RELEASE_BLOCKED',
        payload: {
          trackNo: 'TRK-01',
          effector: 'GUN',
          reason: 'Q_MIN_VIOLATION',
        },
      },
    ];

    manager.syncEvents(events, 600, () => new THREE.Vector3(400, 100, -300));
    expect(manager.group.children.length).toBe(0);
  });

  it('supports deterministic scrubbing in AAR (prunes future effects on scrub backward)', () => {
    const events: SimEvent[] = [
      {
        seq: 1,
        tMs: 1000,
        type: 'ENGAGE',
        payload: { trackNo: 'TRK-01', effector: 'MISSILE', hit: true },
      },
      {
        seq: 2,
        tMs: 2000,
        type: 'ENGAGE',
        payload: { trackNo: 'TRK-02', effector: 'GUN', hit: true },
      },
    ];

    const getPos = () => new THREE.Vector3(500, 100, -500);

    // Forward to t=2500ms
    manager.syncEvents(events, 2500, getPos);
    expect(manager.group.children.length).toBe(2);

    // Scrub back to t=1500ms -> event 2 (at 2000ms) should be purged
    manager.syncEvents(events, 1500, getPos);
    expect(manager.group.children.length).toBe(1);

    // Scrub back to t=500ms -> all purged
    manager.syncEvents(events, 500, getPos);
    expect(manager.group.children.length).toBe(0);

    // Scrub forward again to t=3000ms -> re-synchronizes cleanly
    manager.syncEvents(events, 3000, getPos);
    expect(manager.group.children.length).toBe(2);
  });

  it('updates effect animation frames without throwing', () => {
    const events: SimEvent[] = [
      {
        seq: 1,
        tMs: 100,
        type: 'ENGAGE',
        payload: { trackNo: 'TRK-01', effector: 'LASER', hit: true },
      },
    ];
    manager.syncEvents(events, 200, () => new THREE.Vector3(300, 50, -400));
    expect(() => {
      manager.update({ simMs: 300, isFogActive: true, isNight: true });
      manager.update({ simMs: 400, isFogActive: false, isNight: false });
    }).not.toThrow();
  });
});

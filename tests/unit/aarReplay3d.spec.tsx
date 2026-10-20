import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import {
  reconstructAarReplayState,
  extractKeyReplayEvents,
  convertToReplayEntities,
} from '@/ui/aar/aarReplayData';
import { AarReplaySection } from '@/ui/aar/AarReplaySection';
import { AarScene3D } from '@/render3d/aarScene3d';
import type { SimEvent, ScenarioSpec, ZoneSpec } from '@/sim/types';
import demo1Json from '@/director/bundled/demo1.json';

describe('Post-Session 3D AAR Replay (TASK-F7)', () => {
  const dummyZones: ZoneSpec[] = [
    {
      id: 'Z-URBAN-1',
      type: 'URBAN',
      polygon: [
        [1000, 1000],
        [1500, 1000],
        [1500, 1500],
        [1000, 1500],
      ],
      heightM: 40,
      shadowM: 800,
      rho: 0.8,
    },
  ];

  const dummyEventsWithSnapshots: SimEvent[] = [
    { seq: 1, tMs: 0, type: 'SIM_START', payload: {} },
    {
      seq: 2,
      tMs: 250,
      type: 'SNAPSHOT',
      payload: {
        entities: [
          {
            id: 'T1',
            tNo: 'T-01',
            x: 2400,
            y: 2400,
            z: 120,
            step: 'FIND',
            q: 0.85,
            lbl: 'NONE',
            trueClass: 'HOSTILE_ATTACK',
          },
          {
            id: 'T2',
            tNo: 'T-02',
            x: -800,
            y: 1600,
            z: 40,
            step: 'FIX',
            q: 0.90,
            lbl: 'CIVIL_UAS',
            trueClass: 'CIVIL_UAS',
          },
        ],
      },
    },
    {
      seq: 3,
      tMs: 500,
      type: 'SNAPSHOT',
      payload: {
        entities: [
          {
            id: 'T1',
            tNo: 'T-01',
            x: 2380,
            y: 2380,
            z: 120,
            step: 'TRACK',
            q: 0.90,
            lbl: 'HOSTILE_ATTACK',
            trueClass: 'HOSTILE_ATTACK',
          },
          {
            id: 'T2',
            tNo: 'T-02',
            x: -780,
            y: 1600,
            z: 40,
            step: 'TARGET',
            q: 0.92,
            lbl: 'CIVIL_UAS',
            trueClass: 'CIVIL_UAS',
          },
        ],
      },
    },
    {
      seq: 4,
      tMs: 750,
      type: 'MASKED',
      trackNo: 'T-01',
      entityId: 'T1',
      payload: {
        zoneId: 'Z-URBAN-1',
        thetaT: 0.12,
        thetaMask: 0.15,
      },
    },
    {
      seq: 5,
      tMs: 750,
      type: 'SNAPSHOT',
      payload: {
        entities: [
          {
            id: 'T1',
            tNo: 'T-01',
            x: 2360,
            y: 2360,
            z: 20,
            step: 'TRACK',
            q: 0.70,
            lbl: 'HOSTILE_ATTACK',
            trueClass: 'HOSTILE_ATTACK',
          },
        ],
      },
    },
    {
      seq: 6,
      tMs: 1250,
      type: 'REACQUIRE',
      trackNo: 'T-01',
      entityId: 'T1',
      payload: {
        zoneId: 'Z-URBAN-1',
        thetaT: 0.18,
        thetaMask: 0.15,
      },
    },
    {
      seq: 7,
      tMs: 1500,
      type: 'ENGAGE',
      trackNo: 'T-01',
      entityId: 'T1',
      payload: {
        effector: 'GUN',
        rangeM: 1200,
        pk: 0.75,
        u: 0.32,
        killed: true,
        targetPos: { x: 2300, y: 2300, z: 20 },
      },
    },
    {
      seq: 8,
      tMs: 2000,
      type: 'SESSION_END',
      payload: {
        durationMs: 2000,
      },
    },
  ];

  describe('1. Reconstructed State Accuracy & Snapshot Playhead Synchronization', () => {
    it('accurately reconstructs truth position, trueClass, altitude, and historical trail at requested tick', () => {
      const state500 = reconstructAarReplayState(dummyEventsWithSnapshots, 500);

      expect(state500.hasSnapshotHistory).toBe(true);
      expect(state500.tracks).toHaveLength(2);

      const t1 = state500.tracks.find((t) => t.trackNo === 'T-01');
      expect(t1).toBeDefined();
      expect(t1!.truthPos.x).toBe(2380);
      expect(t1!.truthPos.y).toBe(2380);
      expect(t1!.truthPos.z).toBe(120);
      expect(t1!.trueClass).toBe('HOSTILE_ATTACK');
      expect(t1!.traineeLabel).toBe('HOSTILE_ATTACK');
      expect(t1!.step).toBe('TRACK');

      // Trail should include earlier position at t=250 and current at t=500
      expect(t1!.trail).toHaveLength(2);
      expect(t1!.trail[0].tMs).toBe(250);
      expect(t1!.trail[0].x).toBe(2400);
      expect(t1!.trail[1].tMs).toBe(500);
      expect(t1!.trail[1].x).toBe(2380);
    });

    it('correctly reports masking state and preserves recorded event without fabricating cut points', () => {
      const state750 = reconstructAarReplayState(dummyEventsWithSnapshots, 750);
      const t1 = state750.tracks.find((t) => t.trackNo === 'T-01');

      expect(t1).toBeDefined();
      expect(t1!.isMasked).toBe(true);
      expect(t1!.coastingSinceMs).toBe(750);

      // Active masking marker contains recorded zoneId and timestamp
      expect(state750.activeMaskingMarker).toBeDefined();
      expect(state750.activeMaskingMarker?.zoneId).toBe('Z-URBAN-1');
      expect(state750.activeMaskingMarker?.label).toContain('LOS SEVERED · Z-URBAN-1');
      // Must not fabricate synthetic cut points
      expect((state750.activeMaskingMarker as unknown as Record<string, unknown>).cutPoint).toBeUndefined();
    });

    it('accurately tracks recovery event (REACQUIRE) at its recorded timestamp', () => {
      const state1250 = reconstructAarReplayState(dummyEventsWithSnapshots, 1250);
      const t1 = state1250.tracks.find((t) => t.trackNo === 'T-01');

      expect(t1).toBeDefined();
      expect(t1!.isMasked).toBe(false);
      expect(state1250.activeMaskingMarker?.type).toBe('REACQUIRE');
      expect(state1250.activeMaskingMarker?.label).toContain('LOS RESTORED · Z-URBAN-1');
    });

    it('correctly maps reconstructed tracks to ReplayEntity items for 2D radar fallback', () => {
      const state500 = reconstructAarReplayState(dummyEventsWithSnapshots, 500);
      const entities = convertToReplayEntities(state500.tracks);

      expect(entities).toHaveLength(2);
      expect(entities[0].trackNo).toBe('T-01');
      expect(entities[0].pos.x).toBe(2380);
      expect(entities[0].trueClass).toBe('HOSTILE_ATTACK');
      expect(entities[0].traineeLabel).toBe('HOSTILE_ATTACK');
      expect(entities[1].trackNo).toBe('T-02');
      expect(entities[1].trueClass).toBe('CIVIL_UAS');
    });
  });

  describe('2. Negative & Boundary Guards (Zero Data Fabrication)', () => {
    it('refuses to fabricate fictional tracks when snapshot history is absent', () => {
      const eventsWithoutSnapshots: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: {} },
        { seq: 2, tMs: 1000, type: 'DETECT', trackNo: 'T-01', payload: { rangeM: 2000 } },
        { seq: 3, tMs: 5000, type: 'SESSION_END', payload: { durationMs: 5000 } },
      ];

      const state = reconstructAarReplayState(eventsWithoutSnapshots, 2500);
      expect(state.hasSnapshotHistory).toBe(false);
      expect(state.tracks).toEqual([]);
    });

    it('extracts key timeline events and allows direct seeking to event timestamps', () => {
      const keyEvents = extractKeyReplayEvents(dummyEventsWithSnapshots);
      expect(keyEvents.length).toBeGreaterThanOrEqual(3);

      const maskedEv = keyEvents.find((e) => e.type === 'MASKED');
      expect(maskedEv?.tMs).toBe(750);

      const engageEv = keyEvents.find((e) => e.type === 'ENGAGE');
      expect(engageEv?.tMs).toBe(1500);

      // Verify seeking to engageEv.tMs captures the engagement
      const stateAtEngage = reconstructAarReplayState(dummyEventsWithSnapshots, engageEv!.tMs);
      expect(stateAtEngage.activeEngagement).toBeDefined();
      expect(stateAtEngage.activeEngagement?.effector).toBe('GUN');
      expect(stateAtEngage.activeEngagement?.killed).toBe(true);
    });
  });

  describe('3. Architectural Truth Separation Guard (Rules R3.3, R10.3)', () => {
    it('strictly verifies live console and live 3D renderer files do NOT import AAR truth interfaces', () => {
      const srcDir = path.resolve('src');
      const liveFiles = [
        path.join(srcDir, 'ui', 'Console.tsx'),
        path.join(srcDir, 'render3d', 'renderer3d.ts'),
        path.join(srcDir, 'render3d', 'scene3d.ts'),
        path.join(srcDir, 'render3d', 'coverage.ts'),
        path.join(srcDir, 'render3d', 'effectorEnvelopes.ts'),
        path.join(srcDir, 'render3d', 'losVisualizer.ts'),
        path.join(srcDir, 'render3d', 'types.ts'),
      ];

      const forbiddenImports = [
        'aarReplayTypes',
        'AarReplayTruthTrack',
        'AarReplayState',
        'reconstructAarReplayState',
        'aarScene3d',
      ];

      for (const filePath of liveFiles) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const token of forbiddenImports) {
          expect(content).not.toContain(token);
        }
      }
    });
  });

  describe('4. Resource Management & Non-Leaking Lifecycle', () => {
    it('creates, updates, and disposes AarScene3D without resource leaks', () => {
      const aarScene = new AarScene3D(dummyZones, 5000, 500);
      expect(aarScene.scene).toBeDefined();

      const state1 = reconstructAarReplayState(dummyEventsWithSnapshots, 250);
      aarScene.update(state1, null);

      const state2 = reconstructAarReplayState(dummyEventsWithSnapshots, 500);
      aarScene.update(state2, 'T-01');

      const state3 = reconstructAarReplayState(dummyEventsWithSnapshots, 750);
      aarScene.update(state3, null);

      // Verify disposal cleans up cleanly without throwing
      expect(() => aarScene.dispose()).not.toThrow();
    });
  });

  describe('5. DOM Server-Side Render Verification', () => {
    it('renders server-side HTML of AarReplaySection with 2D radar baseline and toggle options', () => {
      const html = renderToString(
        <AarReplaySection
          events={dummyEventsWithSnapshots}
          spec={demo1Json as unknown as ScenarioSpec}
          zones={dummyZones}
        />
      );

      expect(html).toContain('SYNCHRONIZED AAR TIMELINE REPLAY');
      expect(html).toContain('2D RADAR');
      expect(html).toContain('3D TACTICAL');
      expect(html).toContain('[G] TRUTH: ON');
      expect(html).toContain('KEY EVENT TIMELINE');
    });
  });
});

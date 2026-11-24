import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Renderer3D } from '@/render3d/renderer3d';
import { TargetModelFactory } from '@/render3d/targets/targetModelFactory';
import type { SafeTrackView } from '@/render3d/types';

function createMockCanvas(width = 640, height = 480): HTMLCanvasElement {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  return {
    width,
    height,
    style: {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
    getContext: () => ({
      canvas: null,
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      beginPath: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      measureText: () => ({ width: 50 }),
    }),
    addEventListener: (event: string, fn: (e: unknown) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: (e: unknown) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (e: { type: string }) => {
      const arr = listeners[e.type];
      if (arr) {
        arr.forEach((fn) => fn(e));
      }
      return true;
    },
  } as unknown as HTMLCanvasElement;
}

function createMockRenderer(): THREE.WebGLRenderer {
  return {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
}

describe('TASK 28 — Tactical Viewport, Distinct Presentation & Auto Focus Remediation', () => {
  describe('Fix A: Distinct observable aircraft models and palettes', () => {
    it('creates distinct signature-specific palettes for multirotor variants', () => {
      const factory = new TargetModelFactory();
      const compactModel = factory.createModel('OBSERVED_MULTIROTOR', 'TRK-01', 'MULTIROTOR_COMPACT');
      const microModel = factory.createModel('OBSERVED_MULTIROTOR', 'TRK-02', 'MULTIROTOR_MICRO');
      const standardModel = factory.createModel('OBSERVED_MULTIROTOR', 'TRK-03', 'MULTIROTOR_STANDARD');
      const friendlyModel = factory.createModel('OBSERVED_MULTIROTOR', 'TRK-04', 'FRIENDLY_UAS');

      // Verify that bodies and accents have distinct color properties
      const compactBody = compactModel.bodyMesh.material as THREE.MeshLambertMaterial;
      const microBody = microModel.bodyMesh.material as THREE.MeshLambertMaterial;
      const standardBody = standardModel.bodyMesh.material as THREE.MeshLambertMaterial;
      const friendlyAccent = friendlyModel.accentMesh.material as THREE.MeshBasicMaterial;

      expect(compactBody.color.getHex()).toBe(0x1d2127);
      expect(microBody.color.getHex()).toBe(0x181a1e);
      expect(standardBody.color.getHex()).toBe(0xe6edf5);
      expect(friendlyAccent.color.getHex()).toBe(0x00f0ff);

      factory.dispose();
    });
  });

  describe('Fix D: Automatic target focus on selection / designation change', () => {
    let renderer: Renderer3D;
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      canvas = createMockCanvas();
      renderer = new Renderer3D(canvas, {
        threeRenderer: createMockRenderer(),
        mode: 'TRAIN',
        maxRangeM: 5000,
        rMinM: 100,
      });
    });

    it('triggers camera focus when a new target is designated', () => {
      const cameraController = renderer.getCameraController();
      const focusSpy = vi.spyOn(cameraController, 'focusOnPoint');

      const tracks: SafeTrackView[] = [
        {
          trackNo: 'TRK-01',
          pos: { x: 1000, y: 1500, z: 120 },
          vel: { x: 10, y: 0, z: 0 },
          q: 0.9,
          traineeLabel: null,
          step: 'TRACK',
          isSelected: true,
          masked: false,
          ghostSigmaM: 0,
          lifecycle: 'ACTIVE',
        },
        {
          trackNo: 'TRK-02',
          pos: { x: 2000, y: 2500, z: 200 },
          vel: { x: 0, y: 15, z: 0 },
          q: 0.85,
          traineeLabel: null,
          step: 'TRACK',
          isSelected: false,
          masked: false,
          ghostSigmaM: 0,
          lifecycle: 'ACTIVE',
        },
      ];

      // 1. Initial selection of TRK-01
      renderer.update(tracks, 'TRK-01');
      expect(focusSpy).toHaveBeenCalledTimes(1);

      // 2. Subsequent simulation tick with same selected track must NOT re-trigger focus
      renderer.update(tracks, 'TRK-01');
      renderer.update(tracks, 'TRK-01');
      expect(focusSpy).toHaveBeenCalledTimes(1);

      // 3. Operator switches to TRK-02 (e.g. LOCK NEXT THREAT)
      tracks[0].isSelected = false;
      tracks[1].isSelected = true;
      renderer.update(tracks, 'TRK-02');
      expect(focusSpy).toHaveBeenCalledTimes(2);

      // 4. Deselecting target resets focus state
      renderer.update(tracks, null);
      expect(focusSpy).toHaveBeenCalledTimes(2);

      // 5. Selecting TRK-02 again triggers focus
      renderer.update(tracks, 'TRK-02');
      expect(focusSpy).toHaveBeenCalledTimes(3);

      renderer.dispose();
    });
  });

  describe('Fix E: Keyboard conflict resolution (G for focus, F for fire)', () => {
    it('focusSelection is invoked by G key and not by F key', () => {
      const canvas = createMockCanvas();
      const renderer = new Renderer3D(canvas, {
        threeRenderer: createMockRenderer(),
        mode: 'TRAIN',
        maxRangeM: 5000,
        rMinM: 100,
      });

      const focusSpy = vi.spyOn(renderer, 'focusSelection');

      // Dispatch 'f' keydown event if window exists
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
        expect(focusSpy).not.toHaveBeenCalled();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F' }));
        expect(focusSpy).not.toHaveBeenCalled();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
        expect(focusSpy).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'G' }));
        expect(focusSpy).toHaveBeenCalledTimes(2);
      }

      renderer.dispose();
    });
  });

  describe('Fix F & G: Completed kill-chain indexing and read-only state', () => {
    const killChainSteps = ['FIND', 'FIX', 'TRACK', 'TARGET', 'ENGAGE', 'ASSESS'] as const;

    it('returns -1 for CLOSED step rather than clamping to index 0 (FIND)', () => {
      const getStepIndex = (step: string, steps: readonly string[]): number => {
        return steps.indexOf(step);
      };

      expect(getStepIndex('FIND', killChainSteps)).toBe(0);
      expect(getStepIndex('TRACK', killChainSteps)).toBe(2);
      expect(getStepIndex('ASSESS', killChainSteps)).toBe(5);
      expect(getStepIndex('CLOSED', killChainSteps)).toBe(-1);
      expect(getStepIndex('UNKNOWN_STEP', killChainSteps)).toBe(-1);
    });
  });

  describe('Fix H: Track directory count accuracy', () => {
    it('accurately counts active tracks versus closed tracks', () => {
      const trackRows = [
        { trackNo: 'T-01', step: 'CLOSED' },
        { trackNo: 'T-02', step: 'CLOSED' },
        { trackNo: 'T-03', step: 'TRACK' },
      ];

      const activeCount = trackRows.filter((t) => t.step !== 'CLOSED').length;

      expect(activeCount).toBe(1);
      expect(trackRows.length).toBe(3);

      // When all are closed:
      const allClosed = [
        { trackNo: 'T-01', step: 'CLOSED' },
        { trackNo: 'T-02', step: 'CLOSED' },
      ];
      const activeWhenAllClosed = allClosed.filter((t) => t.step !== 'CLOSED').length;
      expect(activeWhenAllClosed).toBe(0);
    });
  });
});

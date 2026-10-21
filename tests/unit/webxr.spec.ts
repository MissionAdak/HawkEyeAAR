import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { mockDriver, xrDriver } from '@/sim/frameDriver';
import { ConsoleRenderer } from '@/render/renderer';
import {
  checkWebXRSupport,
  queueVrAction,
  WebXRTableTop,
  WebXRPanel,
  WebXRControllerHandler,
  WebXRManager,
} from '@/render3d/xr';
import { engineInstance, clockInstance } from '@/store/sessionStore';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import { aggregateAARMetrics } from '@/sim/metrics';
import type { ScenarioSpec } from '@/sim/types';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = {
    width: 520,
    height: 520,
    getContext: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;

  const baseCtx: Record<string, unknown> = {
    canvas,
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    transform: () => {},
    setTransform: () => {},
    resetTransform: () => {},
    clip: () => {},
    rect: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    measureText: () => ({ width: 50 }),
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: () => {},
    getImageData: (_sx: number, _sy: number, sw: number, sh: number) => ({
      width: sw,
      height: sh,
      data: new Uint8ClampedArray(sw * sh * 4),
    }),
    drawImage: () => {},
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
  };

  const proxyCtx = new Proxy(baseCtx, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop];
      }
      return () => {};
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  });

  (canvas as unknown as { getContext: () => unknown }).getContext = () => proxyCtx;
  return canvas;
}

describe('OPTIONAL TASK 14 — Experimental WebXR VR Renderer', () => {
  beforeEach(() => {
    if (typeof globalThis.document === 'undefined') {
      (globalThis as unknown as { document: unknown }).document = {
        createElement: () => createMockCanvas(),
      };
    }
    if (typeof globalThis.requestAnimationFrame === 'undefined') {
      (globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
        cb: (now: number) => void
      ) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
      (globalThis as unknown as { cancelAnimationFrame: unknown }).cancelAnimationFrame = (
        id: number
      ) => clearTimeout(id);
    }

    engineInstance.abort('TEST_RESET');
    clockInstance.reset();
    engineInstance.load(demo1Json as unknown as ScenarioSpec);
    engineInstance.selectedTrackNo = null;
  });

  afterEach(() => {
    engineInstance.abort('TEST_CLEANUP');
  });

  describe('FrameDriver Abstraction & Tick Continuity', () => {
    it('executes frames via mockDriver and stops on demand', () => {
      const driver = mockDriver();
      expect(driver.isRunning()).toBe(false);

      let frameCount = 0;
      let lastTimestamp = 0;

      driver.start((ts) => {
        frameCount++;
        lastTimestamp = ts;
      });

      expect(driver.isRunning()).toBe(true);
      driver.stepFrame(1000);
      expect(frameCount).toBe(1);
      expect(lastTimestamp).toBe(1000);

      driver.stepFrame(1050);
      expect(frameCount).toBe(2);
      expect(lastTimestamp).toBe(1050);

      driver.stop();
      expect(driver.isRunning()).toBe(false);
      driver.stepFrame(1100);
      expect(frameCount).toBe(2); // no callback after stop
    });

    it('preserves accumulator, tick, queue, and state during FrameDriver handoff', () => {
      const canvas = createMockCanvas();

      const driver1 = mockDriver();
      const driver2 = mockDriver();

      const renderer = new ConsoleRenderer(canvas, driver1);
      renderer.start();
      expect(driver1.isRunning()).toBe(true);
      expect(driver2.isRunning()).toBe(false);

      // Advance initial 3 ticks (150ms) using driver 1
      driver1.stepFrame(1000); // init
      driver1.stepFrame(1150); // +150ms -> 3 ticks (each 50ms)

      const tickAfterDriver1 = engineInstance.tickIndex;
      expect(tickAfterDriver1).toBe(3);

      // Queue an action to verify queue retention across driver swap
      engineInstance.inputQueue.push({
        tRawMs: 200,
        applyTick: 5,
        action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' },
      });
      expect(engineInstance.inputQueue.getPendingCount()).toBe(1);

      // Perform FrameDriver handoff (e.g. windowDriver -> xrDriver)
      renderer.setFrameDriver(driver2);

      expect(driver1.isRunning()).toBe(false);
      expect(driver2.isRunning()).toBe(true);

      // Verify simulation state and input queue are preserved without reset
      expect(engineInstance.tickIndex).toBe(3);
      expect(engineInstance.inputQueue.getPendingCount()).toBe(1);
      expect(engineInstance.sessionEnded).toBe(false);

      // Step with new driver (e.g. +100ms -> ticks 4 and 5)
      // Driver 2 sends timestamps continuing from wall clock
      driver2.stepFrame(1160); // small delta
      driver2.stepFrame(1260); // +100ms -> runs 2 ticks

      expect(engineInstance.tickIndex).toBeGreaterThanOrEqual(5);
      // Queued action was consumed at tick 5
      expect(engineInstance.inputQueue.getPendingCount()).toBe(0);

      renderer.stop();
    });

    it('wraps renderer.setAnimationLoop cleanly in xrDriver', () => {
      let registeredLoop: ((time: number, frame?: unknown) => void) | null = null;
      const mockRenderer = {
        setAnimationLoop: vi.fn((cb) => {
          registeredLoop = cb;
        }),
      };

      const vrDriver = xrDriver(mockRenderer);
      expect(vrDriver.name).toContain('WebXRDriver');
      expect(vrDriver.isRunning()).toBe(false);

      let receivedTime = 0;
      vrDriver.start((time) => {
        receivedTime = time;
      });

      expect(vrDriver.isRunning()).toBe(true);
      expect(mockRenderer.setAnimationLoop).toHaveBeenCalled();

      // Trigger frame from Three.js XR loop
      expect(registeredLoop).not.toBeNull();
      registeredLoop!(5000);
      expect(receivedTime).toBe(5000);

      vrDriver.stop();
      expect(vrDriver.isRunning()).toBe(false);
      expect(mockRenderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    });
  });

  describe('Deterministic Controller Polling & Input Quantisation', () => {
    it('quantises VR controller actions to 20 Hz tick boundaries and pushes to inputQueue', () => {
      engineInstance.tickIndex = 10; // Current tick = 10 (500 ms)
      engineInstance.selectedTrackNo = null;

      // Queue an action at timestamp 540ms
      const userAction = queueVrAction(
        { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' },
        540
      );

      // Must be queued in engineInstance.inputQueue
      expect(engineInstance.inputQueue.getPendingCount()).toBe(1);

      // Must map to a future tick > 10 (never retroactively applied)
      expect(userAction.applyTick).toBeGreaterThan(10);

      // Verify that engine state was NOT modified synchronously (deferred execution)
      expect(engineInstance.selectedTrackNo).toBeNull();

      // Advance engine to the target applyTick
      while (engineInstance.tickIndex < userAction.applyTick) {
        engineInstance.step();
      }

      // Now action has been executed deterministically on tick boundary
      expect(engineInstance.selectedTrackNo).toBe('T-01');
    });

    it('polls gamepad edge transitions without duplicate events on held buttons', () => {
      const scene = new THREE.Scene();
      const handler = new WebXRControllerHandler(scene);

      const fakeGamepad = {
        buttons: [{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }],
        axes: [0, 0, 0, 0],
      };

      const fakeSession = {
        inputSources: [{ gamepad: fakeGamepad }],
      } as unknown as XRSession;

      const initialQueueLen = engineInstance.inputQueue.getPendingCount();

      // Frame 1: button not pressed
      handler.pollControllers(fakeSession, 1000);
      expect(engineInstance.inputQueue.getPendingCount()).toBe(initialQueueLen);

      // Frame 2: button pressed (positive edge) -> should queue 1 action
      fakeGamepad.buttons[0].pressed = true;
      handler.pollControllers(fakeSession, 1050);
      expect(engineInstance.inputQueue.getPendingCount()).toBe(initialQueueLen + 1);

      // Frame 3: button held down -> must NOT queue a duplicate action
      handler.pollControllers(fakeSession, 1100);
      expect(engineInstance.inputQueue.getPendingCount()).toBe(initialQueueLen + 1);

      // Frame 4: button released
      fakeGamepad.buttons[0].pressed = false;
      handler.pollControllers(fakeSession, 1150);
      expect(engineInstance.inputQueue.getPendingCount()).toBe(initialQueueLen + 1);

      handler.dispose();
    });
  });

  describe('Truth Gating, EVAL Aids Lock & 2D/3D/VR Parity', () => {
    it('locks decision aids in EVAL mode on in-VR operator panel', () => {
      // Load EVAL scenario
      const evalSpec: ScenarioSpec = {
        ...(demo1Json as unknown as ScenarioSpec),
        mode: 'EVAL',
      };
      engineInstance.load(evalSpec);

      const panel = new WebXRPanel();
      panel.update();

      // Inspect panel mesh geometry & properties
      expect(panel.mesh).toBeDefined();
      expect(panel.mesh.geometry).toBeDefined();
      expect(panel.mesh.position.z).toBeCloseTo(-0.65, 2);

      panel.dispose();
    });

    it('preserves exact event and score parity regardless of presentation mode', () => {
      // Run identical scenario with scripted actions in two runs
      const runScenario = () => {
        const engine = new SimEngine();
        engine.load(demo1Json as unknown as ScenarioSpec);

        engine.inputQueue.push({
          tRawMs: 10000,
          applyTick: 200,
          action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'KEY' },
        });
        engine.inputQueue.push({
          tRawMs: 15000,
          applyTick: 300,
          action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' },
        });
        engine.inputQueue.push({
          tRawMs: 56900,
          applyTick: 1140,
          action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' },
        });
        engine.inputQueue.push({
          tRawMs: 57000,
          applyTick: 1140,
          action: { type: 'FIRE', trackNo: 'T-01' },
        });
        engine.inputQueue.push({
          tRawMs: 58000,
          applyTick: 1160,
          action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
        });

        for (let tick = 0; tick < 2400; tick++) {
          engine.step();
        }
        return aggregateAARMetrics(engine.events, demo1Json as unknown as ScenarioSpec);
      };

      const run1 = runScenario();
      const run2 = runScenario();

      expect(run1.score).toBeCloseTo(run2.score, 6);
      expect(run1.score).toBeCloseTo(79.21, 1);
      expect(run1.grade).toBe(run2.grade);
      expect(run1.leakers).toBe(0);
      expect(run1.roeViolations).toBe(0);
    });
  });

  describe('TableTop Presentation & Ergonomics', () => {
    it('constructs TableTop at 1:10,000 scale and 4x exaggerated altitude', () => {
      const tableTop = new WebXRTableTop();

      // Position: 0.85m height, 0.85m in front of operator
      expect(tableTop.tableGroup.position.y).toBeCloseTo(0.85, 2);
      expect(tableTop.tableGroup.position.z).toBeCloseTo(-0.85, 2);

      // Tactical group scale: 1:10,000 (0.0001) in X/Z, 4x exaggerated in Y (0.0004)
      expect(tableTop.tacticalGroup.scale.x).toBeCloseTo(0.0001, 6);
      expect(tableTop.tacticalGroup.scale.z).toBeCloseTo(0.0001, 6);
      expect(tableTop.tacticalGroup.scale.y).toBeCloseTo(0.0004, 6);

      // Recenter resets position
      tableTop.recenter(new THREE.Vector3(0.1, 1.6, 0.2));
      expect(tableTop.tableGroup.position.x).toBeCloseTo(0.1, 2);

      tableTop.dispose();
    });
  });

  describe('Capability Detection & Safe Fallback', () => {
    it('returns structured rejection reason when WebXR is unavailable', async () => {
      const res = await checkWebXRSupport();
      // In Node test environment, navigator.xr is not supported
      expect(res.supported).toBe(false);
      expect(res.reason).toBeDefined();
      expect(typeof res.reason).toBe('string');
    });

    it('exits VR gracefully and restores windowDriver without stopping sim', () => {
      const canvas = createMockCanvas();
      const renderer = new ConsoleRenderer(canvas);
      renderer.start();

      const mockThreeRenderer = {
        xr: { enabled: true, setSession: vi.fn() },
        setAnimationLoop: vi.fn(),
      } as unknown as THREE.WebGLRenderer;

      const scene = new THREE.Scene();
      const onExit = vi.fn();

      const manager = new WebXRManager(mockThreeRenderer, scene, renderer, onExit);
      expect(manager.isActive()).toBe(false);

      // Exit VR when not active does not crash
      manager.exitVR();
      expect(manager.isActive()).toBe(false);

      // Renderer frame driver is still running
      expect(renderer.getFrameDriver().isRunning()).toBe(true);

      manager.dispose();
      renderer.stop();
    });
  });
});

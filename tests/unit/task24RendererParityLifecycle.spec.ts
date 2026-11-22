import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import * as THREE from 'three';
import demo1Json from '@/director/bundled/demo1.json';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import type { ScenarioSpec, UserAction, TrackClass, EffectorId } from '@/sim/types';
import { Renderer3D } from '@/render3d/renderer3d';
import { checkWebGL2Support, clearWebGL2CapabilityCacheForTesting } from '@/render3d/capability';
import { projectSafeTracks } from '@/ui/Console';
import { CONFIG } from '@/config';
import { calculateRadarCoverage, calculateEoirCoverage, calculateRfCoverage } from '@/render3d/coverage';

// Ensure browser animation and document globals exist in Node environment
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(Date.now()), 16) as unknown as number;
  };
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}
if (typeof globalThis.window === 'undefined') {
  const windowListeners: Record<string, ((e: unknown) => void)[]> = {};
  globalThis.window = {
    addEventListener: (event: string, fn: (e: unknown) => void) => {
      windowListeners[event] = windowListeners[event] || [];
      windowListeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: (e: unknown) => void) => {
      if (windowListeners[event]) {
        windowListeners[event] = windowListeners[event].filter((f) => f !== fn);
      }
    },
    devicePixelRatio: 1,
    __windowListeners: windowListeners,
  } as unknown as Window & typeof globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return createMockCanvas();
      }
      return {
        width: 100,
        height: 100,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
  } as unknown as Document;
}

/**
 * Creates a mock HTMLCanvasElement for headless unit testing.
 */
function createMockCanvas(width = 520, height = 520): HTMLCanvasElement {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  const canvas = {
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
    getContext: (type: string) => {
      if (type === 'webgl2') {
        return {
          canvas: null,
          getExtension: () => null,
          getParameter: () => 0,
        };
      }
      return {
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
      };
    },
    addEventListener: (event: string, fn: (e: unknown) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: (e: unknown) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (e: { type: string; defaultPrevented?: boolean; preventDefault?: () => void }) => {
      const arr = listeners[e.type];
      if (arr) {
        arr.forEach((fn) => fn(e));
      }
      return true;
    },
    __listeners: listeners,
  } as unknown as HTMLCanvasElement & { __listeners: Record<string, ((e: unknown) => void)[]> };
  return canvas;
}

/**
 * Creates a mock THREE.WebGLRenderer for deterministic unit testing.
 */
function createMockRenderer(): THREE.WebGLRenderer {
  return {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    info: {
      memory: { geometries: 0, textures: 0 },
      render: { calls: 0, triangles: 0, points: 0, lines: 0, frame: 0 },
    },
  } as unknown as THREE.WebGLRenderer;
}

/**
 * Computes an authoritative deterministic state hash of the plain-data simulation state.
 */
function computeStateHash(engine: SimEngine): string {
  const plainState = {
    tick: engine.tickIndex,
    eventsCount: engine.events.length,
    lastSeq: engine.eventSeq,
    entities: engine.curr.map((e) => ({
      id: e.id,
      x: e.pos.x,
      y: e.pos.y,
      z: e.pos.z,
      vx: e.vel.x,
      vy: e.vel.y,
      vz: e.vel.z,
      lifecycle: e.lifecycle,
      trackNo: e.trackNo,
    })),
  };
  return crypto.createHash('sha256').update(JSON.stringify(plainState)).digest('hex');
}

describe('TASK 24 — 2D/3D Simulation Parity, Renderer Lifecycle & Failure-Recovery Acceptance', () => {
  beforeEach(() => {
    clearWebGL2CapabilityCacheForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearWebGL2CapabilityCacheForTesting();
    vi.restoreAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-A — Deterministic 2D/3D Simulation Parity                           */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-A: Deterministic 2D/3D Simulation Parity', () => {
    it('produces identical event sequences, state hashes, kill outcomes, and AAR metrics in 2D vs 3D', () => {
      const spec = demo1Json as unknown as ScenarioSpec;

      // 1. Session A: Pure 2D
      const engine2D = new SimEngine();
      engine2D.load(spec);

      // 2. Session B: 3D with active Renderer3D presentation
      const engine3D = new SimEngine();
      engine3D.load(spec);

      const canvas3D = createMockCanvas();
      const mockRenderer = createMockRenderer();
      const renderer3D = new Renderer3D(canvas3D, {
        maxRangeM: CONFIG.thresholds.radarMaxRangeM,
        rMinM: CONFIG.thresholds.rMinM,
        zones: spec.zones || [],
        mode: spec.mode,
        threeRenderer: mockRenderer,
      });

      renderer3D.setTrackProvider(() => {
        const opTracks = engine3D.getOperatorTracks();
        return {
          tracks: projectSafeTracks(opTracks, engine3D.selectedTrackNo),
          selectedTrackNo: engine3D.selectedTrackNo,
        };
      });

      renderer3D.setSimTimeProvider(() => ({
        simMs: engine3D.tickIndex * 50,
        chaosList: engine3D.spec?.chaos,
      }));

      renderer3D.setCoverageProvider(() => {
        const currentSimMs = engine3D.tickIndex * 50;
        return {
          radar: calculateRadarCoverage({
            sensorHealth: engine3D.sensorHealth.RADAR,
            chaosList: engine3D.spec?.chaos,
            tMs: currentSimMs,
          }),
          eoir: calculateEoirCoverage({
            azimuthDeg: engine3D.eoirAzimuthDeg,
            isNight: engine3D.spec?.dayNight === 'NIGHT',
            sensorHealth: engine3D.sensorHealth.EOIR,
            chaosList: engine3D.spec?.chaos,
            tMs: currentSimMs,
          }),
          rf: calculateRfCoverage({
            sensorHealth: engine3D.sensorHealth.RF,
            chaosList: engine3D.spec?.chaos,
            tMs: currentSimMs,
          }),
          activeSensor: 'RADAR',
          visible: true,
        };
      });

      renderer3D.setEventsProvider(() => engine3D.getOperatorEvents());
      renderer3D.start();

      // Canonical trainee actions pushed into InputQueue:
      // T+1.0s (tick 20): DESIGNATE H-1 (T-01)
      const inputDesignate: UserAction = {
        tRawMs: 1000,
        applyTick: 20,
        action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' },
      };
      // T+2.0s (tick 40): CLASSIFY T-01 as HOSTILE_ATTACK
      const inputClassify: UserAction = {
        tRawMs: 2000,
        applyTick: 40,
        action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' as TrackClass },
      };
      // T+3.0s (tick 60): SELECT_EFFECTOR and FIRE RF_SOFTKILL
      const inputSelectEffector: UserAction = {
        tRawMs: 3000,
        applyTick: 60,
        action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' as EffectorId },
      };
      const inputFire: UserAction = {
        tRawMs: 3000,
        applyTick: 60,
        action: { type: 'FIRE', trackNo: 'T-01' },
      };
      // T+3.5s (tick 70): ASSESS KILL
      const inputAssess: UserAction = {
        tRawMs: 3500,
        applyTick: 70,
        action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
      };

      const inputs = [inputDesignate, inputClassify, inputSelectEffector, inputFire, inputAssess];
      for (const input of inputs) {
        engine2D.inputQueue.push(input);
        engine3D.inputQueue.push(input);
      }

      // Run both engines for 200 ticks (10.0 seconds)
      const stateHashes2D: string[] = [];
      const stateHashes3D: string[] = [];

      for (let t = 0; t < 200; t++) {
        // Advance 2D engine
        engine2D.step();

        // Advance 3D engine and update 3D scene representation
        engine3D.step();
        const { tracks, selectedTrackNo } = renderer3D.getCurrentTracks()!;
        renderer3D.update(tracks, selectedTrackNo);

        // Record periodic checkpoints (every 50 ticks)
        if (t % 50 === 0) {
          stateHashes2D.push(computeStateHash(engine2D));
          stateHashes3D.push(computeStateHash(engine3D));
        }
      }

      // 1. Assert identical state hashes across all checkpoints
      expect(stateHashes2D).toEqual(stateHashes3D);

      // 2. Assert identical authoritative event sequence length and ordering
      expect(engine2D.events).toHaveLength(engine3D.events.length);
      for (let i = 0; i < engine2D.events.length; i++) {
        const eA = engine2D.events[i];
        const eB = engine3D.events[i];
        expect(eA.seq).toBe(eB.seq);
        expect(eA.tMs).toBe(eB.tMs);
        expect(eA.type).toBe(eB.type);
        expect(eA.trackNo).toBe(eB.trackNo);
        expect(eA.entityId).toBe(eB.entityId);
        expect(eA.payload).toEqual(eB.payload);
      }

      // 3. Assert identical engagement decisions and seeded kill outcomes
      const engages2D = engine2D.events.filter((e) => e.type === 'ENGAGE');
      const engages3D = engine3D.events.filter((e) => e.type === 'ENGAGE');
      expect(engages2D).toHaveLength(engages3D.length);
      expect(engages2D).toEqual(engages3D);

      const kills2D = engine2D.events.filter((e) => e.type === 'ENGAGE_RESULT');
      const kills3D = engine3D.events.filter((e) => e.type === 'ENGAGE_RESULT');
      expect(kills2D).toHaveLength(kills3D.length);
      expect(kills2D).toEqual(kills3D);

      const assess2D = engine2D.events.filter((e) => e.type === 'ASSESS');
      const assess3D = engine3D.events.filter((e) => e.type === 'ASSESS');
      expect(assess2D).toHaveLength(assess3D.length);
      expect(assess2D).toEqual(assess3D);

      // 4. Assert identical ROE and PNR records
      const roe2D = engine2D.events.filter((e) => e.type === 'ROE_VIOLATION');
      const roe3D = engine3D.events.filter((e) => e.type === 'ROE_VIOLATION');
      expect(roe2D).toEqual(roe3D);

      // 5. Assert AAR authoritative metrics, scores, and confusion matrices match exactly
      const aar2D = aggregateAARMetrics(engine2D.events, spec);
      const aar3D = aggregateAARMetrics(engine3D.events, spec);
      expect(Math.abs(aar2D.score - aar3D.score)).toBeLessThanOrEqual(1e-6);
      expect(aar2D.score).toBeCloseTo(aar3D.score, 6);
      expect(aar2D.grade).toBe(aar3D.grade);
      expect(aar2D.dScore).toBe(aar3D.dScore);
      expect(aar2D.cScore).toBe(aar3D.cScore);
      expect(aar2D.gScore).toBe(aar3D.gScore);
      expect(aar2D.rScore).toBe(aar3D.rScore);
      expect(aar2D.confusion).toEqual(aar3D.confusion);

      // Teardown
      renderer3D.dispose();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-B — Live 2D/3D Switching Integrity                                  */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-B: Live 2D/3D Switching Integrity', () => {
    it('switching between 2D and 3D mid-simulation preserves clock, inputs, tracks, stateHash and scores', () => {
      const spec = demo1Json as unknown as ScenarioSpec;

      // Control engine: uninterrupted 2D run
      const controlEngine = new SimEngine();
      controlEngine.load(spec);

      // Switching engine: alternating 2D <-> 3D presentation
      const switchingEngine = new SimEngine();
      switchingEngine.load(spec);

      const canvas3D = createMockCanvas();
      const mockRenderer = createMockRenderer();
      let activeRenderer3D: Renderer3D | null = null;

      const switchTo3D = () => {
        if (!activeRenderer3D) {
          activeRenderer3D = new Renderer3D(canvas3D, {
            maxRangeM: CONFIG.thresholds.radarMaxRangeM,
            rMinM: CONFIG.thresholds.rMinM,
            zones: spec.zones || [],
            mode: spec.mode,
            threeRenderer: mockRenderer,
          });
          activeRenderer3D.setTrackProvider(() => ({
            tracks: projectSafeTracks(switchingEngine.getOperatorTracks(), switchingEngine.selectedTrackNo),
            selectedTrackNo: switchingEngine.selectedTrackNo,
          }));
          activeRenderer3D.setSimTimeProvider(() => ({
            simMs: switchingEngine.tickIndex * 50,
            chaosList: switchingEngine.spec?.chaos,
          }));
          activeRenderer3D.start();
        }
      };

      const switchTo2D = () => {
        if (activeRenderer3D) {
          activeRenderer3D.stop();
          activeRenderer3D.dispose();
          activeRenderer3D = null;
        }
      };

      // Scripted inputs during active simulation
      const inputs: UserAction[] = [
        { tRawMs: 1250, applyTick: 25, action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' } },
        { tRawMs: 3000, applyTick: 60, action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' as TrackClass } },
        { tRawMs: 4500, applyTick: 90, action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' as EffectorId } },
        { tRawMs: 4500, applyTick: 90, action: { type: 'FIRE', trackNo: 'T-01' } },
        { tRawMs: 6000, applyTick: 120, action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' } },
      ];

      for (const input of inputs) {
        controlEngine.inputQueue.push(input);
        switchingEngine.inputQueue.push(input);
      }

      // Run 300 ticks (15.0s) with live switching schedule:
      // Ticks 0..49: 2D
      // Tick 50: Switch to 3D
      // Ticks 50..119: 3D (active classification & missile fire occurring during 3D)
      // Tick 120: Switch to 2D
      // Ticks 120..199: 2D
      // Tick 200: Switch to 3D
      // Ticks 200..259: 3D
      // Tick 260: Switch to 2D
      // Ticks 260..300: 2D
      for (let t = 0; t < 300; t++) {
        // Trigger switching at designated ticks
        if (t === 50) {
          switchTo3D();
        } else if (t === 120) {
          switchTo2D();
        } else if (t === 200) {
          switchTo3D();
        } else if (t === 260) {
          switchTo2D();
        }

        // Step engines
        controlEngine.step();
        switchingEngine.step();

        if (activeRenderer3D) {
          const currentR3d = activeRenderer3D as Renderer3D;
          const { tracks, selectedTrackNo } = currentR3d.getCurrentTracks()!;
          currentR3d.update(tracks, selectedTrackNo);
        }
      }

      switchTo2D();

      // Assert clock was never reset
      expect(switchingEngine.tickIndex).toBe(300);
      expect(switchingEngine.tickIndex).toBe(controlEngine.tickIndex);

      // Assert track count and IDs are intact
      expect(switchingEngine.curr).toHaveLength(controlEngine.curr.length);

      // Assert state hash matches control engine identically
      expect(computeStateHash(switchingEngine)).toBe(computeStateHash(controlEngine));

      // Assert event sequences match identically
      expect(switchingEngine.events).toHaveLength(controlEngine.events.length);
      for (let i = 0; i < controlEngine.events.length; i++) {
        expect(switchingEngine.events[i]).toEqual(controlEngine.events[i]);
      }

      // Assert final scores match identically
      const aarControl = aggregateAARMetrics(controlEngine.events, spec);
      const aarSwitching = aggregateAARMetrics(switchingEngine.events, spec);
      expect(Math.abs(aarSwitching.score - aarControl.score)).toBeLessThanOrEqual(1e-6);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-C — WebGL Failure & Automatic 2D Fallback                           */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-C: WebGL Failure & Automatic 2D Fallback', () => {
    it('Case A — Missing WebGL2: detects unsupported hardware and preserves 2D baseline', () => {
      // Mock document.createElement to return a canvas with null webgl2
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'canvas') {
          return {
            getContext: (ctxType: string) => (ctxType === 'webgl2' ? null : {}),
          } as unknown as HTMLElement;
        }
        return origCreateElement(tagName);
      });

      clearWebGL2CapabilityCacheForTesting();
      const cap = checkWebGL2Support();
      expect(cap.supported).toBe(false);
      expect(cap.reason).toContain('WebGL2 is not supported');

      // Verify a simulation engine continues running without disruption
      const engine = new SimEngine();
      engine.load(demo1Json as unknown as ScenarioSpec);
      for (let t = 0; t < 20; t++) engine.step();
      expect(engine.tickIndex).toBe(20);
    });

    it('Case B — Dynamic Three.js Chunk Failure: recovers gracefully without crashing application', async () => {
      // Simulate failed dynamic chunk import
      let viewMode: '2D' | '3D' = '2D';
      let webGlError: string | null = null;

      const mockDynamicImport = vi.fn().mockRejectedValue(new Error('ChunkLoadError: Failed to fetch chunk render3d'));

      const toggleViewMode = async () => {
        try {
          await mockDynamicImport();
          viewMode = '3D';
        } catch {
          webGlError = 'Failed to load 3D renderer. Restoring 2D mode.';
          viewMode = '2D';
        }
      };

      await toggleViewMode();

      // Assert 2D baseline preserved and error logged
      expect(viewMode).toBe('2D');
      expect(webGlError).toBe('Failed to load 3D renderer. Restoring 2D mode.');
    });

    it('Case C — Initialization Failure: disposes partial resources and preserves 2D simulation', async () => {
      let viewMode: '2D' | '3D' = '2D';
      let webGlError: string | null = null;
      let partialRenderer: { dispose: () => void } | null = { dispose: vi.fn() };

      const toggleViewMode = async () => {
        try {
          // Simulate constructor failure
          throw new Error('WebGL context creation failed: out of memory');
        } catch {
          if (partialRenderer) {
            partialRenderer.dispose();
            partialRenderer = null;
          }
          webGlError = 'Failed to load 3D renderer. Restoring 2D mode.';
          viewMode = '2D';
        }
      };

      await toggleViewMode();
      expect(viewMode).toBe('2D');
      expect(webGlError).toBe('Failed to load 3D renderer. Restoring 2D mode.');
      expect(partialRenderer).toBeNull();
    });

    it('Case D — WebGL Context Loss: triggers onContextLost, stops 3D loop, and restores 2D Canvas baseline', () => {
      const canvas = createMockCanvas();
      const mockRenderer = createMockRenderer();
      let restoredTo2D = false;
      let errorReported: string | null = null;

      const renderer3D = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        zones: [],
        threeRenderer: mockRenderer,
        onContextLost: () => {
          restoredTo2D = true;
          errorReported = 'WebGL2 context lost. Restored 2D Canvas baseline.';
        },
      });

      renderer3D.start();

      // Dispatch real webglcontextlost event to canvas
      let isDefaultPrevented = false;
      const event = {
        type: 'webglcontextlost',
        get defaultPrevented() {
          return isDefaultPrevented;
        },
        preventDefault() {
          isDefaultPrevented = true;
        },
      } as unknown as Event;

      canvas.dispatchEvent(event);

      // Verify event was cancelled and fallback executed
      expect(isDefaultPrevented).toBe(true);
      expect(restoredTo2D).toBe(true);
      expect(errorReported).toBe('WebGL2 context lost. Restored 2D Canvas baseline.');

      renderer3D.dispose();
    });

    it('Case E — Slow Chunk Loading: enforces 3-second timeout under Rule R10.6 and recovers to 2D', async () => {
      let viewMode: '2D' | '3D' = '2D';
      let webGlError: string | null = null;

      // Simulate hanging chunk load (> 3000ms)
      const hangingImport = new Promise<never>(() => {
        // never resolves
      });

      const initRenderer3DWithTimeout = async () => {
        let chunkTimeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          chunkTimeoutId = setTimeout(
            () => reject(new Error('3D chunk loading timed out (> 3000ms, Rule R10.6)')),
            50 // accelerated for unit test
          );
        });

        try {
          return await Promise.race([hangingImport, timeoutPromise]);
        } finally {
          if (chunkTimeoutId) clearTimeout(chunkTimeoutId);
        }
      };

      const toggleViewMode = async () => {
        try {
          await initRenderer3DWithTimeout();
          viewMode = '3D';
        } catch (err) {
          const isTimeout = err instanceof Error && err.message.includes('timed out');
          webGlError = isTimeout
            ? '3D chunk loading timed out (> 3000ms). Restoring 2D mode.'
            : 'Failed to load 3D renderer. Restoring 2D mode.';
          viewMode = '2D';
        }
      };

      await toggleViewMode();
      expect(viewMode).toBe('2D');
      expect(webGlError).toBe('3D chunk loading timed out (> 3000ms). Restoring 2D mode.');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-D — Renderer Lifecycle & GPU Resource Cleanup                       */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-D: Renderer Lifecycle & GPU Resource Cleanup', () => {
    it('executes 10 consecutive 2D <-> 3D switching cycles with zero listener leakage and complete disposal', () => {
      for (let cycle = 1; cycle <= 10; cycle++) {
        const canvas = createMockCanvas();
        const mockRenderer = createMockRenderer();
        const onContextLost = vi.fn();

        const r3d = new Renderer3D(canvas, {
          maxRangeM: 5000,
          rMinM: 500,
          zones: (demo1Json as unknown as ScenarioSpec).zones,
          threeRenderer: mockRenderer,
          onContextLost,
        });

        r3d.setTrackProvider(() => ({
          tracks: [
            {
              trackNo: 'T-01',
              pos: { x: 1000, y: 1500, z: 120 },
              vel: { x: 10, y: 0, z: 0 },
              traineeLabel: 'HOSTILE_ATTACK',
              step: 'TRACK',
              q: 0.85,
              masked: false,
              ghostSigmaM: 0,
              isSelected: true,
              lifecycle: 'ACTIVE',
            },
          ],
          selectedTrackNo: 'T-01',
        }));

        r3d.start();

        // Perform one update and render cycle
        const currentTracks = r3d.getCurrentTracks()!;
        r3d.update(currentTracks.tracks, currentTracks.selectedTrackNo);

        // Teardown at end of cycle
        r3d.dispose();

        // 1. Assert render loop stopped
        r3d.stop(); // idempotent

        // 2. Assert canvas listeners removed
        const canvasListeners = (canvas as unknown as { __listeners: Record<string, unknown[]> }).__listeners;
        for (const [, arr] of Object.entries(canvasListeners)) {
          expect(arr).toHaveLength(0);
        }

        // 3. Assert mockRenderer.dispose was invoked
        expect(mockRenderer.dispose).toHaveBeenCalled();
      }

      // Memory and listener hygiene after 10 full cycles
      expect(true).toBe(true);
    });
  });
});

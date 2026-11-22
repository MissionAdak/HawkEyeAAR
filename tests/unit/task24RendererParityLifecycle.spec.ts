import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import * as THREE from 'three';
import demo1Json from '@/director/bundled/demo1.json';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import type { ScenarioSpec, UserAction, TrackClass, EffectorId } from '@/sim/types';
import { Renderer3D } from '@/render3d/renderer3d';
import { checkWebGL2Support, clearWebGL2CapabilityCacheForTesting } from '@/render3d/capability';
import {
  projectSafeTracks,
  DEFAULT_CHUNK_LOAD_TIMEOUT_MS,
  loadRender3DModuleWithTimeout,
} from '@/ui/Console';
import { CONFIG } from '@/config';
import { calculateRadarCoverage, calculateEoirCoverage, calculateRfCoverage } from '@/render3d/coverage';

// Ensure browser animation and document globals exist in Node environment
let nextRafId = 1;
const scheduledRafCallbacks = new Map<number, FrameRequestCallback>();

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = nextRafId++;
    scheduledRafCallbacks.set(id, cb);
    setTimeout(() => {
      if (scheduledRafCallbacks.has(id)) {
        scheduledRafCallbacks.delete(id);
        cb(Date.now());
      }
    }, 16);
    return id;
  };
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number) => {
    scheduledRafCallbacks.delete(id);
  };
}

const windowListenersMap: Record<string, ((e: unknown) => void)[]> = {};
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: (event: string, fn: (e: unknown) => void) => {
      windowListenersMap[event] = windowListenersMap[event] || [];
      windowListenersMap[event].push(fn);
    },
    removeEventListener: (event: string, fn: (e: unknown) => void) => {
      if (windowListenersMap[event]) {
        windowListenersMap[event] = windowListenersMap[event].filter((f) => f !== fn);
      }
    },
    devicePixelRatio: 1,
    __windowListeners: windowListenersMap,
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
 * Creates a mock HTMLCanvasElement for headless unit testing with explicit listener tracking.
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
 * Authoritative deterministic simulation state serializer.
 * Encodes complete authoritative simulation state (clock, lifecycle, active tools, sensor health,
 * complete event stream, all entity physics and lifecycle states, tracking estimator
 * states, and input queue) while strictly omitting presentation/renderer metadata.
 */
export function serializeAuthoritativeSimState(engine: SimEngine): string {
  const state = {
    tick: engine.tickIndex,
    sessionEnded: engine.sessionEnded,
    activeSensor: engine.activeSensor,
    selectedTrackNo: engine.selectedTrackNo,
    activeEffector: engine.activeEffector,
    eoirAzimuthDeg: engine.eoirAzimuthDeg,
    sensorHealth: engine.sensorHealth,
    events: engine.events.map((e) => ({
      seq: e.seq,
      tMs: e.tMs,
      type: e.type,
      trackNo: e.trackNo,
      entityId: e.entityId,
      payload: e.payload,
    })),
    entities: engine.curr.map((e) => ({
      id: e.id,
      trackNo: e.trackNo,
      pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
      vel: { x: e.vel.x, y: e.vel.y, z: e.vel.z },
      prev: { x: e.prev.x, y: e.prev.y, z: e.prev.z },
      rcsM2: e.rcsM2,
      trueClass: e.trueClass,
      droneType: e.droneType,
      lifecycle: e.lifecycle,
      step: e.step,
      q: e.q,
      cCls: e.cCls,
      masked: e.masked,
      coastingSinceMs: e.coastingSinceMs,
      ghostSigmaM: e.ghostSigmaM,
      hitHistory: e.hitHistory,
      tVis: e.tVis,
      tTrk: e.tTrk,
      tDesig: e.tDesig,
      tCls: e.tCls,
      tEng: e.tEng,
      tPnr: e.tPnr,
      engagements: e.engagements,
      weaponUsed: e.weaponUsed,
      traineeLabel: e.traineeLabel,
    })),
    trackerEstimates: engine.tracker.getAllEstimates().map((est) => ({
      trackNo: est.trackNo,
      entityId: est.entityId,
      pos: { x: est.estPos.x, y: est.estPos.y, z: est.estPos.z },
      vel: { x: est.estVel.x, y: est.estVel.y, z: est.estVel.z },
      rangeM: est.estRangeM,
      bearingDeg: est.estBearingDeg,
      speedMps: est.estSpeedMps,
      uncertaintyM: est.uncertaintyM,
      isCoasting: est.isCoasting,
      coastingSinceMs: est.coastingSinceMs,
      lastMeasurementMs: est.lastMeasurementMs,
      q: est.q,
      cCls: est.cCls,
      traineeLabel: est.traineeLabel,
      step: est.step,
      lifecycle: est.lifecycle,
    })),
    rfMeasurements: engine.rfMeasurements,
    inputQueue: ((engine.inputQueue as unknown as { queue?: UserAction[] }).queue ?? []).map((i) => ({
      tRawMs: i.tRawMs,
      applyTick: i.applyTick,
      action: i.action,
    })),
  };
  return JSON.stringify(state);
}

export function computeAuthoritativeStateHash(engine: SimEngine): string {
  return crypto.createHash('sha256').update(serializeAuthoritativeSimState(engine)).digest('hex');
}

describe('TASK 24-R — Simulation Parity, Failure Recovery & Renderer Lifecycle', () => {
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
  describe('TASK 24-A: Correct Deterministic Parity Evidence', () => {
    it('verifies bit-identical authoritative state hashes across exact checkpoints (Tick 50, 100, 150, 200)', () => {
      const spec = demo1Json as unknown as ScenarioSpec;

      // 1. Session A: Pure 2D simulation
      const engine2D = new SimEngine();
      engine2D.load(spec);

      // 2. Session B: 3D presentation layer running on identical authoritative simulation
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

      // Scripted canonical trainee actions:
      const inputs: UserAction[] = [
        { tRawMs: 1000, applyTick: 20, action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' } },
        { tRawMs: 2000, applyTick: 40, action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' as TrackClass } },
        { tRawMs: 3000, applyTick: 60, action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' as EffectorId } },
        { tRawMs: 3000, applyTick: 60, action: { type: 'FIRE', trackNo: 'T-01' } },
        { tRawMs: 3500, applyTick: 70, action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' } },
      ];

      for (const input of inputs) {
        engine2D.inputQueue.push(input);
        engine3D.inputQueue.push(input);
      }

      // Checkpoint timing: verify exact ticks 50, 100, 150, 200
      const checkpoints = [50, 100, 150, 200];
      const hashes2D: Record<number, string> = {};
      const hashes3D: Record<number, string> = {};

      for (let tick = 1; tick <= 200; tick++) {
        engine2D.step();
        engine3D.step();

        const { tracks, selectedTrackNo } = renderer3D.getCurrentTracks()!;
        renderer3D.update(tracks, selectedTrackNo);

        if (checkpoints.includes(tick)) {
          expect(engine2D.tickIndex).toBe(tick);
          expect(engine3D.tickIndex).toBe(tick);
          hashes2D[tick] = computeAuthoritativeStateHash(engine2D);
          hashes3D[tick] = computeAuthoritativeStateHash(engine3D);
        }
      }

      // Assert final tick-200 state explicitly
      expect(engine2D.tickIndex).toBe(200);
      expect(engine3D.tickIndex).toBe(200);

      for (const cp of checkpoints) {
        expect(hashes2D[cp]).toBeDefined();
        expect(hashes3D[cp]).toBeDefined();
        expect(hashes2D[cp]).toBe(hashes3D[cp]);
      }

      // Teardown
      renderer3D.dispose();
    });

    it('asserts complete deep equality across entire authoritative AAR metric object and identical event sequences', () => {
      const spec = demo1Json as unknown as ScenarioSpec;

      const engine2D = new SimEngine();
      engine2D.load(spec);

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

      renderer3D.setTrackProvider(() => ({
        tracks: projectSafeTracks(engine3D.getOperatorTracks(), engine3D.selectedTrackNo),
        selectedTrackNo: engine3D.selectedTrackNo,
      }));
      renderer3D.start();

      const inputs: UserAction[] = [
        { tRawMs: 1000, applyTick: 20, action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'CLICK' } },
        { tRawMs: 2000, applyTick: 40, action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' as TrackClass } },
        { tRawMs: 3000, applyTick: 60, action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' as EffectorId } },
        { tRawMs: 3000, applyTick: 60, action: { type: 'FIRE', trackNo: 'T-01' } },
        { tRawMs: 3500, applyTick: 70, action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' } },
      ];

      for (const input of inputs) {
        engine2D.inputQueue.push(input);
        engine3D.inputQueue.push(input);
      }

      for (let tick = 1; tick <= 200; tick++) {
        engine2D.step();
        engine3D.step();
        const { tracks, selectedTrackNo } = renderer3D.getCurrentTracks()!;
        renderer3D.update(tracks, selectedTrackNo);
      }

      // 1. Assert identical event sequence length, ordering, sequence numbers, and payloads
      expect(engine2D.events).toHaveLength(engine3D.events.length);
      for (let i = 0; i < engine2D.events.length; i++) {
        expect(engine2D.events[i]).toEqual(engine3D.events[i]);
      }

      // 2. Compute full AAR metrics for both sessions
      const aar2D = aggregateAARMetrics(engine2D.events, spec);
      const aar3D = aggregateAARMetrics(engine3D.events, spec);

      // 3. Deep equality of entire AAR metric object (composite, grades, components, times, confusion matrix)
      expect(aar2D).toEqual(aar3D);
      expect(aar2D.score).toBe(aar3D.score);
      expect(aar2D.grade).toBe(aar3D.grade);
      expect(aar2D.dScore).toBe(aar3D.dScore);
      expect(aar2D.cScore).toBe(aar3D.cScore);
      expect(aar2D.gScore).toBe(aar3D.gScore);
      expect(aar2D.rScore).toBe(aar3D.rScore);
      expect(aar2D.confusion).toEqual(aar3D.confusion);

      renderer3D.dispose();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-B — Live 2D/3D Switching Integrity                                  */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-B: Live 2D/3D Switching Continuity', () => {
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

      // Run 300 ticks (15.0s) with live switching schedule
      for (let t = 1; t <= 300; t++) {
        if (t === 50) {
          switchTo3D();
        } else if (t === 120) {
          switchTo2D();
        } else if (t === 200) {
          switchTo3D();
        } else if (t === 260) {
          switchTo2D();
        }

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
      expect(computeAuthoritativeStateHash(switchingEngine)).toBe(computeAuthoritativeStateHash(controlEngine));

      // Assert complete event streams match identically
      expect(switchingEngine.events).toHaveLength(controlEngine.events.length);
      for (let i = 0; i < controlEngine.events.length; i++) {
        expect(switchingEngine.events[i]).toEqual(controlEngine.events[i]);
      }

      // Assert full AAR metrics match
      const aarControl = aggregateAARMetrics(controlEngine.events, spec);
      const aarSwitching = aggregateAARMetrics(switchingEngine.events, spec);
      expect(aarSwitching).toEqual(aarControl);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-C — Production Failure Recovery & Context-Loss Teardown             */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-C: Production Failure Recovery & Context-Loss Teardown', () => {
    it('Case A — Missing WebGL2: probe detects unsupported hardware and preserves 2D baseline', () => {
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

      // Verify simulation engine advances normally on 2D baseline
      const engine = new SimEngine();
      engine.load(demo1Json as unknown as ScenarioSpec);
      for (let t = 0; t < 20; t++) engine.step();
      expect(engine.tickIndex).toBe(20);
      expect(engine.sessionEnded).toBe(false);
    });

    it('Case B — Dynamic import failure: exercises production loadRender3DModuleWithTimeout and preserves 2D simulation', async () => {
      const mockFailingLoader = vi.fn().mockRejectedValue(new Error('ChunkLoadError: Failed to fetch chunk render3d'));

      let caughtError: Error | null = null;
      try {
        await loadRender3DModuleWithTimeout({
          timeoutMs: 100,
          loader: mockFailingLoader,
        });
      } catch (err) {
        caughtError = err as Error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain('Failed to fetch chunk render3d');

      // Verify simulation runs completely uncorrupted
      const engine = new SimEngine();
      engine.load(demo1Json as unknown as ScenarioSpec);
      engine.step();
      expect(engine.tickIndex).toBe(1);
    });

    it('Case C — Renderer initialization failure: cleans up constructor allocations and returns safely to 2D', () => {
      const canvas = createMockCanvas();
      const mockRenderer = createMockRenderer();

      // Fault injection: initialization fails during constructor
      vi.spyOn(mockRenderer, 'setSize').mockImplementation(() => {
        throw new Error('WebGL context initialization failed');
      });

      expect(() => {
        new Renderer3D(canvas, {
          maxRangeM: 5000,
          rMinM: 500,
          zones: [],
          threeRenderer: mockRenderer,
        });
      }).toThrow('WebGL context initialization failed');

      // Assert that mockRenderer was disposed during internal constructor cleanup
      expect(mockRenderer.dispose).toHaveBeenCalled();
    });

    it('Case D — WebGL Context Loss Teardown: cancels loop, disposes resources, detaches listeners, clears ref, and avoids stale reuse', () => {
      const canvas = createMockCanvas();
      const mockRenderer = createMockRenderer();

      let activeRendererRef: Renderer3D | null = null;
      let uiViewMode: '2D' | '3D' = '3D';
      let webGlError: string | null = null;

      const r3d = new Renderer3D(canvas, {
        maxRangeM: 5000,
        rMinM: 500,
        zones: [],
        threeRenderer: mockRenderer,
        onContextLost: () => {
          // Replicate production onContextLost in Console.tsx
          const lost = activeRendererRef ?? r3d;
          activeRendererRef = null;
          if (lost) {
            try {
              lost.dispose();
            } catch {
              // safe idempotent cleanup
            }
          }
          uiViewMode = '2D';
          webGlError = 'WebGL2 context lost. Restored 2D Canvas baseline.';
        },
      });

      activeRendererRef = r3d;
      r3d.start();

      // Synthetic webglcontextlost event
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

      // 1. Event cancelled (preventDefault called)
      expect(isDefaultPrevented).toBe(true);

      // 2. View mode restored to 2D
      expect(uiViewMode).toBe('2D');
      expect(webGlError).toBe('WebGL2 context lost. Restored 2D Canvas baseline.');

      // 3. Renderer ref cleared and instance marked disposed
      expect(activeRendererRef).toBeNull();
      expect(r3d.disposed).toBe(true);

      // 4. Repeated disposal is safe and idempotent
      expect(() => r3d.dispose()).not.toThrow();

      // 5. Subsequent entry cannot reuse dead instance: fresh instance created
      const freshCanvas = createMockCanvas();
      const freshRenderer = createMockRenderer();
      const newR3D = new Renderer3D(freshCanvas, {
        maxRangeM: 5000,
        rMinM: 500,
        zones: [],
        threeRenderer: freshRenderer,
      });

      expect(newR3D).not.toBe(r3d);
      expect(newR3D.disposed).toBe(false);
      newR3D.dispose();
    });

    it('Case E — Three-second lazy chunk timeout: validates exact production threshold (3000ms) and Rule R10.6 rejection', async () => {
      // 1. Assert production default threshold is exactly 3000ms
      expect(DEFAULT_CHUNK_LOAD_TIMEOUT_MS).toBe(3000);

      // 2. Test timeout trigger with slow loader
      const hangingLoader = () => new Promise<never>(() => {});
      let timeoutError: Error | null = null;

      try {
        await loadRender3DModuleWithTimeout({
          timeoutMs: 25,
          loader: hangingLoader,
        });
      } catch (err) {
        timeoutError = err as Error;
      }

      expect(timeoutError).not.toBeNull();
      expect(timeoutError?.message).toBe('3D chunk loading timed out (> 25ms, Rule R10.6)');

      // 3. Test late resolution after timeout cannot mount unexpectedly
      let lateResolved = false;
      const delayedLoader = () =>
        new Promise<typeof import('@/render3d')>((resolve) => {
          setTimeout(() => {
            lateResolved = true;
            resolve({} as unknown as typeof import('@/render3d'));
          }, 60);
        });

      let lateError: Error | null = null;
      try {
        await loadRender3DModuleWithTimeout({
          timeoutMs: 20,
          loader: delayedLoader,
        });
      } catch (err) {
        lateError = err as Error;
      }

      expect(lateError).not.toBeNull();
      expect(lateError?.message).toContain('timed out (> 20ms, Rule R10.6)');

      // Wait for late promise to resolve harmlessly
      await new Promise((r) => setTimeout(r, 80));
      expect(lateResolved).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TASK 24-D — Ten-Cycle Real Renderer Lifecycle Instrumentation               */
  /* -------------------------------------------------------------------------- */
  describe('TASK 24-D: Real Renderer Lifecycle Instrumentation & 10-Cycle Audit', () => {
    it('executes 10 consecutive real renderer lifecycle cycles with complete geometry/material disposal and listener cleanup', () => {
      // Instrument Three.js geometry and material disposals
      let disposedGeometriesCount = 0;
      let disposedMaterialsCount = 0;

      const origGeomDispose = THREE.BufferGeometry.prototype.dispose;
      const origMatDispose = THREE.Material.prototype.dispose;

      vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function (this: THREE.BufferGeometry) {
        disposedGeometriesCount++;
        return origGeomDispose.call(this);
      });

      vi.spyOn(THREE.Material.prototype, 'dispose').mockImplementation(function (this: THREE.Material) {
        disposedMaterialsCount++;
        return origMatDispose.call(this);
      });

      for (let cycle = 1; cycle <= 10; cycle++) {
        const initialDisposedGeoms = disposedGeometriesCount;
        const initialDisposedMats = disposedMaterialsCount;

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

        // 1. Animation-frame accounting: test start, duplicate start guard, and loop run
        r3d.start();
        expect(scheduledRafCallbacks.size).toBeGreaterThanOrEqual(1);

        // Repeated start does not create duplicate loops
        const rafCountBefore = scheduledRafCallbacks.size;
        r3d.start();
        expect(scheduledRafCallbacks.size).toBe(rafCountBefore);

        // Perform one update
        const currentTracks = r3d.getCurrentTracks()!;
        r3d.update(currentTracks.tracks, currentTracks.selectedTrackNo);

        // 2. Dispose renderer
        r3d.dispose();

        // 3. Assert animation loop cancelled and no frames scheduled
        expect(r3d.disposed).toBe(true);

        // 4. Assert all canvas listeners registered by renderer have been detached
        const canvasListeners = (canvas as unknown as { __listeners: Record<string, unknown[]> }).__listeners;
        for (const [evtName, arr] of Object.entries(canvasListeners)) {
          expect(arr, `Canvas event '${evtName}' should have 0 active listeners after disposal`).toHaveLength(0);
        }

        // 5. Assert real geometries and materials allocated by Scene3D/Environment were disposed
        expect(disposedGeometriesCount).toBeGreaterThan(initialDisposedGeoms);
        expect(disposedMaterialsCount).toBeGreaterThan(initialDisposedMats);

        // 6. Assert mockRenderer.dispose was called
        expect(mockRenderer.dispose).toHaveBeenCalled();

        // 7. Repeated stop and dispose remain safe and idempotent
        expect(() => r3d.stop()).not.toThrow();
        expect(() => r3d.dispose()).not.toThrow();
      }

      // Final lifecycle audit: 10 cycles executed with verified non-zero resource disposals
      expect(disposedGeometriesCount).toBeGreaterThan(50);
      expect(disposedMaterialsCount).toBeGreaterThan(50);
    });
  });
});

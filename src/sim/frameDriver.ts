/**
 * FrameDriver abstraction for simulation animation-frame source decoupling.
 * Implements ARCHITECTURE.md §1.3 and Optional Task 14:
 *
 * Pluggable frame source that drives the 20 Hz simulation accumulator:
 * - Window driver (requestAnimationFrame) for desktop 2D & 3D views.
 * - WebXR driver (renderer.setAnimationLoop) for immersive VR presentation.
 * - Handoff protocol: swaps frame driver while strictly preserving simulation accumulator,
 *   tick index, input queue, and session state without resets or fast-forwards.
 */

export interface FrameDriver {
  readonly name: string;
  start(callback: (now: number, frame?: unknown) => void): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * Standard browser requestAnimationFrame driver for desktop 2D canvas and 3D viewport.
 */
export function windowDriver(): FrameDriver {
  let animId: number | null = null;
  let running = false;

  return {
    name: 'WindowDriver (rAF)',
    start(cb) {
      if (running) return;
      running = true;

      const loop = (now: number) => {
        if (!running) return;
        cb(now);
        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    },
    isRunning() {
      return running;
    },
  };
}

/**
 * Three.js WebXR animation loop driver.
 * Uses renderer.setAnimationLoop to receive frame timestamps synchronized to VR headset refresh rates.
 */
export function xrDriver(renderer: {
  setAnimationLoop: (cb: ((time: number, frame?: unknown) => void) | null) => void;
}): FrameDriver {
  let running = false;

  return {
    name: 'WebXRDriver (setAnimationLoop)',
    start(cb) {
      if (running) return;
      running = true;

      renderer.setAnimationLoop((time: number, frame?: unknown) => {
        if (!running) return;
        cb(time, frame);
      });
    },
    stop() {
      running = false;
      renderer.setAnimationLoop(null);
    },
    isRunning() {
      return running;
    },
  };
}

/**
 * Manual / Virtual mock driver for deterministic unit testing.
 */
export function mockDriver(): FrameDriver & {
  stepFrame: (timestamp: number, frame?: unknown) => void;
} {
  let running = false;
  let savedCb: ((now: number, frame?: unknown) => void) | null = null;

  return {
    name: 'MockDriver',
    start(cb) {
      running = true;
      savedCb = cb;
    },
    stop() {
      running = false;
      savedCb = null;
    },
    isRunning() {
      return running;
    },
    stepFrame(timestamp: number, frame?: unknown) {
      if (running && savedCb) {
        savedCb(timestamp, frame);
      }
    },
  };
}

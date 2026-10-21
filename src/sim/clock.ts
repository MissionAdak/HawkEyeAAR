/**
 * Accumulator clock for 20 Hz deterministic tick execution.
 * Only this file reads performance.now() (Rules.md DT-5).
 */

export const TICK_MS = 50;
export const MAX_FRAME_MS = 250;

export class SimClock {
  private lastFrameTs: number = 0;
  private accumulatorMs: number = 0;
  private speed: number = 1.0;
  private isPaused: boolean = false;
  private isInitialized: boolean = false;
  private sessionStartWallMs: number = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.isInitialized = false;
    this.lastFrameTs = 0;
    this.accumulatorMs = 0;
    this.speed = 1.0;
    this.isPaused = false;
    this.sessionStartWallMs = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(speed, 4.0));
  }

  public getSpeed(): number {
    return this.speed;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.lastFrameTs = performance.now();
  }

  /**
   * Resynchronizes lastFrameTs without altering pause state.
   * Prevents timestamp jumps when swapping FrameDrivers without unpausing an operator-paused simulation.
   */
  public resync(now?: number): void {
    this.lastFrameTs = now ?? (typeof performance !== 'undefined' ? performance.now() : 0);
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Advances accumulator and returns number of 50ms ticks to execute this frame,
   * plus the interpolation alpha [0, 1) for rendering.
   */
  public advance(frameTs: number): { ticksToRun: number; alpha: number } {
    if (this.isPaused) {
      this.lastFrameTs = frameTs;
      return { ticksToRun: 0, alpha: 0 };
    }

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.lastFrameTs = frameTs;
      return { ticksToRun: 0, alpha: 0 };
    }

    const deltaMs = Math.min(frameTs - this.lastFrameTs, MAX_FRAME_MS);
    this.lastFrameTs = frameTs;
    this.accumulatorMs += deltaMs * this.speed;

    const ticksToRun = Math.floor((this.accumulatorMs + 1e-6) / TICK_MS);
    this.accumulatorMs = Math.max(0, this.accumulatorMs - ticksToRun * TICK_MS);
    const alpha = this.accumulatorMs / TICK_MS;

    return { ticksToRun, alpha };
  }

  /**
   * Helper to compute raw milliseconds relative to the sim start (Rules.md DT-4, R-17)
   */
  public getRawMs(eventTimeStamp?: number): number {
    if (typeof performance === 'undefined') return 0;
    if (!this.sessionStartWallMs) {
      this.sessionStartWallMs = performance.now();
    }
    const ts = eventTimeStamp ?? performance.now();
    return Math.max(0, Math.round(ts - this.sessionStartWallMs));
  }
}

export const clockInstance = new SimClock();

/**
 * DRISHTI-CUAS Simulation Clock & Fixed-Timestep Accumulator
 *
 * Rules: DT-1, DT-4, DT-5
 * TICK_MS = 50 (dt = 0.05 s, 20 Hz fixed timestep)
 * MAX_FRAME_MS = 250 (spiral of death guard)
 * The sim NEVER reads wall clocks. Only this file reads performance.now()
 * to feed the accumulator.
 */

export const TICK_MS = 50;
export const DT = 0.05; // 50 ms in seconds
export const MAX_FRAME_MS = 250;

export interface ClockStepResult {
  ticksToStep: number;
  alpha: number; // 0..1 for render interpolation
}

export class SimClock {
  private accumulatorMs = 0;
  private lastFrameTs = 0;
  private speed = 1;
  private isPaused = false;
  private isRunning = false;

  constructor(speed = 1) {
    this.speed = speed;
  }

  public start(): void {
    this.lastFrameTs = performance.now();
    this.accumulatorMs = 0;
    this.isRunning = true;
    this.isPaused = false;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (this.isPaused) {
      this.lastFrameTs = performance.now();
      this.isPaused = false;
    }
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(4, speed));
  }

  public getSpeed(): number {
    return this.speed;
  }

  public paused(): boolean {
    return this.isPaused;
  }

  public running(): boolean {
    return this.isRunning;
  }

  /**
   * Called on requestAnimationFrame(frameTs).
   * Accumulates real elapsed time (capped by MAX_FRAME_MS) and returns the number
   * of 50 ms ticks to advance, along with alpha for render interpolation.
   */
  public update(currentFrameTs?: number): ClockStepResult {
    if (!this.isRunning || this.isPaused) {
      return { ticksToStep: 0, alpha: 0 };
    }

    const now = currentFrameTs ?? performance.now();
    const frameDelta = Math.min(now - this.lastFrameTs, MAX_FRAME_MS);
    this.lastFrameTs = now;

    return this.advanceAccumulator(frameDelta * this.speed);
  }

  /**
   * Pure accumulator step. Directly accepts delta time in milliseconds.
   * Useful for testing deterministic step advances (e.g. 16.7 ms, 6.9 ms, 33 ms).
   */
  public advanceAccumulator(deltaMs: number): ClockStepResult {
    const EPSILON = 1e-6;
    this.accumulatorMs += deltaMs;
    const ticksToStep = Math.floor((this.accumulatorMs + EPSILON) / TICK_MS);
    this.accumulatorMs = Math.max(0, this.accumulatorMs - ticksToStep * TICK_MS);
    const alpha = this.accumulatorMs / TICK_MS;

    return {
      ticksToStep,
      alpha: Math.max(0, Math.min(1, alpha)),
    };
  }

  /**
   * Resets accumulator and state.
   */
  public reset(): void {
    this.accumulatorMs = 0;
    this.lastFrameTs = 0;
    this.isPaused = false;
    this.isRunning = false;
  }

  /**
   * Raw input timestamp to sim-quantised tick calculation.
   * DT-4: applyTick = Math.max(Math.ceil(tRawMs / 50), currentTick + 1)
   */
  public static quantiseInput(tRawMs: number, currentTick: number): { applyTick: number; tMs: number } {
    const applyTick = Math.max(Math.ceil(tRawMs / TICK_MS), currentTick + 1);
    const tMs = applyTick * TICK_MS;
    return { applyTick, tMs };
  }

  /**
   * Computes sim time in milliseconds from tick index.
   */
  public static toSimTimeMs(tickIndex: number): number {
    return tickIndex * TICK_MS;
  }
}

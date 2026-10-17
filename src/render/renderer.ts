import { RadarLayer } from './radarLayer';
import { engineInstance, clockInstance, useSessionStore } from '@/store/sessionStore';
import { CONFIG } from '@/config';

export class ConsoleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private radarLayer: RadarLayer;
  private animationFrameId: number | null = null;
  public isLowFidelity: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;
    this.radarLayer = new RadarLayer(CONFIG.thresholds.radarMaxRangeM);
  }

  public setLowFidelity(lowFi: boolean): void {
    this.isLowFidelity = lowFi;
  }

  public start(): void {
    if (this.animationFrameId !== null) return;

    const loop = (frameTs: number) => {
      this.tickAndRender(frameTs);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tickAndRender(frameTs: number): void {
    // 1. Advance simulation accumulator clock
    const { ticksToRun, alpha } = clockInstance.advance(frameTs);

    // 2. Step physics and simulation engine
    for (let i = 0; i < ticksToRun; i++) {
      engineInstance.step();
    }

    // 3. Publish UI snapshot to Zustand once per frame if ticks occurred
    if (ticksToRun > 0) {
      useSessionStore.getState().setUiSnapshot(engineInstance.buildUiSnapshot());
    }

    // 4. Compute sweep rotation angle (30 RPM = 1 rev per 2000 ms)
    const sweepPeriodMs = CONFIG.thresholds.radarSweepPeriodMs || 2000;
    const currentSimMs = (engineInstance.tickIndex + alpha) * 50;
    const sweepProgress = (currentSimMs % sweepPeriodMs) / sweepPeriodMs;
    // 0 rad is at 3 o'clock (090 deg), sweep starts at 12 o'clock (000 deg = -PI/2) and turns clockwise
    const sweepAngleRad = -Math.PI / 2 + sweepProgress * Math.PI * 2;

    // 5. Render active sensor view
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (engineInstance.activeSensor === 'RADAR') {
      this.radarLayer.renderDynamic(
        this.ctx,
        width,
        height,
        sweepAngleRad,
        engineInstance.curr,
        engineInstance.prev,
        alpha,
        engineInstance.selectedTrackNo,
        engineInstance.spec?.zones || []
      );
    } else {
      // Placeholder until EO/IR and RF dedicated renderers in Phase 1
      this.radarLayer.renderDynamic(
        this.ctx,
        width,
        height,
        sweepAngleRad,
        engineInstance.curr,
        engineInstance.prev,
        alpha,
        engineInstance.selectedTrackNo,
        engineInstance.spec?.zones || []
      );
    }
  }
}

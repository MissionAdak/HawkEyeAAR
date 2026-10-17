import { RadarLayer } from './radarLayer';
import { EoirLayer } from './eoirLayer';
import { RfLayer } from './rfLayer';
import { engineInstance, clockInstance, useSessionStore } from '@/store/sessionStore';
import { CONFIG } from '@/config';

export class ConsoleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private radarLayer: RadarLayer;
  private eoirLayer: EoirLayer;
  private rfLayer: RfLayer;
  private animationFrameId: number | null = null;
  public isLowFidelity: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;

    this.radarLayer = new RadarLayer(CONFIG.thresholds.radarMaxRangeM);
    this.eoirLayer = new EoirLayer();
    this.rfLayer = new RfLayer();
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

    // 3. Compute continuous simulation time in milliseconds
    const currentSimMs = (engineInstance.tickIndex + alpha) * 50;

    // 4. Visual Sensor Chaos Engine: check active environment chaos events
    let fogSeverity = 0;
    let isJamming = false;

    const chaosList = engineInstance.spec?.chaos;
    if (chaosList) {
      for (let i = 0; i < chaosList.length; i++) {
        const c = chaosList[i];
        if (currentSimMs >= c.tStartMs && currentSimMs <= c.tEndMs) {
          if (c.type === 'FOG') {
            fogSeverity = Math.max(fogSeverity, c.severity);
          } else if (c.type === 'JAMMING') {
            isJamming = true;
          }
        }
      }
    }

    // Keep sensor health updated based on active chaos state
    engineInstance.sensorHealth.EOIR = fogSeverity > 0 ? 'DEG' : 'OK';
    engineInstance.sensorHealth.RF = isJamming ? 'OUT' : 'OK';

    // 5. Publish UI snapshot to Zustand once per frame if ticks occurred
    if (ticksToRun > 0) {
      useSessionStore.getState().setUiSnapshot(engineInstance.buildUiSnapshot());
    }

    // 6. Compute radar sweep rotation angle (30 RPM = 1 rev per 2000 ms)
    const sweepPeriodMs = CONFIG.thresholds.radarSweepPeriodMs || 2000;
    const sweepProgress = (currentSimMs % sweepPeriodMs) / sweepPeriodMs;
    // 0 rad is at 3 o'clock (090 deg), sweep starts at 12 o'clock (000 deg = -PI/2) and turns clockwise
    const sweepAngleRad = -Math.PI / 2 + sweepProgress * Math.PI * 2;

    // 7. Dispatch rendering to active sensor mode pipeline
    const width = this.canvas.width;
    const height = this.canvas.height;
    const activeSensor = engineInstance.activeSensor;

    if (activeSensor === 'RADAR') {
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
    } else if (activeSensor === 'EOIR') {
      // Calculate thermal camera boresight azimuth (defaults to selected track or 000°)
      let eoirAzimuth = engineInstance.eoirAzimuthDeg;
      if (engineInstance.selectedTrackNo) {
        const sel = engineInstance.curr.find((e) => e.trackNo === engineInstance.selectedTrackNo);
        if (sel) {
          const selRad = Math.atan2(sel.pos.x, sel.pos.y);
          eoirAzimuth = ((selRad * 180) / Math.PI + 360) % 360;
        }
      }

      this.eoirLayer.render(
        this.ctx,
        width,
        height,
        engineInstance.curr,
        engineInstance.prev,
        alpha,
        eoirAzimuth,
        engineInstance.spec,
        fogSeverity,
        engineInstance.selectedTrackNo
      );
    } else if (activeSensor === 'RF') {
      this.rfLayer.renderDynamic(
        this.ctx,
        width,
        height,
        engineInstance.curr,
        engineInstance.prev,
        alpha,
        currentSimMs,
        isJamming,
        engineInstance.selectedTrackNo
      );
    }
  }
}

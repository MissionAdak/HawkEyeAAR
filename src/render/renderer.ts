import { RadarLayer } from './radarLayer';
import { EoirLayer } from './eoirLayer';
import { RfLayer } from './rfLayer';
import { engineInstance, clockInstance, useSessionStore } from '@/store/sessionStore';
import { CONFIG } from '@/config';
import { type FrameDriver, windowDriver } from '@/sim/frameDriver';

export class ConsoleRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly radarLayer: RadarLayer;
  private readonly eoirLayer: EoirLayer;
  private readonly rfLayer: RfLayer;
  private frameDriver: FrameDriver;
  public isLowFidelity: boolean = false;

  constructor(canvas: HTMLCanvasElement, initialDriver?: FrameDriver) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;

    this.radarLayer = new RadarLayer(CONFIG.thresholds.radarMaxRangeM);
    this.eoirLayer = new EoirLayer();
    this.rfLayer = new RfLayer();
    this.frameDriver = initialDriver ?? windowDriver();
  }

  public setLowFidelity(lowFi: boolean): void {
    this.isLowFidelity = lowFi;
  }

  public start(): void {
    if (this.frameDriver.isRunning()) return;

    this.frameDriver.start((frameTs: number) => {
      this.tickAndRender(frameTs);
    });
  }

  public stop(): void {
    this.frameDriver.stop();
  }

  /**
   * Pluggable FrameDriver handoff (ARCHITECTURE.md §1.3 & Optional Task 14).
   * Seamlessly swaps frame driver (e.g. windowDriver <-> xrDriver) while
   * strictly preserving sim accumulator, tick, input queue, and session state.
   */
  public setFrameDriver(nextDriver: FrameDriver): void {
    if (this.frameDriver === nextDriver) return;
    const wasRunning = this.frameDriver.isRunning();
    this.frameDriver.stop();
    this.frameDriver = nextDriver;
    // Resuming clock synchronizes lastFrameTs with current wall-time, preventing fast-forward
    clockInstance.resume();
    if (wasRunning) {
      this.frameDriver.start((frameTs: number) => {
        this.tickAndRender(frameTs);
      });
    }
  }

  public getFrameDriver(): FrameDriver {
    return this.frameDriver;
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
    const { fogSeverity, isJamming } = this.computeChaosState(currentSimMs);

    // Keep sensor health updated based on active chaos state
    engineInstance.sensorHealth.EOIR = fogSeverity > 0 ? 'DEG' : 'OK';
    engineInstance.sensorHealth.RF = isJamming ? 'OUT' : 'OK';

    // 5. Publish UI snapshot to Zustand once per frame if ticks occurred
    if (ticksToRun > 0) {
      useSessionStore.getState().setUiSnapshot(engineInstance.buildUiSnapshot());
    }

    // 6. Dispatch rendering to active sensor mode pipeline
    this.renderActiveSensor(
      this.canvas.width,
      this.canvas.height,
      currentSimMs,
      alpha,
      fogSeverity,
      isJamming
    );
  }

  private computeChaosState(currentSimMs: number): { fogSeverity: number; isJamming: boolean } {
    let fogSeverity = 0;
    let isJamming = false;

    const chaosList = engineInstance.spec?.chaos;
    if (chaosList) {
      for (const c of chaosList) {
        if (currentSimMs >= c.tStartMs && currentSimMs <= c.tEndMs) {
          if (c.type === 'FOG') {
            fogSeverity = Math.max(fogSeverity, c.severity);
          } else if (c.type === 'JAMMING') {
            isJamming = true;
          }
        }
      }
    }

    return { fogSeverity, isJamming };
  }

  private renderActiveSensor(
    width: number,
    height: number,
    currentSimMs: number,
    alpha: number,
    fogSeverity: number,
    isJamming: boolean
  ): void {
    const activeSensor = engineInstance.activeSensor;

    if (activeSensor === 'RADAR') {
      const sweepPeriodMs = CONFIG.thresholds.radarSweepPeriodMs || 2000;
      const sweepProgress = (currentSimMs % sweepPeriodMs) / sweepPeriodMs;
      // 0 rad is at 3 o'clock (090 deg), sweep starts at 12 o'clock (000 deg = -PI/2) and turns clockwise
      const sweepAngleRad = -Math.PI / 2 + sweepProgress * Math.PI * 2;

      this.radarLayer.renderDynamic(this.ctx, width, height, {
        sweepAngleRad,
        currEntities: engineInstance.curr,
        prevEntities: engineInstance.prev,
        alpha,
        selectedTrackNo: engineInstance.selectedTrackNo,
        zones: engineInstance.spec?.zones || [],
      });
    } else if (activeSensor === 'EOIR') {
      let eoirAzimuth = engineInstance.eoirAzimuthDeg;
      if (engineInstance.selectedTrackNo) {
        const sel = engineInstance.curr.find((e) => e.trackNo === engineInstance.selectedTrackNo);
        if (sel) {
          const selRad = Math.atan2(sel.pos.x, sel.pos.y);
          eoirAzimuth = ((selRad * 180) / Math.PI + 360) % 360;
        }
      }

      this.eoirLayer.render(this.ctx, width, height, {
        currEntities: engineInstance.curr,
        prevEntities: engineInstance.prev,
        alpha,
        azimuthDeg: eoirAzimuth,
        spec: engineInstance.spec,
        fogSeverity,
        selectedTrackNo: engineInstance.selectedTrackNo,
      });
    } else if (activeSensor === 'RF') {
      this.rfLayer.renderDynamic(this.ctx, width, height, {
        currEntities: engineInstance.curr,
        prevEntities: engineInstance.prev,
        alpha,
        simTimeMs: currentSimMs,
        isJamming,
        selectedTrackNo: engineInstance.selectedTrackNo,
      });
    }
  }
}

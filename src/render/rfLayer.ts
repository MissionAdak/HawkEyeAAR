import { PALETTE } from './palette';
import type { TrackEntity } from '@/sim/types';

// Pre-cached Path2D objects for zero allocations during 60 fps rendering
const SafePath2D = typeof Path2D !== 'undefined'
  ? Path2D
  : class MockPath2D {
      public moveTo(_x: number, _y: number): void { /* Headless stub */ }
      public lineTo(_x: number, _y: number): void { /* Headless stub */ }
      public arc(..._args: unknown[]): void { /* Headless stub */ }
      public ellipse(..._args: unknown[]): void { /* Headless stub */ }
      public quadraticCurveTo(..._args: unknown[]): void { /* Headless stub */ }
      public closePath(): void { /* Headless stub */ }
      public rect(..._args: unknown[]): void { /* Headless stub */ }
    } as unknown as typeof Path2D;

const arrowMarkerPath = new SafePath2D();
arrowMarkerPath.moveTo(-3, -4);
arrowMarkerPath.lineTo(3, -4);
arrowMarkerPath.lineTo(0, 0);
arrowMarkerPath.closePath();

const centerArrayPath = new SafePath2D();
centerArrayPath.arc(0, 0, 6, 0, Math.PI * 2);
centerArrayPath.moveTo(-10, 0);
centerArrayPath.lineTo(-4, 0);
centerArrayPath.moveTo(4, 0);
centerArrayPath.lineTo(10, 0);
centerArrayPath.moveTo(0, -10);
centerArrayPath.lineTo(0, -4);
centerArrayPath.moveTo(0, 4);
centerArrayPath.lineTo(0, 10);

/**
 * Deterministic integer hash to compute PRNG values without Math.random()
 */
function hash32(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function getCardinalText(deg: number): string {
  switch (deg) {
    case 0:
      return '000';
    case 90:
      return '090';
    case 180:
      return '180';
    case 270:
      return '270';
    default:
      return '000';
  }
}

export interface RfRenderOptions {
  currEntities: TrackEntity[];
  prevEntities: TrackEntity[];
  alpha: number;
  simTimeMs: number;
  isJamming: boolean;
  selectedTrackNo?: string | null;
}

export class RfLayer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private readonly prevMap: Map<string, TrackEntity> = new Map();

  // Waterfall Off-Screen Buffer (200 frequency bins x 80 history rows)
  private wfCanvas: HTMLCanvasElement | null = null;
  private wfCtx: CanvasRenderingContext2D | null = null;
  private wfImageData: ImageData | null = null;
  private wfU32: Uint32Array | null = null;
  private lastScrollSimMs: number = 0;

  // 4 Hz Direction-Finding Jitter Cache
  private lastJitterStep: number = -1;
  private readonly cachedJitters: Map<string, number> = new Map();

  constructor() {
    this.initWaterfallBuffer();
  }

  private initWaterfallBuffer(): void {
    if (typeof document === 'undefined') return;
    this.wfCanvas = document.createElement('canvas');
    this.wfCanvas.width = 200;
    this.wfCanvas.height = 80;
    this.wfCtx = this.wfCanvas.getContext('2d');
    if (!this.wfCtx) return;

    this.wfImageData = this.wfCtx.createImageData(200, 80);
    this.wfU32 = new Uint32Array(this.wfImageData.data.buffer);

    for (let i = 0; i < this.wfU32.length; i++) {
      this.wfU32[i] = 0xff10150b;
    }
    this.wfCtx.putImageData(this.wfImageData, 0, 0);
  }

  public prepareStaticLayer(width: number, height: number): void {
    if (typeof document === 'undefined') return;
    this.staticCanvas ??= document.createElement('canvas');
    this.staticCanvas.width = width;
    this.staticCanvas.height = height;

    const ctx = this.staticCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = PALETTE.carbon950;
    ctx.fillRect(0, 0, width, height);

    this.drawStaticCompass(ctx, width, height);
    this.drawStaticWaterfallFrame(ctx, width, height);
  }

  private drawStaticCompass(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 15;

    ctx.strokeStyle = PALETTE.phosphorDim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let deg = 0; deg < 360; deg += 10) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      let tickLen = 3;
      if (isCardinal) {
        tickLen = 10;
      } else if (deg % 30 === 0) {
        tickLen = 6;
      }

      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      ctx.beginPath();
      ctx.moveTo(cx + (radius - tickLen) * cos, cy + (radius - tickLen) * sin);
      ctx.lineTo(cx + radius * cos, cy + radius * sin);
      ctx.stroke();

      if (isCardinal) {
        ctx.fillStyle = PALETTE.phosphor;
        ctx.font = 'bold 10px "Chakra Petch"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lx = cx + (radius + 10) * cos;
        const ly = cy + (radius + 10) * sin;
        ctx.fillText(getCardinalText(deg), lx, ly);
      }
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = PALETTE.phosphor;
    ctx.lineWidth = 1;
    ctx.stroke(centerArrayPath);
    ctx.restore();

    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.phosphor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('RF DIRECTION FINDER // INTERFEROMETRIC ESM', 20, 16);

    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('BEARING ACCURACY: ±5° RMS | SCAN: 4 Hz', 20, 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.phosphor;
    ctx.fillText('ARRAY: 4-CH ADCOCK', width - 20, 16);
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('BAND: 400MHz - 6.0GHz', width - 20, 28);
  }

  private drawStaticWaterfallFrame(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const wfTop = height - 120;
    ctx.fillStyle = PALETTE.carbon900;
    ctx.fillRect(0, wfTop, width, 120);

    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, wfTop);
    ctx.lineTo(width, wfTop);
    ctx.stroke();

    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPECTRUM WATERFALL (200 BINS // 1 ROW / 100MS)', 10, wfTop + 10);

    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('FREQ: 400MHz - 6.0GHz', width - 10, wfTop + 10);

    ctx.strokeStyle = PALETTE.line;
    ctx.beginPath();
    ctx.moveTo(10, wfTop + 20);
    ctx.lineTo(width - 10, wfTop + 20);
    ctx.stroke();

    const bands: { label: string; bin: number }[] = [
      { label: '433M', bin: 25 },
      { label: '915M', bin: 52 },
      { label: '1.2G', bin: 82 },
      { label: '2.4G', bin: 135 },
      { label: '5.8G', bin: 180 },
    ];

    ctx.font = '8px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const b of bands) {
      const bx = 10 + (b.bin / 200) * 500;
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(b.label, bx, wfTop + 20);

      ctx.beginPath();
      ctx.moveTo(bx, wfTop + 20);
      ctx.lineTo(bx, wfTop + 23);
      ctx.stroke();
    }

    ctx.font = '8px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.textDim;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('NOISE FLOOR: -105 dBm | ESM: ACTIVE | RBW: 25 kHz', 10, height - 8);

    ctx.textAlign = 'right';
    ctx.fillText('DF CORRELATION: DUAL-CHANNEL IQ', width - 10, height - 8);
  }

  private getEmitterChannel(entity: TrackEntity): { bin: number; tag: 'RID' | 'LINK' } {
    let hash = 0;
    for (let i = 0; i < entity.id.length; i++) {
      const code = entity.id.codePointAt(i) ?? 0;
      hash = Math.trunc(hash * 31 + code);
    }
    const offset = (Math.abs(hash) % 7) - 3;

    if (entity.remoteId) {
      return { bin: Math.max(5, Math.min(195, 135 + offset)), tag: 'RID' };
    }
    if (entity.droneType === 'FPV_ATTACK') {
      return { bin: Math.max(5, Math.min(195, 180 + offset)), tag: 'LINK' };
    }
    if (entity.droneType === 'LOITERING_MUNITION') {
      return { bin: Math.max(5, Math.min(195, 25 + offset)), tag: 'LINK' };
    }
    if (entity.droneType === 'SWARM_ELEMENT') {
      return { bin: Math.max(5, Math.min(195, 52 + offset)), tag: 'LINK' };
    }
    return { bin: Math.max(5, Math.min(195, 125 + offset)), tag: 'LINK' };
  }

  private fillJammingRow(wfU32: Uint32Array, seedTimeMs: number): void {
    for (let b = 0; b < 200; b++) {
      const noise = hash32(seedTimeMs, b) % 100;
      let col = 0xff0066cc;
      if (noise < 50) {
        col = 0xff0099ff;
      } else if (noise < 85) {
        col = 0xff3333ff;
      }
      wfU32[b] = col;
    }
  }

  private fillSignalRow(wfU32: Uint32Array, seedTimeMs: number, currEntities: TrackEntity[]): void {
    for (let b = 0; b < 200; b++) {
      const speckle = hash32(seedTimeMs, b) % 25;
      const green = 0x15 + (speckle >> 1);
      const red = 0x0b + (speckle >> 2);
      wfU32[b] = 0xff000000 | (0x10 << 16) | (green << 8) | red;
    }

    for (const e of currEntities) {
      if (e.lifecycle !== 'ACTIVE' && e.lifecycle !== 'LEAKED') continue;
      if (!e.emitsRf) continue;

      const { bin, tag } = this.getEmitterChannel(e);
      const color = tag === 'RID' ? 0xffffcc00 : 0xff66ff00;

      wfU32[bin] = color;
      if (bin > 0) wfU32[bin - 1] = tag === 'RID' ? 0xccbb9900 : 0xcc44aa00;
      if (bin < 199) wfU32[bin + 1] = tag === 'RID' ? 0xccbb9900 : 0xcc44aa00;
    }
  }

  private updateWaterfall(currEntities: TrackEntity[], simTimeMs: number, isJamming: boolean): void {
    if (!this.wfU32 || !this.wfImageData || !this.wfCtx) return;

    const elapsed = simTimeMs - this.lastScrollSimMs;
    if (elapsed < 100) return;

    const rowsToScroll = Math.min(5, Math.floor(elapsed / 100));
    this.lastScrollSimMs += rowsToScroll * 100;

    for (let r = 0; r < rowsToScroll; r++) {
      this.wfU32.copyWithin(200, 0, 200 * 79);
      if (isJamming) {
        this.fillJammingRow(this.wfU32, simTimeMs + r * 100);
      } else {
        this.fillSignalRow(this.wfU32, simTimeMs + r * 100, currEntities);
      }
    }

    this.wfCtx.putImageData(this.wfImageData, 0, 0);
  }

  public renderDynamic(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opts: RfRenderOptions
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 15;

    // 1. Static Layer Background
    if (this.staticCanvas?.width !== width || this.staticCanvas?.height !== height) {
      this.prepareStaticLayer(width, height);
    }
    if (this.staticCanvas) {
      ctx.drawImage(this.staticCanvas, 0, 0);
    }

    // 2. DF Lines Jitter Update
    this.updateJitterCache(opts.currEntities, opts.simTimeMs);

    // 3. Render DF Lines (if not jamming)
    if (!opts.isJamming) {
      this.drawDfLines(ctx, cx, cy, radius, opts);
    }

    // 4. Waterfall & Emitter Tags
    this.updateWaterfall(opts.currEntities, opts.simTimeMs, opts.isJamming);

    const wfTop = height - 120;
    const wfX = 10;
    const wfY = wfTop + 24;
    const wfW = width - 20;
    const wfH = 78;

    if (this.wfCanvas) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.wfCanvas, wfX, wfY, wfW, wfH);
      ctx.restore();
    }

    if (!opts.isJamming) {
      this.drawEmitterTags(ctx, wfX, wfY, wfW, wfTop, opts);
    } else {
      this.drawJammingAlertBanner(ctx, cx, wfY, wfH);
    }
  }

  private updateJitterCache(currEntities: TrackEntity[], simTimeMs: number): void {
    const step4Hz = Math.floor(simTimeMs / 250);
    if (step4Hz === this.lastJitterStep) return;

    this.lastJitterStep = step4Hz;
    this.cachedJitters.clear();

    for (const e of currEntities) {
      let idHash = 0;
      for (let j = 0; j < e.id.length; j++) {
        const code = e.id.codePointAt(j) ?? 0;
        idHash = Math.trunc(idHash * 31 + code);
      }
      const u = hash32(step4Hz, idHash) / 4294967296;
      this.cachedJitters.set(e.id, u * 10 - 5);
    }
  }

  private drawDfLines(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    opts: RfRenderOptions
  ): void {
    this.prevMap.clear();
    for (const prev of opts.prevEntities) {
      this.prevMap.set(prev.id, prev);
    }

    ctx.save();
    for (const curr of opts.currEntities) {
      if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED') continue;
      if (!curr.emitsRf) continue;

      const prev = this.prevMap.get(curr.id) ?? curr;
      const lerpedX = prev.pos.x * (1 - opts.alpha) + curr.pos.x * opts.alpha;
      const lerpedY = prev.pos.y * (1 - opts.alpha) + curr.pos.y * opts.alpha;

      const targetAzRad = Math.atan2(lerpedX, lerpedY);
      let targetAzDeg = (targetAzRad * 180) / Math.PI;
      if (targetAzDeg < 0) targetAzDeg += 360;

      const jitter = this.cachedJitters.get(curr.id) ?? 0;
      const strobeDeg = (targetAzDeg + jitter + 360) % 360;

      const canvasRad = ((strobeDeg - 90) * Math.PI) / 180;
      const endX = cx + Math.cos(canvasRad) * radius;
      const endY = cy + Math.sin(canvasRad) * radius;

      const isSelected = curr.trackNo === opts.selectedTrackNo;
      ctx.strokeStyle = isSelected ? PALETTE.friend : PALETTE.phosphor;
      ctx.lineWidth = isSelected ? 1.5 : 1;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.font = '9px "JetBrains Mono"';
      ctx.fillStyle = isSelected ? PALETTE.friend : PALETTE.phosphor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labelDist = radius - 18;
      ctx.fillText(
        `${Math.round(strobeDeg)}°`,
        cx + Math.cos(canvasRad) * labelDist,
        cy + Math.sin(canvasRad) * labelDist
      );
    }
    ctx.restore();
  }

  private drawEmitterTags(
    ctx: CanvasRenderingContext2D,
    wfX: number,
    wfY: number,
    wfW: number,
    wfTop: number,
    opts: RfRenderOptions
  ): void {
    ctx.save();
    for (const curr of opts.currEntities) {
      if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED') continue;
      if (!curr.emitsRf) continue;

      const { bin, tag } = this.getEmitterChannel(curr);
      const tagX = wfX + (bin / 200) * wfW;
      const isSelected = curr.trackNo === opts.selectedTrackNo;

      let color: string = PALETTE.phosphor;
      if (isSelected || tag === 'RID') {
        color = PALETTE.friend;
      }

      ctx.save();
      ctx.translate(tagX, wfY);
      ctx.fillStyle = color;
      ctx.fill(arrowMarkerPath);
      ctx.restore();

      ctx.font = 'bold 8px "JetBrains Mono"';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`[${tag} ${curr.trackNo ?? ''}]`, tagX, wfTop + 14);
    }
    ctx.restore();
  }

  private drawJammingAlertBanner(
    ctx: CanvasRenderingContext2D,
    cx: number,
    wfY: number,
    wfH: number
  ): void {
    ctx.save();
    const bannerW = 340;
    const bannerH = 34;
    const bx = cx - bannerW / 2;
    const by = wfY + (wfH - bannerH) / 2;

    ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
    ctx.fillRect(bx, by, bannerW, bannerH);
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    ctx.font = 'bold 11px "Chakra Petch"';
    ctx.fillStyle = PALETTE.amber;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('[RF OUT - JAMMING // BROADBAND NOISE ACTIVE]', cx, by + 4);

    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('DF LINES SUPPRESSED | NOISE LEVEL: +26 dB OVER NOISE FLOOR', cx, by + 18);
    ctx.restore();
  }
}

import { PALETTE } from './palette';
import type { TrackEntity } from '@/sim/types';

// Pre-cached Path2D objects for zero allocations during 60 fps rendering
const SafePath2D = typeof Path2D !== 'undefined'
  ? Path2D
  : class MockPath2D {
      moveTo() {}
      lineTo() {}
      arc() {}
      ellipse() {}
      quadraticCurveTo() {}
      closePath() {}
      rect() {}
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

export class RfLayer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private prevMap: Map<string, TrackEntity> = new Map();

  // Waterfall Off-Screen Buffer (200 frequency bins x 80 history rows)
  private wfCanvas: HTMLCanvasElement | null = null;
  private wfCtx: CanvasRenderingContext2D | null = null;
  private wfImageData: ImageData | null = null;
  private wfU32: Uint32Array | null = null;
  private lastScrollSimMs: number = 0;

  // 4 Hz Direction-Finding Jitter Cache
  private lastJitterStep: number = -1;
  private cachedJitters: Map<string, number> = new Map();

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

    // Initialise waterfall buffer with dark noise floor
    for (let i = 0; i < this.wfU32.length; i++) {
      this.wfU32[i] = 0xff10150b; // Deep carbon/teal background
    }
    this.wfCtx.putImageData(this.wfImageData, 0, 0);
  }

  /**
   * Pre-renders the static RF DF compass rose, bearing ticks, and waterfall frame
   * onto an offscreen canvas. Executes once or upon resize to guarantee 60 fps.
   */
  public prepareStaticLayer(width: number, height: number): void {
    if (typeof document === 'undefined') return;
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement('canvas');
    }
    this.staticCanvas.width = width;
    this.staticCanvas.height = height;

    const ctx = this.staticCanvas.getContext('2d');
    if (!ctx) return;

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 15;

    // 1. Dark Carbon Base Fill
    ctx.fillStyle = PALETTE.carbon950;
    ctx.fillRect(0, 0, width, height);

    // 2. Compass Outer Ring & Azimuth Heading Ticks
    ctx.strokeStyle = PALETTE.phosphorDim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let deg = 0; deg < 360; deg += 10) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const isMajor = deg % 30 === 0;
      const tickLen = isCardinal ? 10 : isMajor ? 6 : 3;

      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const x1 = cx + (radius - tickLen) * cos;
      const y1 = cy + (radius - tickLen) * sin;
      const x2 = cx + radius * cos;
      const y2 = cy + radius * sin;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isCardinal) {
        ctx.fillStyle = PALETTE.phosphor;
        ctx.font = 'bold 10px "Chakra Petch"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelRadius = radius + 10;
        const lx = cx + labelRadius * cos;
        const ly = cy + labelRadius * sin;
        const text = deg === 0 ? '000' : deg === 90 ? '090' : deg === 180 ? '180' : '270';
        ctx.fillText(text, lx, ly);
      }
    }

    // 3. Asset Antenna Crosshair at Center (260, 260)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = PALETTE.phosphor;
    ctx.lineWidth = 1;
    ctx.stroke(centerArrayPath);
    ctx.restore();

    // 4. Header Badges at Top
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

    // 5. Spectrum Waterfall Panel Frame at Bottom 120px (y = 400 to 520)
    const wfTop = height - 120;
    ctx.fillStyle = PALETTE.carbon900;
    ctx.fillRect(0, wfTop, width, 120);

    // Divider Border line at y = 400
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, wfTop);
    ctx.lineTo(width, wfTop);
    ctx.stroke();

    // Waterfall Header Strip (y = 400 to 420)
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPECTRUM WATERFALL (200 BINS // 1 ROW / 100MS)', 10, wfTop + 10);

    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('FREQ: 400MHz - 6.0GHz', width - 10, wfTop + 10);

    // Frequency Axis Ruler & Tactical Band Labels (y = 420)
    ctx.strokeStyle = PALETTE.line;
    ctx.beginPath();
    ctx.moveTo(10, wfTop + 20);
    ctx.lineTo(width - 10, wfTop + 20);
    ctx.stroke();

    // Pre-mark tactical bands across the 500px width (10 to 510)
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

    // Waterfall Footer Status Strip (y = 508 to 520)
    ctx.font = '8px "JetBrains Mono"';
    ctx.fillStyle = PALETTE.textDim;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('NOISE FLOOR: -105 dBm | ESM: ACTIVE | RBW: 25 kHz', 10, height - 8);

    ctx.textAlign = 'right';
    ctx.fillText('DF CORRELATION: DUAL-CHANNEL IQ', width - 10, height - 8);
  }

  /**
   * Deterministically maps an entity to a dedicated RF channel bin (0..199).
   */
  private getEmitterChannel(entity: TrackEntity): { bin: number; tag: 'RID' | 'LINK' } {
    let hash = 0;
    for (let i = 0; i < entity.id.length; i++) {
      hash = (hash * 31 + entity.id.charCodeAt(i)) | 0;
    }
    const offset = (Math.abs(hash) % 7) - 3; // -3 to +3 bins

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

  /**
   * Updates the offscreen waterfall buffer, scrolling 1 row per 100 ms.
   * Zero heap allocations occur in this routine.
   */
  private updateWaterfall(currEntities: TrackEntity[], simTimeMs: number, isJamming: boolean): void {
    if (!this.wfU32 || !this.wfImageData || !this.wfCtx) return;

    const elapsed = simTimeMs - this.lastScrollSimMs;
    if (elapsed < 100) return;

    const rowsToScroll = Math.min(5, Math.floor(elapsed / 100));
    this.lastScrollSimMs += rowsToScroll * 100;

    for (let r = 0; r < rowsToScroll; r++) {
      // 1. Shift existing rows downwards by 1 row using native memory copy
      this.wfU32.copyWithin(200, 0, 200 * 79);

      // 2. Generate new row 0 (indices 0..199)
      if (isJamming) {
        // Flood entire spectrum with amber/red broadband saturation noise
        for (let b = 0; b < 200; b++) {
          const noise = hash32(simTimeMs + r * 100, b) % 100;
          if (noise < 50) {
            this.wfU32[b] = 0xff0099ff; // Solid Amber (ABGR: A=FF, B=00, G=99, R=FF)
          } else if (noise < 85) {
            this.wfU32[b] = 0xff3333ff; // Threat Red (ABGR: A=FF, B=33, G=33, R=FF)
          } else {
            this.wfU32[b] = 0xff0066cc; // Dark Amber Spark
          }
        }
      } else {
        // Baseline noise floor: subtle dark carbon/teal speckle
        for (let b = 0; b < 200; b++) {
          const speckle = hash32(simTimeMs + r * 100, b) % 25;
          const green = 0x15 + (speckle >> 1);
          const red = 0x0b + (speckle >> 2);
          this.wfU32[b] = 0xff000000 | (0x10 << 16) | (green << 8) | red;
        }

        // Draw active emitter traces on their frequency bins
        for (let i = 0; i < currEntities.length; i++) {
          const e = currEntities[i];
          if (e.lifecycle !== 'ACTIVE' && e.lifecycle !== 'LEAKED') continue;
          if (!e.emitsRf) continue; // RF-silent drones never appear

          const { bin, tag } = this.getEmitterChannel(e);
          const color = tag === 'RID'
            ? 0xffffcc00 // Remote ID: Cyan/Blue (ABGR)
            : 0xff66ff00; // Control Link: Phosphor Green (ABGR)

          // Center bright spike
          this.wfU32[bin] = color;
          // Side skirt attenuation
          if (bin > 0) this.wfU32[bin - 1] = tag === 'RID' ? 0xccbb9900 : 0xcc44aa00;
          if (bin < 199) this.wfU32[bin + 1] = tag === 'RID' ? 0xccbb9900 : 0xcc44aa00;
        }
      }
    }

    this.wfCtx.putImageData(this.wfImageData, 0, 0);
  }

  /**
   * Main 60 fps render loop for the RF Sensor Layer.
   */
  public renderDynamic(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currEntities: TrackEntity[],
    prevEntities: TrackEntity[],
    alpha: number,
    simTimeMs: number,
    isJamming: boolean,
    selectedTrackNo: string | null = null
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 15;

    // 1. Static Layer Background composite
    if (!this.staticCanvas || this.staticCanvas.width !== width || this.staticCanvas.height !== height) {
      this.prepareStaticLayer(width, height);
    }
    if (this.staticCanvas) {
      ctx.drawImage(this.staticCanvas, 0, 0);
    }

    // 2. Update 4 Hz DF Line Jitter Cache (updates once every 250 ms)
    const step4Hz = Math.floor(simTimeMs / 250);
    if (step4Hz !== this.lastJitterStep) {
      this.lastJitterStep = step4Hz;
      this.cachedJitters.clear();

      for (let i = 0; i < currEntities.length; i++) {
        const e = currEntities[i];
        let idHash = 0;
        for (let j = 0; j < e.id.length; j++) {
          idHash = (idHash * 31 + e.id.charCodeAt(j)) | 0;
        }
        const u = hash32(step4Hz, idHash) / 4294967296; // 0.0 to 1.0
        const jitterDeg = u * 10 - 5; // ±5° range
        this.cachedJitters.set(e.id, jitterDeg);
      }
    }

    // 3. Update lookup map for previous entities (zero allocations)
    this.prevMap.clear();
    for (let i = 0; i < prevEntities.length; i++) {
      this.prevMap.set(prevEntities[i].id, prevEntities[i]);
    }

    // 4. Render Direction-Finding (DF) Lines (SUPPRESSED IF JAMMING)
    if (!isJamming) {
      ctx.save();
      for (let i = 0; i < currEntities.length; i++) {
        const curr = currEntities[i];
        if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED') continue;
        if (!curr.emitsRf) continue; // RF-silent targets produce no strobe

        // Position interpolation
        const prev = this.prevMap.get(curr.id) ?? curr;
        const lerpedX = prev.pos.x * (1 - alpha) + curr.pos.x * alpha;
        const lerpedY = prev.pos.y * (1 - alpha) + curr.pos.y * alpha;

        // Ground-truth bearing in degrees
        const targetAzRad = Math.atan2(lerpedX, lerpedY);
        let targetAzDeg = (targetAzRad * 180) / Math.PI;
        if (targetAzDeg < 0) targetAzDeg += 360;

        // Apply 4 Hz jitter
        const jitter = this.cachedJitters.get(curr.id) ?? 0;
        const strobeDeg = (targetAzDeg + jitter + 360) % 360;

        // Convert bearing to Canvas coordinates (000° is North = -PI/2)
        const canvasRad = ((strobeDeg - 90) * Math.PI) / 180;
        const endX = cx + Math.cos(canvasRad) * radius;
        const endY = cy + Math.sin(canvasRad) * radius;

        const isSelected = curr.trackNo === selectedTrackNo;
        ctx.strokeStyle = isSelected ? PALETTE.friend : PALETTE.phosphor;
        ctx.lineWidth = isSelected ? 1.5 : 1;

        // Continuous thin phosphor line from asset to perimeter
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Strobe bearing readout at perimeter
        ctx.font = '9px "JetBrains Mono"';
        ctx.fillStyle = isSelected ? PALETTE.friend : PALETTE.phosphor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelDist = radius - 18;
        const lx = cx + Math.cos(canvasRad) * labelDist;
        const ly = cy + Math.sin(canvasRad) * labelDist;
        ctx.fillText(`${Math.round(strobeDeg)}°`, lx, ly);
      }
      ctx.restore();
    }

    // 5. Update and Render Spectrum Waterfall (Bottom 120px)
    this.updateWaterfall(currEntities, simTimeMs, isJamming);

    const wfTop = height - 120;
    const wfX = 10;
    const wfY = wfTop + 24;
    const wfW = width - 20; // 500px
    const wfH = 78;

    // Draw active waterfall buffer
    if (this.wfCanvas) {
      ctx.save();
      ctx.imageSmoothingEnabled = false; // Crisp military CRT pixels
      ctx.drawImage(this.wfCanvas, wfX, wfY, wfW, wfH);
      ctx.restore();
    }

    // 6. Render Dynamic Emitter Tags ([RID] / [LINK]) above Waterfall
    if (!isJamming) {
      ctx.save();
      for (let i = 0; i < currEntities.length; i++) {
        const curr = currEntities[i];
        if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED') continue;
        if (!curr.emitsRf) continue;

        const { bin, tag } = this.getEmitterChannel(curr);
        const tagX = wfX + (bin / 200) * wfW;
        const tagY = wfTop + 14;

        const isSelected = curr.trackNo === selectedTrackNo;
        const color = isSelected
          ? PALETTE.friend
          : tag === 'RID'
          ? PALETTE.friend
          : PALETTE.phosphor;

        // Downward pointer arrow
        ctx.save();
        ctx.translate(tagX, wfY);
        ctx.fillStyle = color;
        ctx.fill(arrowMarkerPath);
        ctx.restore();

        // Badge pill label
        ctx.font = 'bold 8px "JetBrains Mono"';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const labelText = `[${tag} ${curr.trackNo ?? ''}]`;
        ctx.fillText(labelText, tagX, tagY);
      }
      ctx.restore();
    } else {
      // 7. Visual Sensor Chaos: Jamming Alert Banner
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
}

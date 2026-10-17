import { PALETTE } from './palette';
import { drawTrackSymbol } from './symbols';
import type { TrackEntity, ZoneSpec } from '@/sim/types';

export class RadarLayer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private maxRangeM: number = 5000;
  private prevMap: Map<string, TrackEntity> = new Map();

  constructor(maxRangeM: number = 5000) {
    this.maxRangeM = maxRangeM;
  }

  /**
   * Pre-renders the static PPI layer (concentric rings, bearing ticks, cardinal labels,
   * asset crosshair, and terrain zones) onto an off-screen canvas.
   * This executes only once or upon window resize, eliminating static draw cost at 60 fps.
   */
  public prepareStaticLayer(width: number, height: number, zones: ZoneSpec[] = []): void {
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
    const scale = radius / this.maxRangeM;

    // 1. Clear background
    ctx.fillStyle = PALETTE.carbon950;
    ctx.fillRect(0, 0, width, height);

    // 2. Concentric range rings (every 1 km)
    ctx.lineWidth = 1;
    ctx.strokeStyle = PALETTE.phosphorDim;
    ctx.fillStyle = PALETTE.phosphorDim;
    ctx.font = '10px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    for (let r = 1000; r <= this.maxRangeM; r += 1000) {
      const ringRadius = r * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Range label at 045 deg bearing
      const lx = cx + ringRadius * 0.707 + 3;
      const ly = cy - ringRadius * 0.707 - 3;
      ctx.fillText(`${r / 1000}k`, lx, ly);
    }

    // 3. Azimuth ticks & Cardinal headings
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
        ctx.fillStyle = PALETTE.phosphorDim;
      }
    }

    // 4. Center asset crosshair at (0, 0)
    ctx.strokeStyle = PALETTE.phosphor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    // 5. Draw Terrain Zones
    for (const zone of zones) {
      if (zone.polygon.length < 3) continue;
      ctx.save();
      ctx.strokeStyle = zone.type === 'URBAN' ? PALETTE.amber : PALETTE.phosphorDim;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      const startPx = cx + zone.polygon[0][0] * scale;
      const startPy = cy - zone.polygon[0][1] * scale;
      ctx.moveTo(startPx, startPy);

      for (let i = 1; i < zone.polygon.length; i++) {
        const px = cx + zone.polygon[i][0] * scale;
        const py = cy - zone.polygon[i][1] * scale;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Zone tag label
      ctx.font = '9px "JetBrains Mono"';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelX = (zone.polygon[0][0] + zone.polygon[1][0]) / 2;
      const labelY = (zone.polygon[0][1] + zone.polygon[1][1]) / 2;
      ctx.fillText(`${zone.id} H${zone.heightM}m`, cx + labelX * scale, cy - labelY * scale);

      ctx.restore();
    }
  }

  /**
   * Dynamic frame rendering at 60 fps.
   * Performs zero object allocations during the loop to maintain 60 fps on Intel i3 GPUs.
   */
  public renderDynamic(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sweepAngleRad: number,
    currEntities: TrackEntity[],
    prevEntities: TrackEntity[],
    alpha: number,
    selectedTrackNo: string | null,
    zones: ZoneSpec[] = []
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 15;
    const scale = radius / this.maxRangeM;

    // 1. Ensure static background layer is ready
    if (!this.staticCanvas || this.staticCanvas.width !== width || this.staticCanvas.height !== height) {
      this.prepareStaticLayer(width, height, zones);
    }

    // 2. Phosphor afterglow fade overlay: exact rgba(13,17,23,0.08)
    ctx.fillStyle = 'rgba(13, 17, 23, 0.08)';
    ctx.fillRect(0, 0, width, height);

    // Composite static background underneath afterglow
    if (this.staticCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(this.staticCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Render 30 RPM rotating radar sweep line with phosphor wedge
    ctx.save();
    const wedgeAngleRad = (60 * Math.PI) / 180;
    const sweepStart = sweepAngleRad - wedgeAngleRad;

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0, 255, 102, 0.05)');
    grad.addColorStop(1, 'rgba(0, 255, 102, 0.25)');

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, sweepStart, sweepAngleRad, false);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Leading phosphor sweep line
    ctx.strokeStyle = PALETTE.phosphor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(sweepAngleRad), cy + radius * Math.sin(sweepAngleRad));
    ctx.stroke();
    ctx.restore();

    // 4. Update lookup map for prev entities (zero per-entity closure allocations)
    this.prevMap.clear();
    for (let i = 0; i < prevEntities.length; i++) {
      this.prevMap.set(prevEntities[i].id, prevEntities[i]);
    }

    // 5. Render Tracks and Entities with 60 fps lerp
    for (let i = 0; i < currEntities.length; i++) {
      const curr = currEntities[i];
      if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED' && curr.lifecycle !== 'NEUTRALISED') {
        continue;
      }

      // Linear position interpolation between prev and curr ticks
      const prev = this.prevMap.get(curr.id) ?? curr;
      const lerpedX = prev.pos.x * (1 - alpha) + curr.pos.x * alpha;
      const lerpedY = prev.pos.y * (1 - alpha) + curr.pos.y * alpha;

      // Inlined world-to-screen (zero array allocations)
      const sx = cx + lerpedX * scale;
      const sy = cy - lerpedY * scale;

      // Scope clipping check
      const distFromCenter = Math.hypot(sx - cx, sy - cy);
      if (distFromCenter > radius) {
        continue;
      }

      const isSelected = curr.trackNo === selectedTrackNo;
      const ghostSigmaPx = curr.ghostSigmaM * scale;

      // Draw NATO track symbol (using pooled Path2D templates)
      drawTrackSymbol(
        ctx,
        sx,
        sy,
        curr.traineeLabel,
        isSelected,
        curr.masked,
        ghostSigmaPx,
        curr.trackNo,
        curr.step
      );

      // Velocity projection vector (10s travel prediction line)
      const speedSq = curr.vel.x * curr.vel.x + curr.vel.y * curr.vel.y;
      if (curr.lifecycle === 'ACTIVE' && speedSq > 0.25) {
        const projX = lerpedX + curr.vel.x * 10;
        const projY = lerpedY + curr.vel.y * 10;
        const px = cx + projX * scale;
        const py = cy - projY * scale;

        ctx.save();
        ctx.strokeStyle = isSelected ? PALETTE.friend : PALETTE.phosphorDim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

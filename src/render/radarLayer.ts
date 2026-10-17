import { PALETTE } from './palette';
import { drawTrackSymbol } from './symbols';
import type { TrackEntity, ZoneSpec } from '@/sim/types';

export class RadarLayer {
  private staticCanvas: HTMLCanvasElement | null = null;
  private maxRangeM: number = 5000;

  constructor(maxRangeM: number = 5000) {
    this.maxRangeM = maxRangeM;
  }

  /**
   * Pre-render static base layer (rings, cardinal ticks, terrain zones)
   * to an off-screen canvas to avoid redraw cost each frame.
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

      // Label at 045 deg
      const lx = cx + ringRadius * 0.707 + 3;
      const ly = cy - ringRadius * 0.707 - 3;
      ctx.fillText(`${r / 1000}k`, lx, ly);
    }

    // 3. Azimuth ticks & Cardinal labels
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const isMajor = deg % 30 === 0;
      const tickLen = isCardinal ? 10 : isMajor ? 6 : 3;

      const x1 = cx + (radius - tickLen) * Math.cos(rad);
      const y1 = cy + (radius - tickLen) * Math.sin(rad);
      const x2 = cx + radius * Math.cos(rad);
      const y2 = cy + radius * Math.sin(rad);

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
        const lx = cx + labelRadius * Math.cos(rad);
        const ly = cy + labelRadius * Math.sin(rad);
        const text = deg === 0 ? '000' : deg === 90 ? '090' : deg === 180 ? '180' : '270';
        ctx.fillText(text, lx, ly);
        ctx.fillStyle = PALETTE.phosphorDim;
      }
    }

    // 4. Center asset crosshair
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
      const [startPx, startPy] = this.worldToScreen(zone.polygon[0][0], zone.polygon[0][1], cx, cy, scale);
      ctx.moveTo(startPx, startPy);

      for (let i = 1; i < zone.polygon.length; i++) {
        const [px, py] = this.worldToScreen(zone.polygon[i][0], zone.polygon[i][1], cx, cy, scale);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Zone tag
      ctx.font = '9px "JetBrains Mono"';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelX = (zone.polygon[0][0] + zone.polygon[1][0]) / 2;
      const labelY = (zone.polygon[0][1] + zone.polygon[1][1]) / 2;
      const [tagPx, tagPy] = this.worldToScreen(labelX, labelY, cx, cy, scale);
      ctx.fillText(`${zone.id} H${zone.heightM}m`, tagPx, tagPy);

      ctx.restore();
    }
  }

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

    // 1. Prepare static layer if not cached or resized
    if (!this.staticCanvas || this.staticCanvas.width !== width || this.staticCanvas.height !== height) {
      this.prepareStaticLayer(width, height, zones);
    }

    // 2. Phosphor afterglow fade overlay
    ctx.fillStyle = 'rgba(13, 17, 23, 0.12)';
    ctx.fillRect(0, 0, width, height);

    // Composite static background
    if (this.staticCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(this.staticCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Render 30 RPM rotating radar sweep (60-deg fading wedge)
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

    // Leading sweep line
    ctx.strokeStyle = PALETTE.phosphor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(sweepAngleRad), cy + radius * Math.sin(sweepAngleRad));
    ctx.stroke();
    ctx.restore();

    // 4. Render Tracks and Entities
    for (let i = 0; i < currEntities.length; i++) {
      const curr = currEntities[i];
      if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED' && curr.lifecycle !== 'NEUTRALISED') {
        continue;
      }

      // Find matching prev entity for lerping
      const prev = prevEntities.find((p) => p.id === curr.id) || curr;

      const lerpedX = prev.pos.x * (1 - alpha) + curr.pos.x * alpha;
      const lerpedY = prev.pos.y * (1 - alpha) + curr.pos.y * alpha;

      const [sx, sy] = this.worldToScreen(lerpedX, lerpedY, cx, cy, scale);

      // Check within scope bounds
      if (Math.hypot(sx - cx, sy - cy) > radius) {
        continue;
      }

      const isSelected = curr.trackNo === selectedTrackNo;
      const ghostSigmaPx = curr.ghostSigmaM * scale;

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

      // Velocity vector (10s travel projection)
      if (curr.lifecycle === 'ACTIVE' && Math.hypot(curr.vel.x, curr.vel.y) > 0.5) {
        const projX = lerpedX + curr.vel.x * 10;
        const projY = lerpedY + curr.vel.y * 10;
        const [px, py] = this.worldToScreen(projX, projY, cx, cy, scale);

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

  private worldToScreen(
    wx: number,
    wy: number,
    cx: number,
    cy: number,
    scale: number
  ): [number, number] {
    // wx: east-positive, wy: north-positive
    // screen: cx + wx * scale, cy - wy * scale
    return [cx + wx * scale, cy - wy * scale];
  }
}

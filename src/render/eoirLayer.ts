import { PALETTE } from './palette';
import { mulberry32 } from '@/sim/rng';
import type { TrackEntity, ScenarioSpec, Vec3 } from '@/sim/types';

// Pre-cached Reusable Vector Silhouettes as Path2D (Zero Allocations in Loop)
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

const quadcopterPath = new SafePath2D();
// Central fuselage pod
quadcopterPath.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
// 4 Diagonal Motor Arms
quadcopterPath.moveTo(-5, -3);
quadcopterPath.lineTo(-16, -10);
quadcopterPath.moveTo(5, -3);
quadcopterPath.lineTo(16, -10);
quadcopterPath.moveTo(-5, 3);
quadcopterPath.lineTo(-16, 10);
quadcopterPath.moveTo(5, 3);
quadcopterPath.lineTo(16, 10);
// Rotor Discs at Arm Tips
quadcopterPath.ellipse(-16, -10, 8, 2, 0, 0, Math.PI * 2);
quadcopterPath.ellipse(16, -10, 8, 2, 0, 0, Math.PI * 2);
quadcopterPath.ellipse(-16, 10, 8, 2, 0, 0, Math.PI * 2);
quadcopterPath.ellipse(16, 10, 8, 2, 0, 0, Math.PI * 2);
// Camera Gimbal Pod
quadcopterPath.arc(0, 4, 3, 0, Math.PI);

const fixedWingPath = new SafePath2D();
// Streamlined Fuselage
fixedWingPath.moveTo(0, -18);
fixedWingPath.lineTo(3, -10);
fixedWingPath.lineTo(3, 14);
fixedWingPath.lineTo(0, 18);
fixedWingPath.lineTo(-3, 14);
fixedWingPath.lineTo(-3, -10);
fixedWingPath.closePath();
// Swept Wings
fixedWingPath.moveTo(-3, -4);
fixedWingPath.lineTo(-28, 4);
fixedWingPath.lineTo(-28, 8);
fixedWingPath.lineTo(-3, 2);
fixedWingPath.moveTo(3, -4);
fixedWingPath.lineTo(28, 4);
fixedWingPath.lineTo(28, 8);
fixedWingPath.lineTo(3, 2);
// Tail Fin & Stabilizer
fixedWingPath.moveTo(-9, 15);
fixedWingPath.lineTo(9, 15);
fixedWingPath.moveTo(0, 12);
fixedWingPath.lineTo(0, 18);

const birdSilhouettePath = new SafePath2D();
// Avian Body and Head
birdSilhouettePath.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
birdSilhouettePath.moveTo(0, -7);
birdSilhouettePath.lineTo(0, -10);
// Arched Flapping Wings
birdSilhouettePath.moveTo(0, -2);
birdSilhouettePath.quadraticCurveTo(-12, -12, -22, -3);
birdSilhouettePath.quadraticCurveTo(-14, 2, 0, 1);
birdSilhouettePath.moveTo(0, -2);
birdSilhouettePath.quadraticCurveTo(12, -12, 22, -3);
birdSilhouettePath.quadraticCurveTo(14, 2, 0, 1);
// Fanned Tail Feathers
birdSilhouettePath.moveTo(-3, 7);
birdSilhouettePath.lineTo(-5, 12);
birdSilhouettePath.lineTo(5, 12);
birdSilhouettePath.lineTo(3, 7);

export interface EoirRenderOptions {
  currEntities: TrackEntity[];
  prevEntities: TrackEntity[];
  alpha: number;
  azimuthDeg: number;
  spec: ScenarioSpec | null;
  fogSeverity?: number;
  selectedTrackNo?: string | null;
}

export class EoirLayer {
  private readonly prevMap: Map<string, TrackEntity> = new Map();
  private noiseCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.initNoiseCanvas();
  }

  private initNoiseCanvas(): void {
    if (typeof document === 'undefined') return;
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = 128;
    this.noiseCanvas.height = 128;
    const nCtx = this.noiseCanvas.getContext('2d');
    if (!nCtx) return;

    const imgData = nCtx.createImageData(128, 128);
    const data = imgData.data;
    const rng = mulberry32(0x454f4952); // Deterministic seed for EOIR noise
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.trunc(rng() * 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 40; // Subtle noise grain
    }
    nCtx.putImageData(imgData, 0, 0);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opts: EoirRenderOptions
  ): void {
    const isNight = opts.spec?.dayNight === 'NIGHT';
    const bgFill = isNight ? '#080808' : '#0B1510';
    const reticleColor = isNight ? '#444444' : '#214232';
    const primaryGlow = isNight ? '#FFFFFF' : '#7AE6AC';
    const dimText = isNight ? '#888888' : '#4C8A69';
    const targetHot = isNight ? '#FFFFFF' : '#88FFBA';

    // 1. Base Viewfinder Canvas Fill & Noise
    this.drawBackground(ctx, width, height, bgFill);

    // 2. Static Reticle, 30° Tape & Badges
    this.drawReticleAndHud(ctx, width, height, opts.azimuthDeg, isNight, {
      reticleColor,
      primaryGlow,
      dimText,
    });

    // 3. Render In-Cone Entities
    this.drawEntities(ctx, width, height, opts, targetHot, isNight);

    // 4. Fog Chaos Overlay
    const fogSeverity = opts.fogSeverity ?? 0;
    if (fogSeverity > 0) {
      this.drawFogOverlay(ctx, width, height, fogSeverity, isNight);
    }
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bgFill: string
  ): void {
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, width, height);

    if (this.noiseCanvas) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.drawImage(this.noiseCanvas, 0, 0, width, height);
      ctx.restore();
    }
  }

  private drawReticleAndHud(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    azimuthDeg: number,
    isNight: boolean,
    colors: { reticleColor: string; primaryGlow: string; dimText: string }
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const pad = 24;
    const brkLen = 20;

    ctx.save();
    ctx.strokeStyle = colors.reticleColor;
    ctx.lineWidth = 1;

    // Viewfinder Bracket Frame
    ctx.beginPath();
    ctx.moveTo(pad, pad + brkLen);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + brkLen, pad);
    ctx.moveTo(width - pad - brkLen, pad);
    ctx.lineTo(width - pad, pad);
    ctx.lineTo(width - pad, pad + brkLen);
    ctx.moveTo(pad, height - pad - brkLen);
    ctx.lineTo(pad, height - pad);
    ctx.lineTo(pad + brkLen, height - pad);
    ctx.moveTo(width - pad - brkLen, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.lineTo(width - pad, height - pad - brkLen);
    ctx.stroke();

    // Central Mil-Dot Crosshair
    ctx.strokeStyle = colors.primaryGlow;
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 36, cy);
    ctx.moveTo(cx, cy - 36);
    ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx, cy + 36);

    ctx.moveTo(cx - 20, cy - 3);
    ctx.lineTo(cx - 20, cy + 3);
    ctx.moveTo(cx + 20, cy - 3);
    ctx.lineTo(cx + 20, cy + 3);
    ctx.moveTo(cx - 3, cy - 20);
    ctx.lineTo(cx + 3, cy - 20);
    ctx.moveTo(cx - 3, cy + 20);
    ctx.lineTo(cx + 3, cy + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();

    // 30° FOV Azimuth Tape
    const tapeY = 38;
    ctx.strokeStyle = colors.reticleColor;
    ctx.beginPath();
    ctx.moveTo(pad + 10, tapeY);
    ctx.lineTo(width - pad - 10, tapeY);
    ctx.stroke();

    const pxPerDeg = (width - pad * 2) / 30;
    for (let offset = -15; offset <= 15; offset += 5) {
      const tx = cx + offset * pxPerDeg;
      const degVal = (azimuthDeg + offset + 360) % 360;
      const isCenter = offset === 0;

      ctx.strokeStyle = isCenter ? colors.primaryGlow : colors.reticleColor;
      ctx.beginPath();
      ctx.moveTo(tx, tapeY - (isCenter ? 6 : 3));
      ctx.lineTo(tx, tapeY + (isCenter ? 6 : 3));
      ctx.stroke();

      ctx.fillStyle = isCenter ? colors.primaryGlow : colors.dimText;
      ctx.font = '9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${String(Math.round(degVal)).padStart(3, '0')}°`, tx, tapeY - 7);
    }

    // Telemetry Badges
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = colors.primaryGlow;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('EO/IR THERMAL FLIR', pad + 4, pad + 6);

    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = colors.dimText;
    ctx.fillText('FOV: 30° WFOV | NUC: CAL', pad + 4, pad + 18);
    ctx.fillText(isNight ? 'POLARITY: WHITE-HOT' : 'POLARITY: GREY-GREEN', pad + 4, height - pad - 18);

    ctx.textAlign = 'right';
    ctx.fillStyle = colors.primaryGlow;
    ctx.fillText(`AZ: ${String(Math.round(azimuthDeg)).padStart(3, '0')}°`, width - pad - 4, pad + 6);
    ctx.fillStyle = colors.dimText;
    ctx.fillText('EL: -01.8° | ZOOM: 1.0x', width - pad - 4, pad + 18);

    ctx.restore();
  }

  private computeScreenProjection(
    lerped: Vec3,
    azimuthDeg: number,
    width: number,
    height: number,
    pad: number
  ): { sx: number; sy: number; rangeM: number; scale: number } | null {
    const rangeM = Math.hypot(lerped.x, lerped.y);
    if (rangeM < 1) return null;

    const targetAzRad = Math.atan2(lerped.x, lerped.y);
    let targetAzDeg = (targetAzRad * 180) / Math.PI;
    if (targetAzDeg < 0) targetAzDeg += 360;

    let deltaAz = targetAzDeg - azimuthDeg;
    while (deltaAz > 180) deltaAz -= 360;
    while (deltaAz < -180) deltaAz += 360;

    // 30° Bounding Cone Filter (±15°)
    if (Math.abs(deltaAz) > 15) return null;

    const cx = width / 2;
    const cy = height / 2;
    const sx = cx + (deltaAz / 15) * ((width - pad * 2) / 2);
    const elevRad = Math.atan2(lerped.z - 15, rangeM);
    const elevDeg = (elevRad * 180) / Math.PI;
    const sy = cy - (elevDeg / 10) * ((height - pad * 2) / 2);
    const scale = Math.max(0.2, Math.min(2.2, 500 / Math.max(120, rangeM)));

    return { sx, sy, rangeM, scale };
  }

  private drawTargetBox(
    ctx: CanvasRenderingContext2D,
    curr: TrackEntity,
    proj: { sx: number; sy: number; scale: number; rangeM: number },
    targetHot: string,
    isSelected: boolean
  ): void {
    const { sx, sy, scale, rangeM } = proj;
    const boxSize = Math.max(16, 24 * scale);

    ctx.save();
    ctx.strokeStyle = isSelected ? PALETTE.friend : targetHot;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(sx - boxSize / 2, sy - boxSize / 2, boxSize, boxSize);
    ctx.setLineDash([]);

    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = isSelected ? PALETTE.friend : targetHot;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${curr.trackNo ?? 'TRK'} ${Math.round(rangeM)}m`, sx + boxSize / 2 + 3, sy - boxSize / 2);
    ctx.restore();
  }

  private drawEntities(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opts: EoirRenderOptions,
    targetHot: string,
    isNight: boolean
  ): void {
    const pad = 24;

    this.prevMap.clear();
    for (const prev of opts.prevEntities) {
      this.prevMap.set(prev.id, prev);
    }

    for (const curr of opts.currEntities) {
      if (curr.lifecycle !== 'ACTIVE' && curr.lifecycle !== 'LEAKED') continue;

      const prev = this.prevMap.get(curr.id) ?? curr;
      const lerped: Vec3 = {
        x: prev.pos.x * (1 - opts.alpha) + curr.pos.x * opts.alpha,
        y: prev.pos.y * (1 - opts.alpha) + curr.pos.y * opts.alpha,
        z: prev.pos.z * (1 - opts.alpha) + curr.pos.z * opts.alpha,
      };

      const proj = this.computeScreenProjection(lerped, opts.azimuthDeg, width, height, pad);
      if (!proj) continue;

      this.drawSilhouette(ctx, curr, proj.sx, proj.sy, proj.scale, targetHot, isNight);

      const isSelected = curr.trackNo === opts.selectedTrackNo;
      this.drawTargetBox(ctx, curr, proj, targetHot, isSelected);
    }
  }

  private drawSilhouette(
    ctx: CanvasRenderingContext2D,
    entity: TrackEntity,
    sx: number,
    sy: number,
    scale: number,
    targetHot: string,
    isNight: boolean
  ): void {
    ctx.save();
    ctx.translate(sx, sy);

    const haloGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18 * scale);
    haloGrad.addColorStop(0, isNight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(122, 230, 172, 0.5)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 18 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(scale, scale);
    ctx.fillStyle = targetHot;
    ctx.strokeStyle = targetHot;
    ctx.lineWidth = 1.2;

    if (entity.droneType === 'BIRD') {
      ctx.fill(birdSilhouettePath);
      ctx.stroke(birdSilhouettePath);
    } else if (entity.droneType === 'LOITERING_MUNITION') {
      ctx.fill(fixedWingPath);
      ctx.stroke(fixedWingPath);
    } else {
      ctx.fill(quadcopterPath);
      ctx.stroke(quadcopterPath);
    }

    ctx.restore();
  }

  private drawFogOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fogSeverity: number,
    isNight: boolean
  ): void {
    const cx = width / 2;
    ctx.save();
    const hazeAlpha = Math.min(0.85, Math.max(0.25, 0.25 + fogSeverity * 0.45));
    ctx.fillStyle = isNight
      ? `rgba(200, 200, 200, ${hazeAlpha * 0.5})`
      : `rgba(140, 175, 155, ${hazeAlpha * 0.5})`;
    ctx.fillRect(0, 0, width, height);

    if (this.noiseCanvas) {
      ctx.globalAlpha = hazeAlpha;
      ctx.drawImage(this.noiseCanvas, 0, 0, width, height);
    }

    ctx.font = 'bold 10px "Chakra Petch"';
    ctx.fillStyle = PALETTE.amber;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `[EO/IR DEG - FOG ACTIVE // THERMAL TRANSMITTANCE ${(100 - fogSeverity * 75).toFixed(0)}%]`,
      cx,
      height - 35
    );
    ctx.restore();
  }
}

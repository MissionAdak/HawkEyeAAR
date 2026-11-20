import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PALETTE } from '@/render/palette';
import { drawTrackSymbol, drawGroundTruthSymbol } from '@/render/symbols';
import { computeOracleEffector, computeCostRegret } from '@/sim/oracle';
import type { TrueClass, TrackClass, EffectorId, ZoneSpec, SimEvent, DroneType } from '@/sim/types';

export interface ReplayEntity {
  id: string;
  trackNo: string | null;
  pos: { x: number; y: number; z?: number };
  vel?: { x: number; y: number; z?: number };
  trueClass: TrueClass;
  traineeLabel: TrackClass | null;
  step?: string;
  masked?: boolean;
  q?: number;
  ghostSigmaM?: number;
  lifecycle?: string;
  droneType?: DroneType;
  emitsRf?: boolean;
}

export interface ReplayCanvasProps {
  tMs: number;
  entities: ReplayEntity[];
  events?: SimEvent[];
  zones?: ZoneSpec[];
  showGroundTruth?: boolean;
  onToggleGroundTruth?: () => void;
  selectedTrackNo?: string | null;
  onSelectTrack?: (trackNo: string | null) => void;
  maxRangeM?: number;
  className?: string;
}

const CANVAS_SIZE = 360;
const SCOPE_RADIUS = 165;
const SWEEP_PERIOD_MS = 2000;
const EMPTY_ZONES: ZoneSpec[] = [];
const EMPTY_EVENTS: SimEvent[] = [];

function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isChaosTypeActiveAt(events: SimEvent[], tMs: number, type: 'FOG' | 'JAMMING'): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.tMs > tMs) continue;
    const p = e.payload as { type?: string; chaosType?: string; durationMs?: number };
    const cType = p.type ?? p.chaosType;
    if (cType === type) {
      if (e.type === 'CHAOS_OFF') return false;
      if (e.type === 'CHAOS_ON') {
        const duration = typeof p.durationMs === 'number' ? p.durationMs : 30000;
        return tMs - e.tMs <= duration;
      }
    }
  }
  return false;
}

function drawStaticRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  maxRangeM: number
): void {
  ctx.lineWidth = 1;
  ctx.strokeStyle = PALETTE.phosphorDim;
  ctx.fillStyle = PALETTE.phosphorDim;
  ctx.font = '9px "JetBrains Mono"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  for (let r = 1000; r <= maxRangeM; r += 1000) {
    const ringRadius = r * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    const lx = cx + ringRadius * 0.707 + 3;
    const ly = cy - ringRadius * 0.707 - 3;
    ctx.fillText(`${r / 1000}k`, lx, ly);
  }
}

const CARDINAL_HEADINGS: Record<number, string> = {
  0: '000',
  90: '090',
  180: '180',
  270: '270',
};

function getTickLength(deg: number): number {
  if (deg % 90 === 0) return 8;
  if (deg % 30 === 0) return 5;
  return 3;
}

function drawStaticAzimuthTicks(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = ((deg - 90) * Math.PI) / 180;
    const tickLen = getTickLength(deg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const x1 = cx + (SCOPE_RADIUS - tickLen) * cos;
    const y1 = cy + (SCOPE_RADIUS - tickLen) * sin;
    const x2 = cx + SCOPE_RADIUS * cos;
    const y2 = cy + SCOPE_RADIUS * sin;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const cardinalText = CARDINAL_HEADINGS[deg];
    if (cardinalText) {
      ctx.fillStyle = PALETTE.phosphor;
      ctx.font = 'bold 9px "Chakra Petch"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelDist = SCOPE_RADIUS + 9;
      ctx.fillText(cardinalText, cx + labelDist * cos, cy + labelDist * sin);
      ctx.fillStyle = PALETTE.phosphorDim;
    }
  }
}

function drawStaticCenterCross(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = PALETTE.phosphor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 6, cy);
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();
}

function drawStaticTerrainZones(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  zones: ZoneSpec[]
): void {
  for (const zone of zones) {
    if (zone.polygon.length < 3) continue;

    ctx.save();
    ctx.strokeStyle = zone.type === 'URBAN' ? PALETTE.amber : PALETTE.phosphorDim;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(cx + zone.polygon[0][0] * scale, cy - zone.polygon[0][1] * scale);
    for (let i = 1; i < zone.polygon.length; i++) {
      ctx.lineTo(cx + zone.polygon[i][0] * scale, cy - zone.polygon[i][1] * scale);
    }
    ctx.closePath();
    ctx.stroke();

    // Zone Tag Label
    ctx.font = '8px "JetBrains Mono"';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = (zone.polygon[0][0] + zone.polygon[1][0]) / 2;
    const ly = (zone.polygon[0][1] + zone.polygon[1][1]) / 2;
    ctx.fillText(`${zone.id} H${zone.heightM}m`, cx + lx * scale, cy - ly * scale);
    ctx.restore();
  }
}

function drawHistoricalSweep(ctx: CanvasRenderingContext2D, cx: number, cy: number, tMs: number): void {
  const sweepProgress = (tMs % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS;
  const sweepAngleRad = -Math.PI / 2 + sweepProgress * Math.PI * 2;
  const wedgeAngleRad = (60 * Math.PI) / 180;
  const sweepStart = sweepAngleRad - wedgeAngleRad;

  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, SCOPE_RADIUS);
  grad.addColorStop(0, 'rgba(0, 255, 102, 0.04)');
  grad.addColorStop(1, 'rgba(0, 255, 102, 0.22)');

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, SCOPE_RADIUS, sweepStart, sweepAngleRad, false);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = PALETTE.phosphor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + SCOPE_RADIUS * Math.cos(sweepAngleRad), cy + SCOPE_RADIUS * Math.sin(sweepAngleRad));
  ctx.stroke();
  ctx.restore();
}

function drawGroundTruthOverlay(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  entity: ReplayEntity,
  isSelected: boolean
): void {
  drawGroundTruthSymbol(ctx, sx, sy, entity.trueClass, isSelected);

  ctx.save();
  ctx.font = '8px "JetBrains Mono"';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`TRUE: ${entity.trueClass}`, sx + 14, sy - 4);

  // Indicate classification match or mistake
  const isMatch = entity.traineeLabel && entity.traineeLabel === (entity.trueClass as unknown as TrackClass);
  if (entity.traineeLabel && entity.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT' && !isMatch) {
    ctx.fillStyle = PALETTE.threat;
    ctx.fillText(`ERR: ${entity.traineeLabel}`, sx + 14, sy + 6);
  } else if (entity.traineeLabel) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`LBL: ${entity.traineeLabel}`, sx + 14, sy + 6);
  } else {
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('LBL: NONE', sx + 14, sy + 6);
  }
  ctx.restore();
}

function drawHistoricalEntities(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  entities: ReplayEntity[],
  isGroundTruthActive: boolean,
  selectedTrackNo?: string | null
): void {
  for (const entity of entities) {
    if (entity.lifecycle === 'NEUTRALISED' && entity.step === 'CLOSED') {
      continue;
    }

    const isMasked = entity.masked ?? false;
    const isCoasting = (entity.ghostSigmaM ?? 0) > 0;

    // In trainee mode (Ground Truth OFF), masked targets that are not coasting remain hidden
    if (!isGroundTruthActive && isMasked && !isCoasting) {
      continue;
    }

    const sx = cx + entity.pos.x * scale;
    const sy = cy - entity.pos.y * scale;

    const distFromCenter = Math.hypot(sx - cx, sy - cy);
    if (distFromCenter > SCOPE_RADIUS) continue;

    const isSelected = entity.trackNo === selectedTrackNo;
    const ghostSigmaPx = (entity.ghostSigmaM ?? 0) * scale;

    if (!isGroundTruthActive) {
      drawTrackSymbol(ctx, sx, sy, {
        label: entity.traineeLabel,
        isSelected,
        isCoasting,
        ghostSigmaPx,
        trackNo: entity.trackNo,
        step: entity.step ?? '',
      });
    } else {
      drawGroundTruthOverlay(ctx, sx, sy, entity, isSelected);
    }
  }
}

interface EngagePayload {
  effector?: EffectorId;
  rangeM?: number;
  killed?: boolean;
  trueClass?: TrueClass;
  emitsRf?: boolean;
  droneType?: DroneType;
  isOverDenseZone?: boolean;
  isJammingActive?: boolean;
  isFogActive?: boolean;
  fog?: boolean;
  jamming?: boolean;
  x?: number;
  y?: number;
}

function drawCrosshairReticle(ctx: CanvasRenderingContext2D, ex: number, ey: number, sSize = 16): void {
  ctx.strokeStyle = PALETTE.threat;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ex - sSize / 2, ey - sSize / 2, sSize, sSize);

  ctx.beginPath();
  ctx.moveTo(ex - sSize, ey);
  ctx.lineTo(ex - sSize / 2, ey);
  ctx.moveTo(ex + sSize / 2, ey);
  ctx.lineTo(ex + sSize, ey);
  ctx.moveTo(ex, ey - sSize);
  ctx.lineTo(ex, ey - sSize / 2);
  ctx.moveTo(ex, ey + sSize / 2);
  ctx.lineTo(ex, ey + sSize);
  ctx.stroke();
}

interface RegretBadgeParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  ex: number;
  ey: number;
  effector: EffectorId;
  oracleEffector: EffectorId | 'HOLD_FIRE';
  regretText: string;
  isOptimal: boolean;
}

function renderRegretBadge(params: RegretBadgeParams): void {
  const { ctx, width, height, ex, ey, effector, oracleEffector, regretText, isOptimal } = params;
  const boxW = 140;
  const boxH = 34;
  const boxX = Math.min(width - boxW - 8, Math.max(8, ex + 14));
  const boxY = Math.min(height - boxH - 8, Math.max(8, ey - 17));

  ctx.fillStyle = 'rgba(13, 17, 23, 0.92)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = isOptimal ? PALETTE.phosphor : PALETTE.amber;
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.font = 'bold 8px "JetBrains Mono"';
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`ENGAGE: ${effector}`, boxX + 4, boxY + 4);

  ctx.font = '8px "JetBrains Mono"';
  ctx.fillStyle = isOptimal ? PALETTE.phosphor : PALETTE.threat;
  ctx.fillText(`ORACLE: ${oracleEffector}`, boxX + 4, boxY + 14);
  ctx.fillText(regretText, boxX + 4, boxY + 23);
}

function resolveEmitsRf(payload: EngagePayload, matchingEntity?: ReplayEntity): boolean {
  if (typeof payload.emitsRf === 'boolean') {
    return payload.emitsRf;
  }
  if (typeof matchingEntity?.emitsRf === 'boolean') {
    return matchingEntity.emitsRf;
  }
  return true;
}

interface EngagementRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  cx: number;
  cy: number;
  scale: number;
  tMs: number;
  entities: ReplayEntity[];
  events: SimEvent[];
  zones: ZoneSpec[];
}

function drawHistoricalEngagements(params: EngagementRenderParams): void {
  const { ctx, width, height, cx, cy, scale, tMs, entities, events, zones } = params;
  for (const ev of events) {
    if (ev.type !== 'ENGAGE') continue;

    const dt = tMs - ev.tMs;
    if (dt < 0 || dt > 3000) continue;

    const payload = ev.payload as EngagePayload;
    const matchingEntity = entities.find((e) => e.trackNo === ev.trackNo || e.id === ev.entityId);
    const posX = matchingEntity?.pos.x ?? payload.x;
    const posY = matchingEntity?.pos.y ?? payload.y;
    const ex = posX !== undefined ? cx + posX * scale : cx;
    const ey = posY !== undefined ? cy - posY * scale : cy;

    const alphaFade = Math.max(0.15, 1 - dt / 3000);

    ctx.save();
    ctx.globalAlpha = alphaFade;

    drawCrosshairReticle(ctx, ex, ey);

    const effector = payload.effector;
    const trueClass = matchingEntity?.trueClass ?? payload.trueClass;

    if (!effector || !trueClass) {
      ctx.restore();
      continue;
    }

    const rangeM = payload.rangeM ?? (posX !== undefined && posY !== undefined ? Math.hypot(posX, posY) : 1500);
    const emitsRf = resolveEmitsRf(payload, matchingEntity);
    const droneType = payload.droneType ?? matchingEntity?.droneType;
    const isFogActive = Boolean(payload.isFogActive ?? payload.fog ?? isChaosTypeActiveAt(events, ev.tMs, 'FOG'));
    const isJammingActive = Boolean(payload.isJammingActive ?? payload.jamming ?? isChaosTypeActiveAt(events, ev.tMs, 'JAMMING'));
    const isOverDenseZone = Boolean(
      payload.isOverDenseZone ??
      (posX !== undefined && posY !== undefined && zones.some((z) => isPointInPolygon([posX, posY], z.polygon)))
    );

    const oracle = computeOracleEffector({
      rangeM,
      trueClass,
      emitsRf,
      droneType,
      isFogActive,
      isJammingActive,
      isOverDenseZone,
    });
    const regret = computeCostRegret(effector, oracle.oracleEffector);

    renderRegretBadge({
      ctx,
      width,
      height,
      ex,
      ey,
      effector,
      oracleEffector: oracle.oracleEffector,
      regretText: regret.text,
      isOptimal: regret.isOptimal,
    });

    ctx.restore();
  }
}

export const ReplayCanvas: React.FC<ReplayCanvasProps> = ({
  tMs,
  entities,
  events = EMPTY_EVENTS,
  zones = EMPTY_ZONES,
  showGroundTruth: controlledGroundTruth,
  onToggleGroundTruth,
  selectedTrackNo,
  onSelectTrack,
  maxRangeM = 5000,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPrepareStaticLayerRef = useRef<((width: number, height: number) => HTMLCanvasElement | null) | null>(null);

  const [internalGroundTruth, setInternalGroundTruth] = useState<boolean>(false);
  const isGroundTruthActive = controlledGroundTruth ?? internalGroundTruth;

  const handleToggle = useCallback(() => {
    if (onToggleGroundTruth) {
      onToggleGroundTruth();
    } else {
      setInternalGroundTruth((prev) => !prev);
    }
  }, [onToggleGroundTruth]);

  // Keyboard shortcut [G] for Ground Truth toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        handleToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle]);

  // Prepare static background radar PPI scope (once or on resize)
  const prepareStaticLayer = useCallback(
    (width: number, height: number) => {
      if (typeof document === 'undefined') return null;

      const staticCanvas = document.createElement('canvas');
      staticCanvas.width = width;
      staticCanvas.height = height;

      const ctx = staticCanvas.getContext('2d');
      if (!ctx) return null;

      const cx = width / 2;
      const cy = height / 2;
      const scale = SCOPE_RADIUS / maxRangeM;

      ctx.fillStyle = PALETTE.carbon950;
      ctx.fillRect(0, 0, width, height);

      drawStaticRings(ctx, cx, cy, scale, maxRangeM);
      drawStaticAzimuthTicks(ctx, cx, cy);
      drawStaticCenterCross(ctx, cx, cy);
      drawStaticTerrainZones(ctx, cx, cy, scale, zones);

      return staticCanvas;
    },
    [maxRangeM, zones]
  );

  // Invalidate static layer cache when prepareStaticLayer changes
  useEffect(() => {
    staticCanvasRef.current = null;
  }, [prepareStaticLayer]);

  // Redraw Canvas on scrubbed state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = CANVAS_SIZE;
    const height = CANVAS_SIZE;
    const cx = width / 2;
    const cy = height / 2;
    const scale = SCOPE_RADIUS / maxRangeM;

    // 1. Prepare/cache static layer
    if (!staticCanvasRef.current || prevPrepareStaticLayerRef.current !== prepareStaticLayer) {
      prevPrepareStaticLayerRef.current = prepareStaticLayer;
      staticCanvasRef.current = prepareStaticLayer(width, height);
    }
    if (staticCanvasRef.current) {
      ctx.drawImage(staticCanvasRef.current, 0, 0);
    }

    // 2. Render historical rotating radar sweep line driven by scrubbed tMs
    drawHistoricalSweep(ctx, cx, cy, tMs);

    // 3. Render Historical Entities
    drawHistoricalEntities(ctx, cx, cy, scale, entities, isGroundTruthActive, selectedTrackNo);

    // 4. Render Engagement Markers & Oracle Cost Regret
    drawHistoricalEngagements({
      ctx,
      width,
      height,
      cx,
      cy,
      scale,
      tMs,
      entities,
      events,
      zones,
    });
  }, [tMs, entities, events, isGroundTruthActive, selectedTrackNo, maxRangeM, zones, prepareStaticLayer]);

  // Click-to-select historical track
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelectTrack) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const scale = SCOPE_RADIUS / maxRangeM;

    let nearestTrackNo: string | null = null;
    let nearestDist = 14;

    for (const entity of entities) {
      if (!entity.trackNo) continue;

      // Apply the same visibility filters as the draw loop
      if (entity.lifecycle === 'NEUTRALISED' && entity.step === 'CLOSED') {
        continue;
      }

      const isMasked = entity.masked ?? false;
      const isCoasting = (entity.ghostSigmaM ?? 0) > 0;

      // In trainee mode (Ground Truth OFF), masked targets that are not coasting remain hidden
      if (!isGroundTruthActive && isMasked && !isCoasting) {
        continue;
      }

      const ex = cx + entity.pos.x * scale;
      const ey = cy - entity.pos.y * scale;

      const distFromCenter = Math.hypot(ex - cx, ey - cy);
      if (distFromCenter > SCOPE_RADIUS) continue;

      const d = Math.hypot(clickX - ex, clickY - ey);
      if (d < nearestDist) {
        nearestDist = d;
        nearestTrackNo = entity.trackNo;
      }
    }

    onSelectTrack(nearestTrackNo);
  };

  const totalSec = Math.floor(tMs / 1000);
  const ms = tMs % 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const clockFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

  return (
    <div
      className={`relative inline-block w-[360px] h-[360px] bg-carbon-950 border border-line select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleCanvasClick}
        className="block cursor-crosshair"
      />

      {/* Top HUD Badges */}
      <div className="absolute top-2 left-2 pointer-events-none text-[9px] font-mono text-phosphor leading-tight">
        <span>AAR REPLAY // 360px</span>
        <span className="block text-text-dim">{`SCOPE: ${(maxRangeM / 1000).toFixed(1)} km`}</span>
      </div>

      <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10">
        <div className="text-[10px] font-clock font-bold text-text-main bg-carbon-900/80 px-1.5 py-0.5 border border-line">
          {`T+${clockFormatted}`}
        </div>

        {/* Ground Truth Toggle Button [G] */}
        <button
          type="button"
          onClick={handleToggle}
          title="Toggle Ground Truth Overlay [G]"
          className={`px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider border transition-colors ${
            isGroundTruthActive
              ? 'bg-white text-carbon-950 border-white shadow-none'
              : 'bg-carbon-900 text-text-dim border-line hover:border-text-dim hover:text-text-main'
          }`}
        >
          {`[G] GROUND TRUTH: ${isGroundTruthActive ? 'ON' : 'OFF'}`}
        </button>
      </div>

      {/* Bottom Status Legend */}
      <div className="absolute bottom-1.5 left-2 pointer-events-none text-[8px] font-mono text-text-dim">
        <span>SWEEP: 30 RPM HISTORICAL</span>
      </div>
      <div className="absolute bottom-1.5 right-2 pointer-events-none text-[8px] font-mono text-text-dim">
        <span>ORACLE: CER OPTIMAL ENGINE</span>
      </div>
    </div>
  );
};

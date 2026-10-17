import { PALETTE } from './palette';
import type { TrackClass } from '@/sim/taxonomy';

export function drawTrackSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: TrackClass,
  isSelected: boolean,
  isCoasting: boolean,
  ghostSigmaPx: number,
  trackNo: string | null,
  step: string
): void {
  ctx.save();
  ctx.lineWidth = 1.5;

  // 1. Draw coasting uncertainty ellipse if coasting
  if (isCoasting && ghostSigmaPx > 0) {
    ctx.strokeStyle = PALETTE.amber;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(8, ghostSigmaPx), Math.max(6, ghostSigmaPx * 0.7), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Draw Symbol by Trainee Label
  switch (label) {
    case 'HOSTILE_ATTACK':
    case 'HOSTILE_ISR':
    case 'SWARM_ELEMENT': {
      ctx.strokeStyle = PALETTE.threat;
      ctx.fillStyle = PALETTE.threat;
      const size = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.stroke();

      if (label === 'HOSTILE_ISR') {
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (label === 'SWARM_ELEMENT') {
        ctx.font = '8px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', cx, cy);
      }
      break;
    }

    case 'FRIENDLY': {
      ctx.strokeStyle = PALETTE.friend;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'CIVIL_UAS': {
      ctx.strokeStyle = PALETTE.phosphor;
      const s = 7;
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
      break;
    }

    case 'BIRD': {
      ctx.strokeStyle = PALETTE.unknown;
      const s = 6;
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
      // Wing tick on top
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s);
      ctx.lineTo(cx, cy - s - 4);
      ctx.lineTo(cx + s, cy - s);
      ctx.stroke();
      break;
    }

    case 'UNKNOWN_EVIDENCE_INSUFFICIENT':
    default: {
      ctx.strokeStyle = PALETTE.unknown;
      ctx.fillStyle = PALETTE.unknown;
      const s = 7;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
      ctx.setLineDash([]);

      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy + 0.5);
      break;
    }
  }

  // 3. Selection corner brackets
  if (isSelected) {
    ctx.strokeStyle = PALETTE.friend;
    ctx.lineWidth = 1.5;
    const b = 13;
    const l = 4;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(cx - b, cy - b + l);
    ctx.lineTo(cx - b, cy - b);
    ctx.lineTo(cx - b + l, cy - b);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(cx + b - l, cy - b);
    ctx.lineTo(cx + b, cy - b);
    ctx.lineTo(cx + b, cy - b + l);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(cx - b, cy + b - l);
    ctx.lineTo(cx - b, cy + b);
    ctx.lineTo(cx - b + l, cy + b);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(cx + b - l, cy + b);
    ctx.lineTo(cx + b, cy + b);
    ctx.lineTo(cx + b, cy + b - l);
    ctx.stroke();
  }

  // 4. Track label text (e.g. T-01)
  if (trackNo) {
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = isSelected ? PALETTE.friend : PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(trackNo, cx + 14, cy - 2);

    if (step && step !== 'FIND' && step !== 'CLOSED') {
      ctx.font = '8px "JetBrains Mono"';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(step, cx + 14, cy + 8);
    }
  }

  ctx.restore();
}

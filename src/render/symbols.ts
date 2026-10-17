import { PALETTE } from './palette';
import type { TrackClass } from '@/sim/taxonomy';

// Static Reusable Path2D Pools (Zero-Allocation Render Loop)
const diamondPath = new Path2D();
diamondPath.moveTo(0, -10);
diamondPath.lineTo(10, 0);
diamondPath.lineTo(0, 10);
diamondPath.lineTo(-10, 0);
diamondPath.closePath();

const circlePath = new Path2D();
circlePath.arc(0, 0, 8, 0, Math.PI * 2);

const civilSquarePath = new Path2D();
civilSquarePath.rect(-7, -7, 14, 14);

const birdSquarePath = new Path2D();
birdSquarePath.rect(-6, -6, 12, 12);
birdSquarePath.moveTo(-6, -6);
birdSquarePath.lineTo(0, -10);
birdSquarePath.lineTo(6, -6);

const unknownSquarePath = new Path2D();
unknownSquarePath.rect(-7, -7, 14, 14);

const isrDotPath = new Path2D();
isrDotPath.arc(0, 0, 2, 0, Math.PI * 2);

// Reusable Selection Brackets Path Pool (4 corners)
const selectionBracketsPath = new Path2D();
const b = 13;
const l = 4;
// Top-Left
selectionBracketsPath.moveTo(-b, -b + l);
selectionBracketsPath.lineTo(-b, -b);
selectionBracketsPath.lineTo(-b + l, -b);
// Top-Right
selectionBracketsPath.moveTo(b - l, -b);
selectionBracketsPath.lineTo(b, -b);
selectionBracketsPath.lineTo(b, -b + l);
// Bottom-Left
selectionBracketsPath.moveTo(-b, b - l);
selectionBracketsPath.lineTo(-b, b);
selectionBracketsPath.lineTo(-b + l, b);
// Bottom-Right
selectionBracketsPath.moveTo(b - l, b);
selectionBracketsPath.lineTo(b, b);
selectionBracketsPath.lineTo(b, b - l);

/**
 * High-performance NATO symbology renderer.
 * Operates without heap allocations during 60 fps animation frames.
 */
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
  ctx.translate(cx, cy);
  ctx.lineWidth = 1.5;

  // 1. Ghost Coasting: Render growing uncertainty ellipse if masked
  if (isCoasting && ghostSigmaPx > 0) {
    ctx.strokeStyle = PALETTE.amber;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(8, ghostSigmaPx), Math.max(6, ghostSigmaPx * 0.7), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Set dashed style for symbol itself when coasting
  if (isCoasting) {
    ctx.setLineDash([3, 3]);
  }

  // 2. Draw Symbol by Trainee Label (NATO Symbology)
  switch (label) {
    case 'HOSTILE_ATTACK':
    case 'HOSTILE_ISR':
    case 'SWARM_ELEMENT': {
      ctx.strokeStyle = PALETTE.threat;
      ctx.fillStyle = PALETTE.threat;
      ctx.stroke(diamondPath);

      if (label === 'HOSTILE_ISR') {
        ctx.fill(isrDotPath);
      } else if (label === 'SWARM_ELEMENT') {
        ctx.font = '8px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', 0, 0);
      }
      break;
    }

    case 'FRIENDLY': {
      ctx.strokeStyle = PALETTE.friend;
      ctx.stroke(circlePath);
      break;
    }

    case 'CIVIL_UAS': {
      ctx.strokeStyle = PALETTE.phosphor;
      ctx.stroke(civilSquarePath);
      break;
    }

    case 'BIRD': {
      ctx.strokeStyle = PALETTE.unknown;
      ctx.stroke(birdSquarePath);
      break;
    }

    case 'UNKNOWN_EVIDENCE_INSUFFICIENT':
    default: {
      ctx.strokeStyle = PALETTE.unknown;
      ctx.fillStyle = PALETTE.unknown;
      ctx.setLineDash([2, 2]);
      ctx.stroke(unknownSquarePath);
      ctx.setLineDash([]);

      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0.5);
      break;
    }
  }

  // Reset line dash after drawing symbol
  if (isCoasting) {
    ctx.setLineDash([]);
  }

  // 3. Selection corner brackets
  if (isSelected) {
    ctx.strokeStyle = PALETTE.friend;
    ctx.lineWidth = 1.5;
    ctx.stroke(selectionBracketsPath);
  }

  // 4. Track label text and kill-chain step (e.g. T-01 FIX)
  if (trackNo) {
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = isSelected ? PALETTE.friend : PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(trackNo, 14, -2);

    if (step && step !== 'FIND' && step !== 'CLOSED') {
      ctx.font = '8px "JetBrains Mono"';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(step, 14, 8);
    }
  }

  ctx.restore();
}

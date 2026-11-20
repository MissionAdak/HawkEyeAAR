import * as THREE from 'three';
import { toThree } from './coords';
import { evaluateMasking, raySegmentIntersection, MaskResult } from '@/sim/masking';
import type { ZoneSpec } from '@/sim/types';
import type { SafeTrackView } from './types';
import { CONFIG } from '@/config';

export interface LosRayPoint {
  x: number;
  y: number;
  z: number;
}

export type LosBlockStatus = 'CLEAR' | 'BLOCKED_SHADOW' | 'BLOCKED_INTERIOR' | 'MASKED_NO_POS';

export interface LosExplanation {
  trackNo: string;
  status: LosBlockStatus;
  isMasked: boolean;
  radarOrigin: LosRayPoint;
  targetPoint: LosRayPoint | null;
  blockingPoint: LosRayPoint | null;
  zoneId?: string;
  thetaT?: number;
  thetaMask?: number;
  dNearM?: number;
  shadowRemainingM?: number;
  label: string;
  isCoasting: boolean;
  ghostSigmaM: number;
}

function toDeg(rad: number): string {
  const deg = (rad * 180) / Math.PI;
  return `${deg >= 0 ? '+' : ''}${deg.toFixed(1)}`;
}

function findPolygonRayIntersectionDist(
  posX: number,
  posY: number,
  zone?: ZoneSpec
): number {
  if (!zone) return Infinity;
  let dNearM = Infinity;
  for (let i = 0; i < zone.polygon.length; i++) {
    const p1 = zone.polygon[i];
    const p2 = zone.polygon[(i + 1) % zone.polygon.length];
    const dist = raySegmentIntersection(posX, posY, p1, p2);
    if (dist !== null && dist < dNearM) {
      dNearM = dist;
    }
  }
  return dNearM;
}

function computeBlockingRayPoint(
  t: number,
  pos: { x: number; y: number; z: number },
  antennaHeightM: number
): LosRayPoint {
  return {
    x: t * pos.x,
    y: t * pos.y,
    z: antennaHeightM + t * (pos.z - antennaHeightM),
  };
}

/**
 * Computes authoritative model-faithful line-of-sight analysis for a selected track.
 * Strictly adheres to the simulation's canonical evaluateMasking logic (Rule R10.3 & D-37).
 * Never leaks raw unprojected simulation ground truth.
 */
export function calculateModelledLos(
  target: {
    trackNo: string;
    pos: { x: number; y: number; z: number } | null;
    masked?: boolean;
    ghostSigmaM?: number;
  },
  zones: ZoneSpec[] = [],
  antennaHeightM: number = CONFIG.thresholds.antennaHeightM || 15
): LosExplanation {
  const radarOrigin: LosRayPoint = { x: 0, y: 0, z: antennaHeightM };

  // If track has no safe operator position, explain without fabricating a location
  if (!target.pos || Number.isNaN(target.pos.x) || Number.isNaN(target.pos.y) || Number.isNaN(target.pos.z)) {
    return {
      trackNo: target.trackNo,
      status: 'MASKED_NO_POS',
      isMasked: true,
      radarOrigin,
      targetPoint: null,
      blockingPoint: null,
      label: `[MODELLED LOS / MASKING] ${target.trackNo} | MASKED (NO POSITION)`,
      isCoasting: !!target.masked,
      ghostSigmaM: target.ghostSigmaM ?? 0,
    };
  }

  const pos = target.pos;
  const R = Math.hypot(pos.x, pos.y);
  const maskResult: MaskResult = evaluateMasking(pos, zones);
  const isCoasting = !!target.masked;
  const ghostSigmaM = target.ghostSigmaM ?? 0;
  const coastSuffix = isCoasting && ghostSigmaM > 0 ? ` | COAST ±${Math.round(ghostSigmaM)}m` : '';

  if (!maskResult.isMasked) {
    return {
      trackNo: target.trackNo,
      status: 'CLEAR',
      isMasked: false,
      radarOrigin,
      targetPoint: { ...pos },
      blockingPoint: null,
      thetaT: maskResult.thetaT,
      thetaMask: maskResult.thetaMask,
      label: `[MODELLED LOS / MASKING] ${target.trackNo} | CLEAR | R:${Math.round(R)}m θ:${toDeg(maskResult.thetaT)}°${coastSuffix}`,
      isCoasting,
      ghostSigmaM,
    };
  }

  // Track is masked. Determine exact blocking geometry:
  const blockingZone = zones.find((z) => z.id === maskResult.zoneId);

  if (maskResult.dNearM === 0) {
    // Condition 1: Target inside zone polygon below roofline
    const dNearM = findPolygonRayIntersectionDist(pos.x, pos.y, blockingZone);
    const t = (dNearM < Infinity && R > 0) ? Math.min(1, Math.max(0, dNearM / R)) : 0.5;
    const blockingPoint = computeBlockingRayPoint(t, pos, antennaHeightM);

    return {
      trackNo: target.trackNo,
      status: 'BLOCKED_INTERIOR',
      isMasked: true,
      radarOrigin,
      targetPoint: { ...pos },
      blockingPoint,
      zoneId: maskResult.zoneId,
      thetaT: maskResult.thetaT,
      thetaMask: maskResult.thetaMask,
      dNearM: dNearM < Infinity ? dNearM : 0,
      shadowRemainingM: maskResult.shadowRemainingM,
      label: `[MODELLED LOS / MASKING] ${target.trackNo} | BLOCKED: INSIDE [${maskResult.zoneId ?? 'ZONE'}] (z <= roof ${blockingZone?.heightM ?? '?'}m)${coastSuffix}`,
      isCoasting,
      ghostSigmaM,
    };
  }

  // Condition 2: Target in radar shadow behind zone
  const t = R > 0 ? Math.min(1, Math.max(0, maskResult.dNearM / R)) : 0.5;
  const blockingPoint = computeBlockingRayPoint(t, pos, antennaHeightM);

  return {
    trackNo: target.trackNo,
    status: 'BLOCKED_SHADOW',
    isMasked: true,
    radarOrigin,
    targetPoint: { ...pos },
    blockingPoint,
    zoneId: maskResult.zoneId,
    thetaT: maskResult.thetaT,
    thetaMask: maskResult.thetaMask,
    dNearM: maskResult.dNearM,
    shadowRemainingM: maskResult.shadowRemainingM,
    label: `[MODELLED LOS / MASKING] ${target.trackNo} | BLOCKED: SHADOW [${maskResult.zoneId ?? 'ZONE'}] (θT:${toDeg(maskResult.thetaT)}° < θM:${toDeg(maskResult.thetaMask)}°)${coastSuffix}`,
    isCoasting,
    ghostSigmaM,
  };
}

/**
 * Three.js procedural renderer for Modelled Line-of-Sight (LOS) explanation.
 * Pre-allocates line buffers and billboard sprite canvas for zero-allocation frame updates.
 */
export class LosVisualizer3D {
  public readonly group: THREE.Group;

  private readonly clearLine: THREE.Line;
  private readonly clearGeom: THREE.BufferGeometry;
  private readonly clearPositions: Float32Array;

  private readonly blockedLine: THREE.Line;
  private readonly blockedGeom: THREE.BufferGeometry;
  private readonly blockedPositions: Float32Array;

  private readonly blockMarker: THREE.Mesh;
  private readonly labelSprite: THREE.Sprite;

  private readonly spriteCanvas?: HTMLCanvasElement;
  private readonly spriteCtx?: CanvasRenderingContext2D | null;
  private readonly spriteTexture?: THREE.CanvasTexture;
  private lastLabelText: string = '';

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'los_visualizer_group';

    // 1. Clear Line (2 vertices: Origin -> BlockingPoint or TargetPoint)
    this.clearPositions = new Float32Array(6); // 2 points * 3 coords
    this.clearGeom = new THREE.BufferGeometry();
    this.clearGeom.setAttribute('position', new THREE.BufferAttribute(this.clearPositions, 3));
    const clearMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8, // Sky cyan
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    this.clearLine = new THREE.Line(this.clearGeom, clearMat);
    this.group.add(this.clearLine);

    // 2. Blocked Line (2 vertices: BlockingPoint -> TargetPoint)
    this.blockedPositions = new Float32Array(6);
    this.blockedGeom = new THREE.BufferGeometry();
    this.blockedGeom.setAttribute('position', new THREE.BufferAttribute(this.blockedPositions, 3));
    const blockedMat = new THREE.LineBasicMaterial({
      color: 0xef4444, // Red warning
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    });
    this.blockedLine = new THREE.Line(this.blockedGeom, blockedMat);
    this.group.add(this.blockedLine);

    // 3. Blocking Point Marker (Diamond / Sphere at obstruction)
    const markerGeom = new THREE.SphereGeometry(3.5, 8, 8);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Orange alert
      wireframe: true,
    });
    this.blockMarker = new THREE.Mesh(markerGeom, markerMat);
    this.group.add(this.blockMarker);

    // 4. Billboard Sprite Label (Headless-safe)
    if (typeof document !== 'undefined') {
      this.spriteCanvas = document.createElement('canvas');
      this.spriteCanvas.width = 512;
      this.spriteCanvas.height = 64;
      this.spriteCtx = this.spriteCanvas.getContext('2d');

      this.spriteTexture = new THREE.CanvasTexture(this.spriteCanvas);
      this.spriteTexture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({
        map: this.spriteTexture,
        transparent: true,
        depthTest: false,
      });
      this.labelSprite = new THREE.Sprite(spriteMat);
    } else {
      const spriteMat = new THREE.SpriteMaterial({
        transparent: true,
        depthTest: false,
      });
      this.labelSprite = new THREE.Sprite(spriteMat);
    }

    this.labelSprite.scale.set(65, 8, 1);
    this.group.add(this.labelSprite);

    this.group.visible = false;
  }

  private updateLabelSprite(text: string, isBlocked: boolean): void {
    if (text === this.lastLabelText) return;
    this.lastLabelText = text;

    if (typeof document === 'undefined' || !this.spriteCtx || !this.spriteTexture) return;

    const ctx = this.spriteCtx;
    ctx.clearRect(0, 0, 512, 64);

    // Background pill
    ctx.fillStyle = isBlocked ? 'rgba(30, 10, 10, 0.9)' : 'rgba(10, 25, 40, 0.9)';
    ctx.fillRect(4, 4, 504, 56);
    ctx.strokeStyle = isBlocked ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 504, 56);

    // Text
    ctx.fillStyle = isBlocked ? '#fca5a5' : '#bae6fd';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    this.spriteTexture.needsUpdate = true;
  }

  /**
   * Updates LOS ray and explanation for the currently selected track.
   */
  public update(
    target: SafeTrackView | null,
    zones: ZoneSpec[] = [],
    antennaHeightM: number = CONFIG.thresholds.antennaHeightM || 15,
    showLos: boolean = true
  ): void {
    if (!showLos || !target?.pos) {
      this.group.visible = false;
      return;
    }

    const explanation = calculateModelledLos(target, zones, antennaHeightM);
    this.group.visible = true;

    const origin3D = toThree(
      explanation.radarOrigin.x,
      explanation.radarOrigin.y,
      explanation.radarOrigin.z
    );

    if (explanation.status === 'MASKED_NO_POS' || !explanation.targetPoint) {
      // No position available; hide lines and marker, show explanation banner at radar
      this.clearLine.visible = false;
      this.blockedLine.visible = false;
      this.blockMarker.visible = false;
      this.labelSprite.visible = true;
      this.labelSprite.position.set(origin3D.x, origin3D.y + 15, origin3D.z);
      this.updateLabelSprite(explanation.label, true);
      return;
    }

    const target3D = toThree(
      explanation.targetPoint.x,
      explanation.targetPoint.y,
      explanation.targetPoint.z
    );

    if (explanation.status === 'CLEAR' || !explanation.blockingPoint) {
      // Clear line of sight
      this.clearLine.visible = true;
      this.clearPositions[0] = origin3D.x;
      this.clearPositions[1] = origin3D.y;
      this.clearPositions[2] = origin3D.z;
      this.clearPositions[3] = target3D.x;
      this.clearPositions[4] = target3D.y;
      this.clearPositions[5] = target3D.z;
      this.clearGeom.attributes.position.needsUpdate = true;

      this.blockedLine.visible = false;
      this.blockMarker.visible = false;

      // Position label halfway along the ray
      this.labelSprite.visible = true;
      this.labelSprite.position.set(
        (origin3D.x + target3D.x) / 2,
        Math.max(origin3D.y, target3D.y) + 12,
        (origin3D.z + target3D.z) / 2
      );
      this.updateLabelSprite(explanation.label, false);
    } else {
      // Blocked line of sight
      const block3D = toThree(
        explanation.blockingPoint.x,
        explanation.blockingPoint.y,
        explanation.blockingPoint.z
      );

      // 1. Clear segment: Origin -> BlockingPoint
      this.clearLine.visible = true;
      this.clearPositions[0] = origin3D.x;
      this.clearPositions[1] = origin3D.y;
      this.clearPositions[2] = origin3D.z;
      this.clearPositions[3] = block3D.x;
      this.clearPositions[4] = block3D.y;
      this.clearPositions[5] = block3D.z;
      this.clearGeom.attributes.position.needsUpdate = true;

      // 2. Blocked segment: BlockingPoint -> TargetPoint
      this.blockedLine.visible = true;
      this.blockedPositions[0] = block3D.x;
      this.blockedPositions[1] = block3D.y;
      this.blockedPositions[2] = block3D.z;
      this.blockedPositions[3] = target3D.x;
      this.blockedPositions[4] = target3D.y;
      this.blockedPositions[5] = target3D.z;
      this.blockedGeom.attributes.position.needsUpdate = true;

      // 3. Blocking Point Marker
      this.blockMarker.visible = true;
      this.blockMarker.position.set(block3D.x, block3D.y, block3D.z);

      // 4. Label Sprite positioned directly above the blocking point
      this.labelSprite.visible = true;
      this.labelSprite.position.set(block3D.x, Math.max(block3D.y, target3D.y) + 14, block3D.z);
      this.updateLabelSprite(explanation.label, true);
    }
  }

  public dispose(): void {
    this.clearGeom.dispose();
    (this.clearLine.material as THREE.Material).dispose();

    this.blockedGeom.dispose();
    (this.blockedLine.material as THREE.Material).dispose();

    this.blockMarker.geometry.dispose();
    (this.blockMarker.material as THREE.Material).dispose();

    this.spriteTexture?.dispose();
    this.labelSprite.material.dispose();

    this.group.clear();
  }
}

import * as THREE from 'three';
import type { EngagementEffect, EngagementEffectContext, EngagementEffectStage } from './engagementEffectTypes';
import { createNeutralizationVisual, type NeutralizationVisual } from './neutralizationEffect';

/**
 * 3D Gun Engagement Animation (Task 17 Phase 2.2).
 * - Muzzle flash near battery.
 * - Visible tracer segments travelling toward target.
 * - Outcome-dependent hit flash or miss effect.
 */
export class GunEngagementEffect implements EngagementEffect {
  public readonly id: string;
  public readonly seq: number;
  public readonly effectorId = 'GUN' as const;
  public readonly trackNo: string;
  public readonly startTMs: number;
  public readonly durationMs: number = 800; // 800ms total animation lifecycle
  public readonly originPos: THREE.Vector3;
  public readonly targetPos: THREE.Vector3;
  public killed: boolean | null = null;
  public stage: EngagementEffectStage = 'TRANSIT';
  public progress: number = 0;
  public readonly group: THREE.Group;

  private readonly muzzleFlash: THREE.Mesh;
  private readonly tracerLines: THREE.LineSegments;
  private readonly tracerGeometry: THREE.BufferGeometry;
  private readonly tracerMaterial: THREE.LineBasicMaterial;
  private readonly muzzleMaterial: THREE.MeshBasicMaterial;
  private outcomeVisual: NeutralizationVisual | null = null;

  constructor(params: {
    id: string;
    seq: number;
    trackNo: string;
    startTMs: number;
    originPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    killed?: boolean | null;
  }) {
    this.id = params.id;
    this.seq = params.seq;
    this.trackNo = params.trackNo;
    this.startTMs = params.startTMs;
    this.originPos = params.originPos.clone();
    this.targetPos = params.targetPos.clone();
    this.killed = params.killed ?? null;

    this.group = new THREE.Group();
    this.group.name = `GunEffect_${this.id}`;

    // 1. Muzzle Flash
    const muzzleGeom = new THREE.SphereGeometry(2.5, 6, 6);
    this.muzzleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.9,
    });
    this.muzzleFlash = new THREE.Mesh(muzzleGeom, this.muzzleMaterial);
    this.muzzleFlash.position.copy(this.originPos);
    this.group.add(this.muzzleFlash);

    // 2. Tracer Segments (3 staggered tracers)
    const tracerPts = new Float32Array(3 * 2 * 3); // 3 line segments, 2 pts each, 3 coords
    this.tracerGeometry = new THREE.BufferGeometry();
    this.tracerGeometry.setAttribute('position', new THREE.BufferAttribute(tracerPts, 3));
    this.tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xffcc00,
      linewidth: 2,
      transparent: true,
      opacity: 0.95,
    });
    this.tracerLines = new THREE.LineSegments(this.tracerGeometry, this.tracerMaterial);
    this.group.add(this.tracerLines);
  }

  public resolveOutcome(killed: boolean): void {
    this.killed = killed;
  }

  public update(ctx: EngagementEffectContext, currentTargetPos?: THREE.Vector3): boolean {
    const elapsedMs = ctx.simMs - this.startTMs;
    if (elapsedMs < 0) {
      this.group.visible = false;
      return true;
    }
    this.group.visible = true;

    const target = currentTargetPos ?? this.targetPos;
    this.progress = Math.min(1, Math.max(0, elapsedMs / this.durationMs));

    // Phase A: Transit (0.0 -> 0.45, ~360ms)
    // Tracers travel from origin to target
    const transitProgress = Math.min(1, this.progress / 0.45);

    // Fade muzzle flash quickly (0.0 -> 0.15)
    this.muzzleFlash.scale.setScalar(Math.max(0.1, 1 - this.progress * 4));
    this.muzzleMaterial.opacity = Math.max(0, 0.9 - this.progress * 6);

    // Update tracer line segment positions along ray
    const dir = new THREE.Vector3().subVectors(target, this.originPos);
    const totalDist = dir.length();
    const unitDir = dir.normalize();
    const tracerLen = Math.min(60, totalDist * 0.15);

    const posAttr = this.tracerGeometry.getAttribute('position') as THREE.BufferAttribute;
    const offsets = [0, 0.08, 0.16];
    for (let i = 0; i < 3; i++) {
      const p = Math.max(0, Math.min(1, transitProgress - offsets[i]));
      const tipDist = p * totalDist;
      const tailDist = Math.max(0, tipDist - tracerLen);

      const tipPos = this.originPos.clone().addScaledVector(unitDir, tipDist);
      const tailPos = this.originPos.clone().addScaledVector(unitDir, tailDist);

      posAttr.setXYZ(i * 2, tailPos.x, tailPos.y, tailPos.z);
      posAttr.setXYZ(i * 2 + 1, tipPos.x, tipPos.y, tipPos.z);
    }
    posAttr.needsUpdate = true;

    // Phase B: Impact & Outcome (0.45 -> 1.0)
    if (this.progress >= 0.45) {
      this.tracerLines.visible = false;
      if (!this.outcomeVisual) {
        const isKilled = this.killed === true;
        this.stage = isKilled ? 'NEUTRALIZATION' : 'INEFFECTIVE';
        this.outcomeVisual = createNeutralizationVisual(target, isKilled);
        this.group.add(this.outcomeVisual.group);
      }
      const impactProgress = (this.progress - 0.45) / 0.55;
      this.outcomeVisual.update(impactProgress);
    }

    if (this.progress >= 1.0) {
      this.stage = 'COMPLETED';
      return false;
    }
    return true;
  }

  public dispose(): void {
    this.muzzleFlash.geometry.dispose();
    this.muzzleMaterial.dispose();
    this.tracerGeometry.dispose();
    this.tracerMaterial.dispose();
    this.outcomeVisual?.dispose();
    this.group.clear();
  }
}

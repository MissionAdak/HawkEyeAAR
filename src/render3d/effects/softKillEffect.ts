import * as THREE from 'three';
import type { EngagementEffect, EngagementEffectContext, EngagementEffectStage } from './engagementEffectTypes';
import { createNeutralizationVisual, type NeutralizationVisual } from './neutralizationEffect';

/**
 * 3D RF Soft-Kill Engagement Animation (Task 17 Phase 2.4).
 * Strictly non-kinetic:
 * - NO physical projectile.
 * - Expanding electromagnetic / radio-frequency ripple rings from directional jammer.
 * - Localized signal distortion and interference arcs around target.
 * - Controlled electronic neutralization on success; signal fade on ineffective.
 */
export class SoftKillEngagementEffect implements EngagementEffect {
  public readonly id: string;
  public readonly seq: number;
  public readonly effectorId = 'RF_SOFTKILL' as const;
  public readonly trackNo: string;
  public readonly startTMs: number;
  public readonly durationMs: number = 900;
  public readonly originPos: THREE.Vector3;
  public readonly targetPos: THREE.Vector3;
  public killed: boolean | null = null;
  public stage: EngagementEffectStage = 'TRANSIT';
  public progress: number = 0;
  public readonly group: THREE.Group;

  // Expanding RF wavefront rings
  private readonly rippleRings: THREE.Mesh[] = [];
  private readonly ringGeometry: THREE.RingGeometry;
  private readonly ringMaterial: THREE.MeshBasicMaterial;

  // Target electronic interference sphere
  private readonly targetInterference: THREE.Mesh;
  private readonly targetInterferenceMaterial: THREE.MeshBasicMaterial;
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
    this.group.name = `SoftKillEffect_${this.id}`;

    // 1. RF Wavefront Rings
    this.ringGeometry = new THREE.RingGeometry(0.8, 1.2, 32);
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
      this.group.add(ring);
      this.rippleRings.push(ring);
    }

    // 2. Target Electronic Interference Shell
    const shellGeom = new THREE.IcosahedronGeometry(1.8, 1);
    this.targetInterferenceMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.targetInterference = new THREE.Mesh(shellGeom, this.targetInterferenceMaterial);
    this.targetInterference.position.copy(this.targetPos);
    this.group.add(this.targetInterference);
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

    // Direction vector from origin to target
    const dir = new THREE.Vector3().subVectors(target, this.originPos);
    const totalDist = dir.length();
    const unitDir = dir.clone().normalize();

    // Orient ripple rings towards target
    const lookMatrix = new THREE.Matrix4().lookAt(this.originPos, target, new THREE.Vector3(0, 1, 0));
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

    // Staggered propagation of 4 RF waves
    const transitProgress = Math.min(1, this.progress / 0.5);
    const ringOffsets = [0, 0.12, 0.24, 0.36];

    for (let i = 0; i < 4; i++) {
      const ring = this.rippleRings[i];
      const p = Math.max(0, Math.min(1, transitProgress - ringOffsets[i]));
      const dist = p * totalDist;
      const ringPos = this.originPos.clone().addScaledVector(unitDir, dist);

      ring.position.copy(ringPos);
      ring.quaternion.copy(lookQuat);
      // Conical expansion: ring widens as it travels towards target
      const scale = 1 + p * (totalDist * 0.08);
      ring.scale.set(scale, scale, 1);
      ring.visible = p > 0 && p < 1;
    }

    // Phase B: Target Electronic Interference & Dissipation (0.45 -> 1.0)
    this.targetInterference.position.copy(target);
    if (this.progress >= 0.4) {
      const activeP = (this.progress - 0.4) / 0.6;
      this.targetInterference.scale.setScalar(1 + Math.sin(activeP * Math.PI * 8) * 0.2);
      this.targetInterferenceMaterial.opacity = Math.max(0, 0.7 - activeP * 0.8);

      if (this.progress >= 0.5 && !this.outcomeVisual) {
        const isKilled = this.killed === true;
        this.stage = isKilled ? 'NEUTRALIZATION' : 'INEFFECTIVE';
        this.outcomeVisual = createNeutralizationVisual(target, isKilled);
        this.group.add(this.outcomeVisual.group);
      }
      if (this.outcomeVisual) {
        const outcomeP = (this.progress - 0.5) / 0.5;
        this.outcomeVisual.update(outcomeP);
      }
    }

    if (this.progress >= 1.0) {
      this.stage = 'COMPLETED';
      return false;
    }
    return true;
  }

  public dispose(): void {
    this.ringGeometry.dispose();
    this.ringMaterial.dispose();
    this.targetInterference.geometry.dispose();
    this.targetInterferenceMaterial.dispose();
    this.outcomeVisual?.dispose();
    this.group.clear();
  }
}

import * as THREE from 'three';
import type { EngagementEffect, EngagementEffectContext, EngagementEffectStage } from './engagementEffectTypes';
import { createNeutralizationVisual, type NeutralizationVisual } from './neutralizationEffect';

/**
 * 3D Interceptor Drone Engagement Animation (Task 17 Phase 2.5).
 * - Compact friendly interceptor drone launches from protected site.
 * - Cosmetic ballistic interpolation curve to target intercept position.
 * - Proximity impact burst on arrival.
 * - Outcome follows authoritative simulation result.
 */
export class InterceptorEngagementEffect implements EngagementEffect {
  public readonly id: string;
  public readonly seq: number;
  public readonly effectorId = 'INTERCEPTOR' as const;
  public readonly trackNo: string;
  public readonly startTMs: number;
  public readonly durationMs: number = 1000;
  public readonly originPos: THREE.Vector3;
  public readonly targetPos: THREE.Vector3;
  public killed: boolean | null = null;
  public stage: EngagementEffectStage = 'TRANSIT';
  public progress: number = 0;
  public readonly group: THREE.Group;

  private readonly interceptorMesh: THREE.Group;
  private readonly bodyGeometry: THREE.BufferGeometry;
  private readonly bodyMaterial: THREE.MeshLambertMaterial;
  private readonly trailGeometry: THREE.BufferGeometry;
  private readonly trailMaterial: THREE.LineBasicMaterial;
  private readonly trailPositions: Float32Array;
  private readonly trailLine: THREE.Line;
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
    this.group.name = `InterceptorEffect_${this.id}`;

    // 1. Interceptor Model
    this.interceptorMesh = new THREE.Group();
    this.bodyGeometry = new THREE.ConeGeometry(0.4, 1.8, 6);
    this.bodyGeometry.rotateX(Math.PI / 2);
    this.bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00f0ff });
    const cone = new THREE.Mesh(this.bodyGeometry, this.bodyMaterial);
    this.interceptorMesh.add(cone);

    const wingGeom = new THREE.BoxGeometry(2.0, 0.04, 0.4);
    const wingMesh = new THREE.Mesh(wingGeom, this.bodyMaterial);
    this.interceptorMesh.add(wingMesh);

    this.group.add(this.interceptorMesh);

    // 2. Light Trail
    const trailSegments = 8;
    this.trailPositions = new Float32Array(trailSegments * 3);
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
    });
    this.trailLine = new THREE.Line(this.trailGeometry, this.trailMaterial);
    this.group.add(this.trailLine);
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

    // Flight Transit: 0.0 -> 0.55 (~550ms flight)
    if (this.progress < 0.55) {
      const flightP = this.progress / 0.55;
      // Arc trajectory: linear interpolation + gentle climb arch
      const currPos = new THREE.Vector3().lerpVectors(this.originPos, target, flightP);
      currPos.y += Math.sin(flightP * Math.PI) * 40; // 40m gentle ballistic climb arc

      this.interceptorMesh.position.copy(currPos);

      // Orient forward along trajectory
      const nextP = Math.min(1, flightP + 0.05);
      const nextPos = new THREE.Vector3().lerpVectors(this.originPos, target, nextP);
      nextPos.y += Math.sin(nextP * Math.PI) * 40;
      this.interceptorMesh.lookAt(nextPos);

      // Trail update
      const posAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 7; i > 0; i--) {
        posAttr.setXYZ(i, posAttr.getX(i - 1), posAttr.getY(i - 1), posAttr.getZ(i - 1));
      }
      posAttr.setXYZ(0, currPos.x, currPos.y, currPos.z);
      posAttr.needsUpdate = true;
    } else {
      // Arrived at target
      this.interceptorMesh.visible = false;
      this.trailLine.visible = false;

      if (!this.outcomeVisual) {
        const isKilled = this.killed === true;
        this.stage = isKilled ? 'NEUTRALIZATION' : 'INEFFECTIVE';
        this.outcomeVisual = createNeutralizationVisual(target, isKilled);
        this.group.add(this.outcomeVisual.group);
      }
      const outcomeP = (this.progress - 0.55) / 0.45;
      this.outcomeVisual.update(outcomeP);
    }

    if (this.progress >= 1.0) {
      this.stage = 'COMPLETED';
      return false;
    }
    return true;
  }

  public dispose(): void {
    this.bodyGeometry.dispose();
    this.bodyMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.outcomeVisual?.dispose();
    this.group.clear();
  }
}

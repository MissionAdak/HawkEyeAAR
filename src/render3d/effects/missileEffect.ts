import * as THREE from 'three';
import type { EngagementEffect, EngagementEffectContext, EngagementEffectStage } from './engagementEffectTypes';
import { createNeutralizationVisual, type NeutralizationVisual } from './neutralizationEffect';

/**
 * 3D Missile Engagement Animation (Task 17 Phase 2.6).
 * - Restrained generic missile visual: launch flash, projectile with smoke/light trail.
 * - Contact impact flash.
 * - Outcome-dependent neutralization or ineffective visual.
 */
export class MissileEngagementEffect implements EngagementEffect {
  public readonly id: string;
  public readonly seq: number;
  public readonly effectorId = 'MISSILE' as const;
  public readonly trackNo: string;
  public readonly startTMs: number;
  public readonly durationMs: number = 950;
  public readonly originPos: THREE.Vector3;
  public readonly targetPos: THREE.Vector3;
  public killed: boolean | null = null;
  public stage: EngagementEffectStage = 'TRANSIT';
  public progress: number = 0;
  public readonly group: THREE.Group;

  private readonly missileGroup: THREE.Group;
  private readonly missileBodyGeometry: THREE.CylinderGeometry;
  private readonly missileMaterial: THREE.MeshLambertMaterial;
  private readonly flameMaterial: THREE.MeshBasicMaterial;
  private readonly trailGeometry: THREE.BufferGeometry;
  private readonly trailMaterial: THREE.LineBasicMaterial;
  private readonly trailPositions: Float32Array;
  private readonly trailLine: THREE.Line;
  private readonly launchFlash: THREE.Mesh;
  private readonly launchFlashMaterial: THREE.MeshBasicMaterial;
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
    this.group.name = `MissileEffect_${this.id}`;

    // 1. Launch flash at battery
    const flashGeom = new THREE.SphereGeometry(3, 6, 6);
    this.launchFlashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
    });
    this.launchFlash = new THREE.Mesh(flashGeom, this.launchFlashMaterial);
    this.launchFlash.position.copy(this.originPos);
    this.group.add(this.launchFlash);

    // 2. Missile Body & Rocket Exhaust
    this.missileGroup = new THREE.Group();
    this.missileBodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2.2, 8);
    this.missileBodyGeometry.rotateX(Math.PI / 2);
    this.missileMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const missileMesh = new THREE.Mesh(this.missileBodyGeometry, this.missileMaterial);
    this.missileGroup.add(missileMesh);

    // Exhaust flame
    const flameGeom = new THREE.ConeGeometry(0.25, 1.2, 6);
    flameGeom.rotateX(-Math.PI / 2);
    this.flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const flameMesh = new THREE.Mesh(flameGeom, this.flameMaterial);
    flameMesh.position.set(0, 0, 1.4);
    this.missileGroup.add(flameMesh);

    this.group.add(this.missileGroup);

    // 3. Smoke Trail
    const trailSegments = 10;
    this.trailPositions = new Float32Array(trailSegments * 3);
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xbbbbbb,
      transparent: true,
      opacity: 0.65,
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

    // Launch flash fades (0.0 -> 0.15)
    this.launchFlashMaterial.opacity = Math.max(0, 0.9 - this.progress * 6);
    this.launchFlash.scale.setScalar(Math.max(0.1, 1 - this.progress * 5));

    // Phase A: In-flight transit (0.0 -> 0.5)
    if (this.progress < 0.5) {
      const flightP = this.progress / 0.5;
      // High-speed direct trajectory with slight climb-then-terminal-dive
      const currPos = new THREE.Vector3().lerpVectors(this.originPos, target, flightP);
      currPos.y += Math.sin(flightP * Math.PI) * 25;

      this.missileGroup.position.copy(currPos);

      const nextP = Math.min(1, flightP + 0.05);
      const nextPos = new THREE.Vector3().lerpVectors(this.originPos, target, nextP);
      nextPos.y += Math.sin(nextP * Math.PI) * 25;
      this.missileGroup.lookAt(nextPos);

      // Update smoke trail
      const posAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 9; i > 0; i--) {
        posAttr.setXYZ(i, posAttr.getX(i - 1), posAttr.getY(i - 1), posAttr.getZ(i - 1));
      }
      posAttr.setXYZ(0, currPos.x, currPos.y, currPos.z);
      posAttr.needsUpdate = true;
    } else {
      // Arrived at target: hide missile, trigger impact visual
      this.missileGroup.visible = false;
      this.trailLine.visible = false;

      if (!this.outcomeVisual) {
        const isKilled = this.killed === true;
        this.stage = isKilled ? 'NEUTRALIZATION' : 'INEFFECTIVE';
        this.outcomeVisual = createNeutralizationVisual(target, isKilled);
        this.group.add(this.outcomeVisual.group);
      }
      const outcomeP = (this.progress - 0.5) / 0.5;
      this.outcomeVisual.update(outcomeP);
    }

    if (this.progress >= 1.0) {
      this.stage = 'COMPLETED';
      return false;
    }
    return true;
  }

  public dispose(): void {
    this.launchFlash.geometry.dispose();
    this.launchFlashMaterial.dispose();
    this.missileBodyGeometry.dispose();
    this.missileMaterial.dispose();
    this.flameMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.outcomeVisual?.dispose();
    this.group.clear();
  }
}

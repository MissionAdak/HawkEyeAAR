import * as THREE from 'three';
import type { EngagementEffect, EngagementEffectContext, EngagementEffectStage } from './engagementEffectTypes';
import { createNeutralizationVisual, type NeutralizationVisual } from './neutralizationEffect';

/**
 * 3D High-Energy Laser Engagement Animation (Task 17 Phase 2.3).
 * - Coherent directional beam pulse from emitter to target.
 * - Localized target burn glow and impact light.
 * - Fog-responsive beam scatter.
 * - Authoritative neutralization on kill; harmless fade on ineffective.
 */
export class LaserEngagementEffect implements EngagementEffect {
  public readonly id: string;
  public readonly seq: number;
  public readonly effectorId = 'LASER' as const;
  public readonly trackNo: string;
  public readonly startTMs: number;
  public readonly durationMs: number = 750;
  public readonly originPos: THREE.Vector3;
  public readonly targetPos: THREE.Vector3;
  public killed: boolean | null = null;
  public stage: EngagementEffectStage = 'TRANSIT';
  public progress: number = 0;
  public readonly group: THREE.Group;

  private readonly beamLine: THREE.Line;
  private readonly beamGeometry: THREE.BufferGeometry;
  private readonly beamMaterial: THREE.LineBasicMaterial;
  private readonly targetGlow: THREE.Mesh;
  private readonly targetGlowMaterial: THREE.MeshBasicMaterial;
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
    this.group.name = `LaserEffect_${this.id}`;

    // 1. Direct High-Energy Beam
    const beamPts = [this.originPos.clone(), this.targetPos.clone()];
    this.beamGeometry = new THREE.BufferGeometry().setFromPoints(beamPts);
    this.beamMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });
    this.beamLine = new THREE.Line(this.beamGeometry, this.beamMaterial);
    this.group.add(this.beamLine);

    // 2. Localized Target Thermal Burn Glow
    const glowGeom = new THREE.SphereGeometry(1.6, 8, 8);
    this.targetGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.targetGlow = new THREE.Mesh(glowGeom, this.targetGlowMaterial);
    this.targetGlow.position.copy(this.targetPos);
    this.group.add(this.targetGlow);
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

    // Dynamic beam alignment to target
    const posAttr = this.beamGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(0, this.originPos.x, this.originPos.y, this.originPos.z);
    posAttr.setXYZ(1, target.x, target.y, target.z);
    posAttr.needsUpdate = true;

    this.targetGlow.position.copy(target);

    // Fog degradation visual: beam turns slightly cyan-white and diffuses
    if (ctx.isFogActive) {
      this.beamMaterial.color.setHex(0x55ccff);
      this.beamMaterial.opacity = Math.max(0, 0.7 - this.progress * 0.9);
    } else {
      this.beamMaterial.color.setHex(0x00f0ff);
      // Beam pulse: stays peak bright for 0.0 -> 0.4, then fades
      this.beamMaterial.opacity = Math.max(0, 1 - Math.pow(this.progress, 1.5));
    }

    // Target thermal glow pulsates
    const glowPulse = 1 + Math.sin(this.progress * Math.PI * 6) * 0.25;
    this.targetGlow.scale.setScalar(glowPulse);
    this.targetGlowMaterial.opacity = Math.max(0, 0.85 - this.progress);

    // Trigger outcome visual around p=0.45
    if (this.progress >= 0.45) {
      if (!this.outcomeVisual) {
        const isKilled = this.killed === true;
        this.stage = isKilled ? 'NEUTRALIZATION' : 'INEFFECTIVE';
        this.outcomeVisual = createNeutralizationVisual(target, isKilled);
        this.group.add(this.outcomeVisual.group);
      }
      const outcomeProgress = (this.progress - 0.45) / 0.55;
      this.outcomeVisual.update(outcomeProgress);
    }

    if (this.progress >= 1.0) {
      this.stage = 'COMPLETED';
      return false;
    }
    return true;
  }

  public dispose(): void {
    this.beamGeometry.dispose();
    this.beamMaterial.dispose();
    this.targetGlow.geometry.dispose();
    this.targetGlowMaterial.dispose();
    this.outcomeVisual?.dispose();
    this.group.clear();
  }
}

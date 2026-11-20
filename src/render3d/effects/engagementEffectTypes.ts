import * as THREE from 'three';
import type { EffectorId } from '@/sim/types';

export type EngagementEffectStage =
  | 'TRANSIT'
  | 'IMPACT'
  | 'NEUTRALIZATION'
  | 'INEFFECTIVE'
  | 'COMPLETED';

export interface EngagementEffectContext {
  simMs: number;
  isFogActive?: boolean;
  isNight?: boolean;
}

export interface EngagementEffect {
  id: string;
  seq: number;
  effectorId: EffectorId;
  trackNo: string;
  startTMs: number;
  durationMs: number;
  originPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  killed: boolean | null;
  stage: EngagementEffectStage;
  progress: number;
  group: THREE.Group;

  /**
   * Updates effect visual state at simulation time simMs.
   * Returns true if effect is still active; false when completed.
   */
  update(ctx: EngagementEffectContext, currentTargetPos?: THREE.Vector3): boolean;

  /**
   * Notifies the effect of the authoritative ENGAGE_RESULT outcome.
   */
  resolveOutcome(killed: boolean): void;

  /**
   * Cleans up Three.js resources (geometries, materials, child meshes).
   */
  dispose(): void;
}

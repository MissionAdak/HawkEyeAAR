import type { TrackClass, F2T2EAStep, ZoneSpec } from '@/sim/types';

/**
 * Safe Operator-Visible Track Projection for 3D Rendering.
 *
 * Invariant (Rules R10.3 & D-37):
 * This projection MUST NEVER contain raw simulation ground truth:
 * - NO trueClass
 * - NO droneType
 * - NO valueInr
 * - NO rcsM2
 * - NO emitsRf / remoteId / iff
 * - NO truth waypoints
 * - NO undetected tracks
 */
export interface SafeTrackView {
  trackNo: string;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  traineeLabel: TrackClass | null;
  step: F2T2EAStep;
  q: number;
  masked: boolean;
  ghostSigmaM: number;
  isSelected: boolean;
  lifecycle: 'ACTIVE' | 'LEAKED' | 'NEUTRALISED';
}

export type CameraPreset = 'OBLIQUE' | 'TOP' | 'POST';

export interface Scene3DOptions {
  maxRangeM: number;
  rMinM: number;
  zones?: ZoneSpec[];
}

import type { TrackClass, F2T2EAStep, SensorMode } from './types';
import type { ApprovedSensorObservation } from '@/render3d/types';

export type AltitudeBand = 'VLOW' | 'LOW' | 'MED' | 'HIGH';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Internal state for the deterministic track estimator.
 */
export interface TrackEstimate {
  trackNo: string;
  entityId: string;
  estPos: Vec3;
  estVel: Vec3;
  prevEstPos: Vec3;
  estRangeM: number;
  estBearingDeg: number;
  estSpeedMps: number;
  estAltBand: AltitudeBand;
  uncertaintyM: number;
  isCoasting: boolean;
  coastingSinceMs: number | null;
  lastMeasurementMs: number;
  lastSensorType: SensorMode;
  sensorSources: SensorMode[];
  q: number;
  cCls: number;
  traineeLabel: TrackClass | null;
  step: F2T2EAStep;
  lifecycle: 'ACTIVE' | 'LEAKED' | 'NEUTRALISED';
  sensorObservation?: ApprovedSensorObservation | null;
}

/**
 * OperatorTrackView — Strict Safe Projection for Live Operator Interface & Renderers.
 *
 * Invariant (Rules R3.3, R10.3 & Task 18 §2.C, §7):
 * Exposes ONLY estimated and authorized operator-visible state.
 * Live tactical console and live 2D/3D renderers MUST NEVER receive raw simulation ground truth:
 * - NO trueClass
 * - NO droneType
 * - NO valueInr
 * - NO rcsM2
 * - NO emitsRf / remoteId / iff
 * - NO truth waypoints
 * - NO spawnTMs
 * - NO truePos / trueVelocity
 * - NO killDraw
 */
export interface OperatorTrackView {
  trackNo: string;
  estPos: Vec3;
  estVel: Vec3;
  prevEstPos: Vec3;
  estRangeM: number;
  estBearingDeg: number;
  estSpeedMps: number;
  estAltBand: AltitudeBand;
  uncertaintyM: number;
  isCoasting: boolean;
  coastingSinceMs?: number | null;
  lastMeasurementMs: number;
  sensorSources: SensorMode[];
  q: number;
  cCls: number;
  traineeLabel: TrackClass | null;
  step: F2T2EAStep;
  lifecycle: 'ACTIVE' | 'LEAKED' | 'NEUTRALISED';
  sensorObservation?: ApprovedSensorObservation | null;
}

import type { TrackClass, F2T2EAStep, ZoneSpec, DroneType } from '@/sim/types';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './environment/types';

export type TargetDisplayMode = 'AUTO' | 'RADAR' | 'AIRFRAME';

/**
 * Safe Operator-Visible Track Projection for 3D Rendering.
 *
 * Invariant (Rules R10.3 & D-37):
 * This projection MUST NEVER contain raw simulation ground truth:
 * - NO trueClass
 * - NO valueInr
 * - NO rcsM2
 * - NO emitsRf / remoteId / iff
 * - NO truth waypoints
 * - NO undetected tracks
 *
 * observedAirframe is the physical airframe geometry observable by optical sensors
 * when within visual range and unmasked. It is NOT the true threat class or tactical intent.
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
  observedAirframe?: DroneType;
}

export type CameraPreset = 'OBLIQUE' | 'TOP' | 'POST';

export interface Scene3DOptions {
  maxRangeM: number;
  rMinM: number;
  zones?: ZoneSpec[];
  showCoverage?: boolean;
  showEnvelopes?: boolean;
  showLos?: boolean;
  showTrainingAid?: boolean;
  mode?: 'TRAIN' | 'EVAL' | 'DEMO';
  targetDisplayMode?: TargetDisplayMode;
  environment?: EnvironmentDescriptor;
  onSelectEnvironment?: (info: EnvironmentObjectInfo | null) => void;
}

export type {
  RadarCoverageStatus,
  EoirCoverageStatus,
  RfCoverageStatus,
  RadarCoverageModel,
  EoirCoverageModel,
  RfCoverageModel,
  SensorCoverageState,
} from './coverage';

export type {
  EffectorEnvelopeState,
  TrackEngagementCue,
  EffectorVisualOptions,
} from './effectorEnvelopes';

export type {
  LosRayPoint,
  LosBlockStatus,
  LosExplanation,
} from './losVisualizer';

export type {
  EnvironmentPreset,
  WeatherType,
  EnvironmentCategory,
  EnvironmentObjectInfo,
  EnvironmentDescriptor,
} from './environment/types';



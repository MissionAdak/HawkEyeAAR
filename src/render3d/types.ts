import type { TrackClass, F2T2EAStep, ZoneSpec } from '@/sim/types';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './environment/types';
import type {
  TargetDisplayMode,
  ApprovedSensorObservation,
} from '@/sim/sensorObservation';

export {
  VALID_SENSOR_HEALTH_STATES,
  VALID_TARGET_DISPLAY_MODES,
  VALID_OPTICAL_RESOLUTION_LEVELS,
  VALID_OPTICAL_VISIBILITY_STATES,
  VALID_OBSERVED_AIRFRAME_SIGNATURES,
  type ObservedAirframeSignature,
  type SensorHealthState,
  type OpticalResolutionLevel,
  type OpticalVisibilityState,
} from '@/sim/sensorObservation';

export type {
  TargetDisplayMode,
  ApprovedSensorObservation,
};

/**
 * Safe Operator-Visible Track Projection for 3D Rendering.
 *
 * Invariant (Rules R10.3, D-37 & Task 17.3 §2):
 * This projection MUST NEVER contain raw simulation ground truth:
 * - NO trueClass
 * - NO droneType
 * - NO valueInr
 * - NO rcsM2
 * - NO emitsRf / remoteId / iff
 * - NO truth waypoints
 * - NO undetected tracks
 *
 * Physical appearance is derived solely from approved sensorObservation measurements.
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
  sensorObservation?: ApprovedSensorObservation | null;
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



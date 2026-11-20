import type { TrackClass, F2T2EAStep, ZoneSpec } from '@/sim/types';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './environment/types';
import {
  VALID_SENSOR_HEALTH_STATES,
  VALID_TARGET_DISPLAY_MODES,
  VALID_OPTICAL_RESOLUTION_LEVELS,
  VALID_OPTICAL_VISIBILITY_STATES,
  VALID_OBSERVED_AIRFRAME_SIGNATURES,
} from './targets/targetObservation';

export {
  VALID_SENSOR_HEALTH_STATES,
  VALID_TARGET_DISPLAY_MODES,
  VALID_OPTICAL_RESOLUTION_LEVELS,
  VALID_OPTICAL_VISIBILITY_STATES,
  VALID_OBSERVED_AIRFRAME_SIGNATURES,
};

export type TargetDisplayMode = (typeof VALID_TARGET_DISPLAY_MODES)[number];

/**
 * Legitimate physical appearance signatures observable by optical/EO sensors.
 *
 * Invariant (Task 17.3 §3 & Rule R10.3):
 * These are physical airframe geometry signatures, NOT tactical threat classes.
 * An airframe shape (e.g. MULTIROTOR_COMPACT) does NOT prove hostile intent.
 */
export type ObservedAirframeSignature = (typeof VALID_OBSERVED_AIRFRAME_SIGNATURES)[number];

export type SensorHealthState = (typeof VALID_SENSOR_HEALTH_STATES)[number];

export type OpticalResolutionLevel = (typeof VALID_OPTICAL_RESOLUTION_LEVELS)[number];
export type OpticalVisibilityState = (typeof VALID_OPTICAL_VISIBILITY_STATES)[number];

/**
 * Approved Sensor Observation Output.
 *
 * Invariant (Task 17.3 §3, Task 17.4 §1, §3):
 * Produced by the authoritative simulation sensor subsystem only when physical
 * conditions (active sensor, sensor health, LOS/masking, range, weather) permit.
 * Never populated simply because an underlying TrackEntity exists.
 */
export interface ApprovedSensorObservation {
  signature: ObservedAirframeSignature;
  observedSignature?: ObservedAirframeSignature;
  timestampMs: number;
  sensorSource: 'EOIR' | 'RADAR' | 'RF';
  activeSensor?: 'EOIR' | 'RADAR' | 'RF';
  confidence: number;
  resolutionLevel: OpticalResolutionLevel;
  resolution?: OpticalResolutionLevel;
  visibilityState: OpticalVisibilityState;
  sensorAvailability: boolean;
  sensorHealth: SensorHealthState;
  sensorHealthOk?: boolean;
  estimatedRangeM?: number;
}

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



import type { TrackClass, F2T2EAStep, ZoneSpec } from '@/sim/types';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './environment/types';

export type TargetDisplayMode = 'AUTO' | 'RADAR' | 'AIRFRAME';

/**
 * Legitimate physical appearance signatures observable by optical/EO sensors.
 *
 * Invariant (Task 17.3 §3 & Rule R10.3):
 * These are physical airframe geometry signatures, NOT tactical threat classes.
 * An airframe shape (e.g. MULTIROTOR_COMPACT) does NOT prove hostile intent.
 */
export type ObservedAirframeSignature =
  | 'MULTIROTOR_COMPACT'
  | 'MULTIROTOR_WITH_CAMERA_POD'
  | 'MULTIROTOR_STANDARD'
  | 'FIXED_WING_DELTA'
  | 'BIRD_LIKE'
  | 'UNRESOLVED_AIRFRAME';

export type OpticalResolutionLevel = 'FULL' | 'DEGRADED' | 'UNRESOLVED';
export type OpticalVisibilityState =
  | 'CLEAR'
  | 'DEGRADED'
  | 'DEGRADED_FOG'
  | 'DEGRADED_RAIN'
  | 'DEGRADED_NIGHT_THERMAL'
  | 'MASKED'
  | 'OUT_OF_RANGE';

/**
 * Approved Sensor Observation Output.
 *
 * Invariant (Task 17.3 §3):
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



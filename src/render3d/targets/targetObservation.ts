import type { SafeTrackView, TargetDisplayMode, ObservedAirframeSignature } from '../types';
import type { SensorMode, DroneType } from '@/sim/types';
import type { TargetModelCategory } from './targetModelTypes';
import type { WeatherType } from '../environment/types';

export type SensorHealthState = 'OK' | 'DEG' | 'OUT';

export interface SensorObservationContext {
  activeSensor: SensorMode;
  displayMode: TargetDisplayMode;
  sensorHealth?: Record<SensorMode, SensorHealthState> | { radarOk?: boolean; eoirOk?: boolean; rfOk?: boolean };
  weather?: WeatherType;
  isNight?: boolean;
  mode?: 'TRAIN' | 'EVAL' | 'DEMO';
  sensorPos?: { x: number; y: number; z: number };
}

export function getEoirHealth(
  health?: Record<SensorMode, SensorHealthState> | { radarOk?: boolean; eoirOk?: boolean; rfOk?: boolean }
): SensorHealthState {
  if (!health) return 'OK';
  if ('EOIR' in health && health.EOIR) return health.EOIR;
  if ('eoirOk' in health) return health.eoirOk ? 'OK' : 'OUT';
  return 'OK';
}

export type ObservationState =
  | 'RADAR_TRACK'
  | 'CLEAR_OPTICAL'
  | 'DEGRADED_OPTICAL'
  | 'MASKED'
  | 'OUT_OF_RANGE'
  | 'SENSOR_OFFLINE';

export interface TargetObservationResult {
  presentationCategory: TargetModelCategory;
  isVisuallyResolved: boolean;
  observationState: ObservationState;
  opticalConfidence: number; // 0.0 to 1.0
  reason: string;
}

/**
 * NOTIONAL TRAINING ASSUMPTIONS & VISIBILITY PARAMETERS (Task 17.3 §4, §8):
 *
 * 1. Clear Daylight Nominal Optical Recognition Range: 2400 metres.
 * 2. Maximum Optical Detection Range: 3800 metres.
 *
 * CAUTION: These parameters are synthetic training heuristics for simulation education,
 * NOT physically calibrated military sensor specifications.
 */
export const CLEAR_OPTICAL_RANGE_M = 2400;
export const MAX_OPTICAL_RANGE_M = 3800;

/**
 * Maps legitimate observable physical airframe type to procedural target model category.
 * Note: This maps physical aircraft geometry, NOT tactical threat intent (trueClass).
 */
export function mapSignatureToCategory(
  signature?: ObservedAirframeSignature | DroneType | string
): TargetModelCategory {
  switch (signature) {
    case 'MULTIROTOR_COMPACT':
    case 'FPV_ATTACK':
      return 'HOSTILE_ATTACK';
    case 'MULTIROTOR_WITH_CAMERA_POD':
    case 'RECON_QUAD':
      return 'HOSTILE_ISR';
    case 'SWARM_ELEMENT':
      return 'SWARM_ELEMENT';
    case 'FIXED_WING_DELTA':
    case 'LOITERING_MUNITION':
      return 'LOITERING_MUNITION';
    case 'MULTIROTOR_STANDARD':
    case 'CIVIL_UAS':
      return 'CIVIL_UAS';
    case 'FRIENDLY_UAS':
      return 'FRIENDLY';
    case 'BIRD_LIKE':
    case 'BIRD':
      return 'BIRD';
    case 'UNRESOLVED_AIRFRAME':
    default:
      return 'UNKNOWN_AIRFRAME';
  }
}

export const mapAirframeToCategory = mapSignatureToCategory;

/**
 * Resolves sensor-aware 3D target visual presentation (Task 17.2, Task 17.3).
 *
 * Rules:
 * 1. RADAR mode / displayMode RADAR: strictly produces RADAR_SYMBOL (high-contrast diamond reticle).
 *    TGT:AIR preference CANNOT override RADAR selection.
 * 2. RF mode: strictly produces RADAR_SYMBOL. Optical models are forbidden in RF mode.
 * 3. EO/IR mode:
 *    - Sensor offline (eoirOk === false): strictly RADAR_SYMBOL / SENSOR_OFFLINE.
 *    - Masked tracks (terrain/buildings): strictly RADAR_SYMBOL / MASKED state. Never see-through.
 *    - Approved sensor observation present:
 *      * resolution === 'FULL': maps observed signature to physical model category.
 *      * resolution === 'DEGRADED': resolves UNKNOWN_AIRFRAME.
 *      * resolution === 'UNRESOLVED': resolves RADAR_SYMBOL.
 *    - If no observation is available: returns RADAR_SYMBOL.
 * 4. Operator classification (traineeLabel) does NOT alter physical airframe geometry.
 */
export function resolveTargetPresentation(
  track: SafeTrackView,
  context: SensorObservationContext
): TargetObservationResult {
  const {
    activeSensor,
    displayMode = 'AUTO',
    sensorHealth = { radarOk: true, eoirOk: true, rfOk: true },
    mode = 'TRAIN',
  } = context;

  // 1. Force RADAR symbols if display mode is explicitly RADAR
  if (displayMode === 'RADAR') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: 'Display mode set to RADAR SYMBOLS',
    };
  }

  // 2. Active sensor is RADAR or RF (Task 17.3 §6: AIRFRAME preference cannot override RADAR or RF!)
  if (activeSensor === 'RADAR' || activeSensor === 'RF') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: `Active sensor is ${activeSensor}`,
    };
  }

  // 3. Sensor Health Check for EO/IR (Task 17.3 §7, Task 17.4 §1)
  const eoirHealth = getEoirHealth(sensorHealth);
  if (activeSensor === 'EOIR' && eoirHealth === 'OUT') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'SENSOR_OFFLINE',
      opticalConfidence: 0,
      reason: 'EO/IR sensor offline (OUT)',
    };
  }

  // 4. Line-of-sight & terrain masking check
  // Optical sensors cannot see through buildings or terrain! (Task 17.3 §8)
  if (track.masked) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'MASKED',
      opticalConfidence: 0,
      reason: 'Contact masked by terrain or structure',
    };
  }

  // In EVAL mode, prevent omniscient truth override (Rule F5 & Task 17.3 §6)
  if (mode === 'EVAL' && displayMode === 'AIRFRAME' && activeSensor !== 'EOIR') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: 'EVAL mode locks physical airframe view without active EO/IR',
    };
  }

  // 5. Approved Sensor Observation Dispatch (Task 17.3 §3, §4, Task 17.4 §1, §2)
  if (!track.sensorObservation) {
    // Both null and undefined observations must produce a safe unresolved presentation (Task 17.4 §2)
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0,
      reason: 'No approved optical sensor observation available',
    };
  }

  const obs = track.sensorObservation;
  const signature = obs.signature ?? obs.observedSignature ?? 'UNRESOLVED_AIRFRAME';
  const resolution = obs.resolutionLevel ?? obs.resolution ?? 'UNRESOLVED';
  const obsHealth = obs.sensorHealth ?? (obs.sensorAvailability ? 'OK' : 'OUT');
  const sensorOk = eoirHealth !== 'OUT' && obsHealth !== 'OUT' && obs.sensorAvailability !== false;
  const rangeM = obs.estimatedRangeM ?? 0;
  const confidence = Math.max(0, Math.min(1.0, obs.confidence));

  if (!sensorOk) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'SENSOR_OFFLINE',
      opticalConfidence: 0,
      reason: 'EO/IR sensor offline in observation',
    };
  }
  if (obs.visibilityState === 'MASKED') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'MASKED',
      opticalConfidence: 0,
      reason: 'Contact masked by terrain or structure',
    };
  }

  // Degraded sensor health or degraded observation produces UNKNOWN_AIRFRAME, not SENSOR_OFFLINE (Task 17.4 §1)
  if (eoirHealth === 'DEG' || obsHealth === 'DEG' || resolution === 'DEGRADED') {
    return {
      presentationCategory: 'UNKNOWN_AIRFRAME',
      isVisuallyResolved: false,
      observationState: 'DEGRADED_OPTICAL',
      opticalConfidence: confidence,
      reason: eoirHealth === 'DEG' || obsHealth === 'DEG'
        ? 'EO/IR sensor degraded (DEG)'
        : `Sensor observation degraded by ${obs.visibilityState} (${Math.round(rangeM)}m)`,
    };
  }

  if (resolution === 'FULL') {
    const category = mapSignatureToCategory(signature);
    return {
      presentationCategory: category,
      isVisuallyResolved: true,
      observationState: 'CLEAR_OPTICAL',
      opticalConfidence: confidence,
      reason: `Sensor observation resolved signature ${signature} (${Math.round(rangeM)}m)`,
    };
  }

  return {
    presentationCategory: 'RADAR_SYMBOL',
    isVisuallyResolved: false,
    observationState: 'OUT_OF_RANGE',
    opticalConfidence: confidence,
    reason: `Contact at ${Math.round(rangeM)}m exceeds sensor optical resolution`,
  };
}

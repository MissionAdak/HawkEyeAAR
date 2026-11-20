import type { SafeTrackView, TargetDisplayMode, ObservedAirframeSignature } from '../types';
import type { SensorMode, DroneType } from '@/sim/types';
import type { TargetModelCategory } from './targetModelTypes';
import type { WeatherType } from '../environment/types';

export interface SensorObservationContext {
  activeSensor: SensorMode;
  displayMode: TargetDisplayMode;
  sensorHealth?: { radarOk: boolean; eoirOk: boolean; rfOk: boolean };
  weather?: WeatherType;
  isNight?: boolean;
  mode?: 'TRAIN' | 'EVAL' | 'DEMO';
  sensorPos?: { x: number; y: number; z: number };
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
    weather = 'CLEAR',
    isNight = false,
    mode = 'TRAIN',
    sensorPos = { x: 0, y: 0, z: 0 },
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

  // 3. Sensor Health Check for EO/IR (Task 17.3 §7)
  if (activeSensor === 'EOIR' && !sensorHealth.eoirOk) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'SENSOR_OFFLINE',
      opticalConfidence: 0,
      reason: 'EO/IR sensor offline or degraded',
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

  // 5. Approved Sensor Observation Dispatch (Task 17.3 §3, §4)
  if (track.sensorObservation) {
    const obs = track.sensorObservation;
    const signature = obs.signature ?? obs.observedSignature ?? 'UNRESOLVED_AIRFRAME';
    const resolution = obs.resolutionLevel ?? obs.resolution ?? 'UNRESOLVED';
    const sensorOk = obs.sensorAvailability ?? obs.sensorHealthOk ?? true;
    const rangeM = obs.estimatedRangeM ?? 0;

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
    if (resolution === 'FULL') {
      const category = mapSignatureToCategory(signature);
      return {
        presentationCategory: category,
        isVisuallyResolved: true,
        observationState: 'CLEAR_OPTICAL',
        opticalConfidence: obs.confidence,
        reason: `Sensor observation resolved signature ${signature} (${Math.round(rangeM)}m)`,
      };
    }
    if (resolution === 'DEGRADED') {
      return {
        presentationCategory: 'UNKNOWN_AIRFRAME',
        isVisuallyResolved: false,
        observationState: 'DEGRADED_OPTICAL',
        opticalConfidence: obs.confidence,
        reason: `Sensor observation degraded by ${obs.visibilityState} (${Math.round(rangeM)}m)`,
      };
    }
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: obs.confidence,
      reason: `Contact at ${Math.round(rangeM)}m exceeds sensor optical resolution`,
    };
  }

  // If sensorObservation is explicitly null, sensor conditions forbade an observation
  if (track.sensorObservation === null) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0,
      reason: 'No approved optical sensor observation available',
    };
  }

  // 6. Fallback evaluation when sensorObservation is undefined (direct test fixtures)
  const dx = track.pos.x - sensorPos.x;
  const dy = track.pos.y - sensorPos.y;
  const dz = track.pos.z - sensorPos.z;
  const distM = Math.hypot(dx, dy, dz);

  // Atmospheric visibility factor
  let weatherFactor = 1.0;
  let weatherMaxFactor = 1.0;
  if (weather === 'FOG') {
    weatherFactor = 0.35; // Clear recognition drops to ~840m
    weatherMaxFactor = 0.48; // Visual detection drops to ~1824m
  } else if (weather === 'RAIN') {
    weatherFactor = 0.65;
    weatherMaxFactor = 0.75;
  }

  // Day/Night optical transmission factor
  const lightingFactor = isNight ? 0.60 : 1.0;

  const clearThreshold = CLEAR_OPTICAL_RANGE_M * weatherFactor * lightingFactor;
  const maxThreshold = MAX_OPTICAL_RANGE_M * weatherMaxFactor * (isNight ? 0.75 : 1.0);

  // Track quality factor
  if (track.q < 0.20) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0,
      reason: 'Track quality insufficient for visual tracking',
    };
  }

  // Distance threshold resolution
  if (distM > maxThreshold) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0.1,
      reason: `Contact at ${Math.round(distM)}m exceeds optical limit (${Math.round(maxThreshold)}m)`,
    };
  }

  if (distM > clearThreshold) {
    const opticalConfidence = Math.max(0.2, Math.min(0.65, 1.0 - (distM - clearThreshold) / (maxThreshold - clearThreshold)));
    return {
      presentationCategory: 'UNKNOWN_AIRFRAME',
      isVisuallyResolved: false,
      observationState: 'DEGRADED_OPTICAL',
      opticalConfidence,
      reason: `Partial visual observation at ${Math.round(distM)}m (clear limit ${Math.round(clearThreshold)}m)`,
    };
  }

  // Within clear optical recognition range
  const opticalConfidence = Math.max(0.7, Math.min(1.0, 1.0 - (distM / (clearThreshold * 1.5))));
  const category = mapSignatureToCategory((track as unknown as { observedAirframe?: string }).observedAirframe);

  return {
    presentationCategory: category,
    isVisuallyResolved: true,
    observationState: 'CLEAR_OPTICAL',
    opticalConfidence,
    reason: `Clear visual recognition at ${Math.round(distM)}m`,
  };
}

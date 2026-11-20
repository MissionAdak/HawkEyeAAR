import type { SafeTrackView, TargetDisplayMode } from '../types';
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
 * Optical range constants in clear daylight (metres).
 */
export const CLEAR_OPTICAL_RANGE_M = 2400;
export const MAX_OPTICAL_RANGE_M = 3800;

/**
 * Maps legitimate observable physical airframe type to procedural target model category.
 * Note: This maps physical aircraft geometry, NOT tactical threat intent (trueClass).
 */
export function mapAirframeToCategory(airframe?: DroneType): TargetModelCategory {
  switch (airframe) {
    case 'FPV_ATTACK':
      return 'HOSTILE_ATTACK';
    case 'RECON_QUAD':
      return 'HOSTILE_ISR';
    case 'SWARM_ELEMENT':
      return 'SWARM_ELEMENT';
    case 'LOITERING_MUNITION':
      return 'LOITERING_MUNITION';
    case 'CIVIL_UAS':
      return 'CIVIL_UAS';
    case 'FRIENDLY_UAS':
      return 'FRIENDLY';
    case 'BIRD':
      return 'BIRD';
    default:
      return 'UNKNOWN_AIRFRAME';
  }
}

/**
 * Resolves sensor-aware 3D target visual presentation (Task 17.2).
 *
 * Rules:
 * 1. RADAR mode / displayMode RADAR: produces RADAR_SYMBOL (high-contrast diamond reticle).
 * 2. EO/IR mode:
 *    - Masked tracks (terrain/buildings): strictly RADAR_SYMBOL / masked state. Never see-through.
 *    - In EVAL mode: omniscient truth view is impossible; observation strictly honors physics.
 *    - Within clear optical range (adjusted for fog/rain/night): resolves physical airframe.
 *    - Between clear range and max optical range (or degraded fog): resolves UNKNOWN_AIRFRAME.
 *    - Beyond max optical range or low track quality: resolves RADAR_SYMBOL.
 * 3. Operator classification (traineeLabel) does NOT alter physical airframe geometry.
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

  // 2. Active sensor is RADAR or RF in AUTO mode
  if (displayMode === 'AUTO' && (activeSensor === 'RADAR' || activeSensor === 'RF')) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: `Active sensor is ${activeSensor}`,
    };
  }

  // 3. Sensor Health Check for EO/IR
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
  // Optical sensors cannot see through buildings or terrain!
  if (track.masked) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'MASKED',
      opticalConfidence: 0,
      reason: 'Contact masked by terrain or structure',
    };
  }

  // In EVAL mode, prevent omniscient truth override (Rule F5 & §7)
  if (mode === 'EVAL' && displayMode === 'AIRFRAME' && activeSensor !== 'EOIR') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: 'EVAL mode locks physical airframe view without active EO/IR',
    };
  }

  // 5. Optical distance propagation & atmospheric attenuation
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

  // 6. Track quality factor
  if (track.q < 0.20) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0,
      reason: 'Track quality insufficient for visual tracking',
    };
  }

  // 7. Distance threshold resolution
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
    // Partially resolved: craft is visually confirmed, but specific airframe details unresolved
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
  const category = mapAirframeToCategory(track.observedAirframe);

  return {
    presentationCategory: category,
    isVisuallyResolved: true,
    observationState: 'CLEAR_OPTICAL',
    opticalConfidence,
    reason: `Clear visual recognition at ${Math.round(distM)}m`,
  };
}

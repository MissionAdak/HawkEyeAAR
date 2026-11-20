import type { SafeTrackView, TargetDisplayMode, ObservedAirframeSignature } from '../types';
import type { SensorMode, DroneType } from '@/sim/types';
import type { TargetModelCategory } from './targetModelTypes';
import type { WeatherType } from '../environment/types';
import type { ApprovedSensorObservation } from '../types';

export const VALID_SENSOR_HEALTH_STATES = ['OK', 'DEG', 'OUT'] as const;
export type SensorHealthState = (typeof VALID_SENSOR_HEALTH_STATES)[number];

export const VALID_SENSOR_MODES = ['RADAR', 'EOIR', 'RF'] as const;

export const VALID_OPTICAL_RESOLUTION_LEVELS = ['FULL', 'DEGRADED', 'UNRESOLVED'] as const;
export type OpticalResolutionLevel = (typeof VALID_OPTICAL_RESOLUTION_LEVELS)[number];

export const VALID_OPTICAL_VISIBILITY_STATES = [
  'CLEAR',
  'DEGRADED',
  'DEGRADED_FOG',
  'DEGRADED_RAIN',
  'DEGRADED_NIGHT_THERMAL',
  'MASKED',
  'OUT_OF_RANGE',
] as const;
export type OpticalVisibilityState = (typeof VALID_OPTICAL_VISIBILITY_STATES)[number];

export const VALID_OBSERVED_AIRFRAME_SIGNATURES = [
  'MULTIROTOR_COMPACT',
  'MULTIROTOR_WITH_CAMERA_POD',
  'MULTIROTOR_STANDARD',
  'FIXED_WING_DELTA',
  'BIRD_LIKE',
  'UNRESOLVED_AIRFRAME',
] as const;

/**
 * Authoritative Deterministic Simulation Timestamp Tolerances at 20 Hz (50 ms / tick):
 * - MAX_OBSERVATION_FUTURE_TOLERANCE_MS: 50 ms (max 1 simulation tick ahead permitted for sub-tick frame interpolation).
 * - MAX_OBSERVATION_AGE_MS: 1000 ms (20 simulation ticks / 1.0 second; observations older than 1.0s are stale).
 * - NOTIONAL TRAINING VISIBILITY PARAMETERS:
 *   1. Clear Daylight Nominal Optical Recognition Range: 2400 metres.
 *   2. Maximum Optical Detection Range: 3800 metres.
 *
 * CAUTION: These parameters are synthetic training heuristics for simulation education,
 * NOT physically calibrated military sensor specifications.
 */
export const MAX_OBSERVATION_FUTURE_TOLERANCE_MS = 50;
export const MAX_OBSERVATION_AGE_MS = 1000;
export const CLEAR_OPTICAL_RANGE_M = 2400;
export const MAX_OPTICAL_RANGE_M = 3800;

export interface SensorObservationContext {
  activeSensor: SensorMode;
  displayMode: TargetDisplayMode;
  currentSimMs: number;
  sensorHealth?: Record<SensorMode, SensorHealthState>;
  weather?: WeatherType;
  isNight?: boolean;
  mode?: 'TRAIN' | 'EVAL' | 'DEMO';
  sensorPos?: { x: number; y: number; z: number };
}

export type SensorHealthValidationResult =
  | { isValid: true; health: Record<SensorMode, SensorHealthState> }
  | { isValid: false; error: string };

/**
 * Validates sensor health record fail-closed (Task 17.5.1 Part B1).
 * Requires all sensor modes (RADAR, EOIR, RF) to be explicitly present and valid.
 * Does not silently convert missing or malformed values to 'OK'.
 */
export function validateSensorHealthRecord(raw: unknown): SensorHealthValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { isValid: false, error: 'Sensor health record is missing or not an object' };
  }
  const record = raw as Record<string, unknown>;
  for (const mode of VALID_SENSOR_MODES) {
    if (!(mode in record) || record[mode] === undefined || record[mode] === null) {
      return { isValid: false, error: `Missing sensor health key: ${mode}` };
    }
    const val = record[mode];
    if (typeof val !== 'string' || !VALID_SENSOR_HEALTH_STATES.includes(val as SensorHealthState)) {
      return { isValid: false, error: `Invalid sensor health state for ${mode}: ${String(val)}` };
    }
  }
  return {
    isValid: true,
    health: {
      RADAR: record.RADAR as SensorHealthState,
      EOIR: record.EOIR as SensorHealthState,
      RF: record.RF as SensorHealthState,
    },
  };
}

/**
 * Retrieves validated EOIR health state fail-closed.
 * Returns null if record is missing or malformed (never defaults to 'OK').
 */
export function getEoirHealth(
  health?: Record<SensorMode, SensorHealthState>
): SensorHealthState | null {
  if (!health) return null;
  const validation = validateSensorHealthRecord(health);
  if (!validation.isValid) return null;
  return validation.health.EOIR;
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

export type ObservationValidationResult =
  | { isValid: true; observation: ApprovedSensorObservation }
  | { isValid: false; error: string; fallbackState: ObservationState };

/**
 * Strictly validates the complete observation contract and timestamp provenance (Task 17.5.1 Part B2, B3).
 * Fails closed on any inconsistency, missing key, non-finite number, or contract violation.
 */
export function validateObservationProvenance(
  obs: unknown,
  context: SensorObservationContext
): ObservationValidationResult {
  if (!obs || typeof obs !== 'object' || Array.isArray(obs)) {
    return {
      isValid: false,
      error: 'Observation payload is missing or not an object',
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  const o = obs as Record<string, unknown>;

  // 1. Validate sensorSource
  if (o.sensorSource !== 'EOIR') {
    return {
      isValid: false,
      error: `Invalid observation sensorSource: ${String(o.sensorSource)} (must be EOIR)`,
      fallbackState: 'RADAR_TRACK',
    };
  }

  // 2. Validate activeSensor when present
  if ('activeSensor' in o && o.activeSensor !== undefined && o.activeSensor !== null) {
    if (o.activeSensor !== 'EOIR') {
      return {
        isValid: false,
        error: `Inconsistent activeSensor: ${String(o.activeSensor)} (must match EOIR)`,
        fallbackState: 'RADAR_TRACK',
      };
    }
  }

  // 3. Authoritative simulation timestamp check (Task 17.5.2)
  if (
    context.currentSimMs === undefined ||
    context.currentSimMs === null ||
    typeof context.currentSimMs !== 'number' ||
    !Number.isFinite(context.currentSimMs) ||
    context.currentSimMs < 0
  ) {
    return {
      isValid: false,
      error: `Simulation timestamp context missing or invalid: ${String(context.currentSimMs)}`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // Validate observation timestampMs
  if (
    o.timestampMs === undefined ||
    o.timestampMs === null ||
    typeof o.timestampMs !== 'number' ||
    !Number.isFinite(o.timestampMs)
  ) {
    return {
      isValid: false,
      error: `Invalid observation timestampMs: ${String(o.timestampMs)} (must be finite number)`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // Exact boundary semantics (Task 17.5.2 Part C):
  // observation timestamp <= currentSimMs + 50 -> ACCEPT
  // observation timestamp > currentSimMs + 50  -> REJECT
  if (o.timestampMs > context.currentSimMs + MAX_OBSERVATION_FUTURE_TOLERANCE_MS) {
    return {
      isValid: false,
      error: `Observation timestamp ${o.timestampMs}ms exceeds future tolerance (+${MAX_OBSERVATION_FUTURE_TOLERANCE_MS}ms) relative to sim ${context.currentSimMs}ms`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // observation timestamp >= currentSimMs - 1000 -> ACCEPT
  // observation timestamp < currentSimMs - 1000  -> REJECT
  if (o.timestampMs < context.currentSimMs - MAX_OBSERVATION_AGE_MS) {
    return {
      isValid: false,
      error: `Observation timestamp ${o.timestampMs}ms is stale (max age ${MAX_OBSERVATION_AGE_MS}ms) relative to sim ${context.currentSimMs}ms`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // 4. Validate confidence
  if (
    typeof o.confidence !== 'number' ||
    !Number.isFinite(o.confidence) ||
    o.confidence < 0 ||
    o.confidence > 1
  ) {
    return {
      isValid: false,
      error: `Invalid observation confidence: ${String(o.confidence)} (must be between 0.0 and 1.0)`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // 5. Validate sensorHealth within observation
  if (
    typeof o.sensorHealth !== 'string' ||
    !VALID_SENSOR_HEALTH_STATES.includes(o.sensorHealth as SensorHealthState)
  ) {
    return {
      isValid: false,
      error: `Invalid observation sensorHealth: ${String(o.sensorHealth)}`,
      fallbackState: 'SENSOR_OFFLINE',
    };
  }

  // 6. Validate sensorAvailability
  if (typeof o.sensorAvailability !== 'boolean') {
    return {
      isValid: false,
      error: `Invalid observation sensorAvailability: ${String(o.sensorAvailability)} (must be boolean)`,
      fallbackState: 'SENSOR_OFFLINE',
    };
  }

  // Inconsistency check between sensorHealth and sensorAvailability
  if (o.sensorHealth === 'OUT' && o.sensorAvailability === true) {
    return {
      isValid: false,
      error: 'Inconsistent observation: sensorHealth is OUT but sensorAvailability is true',
      fallbackState: 'SENSOR_OFFLINE',
    };
  }
  if (o.sensorHealth === 'OK' && o.sensorAvailability === false) {
    return {
      isValid: false,
      error: 'Inconsistent observation: sensorHealth is OK but sensorAvailability is false',
      fallbackState: 'SENSOR_OFFLINE',
    };
  }

  // 7. Validate signature
  const sig = (o.signature ?? o.observedSignature) as string;
  if (
    typeof sig !== 'string' ||
    !VALID_OBSERVED_AIRFRAME_SIGNATURES.includes(sig as ObservedAirframeSignature)
  ) {
    return {
      isValid: false,
      error: `Invalid observation airframe signature: ${String(sig)}`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }
  if (
    'observedSignature' in o &&
    o.observedSignature !== undefined &&
    o.signature !== undefined &&
    o.signature !== o.observedSignature
  ) {
    return {
      isValid: false,
      error: `Inconsistent observation signatures: signature '${String(o.signature)}' !== observedSignature '${String(o.observedSignature)}'`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // 8. Validate resolutionLevel and resolution
  const resLevel = o.resolutionLevel as string;
  const res = o.resolution as string;
  if (
    typeof resLevel !== 'string' ||
    !VALID_OPTICAL_RESOLUTION_LEVELS.includes(resLevel as OpticalResolutionLevel)
  ) {
    return {
      isValid: false,
      error: `Invalid observation resolutionLevel: ${String(resLevel)}`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }
  if (
    'resolution' in o &&
    o.resolution !== undefined &&
    (!VALID_OPTICAL_RESOLUTION_LEVELS.includes(res as OpticalResolutionLevel) || res !== resLevel)
  ) {
    return {
      isValid: false,
      error: `Inconsistent observation resolution fields: resolution '${String(res)}' !== resolutionLevel '${String(resLevel)}'`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // 9. Validate visibilityState
  const visState = o.visibilityState as string;
  if (
    typeof visState !== 'string' ||
    !VALID_OPTICAL_VISIBILITY_STATES.includes(visState as OpticalVisibilityState)
  ) {
    return {
      isValid: false,
      error: `Invalid observation visibilityState: ${String(visState)}`,
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  // 10. Field consistency checks:
  if (o.sensorHealth === 'OUT' && (resLevel === 'FULL' || resLevel === 'DEGRADED')) {
    return {
      isValid: false,
      error: `Inconsistent observation: sensorHealth OUT cannot produce resolution ${resLevel}`,
      fallbackState: 'SENSOR_OFFLINE',
    };
  }

  if (o.sensorHealth === 'DEG' && resLevel === 'FULL') {
    return {
      isValid: false,
      error: 'Inconsistent observation: sensorHealth DEG cannot produce resolution FULL',
      fallbackState: 'DEGRADED_OPTICAL',
    };
  }

  if (o.sensorAvailability === false && (resLevel === 'FULL' || visState === 'CLEAR')) {
    return {
      isValid: false,
      error: 'Inconsistent observation: unavailable sensor cannot produce CLEAR or FULL observation',
      fallbackState: 'SENSOR_OFFLINE',
    };
  }

  if (visState === 'MASKED' && resLevel !== 'UNRESOLVED') {
    return {
      isValid: false,
      error: 'Inconsistent observation: MASKED visibility cannot produce resolved resolution',
      fallbackState: 'MASKED',
    };
  }

  if (visState === 'OUT_OF_RANGE' && resLevel !== 'UNRESOLVED') {
    return {
      isValid: false,
      error: 'Inconsistent observation: OUT_OF_RANGE visibility cannot produce resolved resolution',
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  if (resLevel === 'FULL' && sig === 'UNRESOLVED_AIRFRAME') {
    return {
      isValid: false,
      error: 'Inconsistent observation: resolution FULL cannot have UNRESOLVED_AIRFRAME signature',
      fallbackState: 'OUT_OF_RANGE',
    };
  }

  if ('estimatedRangeM' in o && o.estimatedRangeM !== undefined && o.estimatedRangeM !== null) {
    if (typeof o.estimatedRangeM !== 'number' || !Number.isFinite(o.estimatedRangeM) || o.estimatedRangeM < 0) {
      return {
        isValid: false,
        error: `Invalid observation estimatedRangeM: ${String(o.estimatedRangeM)}`,
        fallbackState: 'OUT_OF_RANGE',
      };
    }
  }

  return {
    isValid: true,
    observation: o as unknown as ApprovedSensorObservation,
  };
}

/**
 * Maps legitimate observable physical airframe type to neutral procedural target model category (Task 17.5 §5).
 * Invariant: Physical appearance signatures represent observable physical airframe geometry ONLY.
 * They do NOT represent threat intent or tactical classification.
 */
export function mapSignatureToCategory(
  signature?: ObservedAirframeSignature | DroneType | string
): TargetModelCategory {
  switch (signature) {
    case 'MULTIROTOR_COMPACT':
    case 'FPV_ATTACK':
    case 'MULTIROTOR_WITH_CAMERA_POD':
    case 'RECON_QUAD':
    case 'SWARM_ELEMENT':
    case 'MULTIROTOR_STANDARD':
    case 'CIVIL_UAS':
    case 'FRIENDLY_UAS':
      return 'OBSERVED_MULTIROTOR';
    case 'FIXED_WING_DELTA':
    case 'LOITERING_MUNITION':
      return 'OBSERVED_FIXED_WING';
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
 * Resolves sensor-aware 3D target visual presentation (Task 17.2, Task 17.3, Task 17.5, Task 17.5.1).
 *
 * Rules:
 * 1. Context sensorHealth MUST be strictly validated (fail-closed: missing/invalid records fail to SENSOR_OFFLINE).
 * 2. RADAR mode / displayMode RADAR: strictly produces RADAR_SYMBOL (high-contrast diamond reticle).
 *    TGT:AIR preference CANNOT override RADAR selection.
 * 3. RF mode: strictly produces RADAR_SYMBOL. Optical models are forbidden in RF mode.
 * 4. EO/IR mode:
 *    - Sensor offline (sensorHealth.EOIR === 'OUT'): strictly RADAR_SYMBOL / SENSOR_OFFLINE.
 *    - Masked tracks (terrain/buildings): strictly RADAR_SYMBOL / MASKED state. Never see-through.
 *    - Approved sensor observation present:
 *      * Validated through strict provenance & consistency check.
 *      * resolution === 'FULL': maps observed signature to neutral physical model category.
 *      * resolution === 'DEGRADED': resolves UNKNOWN_AIRFRAME.
 *      * resolution === 'UNRESOLVED': resolves RADAR_SYMBOL.
 *    - If no observation is available: returns RADAR_SYMBOL.
 * 5. Operator classification (traineeLabel) does NOT alter physical airframe geometry.
 */
export function resolveTargetPresentation(
  track: SafeTrackView,
  context: SensorObservationContext
): TargetObservationResult {
  const {
    activeSensor,
    displayMode = 'AUTO',
    mode = 'TRAIN',
  } = context;

  // Validate authoritative simulation clock strictly (Fail-Closed: Task 17.5.2 Part B)
  if (
    context.currentSimMs === undefined ||
    context.currentSimMs === null ||
    typeof context.currentSimMs !== 'number' ||
    !Number.isFinite(context.currentSimMs) ||
    context.currentSimMs < 0
  ) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0,
      reason: `Simulation clock missing or invalid: ${String(context.currentSimMs)}`,
    };
  }

  // Validate context sensorHealth strictly (Fail-Closed: Task 17.5.1 Part B1)
  const healthValidation = validateSensorHealthRecord(context.sensorHealth);
  if (!healthValidation.isValid) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'SENSOR_OFFLINE',
      opticalConfidence: 0,
      reason: `Sensor health validation failed: ${healthValidation.error}`,
    };
  }
  const sensorHealth = healthValidation.health;

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

  // 2. Active sensor is RADAR or RF (AIRFRAME preference cannot override RADAR or RF!)
  if (activeSensor === 'RADAR' || activeSensor === 'RF') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: `Active sensor is ${activeSensor}`,
    };
  }

  // 3. Sensor Health Check for EO/IR
  if (activeSensor === 'EOIR' && sensorHealth.EOIR === 'OUT') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'SENSOR_OFFLINE',
      opticalConfidence: 0,
      reason: 'EO/IR sensor offline (OUT)',
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

  // In EVAL mode, prevent omniscient truth override
  if (mode === 'EVAL' && displayMode === 'AIRFRAME' && activeSensor !== 'EOIR') {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'RADAR_TRACK',
      opticalConfidence: 0,
      reason: 'EVAL mode locks physical airframe view without active EO/IR',
    };
  }

  // 5. Approved Sensor Observation Dispatch
  if (!track.sensorObservation) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: 'OUT_OF_RANGE',
      opticalConfidence: 0,
      reason: 'No approved optical sensor observation available',
    };
  }

  // Strict observation provenance & contract validation (Task 17.5.1 Part B2, B3)
  const obsValidation = validateObservationProvenance(track.sensorObservation, context);
  if (!obsValidation.isValid) {
    return {
      presentationCategory: 'RADAR_SYMBOL',
      isVisuallyResolved: false,
      observationState: obsValidation.fallbackState,
      opticalConfidence: 0,
      reason: `Observation validation failed: ${obsValidation.error}`,
    };
  }

  const obs = obsValidation.observation;
  const signature = obs.signature ?? obs.observedSignature ?? 'UNRESOLVED_AIRFRAME';
  const resolution = obs.resolutionLevel ?? obs.resolution ?? 'UNRESOLVED';
  const obsHealth = obs.sensorHealth;
  const sensorOk = sensorHealth.EOIR !== 'OUT' && obsHealth !== 'OUT' && obs.sensorAvailability !== false;
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

  // Degraded sensor health or degraded observation produces UNKNOWN_AIRFRAME, not SENSOR_OFFLINE
  if (sensorHealth.EOIR === 'DEG' || obsHealth === 'DEG' || resolution === 'DEGRADED') {
    return {
      presentationCategory: 'UNKNOWN_AIRFRAME',
      isVisuallyResolved: false,
      observationState: 'DEGRADED_OPTICAL',
      opticalConfidence: confidence,
      reason: sensorHealth.EOIR === 'DEG' || obsHealth === 'DEG'
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

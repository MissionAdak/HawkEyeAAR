import type { TrackEntity, SensorMode, DroneType } from './types';
import type {
  ApprovedSensorObservation,
  ObservedAirframeSignature,
  OpticalVisibilityState,
} from '@/render3d/types';
import type { WeatherType } from '@/render3d/environment/types';
import type { SensorHealthStatus } from './engine';

/**
 * NOTIONAL TRAINING ASSUMPTIONS & VISIBILITY PARAMETERS (Task 17.3 §4, §8):
 *
 * 1. Clear Daylight Nominal Optical Recognition Range: 2400 metres.
 *    Within this range, an unobstructed optical / thermal camera resolves fine airframe
 *    geometry (propellers, wings, chassis layout).
 *
 * 2. Maximum Optical Detection Range: 3800 metres.
 *    Beyond this range, an airborne vehicle subtends too few pixels to resolve
 *    its silhouette, returning to an unresolved blip.
 *
 * 3. Atmospheric Attenuation Factors:
 *    - FOG: optical transmission drops severely. Nominal recognition scale factor: 0.35x (~840m),
 *      maximum detection factor: 0.48x (~1824m).
 *    - RAIN: nominal recognition scale factor: 0.65x (~1560m), detection factor: 0.75x (~2850m).
 *    - NIGHT (Thermal MWIR / LWIR): 0.60x nominal clear optical range (~1440m).
 *
 * 4. Line-of-Sight Masking:
 *    When entity.masked is true (behind terrain, buildings, or ridge), optical line-of-sight
 *    is blocked; no physical airframe observation is generated.
 *
 * 5. Sensor Availability:
 *    - EO/IR 'OUT': sensor is offline/failed/destroyed. Zero optical observations generated.
 *    - EO/IR 'DEG': sensor optical lens is clouded or tracking jittered; produces degraded observations.
 *
 * CAUTION: These parameters are synthetic training heuristics for simulation education,
 * NOT physically calibrated military sensor specifications.
 */
export const NOMINAL_CLEAR_OPTICAL_RECOGNITION_M = 2400;
export const NOMINAL_MAX_OPTICAL_DETECTION_M = 3800;

export const VALID_PRODUCER_SENSOR_MODES: readonly SensorMode[] = ['RADAR', 'EOIR', 'RF'];
export const VALID_PRODUCER_HEALTH_STATES: readonly SensorHealthStatus[] = ['OK', 'DEG', 'OUT'];

export interface SensorObservationPipelineContext {
  activeSensor: SensorMode;
  sensorHealth: Record<SensorMode, SensorHealthStatus>;
  isNight?: boolean;
  weather?: WeatherType;
  currentSimMs: number;
  sensorPos?: { x: number; y: number; z: number };
}

/**
 * Validates sensor health record fail-closed at the producer boundary (Task 17.5.3 Fix B).
 * Rejects missing records, non-objects, arrays, missing modes (RADAR, EOIR, RF),
 * null/undefined values, and non-conforming state strings.
 * Never silently defaults missing keys to 'OK'.
 */
export function validateProducerSensorHealth(
  raw: unknown
): { isValid: true; health: Record<SensorMode, SensorHealthStatus> } | { isValid: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { isValid: false, error: 'Sensor health record is missing or not an object' };
  }
  const record = raw as Record<string, unknown>;
  for (const mode of VALID_PRODUCER_SENSOR_MODES) {
    if (!(mode in record) || record[mode] === undefined || record[mode] === null) {
      return { isValid: false, error: `Missing sensor health key: ${mode}` };
    }
    const val = record[mode];
    if (typeof val !== 'string' || !VALID_PRODUCER_HEALTH_STATES.includes(val as SensorHealthStatus)) {
      const valStr = typeof val === 'string' ? val : JSON.stringify(val);
      return { isValid: false, error: `Invalid sensor health state for ${mode}: ${valStr}` };
    }
  }
  return {
    isValid: true,
    health: {
      RADAR: record.RADAR as SensorHealthStatus,
      EOIR: record.EOIR as SensorHealthStatus,
      RF: record.RF as SensorHealthStatus,
    },
  };
}

/**
 * Validates simulation clock at the producer boundary (Task 17.5.3 Fix B).
 * Rejects missing, null, non-number, NaN, infinite, and negative timestamps (< 0).
 */
export function isValidProducerSimTime(simMs: unknown): simMs is number {
  return typeof simMs === 'number' && Number.isFinite(simMs) && simMs >= 0;
}

/**
 * Authoritatively maps simulation entity drone types to physical observable appearance signatures.
 * Invariant (Task 17.3 §3, §5):
 * Physical appearance signatures represent observable physical airframe geometry ONLY.
 * They do NOT represent threat intent or tactical classification.
 */
export function mapDroneTypeToAirframeSignature(droneType: DroneType): ObservedAirframeSignature {
  switch (droneType) {
    case 'FPV_ATTACK':
      return 'MULTIROTOR_COMPACT';
    case 'SWARM_ELEMENT':
      return 'MULTIROTOR_MICRO';
    case 'RECON_QUAD':
      return 'MULTIROTOR_WITH_CAMERA_POD';
    case 'CIVIL_UAS':
    case 'FRIENDLY_UAS':
      return 'MULTIROTOR_STANDARD';
    case 'LOITERING_MUNITION':
      return 'FIXED_WING_DELTA';
    case 'BIRD':
      return 'BIRD_LIKE';
    default:
      return 'UNRESOLVED_AIRFRAME';
  }
}

/**
 * Evaluates legitimate sensor observation for an entity (Task 17.3 §3, §4, Task 17.5.1, Task 17.5.3).
 * Returns an ApprovedSensorObservation if and only if sensor conditions permit observation.
 * Returns null when:
 *  - Simulation clock is missing, invalid, NaN, infinite, or negative (< 0)
 *  - Sensor health is missing, malformed, incomplete, or contains invalid states
 *  - Active sensor is not EO/IR (optical models forbidden in non-EO/IR modes)
 */
function computeOpticalThresholds(
  weather: string,
  isNight: boolean
): { clearThreshold: number; maxThreshold: number } {
  let weatherFactor = 1.0;
  let weatherMaxFactor = 1.0;
  if (weather === 'FOG') {
    weatherFactor = 0.35;
    weatherMaxFactor = 0.48;
  } else if (weather === 'RAIN') {
    weatherFactor = 0.65;
    weatherMaxFactor = 0.75;
  }

  const lightingFactor = isNight ? 0.60 : 1.0;
  const clearThreshold = NOMINAL_CLEAR_OPTICAL_RECOGNITION_M * weatherFactor * lightingFactor;
  const maxThreshold = NOMINAL_MAX_OPTICAL_DETECTION_M * weatherMaxFactor * (isNight ? 0.75 : 1.0);
  return { clearThreshold, maxThreshold };
}

function makeUnresolvedObservation(
  currentSimMs: number,
  eoirHealth: SensorHealthStatus,
  distM: number,
  visibilityState: OpticalVisibilityState,
  sensorAvailability = true,
  confidence = 0
): ApprovedSensorObservation {
  return {
    signature: 'UNRESOLVED_AIRFRAME',
    observedSignature: 'UNRESOLVED_AIRFRAME',
    timestampMs: currentSimMs,
    sensorSource: 'EOIR',
    activeSensor: 'EOIR',
    confidence,
    resolutionLevel: 'UNRESOLVED',
    resolution: 'UNRESOLVED',
    visibilityState,
    sensorAvailability,
    sensorHealth: eoirHealth,
    sensorHealthOk: eoirHealth === 'OK',
    estimatedRangeM: Math.round(distM),
  };
}

export function evaluateSensorObservation(
  entity: TrackEntity,
  context: SensorObservationPipelineContext
): ApprovedSensorObservation | null {
  if (!context) {
    return null;
  }

  const {
    activeSensor,
    sensorHealth,
    isNight = false,
    weather = 'CLEAR',
    currentSimMs,
    sensorPos = { x: 0, y: 0, z: 0 },
  } = context;

  // 1. Simulation clock validation at producer (Task 17.5.3 Fix B)
  if (!isValidProducerSimTime(currentSimMs)) {
    return null;
  }

  // 2. Sensor health validation at producer (Task 17.5.3 Fix B)
  const healthValidation = validateProducerSensorHealth(sensorHealth);
  if (!healthValidation.isValid) {
    return null;
  }
  const validatedHealth = healthValidation.health;

  // Rule §3, §6: Optical airframe observations are ONLY generated in EO/IR mode.
  // In RADAR or RF mode, no optical observation is approved.
  if (activeSensor !== 'EOIR') {
    return null;
  }

  const eoirHealth = validatedHealth.EOIR;

  // Rule §7: EO/IR offline prevents optical model presentation entirely.
  if (eoirHealth === 'OUT') {
    return makeUnresolvedObservation(currentSimMs, 'OUT', 0, 'OUT_OF_RANGE', false, 0);
  }

  // Rule §4, §8: Terrain/building line-of-sight masking strictly occludes optical vision.
  if (entity.masked) {
    const distM = Math.hypot(entity.pos.x - sensorPos.x, entity.pos.y - sensorPos.y, entity.pos.z - sensorPos.z);
    return makeUnresolvedObservation(currentSimMs, eoirHealth, distM, 'MASKED', true, 0);
  }

  // 3D Distance propagation from defensive sensor origin
  const dx = entity.pos.x - sensorPos.x;
  const dy = entity.pos.y - sensorPos.y;
  const dz = entity.pos.z - sensorPos.z;
  const distM = Math.hypot(dx, dy, dz);

  const { clearThreshold, maxThreshold } = computeOpticalThresholds(weather, isNight);

  // Severe track quality degradation (coasting/dropped return)
  if (entity.q < 0.20) {
    return makeUnresolvedObservation(currentSimMs, eoirHealth, distM, 'OUT_OF_RANGE', true, 0);
  }

  // Beyond maximum optical reach
  if (distM > maxThreshold) {
    return makeUnresolvedObservation(currentSimMs, eoirHealth, distM, 'OUT_OF_RANGE', true, 0.1);
  }

  // Intermediate distance or degraded sensor: partial visual recognition
  if (distM > clearThreshold || eoirHealth === 'DEG') {
    const rawConf = Math.max(
      0.2,
      Math.min(0.65, 1.0 - (distM - clearThreshold) / Math.max(1, maxThreshold - clearThreshold))
    );
    const confidence = eoirHealth === 'DEG' ? rawConf * 0.7 : rawConf;
    let degradedVisState: OpticalVisibilityState = 'DEGRADED';
    if (weather === 'FOG') {
      degradedVisState = 'DEGRADED_FOG';
    } else if (weather === 'RAIN') {
      degradedVisState = 'DEGRADED_RAIN';
    } else if (isNight) {
      degradedVisState = 'DEGRADED_NIGHT_THERMAL';
    }

    return {
      signature: 'UNRESOLVED_AIRFRAME',
      observedSignature: 'UNRESOLVED_AIRFRAME',
      timestampMs: currentSimMs,
      sensorSource: 'EOIR',
      activeSensor: 'EOIR',
      confidence: Math.max(0, Math.min(1.0, confidence)),
      resolutionLevel: 'DEGRADED',
      resolution: 'DEGRADED',
      visibilityState: degradedVisState,
      sensorAvailability: true,
      sensorHealth: eoirHealth,
      sensorHealthOk: false,
      estimatedRangeM: Math.round(distM),
    };
  }

  // Clear optical recognition: approved physical airframe observation
  const confidence = Math.max(0.7, Math.min(1.0, 1.0 - distM / (clearThreshold * 1.5)));
  const signature = mapDroneTypeToAirframeSignature(entity.droneType);

  return {
    signature,
    observedSignature: signature,
    timestampMs: currentSimMs,
    sensorSource: 'EOIR',
    activeSensor: 'EOIR',
    confidence: Math.max(0.7, Math.min(1.0, confidence)),
    resolutionLevel: 'FULL',
    resolution: 'FULL',
    visibilityState: 'CLEAR',
    sensorAvailability: true,
    sensorHealth: 'OK',
    sensorHealthOk: true,
    estimatedRangeM: Math.round(distM),
  };
}

import type { TrackEntity } from './types';
import type { SensorHealthStatus } from './engine';
import {
  NOTIONAL_SENSOR_PARAMS,
  type RadarMeasurement,
  type EoirMeasurement,
  type RfMeasurement,
} from './measurementTypes';
import { keyedGaussian } from './rng';
import {
  evaluateSensorObservation,
  type SensorObservationPipelineContext,
} from './sensorObservation';

/**
 * ============================================================================
 * NOTIONAL TRAINING PARAMETERS — NOT CALIBRATED REAL SENSOR PERFORMANCE
 * ============================================================================
 *
 * Deterministic synthetic sensor measurement generator.
 * Operates purely on simulation ticks (never on rendering animation frames).
 * Strictly seeded and repeatable via keyed PRNG draws.
 */

/**
 * Generates a deterministic radar plot measurement for an entity detected during a radar sweep.
 */
export function generateRadarMeasurement(params: {
  entity: TrackEntity;
  entityIndex: number;
  sweepIdx: number;
  timestampMs: number;
  scenarioSeed: number;
  sensorHealth: SensorHealthStatus;
  snrDb?: number;
}): RadarMeasurement | null {
  const {
    entity,
    entityIndex,
    sweepIdx,
    timestampMs,
    scenarioSeed,
    sensorHealth,
    snrDb = 12.0,
  } = params;

  if (sensorHealth === 'OUT' || !entity.trackNo) {
    return null;
  }

  const isDegraded = sensorHealth === 'DEG';
  const rangeSigma = isDegraded
    ? NOTIONAL_SENSOR_PARAMS.RADAR.rangeSigmaM_DEG
    : NOTIONAL_SENSOR_PARAMS.RADAR.rangeSigmaM_OK;
  const azimuthSigma = isDegraded
    ? NOTIONAL_SENSOR_PARAMS.RADAR.azimuthSigmaDeg_DEG
    : NOTIONAL_SENSOR_PARAMS.RADAR.azimuthSigmaDeg_OK;

  const trueRange = Math.hypot(entity.pos.x, entity.pos.y);
  const trueAzRad = Math.atan2(entity.pos.x, entity.pos.y);
  let trueAzDeg = (trueAzRad * 180) / Math.PI;
  if (trueAzDeg < 0) trueAzDeg += 360;

  // Stateless keyed noise draws
  const rangeNoise =
    keyedGaussian(scenarioSeed, 'meas_radar_rng', entityIndex, sweepIdx) * rangeSigma;
  const azimuthNoise =
    keyedGaussian(scenarioSeed, 'meas_radar_az', entityIndex, sweepIdx) * azimuthSigma;

  const measuredRangeM = Math.max(1, trueRange + rangeNoise);
  const measuredAzimuthDeg = ((trueAzDeg + azimuthNoise) % 360 + 360) % 360;

  // Total 2D Cartesian position uncertainty combining radial range and cross-range azimuth dispersion
  const azRadSigma = (azimuthSigma * Math.PI) / 180;
  const crossRangeSigma = measuredRangeM * azRadSigma;
  const positionUncertaintyM = Number(Math.hypot(rangeSigma, crossRangeSigma).toFixed(1));

  return {
    sensorType: 'RADAR',
    trackNo: entity.trackNo,
    entityId: entity.id,
    timestampMs,
    measuredRangeM: Number(measuredRangeM.toFixed(1)),
    measuredAzimuthDeg: Number(measuredAzimuthDeg.toFixed(2)),
    rangeUncertaintyM: rangeSigma,
    azimuthUncertaintyDeg: azimuthSigma,
    positionUncertaintyM,
    snrDb,
    sensorHealth,
  };
}

/**
 * Generates a deterministic EO/IR optical observation measurement.
 */
export function generateEoirMeasurement(params: {
  entity: TrackEntity;
  entityIndex: number;
  tickIndex: number;
  timestampMs: number;
  scenarioSeed: number;
  context: SensorObservationPipelineContext;
}): EoirMeasurement | null {
  const { entity, entityIndex, tickIndex, timestampMs, scenarioSeed, context } = params;

  const eoirHealth = context.sensorHealth.EOIR;
  if (eoirHealth === 'OUT' || !entity.trackNo) {
    return null;
  }

  const observation = evaluateSensorObservation(entity, context);
  if (!observation) {
    return null;
  }

  const sensorPos = context.sensorPos ?? { x: 0, y: 0, z: 0 };
  const dx = entity.pos.x - sensorPos.x;
  const dy = entity.pos.y - sensorPos.y;
  const dz = entity.pos.z - sensorPos.z;
  const trueDist = Math.hypot(dx, dy, dz);
  const trueAzRad = Math.atan2(dx, dy);
  let trueAzDeg = (trueAzRad * 180) / Math.PI;
  if (trueAzDeg < 0) trueAzDeg += 360;

  const trueElevRad = Math.atan2(dz, Math.hypot(dx, dy));
  const trueElevDeg = (trueElevRad * 180) / Math.PI;

  const azNoise =
    keyedGaussian(scenarioSeed, 'meas_eoir_az', entityIndex, tickIndex) *
    NOTIONAL_SENSOR_PARAMS.EOIR.azimuthSigmaDeg;
  const elNoise =
    keyedGaussian(scenarioSeed, 'meas_eoir_el', entityIndex, tickIndex) *
    NOTIONAL_SENSOR_PARAMS.EOIR.elevationSigmaDeg;

  const measuredAzimuthDeg = ((trueAzDeg + azNoise) % 360 + 360) % 360;
  const measuredElevationDeg = trueElevDeg + elNoise;

  const isDegraded = eoirHealth === 'DEG';
  const rangeSigma = isDegraded
    ? NOTIONAL_SENSOR_PARAMS.EOIR.rangeSigmaM_DEG
    : NOTIONAL_SENSOR_PARAMS.EOIR.rangeSigmaM_OK;

  let measuredRangeM: number | undefined;
  if (observation.visibilityState !== 'OUT_OF_RANGE') {
    const rangeNoise =
      keyedGaussian(scenarioSeed, 'meas_eoir_rng', entityIndex, tickIndex) * rangeSigma;
    measuredRangeM = Math.max(1, trueDist + rangeNoise);
  }

  return {
    sensorType: 'EOIR',
    trackNo: entity.trackNo,
    entityId: entity.id,
    timestampMs,
    measuredAzimuthDeg: Number(measuredAzimuthDeg.toFixed(2)),
    measuredElevationDeg: Number(measuredElevationDeg.toFixed(2)),
    measuredRangeM: measuredRangeM ? Number(measuredRangeM.toFixed(1)) : undefined,
    azimuthUncertaintyDeg: NOTIONAL_SENSOR_PARAMS.EOIR.azimuthSigmaDeg,
    elevationUncertaintyDeg: NOTIONAL_SENSOR_PARAMS.EOIR.elevationSigmaDeg,
    rangeUncertaintyM: rangeSigma,
    observation,
    sensorHealth: eoirHealth,
  };
}

/**
 * Generates a deterministic RF direction-finding line-of-bearing measurement.
 * Purely bearing-only; does not fabricate range or 3D coordinate.
 */
export function generateRfMeasurement(params: {
  entity: TrackEntity;
  entityIndex: number;
  timestampMs: number;
  scenarioSeed: number;
  sensorHealth: SensorHealthStatus;
  isJamming: boolean;
}): RfMeasurement | null {
  const { entity, entityIndex, timestampMs, scenarioSeed, sensorHealth, isJamming } = params;

  if (sensorHealth === 'OUT' || isJamming || !entity.emitsRf) {
    return null;
  }

  const trueAzRad = Math.atan2(entity.pos.x, entity.pos.y);
  let trueAzDeg = (trueAzRad * 180) / Math.PI;
  if (trueAzDeg < 0) trueAzDeg += 360;

  // 4 Hz scan rate key
  const scanStep4Hz = Math.floor(timestampMs / 250);
  const brgNoise =
    keyedGaussian(scenarioSeed, 'meas_rf_brg', entityIndex, scanStep4Hz) *
    NOTIONAL_SENSOR_PARAMS.RF.bearingSigmaDeg;

  const measuredBearingDeg = ((trueAzDeg + brgNoise) % 360 + 360) % 360;

  // Synthetic frequency allocation based on generic link type
  let freqMhz = 2440;
  if (entity.remoteId) {
    freqMhz = 2412;
  } else if (entity.droneType === 'LOITERING_MUNITION') {
    freqMhz = 433;
  } else if (entity.droneType === 'SWARM_ELEMENT') {
    freqMhz = 915;
  } else if (entity.droneType === 'FPV_ATTACK') {
    freqMhz = 5800;
  }

  const distM = Math.hypot(entity.pos.x, entity.pos.y);
  const signalStrengthDb = Math.max(-100, Math.min(-30, -35 - 20 * Math.log10(Math.max(50, distM) / 100)));

  return {
    sensorType: 'RF',
    trackNo: entity.trackNo ?? undefined,
    entityId: entity.id,
    timestampMs,
    measuredBearingDeg: Number(measuredBearingDeg.toFixed(1)),
    bearingUncertaintyDeg: NOTIONAL_SENSOR_PARAMS.RF.bearingSigmaDeg,
    freqMhz,
    signalStrengthDb: Number(signalStrengthDb.toFixed(1)),
    sensorHealth,
  };
}

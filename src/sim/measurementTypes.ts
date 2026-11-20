import type { SensorHealthStatus } from './engine';
import type { ApprovedSensorObservation } from '@/render3d/types';

/**
 * ============================================================================
 * NOTIONAL TRAINING PARAMETERS — NOT CALIBRATED REAL SENSOR PERFORMANCE
 * ============================================================================
 *
 * All measurement errors, sensor uncertainties, and filter parameters defined
 * herein are synthetic, simplified training heuristics designed solely for
 * deterministic operator training simulation. They DO NOT represent real-world
 * sensor calibrations, hardware tolerances, or military specifications.
 */
export const NOTIONAL_SENSOR_PARAMS = {
  RADAR: {
    // 1-sigma range measurement error (metres)
    rangeSigmaM_OK: 15.0,
    rangeSigmaM_DEG: 35.0,
    // 1-sigma azimuth measurement error (degrees)
    azimuthSigmaDeg_OK: 0.8,
    azimuthSigmaDeg_DEG: 2.0,
  },
  EOIR: {
    // 1-sigma line-of-sight angular resolution (degrees)
    azimuthSigmaDeg: 0.15,
    elevationSigmaDeg: 0.15,
    // Optical laser rangefinder 1-sigma uncertainty (metres)
    rangeSigmaM_OK: 8.0,
    rangeSigmaM_DEG: 30.0,
  },
  RF: {
    // 1-sigma direction-finding line-of-bearing uncertainty (degrees)
    bearingSigmaDeg: 4.5,
  },
  TRACKER: {
    // Alpha-Beta smoothing coefficients
    alpha: 0.65,
    beta: 0.30,
    // Initial position uncertainty when track is established (metres)
    initSigmaM: 18.0,
    // Coasting uncertainty linear growth rate (metres / second)
    coastingGrowthRateMps: 8.0,
    // Maximum innovation gate multiplier (N-sigma outlier rejection)
    gateThresholdSigma: 5.0,
    // Stale measurement threshold (milliseconds)
    staleTimeoutMs: 6000,
  },
} as const;

/**
 * Explicit Sensor Measurement Contracts (Task 18 §2.B).
 *
 * Strict Security Guard (Rules R3.3, R10.3 & Task 18 §2.B):
 * Sensor measurements represent what simulated sensors legitimately observed.
 * They MUST NEVER contain raw simulation ground truth:
 * - NO trueClass
 * - NO droneType
 * - NO valueInr
 * - NO rcsM2
 * - NO exact ground truth coordinates or velocities
 * - NO planned future waypoints
 * - NO killDraw
 */

export interface RadarMeasurement {
  sensorType: 'RADAR';
  trackNo: string;
  entityId: string;
  timestampMs: number;
  measuredRangeM: number;
  measuredAzimuthDeg: number;
  measuredElevationDeg?: number;
  rangeUncertaintyM: number;
  azimuthUncertaintyDeg: number;
  snrDb: number;
  sensorHealth: SensorHealthStatus;
}

export interface EoirMeasurement {
  sensorType: 'EOIR';
  trackNo: string;
  entityId: string;
  timestampMs: number;
  measuredAzimuthDeg: number;
  measuredElevationDeg: number;
  measuredRangeM?: number;
  azimuthUncertaintyDeg: number;
  elevationUncertaintyDeg: number;
  rangeUncertaintyM?: number;
  observation: ApprovedSensorObservation;
  sensorHealth: SensorHealthStatus;
}

export interface RfMeasurement {
  sensorType: 'RF';
  trackNo?: string;
  entityId?: string;
  timestampMs: number;
  measuredBearingDeg: number;
  bearingUncertaintyDeg: number;
  freqMhz: number;
  signalStrengthDb: number;
  sensorHealth: SensorHealthStatus;
}

export type SensorMeasurement = RadarMeasurement | EoirMeasurement | RfMeasurement;

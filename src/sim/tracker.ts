import type { TrackClass, F2T2EAStep } from './types';
import type { ApprovedSensorObservation } from './sensorObservation';
import {
  NOTIONAL_SENSOR_PARAMS,
  type RadarMeasurement,
  type EoirMeasurement,
  type RfMeasurement,
} from './measurementTypes';
import type { TrackEstimate, OperatorTrackView, AltitudeBand } from './trackerTypes';

export function computeAltBand(altM: number): AltitudeBand {
  if (altM < 40) return 'VLOW';
  if (altM < 150) return 'LOW';
  if (altM < 400) return 'MED';
  return 'HIGH';
}

/**
 * Deterministic Alpha-Beta Track Estimator (Task 18 §5).
 *
 * Maintains estimated positions, velocities, uncertainties, and coasting states
 * purely driven by incoming sensor measurements during simulation ticks.
 * Never accesses raw simulation ground truth.
 */
export class TrackEstimator {
  private readonly estimates: Map<string, TrackEstimate> = new Map();

  public clear(): void {
    this.estimates.clear();
  }

  public removeTrack(trackNo: string): void {
    this.estimates.delete(trackNo);
  }

  /**
   * Advances track position predictions during each 20 Hz simulation step (dt = 0.05s).
   * Grows uncertainty during coasting when no fresh measurements are received.
   */
  public predict(simTimeMs: number, dtSec: number = 0.05): void {
    const sweepTimeoutMs = 2200; // slightly longer than 2000ms radar sweep period

    for (const est of this.estimates.values()) {
      if (est.lifecycle !== 'ACTIVE' && est.lifecycle !== 'LEAKED') {
        continue;
      }

      // 1. Save previous estimate for interpolation
      est.prevEstPos = { ...est.estPos };

      // 2. Kinematic state prediction: x_pred = x + v * dt
      est.estPos.x += est.estVel.x * dtSec;
      est.estPos.y += est.estVel.y * dtSec;
      est.estPos.z += est.estVel.z * dtSec;

      // 3. Check coasting condition
      const timeSinceLastMeas = simTimeMs - est.lastMeasurementMs;
      if (timeSinceLastMeas > sweepTimeoutMs) {
        if (!est.isCoasting) {
          est.isCoasting = true;
          est.coastingSinceMs = simTimeMs;
        }

        est.uncertaintyM = Math.min(
          300,
          est.uncertaintyM + NOTIONAL_SENSOR_PARAMS.TRACKER.coastingGrowthRateMps * dtSec
        );
      }

      // 4. Update derived polar quantities from current estimate
      const rangeM = Math.hypot(est.estPos.x, est.estPos.y);
      const brgRad = Math.atan2(est.estPos.x, est.estPos.y);
      let brgDeg = Math.round((brgRad * 180) / Math.PI);
      if (brgDeg < 0) brgDeg += 360;

      est.estRangeM = Number(rangeM.toFixed(1));
      est.estBearingDeg = brgDeg;
      est.estSpeedMps = Math.round(Math.hypot(est.estVel.x, est.estVel.y));
      est.estAltBand = computeAltBand(est.estPos.z);
    }
  }

  /**
   * Updates track estimate with a newly generated radar measurement.
   */
  public updateWithRadar(meas: RadarMeasurement, defaultAltitudeM: number = 60.0): void {
    const azRad = (meas.measuredAzimuthDeg * Math.PI) / 180;
    const measX = meas.measuredRangeM * Math.sin(azRad);
    const measY = meas.measuredRangeM * Math.cos(azRad);
    const measZ = defaultAltitudeM;

    const existing = this.estimates.get(meas.trackNo);

    const posUncertainty = meas.positionUncertaintyM ?? meas.rangeUncertaintyM;

    if (!existing) {
      // Initialize new estimate with assumed nominal altitude and total 2D position uncertainty
      const initEst: TrackEstimate = {
        trackNo: meas.trackNo,
        entityId: meas.entityId,
        estPos: { x: Number(measX.toFixed(1)), y: Number(measY.toFixed(1)), z: measZ },
        estVel: { x: 0, y: 0, z: 0 },
        prevEstPos: { x: Number(measX.toFixed(1)), y: Number(measY.toFixed(1)), z: measZ },
        estRangeM: meas.measuredRangeM,
        estBearingDeg: Math.round(meas.measuredAzimuthDeg),
        estSpeedMps: 0,
        estAltBand: computeAltBand(measZ),
        uncertaintyM: posUncertainty,
        isCoasting: false,
        coastingSinceMs: null,
        lastMeasurementMs: meas.timestampMs,
        lastSensorType: 'RADAR',
        sensorSources: ['RADAR'],
        q: 0.8,
        cCls: 0.5,
        traineeLabel: null,
        step: 'FIND',
        lifecycle: 'ACTIVE',
        sensorObservation: null,
      };
      this.estimates.set(meas.trackNo, initEst);
      return;
    }

    // Existing track: innovation and gating
    const rx = measX - existing.estPos.x;
    const ry = measY - existing.estPos.y;
    const residualDist = Math.hypot(rx, ry);

    const gateThreshold =
      NOTIONAL_SENSOR_PARAMS.TRACKER.gateThresholdSigma * existing.uncertaintyM;
    const isCoastingRecovered = existing.isCoasting;

    // Gate check: accept measurement if within gate or recovering from coasting
    if (residualDist <= gateThreshold || isCoastingRecovered) {
      const dtSec = Math.max(0.05, (meas.timestampMs - existing.lastMeasurementMs) / 1000);
      const alpha = NOTIONAL_SENSOR_PARAMS.TRACKER.alpha;
      const beta = NOTIONAL_SENSOR_PARAMS.TRACKER.beta;

      existing.estPos.x += alpha * rx;
      existing.estPos.y += alpha * ry;

      if (dtSec > 0 && dtSec < 10) {
        existing.estVel.x += (beta / dtSec) * rx;
        existing.estVel.y += (beta / dtSec) * ry;
      }

      existing.uncertaintyM = posUncertainty;
      existing.isCoasting = false;
      existing.coastingSinceMs = null;
      existing.lastMeasurementMs = meas.timestampMs;
      existing.lastSensorType = 'RADAR';

      if (!existing.sensorSources.includes('RADAR')) {
        existing.sensorSources.push('RADAR');
      }

      // Recompute derived values
      const rangeM = Math.hypot(existing.estPos.x, existing.estPos.y);
      const brgRad = Math.atan2(existing.estPos.x, existing.estPos.y);
      let brgDeg = Math.round((brgRad * 180) / Math.PI);
      if (brgDeg < 0) brgDeg += 360;

      existing.estRangeM = Number(rangeM.toFixed(1));
      existing.estBearingDeg = brgDeg;
      existing.estSpeedMps = Math.round(Math.hypot(existing.estVel.x, existing.estVel.y));
    }
  }

  /**
   * Updates track estimate with an approved EO/IR optical observation.
   */
  public updateWithEoir(meas: EoirMeasurement): void {
    const existing = this.estimates.get(meas.trackNo);
    if (!existing) return;

    existing.sensorObservation = meas.observation;
    if (!existing.sensorSources.includes('EOIR')) {
      existing.sensorSources.push('EOIR');
    }

    // If optical range was measured, refine position
    if (meas.measuredRangeM !== undefined && meas.measuredRangeM > 0) {
      const azRad = (meas.measuredAzimuthDeg * Math.PI) / 180;
      const elRad = (meas.measuredElevationDeg * Math.PI) / 180;
      const groundDist = meas.measuredRangeM * Math.cos(elRad);
      const measX = groundDist * Math.sin(azRad);
      const measY = groundDist * Math.cos(azRad);
      const measZ = meas.measuredRangeM * Math.sin(elRad);

      const rx = measX - existing.estPos.x;
      const ry = measY - existing.estPos.y;
      const rz = measZ - existing.estPos.z;

      const alpha = 0.5; // optical smooth
      existing.estPos.x += alpha * rx;
      existing.estPos.y += alpha * ry;
      if (Math.abs(rz) < 100) {
        existing.estPos.z += alpha * rz;
      }

      if (meas.rangeUncertaintyM) {
        existing.uncertaintyM = Math.min(existing.uncertaintyM, meas.rangeUncertaintyM);
      }
      existing.isCoasting = false;
      existing.coastingSinceMs = null;
      existing.lastMeasurementMs = meas.timestampMs;
      existing.lastSensorType = 'EOIR';
    }
  }

  /**
   * Records RF detection / bearing cue on this track.
   * RF provides bearing-only angle-of-arrival information.
   * It associates with the track if matched, updating sensor sources
   * without fabricating false Cartesian position or range.
   */
  public updateWithRf(meas: RfMeasurement): void {
    if (!meas.trackNo) return;
    const existing = this.estimates.get(meas.trackNo);
    if (existing && !existing.sensorSources.includes('RF')) {
      existing.sensorSources.push('RF');
    }
  }

  /**
   * Synchronizes operational status (quality, classification, F2T2EA step, lifecycle)
   * into the estimated track state without leaking raw true values.
   */
  public syncTrackStatus(
    trackNo: string,
    status: {
      q?: number;
      cCls?: number;
      traineeLabel?: TrackClass | null;
      step?: F2T2EAStep;
      lifecycle?: 'ACTIVE' | 'LEAKED' | 'NEUTRALISED';
      sensorObservation?: ApprovedSensorObservation | null;
    }
  ): void {
    const existing = this.estimates.get(trackNo);
    if (!existing) return;

    if (status.q !== undefined) existing.q = status.q;
    if (status.cCls !== undefined) existing.cCls = status.cCls;
    if (status.traineeLabel !== undefined) existing.traineeLabel = status.traineeLabel;
    if (status.step !== undefined) existing.step = status.step;
    if (status.lifecycle !== undefined) existing.lifecycle = status.lifecycle;
    if (status.sensorObservation !== undefined) existing.sensorObservation = status.sensorObservation;
  }

  public getTrackEstimate(trackNo: string): TrackEstimate | undefined {
    return this.estimates.get(trackNo);
  }

  public getAllEstimates(): TrackEstimate[] {
    return Array.from(this.estimates.values());
  }

  /**
   * Produces a clean, whitelisted OperatorTrackView[] projection.
   * Guarantees zero leakage of simulation ground truth.
   */
  public getOperatorTracks(): OperatorTrackView[] {
    const out: OperatorTrackView[] = [];

    for (const e of this.estimates.values()) {
      if (e.step === 'UNDETECTED') continue;
      if (e.lifecycle !== 'ACTIVE' && e.lifecycle !== 'LEAKED' && e.lifecycle !== 'NEUTRALISED') {
        continue;
      }

      out.push({
        trackNo: e.trackNo,
        estPos: { x: Number(e.estPos.x.toFixed(1)), y: Number(e.estPos.y.toFixed(1)), z: Number(e.estPos.z.toFixed(1)) },
        estVel: { x: Number(e.estVel.x.toFixed(1)), y: Number(e.estVel.y.toFixed(1)), z: Number(e.estVel.z.toFixed(1)) },
        prevEstPos: { x: Number(e.prevEstPos.x.toFixed(1)), y: Number(e.prevEstPos.y.toFixed(1)), z: Number(e.prevEstPos.z.toFixed(1)) },
        estRangeM: e.estRangeM,
        estBearingDeg: e.estBearingDeg,
        estSpeedMps: e.estSpeedMps,
        estAltBand: e.estAltBand,
        uncertaintyM: Number(e.uncertaintyM.toFixed(1)),
        isCoasting: e.isCoasting,
        coastingSinceMs: e.coastingSinceMs,
        lastMeasurementMs: e.lastMeasurementMs,
        sensorSources: [...e.sensorSources],
        q: Number(e.q.toFixed(2)),
        cCls: Number(e.cCls.toFixed(2)),
        traineeLabel: e.traineeLabel,
        step: e.step,
        lifecycle: e.lifecycle,
        sensorObservation: e.sensorObservation ?? null,
      });
    }

    return out;
  }
}

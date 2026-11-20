import { describe, it, expect } from 'vitest';
import { TrackEstimator } from '@/sim/tracker';
import type { RadarMeasurement, EoirMeasurement, RfMeasurement } from '@/sim/measurementTypes';

function mockRadarMeas(
  overrides: Partial<RadarMeasurement> & { trackNo: string; entityId: string; timestampMs: number }
): RadarMeasurement {
  return {
    sensorType: 'RADAR',
    measuredRangeM: 2000.0,
    measuredAzimuthDeg: 90.0,
    rangeUncertaintyM: 35.0,
    azimuthUncertaintyDeg: 0.8,
    snrDb: 12.0,
    sensorHealth: 'OK',
    ...overrides,
  };
}

describe('TASK 18 — TrackEstimator & OperatorTrackView Decoupling', () => {
  it('initializes a new track estimate from a radar measurement', () => {
    const tracker = new TrackEstimator();
    const radarMeas = mockRadarMeas({
      trackNo: 'T-01',
      entityId: 'E-01',
      timestampMs: 1000,
      measuredRangeM: 2000.0,
      measuredAzimuthDeg: 90.0,
      rangeUncertaintyM: 35.0,
    });

    tracker.updateWithRadar(radarMeas, 60.0);
    const est = tracker.getTrackEstimate('T-01');

    expect(est).toBeDefined();
    expect(est?.trackNo).toBe('T-01');
    expect(est?.estRangeM).toBe(2000.0);
    expect(est?.estBearingDeg).toBe(90);
    // 90 deg azimuth -> x = 2000 * sin(90) = 2000, y = 2000 * cos(90) = 0
    expect(est?.estPos.x).toBeCloseTo(2000.0, 1);
    expect(est?.estPos.y).toBeCloseTo(0.0, 1);
    expect(est?.estPos.z).toBe(60.0);
    expect(est?.isCoasting).toBe(false);
    expect(est?.uncertaintyM).toBe(35.0);
    expect(est?.sensorSources).toContain('RADAR');
  });

  it('applies Alpha-Beta filter innovation on consecutive measurements to estimate velocity', () => {
    const tracker = new TrackEstimator();

    // Measurement 1 at t=1000s: at range 2000m, az 90 deg (pos: 2000, 0)
    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 2000.0,
        measuredAzimuthDeg: 90.0,
      })
    );

    // Advance 1 second in 0.05s increments
    for (let t = 1050; t <= 2000; t += 50) {
      tracker.predict(t, 0.05);
    }

    // Measurement 2 at t=2000ms: target moved inward to range 1950m, az 90 deg (pos: 1950, 0)
    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 2000,
        measuredRangeM: 1950.0,
        measuredAzimuthDeg: 90.0,
      })
    );

    const est = tracker.getTrackEstimate('T-01');
    expect(est).toBeDefined();
    // Residual rx = 1950 - 2000 = -50m over dt = 1.0s
    // Velocity innovation: vx += (beta / dt) * rx
    expect(est?.estVel.x).toBeLessThan(0);
    expect(est?.estSpeedMps).toBeGreaterThan(0);
    expect(est?.estPos.x).toBeLessThan(2000.0);
  });

  it('grows uncertainty and enters coasting when radar measurements cease', () => {
    const tracker = new TrackEstimator();

    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 1500.0,
        measuredAzimuthDeg: 45.0,
        rangeUncertaintyM: 35.0,
      })
    );

    // Advance past sweep timeout (> 2200ms without new measurement)
    for (let t = 1050; t <= 4000; t += 50) {
      tracker.predict(t, 0.05);
    }

    const est = tracker.getTrackEstimate('T-01');
    expect(est).toBeDefined();
    expect(est?.isCoasting).toBe(true);
    expect(est?.coastingSinceMs).toBeDefined();
    // Uncertainty grows beyond the initial 35m
    expect(est?.uncertaintyM).toBeGreaterThan(35.0);
  });

  it('resets coasting and reduces uncertainty when reacquired', () => {
    const tracker = new TrackEstimator();

    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 1500.0,
        measuredAzimuthDeg: 0.0,
        rangeUncertaintyM: 35.0,
      })
    );

    // Coast for 3 seconds
    for (let t = 1050; t <= 4500; t += 50) {
      tracker.predict(t, 0.05);
    }

    expect(tracker.getTrackEstimate('T-01')?.isCoasting).toBe(true);

    // Reacquired with new measurement at t=4500
    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 4500,
        measuredRangeM: 1400.0,
        measuredAzimuthDeg: 0.0,
        rangeUncertaintyM: 35.0,
      })
    );

    const est = tracker.getTrackEstimate('T-01');
    expect(est?.isCoasting).toBe(false);
    expect(est?.coastingSinceMs).toBeNull();
    expect(est?.uncertaintyM).toBe(35.0);
  });

  it('rejects measurements outside gate threshold', () => {
    const tracker = new TrackEstimator();

    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 1000.0,
        measuredAzimuthDeg: 0.0, // pos: (0, 1000)
        rangeUncertaintyM: 35.0,
      })
    );

    // Spurious outlier measurement far away at (5000, 5000)
    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1100,
        measuredRangeM: 7000.0,
        measuredAzimuthDeg: 45.0,
        rangeUncertaintyM: 35.0,
      })
    );

    const est = tracker.getTrackEstimate('T-01');
    // Position should stay close to (0, 1000), NOT jump to outlier
    expect(est?.estPos.x).toBeCloseTo(0, 0);
    expect(est?.estPos.y).toBeCloseTo(1000, 0);
  });

  it('getOperatorTracks produces strictly whitelisted view without ground truth properties', () => {
    const tracker = new TrackEstimator();

    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 1200.0,
        measuredAzimuthDeg: 180.0,
        rangeUncertaintyM: 35.0,
      })
    );

    tracker.syncTrackStatus('T-01', {
      q: 0.85,
      cCls: 0.6,
      traineeLabel: 'HOSTILE_ATTACK',
      step: 'FIND',
      lifecycle: 'ACTIVE',
    });

    const opTracks = tracker.getOperatorTracks();
    expect(opTracks).toHaveLength(1);
    const row = opTracks[0];

    // Allowed fields
    expect(row.trackNo).toBe('T-01');
    expect(row.estPos).toBeDefined();
    expect(row.estVel).toBeDefined();
    expect(row.estRangeM).toBe(1200.0);
    expect(row.estBearingDeg).toBe(180);
    expect(row.q).toBe(0.85);

    // Strictly prohibited fields (Domain A ground truth)
    const prohibited = [
      'truePos',
      'trueVelocity',
      'pos',
      'vel',
      'droneType',
      'trueClass',
      'rcsM2',
      'valueInr',
      'emitsRf',
      'remoteId',
      'iff',
      'spawnTMs',
      'profile',
      'waypoints',
    ];

    for (const key of prohibited) {
      expect(row).not.toHaveProperty(key);
    }
  });

  it('integrates EO/IR optical line-of-bearing and laser range measurements', () => {
    const tracker = new TrackEstimator();

    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 1500.0,
        measuredAzimuthDeg: 90.0,
        rangeUncertaintyM: 35.0,
      })
    );

    const eoirMeas: EoirMeasurement = {
      sensorType: 'EOIR',
      trackNo: 'T-01',
      entityId: 'E-01',
      timestampMs: 1050,
      measuredAzimuthDeg: 90.5,
      measuredElevationDeg: 2.3,
      measuredRangeM: 1495.0,
      azimuthUncertaintyDeg: 0.15,
      elevationUncertaintyDeg: 0.15,
      rangeUncertaintyM: 15.0,
      sensorHealth: 'OK',
      observation: {
        signature: 'FIXED_WING_DELTA',
        confidence: 0.9,
        timestampMs: 1050,
        sensorSource: 'EOIR',
        resolutionLevel: 'FULL',
        visibilityState: 'CLEAR',
        sensorAvailability: true,
        sensorHealth: 'OK',
      },
    };

    tracker.updateWithEoir(eoirMeas);
    const est = tracker.getTrackEstimate('T-01');

    expect(est?.sensorSources).toContain('EOIR');
    expect(est?.sensorObservation?.signature).toBe('FIXED_WING_DELTA');
    expect(est?.uncertaintyM).toBeLessThanOrEqual(15.0);
  });

  it('records RF bearing detections', () => {
    const tracker = new TrackEstimator();

    tracker.updateWithRadar(
      mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 1500.0,
        measuredAzimuthDeg: 90.0,
        rangeUncertaintyM: 35.0,
      })
    );

    const rfMeas: RfMeasurement = {
      sensorType: 'RF',
      trackNo: 'T-01',
      entityId: 'E-01',
      timestampMs: 1050,
      measuredBearingDeg: 89.2,
      bearingUncertaintyDeg: 5.0,
      freqMhz: 2450,
      signalStrengthDb: -65,
      sensorHealth: 'OK',
    };

    tracker.updateWithRf(rfMeas);
    const est = tracker.getTrackEstimate('T-01');
    expect(est?.sensorSources).toContain('RF');
  });
});

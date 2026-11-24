import { describe, it, expect } from 'vitest';
import { TrackEstimator } from '@/sim/tracker';
import type { RadarMeasurement, EoirMeasurement, RfMeasurement } from '@/sim/measurementTypes';
import { generateRadarMeasurement } from '@/sim/sensorMeasurement';

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
    expect(typeof est?.coastingSinceMs).toBe('number');
    expect(Number.isFinite(est?.coastingSinceMs)).toBe(true);
    expect(est!.coastingSinceMs!).toBeGreaterThanOrEqual(1000);
    expect(est!.coastingSinceMs!).toBeLessThanOrEqual(4000);
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

  describe('TASK 18-06 Integrity & Truth Boundary Hardening', () => {
    it('strictly isolates estimated altitude from ground-truth entity pos.z on radar updates', () => {
      const tracker = new TrackEstimator();

      // Entity has arbitrary ground truth altitude
      const meas = mockRadarMeas({
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1000,
        measuredRangeM: 2000.0,
        measuredAzimuthDeg: 45.0,
      });

      // Update radar without ground truth altitude
      tracker.updateWithRadar(meas);
      const est = tracker.getTrackEstimate('T-01');
      expect(est).toBeDefined();

      // Track estimate must use assumed nominal operator altitude (60.0m), NOT ground truth
      expect(est?.estPos.z).toBe(60.0);
    });

    it('enforces that RF updates are strictly bearing-only and never alter Cartesian position or range', () => {
      const tracker = new TrackEstimator();
      tracker.updateWithRadar(
        mockRadarMeas({
          trackNo: 'T-01',
          entityId: 'E-01',
          timestampMs: 1000,
          measuredRangeM: 1500.0,
          measuredAzimuthDeg: 90.0,
        })
      );

      const before = tracker.getTrackEstimate('T-01')!;
      const beforePos = { ...before.estPos };
      const beforeRange = before.estRangeM;

      const rfMeas: RfMeasurement = {
        sensorType: 'RF',
        trackNo: 'T-01',
        entityId: 'E-01',
        timestampMs: 1100,
        measuredBearingDeg: 180.0, // completely different bearing
        bearingUncertaintyDeg: 5.0,
        freqMhz: 5800,
        signalStrengthDb: -60,
        sensorHealth: 'OK',
      };

      tracker.updateWithRf(rfMeas);
      const after = tracker.getTrackEstimate('T-01')!;

      // Cartesian position and range must remain untouched
      expect(after.estPos.x).toBe(beforePos.x);
      expect(after.estPos.y).toBe(beforePos.y);
      expect(after.estPos.z).toBe(beforePos.z);
      expect(after.estRangeM).toBe(beforeRange);
      expect(after.sensorSources).toContain('RF');
    });

    it('radar outage fail-closed: setting sensorHealth.RADAR to OUT returns null measurement and forces coasting', () => {
      const dummyEntity: import('@/sim/types').TrackEntity = {
        id: 'ent-99',
        trackNo: 'T-99',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 1000, y: 1000, z: 50 },
        prev: { x: 990, y: 1000, z: 50 },
        vel: { x: 10, y: 0, z: 0 },
        rcsM2: 0.05,
        valueInr: 100000,
        emitsRf: false,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: null,
        step: 'TRACK',
        q: 0.8,
        cCls: 0,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true],
        tVis: 0,
        tTrk: 100,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      };

      // When RADAR is OUT, generateRadarMeasurement MUST return null
      const measOut = generateRadarMeasurement({
        entity: dummyEntity,
        entityIndex: 0,
        sweepIdx: 1,
        timestampMs: 1000,
        scenarioSeed: 42,
        sensorHealth: 'OUT',
      });
      expect(measOut).toBeNull();

      // Tracker coasting test
      const tracker = new TrackEstimator();
      const measOk = generateRadarMeasurement({
        entity: dummyEntity,
        entityIndex: 0,
        sweepIdx: 1,
        timestampMs: 1000,
        scenarioSeed: 42,
        sensorHealth: 'OK',
      })!;
      tracker.updateWithRadar(measOk);

      const initEst = tracker.getTrackEstimate('T-99')!;
      expect(initEst.isCoasting).toBe(false);
      const initUncert = initEst.uncertaintyM;

      // Advance clock without radar measurement past stale timeout (2200ms)
      tracker.predict(8000);
      const coastEst = tracker.getTrackEstimate('T-99')!;
      expect(coastEst.isCoasting).toBe(true);
      expect(coastEst.uncertaintyM).toBeGreaterThan(initUncert);
    });

    it('calculates total 2D Cartesian position uncertainty in radar measurements', () => {

      const dummyEntity: import('@/sim/types').TrackEntity = {
        id: 'ent-01',
        trackNo: 'T-01',
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        pos: { x: 3000, y: 0, z: 50 },
        prev: { x: 2990, y: 0, z: 50 },
        vel: { x: 10, y: 0, z: 0 },
        rcsM2: 0.05,
        valueInr: 100000,
        emitsRf: false,
        remoteId: false,
        iff: false,
        profile: 'DIRECT',
        spawnTMs: 0,
        lifecycle: 'ACTIVE',
        traineeLabel: null,
        step: 'TRACK',
        q: 0.8,
        cCls: 0,
        masked: false,
        coastingSinceMs: null,
        ghostSigmaM: 0,
        hitHistory: [true],
        tVis: 0,
        tTrk: 100,
        tDesig: null,
        tCls: null,
        tEng: null,
        tPnr: null,
        engagements: 0,
        weaponUsed: null,
      };

      const meas = generateRadarMeasurement({
        entity: dummyEntity,
        entityIndex: 0,
        sweepIdx: 1,
        timestampMs: 1000,
        scenarioSeed: 42,
        sensorHealth: 'OK',
      })!;

      expect(meas.positionUncertaintyM).toBeDefined();
      // At 3000m, rangeSigma is 15m, cross-range sigma is 3000 * (0.8 * PI / 180) ~= 41.9m
      // Total position uncertainty hypot(15, 41.9) ~= 44.5m
      expect(meas.positionUncertaintyM).toBeGreaterThan(35.0);
    });
  });
});

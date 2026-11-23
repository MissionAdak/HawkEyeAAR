import { describe, it, expect } from 'vitest';
import {
  generateRadarMeasurement,
  generateEoirMeasurement,
  generateRfMeasurement,
} from '@/sim/sensorMeasurement';
import { NOTIONAL_SENSOR_PARAMS } from '@/sim/measurementTypes';
import type { TrackEntity } from '@/sim/types';

function createMockEntity(overrides?: Partial<TrackEntity>): TrackEntity {
  return {
    id: 'E-TEST-01',
    trackNo: 'T-01',
    trueClass: 'HOSTILE_ATTACK',
    droneType: 'FPV_ATTACK',
    pos: { x: 1000, y: 1000, z: 60 },
    prev: { x: 990, y: 990, z: 60 },
    vel: { x: 10, y: 10, z: 0 },
    rcsM2: 0.01,
    valueInr: 100000,
    emitsRf: true,
    remoteId: false,
    iff: false,
    profile: 'DIRECT',
    spawnTMs: 0,
    lifecycle: 'ACTIVE',
    traineeLabel: null,
    step: 'FIND',
    q: 0.8,
    cCls: 0.5,
    masked: false,
    coastingSinceMs: null,
    ghostSigmaM: 0,
    hitHistory: [true, true, true],
    tVis: 0,
    tTrk: 0,
    tDesig: null,
    tCls: null,
    tEng: null,
    tPnr: null,
    engagements: 0,
    weaponUsed: null,
    ...overrides,
  };
}

describe('TASK 18 — Deterministic Sensor Measurements & Noise Bounds', () => {
  it('generates identical radar measurements for identical seeds and time ticks (reproducibility)', () => {
    const entity = createMockEntity();

    const m1 = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 5,
      timestampMs: 10000,
      scenarioSeed: 42,
      sensorHealth: 'OK',
    });

    const m2 = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 5,
      timestampMs: 10000,
      scenarioSeed: 42,
      sensorHealth: 'OK',
    });

    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    expect(m1).toEqual(m2);
  });

  it('generates different measurements for different seeds (seed orthogonality)', () => {
    const entity = createMockEntity();

    const m1 = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 5,
      timestampMs: 10000,
      scenarioSeed: 42,
      sensorHealth: 'OK',
    });

    const m2 = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 5,
      timestampMs: 10000,
      scenarioSeed: 9999,
      sensorHealth: 'OK',
    });

    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    // With different seeds, measured values will not be identical
    expect(m1?.measuredRangeM !== m2?.measuredRangeM || m1?.measuredAzimuthDeg !== m2?.measuredAzimuthDeg).toBe(true);
  });

  it('radar measurement noise adheres to [-3.5σ, 3.5σ] bounds across 100 sweeps', () => {
    const entity = createMockEntity();
    const trueRange = Math.hypot(entity.pos.x, entity.pos.y);
    const sigma = NOTIONAL_SENSOR_PARAMS.RADAR.rangeSigmaM_OK;
    const maxBound = 3.5 * sigma;

    for (let sweep = 0; sweep < 100; sweep++) {
      const m = generateRadarMeasurement({
        entity,
        entityIndex: 0,
        sweepIdx: sweep,
        timestampMs: sweep * 2000,
        scenarioSeed: 12345,
        sensorHealth: 'OK',
      });

      expect(m).not.toBeNull();
      const diff = Math.abs(m!.measuredRangeM - trueRange);
      expect(diff).toBeLessThanOrEqual(maxBound + 1.0); // 1.0m tolerance for rounding
    }
  });

  it('radar sensor health OUT returns null (fail-closed)', () => {
    const entity = createMockEntity();
    const m = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 1,
      timestampMs: 2000,
      scenarioSeed: 42,
      sensorHealth: 'OUT',
    });

    expect(m).toBeNull();
  });

  it('radar sensor health DEG produces larger uncertainty than OK', () => {
    const entity = createMockEntity();

    const mOk = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 1,
      timestampMs: 2000,
      scenarioSeed: 42,
      sensorHealth: 'OK',
    });

    const mDeg = generateRadarMeasurement({
      entity,
      entityIndex: 0,
      sweepIdx: 1,
      timestampMs: 2000,
      scenarioSeed: 42,
      sensorHealth: 'DEG',
    });

    expect(mOk).not.toBeNull();
    expect(mDeg).not.toBeNull();
    expect(mDeg!.rangeUncertaintyM).toBeGreaterThan(mOk!.rangeUncertaintyM);
  });

  it('EO/IR sensor health OUT returns null (fail-closed)', () => {
    const entity = createMockEntity();
    const m = generateEoirMeasurement({
      entity,
      entityIndex: 0,
      tickIndex: 10,
      timestampMs: 500,
      scenarioSeed: 42,
      context: {
        activeSensor: 'EOIR',
        sensorHealth: { RADAR: 'OK', EOIR: 'OUT', RF: 'OK' },
        isNight: false,
        currentSimMs: 500,
      },
    });

    expect(m).toBeNull();
  });

  it('RF sensor health OUT (jamming) returns null (fail-closed)', () => {
    const entity = createMockEntity({ emitsRf: true });
    const m = generateRfMeasurement({
      entity,
      entityIndex: 0,
      timestampMs: 500,
      scenarioSeed: 42,
      sensorHealth: 'OUT',
      isJamming: false,
    });

    expect(m).toBeNull();
  });

  it('RF measurement contains bearing and RF characteristics, but strictly zero range or 3D position', () => {
    const entity = createMockEntity({ emitsRf: true });
    const m = generateRfMeasurement({
      entity,
      entityIndex: 0,
      timestampMs: 500,
      scenarioSeed: 42,
      sensorHealth: 'OK',
      isJamming: false,
    });

    expect(m).not.toBeNull();
    expect(m?.sensorType).toBe('RF');
    expect(m?.measuredBearingDeg).toBeDefined();
    expect(m?.freqMhz).toBeDefined();
    expect(m?.signalStrengthDb).toBeDefined();

    // Pure angle-of-arrival sensor: strictly no range or Cartesian coordinates
    expect(m).not.toHaveProperty('range');
    expect(m).not.toHaveProperty('rangeM');
    expect(m).not.toHaveProperty('measuredRangeM');
    expect(m).not.toHaveProperty('pos');
    expect(m).not.toHaveProperty('x');
    expect(m).not.toHaveProperty('y');
    expect(m).not.toHaveProperty('z');
  });

  it('non-emitting target produces no RF measurement', () => {
    const entity = createMockEntity({ emitsRf: false });
    const m = generateRfMeasurement({
      entity,
      entityIndex: 0,
      timestampMs: 500,
      scenarioSeed: 42,
      sensorHealth: 'OK',
      isJamming: false,
    });

    expect(m).toBeNull();
  });
});

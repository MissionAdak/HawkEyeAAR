import { describe, it, expect } from 'vitest';
import { aggregateAARMetrics } from '@/sim/metrics';
import type { SimEvent } from '@/sim/types';

describe('AAR Metrics Aggregation (TASK-P3-03)', () => {
  it('correctly aggregates timing latencies, classification metrics, and confusion matrix from raw event log', () => {
    const mockEvents: SimEvent[] = [
      {
        seq: 1,
        tMs: 0,
        type: 'SIM_START',
        payload: { mode: 'TRAIN', scenarioId: 'TEST-01' },
      },
      // Target 1: Hostile Attack (H-1 / T-01)
      {
        seq: 2,
        tMs: 1000,
        type: 'SPAWN',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK', valueInr: 100000 },
      },
      {
        seq: 3,
        tMs: 2000,
        type: 'TRACK_INIT',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: {},
      },
      {
        seq: 4,
        tMs: 3000,
        type: 'DESIGNATE',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { via: 'KEY' },
      },
      {
        seq: 5,
        tMs: 4000,
        type: 'CLASSIFY',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { label: 'HOSTILE_ATTACK' },
      },
      {
        seq: 6,
        tMs: 5000,
        type: 'ENGAGE',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { effector: 'RF_SOFTKILL', rangeM: 1200, cer: 0.001 },
      },
      {
        seq: 7,
        tMs: 5050,
        type: 'ENGAGE_RESULT',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { killed: true, pk: 0.8, u: 0.2 },
      },
      {
        seq: 8,
        tMs: 6000,
        type: 'ASSESS',
        trackNo: 'T-01',
        entityId: 'H-1',
        payload: { result: 'KILL' },
      },

      // Target 2: Hostile ISR (H-2 / T-02) - leaker
      {
        seq: 9,
        tMs: 1500,
        type: 'SPAWN',
        trackNo: 'T-02',
        entityId: 'H-2',
        payload: { trueClass: 'HOSTILE_ISR', droneType: 'RECON_QUAD', valueInr: 40000 },
      },
      {
        seq: 10,
        tMs: 2500,
        type: 'TRACK_INIT',
        trackNo: 'T-02',
        entityId: 'H-2',
        payload: {},
      },
      {
        seq: 11,
        tMs: 4500,
        type: 'DESIGNATE',
        trackNo: 'T-02',
        entityId: 'H-2',
        payload: { via: 'KEY' },
      },
      {
        seq: 12,
        tMs: 5500,
        type: 'CLASSIFY',
        trackNo: 'T-02',
        entityId: 'H-2',
        payload: { label: 'HOSTILE_ISR' },
      },
      {
        seq: 13,
        tMs: 8000,
        type: 'LEAK',
        trackNo: 'T-02',
        entityId: 'H-2',
        payload: {},
      },

      // Target 3: Civil UAS (C-1 / T-03)
      {
        seq: 14,
        tMs: 2000,
        type: 'SPAWN',
        trackNo: 'T-03',
        entityId: 'C-1',
        payload: { trueClass: 'CIVIL_UAS', droneType: 'CIVIL_UAS', valueInr: null },
      },
      {
        seq: 15,
        tMs: 3000,
        type: 'TRACK_INIT',
        trackNo: 'T-03',
        entityId: 'C-1',
        payload: {},
      },
      {
        seq: 16,
        tMs: 4000,
        type: 'CLASSIFY',
        trackNo: 'T-03',
        entityId: 'C-1',
        payload: { label: 'CIVIL_UAS' },
      },

      {
        seq: 17,
        tMs: 10000,
        type: 'SESSION_END',
        payload: {},
      },
    ];

    const metrics = aggregateAARMetrics(mockEvents);

    // Latency validations
    // T-01: tTrk = 2000, tDesig = 3000, tCls = 4000, tEng = 5000
    // MET = 5000 - 2000 = 3000ms
    expect(metrics.metMs).toBe(3000);
    // S2S = 5000 - 3000 = 2000ms
    expect(metrics.s2sMs).toBe(2000);
    // MDT: T-01 is 1000ms (3000-2000), T-02 is 2000ms (4500-2500) -> Mean = 1500ms
    expect(metrics.mdtMs).toBe(1500);
    // MCT: T-01 is 1000ms (4000-3000), T-02 is 1000ms (5500-4500) -> Mean = 1000ms
    expect(metrics.mctMs).toBe(1000);

    // Classification Accuracy: 3 correct out of 3 = 100% (1.0)
    expect(metrics.clsAccuracy).toBe(1.0);
    expect(metrics.clsCoverage).toBe(1.0);
    expect(metrics.hostileRecall).toBe(1.0);
    expect(metrics.hostilePrecision).toBe(1.0);

    // Confusion Matrix: 6 Ground-Truth Rows x 8 Prediction Columns (7 classes + NONE)
    expect(metrics.confusion).toHaveLength(6);
    expect(metrics.confusion[0]).toHaveLength(8);
    // Row 0 is HOSTILE_ATTACK (T-01 classified as HOSTILE_ATTACK -> col 1)
    expect(metrics.confusion[0][1]).toBe(1);
    // Row 1 is HOSTILE_ISR (T-02 classified as HOSTILE_ISR -> col 2)
    expect(metrics.confusion[1][2]).toBe(1);
    // Row 3 is CIVIL_UAS (T-03 classified as CIVIL_UAS -> col 4)
    expect(metrics.confusion[3][4]).toBe(1);

    // Leakers: H-2 leaked (1 leaker out of 2 hostiles = 0.5)
    expect(metrics.leakers).toBe(1);
    expect(metrics.leakRate).toBe(0.5);

    // Score and grade exist and in [0, 100]
    expect(metrics.score).toBeGreaterThanOrEqual(0);
    expect(metrics.score).toBeLessThanOrEqual(100);
    expect(['PROFICIENT_IN_SIMULATION', 'DEVELOPING', 'NEEDS_RETRAINING']).toContain(metrics.grade);
  });

  describe('Sensor Adaptation Latency (SAL) Calculation', () => {
    it('calculates SAL when trainee switches sensor following chaos onset', () => {
      const chaosEvents: SimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: { mode: 'TRAIN' },
        },
        {
          seq: 2,
          tMs: 5000,
          type: 'SENSOR_SWITCH',
          payload: { mode: 'EOIR' }, // Active sensor is now EO/IR
        },
        {
          seq: 3,
          tMs: 10000,
          type: 'CHAOS_ON',
          payload: { type: 'FOG', affectedSensors: ['EOIR'] }, // Degrades EO/IR at 10,000ms
        },
        {
          seq: 4,
          tMs: 12500,
          type: 'SENSOR_SWITCH',
          payload: { mode: 'RF' }, // Trainee switches to RF at 12,500ms (2500ms latency)
        },
        {
          seq: 5,
          tMs: 25000,
          type: 'CHAOS_OFF',
          payload: { type: 'FOG' },
        },
        {
          seq: 6,
          tMs: 30000,
          type: 'SESSION_END',
          payload: {},
        },
      ];

      const metrics = aggregateAARMetrics(chaosEvents);
      expect(metrics.salMs).toBe(2500);
      expect(metrics.salScore).toBeGreaterThan(0);
    });

    it('uses event duration fallback when trainee never switches during chaos', () => {
      const chaosEvents: SimEvent[] = [
        {
          seq: 1,
          tMs: 0,
          type: 'SIM_START',
          payload: { mode: 'TRAIN' },
        },
        {
          seq: 2,
          tMs: 5000,
          type: 'SENSOR_SWITCH',
          payload: { mode: 'EOIR' },
        },
        {
          seq: 3,
          tMs: 10000,
          type: 'CHAOS_ON',
          payload: { type: 'FOG' },
        },
        // Trainee never switches!
        {
          seq: 4,
          tMs: 24000,
          type: 'CHAOS_OFF',
          payload: { type: 'FOG' }, // Duration = 14,000ms
        },
        {
          seq: 5,
          tMs: 30000,
          type: 'SESSION_END',
          payload: {},
        },
      ];

      const metrics = aggregateAARMetrics(chaosEvents);
      expect(metrics.salMs).toBe(14000);
      // SAL > 6000ms -> salScore is 0
      expect(metrics.salScore).toBe(0);
    });
  });

  describe('Confusion Matrix Semantic Distinction: UNKNOWN vs NONE (D-01, D-33)', () => {
    it('maps explicit UNKNOWN_EVIDENCE_INSUFFICIENT to column 0 with partial credit, and uncommitted label to column 7 (NONE) with zero credit', () => {
      const events: SimEvent[] = [
        { seq: 1, tMs: 0, type: 'SIM_START', payload: { mode: 'EVAL', scenarioId: 'EVAL-01' } },
        // Track 1: HOSTILE_ATTACK explicitly classified as UNKNOWN_EVIDENCE_INSUFFICIENT
        {
          seq: 2,
          tMs: 1000,
          type: 'SPAWN',
          trackNo: 'T-01',
          entityId: 'H-01',
          payload: { trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK', valueInr: 100000 },
        },
        { seq: 3, tMs: 2000, type: 'TRACK_INIT', trackNo: 'T-01', entityId: 'H-01', payload: {} },
        { seq: 4, tMs: 3000, type: 'DESIGNATE', trackNo: 'T-01', entityId: 'H-01', payload: { via: 'KEY' } },
        {
          seq: 5,
          tMs: 4000,
          type: 'CLASSIFY',
          trackNo: 'T-01',
          entityId: 'H-01',
          payload: { label: 'UNKNOWN_EVIDENCE_INSUFFICIENT' },
        },

        // Track 2: HOSTILE_ATTACK never classified by operator (uncommitted label / null)
        {
          seq: 6,
          tMs: 1500,
          type: 'SPAWN',
          trackNo: 'T-02',
          entityId: 'H-02',
          payload: { trueClass: 'HOSTILE_ATTACK', droneType: 'FPV_ATTACK', valueInr: 100000 },
        },
        { seq: 7, tMs: 2500, type: 'TRACK_INIT', trackNo: 'T-02', entityId: 'H-02', payload: {} },
        // Never designated or classified!

        // Track 3: CIVIL_UAS explicitly classified as UNKNOWN_EVIDENCE_INSUFFICIENT
        {
          seq: 8,
          tMs: 2000,
          type: 'SPAWN',
          trackNo: 'T-03',
          entityId: 'C-01',
          payload: { trueClass: 'CIVIL_UAS', droneType: 'CIVIL_UAS', valueInr: null },
        },
        { seq: 9, tMs: 3000, type: 'TRACK_INIT', trackNo: 'T-03', entityId: 'C-01', payload: {} },
        {
          seq: 10,
          tMs: 4500,
          type: 'CLASSIFY',
          trackNo: 'T-03',
          entityId: 'C-01',
          payload: { label: 'UNKNOWN_EVIDENCE_INSUFFICIENT' },
        },

        // Track 4: CIVIL_UAS uncommitted (null)
        {
          seq: 11,
          tMs: 2200,
          type: 'SPAWN',
          trackNo: 'T-04',
          entityId: 'C-02',
          payload: { trueClass: 'CIVIL_UAS', droneType: 'CIVIL_UAS', valueInr: null },
        },
        { seq: 12, tMs: 3200, type: 'TRACK_INIT', trackNo: 'T-04', entityId: 'C-02', payload: {} },

        { seq: 13, tMs: 15000, type: 'SESSION_END', payload: {} },
      ];

      const metrics = aggregateAARMetrics(events);

      // Verify matrix dimensions: 6 truth rows x 8 prediction columns
      expect(metrics.confusion).toHaveLength(6);
      for (let r = 0; r < 6; r++) {
        expect(metrics.confusion[r]).toHaveLength(8);
      }

      // Row 0: HOSTILE_ATTACK (TRUE_CLASSES[0])
      // Col 0: UNKNOWN_EVIDENCE_INSUFFICIENT count should be 1 (T-01)
      expect(metrics.confusion[0][0]).toBe(1);
      // Col 7: NONE count should be 1 (T-02)
      expect(metrics.confusion[0][7]).toBe(1);

      // Row 3: CIVIL_UAS (TRUE_CLASSES[3])
      // Col 0: UNKNOWN_EVIDENCE_INSUFFICIENT count should be 1 (T-03)
      expect(metrics.confusion[3][0]).toBe(1);
      // Col 7: NONE count should be 1 (T-04)
      expect(metrics.confusion[3][7]).toBe(1);

      // Verify other cells in rows 0 and 3 are 0
      expect(metrics.confusion[0][1]).toBe(0); // HOSTILE_ATTACK
      expect(metrics.confusion[3][4]).toBe(0); // CIVIL_UAS

      // Classification score verifies partial credit for UNKNOWN vs 0 for NONE:
      // Hostile T-01 with UNKNOWN gets 25 pts.
      // Hostile T-02 with null gets 0 pts.
      // Civil T-03 with UNKNOWN gets 40 pts.
      // Civil T-04 with null gets 0 pts.
      // Mean C score = (25 + 0 + 40 + 0) / 4 = 16.25 -> rounded to 16
      expect(metrics.cScore).toBe(16);
    });
  });
});

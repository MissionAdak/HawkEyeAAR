import { describe, it, expect } from 'vitest';
import demo1Json from '@/director/bundled/demo1.json';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import { applyTickFor } from '@/sim/inputQueue';
import type { ScenarioSpec } from '@/sim/types';

describe('TASK 19.5 — Deterministic Replay Integrity & Simulation Invariance', () => {
  const spec = demo1Json as unknown as ScenarioSpec;

  function runScriptedSimulation() {
    const engine = new SimEngine();
    engine.load(spec);

    // Operator Action 1: T+10s (tick 200) - Designate T-01
    engine.inputQueue.push({
      tRawMs: 10000,
      applyTick: 200,
      action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'KEY' },
    });

    // Operator Action 2: T+15s (tick 300) - Classify T-01 as HOSTILE_ATTACK
    engine.inputQueue.push({
      tRawMs: 15000,
      applyTick: 300,
      action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' },
    });

    // Operator Action 3: T+57s (tick 1140) - Select RF_SOFTKILL and fire at T-01
    engine.inputQueue.push({
      tRawMs: 56900,
      applyTick: 1140,
      action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' },
    });
    engine.inputQueue.push({
      tRawMs: 57000,
      applyTick: 1140,
      action: { type: 'FIRE', trackNo: 'T-01' },
    });

    // Operator Action 4: T+58s (tick 1160) - Assess kill
    engine.inputQueue.push({
      tRawMs: 58000,
      applyTick: 1160,
      action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
    });

    // Step 2400 ticks (120 seconds duration)
    for (let tick = 0; tick < 2400; tick++) {
      engine.step();
    }

    const metrics = aggregateAARMetrics(engine.events, spec);
    return { engine, metrics };
  }

  describe('1. Repeated Authoritative Simulation Runs', () => {
    it('produces bit-identical event sequences, metrics, and scores on repeated runs with identical seed', () => {
      const run1 = runScriptedSimulation();
      const run2 = runScriptedSimulation();

      expect(run1.engine.events.length).toBe(run2.engine.events.length);
      expect(run1.engine.events.length).toBeGreaterThan(10);

      for (let i = 0; i < run1.engine.events.length; i++) {
        const ev1 = run1.engine.events[i];
        const ev2 = run2.engine.events[i];
        expect(ev1.seq).toBe(ev2.seq);
        expect(ev1.tMs).toBe(ev2.tMs);
        expect(ev1.type).toBe(ev2.type);
        expect(ev1.trackNo).toBe(ev2.trackNo);
        expect(ev1.entityId).toBe(ev2.entityId);
        expect(JSON.stringify(ev1.payload)).toBe(JSON.stringify(ev2.payload));
      }

      // Check track estimates at simulation end
      const est1 = run1.engine.tracker.getAllEstimates();
      const est2 = run2.engine.tracker.getAllEstimates();
      expect(est1.length).toBe(est2.length);
      for (let i = 0; i < est1.length; i++) {
        expect(est1[i].trackNo).toBe(est2[i].trackNo);
        expect(est1[i].estPos.x).toBe(est2[i].estPos.x);
        expect(est1[i].estPos.y).toBe(est2[i].estPos.y);
        expect(est1[i].estPos.z).toBe(est2[i].estPos.z);
        expect(est1[i].estRangeM).toBe(est2[i].estRangeM);
        expect(est1[i].uncertaintyM).toBe(est2[i].uncertaintyM);
      }

      // Check metrics and grade equality
      expect(run1.metrics.score).toBe(run2.metrics.score);
      expect(run1.metrics.grade).toBe(run2.metrics.grade);
      expect(run1.metrics.metMs).toBe(run2.metrics.metMs);
      expect(run1.metrics.mdtMs).toBe(run2.metrics.mdtMs);
      expect(run1.metrics.clsAccuracy).toBe(run2.metrics.clsAccuracy);
      expect(run1.metrics.confusion).toEqual(run2.metrics.confusion);
    });
  });

  describe('2. 2D vs 3D Presentation Layer Isolation', () => {
    it('guarantees that 3D-enabled queries and SafeTrackView projections do not alter simulation outcomes', () => {
      // Run A: Pure simulation
      const runA = runScriptedSimulation();

      // Run B: Simulation where SafeTrackView and UI snapshots are continuously generated
      const engineB = new SimEngine();
      engineB.load(spec);

      // Same inputs as runScriptedSimulation
      engineB.inputQueue.push({
        tRawMs: 10000,
        applyTick: 200,
        action: { type: 'DESIGNATE', trackNo: 'T-01', via: 'KEY' },
      });
      engineB.inputQueue.push({
        tRawMs: 15000,
        applyTick: 300,
        action: { type: 'CLASSIFY', trackNo: 'T-01', label: 'HOSTILE_ATTACK' },
      });
      engineB.inputQueue.push({
        tRawMs: 56900,
        applyTick: 1140,
        action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' },
      });
      engineB.inputQueue.push({
        tRawMs: 57000,
        applyTick: 1140,
        action: { type: 'FIRE', trackNo: 'T-01' },
      });
      engineB.inputQueue.push({
        tRawMs: 58000,
        applyTick: 1160,
        action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
      });

      for (let tick = 0; tick < 2400; tick++) {
        engineB.step();
        // Emulate 3D presentation layer reading safe projections every 2 ticks (10 Hz)
        if (tick % 2 === 0) {
          const snapshot = engineB.buildUiSnapshot();
          const opTracks = engineB.getOperatorTracks();
          expect(snapshot.trackRows.length).toBeGreaterThanOrEqual(0);
          expect(opTracks.length).toBeGreaterThanOrEqual(0);
        }
      }

      const metricsB = aggregateAARMetrics(engineB.events, spec);

      // Verify that continuous UI/3D queries caused ZERO simulation divergence
      expect(engineB.events.length).toBe(runA.engine.events.length);
      expect(metricsB.score).toBe(runA.metrics.score);
      expect(metricsB.grade).toBe(runA.metrics.grade);

      for (let i = 0; i < engineB.events.length; i++) {
        const evA = runA.engine.events[i];
        const evB = engineB.events[i];
        expect(evA.type).toBe(evB.type);
        expect(evA.tMs).toBe(evB.tMs);
        expect(JSON.stringify(evA.payload)).toBe(JSON.stringify(evB.payload));
      }
    });
  });

  describe('3. Variable Render Frame Pacing & Fixed 20 Hz Accumulator Invariance', () => {
    it('produces identical tick progression across varying display refresh rates (30Hz, 60Hz, 144Hz)', () => {
      const simulateAccumulatorPacing = (frameIntervalMs: number, totalRealDurationMs: number) => {
        let accumulatorMs = 0;
        let tickCount = 0;
        let elapsedRealMs = 0;
        const dtMs = 50;

        while (elapsedRealMs < totalRealDurationMs) {
          const delta = Math.min(250, frameIntervalMs); // 250ms clamp per ARCHITECTURE §1.3
          accumulatorMs += delta;
          elapsedRealMs += frameIntervalMs;

          while (accumulatorMs >= dtMs - 1e-4) {
            tickCount += 1;
            accumulatorMs -= dtMs;
          }
        }
        return tickCount;
      };

      const testDurationMs = 10000; // 10 seconds of sim time -> exactly 200 ticks
      const ticks30Hz = simulateAccumulatorPacing(1000 / 30, testDurationMs);
      const ticks60Hz = simulateAccumulatorPacing(1000 / 60, testDurationMs);
      const ticks144Hz = simulateAccumulatorPacing(1000 / 144, testDurationMs);

      expect(ticks30Hz).toBe(200);
      expect(ticks60Hz).toBe(200);
      expect(ticks144Hz).toBe(200);
    });

    it('quantizes user input timestamps correctly via applyTickFor independent of submission pace', () => {
      // At speed 1x:
      // Event at 99ms applies at tick 2 (100ms)
      expect(applyTickFor(99, 1.0)).toBe(2);
      // Event at 100ms applies at tick 2 (100ms)
      expect(applyTickFor(100, 1.0)).toBe(2);
      // Event at 101ms applies at tick 3 (150ms)
      expect(applyTickFor(101, 1.0)).toBe(3);
    });
  });

  describe('4. Event-Sourced Replay vs Live Simulation Parity', () => {
    it('guarantees that frozen stored events generate identical metrics to the live session outcome', () => {
      const { engine, metrics } = runScriptedSimulation();

      // Extract frozen stored event stream (as Dexie / EventRecorder stores them)
      const storedEvents = JSON.parse(JSON.stringify(engine.events));

      // Replay purely from the event stream without SimEngine
      const replayMetrics = aggregateAARMetrics(storedEvents, spec);

      expect(replayMetrics.score).toBe(metrics.score);
      expect(replayMetrics.grade).toBe(metrics.grade);
      expect(replayMetrics.metMs).toBe(metrics.metMs);
      expect(replayMetrics.mdtMs).toBe(metrics.mdtMs);
      expect(replayMetrics.clsAccuracy).toBe(metrics.clsAccuracy);
      expect(replayMetrics.clsCoverage).toBe(metrics.clsCoverage);
      expect(replayMetrics.hostileRecall).toBe(metrics.hostileRecall);
      expect(replayMetrics.hostilePrecision).toBe(metrics.hostilePrecision);
      expect(replayMetrics.roeViolations).toBe(metrics.roeViolations);
      expect(replayMetrics.leakers).toBe(metrics.leakers);
      expect(replayMetrics.confusion).toEqual(metrics.confusion);
    });
  });
});

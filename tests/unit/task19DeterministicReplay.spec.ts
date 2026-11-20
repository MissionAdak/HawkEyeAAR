import { describe, it, expect } from 'vitest';
import { loadCatalogScenario } from '@/director/catalog';
import { SimEngine } from '@/sim/engine';
import { aggregateAARMetrics } from '@/sim/metrics';
import { applyTickFor } from '@/sim/inputQueue';
import { SimClock, MAX_FRAME_MS } from '@/sim/clock';
import { reconstructAarReplayState, convertToReplayEntities } from '@/ui/aar/aarReplayData';
import type { ScenarioSpec } from '@/sim/types';

describe('TASK 19.5 — Deterministic Replay Integrity & Simulation Invariance', () => {
  // Explicitly controlled scenario and seed
  const { spec } = loadCatalogScenario('DEMO-1', 2026);

  function runScriptedSimulation(scenarioSpec: ScenarioSpec) {
    const engine = new SimEngine();
    engine.load(scenarioSpec);

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

    // Operator Action 3: T+56.9s (tick 1138) - Select RF_SOFTKILL
    engine.inputQueue.push({
      tRawMs: 56900,
      applyTick: 1138,
      action: { type: 'SELECT_EFFECTOR', effectorId: 'RF_SOFTKILL' },
    });

    // Operator Action 4: T+57.0s (tick 1140) - Fire at T-01
    engine.inputQueue.push({
      tRawMs: 57000,
      applyTick: 1140,
      action: { type: 'FIRE', trackNo: 'T-01' },
    });

    // Operator Action 5: T+58.0s (tick 1160) - Assess kill
    engine.inputQueue.push({
      tRawMs: 58000,
      applyTick: 1160,
      action: { type: 'ASSESS', trackNo: 'T-01', result: 'KILL' },
    });

    // Step 2400 ticks (120 seconds duration)
    for (let tick = 0; tick < 2400; tick++) {
      engine.step();
    }

    const metrics = aggregateAARMetrics(engine.events, scenarioSpec);
    return { engine, metrics };
  }

  describe('1. Repeated Authoritative Simulation Runs', () => {
    it('produces bit-identical event sequences, metrics, and scores on repeated runs with explicit seed 2026', () => {
      // 1. Assert explicitly controlled scenario seed
      expect(spec.id).toBe('DEMO-1');
      expect(spec.seed).toBe(2026);

      // 2. Execute two independent runs with identical inputs and identical seed
      const run1 = runScriptedSimulation(spec);
      const run2 = runScriptedSimulation(spec);

      // 3. Verify session termination state
      expect(run1.engine.sessionEnded).toBe(true);
      expect(run2.engine.sessionEnded).toBe(true);
      expect(run1.engine.tickIndex).toBe(2400);
      expect(run2.engine.tickIndex).toBe(2400);

      // 4. Verify operator actions genuinely executed and emitted expected event records
      const eventTypes1 = run1.engine.events.map((e) => e.type);
      expect(eventTypes1).toContain('SIM_START');
      expect(eventTypes1).toContain('DETECT');
      expect(eventTypes1).toContain('TRACK_INIT');
      expect(eventTypes1).toContain('DESIGNATE');
      expect(eventTypes1).toContain('CLASSIFY');
      expect(eventTypes1).toContain('ENGAGE');
      expect(eventTypes1).toContain('ENGAGE_RESULT');
      expect(eventTypes1).toContain('ASSESS');
      expect(eventTypes1).toContain('SESSION_END');

      // 5. Categorize event breakdown: snapshot keyframes vs operational domain events
      const snapshots1 = run1.engine.events.filter((e) => e.type === 'SNAPSHOT');
      const operational1 = run1.engine.events.filter((e) => e.type !== 'SNAPSHOT');
      const snapshots2 = run2.engine.events.filter((e) => e.type === 'SNAPSHOT');
      const operational2 = run2.engine.events.filter((e) => e.type !== 'SNAPSHOT');

      expect(run1.engine.events.length).toBe(run2.engine.events.length);
      expect(snapshots1.length).toBe(snapshots2.length);
      expect(operational1.length).toBe(operational2.length);
      expect(operational1.length).toBeGreaterThan(10);

      // 6. Assert complete bit-identical event streams across both runs
      for (let i = 0; i < run1.engine.events.length; i++) {
        const ev1 = run1.engine.events[i];
        const ev2 = run2.engine.events[i];
        expect(ev1.seq).toBe(ev2.seq);
        expect(ev1.tMs).toBe(ev2.tMs);
        expect(ev1.type).toBe(ev2.type);
        expect(ev1.trackNo).toBe(ev2.trackNo);
        expect(ev1.entityId).toBe(ev2.entityId);
        expect(ev1.payload).toEqual(ev2.payload);
      }

      // 7. Check track estimates at simulation end
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

      // 8. Verify metrics, grade, and confusion matrix equality
      expect(run1.metrics.score).toBe(run2.metrics.score);
      expect(run1.metrics.grade).toBe(run2.metrics.grade);
      expect(run1.metrics.metMs).toBe(run2.metrics.metMs);
      expect(run1.metrics.mdtMs).toBe(run2.metrics.mdtMs);
      expect(run1.metrics.clsAccuracy).toBe(run2.metrics.clsAccuracy);
      expect(run1.metrics.clsCoverage).toBe(run2.metrics.clsCoverage);
      expect(run1.metrics.hostileRecall).toBe(run2.metrics.hostileRecall);
      expect(run1.metrics.hostilePrecision).toBe(run2.metrics.hostilePrecision);
      expect(run1.metrics.roeViolations).toBe(run2.metrics.roeViolations);
      expect(run1.metrics.leakers).toBe(run2.metrics.leakers);
      expect(run1.metrics.confusion).toEqual(run2.metrics.confusion);
    });
  });

  describe('2. 2D vs 3D Presentation Layer & Safe Projection Boundary', () => {
    it('guarantees that 3D-safe projection queries do not mutate simulation state or alter outcomes', () => {
      // Run A: Pure simulation
      const runA = runScriptedSimulation(spec);

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
        applyTick: 1138,
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
        // Emulate presentation layer reading safe projections every 2 ticks (10 Hz)
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
        expect(evA.payload).toEqual(evB.payload);
      }
    });
  });

  describe('3. Production SimClock Frame Pacing & Accumulator Invariance', () => {
    it('produces identical tick progression using production SimClock across 30Hz, 60Hz, and 144Hz frame pacing', () => {
      const runWithClock = (frameIntervalMs: number, totalRealDurationMs: number = 10000) => {
        const clock = new SimClock();
        const engine = new SimEngine();
        engine.load(spec);

        let elapsedRealMs = 0;
        let totalTicksExecuted = 0;

        // Initialize clock at t=0
        clock.advance(0);

        while (elapsedRealMs < totalRealDurationMs - 1e-4) {
          elapsedRealMs += frameIntervalMs;
          const { ticksToRun } = clock.advance(elapsedRealMs);
          for (let t = 0; t < ticksToRun; t++) {
            engine.step();
            totalTicksExecuted++;
          }
        }
        return { engine, totalTicksExecuted };
      };

      // 10 seconds of simulation time = exactly 200 ticks at 20 Hz (50 ms dt)
      const res30Hz = runWithClock(1000 / 30);
      const res60Hz = runWithClock(1000 / 60);
      const res144Hz = runWithClock(1000 / 144);

      expect(res30Hz.totalTicksExecuted).toBe(200);
      expect(res60Hz.totalTicksExecuted).toBe(200);
      expect(res144Hz.totalTicksExecuted).toBe(200);

      expect(res30Hz.engine.tickIndex).toBe(200);
      expect(res60Hz.engine.tickIndex).toBe(200);
      expect(res144Hz.engine.tickIndex).toBe(200);

      // Verify that all entity positions match exactly across all display frame rates
      for (let i = 0; i < res60Hz.engine.curr.length; i++) {
        const e60 = res60Hz.engine.curr[i];
        const e30 = res30Hz.engine.curr[i];
        const e144 = res144Hz.engine.curr[i];

        expect(e30.pos.x).toBeCloseTo(e60.pos.x, 3);
        expect(e30.pos.y).toBeCloseTo(e60.pos.y, 3);
        expect(e144.pos.x).toBeCloseTo(e60.pos.x, 3);
        expect(e144.pos.y).toBeCloseTo(e60.pos.y, 3);
      }
    });

    it('clamps excessive frame-time deltas to MAX_FRAME_MS (250 ms) to prevent spiral of death', () => {
      const clock = new SimClock();
      clock.advance(0); // Initialize

      // Simulate a 1000 ms stutter (e.g. background tab or garbage collection)
      const { ticksToRun } = clock.advance(1000);

      // With MAX_FRAME_MS = 250, delta is clamped to 250 ms -> exactly 5 ticks of 50 ms
      expect(MAX_FRAME_MS).toBe(250);
      expect(ticksToRun).toBe(5);
    });

    it('suspends tick accumulation while paused and resumes cleanly without tick burst', () => {
      const clock = new SimClock();
      clock.advance(0);

      const step1 = clock.advance(100); // 100 ms -> 2 ticks
      expect(step1.ticksToRun).toBe(2);

      clock.pause();
      expect(clock.getPaused()).toBe(true);

      // While paused, advance returns 0 ticks regardless of elapsed wall time
      const pausedStep = clock.advance(5000);
      expect(pausedStep.ticksToRun).toBe(0);

      clock.resume();
      expect(clock.getPaused()).toBe(false);

      // Immediately after resume, no sudden burst from the 5000 ms pause interval
      clock.resync(5000);
      const resumedStep = clock.advance(5050); // 50 ms after resume -> 1 tick
      expect(resumedStep.ticksToRun).toBe(1);
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

  describe('4. Event-Sourced AAR Replay Reconstruction', () => {
    it('reconstructs historical timeline state purely from stored SNAPSHOT events without mutating live engine', () => {
      const { engine } = runScriptedSimulation(spec);

      // Extract frozen stored event stream (as Dexie / EventRecorder stores them)
      const storedEvents = JSON.parse(JSON.stringify(engine.events));

      // 1. Reconstruct historical state at T+10s (10,000 ms)
      const replayAt10s = reconstructAarReplayState(storedEvents, 10000, spec);
      expect(replayAt10s.hasSnapshotHistory).toBe(true);
      expect(replayAt10s.tracks.length).toBeGreaterThan(0);

      const t01At10s = replayAt10s.tracks.find((t) => t.trackNo === 'T-01');
      expect(t01At10s).toBeDefined();
      expect(t01At10s?.trueClass).toBe('HOSTILE_ATTACK');
      expect(t01At10s?.truthPos.x).toBeDefined();

      // Convert to 2D ReplayCanvas entities
      const replayEntities10s = convertToReplayEntities(replayAt10s.tracks);
      expect(replayEntities10s.length).toBe(replayAt10s.tracks.length);

      // 2. Reconstruct historical state at T+50s (50,000 ms)
      const replayAt50s = reconstructAarReplayState(storedEvents, 50000, spec);
      const t01At50s = replayAt50s.tracks.find((t) => t.trackNo === 'T-01');
      expect(t01At50s).toBeDefined();

      // Target has moved between 10s and 50s
      const dist10s = Math.hypot(t01At10s!.truthPos.x, t01At10s!.truthPos.y);
      const dist50s = Math.hypot(t01At50s!.truthPos.x, t01At50s!.truthPos.y);
      expect(dist50s).toBeLessThan(dist10s);

      // 3. Backward navigation: seeking backward to 10s reproduces exact same coordinates
      const replayRewind10s = reconstructAarReplayState(storedEvents, 10000, spec);
      const t01Rewound = replayRewind10s.tracks.find((t) => t.trackNo === 'T-01');
      expect(t01Rewound?.truthPos).toEqual(t01At10s?.truthPos);

      // 4. Assert that replay reconstruction caused zero mutation to live engine
      expect(engine.tickIndex).toBe(2400);
      expect(engine.events.length).toBe(storedEvents.length);
      expect(engine.sessionEnded).toBe(true);
    });
  });
});

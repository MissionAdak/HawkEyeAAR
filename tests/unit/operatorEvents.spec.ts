import { describe, it, expect } from 'vitest';
import { SimEngine } from '@/sim/engine';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('TASK 18-06A Phase B — Sanitized Live Operator Event Stream', () => {
  it('excludes internal SNAPSHOT, SPAWN, and TRIGGER keyframes from live operator event stream', () => {
    const engine = new SimEngine();
    engine.load(demo1Json as unknown as ScenarioSpec);

    // Initial event log starts with SIM_START
    // Append 2 meaningful operator events
    engine.appendEvent('DETECT', { rangeKm: 2.4 }, 'T-01');
    engine.appendEvent('CLASSIFY', { label: 'CIVIL_UAS' }, 'T-01');

    // Simulate high-frequency periodic snapshots (20 snapshots every 250ms)
    for (let i = 0; i < 20; i++) {
      engine.appendEvent('SNAPSHOT', { entities: [] });
      engine.appendEvent('TRIGGER', { condition: 'CHECK' });
      engine.appendEvent('SPAWN', { trueClass: 'HOSTILE_ATTACK', waypoints: [] });
    }

    const opEvents = engine.getOperatorEvents();

    // Must not be empty and must not contain any SNAPSHOT, TRIGGER, or SPAWN events
    expect(opEvents.length).toBeGreaterThanOrEqual(2);
    expect(opEvents.every((e) => e.type !== 'SNAPSHOT')).toBe(true);
    expect(opEvents.every((e) => e.type !== 'TRIGGER')).toBe(true);
    expect(opEvents.every((e) => e.type !== 'SPAWN')).toBe(true);

    // Meaningful operator events must be preserved and not crowded out
    const types = opEvents.map((e) => e.type);
    expect(types).toContain('DETECT');
    expect(types).toContain('CLASSIFY');
  });

  it('guarantees raw SimEvent.payload reference or ground truth fields cannot enter operator event projection', () => {
    const engine = new SimEngine();
    engine.load(demo1Json as unknown as ScenarioSpec);

    const rawPayload = {
      effector: 'RF_SOFTKILL',
      killed: true,
      pk: 0.92,
      u: 0.14,
      trueClass: 'HOSTILE_ATTACK',
      droneType: 'FPV_ATTACK',
      targetPos: { x: 1200, y: 1500, z: 80 },
      valueInr: 500000,
    };

    engine.appendEvent('ENGAGE', rawPayload, 'T-01');

    const opEvents = engine.getOperatorEvents();
    const engageEv = opEvents.find((e) => e.type === 'ENGAGE');

    expect(engageEv).toBeDefined();
    expect(engageEv?.payload).toBeDefined();

    // Must be a detached copy, not reference-identical to raw internal payload
    expect(engageEv?.payload).not.toBe(rawPayload);

    // Allowed operator-safe properties
    expect(engageEv?.payload?.effector).toBe('RF_SOFTKILL');

    // Forbidden ground-truth properties must be stripped
    expect(engageEv?.payload).not.toHaveProperty('pk');
    expect(engageEv?.payload).not.toHaveProperty('u');
    expect(engageEv?.payload).not.toHaveProperty('trueClass');
    expect(engageEv?.payload).not.toHaveProperty('droneType');
    expect(engageEv?.payload).not.toHaveProperty('targetPos');
    expect(engageEv?.payload).not.toHaveProperty('valueInr');
  });

  it('preserves useful chronological ordering and maximum eight-line event display', () => {
    const engine = new SimEngine();
    engine.load(demo1Json as unknown as ScenarioSpec);

    for (let i = 1; i <= 15; i++) {
      engine.appendEvent('DESIGNATE', { via: 'CLICK' }, `T-${String(i).padStart(2, '0')}`);
    }

    const opEvents = engine.getOperatorEvents();
    expect(opEvents).toHaveLength(8);

    // Verify membership: designations T-08 through T-15 in order
    const expectedDesignations = Array.from({ length: 8 }, (_, idx) => `T-${String(idx + 8).padStart(2, '0')}`);
    expect(opEvents.map((e) => e.trackNo)).toEqual(expectedDesignations);

    // Verify strictly ascending sequence ordering
    for (let i = 1; i < opEvents.length; i++) {
      expect(opEvents[i].seq).toBeGreaterThan(opEvents[i - 1].seq);
      expect(opEvents[i].tMs).toBeGreaterThanOrEqual(opEvents[i - 1].tMs);
    }
  });
});

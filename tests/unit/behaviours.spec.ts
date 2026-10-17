import { describe, it, expect } from 'vitest';
import { BehaviourController } from '@/sim/behaviours';

describe('Flight Behaviours & Mathematical Trajectory Execution', () => {
  it('covers exactly 2000 m in 1000 ticks (50 s) at 40 m/s (TASK-P1-01 AC)', () => {
    const controller = new BehaviourController({
      tick: 0,
      dtSec: 0.05,
      speedMps: 40,
      profile: 'DIRECT',
      waypoints: [{ x: 0, y: 0, z: 0 }],
      zones: [],
      entityIndex: 0,
      scenarioSeed: 1337,
    });

    let pos = { x: 3000, y: 0, z: 120 };
    let vel = { x: -40, y: 0, z: 0 };

    for (let tick = 1; tick <= 1000; tick++) {
      const updated = controller.step(pos, vel, {
        tick,
        dtSec: 0.05,
        speedMps: 40,
        profile: 'DIRECT',
        waypoints: [{ x: 0, y: 0, z: 0 }],
        zones: [],
        entityIndex: 0,
        scenarioSeed: 1337,
      });
      pos = updated.pos;
      vel = updated.vel;
    }

    // Initial X = 3000. Traveled 2000m -> final X = 1000.
    expect(pos.x).toBeCloseTo(1000, 5);
    const distanceTraveled = 3000 - pos.x;
    expect(distanceTraveled).toBeCloseTo(2000, 5);
  });

  it('terrain hug profile descends from 120m to 20m before entering zone shadow', () => {
    const controller = new BehaviourController({
      tick: 0,
      dtSec: 0.05,
      speedMps: 40,
      profile: 'TERRAIN_HUG',
      waypoints: [{ x: 0, y: 0, z: 0 }],
      zones: [
        {
          id: 'U1',
          type: 'URBAN',
          polygon: [
            [1500, 1500],
            [2500, 1500],
            [2500, 2500],
            [1500, 2500],
          ],
          heightM: 40,
          shadowM: 800,
          rho: 0.8,
        },
      ],
      entityIndex: 0,
      scenarioSeed: 1337,
    });

    // Start at range ~3600m heading towards origin
    let pos = { x: 2545, y: 2545, z: 120 };
    let vel = { x: -28.28, y: -28.28, z: 0 };

    // Advance 500 ticks (25 s)
    for (let tick = 1; tick <= 500; tick++) {
      const updated = controller.step(pos, vel, {
        tick,
        dtSec: 0.05,
        speedMps: 40,
        profile: 'TERRAIN_HUG',
        waypoints: [{ x: 0, y: 0, z: 0 }],
        zones: [
          {
            id: 'U1',
            type: 'URBAN',
            polygon: [
              [1500, 1500],
              [2500, 1500],
              [2500, 2500],
              [1500, 2500],
            ],
            heightM: 40,
            shadowM: 800,
            rho: 0.8,
          },
        ],
        entityIndex: 0,
        scenarioSeed: 1337,
      });
      pos = updated.pos;
      vel = updated.vel;
    }

    // At zone entry altitude must be hugged at 20m
    expect(pos.z).toBeLessThanOrEqual(20);
  });
});

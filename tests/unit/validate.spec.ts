import { describe, it, expect } from 'vitest';
import { validate, validateDetailed, getThreatPositionAt } from '@/director/validate';
import demo1Json from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

describe('Fairness Validator (TASK-P4-02, ARCHITECTURE.md 5.1)', () => {
  const baseSpec = demo1Json as unknown as ScenarioSpec;

  it('validates DEMO-1 as meeting all fairness criteria (T_budget >= 6s, W >= 6s, admissible effectors, chaos schedule)', () => {
    const res = validateDetailed(baseSpec);
    expect(res.valid).toBe(true);
    expect(res.reasons).toEqual([]);
    expect(validate(baseSpec)).toBe(true);
  });

  it('rejects scenario when a hostile threat has T_budget < 6s', () => {
    // Clone spec and modify H-1 to spawn already inside or right next to rMinM (500m) with high speed
    const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
    unfairSpec.threats[0].waypoints = [
      { x: 550, y: 0, z: 20 },
      { x: 0, y: 0, z: 20 },
    ];
    unfairSpec.threats[0].speedMps = 50; // Reaches 500m in 1s -> T_budget < 6s

    const res = validateDetailed(unfairSpec);
    expect(res.valid).toBe(false);
    expect(res.reasons.some((r) => r.includes('time budget') || r.includes('failed track initiation'))).toBe(true);
    expect(validate(unfairSpec)).toBe(false);
  });

  it('rejects scenario when sensing window W < 6s due to total radar dropout across entire flight', () => {
    const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
    unfairSpec.chaos = [
      {
        type: 'RADAR_DROPOUT',
        tStartMs: 0,
        tEndMs: 120000,
        severity: 1.0,
      },
    ];

    const res = validateDetailed(unfairSpec);
    expect(res.valid).toBe(false);
    expect(validate(unfairSpec)).toBe(false);
  });

  it('rejects scenario with overlapping concurrent chaos events (AC-4)', () => {
    const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
    unfairSpec.chaos = [
      {
        type: 'FOG',
        tStartMs: 10000,
        tEndMs: 30000,
        severity: 0.8,
      },
      {
        type: 'JAMMING',
        tStartMs: 25000, // Overlaps with FOG [10000, 30000)
        tEndMs: 45000,
        severity: 0.8,
      },
    ];

    const res = validateDetailed(unfairSpec);
    expect(res.valid).toBe(false);
    expect(res.reasons.some((r) => r.includes('Chaos schedule violation'))).toBe(true);
  });

  it('rejects scenario when hostile PNR is outside session duration margin (t_PNR > durationMs - 1000ms)', () => {
    const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
    // Set duration to 30s, but hostile only reaches PNR at ~77.5s
    unfairSpec.durationMs = 30000;

    const res = validateDetailed(unfairSpec);
    expect(res.valid).toBe(false);
    expect(res.reasons.some((r) => r.includes('PNR') && r.includes('duration'))).toBe(true);
    expect(validate(unfairSpec)).toBe(false);
  });

  it('rejects scenario when operator handling load exceeds 0.8 * timeline span', () => {
    const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
    // Add 20 decoys, inflating required handling time beyond 0.8 * timeline span
    unfairSpec.decoys = Array.from({ length: 30 }, (_, i) => ({
      id: `DECOY-${i}`,
      droneType: 'BIRD',
      trueClass: 'BIRD',
      spawnTMs: 10000,
      waypoints: [{ x: 1000, y: 1000, z: 20 }],
      speedMps: 10,
      profile: 'LOITER',
      rcsM2: 0.01,
      valueInr: null,
      emitsRf: false,
      remoteId: false,
      iff: false,
    }));

    const res = validateDetailed(unfairSpec);
    expect(res.valid).toBe(false);
    expect(res.reasons.some((r) => r.includes('load check failed'))).toBe(true);
  });

  it('correctly interpolates threat position along waypoints over time', () => {
    const threat = baseSpec.threats[0];
    const posStart = getThreatPositionAt(threat, threat.spawnTMs);
    expect(posStart.x).toBe(threat.waypoints[0].x);
    expect(posStart.y).toBe(threat.waypoints[0].y);

    const posMid = getThreatPositionAt(threat, threat.spawnTMs + 10000);
    expect(posMid.x).toBeLessThan(threat.waypoints[0].x);
  });

  describe('Fairness Criteria Boundary Tests (Checks b, c, d, D-11)', () => {
    it('rejects scenario when no effector is admissible during the tracking window (Check b)', () => {
      const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
      // Threat is RF-silent and approach is entirely over dense urban zone
      unfairSpec.threats[0].emitsRf = false;
      // Laser disabled by persistent fog throughout
      unfairSpec.chaos = [
        {
          type: 'FOG',
          tStartMs: 0,
          tEndMs: 120000,
          severity: 1.0,
        },
      ];
      // Expand urban zone U1 to cover entire engagement area [0, 3000]
      unfairSpec.zones = [
        {
          id: 'DENSE_EVERYWHERE',
          type: 'URBAN',
          polygon: [
            [-4000, -4000],
            [4000, -4000],
            [4000, 4000],
            [-4000, 4000],
          ],
          heightM: 40,
          shadowM: 800,
          rho: 0.9,
        },
      ];

      const res = validateDetailed(unfairSpec);
      expect(res.valid).toBe(false);
      expect(res.reasons.some((r) => r.includes('no admissible effector') || r.includes('joint feasibility'))).toBe(true);
    });

    it('rejects scenario when 6s sensing window (c) and effector range (b) are disjoint, violating joint feasibility (Check d, D-11)', () => {
      const unfairSpec: ScenarioSpec = JSON.parse(JSON.stringify(baseSpec));
      // Threat is RF-silent, eliminating RF softkill
      unfairSpec.threats[0].emitsRf = false;
      unfairSpec.threats[0].waypoints = [
        { x: 3000, y: 0, z: 20 },
        { x: 0, y: 0, z: 20 },
      ];
      // Persistent fog reduces laser Pk < 0.6
      unfairSpec.chaos = [
        {
          type: 'FOG',
          tStartMs: 0,
          tEndMs: 120000,
          severity: 1.0,
        },
      ];
      // Zone 1: Urban high density with height=0 creates collateral restriction everywhere (blocking missile we >= 0.3)
      // Zone 2: Masks threat when range <= 1200m, but leaves range > 1200m unmasked
      // Result: Sensing window exists at range > 1200m, effectors (HPEM envelope <= 800m) exist at range <= 800m,
      // but they NEVER overlap! Joint feasibility window = 0ms < 6000ms.
      unfairSpec.zones = [
        {
          id: 'COLLATERAL_BLOCK',
          type: 'URBAN',
          polygon: [
            [800, -2000],
            [4000, -2000],
            [4000, 2000],
            [800, 2000],
          ],
          heightM: 0,
          shadowM: 0,
          rho: 0.9,
        },
        {
          id: 'MASK_NEAR_ASSET',
          type: 'RIDGE',
          polygon: [
            [0, -500],
            [1200, -500],
            [1200, 500],
            [0, 500],
          ],
          heightM: 50,
          shadowM: 800,
          rho: 0.0,
        },
      ];

      const res = validateDetailed(unfairSpec);
      expect(res.valid).toBe(false);
      expect(res.reasons.some((r) => r.includes('joint feasibility window'))).toBe(true);
    });
  });
});

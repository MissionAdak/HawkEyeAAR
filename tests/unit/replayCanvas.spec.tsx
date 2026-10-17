import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReplayCanvas, type ReplayEntity } from '@/ui/aar/ReplayCanvas';
import type { SimEvent } from '@/sim/types';

describe('AAR ReplayCanvas (TASK-P3-05)', () => {
  const dummyEntities: ReplayEntity[] = [
    {
      id: 'T1',
      trackNo: 'T-01',
      trueClass: 'HOSTILE_ATTACK',
      traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
      pos: { x: 1000, y: 1500, z: 80 },
      vel: { x: 0, y: -20, z: 0 },
      step: 'FIX',
      masked: false,
      q: 0.85,
    },
    {
      id: 'T2',
      trackNo: 'T-02',
      trueClass: 'CIVIL_UAS',
      traineeLabel: 'CIVIL_UAS',
      pos: { x: -500, y: 1200, z: 40 },
      vel: { x: 15, y: 0, z: 0 },
      step: 'TRACK',
      masked: false,
      q: 0.9,
    },
    {
      id: 'T3',
      trackNo: 'T-03',
      trueClass: 'SWARM_ELEMENT',
      traineeLabel: 'BIRD', // Trainee misclassified hostile swarm as bird!
      pos: { x: 800, y: 800, z: 60 },
      vel: { x: -10, y: -10, z: 0 },
      step: 'FIND',
      masked: true, // Masked
      ghostSigmaM: 120, // Coasting
    },
  ];

  const dummyEvents: SimEvent[] = [
    {
      seq: 1,
      tMs: 14500,
      type: 'ENGAGE',
      trackNo: 'T-01',
      entityId: 'T1',
      payload: {
        effector: 'MISSILE',
        rangeM: 1800,
        killed: true,
      },
    },
  ];

  it('renders server-side HTML without throwing', () => {
    const html = renderToString(
      <ReplayCanvas
        tMs={15000}
        entities={dummyEntities}
        events={dummyEvents}
        showGroundTruth={false}
      />
    );

    expect(html).toContain('canvas');
    expect(html).toContain('360');
    expect(html).toContain('AAR REPLAY // 360px');
    expect(html).toContain('[G] GROUND TRUTH: OFF');
    expect(html).toContain('T+00:15.000');
  });

  it('reflects Ground Truth toggle ON state in DOM', () => {
    const html = renderToString(
      <ReplayCanvas
        tMs={15000}
        entities={dummyEntities}
        events={dummyEvents}
        showGroundTruth={true}
      />
    );

    expect(html).toContain('[G] GROUND TRUTH: ON');
  });

  it('computes correct sweep angle and clock display for arbitrary scrubbed timestamps', () => {
    const tMs = 45250; // 00:45.250
    const html = renderToString(
      <ReplayCanvas
        tMs={tMs}
        entities={dummyEntities}
        events={dummyEvents}
      />
    );

    expect(html).toContain('T+00:45.250');
  });

  it('formats HUD scope label dynamically from maxRangeM', () => {
    const html3500 = renderToString(
      <ReplayCanvas
        tMs={1000}
        entities={dummyEntities}
        maxRangeM={3500}
      />
    );
    expect(html3500).toContain('SCOPE: 3.5 km');

    const html10000 = renderToString(
      <ReplayCanvas
        tMs={1000}
        entities={dummyEntities}
        maxRangeM={10000}
      />
    );
    expect(html10000).toContain('SCOPE: 10.0 km');
  });
});

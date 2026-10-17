import { describe, it, expect } from 'vitest';
import {
  CLASSES,
  SHORT_CODES,
  HOSTILE_CLASSES,
  NON_HOSTILE_CLASSES,
  isHostile,
  isNonHostile,
  type TrackClass,
  type TrueClass,
} from '../../src/sim/taxonomy';

describe('Canonical 7-Class Taxonomy (TX-1 to TX-4)', () => {
  it('contains exactly the 7 canonical classes defined in Rules.md', () => {
    expect(CLASSES).toHaveLength(7);
    expect(CLASSES).toEqual([
      'UNKNOWN_EVIDENCE_INSUFFICIENT',
      'HOSTILE_ATTACK',
      'HOSTILE_ISR',
      'SWARM_ELEMENT',
      'CIVIL_UAS',
      'BIRD',
      'FRIENDLY',
    ]);
  });

  it('maps every class to a display-only short code', () => {
    for (const c of CLASSES) {
      expect(SHORT_CODES[c]).toBeDefined();
      expect(typeof SHORT_CODES[c]).toBe('string');
    }

    expect(SHORT_CODES.HOSTILE_ATTACK).toBe('HA');
    expect(SHORT_CODES.HOSTILE_ISR).toBe('HI');
    expect(SHORT_CODES.SWARM_ELEMENT).toBe('SW');
    expect(SHORT_CODES.CIVIL_UAS).toBe('CU');
    expect(SHORT_CODES.BIRD).toBe('BI');
    expect(SHORT_CODES.FRIENDLY).toBe('FR');
    expect(SHORT_CODES.UNKNOWN_EVIDENCE_INSUFFICIENT).toBe('UNK');
  });

  it('correctly partitions hostile and non-hostile classes', () => {
    expect(HOSTILE_CLASSES.size).toBe(3);
    expect(NON_HOSTILE_CLASSES.size).toBe(3);

    expect(isHostile('HOSTILE_ATTACK')).toBe(true);
    expect(isHostile('HOSTILE_ISR')).toBe(true);
    expect(isHostile('SWARM_ELEMENT')).toBe(true);
    expect(isHostile('CIVIL_UAS')).toBe(false);
    expect(isHostile('BIRD')).toBe(false);
    expect(isHostile('FRIENDLY')).toBe(false);
    expect(isHostile('UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe(false);

    expect(isNonHostile('CIVIL_UAS')).toBe(true);
    expect(isNonHostile('BIRD')).toBe(true);
    expect(isNonHostile('FRIENDLY')).toBe(true);
    expect(isNonHostile('HOSTILE_ATTACK')).toBe(false);
  });

  it('ensures TrueClass excludes UNKNOWN_EVIDENCE_INSUFFICIENT (TX-3)', () => {
    const trueClasses: TrueClass[] = [
      'HOSTILE_ATTACK',
      'HOSTILE_ISR',
      'SWARM_ELEMENT',
      'CIVIL_UAS',
      'BIRD',
      'FRIENDLY',
    ];

    expect(trueClasses).toHaveLength(6);
    for (const tc of trueClasses) {
      expect(tc).not.toBe('UNKNOWN_EVIDENCE_INSUFFICIENT');
    }
  });

  it('type check: exhaustive switch over TrackClass compile test', () => {
    function classifyCategory(c: TrackClass): string {
      switch (c) {
        case 'HOSTILE_ATTACK':
        case 'HOSTILE_ISR':
        case 'SWARM_ELEMENT':
          return 'HOSTILE';
        case 'CIVIL_UAS':
        case 'BIRD':
        case 'FRIENDLY':
          return 'NON_HOSTILE';
        case 'UNKNOWN_EVIDENCE_INSUFFICIENT':
          return 'UNKNOWN';
        default: {
          const _exhaustive: never = c;
          return _exhaustive;
        }
      }
    }

    expect(classifyCategory('HOSTILE_ATTACK')).toBe('HOSTILE');
    expect(classifyCategory('CIVIL_UAS')).toBe('NON_HOSTILE');
    expect(classifyCategory('UNKNOWN_EVIDENCE_INSUFFICIENT')).toBe('UNKNOWN');
  });
});

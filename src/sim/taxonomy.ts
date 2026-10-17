/**
 * DRISHTI-CUAS Canonical Taxonomy (7 Classes)
 *
 * TX-1: The only class strings in the code, DB, UI, matrix and exports are the 7 values
 * of CLASSES in src/sim/taxonomy.ts. Any other string is a fatal error.
 * TX-2: Short codes (HA HI SW CU BI FR UNK) are display-only and generated from one lookup table. Never store them.
 * TX-3: Ground truth uses TrueClass (never UNKNOWN_EVIDENCE_INSUFFICIENT).
 * TX-4: The scope renders the trainee's label, never trueClass.
 */

export const CLASSES = [
  'UNKNOWN_EVIDENCE_INSUFFICIENT',
  'HOSTILE_ATTACK',
  'HOSTILE_ISR',
  'SWARM_ELEMENT',
  'CIVIL_UAS',
  'BIRD',
  'FRIENDLY',
] as const;

export type TrackClass = typeof CLASSES[number];

/** Ground truth is never UNKNOWN */
export type TrueClass = Exclude<TrackClass, 'UNKNOWN_EVIDENCE_INSUFFICIENT'>;

export const HOSTILE_CLASSES: ReadonlySet<TrackClass> = new Set([
  'HOSTILE_ATTACK',
  'HOSTILE_ISR',
  'SWARM_ELEMENT',
]);

export const NON_HOSTILE_CLASSES: ReadonlySet<TrackClass> = new Set([
  'CIVIL_UAS',
  'BIRD',
  'FRIENDLY',
]);

/** Display-only short codes generated from one lookup table. Never store these. */
export const SHORT_CODES: Record<TrackClass, string> = {
  UNKNOWN_EVIDENCE_INSUFFICIENT: 'UNK',
  HOSTILE_ATTACK: 'HA',
  HOSTILE_ISR: 'HI',
  SWARM_ELEMENT: 'SW',
  CIVIL_UAS: 'CU',
  BIRD: 'BI',
  FRIENDLY: 'FR',
};

export const CLASS_DISPLAY_NAMES: Record<TrackClass, string> = {
  UNKNOWN_EVIDENCE_INSUFFICIENT: 'UNKNOWN / INSUFFICIENT',
  HOSTILE_ATTACK: 'HOSTILE ATTACK',
  HOSTILE_ISR: 'HOSTILE ISR',
  SWARM_ELEMENT: 'SWARM ELEMENT',
  CIVIL_UAS: 'CIVIL UAS',
  BIRD: 'BIRD',
  FRIENDLY: 'FRIENDLY',
};

export function isHostile(trackClass: TrackClass): boolean {
  return HOSTILE_CLASSES.has(trackClass);
}

export function isNonHostile(trackClass: TrackClass): boolean {
  return NON_HOSTILE_CLASSES.has(trackClass);
}

/**
 * Type-level exhaustiveness check for taxonomy classes.
 */
export function assertNeverClass(x: never, message = 'Unhandled canonical class'): never {
  throw new Error(`${message}: ${String(x)}`);
}

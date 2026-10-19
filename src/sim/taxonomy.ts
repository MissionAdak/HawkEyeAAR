export const CLASSES = [
  'UNKNOWN_EVIDENCE_INSUFFICIENT',
  'HOSTILE_ATTACK',
  'HOSTILE_ISR',
  'SWARM_ELEMENT',
  'CIVIL_UAS',
  'BIRD',
  'FRIENDLY',
] as const;

export type TrackClass = (typeof CLASSES)[number];
export type TrueClass = Exclude<TrackClass, 'UNKNOWN_EVIDENCE_INSUFFICIENT'>;

export const TRUE_CLASSES: readonly TrueClass[] = [
  'HOSTILE_ATTACK',
  'HOSTILE_ISR',
  'SWARM_ELEMENT',
  'CIVIL_UAS',
  'BIRD',
  'FRIENDLY',
] as const;

export const PRED_COLUMNS = [
  ...CLASSES,
  'NONE',
] as const;

export type PredColumn = (typeof PRED_COLUMNS)[number];

export const HOSTILE: ReadonlySet<TrackClass> = new Set([
  'HOSTILE_ATTACK',
  'HOSTILE_ISR',
  'SWARM_ELEMENT',
]);

export const SHORT_CODES: Record<TrackClass | 'NONE', string> = {
  UNKNOWN_EVIDENCE_INSUFFICIENT: 'UNK',
  HOSTILE_ATTACK: 'HA',
  HOSTILE_ISR: 'HI',
  SWARM_ELEMENT: 'SW',
  CIVIL_UAS: 'CU',
  BIRD: 'BI',
  FRIENDLY: 'FR',
  NONE: 'NON',
};

export const CLASS_LABELS: Record<TrackClass | 'NONE', string> = {
  UNKNOWN_EVIDENCE_INSUFFICIENT: 'UNKNOWN / INSUFFICIENT',
  HOSTILE_ATTACK: 'HOSTILE ATTACK',
  HOSTILE_ISR: 'HOSTILE ISR',
  SWARM_ELEMENT: 'SWARM ELEMENT',
  CIVIL_UAS: 'CIVILIAN UAS',
  BIRD: 'AVIAN (BIRD)',
  FRIENDLY: 'FRIENDLY IFF',
  NONE: 'NONE (UNCLASSIFIED)',
};

export function isHostile(c: TrackClass): boolean {
  return HOSTILE.has(c);
}


import { db, type StoredSimEvent } from './dexie';
import type { TrackClass, TrueClass } from '@/sim/types';
import { isHostile } from '@/sim/taxonomy';

export interface EventTypeCount {
  type: string;
  count: number;
}

export interface AARSessionSummary {
  sessionUid: string;
  mode: 'TRAIN' | 'EVAL' | 'DEMO' | null;
  totalEvents: number;
  firstEventMs: number | null;
  lastEventMs: number | null;
  elapsedMs: number;
  eventCounts: EventTypeCount[];
  sessionEndCount: number;
  snapshotCount: number;
  leakCount: number;
}

export interface AARDerivedMetrics {
  knownTracks: number;
  classifiedTracks: number;
  clsAccuracy: number | null;
  clsCoverage: number | null;
  hostileRecall: number | null;
  hostilePrecision: number | null;
  hostileTracks: number;
  leakers: number;
  leakRate: number | null;
  meanDesignationToClassificationMs: number | null;
  meanClassificationToEngagementMs: number | null;
  roeViolations: number;
  snapshotCount: number;
  groundTruthCoverage: number;
}

interface SnapshotEntity {
  id: string;
  trueClass: TrueClass;
}

function getEventCounts(events: StoredSimEvent[]): EventTypeCount[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

function readSnapshotEntities(event: StoredSimEvent): SnapshotEntity[] {
  const payload = event.payload;
  if (!Array.isArray(payload.entities)) return [];

  const result: SnapshotEntity[] = [];

  for (const value of payload.entities) {
    if (!value || typeof value !== 'object') continue;

    const entity = value as Record<string, unknown>;
    const id = entity.id;
    const trueClass = entity.trueClass;

    if (
      typeof id === 'string' &&
      typeof trueClass === 'string' &&
      trueClass !== 'UNKNOWN_EVIDENCE_INSUFFICIENT' &&
      [
        'HOSTILE_ATTACK',
        'HOSTILE_ISR',
        'SWARM_ELEMENT',
        'CIVIL_UAS',
        'BIRD',
        'FRIENDLY',
      ].includes(trueClass)
    ) {
      result.push({ id, trueClass: trueClass as TrueClass });
    }
  }

  return result;
}

function readSnapshotEntityIds(event: StoredSimEvent): string[] {
  if (!Array.isArray(event.payload.entities)) return [];

  return event.payload.entities.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];

    const id = (value as Record<string, unknown>).id;

    return typeof id === 'string' ? [id] : [];
  });
}


function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Reads persisted events and builds a summary for one session.
 * This function does not modify the database.
 */
export async function getAARSessionSummary(
  sessionUid: string
): Promise<AARSessionSummary> {
  const events = await db.events
    .where('sessionUid')
    .equals(sessionUid)
    .sortBy('tMs');

  const firstEventMs = events.length > 0 ? events[0].tMs : null;
  const lastEventMs =
    events.length > 0 ? events[events.length - 1].tMs : null;

  const startEvent = events.find((event) => event.type === 'SIM_START');
  const modeValue = startEvent?.payload.mode;
  const mode =
    modeValue === 'TRAIN' || modeValue === 'EVAL' || modeValue === 'DEMO'
      ? modeValue
      : null;

  return {
    sessionUid,
    mode,
    totalEvents: events.length,
    firstEventMs,
    lastEventMs,
    elapsedMs:
      firstEventMs !== null && lastEventMs !== null
        ? Math.max(0, lastEventMs - firstEventMs)
        : 0,
    eventCounts: getEventCounts(events),
    sessionEndCount: events.filter(
      (event) => event.type === 'SESSION_END'
    ).length,
    snapshotCount: events.filter(
      (event) => event.type === 'SNAPSHOT'
    ).length,
    leakCount: events.filter((event) => event.type === 'LEAK').length,
  };
}

/**
 * Derives metrics only where persisted events provide sufficient evidence.
 *
 * Accuracy uses the latest CLASSIFY event per entity and ground truth from
 * snapshots. Older snapshots without trueClass do not supply ground truth.
 * Timing values are averages across tracks with both required events.
 * Rates are fractions from 0 to 1, not percentages.
 */
export async function getAARDerivedMetrics(
  sessionUid: string
): Promise<AARDerivedMetrics> {
  const events = await db.events
    .where('sessionUid')
    .equals(sessionUid)
    .sortBy('tMs');

  const trueClasses = new Map<string, TrueClass>();
  const snapshotEntityIds = new Set<string>();

  
for (const event of events) {
  if (event.type !== 'SNAPSHOT') continue;

  for (const id of readSnapshotEntityIds(event)) {
    snapshotEntityIds.add(id);
  }

  for (const entity of readSnapshotEntities(event)) {
    trueClasses.set(entity.id, entity.trueClass);
  }
}

  const classifications = new Map<
    string,
    { label: TrackClass; tMs: number }
  >();

  const firstTimes = new Map<string, Map<string, number>>();

  for (const event of events) {
    if (!event.entityId) continue;

    if (
      event.type === 'DESIGNATE' ||
      event.type === 'CLASSIFY' ||
      event.type === 'ENGAGE'
    ) {
      let times = firstTimes.get(event.entityId);

      if (!times) {
        times = new Map<string, number>();
        firstTimes.set(event.entityId, times);
      }

      if (!times.has(event.type)) {
        times.set(event.type, event.tMs);
      }
    }

    if (event.type === 'CLASSIFY') {
      const label = event.payload.label;

      if (
        typeof label === 'string' &&
        [
          'UNKNOWN_EVIDENCE_INSUFFICIENT',
          'HOSTILE_ATTACK',
          'HOSTILE_ISR',
          'SWARM_ELEMENT',
          'CIVIL_UAS',
          'BIRD',
          'FRIENDLY',
        ].includes(label)
      ) {
        classifications.set(event.entityId, {
          label: label as TrackClass,
          tMs: event.tMs,
        });
      }
    }
  }

  const knownTracks = trueClasses.size;
  const classified = [...classifications.entries()].filter(([id]) =>
    trueClasses.has(id)
  );

  let correctClassifications = 0;
  let hostileTracks = 0;
  let correctlyClassifiedHostiles = 0;
  let predictedHostiles = 0;

  for (const [id, trueClass] of trueClasses) {
    const hostileTruth = isHostile(trueClass);

    if (hostileTruth) hostileTracks++;

    const prediction = classifications.get(id);
    if (!prediction) continue;

    const predictedHostile = isHostile(prediction.label);
    if (predictedHostile) predictedHostiles++;

    if (prediction.label === trueClass) {
      correctClassifications++;
    }

    if (hostileTruth && predictedHostile) {
      correctlyClassifiedHostiles++;
    }
  }

  const leakEntityIds = new Set(
    events
      .filter((event) => event.type === 'LEAK' && event.entityId)
      .map((event) => event.entityId as string)
  );

  const leakers = [...leakEntityIds].filter((id) =>
    trueClasses.has(id) ? isHostile(trueClasses.get(id)!) : false
  ).length;

  const designationToClassification: number[] = [];
  const classificationToEngagement: number[] = [];

  for (const times of firstTimes.values()) {
    const designated = times.get('DESIGNATE');
    const classifiedAt = times.get('CLASSIFY');
    const engaged = times.get('ENGAGE');

    if (
      designated !== undefined &&
      classifiedAt !== undefined &&
      classifiedAt >= designated
    ) {
      designationToClassification.push(classifiedAt - designated);
    }

    if (
      classifiedAt !== undefined &&
      engaged !== undefined &&
      engaged >= classifiedAt
    ) {
      classificationToEngagement.push(engaged - classifiedAt);
    }
  }

  const snapshotCount = events.filter(
    (event) => event.type === 'SNAPSHOT'
  ).length;

  
const groundTruthCoverage =
  snapshotEntityIds.size === 0
    ? 0
    : trueClasses.size / snapshotEntityIds.size;


  return {
    knownTracks,
    classifiedTracks: classified.length,
    clsAccuracy:
      classified.length > 0
        ? correctClassifications / classified.length
        : null,
    clsCoverage:
      knownTracks > 0 ? classified.length / knownTracks : null,
    hostileRecall:
      hostileTracks > 0
        ? correctlyClassifiedHostiles / hostileTracks
        : null,
    hostilePrecision:
      predictedHostiles > 0
        ? correctlyClassifiedHostiles / predictedHostiles
        : null,
    hostileTracks,
    leakers,
    leakRate: hostileTracks > 0 ? leakers / hostileTracks : null,
    meanDesignationToClassificationMs: mean(
      designationToClassification
    ),
    meanClassificationToEngagementMs: mean(
      classificationToEngagement
    ),
    roeViolations: events.filter(
      (event) => event.type === 'ROE_VIOLATION'
    ).length,
    snapshotCount,
    groundTruthCoverage,
  };
}

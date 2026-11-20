import type { SimEvent, ScenarioSpec, TrueClass, TrackClass, EffectorId, ZoneSpec } from '@/sim/types';
import type { ReplayEntity } from './ReplayCanvas';
import type {
  AarReplayTruthTrack,
  AarMaskingEventMarker,
  AarEngagementEventMarker,
  AarKeyEvent,
  AarReplayState,
} from './aarReplayTypes';

interface RawSnapshotEntity {
  id: string;
  tNo: string | null;
  x: number;
  y: number;
  z: number;
  step: string;
  q: number;
  lbl: string;
  trueClass: TrueClass;
}

/**
 * Extracts key timeline events for fast scrubber navigation.
 */
export function extractKeyReplayEvents(events: SimEvent[]): AarKeyEvent[] {
  const result: AarKeyEvent[] = [];

  for (const ev of events) {
    if (ev.type === 'ENGAGE') {
      const p = ev.payload as { effector?: string; killed?: boolean; pk?: number };
      result.push({
        seq: ev.seq,
        tMs: ev.tMs,
        type: 'ENGAGE',
        trackNo: ev.trackNo,
        description: `ENGAGE ${p.effector ?? ''} -> ${p.killed ? 'HIT' : 'MISS'} (Pk ${((p.pk ?? 0) * 100).toFixed(0)}%)`,
        badgeClass: p.killed ? 'text-phosphor border-phosphor' : 'text-amber border-amber',
      });
    } else if (ev.type === 'MASKED') {
      const p = ev.payload as { zoneId?: string };
      result.push({
        seq: ev.seq,
        tMs: ev.tMs,
        type: 'MASKED',
        trackNo: ev.trackNo,
        description: `MASKED by ${p.zoneId ?? 'TERRAIN'}`,
        badgeClass: 'text-amber border-amber',
      });
    } else if (ev.type === 'REACQUIRE') {
      const p = ev.payload as { zoneId?: string };
      result.push({
        seq: ev.seq,
        tMs: ev.tMs,
        type: 'REACQUIRE',
        trackNo: ev.trackNo,
        description: `REACQUIRED from ${p.zoneId ?? 'TERRAIN'}`,
        badgeClass: 'text-friend border-friend',
      });
    } else if (ev.type === 'ROE_VIOLATION') {
      const p = ev.payload as { reason?: string };
      result.push({
        seq: ev.seq,
        tMs: ev.tMs,
        type: 'ROE_VIOLATION',
        trackNo: ev.trackNo,
        description: `ROE VIOLATION: ${p.reason ?? ''}`,
        badgeClass: 'text-threat border-threat bg-threat/20',
      });
    } else if (ev.type === 'LEAK') {
      result.push({
        seq: ev.seq,
        tMs: ev.tMs,
        type: 'LEAK',
        trackNo: ev.trackNo,
        description: `LEAK: Penetrated R_min`,
        badgeClass: 'text-threat border-threat font-bold',
      });
    }
  }

  return result.sort((a, b) => a.tMs - b.tMs);
}

function findPrecedingSnapshot(snapshots: SimEvent[], tMs: number): SimEvent {
  let selected = snapshots[0];
  for (const s of snapshots) {
    if (s.tMs <= tMs) {
      selected = s;
    } else {
      break;
    }
  }
  return selected;
}

function getEntityMaskingStatus(
  events: SimEvent[],
  raw: RawSnapshotEntity,
  tMs: number
): { isMasked: boolean; coastingSinceMs: number | null } {
  let isMasked = false;
  let coastingSinceMs: number | null = null;

  for (const ev of events) {
    if (ev.tMs > tMs) break;
    if (ev.trackNo === raw.tNo || ev.entityId === raw.id) {
      if (ev.type === 'MASKED') {
        isMasked = true;
        coastingSinceMs = ev.tMs;
      } else if (ev.type === 'REACQUIRE') {
        isMasked = false;
        coastingSinceMs = null;
      }
    }
  }

  return { isMasked, coastingSinceMs };
}

function collectEntityTrail(
  snapshots: SimEvent[],
  raw: RawSnapshotEntity,
  tMs: number,
  trailDurationMs: number
): Array<{ x: number; y: number; z: number; tMs: number }> {
  const trail: Array<{ x: number; y: number; z: number; tMs: number }> = [];
  const minTrailTMs = Math.max(0, tMs - trailDurationMs);

  for (const s of snapshots) {
    if (s.tMs < minTrailTMs) continue;
    if (s.tMs > tMs) break;
    const entitiesInSnap = (s.payload as { entities: RawSnapshotEntity[] }).entities || [];
    const match = entitiesInSnap.find((e) => e.id === raw.id || (raw.tNo && e.tNo === raw.tNo));
    if (match) {
      trail.push({ x: match.x, y: match.y, z: match.z, tMs: s.tMs });
    }
  }

  return trail;
}

function collectMaskingMarkers(
  events: SimEvent[],
  tMs: number
): { maskingEvents: AarMaskingEventMarker[]; activeMaskingMarker?: AarMaskingEventMarker } {
  const maskingEvents: AarMaskingEventMarker[] = [];
  let activeMaskingMarker: AarMaskingEventMarker | undefined;

  for (const ev of events) {
    if (ev.type === 'MASKED' || ev.type === 'REACQUIRE') {
      const p = ev.payload as { zoneId?: string };
      const marker: AarMaskingEventMarker = {
        type: ev.type,
        tMs: ev.tMs,
        trackNo: ev.trackNo,
        entityId: ev.entityId,
        zoneId: p.zoneId,
        label: `${ev.type === 'MASKED' ? 'LOS SEVERED' : 'LOS RESTORED'} · ${p.zoneId ?? 'ZONE'}`,
      };
      maskingEvents.push(marker);

      // Active indicator window: within 2500ms
      const dt = tMs - ev.tMs;
      if (dt >= 0 && dt <= 2500) {
        activeMaskingMarker = marker;
      }
    }
  }

  return { maskingEvents, activeMaskingMarker };
}

function collectEngagementMarkers(
  events: SimEvent[],
  tMs: number
): { engagements: AarEngagementEventMarker[]; activeEngagement?: AarEngagementEventMarker } {
  const engagements: AarEngagementEventMarker[] = [];
  let activeEngagement: AarEngagementEventMarker | undefined;

  for (const ev of events) {
    if (ev.type === 'ENGAGE') {
      const p = ev.payload as {
        effector?: EffectorId;
        killed?: boolean;
        pk?: number;
        u?: number;
        targetPos?: { x: number; y: number; z: number };
      };

      const marker: AarEngagementEventMarker = {
        tMs: ev.tMs,
        trackNo: ev.trackNo,
        entityId: ev.entityId,
        effector: p.effector ?? 'RF_SOFTKILL',
        killed: p.killed ?? false,
        pk: p.pk ?? 0,
        u: p.u,
        pos: p.targetPos,
      };
      engagements.push(marker);

      const dt = tMs - ev.tMs;
      if (dt >= 0 && dt <= 3000) {
        activeEngagement = marker;
      }
    }
  }

  return { engagements, activeEngagement };
}

/**
 * Pure function to reconstruct complete AAR ground truth and playback state
 * for any scrubbed timestamp from the recorded simulation event stream.
 *
 * Rules:
 * - Only reads recorded events/snapshots; never calls live simulation step() or PRNG.
 * - If snapshot history is missing/insufficient, refuses to fabricate fictional tracks.
 * - Masking markers and zone labels reflect recorded event timestamps.
 */
export function reconstructAarReplayState(
  events: SimEvent[],
  tMs: number,
  spec?: ScenarioSpec,
  trailDurationMs: number = 10000
): AarReplayState {
  const endEvent = events.find((e) => e.type === 'SESSION_END');
  const durationMs =
    (endEvent?.payload as { durationMs?: number })?.durationMs ??
    (spec?.durationMs ?? 120000);

  const zones: ZoneSpec[] = spec?.zones ?? [];
  const keyEvents = extractKeyReplayEvents(events);

  // Extract all SNAPSHOT events
  const snapshots = events.filter((e) => e.type === 'SNAPSHOT' && e.payload?.entities);

  if (snapshots.length === 0) {
    // Insufficient snapshot history: do not fabricate data!
    return {
      tMs,
      durationMs,
      tracks: [],
      maskingEvents: [],
      engagements: [],
      keyEvents,
      hasSnapshotHistory: false,
      zones,
    };
  }

  // Find the snapshot at or immediately preceding tMs
  const selectedSnapshot = findPrecedingSnapshot(snapshots, tMs);
  const rawEntities = (selectedSnapshot.payload as { entities: RawSnapshotEntity[] }).entities || [];

  const tracks: AarReplayTruthTrack[] = rawEntities.map((raw) => {
    const { isMasked, coastingSinceMs } = getEntityMaskingStatus(events, raw, tMs);
    const trail = collectEntityTrail(snapshots, raw, tMs, trailDurationMs);
    const traineeLabel = raw.lbl && raw.lbl !== 'NONE' ? (raw.lbl as TrackClass) : null;
    const matchingSpawn =
      spec?.threats.find((th) => th.id === raw.id) ??
      spec?.decoys?.find((d) => d.id === raw.id);

    return {
      id: raw.id,
      trackNo: raw.tNo,
      truthPos: { x: raw.x, y: raw.y, z: raw.z },
      trueClass: raw.trueClass,
      step: raw.step,
      q: raw.q,
      traineeLabel,
      trail,
      isMasked,
      coastingSinceMs,
      formation: matchingSpawn?.formation,
    };
  });

  const { maskingEvents, activeMaskingMarker } = collectMaskingMarkers(events, tMs);
  const { engagements, activeEngagement } = collectEngagementMarkers(events, tMs);

  return {
    tMs,
    durationMs,
    tracks,
    maskingEvents,
    activeMaskingMarker,
    engagements,
    activeEngagement,
    keyEvents,
    hasSnapshotHistory: true,
    zones,
  };
}

/**
 * Converts reconstructed AAR tracks into ReplayEntity items for 2D ReplayCanvas.
 */
export function convertToReplayEntities(tracks: AarReplayTruthTrack[]): ReplayEntity[] {
  return tracks.map((t) => ({
    id: t.id,
    trackNo: t.trackNo,
    pos: { ...t.truthPos },
    trueClass: t.trueClass,
    traineeLabel: t.traineeLabel === 'NONE' ? null : t.traineeLabel,
    step: t.step,
    masked: t.isMasked,
    q: t.q,
    ghostSigmaM: t.isMasked ? 30 : 0,
  }));
}

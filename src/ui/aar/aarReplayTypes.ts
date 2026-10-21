import type { TrueClass, TrackClass, EffectorId, ZoneSpec, FormationMemberSpec } from '@/sim/types';

/**
 * Post-Session AAR Replay Truth Track.
 *
 * Strict Security Guard (Rules R3.3, R10.3 & Task F7):
 * This interface is strictly limited to post-session AAR debriefing modules (src/ui/aar/** and src/render3d/aarScene3d.ts).
 * Live tactical console and live 3D renderer components MUST NEVER import this interface.
 */
export interface AarReplayTruthTrack {
  id: string;
  trackNo: string | null;
  truthPos: { x: number; y: number; z: number };
  trueClass: TrueClass;
  step: string;
  q: number;
  // Operator classification estimate (from trainee)
  traineeLabel: TrackClass | 'NONE' | null;
  // Trail of recorded historical truth positions within time window (up to 10s)
  trail: Array<{ x: number; y: number; z: number; tMs: number }>;
  isMasked: boolean;
  coastingSinceMs?: number | null;
  ghostSigmaM?: number;
  formation?: FormationMemberSpec;
}

export interface AarMaskingEventMarker {
  type: 'MASKED' | 'REACQUIRE';
  tMs: number;
  trackNo?: string;
  entityId?: string;
  zoneId?: string;
  label: string;
}

export interface AarEngagementEventMarker {
  tMs: number;
  trackNo?: string;
  entityId?: string;
  effector: EffectorId;
  killed: boolean;
  pk: number;
  u?: number;
  pos?: { x: number; y: number; z: number };
}

export interface AarKeyEvent {
  seq: number;
  tMs: number;
  type: string;
  trackNo?: string;
  description: string;
  badgeClass: string;
}

export interface AarReplayState {
  tMs: number;
  durationMs: number;
  tracks: AarReplayTruthTrack[];
  maskingEvents: AarMaskingEventMarker[];
  activeMaskingMarker?: AarMaskingEventMarker;
  engagements: AarEngagementEventMarker[];
  activeEngagement?: AarEngagementEventMarker;
  keyEvents: AarKeyEvent[];
  hasSnapshotHistory: boolean;
  zones: ZoneSpec[];
}

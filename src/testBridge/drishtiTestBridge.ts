import type { SimEngine, SensorHealthStatus } from '@/sim/engine';
import type { Renderer3D } from '@/render3d';
import type { SensorMode, TrackClass, ChaosSpec } from '@/sim/types';
import type { TargetModelCategory } from '@/render3d/targets/targetModelTypes';

export interface DrishtiPresentationRecord {
  trackNo: string;
  currentCategory: TargetModelCategory;
  meshUuid?: string;
  observation?: {
    sensorSource: string;
    timestampMs: number;
    confidence: number;
    resolutionLevel: string;
    visibilityState: string;
    sensorHealth: string;
    sensorAvailability: boolean;
  } | null;
}

export interface DrishtiTestBridge {
  isReady: () => boolean;
  getTrackList: () => Array<{ trackNo: string; pos: { x: number; y: number; z: number }; masked?: boolean }>;
  positionTrack: (trackNo: string, pos: { x: number; y: number; z: number }) => boolean;
  setSensorCondition: (condition: { sensor: SensorMode; health: SensorHealthStatus }) => boolean;
  setSimChaos: (chaosList: ChaosSpec[]) => boolean;
  classifyTrack: (trackNo: string, label: TrackClass) => boolean;
  getTrackScreenCoords: (trackNo: string) => { clientX: number; clientY: number } | null;
  getPresentationState: (trackNo?: string) => {
    trackCount: number;
    allAreRadarSymbols: boolean;
    tracks: DrishtiPresentationRecord[];
  };
  getSensorHealth: () => Record<SensorMode, SensorHealthStatus>;
  getEffectiveSensorHealth: (simMs: number) => Record<SensorMode, SensorHealthStatus>;
  inspectOperatorFacingData: () => {
    hasLeaks: boolean;
    leakedProperties: string[];
  };
}

declare global {
  interface Window {
    __DRISHTI_TEST__?: DrishtiTestBridge | null;
  }
}

/**
 * Installs the strictly isolated E2E-only test bridge.
 * In a production build, __DRISHTI_E2E_BUILD__ is false, so this entire function is dead code eliminated.
 */
export function installDrishtiTestBridge(
  engine: SimEngine,
  getRenderer3D: () => Renderer3D | null
): () => void {
  if (typeof __DRISHTI_E2E_BUILD__ === 'undefined' || !__DRISHTI_E2E_BUILD__) {
    return () => {};
  }

  if (typeof window === 'undefined') {
    return () => {};
  }

  const bridge: DrishtiTestBridge = {
    isReady(): boolean {
      const r3d = getRenderer3D();
      return !!r3d && !!r3d.getCurrentTracks();
    },

    getTrackList(): Array<{ trackNo: string; pos: { x: number; y: number; z: number }; masked?: boolean }> {
      return engine.curr
        .filter((e) => e.trackNo && e.lifecycle === 'ACTIVE')
        .map((e) => ({
          trackNo: e.trackNo!,
          pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          masked: e.masked,
        }));
    },

    positionTrack(trackNo: string, pos: { x: number; y: number; z: number }): boolean {
      if (!trackNo || typeof trackNo !== 'string') return false;
      if (
        !pos ||
        typeof pos.x !== 'number' ||
        typeof pos.y !== 'number' ||
        typeof pos.z !== 'number' ||
        !Number.isFinite(pos.x) ||
        !Number.isFinite(pos.y) ||
        !Number.isFinite(pos.z)
      ) {
        return false;
      }

      const entity = engine.curr.find((e) => e.trackNo === trackNo);
      if (!entity) return false;

      entity.pos = { x: pos.x, y: pos.y, z: pos.z };
      entity.prev = { x: pos.x, y: pos.y, z: pos.z };
      entity.vel = { x: 0, y: 0, z: 0 };
      entity.masked = false;
      entity.q = 0.95;
      return true;
    },

    setSensorCondition(condition: { sensor: SensorMode; health: SensorHealthStatus }): boolean {
      if (!condition || !['RADAR', 'EOIR', 'RF'].includes(condition.sensor)) return false;
      if (!['OK', 'DEG', 'OUT'].includes(condition.health)) return false;

      engine.baselineSensorHealth[condition.sensor] = condition.health;
      const currentSimMs = engine.tickIndex * 50;
      engine.sensorHealth = engine.getEffectiveSensorHealth(currentSimMs);
      return true;
    },

    setSimChaos(chaosList: ChaosSpec[]): boolean {
      if (!Array.isArray(chaosList)) return false;
      for (const c of chaosList) {
        if (!['FOG', 'JAMMING', 'RAIN', 'RADAR_DROPOUT'].includes(c.type)) return false;
        if (typeof c.tStartMs !== 'number' || typeof c.tEndMs !== 'number') return false;
      }

      if (engine.spec) {
        engine.spec.chaos = [...chaosList];
      }
      const currentSimMs = engine.tickIndex * 50;
      engine.sensorHealth = engine.getEffectiveSensorHealth(currentSimMs);
      return true;
    },

    classifyTrack(trackNo: string, label: TrackClass): boolean {
      if (!trackNo || typeof trackNo !== 'string') return false;
      const validLabels: TrackClass[] = [
        'HOSTILE_ATTACK',
        'HOSTILE_ISR',
        'SWARM_ELEMENT',
        'CIVIL_UAS',
        'BIRD',
        'FRIENDLY',
        'UNKNOWN_EVIDENCE_INSUFFICIENT',
      ];
      if (!validLabels.includes(label)) return false;

      const entity = engine.curr.find((e) => e.trackNo === trackNo);
      if (!entity) return false;
      entity.traineeLabel = label;
      entity.tCls ??= engine.tickIndex * 50;
      return true;
    },

    getTrackScreenCoords(trackNo: string): { clientX: number; clientY: number } | null {
      const r3d = getRenderer3D();
      return r3d?.getTrackScreenCoords(trackNo) ?? null;
    },

    getPresentationState(trackNo?: string): {
      trackCount: number;
      allAreRadarSymbols: boolean;
      tracks: DrishtiPresentationRecord[];
    } {
      const r3d = getRenderer3D();
      if (!r3d) {
        return { trackCount: 0, allAreRadarSymbols: false, tracks: [] };
      }

      const trackData = r3d.getCurrentTracks();
      if (!trackData) {
        return { trackCount: 0, allAreRadarSymbols: false, tracks: [] };
      }

      const { tracks } = trackData;
      r3d.update(tracks, null);
      const scene3d = r3d.getScene3D();

      const candidateTracks = trackNo
        ? tracks.filter((t) => t.trackNo === trackNo)
        : tracks;

      const records: DrishtiPresentationRecord[] = candidateTracks.map((t) => {
        const rec = scene3d.getTrackRecord(t.trackNo);
        const obs = t.sensorObservation;
        return {
          trackNo: t.trackNo,
          currentCategory: rec?.currentCategory ?? 'UNKNOWN',
          meshUuid: rec?.bodyMesh?.geometry?.uuid,
          observation: obs
            ? {
                sensorSource: obs.sensorSource,
                timestampMs: obs.timestampMs,
                confidence: obs.confidence,
                resolutionLevel: obs.resolutionLevel ?? obs.resolution ?? 'UNRESOLVED',
                visibilityState: obs.visibilityState,
                sensorHealth: obs.sensorHealth,
                sensorAvailability: obs.sensorAvailability,
              }
            : null,
        };
      });

      const allAreRadarSymbols =
        records.length > 0 && records.every((r) => r.currentCategory === 'RADAR_SYMBOL');

      return {
        trackCount: records.length,
        allAreRadarSymbols,
        tracks: records,
      };
    },

    getSensorHealth(): Record<SensorMode, SensorHealthStatus> {
      return { ...engine.sensorHealth };
    },

    getEffectiveSensorHealth(simMs: number): Record<SensorMode, SensorHealthStatus> {
      return engine.getEffectiveSensorHealth(simMs);
    },

    inspectOperatorFacingData(): { hasLeaks: boolean; leakedProperties: string[] } {
      const leaked: string[] = [];
      const forbiddenProps = ['trueClass', 'droneType', 'valueInr', 'rcsM2', 'waypoints', 'baseRcsM2', 'killDraw'];

      const r3d = getRenderer3D();
      if (r3d) {
        const trackData = r3d.getCurrentTracks();
        if (trackData) {
          for (const t of trackData.tracks) {
            for (const prop of forbiddenProps) {
              if (prop in t || Object.prototype.hasOwnProperty.call(t, prop)) {
                leaked.push(`SafeTrackView.${t.trackNo}.${prop}`);
              }
            }
          }
        }
      }

      const snapshot = engine.buildUiSnapshot();
      for (const row of snapshot.trackRows) {
        for (const prop of forbiddenProps) {
          if (prop in row || Object.prototype.hasOwnProperty.call(row, prop)) {
            leaked.push(`trackRow.${row.trackNo}.${prop}`);
          }
        }
      }

      return {
        hasLeaks: leaked.length > 0,
        leakedProperties: leaked,
      };
    },
  };

  window.__DRISHTI_TEST__ = bridge;

  return () => {
    if (window.__DRISHTI_TEST__ === bridge) {
      window.__DRISHTI_TEST__ = null;
    }
  };
}

import type { SimEngine, SensorHealthStatus } from '@/sim/engine';
import { TrackEstimator } from '@/sim/tracker';
import type { Renderer3D } from '@/render3d';
import type { SensorMode, TrackClass, ChaosSpec } from '@/sim/types';
import type { TargetModelCategory } from '@/render3d/targets/targetModelTypes';
import type { ApprovedSensorObservation } from '@/sim/sensorObservation';
import { evaluateSensorObservation } from '@/sim/sensorObservation';
import { useSessionStore } from '@/store/sessionStore';
import { db, DrishtiDatabase } from '@/db/dexie';
import Dexie from 'dexie';
import { setMockPersistenceFailureMode } from '@/db/recorder';
import { importSessionJson, stableJson, sha256 } from '@/db/aarTransfer';
import { computeScenarioSnapshotHash } from '@/sim/snapshotHash';
import { CONFIG_HASH } from '@/config';
import { loadCatalogScenario } from '@/director/catalog';
import { aggregateAARMetrics } from '@/sim/metrics';
import {
  getTraineeDifficulty,
  getTraineeProfile,
  setMockProgressionTxFailure,
  saveCompletedSession,
  getProgressionLogEntry,
} from '@/db/sessionRepo';

export type SimTimeOverride = number | 'MISSING' | 'INVALID' | null;

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
  estRangeM?: number;
  estBearingDeg?: number;
  estSpeedMs?: number;
  uncertaintyM?: number;
  isCoasting?: boolean;
}

export interface TrackEstimateOverride {
  estPos?: { x: number; y: number; z: number };
  estVel?: { x: number; y: number; z: number };
  estRangeM?: number;
  estBearingDeg?: number;
  estSpeedMps?: number;
  uncertaintyM?: number;
  isCoasting?: boolean;
}

function isValidVector3Like(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  const v = val as Record<string, unknown>;
  return (
    typeof v.x === 'number' &&
    Number.isFinite(v.x) &&
    typeof v.y === 'number' &&
    Number.isFinite(v.y) &&
    typeof v.z === 'number' &&
    Number.isFinite(v.z)
  );
}

function isValidPositiveNumber(val: unknown): boolean {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

export function isValidTrackEstimateOverride(override: unknown): override is TrackEstimateOverride {
  if (!override || typeof override !== 'object') return false;
  const ovr = override as Record<string, unknown>;

  if ('estPos' in ovr && ovr.estPos !== undefined && !isValidVector3Like(ovr.estPos)) return false;
  if ('estVel' in ovr && ovr.estVel !== undefined && !isValidVector3Like(ovr.estVel)) return false;
  if ('estRangeM' in ovr && ovr.estRangeM !== undefined && !isValidPositiveNumber(ovr.estRangeM)) return false;
  if ('estBearingDeg' in ovr && ovr.estBearingDeg !== undefined && (typeof ovr.estBearingDeg !== 'number' || !Number.isFinite(ovr.estBearingDeg))) return false;
  if ('estSpeedMps' in ovr && ovr.estSpeedMps !== undefined && !isValidPositiveNumber(ovr.estSpeedMps)) return false;
  if ('uncertaintyM' in ovr && ovr.uncertaintyM !== undefined && !isValidPositiveNumber(ovr.uncertaintyM)) return false;
  if ('isCoasting' in ovr && ovr.isCoasting !== undefined && typeof ovr.isCoasting !== 'boolean') return false;

  return true;
}

export interface DrishtiTestBridge {
  isReady: () => boolean;
  getTrackList: () => Array<{ trackNo: string; pos: { x: number; y: number; z: number }; masked?: boolean }>;
  getSanitizedTrackPositions?: () => Array<{ trackNo: string; pos: { x: number; y: number; z: number } }>;
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
  getOperatorTracks: () => import('@/sim/trackerTypes').OperatorTrackView[];
  getRfMeasurements: () => import('@/sim/measurementTypes').RfMeasurement[];
  advanceToSessionEnd: () => boolean;
  isSessionEnded: () => boolean;
  getSessionStatus: () => string;
  getRecordedSnapshots: () => Array<{
    tMs: number;
    entities: Array<{
      id: string;
      tNo: string | null;
      x: number;
      y: number;
      z: number;
      estX?: number;
      estY?: number;
      estZ?: number;
      estUncertM?: number;
      isCoasting?: boolean;
    }>;
  }>;
  setSensorHealthOverride: (health: Record<string, unknown> | null) => boolean;
  setProducerHealthOverride: (health: Record<string, unknown> | null | undefined) => boolean;
  setSimTimeOverride: (timeOverride: SimTimeOverride) => boolean;
  injectObservationOverride: (trackNo: string, obs: Partial<ApprovedSensorObservation> | null) => boolean;
  overrideTrackEstimate: (trackNo: string, estimate: TrackEstimateOverride | null) => boolean;
  clearOverrides: () => void;
  getRecordedEvents: () => import('@/sim/types').SimEvent[];
  testDexieImport: (payloadJson: string) => Promise<import('@/db/aarTransfer').AARImportResult>;
  getDexieEventsCount: (sessionUid: string) => Promise<number>;
  clearDexieEvents: (sessionUid: string) => Promise<void>;
  getDexieSessions: () => Promise<import('@/db/dexie').SessionRow[]>;
  getDexieSession: (uid: string) => Promise<import('@/db/dexie').SessionRow | undefined>;
  getDexieEvents: (sessionUid: string) => Promise<import('@/db/dexie').StoredSimEvent[]>;
  closeDb: () => Promise<void>;
  openAar: () => void;
  setCallsign: (callsign: string) => void;
  getDexieDifficulty: (traineeUidOrCallsign?: string) => Promise<number>;
  getDexieProfile: (traineeUidOrCallsign?: string) => Promise<import('@/sim/types').WeaknessVector | null>;
  getDexieVersion: () => number;
  setMockPersistenceFailureMode: (mode: 'NONE' | 'EVENTS' | 'SESSION' | 'BOTH') => void;
  getPersistenceState: () => {
    status: string;
    hasFailedRow: boolean;
    hasFailedRecorder: boolean;
    latestSavedUid: string | null;
  };
  triggerRetrySave: () => Promise<boolean>;
  createLegacyV1Database: (
    databaseName: string,
    initialData?: {
      units?: import('@/db/dexie').UnitRow[];
      trainees?: import('@/db/dexie').TraineeRow[];
      sessions?: import('@/db/dexie').SessionRow[];
      events?: import('@/db/dexie').StoredSimEvent[];
    }
  ) => Promise<void>;
  openCustomDatabase: (databaseName: string) => Promise<{ verno: number; sessions: import('@/db/dexie').SessionRow[] }>;
  createSignedAarPayload: (sessionUid: string, events: import('@/sim/types').SimEvent[]) => Promise<string>;
  createChecksummedAarPayload: (sessionUid: string, events: import('@/sim/types').SimEvent[]) => Promise<string>;
  computeScenarioSnapshotHash?: (spec: import('@/sim/types').ScenarioSpec) => string;
  getConfigHash?: () => string;
  loadCatalogScenario?: (id: string, seed?: number, difficulty?: number) => { spec: import('@/sim/types').ScenarioSpec };
  aggregateAARMetrics?: (events: import('@/sim/types').SimEvent[], spec: import('@/sim/types').ScenarioSpec) => import('@/sim/types').AARMetrics;
  getActiveEffectsCount?: () => number;
  getRenderer3D?: () => unknown;
  getSimTick?: () => number;
  getSceneTrackModels?: () => Array<{ trackNo: string; category?: string; signature?: string; modelName?: string; labelText?: string }>;
  advanceSimTicks?: (ticks: number) => boolean;
  fireTrack?: (trackNo: string) => void;
  getActiveScenarioSpec?: () => import('@/sim/types').ScenarioSpec | null;
  setMockProgressionTxFailure?: (mode: import('@/db/sessionRepo').MockTransactionFailurePoint) => void;
  resubmitSessionForIdempotencyTest?: (sessionUid: string) => Promise<{
    storedSession: import('@/db/dexie').SessionRow | undefined;
    difficulty: number;
    profile: import('@/sim/types').WeaknessVector | null;
    progressionLog: import('@/db/dexie').ProgressionLogRow | null;
    progressionLogCount: number;
  } | null>;
}

declare global {
  interface Window {
    __DRISHTI_TEST__?: DrishtiTestBridge | null;
  }
}

function get2DPresentationState(
  engine: SimEngine,
  trackNo?: string
): {
  trackCount: number;
  allAreRadarSymbols: boolean;
  tracks: DrishtiPresentationRecord[];
} {
  const opTracks = engine.getOperatorTracks();
  const candidateTracks = trackNo ? opTracks.filter((t) => t.trackNo === trackNo) : opTracks;
  return {
    trackCount: candidateTracks.length,
    allAreRadarSymbols: true,
    tracks: candidateTracks.map((t) => ({
      trackNo: t.trackNo,
      currentCategory: (t.sensorObservation?.signature ? `OBSERVED_${t.sensorObservation.signature}` : 'RADAR_SYMBOL') as TargetModelCategory,
      observation: t.sensorObservation
        ? {
            sensorSource: t.sensorObservation.sensorSource,
            timestampMs: t.sensorObservation.timestampMs,
            confidence: t.sensorObservation.confidence,
            resolutionLevel: t.sensorObservation.resolutionLevel,
            visibilityState: t.sensorObservation.visibilityState,
            sensorHealth: t.sensorObservation.sensorHealth,
            sensorAvailability: t.sensorObservation.sensorAvailability,
          }
        : null,
      estRangeM: t.estRangeM,
      estBearingDeg: t.estBearingDeg,
      estSpeedMs: t.estSpeedMps,
      uncertaintyM: t.uncertaintyM,
      isCoasting: t.isCoasting,
    })),
  };
}

function auditObjectForForbiddenProps(
  target: object,
  targetName: string,
  forbiddenProps: string[],
  leaked: string[]
): void {
  for (const prop of forbiddenProps) {
    if (prop in target || Object.hasOwn(target, prop)) {
      leaked.push(`${targetName}.${prop}`);
    }
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

  let sensorHealthOverride: Record<string, unknown> | null = null;
  let hasProducerHealthOverride = false;
  let producerHealthOverride: Record<string, unknown> | null = null;
  let simTimeOverride: number | 'MISSING' | 'INVALID' | null = null;
  const observationOverrides = new Map<string, Partial<ApprovedSensorObservation> | null>();
  const estimateOverrides = new Map<string, TrackEstimateOverride>();

  const origGetTrackEstimate = TrackEstimator.prototype.getTrackEstimate;
  const origGetOperatorTracks = TrackEstimator.prototype.getOperatorTracks;

  engine.tracker.getTrackEstimate = (tNo: string) => {
    const rawEst = origGetTrackEstimate.call(engine.tracker, tNo);
    if (!rawEst) return undefined;
    const ovr = estimateOverrides.get(tNo);
    if (ovr) {
      return {
        ...rawEst,
        estPos: ovr.estPos ? { ...ovr.estPos } : { ...rawEst.estPos },
        estVel: ovr.estVel ? { ...ovr.estVel } : { ...rawEst.estVel },
        prevEstPos: { ...rawEst.prevEstPos },
        estRangeM: ovr.estRangeM ?? rawEst.estRangeM,
        estBearingDeg: ovr.estBearingDeg ?? rawEst.estBearingDeg,
        estSpeedMps: ovr.estSpeedMps ?? rawEst.estSpeedMps,
        uncertaintyM: ovr.uncertaintyM ?? rawEst.uncertaintyM,
        isCoasting: ovr.isCoasting ?? rawEst.isCoasting,
      };
    }
    return {
      ...rawEst,
      estPos: { ...rawEst.estPos },
      estVel: { ...rawEst.estVel },
      prevEstPos: { ...rawEst.prevEstPos },
    };
  };

  engine.tracker.getOperatorTracks = () => {
    const tracks = origGetOperatorTracks.call(engine.tracker);
    if (estimateOverrides.size === 0 && observationOverrides.size === 0) return tracks;
    return tracks.map((t) => {
      const ovr = estimateOverrides.get(t.trackNo);
      const base = ovr
        ? {
            ...t,
            estPos: ovr.estPos ? { ...ovr.estPos } : { ...t.estPos },
            estVel: ovr.estVel ? { ...ovr.estVel } : { ...t.estVel },
            prevEstPos: { ...t.prevEstPos },
            estRangeM: ovr.estRangeM ?? t.estRangeM,
            estBearingDeg: ovr.estBearingDeg ?? t.estBearingDeg,
            estSpeedMps: ovr.estSpeedMps ?? t.estSpeedMps,
            uncertaintyM: ovr.uncertaintyM ?? t.uncertaintyM,
            isCoasting: ovr.isCoasting ?? t.isCoasting,
          }
        : { ...t };

      if (observationOverrides.has(t.trackNo)) {
        const obsOvr = observationOverrides.get(t.trackNo);
        base.sensorObservation = obsOvr
          ? ({
              ...t.sensorObservation,
              ...obsOvr,
              timestampMs: obsOvr.timestampMs ?? (engine.tickIndex * 50),
            } as ApprovedSensorObservation)
          : null;
      }
      return base;
    });
  };

  const bridge: DrishtiTestBridge = {
    isReady(): boolean {
      const r3d = getRenderer3D();
      if (r3d) {
        return !!r3d.getCurrentTracks();
      }
      return engine.curr.some((e) => e.trackNo && e.lifecycle === 'ACTIVE');
    },

    getTrackList(): Array<{ trackNo: string; pos: { x: number; y: number; z: number }; masked?: boolean }> {
      return engine.curr
        .filter((e) => e.trackNo && (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED'))
        .map((e) => ({
          trackNo: e.trackNo!,
          pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          masked: e.masked,
        }));
    },

    getSanitizedTrackPositions(): Array<{ trackNo: string; pos: { x: number; y: number; z: number } }> {
      const r3d = getRenderer3D();
      const current = r3d?.getCurrentTracks();
      if (!current || !Array.isArray(current.tracks)) return [];
      return current.tracks.map((t) => ({
        trackNo: t.trackNo,
        pos: { x: t.pos.x, y: t.pos.y, z: t.pos.z },
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

      estimateOverrides.set(trackNo, {
        estPos: { x: pos.x, y: pos.y, z: pos.z },
        estVel: { x: 0, y: 0, z: 0 },
      });

      const r3d = getRenderer3D();
      if (r3d) {
        const trackData = r3d.getCurrentTracks();
        if (trackData) {
          const safeTrack = trackData.tracks.find((t) => t.trackNo === trackNo);
          if (safeTrack) {
            safeTrack.pos = { x: pos.x, y: pos.y, z: pos.z };
            safeTrack.masked = false;
            r3d.update(trackData.tracks, trackData.selectedTrackNo);
          }
        }
      }
      return true;
    },

    setSensorCondition(condition: { sensor: SensorMode; health: SensorHealthStatus }): boolean {
      if (!condition?.sensor || !condition?.health) return false;
      if (condition.sensor !== 'RADAR' && condition.sensor !== 'EOIR' && condition.sensor !== 'RF') {
        return false;
      }
      if (condition.health !== 'OK' && condition.health !== 'DEG' && condition.health !== 'OUT') {
        return false;
      }

      engine.baselineSensorHealth[condition.sensor] = condition.health;
      const currentSimMs = engine.tickIndex * 50;
      engine.sensorHealth = engine.getEffectiveSensorHealth(currentSimMs);

      const r3d = getRenderer3D();
      if (r3d) {
        const trackData = r3d.getCurrentTracks();
        if (trackData) {
          r3d.update(trackData.tracks, trackData.selectedTrackNo);
        }
      }
      return true;
    },

    setSimChaos(chaosList: ChaosSpec[]): boolean {
      if (!engine.spec || !Array.isArray(chaosList)) return false;
      engine.spec.chaos = [...chaosList];

      const currentSimMs = engine.tickIndex * 50;
      engine.sensorHealth = engine.getEffectiveSensorHealth(currentSimMs);

      const r3d = getRenderer3D();
      if (r3d) {
        const trackData = r3d.getCurrentTracks();
        if (trackData) {
          r3d.update(trackData.tracks, trackData.selectedTrackNo);
        }
      }
      return true;
    },

    classifyTrack(trackNo: string, label: TrackClass): boolean {
      if (!trackNo) return false;
      const entity = engine.curr.find((e) => e.trackNo === trackNo);
      if (!entity) return false;

      entity.traineeLabel = label;

      const r3d = getRenderer3D();
      if (r3d) {
        const trackData = r3d.getCurrentTracks();
        if (trackData) {
          const safeTrack = trackData.tracks.find((t) => t.trackNo === trackNo);
          if (safeTrack) {
            safeTrack.traineeLabel = label;
            r3d.update(trackData.tracks, trackData.selectedTrackNo);
          }
        }
      }
      return true;
    },

    getTrackScreenCoords(trackNo: string): { clientX: number; clientY: number } | null {
      const r3d = getRenderer3D();
      return r3d?.getTrackScreenCoords(trackNo) ?? null;
    },

    setSensorHealthOverride(health: Record<string, unknown> | null): boolean {
      sensorHealthOverride = health;
      return true;
    },

    setProducerHealthOverride(health: Record<string, unknown> | null | undefined): boolean {
      if (health === undefined) {
        hasProducerHealthOverride = false;
        producerHealthOverride = null;
      } else {
        hasProducerHealthOverride = true;
        producerHealthOverride = health;
      }
      return true;
    },

    setSimTimeOverride(timeOverride: number | 'MISSING' | 'INVALID' | null): boolean {
      simTimeOverride = timeOverride;
      return true;
    },

    injectObservationOverride(trackNo: string, obs: Partial<ApprovedSensorObservation> | null): boolean {
      if (obs === null) {
        observationOverrides.delete(trackNo);
      } else {
        observationOverrides.set(trackNo, obs);
      }
      const r3d = getRenderer3D();
      if (r3d) {
        const cur = r3d.getCurrentTracks();
        if (cur) {
          const patched = cur.tracks.map((t) => {
            if (t.trackNo === trackNo) {
              return {
                ...t,
                sensorObservation: obs
                  ? ({
                      ...t.sensorObservation,
                      ...obs,
                      timestampMs: obs.timestampMs ?? (engine.tickIndex * 50),
                    } as ApprovedSensorObservation)
                  : null,
              };
            }
            return t;
          });
          r3d.update(patched, cur.selectedTrackNo);
        }
      }
      useSessionStore.getState().setUiSnapshot(engine.buildUiSnapshot());
      return true;
    },

    overrideTrackEstimate(trackNo: string, override: TrackEstimateOverride | null): boolean {
      if (!trackNo || typeof trackNo !== 'string') return false;
      if (override === null) {
        estimateOverrides.delete(trackNo);
        useSessionStore.getState().setUiSnapshot(engine.buildUiSnapshot());
        return true;
      }
      if (!isValidTrackEstimateOverride(override)) {
        return false;
      }
      const clonedOverride: TrackEstimateOverride = {
        ...override,
        estPos: override.estPos ? { ...override.estPos } : undefined,
        estVel: override.estVel ? { ...override.estVel } : undefined,
      };
      estimateOverrides.set(trackNo, clonedOverride);
      useSessionStore.getState().setUiSnapshot(engine.buildUiSnapshot());
      return true;
    },

    clearOverrides(): void {
      sensorHealthOverride = null;
      hasProducerHealthOverride = false;
      producerHealthOverride = null;
      simTimeOverride = null;
      observationOverrides.clear();
      estimateOverrides.clear();
      useSessionStore.getState().setUiSnapshot(engine.buildUiSnapshot());
    },

    getPresentationState(trackNo?: string): {
      trackCount: number;
      allAreRadarSymbols: boolean;
      tracks: DrishtiPresentationRecord[];
    } {
      const r3d = getRenderer3D();
      if (!r3d) {
        return get2DPresentationState(engine, trackNo);
      }

      const trackData = r3d.getCurrentTracks();
      if (!trackData) {
        return { trackCount: 0, allAreRadarSymbols: false, tracks: [] };
      }

      const { tracks } = trackData;
      const patchedTracks = tracks.map((t) => {
        if (observationOverrides.has(t.trackNo)) {
          const override = observationOverrides.get(t.trackNo);
          return {
            ...t,
            sensorObservation: override
              ? ({ ...t.sensorObservation, ...override } as ApprovedSensorObservation)
              : null,
          };
        }
        if (hasProducerHealthOverride) {
          const entity = engine.curr.find((e) => e.trackNo === t.trackNo);
          if (entity) {
            const activeSensor = r3d.getActiveSensor?.() ?? 'EOIR';
            const simMs = typeof simTimeOverride === 'number' ? simTimeOverride : (engine.tickIndex * 50);
            const obs = evaluateSensorObservation(entity, {
              activeSensor,
              sensorHealth: producerHealthOverride as unknown as Record<SensorMode, SensorHealthStatus>,
              currentSimMs: simMs,
            });
            return {
              ...t,
              sensorObservation: obs,
            };
          }
        }
        return t;
      });

      const originalHealthProvider = (r3d as unknown as { getSensorHealth?: () => unknown }).getSensorHealth;
      const originalSimTimeProvider = (r3d as unknown as { getSimTime?: () => unknown }).getSimTime;

      try {
        // Apply sensorHealthOverride if present
        if (sensorHealthOverride !== null) {
          (r3d as unknown as { setSensorHealthProvider: (fn: () => unknown) => void }).setSensorHealthProvider(
            () => sensorHealthOverride
          );
        }

        // Apply simTimeOverride if present
        if (simTimeOverride !== null) {
          if (simTimeOverride === 'MISSING') {
            (r3d as unknown as { setSimTimeProvider: (fn?: unknown) => void }).setSimTimeProvider(undefined);
          } else if (simTimeOverride === 'INVALID') {
            (r3d as unknown as { setSimTimeProvider: (fn: () => unknown) => void }).setSimTimeProvider(
              () => ({ simMs: Number.NaN })
            );
          } else if (typeof simTimeOverride === 'number') {
            (r3d as unknown as { setSimTimeProvider: (fn: () => unknown) => void }).setSimTimeProvider(
              () => ({ simMs: simTimeOverride })
            );
          }
        }

        r3d.update(patchedTracks, null);
      } finally {
        if (sensorHealthOverride !== null && originalHealthProvider) {
          (r3d as unknown as { setSensorHealthProvider: (fn: () => unknown) => void }).setSensorHealthProvider(
            originalHealthProvider
          );
        }
        if (simTimeOverride !== null && originalSimTimeProvider) {
          (r3d as unknown as { setSimTimeProvider: (fn?: unknown) => void }).setSimTimeProvider(
            originalSimTimeProvider
          );
        }
      }

      const scene3d = r3d.getScene3D();

      const candidateTracks = trackNo
        ? patchedTracks.filter((t) => t.trackNo === trackNo)
        : patchedTracks;

      const opTracksSnapshot = engine.getOperatorTracks();
      const opTracksLookup = new Map(opTracksSnapshot.map((ot) => [ot.trackNo, ot]));

      const records: DrishtiPresentationRecord[] = candidateTracks.map((t) => {
        const rec = scene3d.getTrackRecord(t.trackNo);
        const obs = t.sensorObservation;
        const opTrack = opTracksLookup.get(t.trackNo);
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
          estRangeM: opTrack?.estRangeM ?? obs?.estimatedRangeM,
          estBearingDeg: opTrack?.estBearingDeg,
          estSpeedMs: opTrack?.estSpeedMps,
          uncertaintyM: opTrack?.uncertaintyM,
          isCoasting: opTrack?.isCoasting,
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
      const forbiddenProps = [
        'trueClass',
        'droneType',
        'valueInr',
        'rcsM2',
        'waypoints',
        'baseRcsM2',
        'killDraw',
        'emitsRf',
        'remoteId',
        'iff',
        'spawnTMs',
        'truePos',
        'trueVelocity',
        'targetPos',
        'pk',
        'u',
        'prob',
        'killProb',
        'spawnSchedule',
        'threatComposition',
        'formation',
        'plannedSpawns',
      ];

      function auditRenderer3DData(): void {
        const r3d = getRenderer3D();
        if (!r3d) return;

        const trackData = r3d.getCurrentTracks();
        if (trackData) {
          for (const t of trackData.tracks) {
            auditObjectForForbiddenProps(t, `SafeTrackView.${t.trackNo}`, forbiddenProps, leaked);
            const rawEntity = engine.curr.find((e) => e.trackNo === t.trackNo);
            if (rawEntity) {
              if (t.pos === rawEntity.pos) leaked.push(`SafeTrackView.${t.trackNo}.posReferenceIdentity`);
              if (t.vel === rawEntity.vel) leaked.push(`SafeTrackView.${t.trackNo}.velReferenceIdentity`);
            }
          }
        }

        if (typeof r3d.getEventsProviderInput === 'function') {
          const live3dEvents = r3d.getEventsProviderInput();
          for (const ev of live3dEvents) {
            const evId = (ev as { id?: string }).id ?? 'ev';
            auditObjectForForbiddenProps(ev, `live3dEvents.${evId}`, forbiddenProps, leaked);
            const p = (ev as { payload?: Record<string, unknown> }).payload;
            if (p) {
              auditObjectForForbiddenProps(p, `live3dEvents.${evId}.payload`, forbiddenProps, leaked);
            }
          }
        }
      }

      function auditUiSnapshotData(): void {
        for (const opt of engine.getOperatorTracks()) {
          auditObjectForForbiddenProps(opt, `OperatorTrackView.${opt.trackNo}`, forbiddenProps, leaked);
        }

        const snapshot = engine.buildUiSnapshot();
        for (const row of snapshot.trackRows) {
          auditObjectForForbiddenProps(row, `trackRow.${row.trackNo}`, forbiddenProps, leaked);
        }

        for (const ev of snapshot.recentEvents) {
          auditObjectForForbiddenProps(ev, `recentEvents.${ev.id}`, forbiddenProps, leaked);
          if (ev.payload) {
            auditObjectForForbiddenProps(ev.payload, `recentEvents.${ev.id}.payload`, forbiddenProps, leaked);
          }
        }
      }

      function auditOperatorFeedbackData(): void {
        const store = useSessionStore.getState();
        const feedbacks = [
          ...(store.activeFeedback ? [store.activeFeedback] : []),
          ...(store.feedbackList || []),
        ];
        for (const fb of feedbacks) {
          auditObjectForForbiddenProps(fb, `feedback.${fb.id}`, forbiddenProps, leaked);
          if (fb.trackNo) {
            const raw = engine.curr.find((e) => e.trackNo === fb.trackNo);
            const est = engine.tracker.getTrackEstimate(fb.trackNo);
            if (raw && est && Math.abs(est.estRangeM - Math.hypot(raw.pos.x, raw.pos.y)) > 15) {
              const rawKmStr = (Math.hypot(raw.pos.x, raw.pos.y) / 1000).toFixed(2);
              if (fb.explanation?.includes(`${rawKmStr} km`)) {
                leaked.push(`feedback.${fb.id}.exactRangeInExplanation`);
              }
              if (fb.measured && String(fb.measured.actual).includes(`${rawKmStr} km`)) {
                leaked.push(`feedback.${fb.id}.exactRangeInMeasured`);
              }
            }
          }
        }
      }

      auditRenderer3DData();
      auditUiSnapshotData();
      auditOperatorFeedbackData();

      return {
        hasLeaks: leaked.length > 0,
        leakedProperties: leaked,
      };
    },

    getOperatorTracks(): import('@/sim/trackerTypes').OperatorTrackView[] {
      return engine.getOperatorTracks();
    },

    getRfMeasurements(): import('@/sim/measurementTypes').RfMeasurement[] {
      return engine.rfMeasurements || [];
    },

    advanceToSessionEnd(): boolean {
      if (!engine.spec) return false;
      const targetTicks = Math.ceil(engine.spec.durationMs / 50);
      while (engine.tickIndex <= targetTicks && !engine.sessionEnded) {
        engine.step();
      }
      useSessionStore.getState().setUiSnapshot(engine.buildUiSnapshot());
      return engine.sessionEnded;
    },

    isSessionEnded(): boolean {
      return engine.sessionEnded;
    },

    getSessionStatus(): string {
      return useSessionStore.getState().sessionStatus;
    },

    getRecordedSnapshots() {
      return engine.events
        .filter((e) => e.type === 'SNAPSHOT' && e.payload?.entities)
        .map((e) => ({
          tMs: e.tMs,
          entities: (e.payload as { entities: Array<{
            id: string;
            tNo: string | null;
            x: number;
            y: number;
            z: number;
            estX?: number;
            estY?: number;
            estZ?: number;
            estUncertM?: number;
            isCoasting?: boolean;
          }> }).entities,
        }));
    },

    getRecordedEvents(): import('@/sim/types').SimEvent[] {
      return engine.events.slice();
    },

    async testDexieImport(payloadJson: string): Promise<import('@/db/aarTransfer').AARImportResult> {
      const file = new File([payloadJson], 'test-session.json', { type: 'application/json' });
      return await importSessionJson(file);
    },

    async getDexieEventsCount(sessionUid: string): Promise<number> {
      if (typeof indexedDB === 'undefined') return 0;
      return await db.events.where('sessionUid').equals(sessionUid).count();
    },

    async clearDexieEvents(sessionUid: string): Promise<void> {
      if (typeof indexedDB === 'undefined') return;
      await db.events.where('sessionUid').equals(sessionUid).delete();
    },

    async getDexieSessions(): Promise<import('@/db/dexie').SessionRow[]> {
      if (typeof indexedDB === 'undefined') return [];
      return await db.sessions.toArray();
    },

    async getDexieSession(uid: string): Promise<import('@/db/dexie').SessionRow | undefined> {
      if (typeof indexedDB === 'undefined') return undefined;
      return await db.sessions.get(uid);
    },

    async getDexieEvents(sessionUid: string): Promise<import('@/db/dexie').StoredSimEvent[]> {
      if (typeof indexedDB === 'undefined') return [];
      return await db.events.where('sessionUid').equals(sessionUid).sortBy('seq');
    },

    async closeDb(): Promise<void> {
      if (typeof indexedDB !== 'undefined') {
        db.close();
      }
    },

    openAar(): void {
      useSessionStore.getState().openAar();
    },

    setCallsign(callsign: string): void {
      useSessionStore.getState().setCallsign(callsign);
    },

    async getDexieDifficulty(traineeUidOrCallsign?: string): Promise<number> {
      return await getTraineeDifficulty(traineeUidOrCallsign ?? useSessionStore.getState().currentCallsign);
    },

    async getDexieProfile(traineeUidOrCallsign?: string): Promise<import('@/sim/types').WeaknessVector | null> {
      return await getTraineeProfile(traineeUidOrCallsign ?? useSessionStore.getState().currentCallsign);
    },

    getDexieVersion(): number {
      return db.verno;
    },

    setMockPersistenceFailureMode(mode: 'NONE' | 'EVENTS' | 'SESSION' | 'BOTH'): void {
      setMockPersistenceFailureMode(mode);
    },

    getPersistenceState() {
      const s = useSessionStore.getState();
      return {
        status: s.sessionPersistenceStatus,
        hasFailedRow: Boolean(s.lastFailedSessionRow),
        hasFailedRecorder: Boolean(s.lastFailedRecorder),
        latestSavedUid: s.latestSavedSessionUid,
      };
    },

    async triggerRetrySave(): Promise<boolean> {
      return await useSessionStore.getState().retrySaveSession();
    },

    async createSignedAarPayload(sessionUid: string, events: import('@/sim/types').SimEvent[]): Promise<string> {
      // Computes unkeyed SHA-256 integrity checksum over canonical JSON representation
      const checksum = await sha256(stableJson({ sessionUid, events }));
      const payload = {
        format: 'drishti-aar-events',
        version: 1,
        sessionUid,
        exportedAt: new Date().toISOString(),
        eventCount: events.length,
        events,
        sha256: checksum,
      };
      return JSON.stringify(payload, null, 2);
    },

    async createLegacyV1Database(
      databaseName: string,
      initialData?: {
        units?: import('@/db/dexie').UnitRow[];
        trainees?: import('@/db/dexie').TraineeRow[];
        sessions?: import('@/db/dexie').SessionRow[];
        events?: import('@/db/dexie').StoredSimEvent[];
      }
    ): Promise<void> {
      const legacyDb = new Dexie(databaseName);
      legacyDb.version(1).stores({
        units: 'uid, name',
        trainees: 'uid, unitUid, &callsign',
        scenarios: 'uid, seed, mode, benchId, createdAt',
        sessions: 'uid, traineeUid, mode, startedAt, [traineeUid+mode+startedAt], [mode+traineeUid+startedAt]',
        trackResults: '++id, sessionUid, [sessionUid+trackNo], trueClass',
        events: '++id, sessionUid, [sessionUid+tMs+seq], [sessionUid+type+tMs]',
        chaosLog: '++id, sessionUid, type',
        traineeProfile: '[traineeUid+metric]',
        difficulty: 'traineeUid',
        settings: 'key',
      });
      await legacyDb.open();
      if (initialData) {
        if (initialData.units) await legacyDb.table('units').bulkPut(initialData.units);
        if (initialData.trainees) await legacyDb.table('trainees').bulkPut(initialData.trainees);
        if (initialData.sessions) await legacyDb.table('sessions').bulkPut(initialData.sessions);
        if (initialData.events) await legacyDb.table('events').bulkPut(initialData.events);
      }
      legacyDb.close();
    },

    async openCustomDatabase(databaseName: string): Promise<{ verno: number; sessions: import('@/db/dexie').SessionRow[] }> {
      const customDb = new DrishtiDatabase(databaseName);
      await customDb.open();
      const verno = customDb.verno;
      const sessions = await customDb.sessions.toArray();
      customDb.close();
      return { verno, sessions };
    },

    async createChecksummedAarPayload(sessionUid: string, events: import('@/sim/types').SimEvent[]): Promise<string> {
      return this.createSignedAarPayload(sessionUid, events);
    },

    computeScenarioSnapshotHash(spec: import('@/sim/types').ScenarioSpec): string {
      return computeScenarioSnapshotHash(spec);
    },

    getConfigHash(): string {
      return CONFIG_HASH;
    },

    loadCatalogScenario(id: string, seed?: number, difficulty?: number) {
      return loadCatalogScenario(id, seed, difficulty);
    },

    aggregateAARMetrics(events: import('@/sim/types').SimEvent[], spec: import('@/sim/types').ScenarioSpec) {
      return aggregateAARMetrics(events, spec);
    },

    getActiveEffectsCount(): number {
      const r3d = getRenderer3D();
      return r3d?.getScene3D()?.engagementEffectManager?.getActiveEffectsCount() ?? 0;
    },

    getRenderer3D(): unknown {
      return getRenderer3D();
    },

    advanceSimTicks(ticks: number): boolean {
      for (let i = 0; i < ticks; i++) {
        if (engine.sessionEnded) break;
        engine.step();
      }
      useSessionStore.getState().setUiSnapshot(engine.buildUiSnapshot());
      const r3d = getRenderer3D();
      if (r3d) {
        const cur = r3d.getCurrentTracks();
        if (cur) {
          r3d.update(cur.tracks, cur.selectedTrackNo);
        }
      }
      return true;
    },

    getSceneTrackModels(): Array<{ trackNo: string; category?: string; signature?: string; modelName?: string; labelText?: string }> {
      const r3d = getRenderer3D();
      if (!r3d) return [];
      return r3d.getScene3D().getAllTrackRecords().map((r) => ({
        trackNo: r.trackNo,
        category: r.currentCategory,
        signature: r.currentSignature,
        modelName: r.targetModelInstance?.group.name,
        labelText: r.currentLabelText,
      }));
    },

    fireTrack(trackNo: string): void {
      useSessionStore.getState().fire(trackNo);
    },

    getActiveScenarioSpec(): import('@/sim/types').ScenarioSpec | null {
      return engine.spec ? (structuredClone(engine.spec) as import('@/sim/types').ScenarioSpec) : null;
    },

    setMockProgressionTxFailure(mode: import('@/db/sessionRepo').MockTransactionFailurePoint): void {
      setMockProgressionTxFailure(mode);
    },

    async resubmitSessionForIdempotencyTest(sessionUid: string) {
      const stored = await db.sessions.get(sessionUid);
      if (!stored) return null;

      const freshCopy: import('@/db/dexie').SessionRow = {
        ...stored,
        progressionApplied: undefined,
      };

      await saveCompletedSession(freshCopy);

      const afterSession = await db.sessions.get(sessionUid);
      const difficulty = await getTraineeDifficulty(stored.traineeUid);
      const profile = await getTraineeProfile(stored.traineeUid);
      const progressionLog = await getProgressionLogEntry(sessionUid);
      const logRows = await db.progressionLog.where('sessionUid').equals(sessionUid).toArray();

      return {
        storedSession: afterSession,
        difficulty,
        profile,
        progressionLog,
        progressionLogCount: logRows.length,
      };
    },

    getSimTick(): number {
      return engine.tickIndex;
    },
  };

  window.__DRISHTI_TEST__ = bridge;

  return () => {
    if (window.__DRISHTI_TEST__ === bridge) {
      delete (engine.tracker as unknown as Record<string, unknown>).getTrackEstimate;
      delete (engine.tracker as unknown as Record<string, unknown>).getOperatorTracks;
      estimateOverrides.clear();
      observationOverrides.clear();
      window.__DRISHTI_TEST__ = null;
    }
  };
}

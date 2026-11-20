import type { SimEngine, SensorHealthStatus } from '@/sim/engine';
import { TrackEstimator } from '@/sim/tracker';
import type { Renderer3D } from '@/render3d';
import type { SensorMode, TrackClass, ChaosSpec } from '@/sim/types';
import type { TargetModelCategory } from '@/render3d/targets/targetModelTypes';
import type { ApprovedSensorObservation } from '@/render3d/types';
import { evaluateSensorObservation } from '@/sim/sensorObservation';
import { useSessionStore } from '@/store/sessionStore';

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

export function isValidTrackEstimateOverride(override: unknown): override is TrackEstimateOverride {
  if (!override || typeof override !== 'object') return false;
  const ovr = override as Record<string, unknown>;

  if ('estPos' in ovr && ovr.estPos !== undefined) {
    const pos = ovr.estPos as Record<string, unknown>;
    if (!pos || typeof pos !== 'object') return false;
    if (typeof pos.x !== 'number' || !Number.isFinite(pos.x)) return false;
    if (typeof pos.y !== 'number' || !Number.isFinite(pos.y)) return false;
    if (typeof pos.z !== 'number' || !Number.isFinite(pos.z)) return false;
  }

  if ('estVel' in ovr && ovr.estVel !== undefined) {
    const vel = ovr.estVel as Record<string, unknown>;
    if (!vel || typeof vel !== 'object') return false;
    if (typeof vel.x !== 'number' || !Number.isFinite(vel.x)) return false;
    if (typeof vel.y !== 'number' || !Number.isFinite(vel.y)) return false;
    if (typeof vel.z !== 'number' || !Number.isFinite(vel.z)) return false;
  }

  if ('estRangeM' in ovr && ovr.estRangeM !== undefined) {
    if (typeof ovr.estRangeM !== 'number' || !Number.isFinite(ovr.estRangeM) || ovr.estRangeM < 0) return false;
  }

  if ('estBearingDeg' in ovr && ovr.estBearingDeg !== undefined) {
    if (typeof ovr.estBearingDeg !== 'number' || !Number.isFinite(ovr.estBearingDeg)) return false;
  }

  if ('estSpeedMps' in ovr && ovr.estSpeedMps !== undefined) {
    if (typeof ovr.estSpeedMps !== 'number' || !Number.isFinite(ovr.estSpeedMps) || ovr.estSpeedMps < 0) return false;
  }

  if ('uncertaintyM' in ovr && ovr.uncertaintyM !== undefined) {
    if (typeof ovr.uncertaintyM !== 'number' || !Number.isFinite(ovr.uncertaintyM) || ovr.uncertaintyM < 0) return false;
  }

  if ('isCoasting' in ovr && ovr.isCoasting !== undefined) {
    if (typeof ovr.isCoasting !== 'boolean') return false;
  }

  return true;
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
  setSimTimeOverride: (timeOverride: number | 'MISSING' | 'INVALID' | null) => boolean;
  injectObservationOverride: (trackNo: string, obs: Partial<ApprovedSensorObservation> | null) => boolean;
  overrideTrackEstimate: (trackNo: string, estimate: TrackEstimateOverride | null) => boolean;
  clearOverrides: () => void;
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
    if (estimateOverrides.size === 0) return tracks;
    return tracks.map((t) => {
      const ovr = estimateOverrides.get(t.trackNo);
      if (!ovr) return t;
      return {
        ...t,
        estPos: ovr.estPos ? { ...ovr.estPos } : { ...t.estPos },
        estVel: ovr.estVel ? { ...ovr.estVel } : { ...t.estVel },
        prevEstPos: { ...t.prevEstPos },
        estRangeM: ovr.estRangeM ?? t.estRangeM,
        estBearingDeg: ovr.estBearingDeg ?? t.estBearingDeg,
        estSpeedMps: ovr.estSpeedMps ?? t.estSpeedMps,
        uncertaintyM: ovr.uncertaintyM ?? t.uncertaintyM,
        isCoasting: ovr.isCoasting ?? t.isCoasting,
      };
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
      if (!condition || !condition.sensor || !condition.health) return false;
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
              ? ({ ...(t.sensorObservation ?? {}), ...override } as ApprovedSensorObservation)
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
              () => ({ simMs: NaN })
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

      const records: DrishtiPresentationRecord[] = candidateTracks.map((t) => {
        const rec = scene3d.getTrackRecord(t.trackNo);
        const obs = t.sensorObservation;
        const opTrack = engine.getOperatorTracks().find((ot) => ot.trackNo === t.trackNo);
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
            const rawEntity = engine.curr.find((e) => e.trackNo === t.trackNo);
            if (rawEntity) {
              if (t.pos === rawEntity.pos) {
                leaked.push(`SafeTrackView.${t.trackNo}.posReferenceIdentity`);
              }
              if (t.vel === rawEntity.vel) {
                leaked.push(`SafeTrackView.${t.trackNo}.velReferenceIdentity`);
              }
            }
          }
        }

        if (typeof r3d.getEventsProviderInput === 'function') {
          const live3dEvents = r3d.getEventsProviderInput();
          for (const ev of live3dEvents) {
            for (const prop of forbiddenProps) {
              if (prop in ev || Object.prototype.hasOwnProperty.call(ev, prop)) {
                leaked.push(`live3dEvents.${(ev as { id?: string }).id}.${prop}`);
              }
            }
            const p = (ev as { payload?: Record<string, unknown> }).payload;
            if (p) {
              for (const prop of forbiddenProps) {
                if (prop in p || Object.prototype.hasOwnProperty.call(p, prop)) {
                  leaked.push(`live3dEvents.${(ev as { id?: string }).id}.payload.${prop}`);
                }
              }
            }
          }
        }
      }

      const opTracks = engine.getOperatorTracks();
      for (const opt of opTracks) {
        for (const prop of forbiddenProps) {
          if (prop in opt || Object.prototype.hasOwnProperty.call(opt, prop)) {
            leaked.push(`OperatorTrackView.${opt.trackNo}.${prop}`);
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

      for (const ev of snapshot.recentEvents) {
        for (const prop of forbiddenProps) {
          if (prop in ev || Object.prototype.hasOwnProperty.call(ev, prop)) {
            leaked.push(`recentEvents.${ev.id}.${prop}`);
          }
          if (ev.payload && (prop in ev.payload || Object.prototype.hasOwnProperty.call(ev.payload, prop))) {
            leaked.push(`recentEvents.${ev.id}.payload.${prop}`);
          }
        }
      }

      // Inspect active operator feedback and feedback history
      const store = useSessionStore.getState();
      const feedbacks = [
        ...(store.activeFeedback ? [store.activeFeedback] : []),
        ...(store.feedbackList || []),
      ];
      for (const fb of feedbacks) {
        for (const prop of forbiddenProps) {
          if (prop in fb || Object.prototype.hasOwnProperty.call(fb, prop)) {
            leaked.push(`feedback.${fb.id}.${prop}`);
          }
        }
        if (fb.trackNo) {
          const raw = engine.curr.find((e) => e.trackNo === fb.trackNo);
          const est = engine.tracker.getTrackEstimate(fb.trackNo);
          if (raw && est && Math.abs(est.estRangeM - Math.hypot(raw.pos.x, raw.pos.y)) > 15) {
            const rawKmStr = (Math.hypot(raw.pos.x, raw.pos.y) / 1000).toFixed(2);
            if (fb.explanation && fb.explanation.includes(`${rawKmStr} km`)) {
              leaked.push(`feedback.${fb.id}.exactRangeInExplanation`);
            }
            if (fb.measured && String(fb.measured.actual).includes(`${rawKmStr} km`)) {
              leaked.push(`feedback.${fb.id}.exactRangeInMeasured`);
            }
          }
        }
      }

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

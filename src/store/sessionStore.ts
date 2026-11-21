import { create } from 'zustand';
import type { UiSnapshot } from '@/sim/engine';
import { SimEngine } from '@/sim/engine';
import { clockInstance } from '@/sim/clock';
import { EventRecorder } from '@/db/recorder';
import { applyTickFor } from '@/sim/inputQueue';
import type {
  ScenarioSpec,
  SensorMode,
  EffectorId,
  TrackClass,
} from '@/sim/types';
import {
  DEFAULT_SCENARIO_ID,
  getScenarioCatalogEntry,
  loadCatalogScenario,
  generateLocalSeed,
} from '@/director/catalog';
import { validate } from '@/director/validate';
import { type OperatorFeedback, createOperatorFeedback } from '@/sim/operatorFeedback';
import { aggregateAARMetrics } from '@/sim/metrics';
import { saveCompletedSession, seedDemoSessionsIfEmpty } from '@/db/sessionRepo';
import type { SessionRow } from '@/db/dexie';

// Global singleton instances of SimEngine and SimClock
export const engineInstance = new SimEngine();
export { clockInstance };
let activeRecorder: EventRecorder | null = null;
let isFinalizingSession = false;

export function getActiveRecorder(): EventRecorder | null {
  return activeRecorder;
}

export function getIsFinalizingSession(): boolean {
  return isFinalizingSession;
}

export type SessionStatus = 'READY' | 'STARTING' | 'RUNNING' | 'COMPLETED' | 'ABORTED';

const initialSnapshot: UiSnapshot = {
  tick: 0,
  simTimeMs: 0,
  formattedClock: 'T+00:00.000',
  activeSensor: 'RADAR',
  selectedTrackNo: null,
  selectedTrack: null,
  trackRows: [],
  sensorHealth: {
    RADAR: 'OK',
    EOIR: 'OK',
    RF: 'OK',
  },
  roeText: 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | UNCLASSIFIED RELEASE = ROE VIOLATION',
  isPaused: false,
  recentEvents: [],
  mode: 'TRAIN',
  difficulty: 0.3,
  activeEffector: 'RF_SOFTKILL',
};

export type SessionPersistenceStatus = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';

export interface SessionState {
  ui: UiSnapshot;
  isSimRunning: boolean;
  sessionStatus: SessionStatus;
  sessionPersistenceStatus: SessionPersistenceStatus;

  isAarOpen: boolean;
  isQuickGuideOpen: boolean;
  isScenarioModalOpen: boolean;
  isBriefingOpen: boolean;
  currentScenarioId: string;
  selectedScenarioId: string;
  simSpeed: number;
  currentCallsign: string;
  latestSavedSessionUid: string | null;
  setCallsign: (callsign: string) => void;

  // Intelligent Operator Feedback
  feedbackList: OperatorFeedback[];
  activeFeedback: OperatorFeedback | null;
  dismissFeedback: (id?: string) => void;

  // Actions pushing onto InputQueue
  designate: (trackNo: string, via?: 'KEY' | 'CLICK') => void;
  classify: (trackNo: string, label: TrackClass) => void;
  selectEffector: (effectorId: EffectorId) => void;
  fire: (trackNo: string) => void;
  assess: (trackNo: string, result: 'KILL' | 'NO_KILL' | 'UNKNOWN') => void;
  setSensor: (mode: SensorMode) => void;
  setEoirAzimuth: (deg: number) => void;
  cycleTrack: (direction: 'NEXT' | 'PREV') => void;
  pause: () => void;
  resume: () => void;
  abortSession: (reason?: string) => void;
  setSpeed: (speed: number) => void;
  openAar: () => void;
  closeAar: () => void;
  openQuickGuide: () => void;
  closeQuickGuide: () => void;
  openScenarioModal: () => void;
  closeScenarioModal: () => void;
  openBriefing: () => void;
  closeBriefing: () => void;

  // Session lifecycle
  selectScenario: (id: string) => void;
  startSession: (scenarioId?: string, customSeed?: number) => Promise<boolean>;
  returnToBriefing: () => void;
  loadScenario: (spec: ScenarioSpec) => Promise<void>;
  loadScenarioById: (id: string, customSeed?: number) => Promise<boolean>;
  restartSession: (options?: { freshSeed?: boolean }) => Promise<boolean>;
  rerunExactSeedSession: () => Promise<boolean>;
  setUiSnapshot: (snapshot: UiSnapshot) => void;
}

function getQuantisedTick(): { tRawMs: number; applyTick: number } | null {
  if (isFinalizingSession || engineInstance.sessionEnded) {
    return null;
  }
  const currentTick = engineInstance.tickIndex;
  const tRawMs = typeof performance !== 'undefined'
    ? clockInstance.getRawMs()
    : currentTick * 50;
  const applyTick = applyTickFor(tRawMs, currentTick);
  return { tRawMs, applyTick };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ui: initialSnapshot,
  isSimRunning: false,
  sessionStatus: 'READY',
  selectedScenarioId: DEFAULT_SCENARIO_ID,
  isBriefingOpen: true,
  isAarOpen: false,
  isQuickGuideOpen: false,
  isScenarioModalOpen: false,
  currentScenarioId: DEFAULT_SCENARIO_ID,
  simSpeed: 1.0,
  currentCallsign: 'VIPER-2',
  latestSavedSessionUid: null,
  sessionPersistenceStatus: 'IDLE',
  setCallsign: (callsign: string) => set({ currentCallsign: callsign }),
  feedbackList: [],
  activeFeedback: null,

  dismissFeedback: (id?: string) => {
    set((state) => {
      if (!id || state.activeFeedback?.id === id) {
        return { activeFeedback: null };
      }
      return {};
    });
  },

  designate: (trackNo: string, via: 'KEY' | 'CLICK' = 'KEY') => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'DESIGNATE', trackNo, via },
    });
  },

  classify: (trackNo: string, label: TrackClass) => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'CLASSIFY', trackNo, label },
    });
  },

  selectEffector: (effectorId: EffectorId) => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'SELECT_EFFECTOR', effectorId },
    });
  },

  fire: (trackNo: string) => {
    const currentSimMs = engineInstance.tickIndex * 50;
    if (!trackNo) {
      const fb = createOperatorFeedback({
        category: 'RELEASE_BLOCKED',
        reasonCode: 'NO_TARGET_SELECTED',
        timestampMs: currentSimMs,
      });
      set((state) => ({
        feedbackList: [fb, ...state.feedbackList].slice(0, 20),
        activeFeedback: fb,
      }));
      return;
    }
    const target = engineInstance.curr.find((e) => e.trackNo === trackNo);
    if (
      target &&
      (target.lifecycle !== 'ACTIVE' || target.step === 'CLOSED' || target.step === 'ASSESS')
    ) {
      const reasonCode =
        target.step === 'ASSESS'
          ? 'DUPLICATE_PENDING_FIRE'
          : target.step === 'CLOSED' || target.lifecycle === 'LEAKED'
            ? 'PNR_VIOLATION'
            : 'INACTIVE_TARGET';
      const est = engineInstance.tracker.getTrackEstimate(trackNo);
      const fb = createOperatorFeedback({
        category: 'RELEASE_BLOCKED',
        reasonCode,
        timestampMs: currentSimMs,
        trackNo,
        effectorId: get().ui.activeEffector,
        rangeM: est?.estRangeM,
      });
      set((state) => ({
        feedbackList: [fb, ...state.feedbackList].slice(0, 20),
        activeFeedback: fb,
      }));
      return;
    }
    if (engineInstance.inputQueue.hasPendingFire(trackNo)) {
      const fb = createOperatorFeedback({
        category: 'RELEASE_BLOCKED',
        reasonCode: 'DUPLICATE_PENDING_FIRE',
        timestampMs: currentSimMs,
        trackNo,
      });
      set((state) => ({
        feedbackList: [fb, ...state.feedbackList].slice(0, 20),
        activeFeedback: fb,
      }));
      return;
    }
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'FIRE', trackNo },
    });
  },

  assess: (trackNo: string, result: 'KILL' | 'NO_KILL' | 'UNKNOWN') => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'ASSESS', trackNo, result },
    });
  },

  setSensor: (mode: SensorMode) => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'SET_SENSOR', mode },
    });
    engineInstance.activeSensor = mode;
    set((s) => ({ ui: { ...s.ui, activeSensor: mode } }));
  },

  setEoirAzimuth: (deg: number) => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'SET_EOIR_AZIMUTH', deg },
    });
  },

  cycleTrack: (direction: 'NEXT' | 'PREV') => {
    const tick = getQuantisedTick();
    if (!tick) return;
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'CYCLE_TRACK', direction },
    });
  },

  pause: () => {
    // No pause permitted in EVAL mode (Rules.md R2.10)
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    const tick = getQuantisedTick();
    if (!tick) return;
    clockInstance.pause();
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'PAUSE' },
    });
    set((s) => ({ ui: { ...s.ui, isPaused: true } }));
  },

  resume: () => {
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    const tick = getQuantisedTick();
    if (!tick) return;
    clockInstance.resume();
    engineInstance.inputQueue.push({
      tRawMs: tick.tRawMs,
      applyTick: tick.applyTick,
      action: { type: 'RESUME' },
    });
    set((s) => ({ ui: { ...s.ui, isPaused: false } }));
  },

  abortSession: (reason: string = 'ABORT') => {
    engineInstance.abort(reason);
    clockInstance.reset();
    set({
      sessionStatus: 'ABORTED',
      isSimRunning: false,
      isAarOpen: true,
      ui: engineInstance.buildUiSnapshot(),
    });
  },

  selectScenario: (id: string) => {
    set({ selectedScenarioId: id });
  },

  startSession: async (scenarioId?: string, customSeed?: number): Promise<boolean> => {
    // Seed initial demo data in the background if the local database is fresh
    void seedDemoSessionsIfEmpty();

    const state = get();
    if (state.sessionStatus === 'STARTING' || isFinalizingSession) {
      console.warn('[SessionStore] Session is already starting.');
      return false;
    }

    if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      console.warn('[SessionStore] Changing scenario mid-EVAL is strictly prohibited.');
      return false;
    }

    const targetId = scenarioId ?? state.selectedScenarioId ?? DEFAULT_SCENARIO_ID;

    try {
      const { spec } = loadCatalogScenario(targetId, customSeed);
      if (!validate(spec)) {
        console.error(`[SessionStore] Refusing to load invalid scenario: ${spec.id}`);
        return false;
      }
      await state.loadScenario(spec);
      return true;
    } catch (err) {
      console.error(`[SessionStore] Failed to start scenario "${targetId}":`, err);
      return false;
    }
  },

  returnToBriefing: () => {
    if (engineInstance.spec && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      engineInstance.abort('RETURN_TO_BRIEFING');
    }
    engineInstance.spec = null;
    engineInstance.sessionEnded = false;
    engineInstance.curr = [];
    engineInstance.prev = [];
    engineInstance.events = [];
    engineInstance.tickIndex = 0;
    engineInstance.selectedTrackNo = null;
    engineInstance.tracker.clear();
    engineInstance.rfMeasurements = [];
    activeRecorder = null;
    clockInstance.reset();
    set({
      sessionStatus: 'READY',
      isSimRunning: false,
      isBriefingOpen: true,
      isAarOpen: false,
      isScenarioModalOpen: false,
      ui: engineInstance.buildUiSnapshot(),
    });
  },

  loadScenario: async (spec: ScenarioSpec): Promise<void> => {
    // Reentrancy guard: prevent concurrent scenario loads while finalization is active
    if (isFinalizingSession) {
      console.warn('[SessionStore] Scenario load already in progress.');
      return;
    }

    // Evaluation check guard: do not permit mid-EVAL scenario modifications
    if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      console.warn('[SessionStore] Changing scenario mid-EVAL is strictly prohibited.');
      return;
    }

    // Fairness check guard: do not load an invalid scenario
    if (!validate(spec)) {
      console.error(`[SessionStore] Refusing to load invalid scenario: ${spec.id}`);
      return;
    }

    isFinalizingSession = true;
    set({ sessionStatus: 'STARTING' });
    clockInstance.pause();

    const isPreviousActive =
      engineInstance.spec !== null &&
      !engineInstance.sessionEnded &&
      engineInstance.tickIndex > 0;

    // Finalize previous session if active using established abort lifecycle
    // Old recorder is intentionally kept connected so SESSION_END and final metrics are recorded.
    if (isPreviousActive) {
      engineInstance.abort('SCENARIO_SWITCH', `Switched to scenario ${spec.id}`);
    }

    // Stop the previous recorder and drain pending writes before starting new session
    if (activeRecorder) {
      try {
        await activeRecorder.stop();
        activeRecorder = null;
        engineInstance.onEvent = null;
        engineInstance.onFeedback = null;
      } catch (error) {
        console.error('[Recorder Error] Failed to persist previous session events:', error);
        isFinalizingSession = false;
        throw error;
      }
    }

    const recorderForSession = new EventRecorder();
    activeRecorder = recorderForSession;

    // Connect this session's recorder before loading the scenario,
    // so that SIM_START is captured too.
    engineInstance.onEvent = (event) => {
      recorderForSession.record(event);

      if (event.type === 'SESSION_END') {
        const isAborted = Boolean(event.payload?.aborted);
        set({
          sessionStatus: isAborted ? 'ABORTED' : 'COMPLETED',
          isSimRunning: false,
        });

        // Persist session to sessionRepo (Rules.md R4.4, Task 20)
        try {
          const currentSpec = engineInstance.spec ?? spec;
          const metrics = aggregateAARMetrics(engineInstance.events, currentSpec);
          const sessionUid = recorderForSession.getSessionUid();
          const sessionRow: SessionRow = {
            uid: sessionUid,
            traineeUid: '',
            mode: engineInstance.mode,
            startedAt: recorderForSession.getStartedAt(),
            durationMs: engineInstance.tickIndex * 50,
            score: metrics.score,
            grade: metrics.grade,
            dStart: currentSpec.difficulty ?? 0.3,
            metrics,
            scenarioId: currentSpec.id,
            aborted: isAborted,
            unverified: false,
          };
          set({ sessionPersistenceStatus: 'SAVING' });
          void (async () => {
            try {
              await saveCompletedSession(sessionRow, get().currentCallsign);
              set({
                latestSavedSessionUid: sessionUid,
                sessionPersistenceStatus: 'SAVED',
              });
            } catch (error) {
              console.error('[SessionStore] Failed to persist session to sessionRepo:', error);
              set({ sessionPersistenceStatus: 'ERROR' });
            }
          })();
        } catch (metricsError) {
          console.error('[SessionStore] Failed to aggregate metrics on SESSION_END:', metricsError);
          set({ sessionPersistenceStatus: 'ERROR' });
        }

        void recorderForSession.stop().catch((error) => {
          console.error('[Recorder] Failed to finish session:', error);
        });
      }
    };

    engineInstance.onFeedback = (feedback) => {
      set((state) => ({
        feedbackList: [feedback, ...state.feedbackList].slice(0, 20),
        activeFeedback: feedback,
      }));
    };

    recorderForSession.start();

    engineInstance.load(spec);
    try {
      await recorderForSession.flush();
    } catch (flushError) {
      console.warn('[Recorder] Initial SIM_START flush delayed; batch retained in buffer:', flushError);
    } finally {
      clockInstance.reset();
      isFinalizingSession = false;
    }

    let scenarioId = spec.id;
    const catalogEntry = getScenarioCatalogEntry(spec.id);
    if (catalogEntry) {
      scenarioId = catalogEntry.id;
    } else if (spec.id.startsWith('PROCEDURAL-')) {
      scenarioId = 'PROCEDURAL-1';
    } else if (spec.id.startsWith('RANDOM-')) {
      scenarioId = 'RANDOM-1';
    }

    set({
      sessionStatus: 'RUNNING',
      currentScenarioId: scenarioId,
      selectedScenarioId: scenarioId,
      isSimRunning: true,
      isBriefingOpen: false,
      isAarOpen: false,
      isScenarioModalOpen: false,
      simSpeed: 1.0,
      ui: engineInstance.buildUiSnapshot(),
    });
  },

  loadScenarioById: async (id: string, customSeed?: number): Promise<boolean> => {
    return await get().startSession(id, customSeed);
  },

  restartSession: async (options?: { freshSeed?: boolean }): Promise<boolean> => {
    if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      console.warn('[SessionStore] Restarting is prohibited mid-EVAL.');
      return false;
    }

    const currentId = get().currentScenarioId || get().selectedScenarioId || DEFAULT_SCENARIO_ID;
    const useFreshSeed = options?.freshSeed !== false;
    const seed = useFreshSeed ? generateLocalSeed() : engineInstance.spec?.seed;

    return await get().startSession(currentId, seed);
  },

  rerunExactSeedSession: async (): Promise<boolean> => {
    if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      console.warn('[SessionStore] Exact-seed rerun is prohibited mid-EVAL.');
      return false;
    }

    const currentId = get().currentScenarioId || get().selectedScenarioId || DEFAULT_SCENARIO_ID;
    const exactSeed = engineInstance.spec?.seed;

    return await get().startSession(currentId, exactSeed);
  },

  setSpeed: (speed: number) => {
    // Speed is strictly locked to 1x in EVAL mode
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    clockInstance.setSpeed(speed);
    set({ simSpeed: speed });
  },

  openAar: () => {
    set({ isAarOpen: true });
  },

  closeAar: () => {
    set({ isAarOpen: false });
  },

  openQuickGuide: () => {
    set({ isQuickGuideOpen: true });
  },

  closeQuickGuide: () => {
    set({ isQuickGuideOpen: false });
  },

  openScenarioModal: () => {
    set({ isScenarioModalOpen: true });
  },

  closeScenarioModal: () => {
    set({ isScenarioModalOpen: false });
  },

  openBriefing: () => {
    set({ isBriefingOpen: true });
  },

  closeBriefing: () => {
    set({ isBriefingOpen: false });
  },

  setUiSnapshot: (snapshot: UiSnapshot) => {
    set({ ui: snapshot });
  },
}));

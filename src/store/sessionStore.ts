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
} from '@/director/catalog';
import { validate } from '@/director/validate';

// Global singleton instances of SimEngine and SimClock
export const engineInstance = new SimEngine();
export { clockInstance };
let activeRecorder: EventRecorder | null = null;

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

export interface SessionState {
  ui: UiSnapshot;
  isSimRunning: boolean;

  isAarOpen: boolean;
  isQuickGuideOpen: boolean;
  isScenarioModalOpen: boolean;
  currentScenarioId: string;
  simSpeed: number;

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

  // Session lifecycle
  loadScenario: (spec: ScenarioSpec) => Promise<void>;
  loadScenarioById: (id: string, customSeed?: number) => Promise<boolean>;
  restartSession: () => Promise<void>;
  setUiSnapshot: (snapshot: UiSnapshot) => void;
}

function getQuantisedTick(): { tRawMs: number; applyTick: number } {
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
  isAarOpen: false,
  isQuickGuideOpen: false,
  isScenarioModalOpen: false,
  currentScenarioId: DEFAULT_SCENARIO_ID,
  simSpeed: 1.0,

  designate: (trackNo: string, via: 'KEY' | 'CLICK' = 'KEY') => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'DESIGNATE', trackNo, via },
    });
  },

  classify: (trackNo: string, label: TrackClass) => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'CLASSIFY', trackNo, label },
    });
  },

  selectEffector: (effectorId: EffectorId) => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'SELECT_EFFECTOR', effectorId },
    });
  },

  fire: (trackNo: string) => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'FIRE', trackNo },
    });
  },

  assess: (trackNo: string, result: 'KILL' | 'NO_KILL' | 'UNKNOWN') => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'ASSESS', trackNo, result },
    });
  },

  setSensor: (mode: SensorMode) => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'SET_SENSOR', mode },
    });
    engineInstance.activeSensor = mode;
    set((s) => ({ ui: { ...s.ui, activeSensor: mode } }));
  },

  setEoirAzimuth: (deg: number) => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'SET_EOIR_AZIMUTH', deg },
    });
  },

  cycleTrack: (direction: 'NEXT' | 'PREV') => {
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'CYCLE_TRACK', direction },
    });
  },

  pause: () => {
    // No pause permitted in EVAL mode (Rules.md R2.10)
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    clockInstance.pause();
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'PAUSE' },
    });
    set((s) => ({ ui: { ...s.ui, isPaused: true } }));
  },

  resume: () => {
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    clockInstance.resume();
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'RESUME' },
    });
    set((s) => ({ ui: { ...s.ui, isPaused: false } }));
  },

  abortSession: (reason: string = 'ABORT') => {
    engineInstance.abort(reason);
    clockInstance.reset();
    set({
      isSimRunning: false,
      isAarOpen: true,
      ui: engineInstance.buildUiSnapshot(),
    });
  },

  loadScenario: async (spec: ScenarioSpec): Promise<void> => {
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

    // Stop the previous recorder and drain pending writes before starting new session
    engineInstance.onEvent = null;

    if (activeRecorder) {
      try {
        await activeRecorder.stop();
      } catch (error) {
        console.error('[Recorder] Failed to finish previous session:', error);
      }
      activeRecorder = null;
    }

    const recorderForSession = new EventRecorder();
    activeRecorder = recorderForSession;

    // Connect this session's recorder before loading the scenario,
    // so that SIM_START is captured too.
    engineInstance.onEvent = (event) => {
      recorderForSession.record(event);

      if (event.type === 'SESSION_END') {
        void recorderForSession.stop().catch((error) => {
          console.error('[Recorder] Failed to finish session:', error);
        });
      }
    };

    recorderForSession.start();

    engineInstance.load(spec);
    clockInstance.reset();

    const catalogEntry = getScenarioCatalogEntry(spec.id);
    const scenarioId = catalogEntry ? catalogEntry.id : (spec.id.startsWith('PROCEDURAL-') ? 'PROCEDURAL-1' : spec.id);

    set({
      currentScenarioId: scenarioId,
      isSimRunning: true,
      isAarOpen: false,
      isScenarioModalOpen: false,
      simSpeed: 1.0,
      ui: engineInstance.buildUiSnapshot(),
    });
  },

  loadScenarioById: async (id: string, customSeed?: number): Promise<boolean> => {
    if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      console.warn('[SessionStore] Changing scenario mid-EVAL is strictly prohibited.');
      return false;
    }

    try {
      const { spec } = loadCatalogScenario(id, customSeed);
      await get().loadScenario(spec);
      return true;
    } catch (err) {
      console.error(`[SessionStore] Failed to load catalog scenario "${id}":`, err);
      return false;
    }
  },

  restartSession: async (): Promise<void> => {
    if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0) {
      console.warn('[SessionStore] Restarting is prohibited mid-EVAL.');
      return;
    }

    const activeSpec = engineInstance.spec;
    if (activeSpec) {
      await get().loadScenario(structuredClone(activeSpec));
    } else {
      await get().loadScenarioById(DEFAULT_SCENARIO_ID);
    }
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

  setUiSnapshot: (snapshot: UiSnapshot) => {
    set({ ui: snapshot });
  },
}));

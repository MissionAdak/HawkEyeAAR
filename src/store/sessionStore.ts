import { create } from 'zustand';
import type { UiSnapshot } from '@/sim/engine';
import { SimEngine } from '@/sim/engine';
import { SimClock } from '@/sim/clock';
import { EventRecorder } from '@/db/recorder';
import type {
  ScenarioSpec,
  SensorMode,
  EffectorId,
  TrackClass,
} from '@/sim/types';

// Global singleton instances of SimEngine and SimClock
export const engineInstance = new SimEngine();
export const clockInstance = new SimClock();
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
  roeText: 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED',
  isPaused: false,
  recentEvents: [],
  mode: 'TRAIN',
  difficulty: 0.3,
  activeEffector: 'RF_SOFTKILL',
};

export interface SessionState {
  ui: UiSnapshot;
  isSimRunning: boolean;

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

  // Session lifecycle
  loadScenario: (spec: ScenarioSpec) => void;
  setUiSnapshot: (snapshot: UiSnapshot) => void;
}

function getQuantisedTick(): { tRawMs: number; applyTick: number } {
  const currentTick = engineInstance.tickIndex;
  const tRawMs = typeof performance !== 'undefined'
    ? clockInstance.getRawMs()
    : currentTick * 50;
  const applyTick = Math.max(Math.ceil(tRawMs / 50), currentTick + 1);
  return { tRawMs, applyTick };
}

export const useSessionStore = create<SessionState>((set) => ({
  ui: initialSnapshot,
  isSimRunning: false,

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
    clockInstance.resume();
    const { tRawMs, applyTick } = getQuantisedTick();
    engineInstance.inputQueue.push({
      tRawMs,
      applyTick,
      action: { type: 'RESUME' },
    });
    set((s) => ({ ui: { ...s.ui, isPaused: false } }));
  },

  loadScenario: (spec: ScenarioSpec) => {
  // Stop the previous recorder and preserve its pending events.
  engineInstance.onEvent = null;

  if (activeRecorder) {
    void activeRecorder.stop().catch((error) => {
      console.error('[Recorder] Failed to finish previous session:', error);
    });
  }

  // Create a unique ID for this simulation session.
  const sessionUid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const recorderForSession = new EventRecorder(sessionUid);
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

  set({
    isSimRunning: true,
    ui: engineInstance.buildUiSnapshot(),
  });
},

  setUiSnapshot: (snapshot: UiSnapshot) => {
    set({ ui: snapshot });
  },
}));

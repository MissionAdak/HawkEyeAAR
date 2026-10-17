/**
 * DRISHTI-CUAS Zustand Session Store Facade
 *
 * Rules: R-5, DT-1, DT-4
 * Store facade with action stubs that push to inputQueue.
 * uiSnapshot is capped at 150 rows.
 * Dispatching actions leaves sim state untouched until the next tick.
 */

import { create } from 'zustand';
import type { SimEngine, UiSnapshot } from '../sim/engine';
import type { TrackClass } from '../sim/taxonomy';
import type { EffectorId, SensorMode } from '../sim/types';

const INITIAL_SNAPSHOT: UiSnapshot = {
  tick: 0,
  simTimeMs: 0,
  sensorMode: 'RADAR',
  selectedTrackNo: null,
  activeEffector: null,
  tracks: [],
  sensorHealth: {
    radar: 'OK',
    eoir: 'OK',
    rf: 'OK',
  },
  recentEvents: [],
  roeBanner: 'WEAPONS TIGHT URBAN | HOLD FIRE CIVIL | NO RELEASE ON UNCLASSIFIED',
  isComplete: false,
  isPaused: false,
};

export interface SessionStoreState {
  ui: UiSnapshot;
  engine: SimEngine | null;

  // Actions pushed to inputQueue (never mutate state directly)
  setEngine: (engine: SimEngine) => void;
  syncSnapshot: (snapshot: UiSnapshot) => void;

  designate: (trackNo: string, via?: 'KEY' | 'CLICK') => void;
  classify: (trackNo: string, label: TrackClass) => void;
  selectEffector: (effector: EffectorId | null) => void;
  fire: (trackNo: string, effector: EffectorId) => void;
  assess: (trackNo: string, result: 'KILL' | 'NO_KILL' | 'UNKNOWN') => void;
  setSensor: (mode: SensorMode) => void;
  pause: () => void;
  resume: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  ui: INITIAL_SNAPSHOT,
  engine: null,

  setEngine: (engine: SimEngine) => {
    set({ engine, ui: engine.snapshot() });
  },

  syncSnapshot: (snapshot: UiSnapshot) => {
    set({ ui: snapshot });
  },

  designate: (trackNo: string, via = 'KEY') => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'DESIGNATE', trackNo, via },
      ui.simTimeMs,
      ui.tick
    );
  },

  classify: (trackNo: string, label: TrackClass) => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'CLASSIFY', trackNo, label },
      ui.simTimeMs,
      ui.tick
    );
  },

  selectEffector: (effector: EffectorId | null) => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'SELECT_EFFECTOR', effector },
      ui.simTimeMs,
      ui.tick
    );
  },

  fire: (trackNo: string, effector: EffectorId) => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'ENGAGE', trackNo, effector },
      ui.simTimeMs,
      ui.tick
    );
  },

  assess: (trackNo: string, result: 'KILL' | 'NO_KILL' | 'UNKNOWN') => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'ASSESS', trackNo, result },
      ui.simTimeMs,
      ui.tick
    );
  },

  setSensor: (mode: SensorMode) => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'SENSOR_SWITCH', mode },
      ui.simTimeMs,
      ui.tick
    );
  },

  pause: () => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'PAUSE' },
      ui.simTimeMs,
      ui.tick
    );
  },

  resume: () => {
    const { engine, ui } = get();
    if (!engine) return;
    engine.inputQueue.push(
      { type: 'RESUME' },
      ui.simTimeMs,
      ui.tick
    );
  },
}));

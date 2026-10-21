import { useEffect } from 'react';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import type { SensorMode } from '@/sim/types';
import { CLASSES, type TrackClass } from '@/sim/taxonomy';
import type { ConsoleRenderer } from '@/render/renderer';

const SENSOR_KEY_MAP: Record<string, SensorMode> = {
  '1': 'RADAR',
  '2': 'EOIR',
  '3': 'RF',
};

function handleSensorKey(key: string): boolean {
  const sensor = SENSOR_KEY_MAP[key];
  if (!sensor) return false;
  useSessionStore.getState().setSensor(sensor);
  return true;
}

function handleNavigationKey(e: KeyboardEvent): boolean {
  if (e.key === 'Tab') {
    e.preventDefault();
    useSessionStore.getState().cycleTrack(e.shiftKey ? 'PREV' : 'NEXT');
    return true;
  }
  if (e.key === ' ') {
    e.preventDefault();
    const track = useSessionStore.getState().ui.selectedTrack;
    if (track) {
      useSessionStore.getState().designate(track.trackNo, 'KEY');
    } else {
      useSessionStore.getState().cycleTrack('NEXT');
    }
    return true;
  }
  return false;
}

function handleEngagementKey(key: string, isRepeat: boolean): boolean {
  const track = useSessionStore.getState().ui.selectedTrack;
  if (!track) return false;

  const store = useSessionStore.getState();
  if (key === 'f') {
    if (!isRepeat) store.fire(track.trackNo);
    return true;
  }
  if (key === 'c') {
    const currentIdx = CLASSES.indexOf(track.label as TrackClass);
    const nextClass = CLASSES[(currentIdx + 1) % CLASSES.length];
    store.classify(track.trackNo, nextClass);
    return true;
  }
  if (key === 'a') {
    store.assess(track.trackNo, 'KILL');
    return true;
  }
  return false;
}

function handleEscapeKey(): void {
  const store = useSessionStore.getState();
  if (engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded) {
    if (window.confirm('ABORT EVALUATION SESSION? (Session will be marked aborted and excluded from performance aggregates)')) {
      store.abortSession('USER_ABORT');
    }
    return;
  }
  store.closeQuickGuide();
  store.closeAar();
  store.closeScenarioModal();
}

function handlePauseKey(): void {
  if (engineInstance.mode === 'EVAL') return;
  const store = useSessionStore.getState();
  if (store.ui.isPaused) {
    store.resume();
  } else {
    store.pause();
  }
}

export interface ConsoleKeyboardActions {
  toggleLowFi?: () => void;
  toggle3D?: () => void;
  setCameraPreset?: (preset: 'OBLIQUE' | 'TOP' | 'POST') => void;
  toggleEnvelopes?: () => void;
  toggleLos?: () => void;
  toggleClusters?: () => void;
  toggleTrainingAid?: () => void;
}

function handlePresetKey(
  lowerKey: string,
  setPreset?: (preset: 'OBLIQUE' | 'TOP' | 'POST') => void
): boolean {
  if (!setPreset) return false;
  if (lowerKey === 'o') {
    setPreset('OBLIQUE');
    return true;
  }
  if (lowerKey === 't') {
    setPreset('TOP');
    return true;
  }
  return false;
}

function handleSystemKey(
  lowerKey: string,
  rawKey: string,
  actions: ConsoleKeyboardActions
): boolean {
  const store = useSessionStore.getState();
  if (lowerKey === 'm') {
    store.openAar();
    return true;
  }
  if (lowerKey === 'h' || rawKey === '?') {
    store.openQuickGuide();
    return true;
  }
  if (lowerKey === 's') {
    if (engineInstance.mode !== 'EVAL' || engineInstance.sessionEnded) {
      store.openScenarioModal();
    }
    return true;
  }
  if (rawKey === 'Escape') {
    handleEscapeKey();
    return true;
  }
  if (lowerKey === 'p') {
    handlePauseKey();
    return true;
  }
  if (lowerKey === 'l') {
    actions.toggleLowFi?.();
    return true;
  }
  if (lowerKey === 'v') {
    actions.toggle3D?.();
    return true;
  }
  if (lowerKey === 'e') {
    actions.toggleEnvelopes?.();
    return true;
  }
  if (lowerKey === 'k') {
    actions.toggleLos?.();
    return true;
  }
  if (lowerKey === 'u') {
    actions.toggleClusters?.();
    return true;
  }
  if (lowerKey === 'x') {
    if (engineInstance.mode !== 'EVAL') {
      actions.toggleTrainingAid?.();
    }
    return true;
  }
  return handlePresetKey(lowerKey, actions.setCameraPreset);
}

export function useConsoleKeyboard(
  rendererRef: React.RefObject<ConsoleRenderer | null>,
  setLowFi: React.Dispatch<React.SetStateAction<boolean>>,
  actions: ConsoleKeyboardActions = {}
): void {
  useEffect(() => {
    const toggleLowFi = () => {
      setLowFi((prev) => {
        const next = !prev;
        rendererRef.current?.setLowFidelity(next);
        return next;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (handleSensorKey(e.key) || handleNavigationKey(e)) {
        return;
      }
      const lower = e.key.toLowerCase();
      if (handleEngagementKey(lower, e.repeat)) {
        return;
      }
      handleSystemKey(lower, e.key, { ...actions, toggleLowFi });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rendererRef, setLowFi, actions]);
}

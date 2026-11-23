import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { TrackTable } from './TrackTable';
import { EngagementPanel } from './EngagementPanel';
import { EventLog } from './EventLog';
const HotWash = React.lazy(() => import('./HotWash').then((m) => ({ default: m.HotWash })));
import { QuickGuide } from './QuickGuide';
import { ScenarioModal } from './ScenarioModal';
import { WebXrComfortModal } from './WebXrComfortModal';
import { CrossSectionPanel } from './CrossSectionPanel';
import { MissionBriefing } from './MissionBriefing';
import { ErrorBoundary } from './ErrorBoundary';
import { EnvironmentInspector } from './EnvironmentInspector';
import { OperatorFeedbackToast } from './OperatorFeedbackToast';
import type { OperatorFeedback } from '@/sim/operatorFeedback';
import { TargetRecognitionModal } from './TargetRecognitionModal';
import { ConsoleRenderer } from '@/render/renderer';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import type { SensorMode } from '@/sim/types';
import type { OperatorTrackView } from '@/sim/trackerTypes';
import type { SafeTrackView, CameraPreset, EnvironmentObjectInfo, TargetDisplayMode } from '@/render3d/types';
import type { Renderer3D, WebXRManager } from '@/render3d';
import { CONFIG } from '@/config';
import { useConsoleKeyboard } from './useConsoleKeyboard';
import { installDrishtiTestBridge } from '@/testBridge/drishtiTestBridge';
import { getTraineeDifficulty } from '@/db/sessionRepo';

/**
 * Redacts raw simulation ground truth before passing tracks to 3D visualization (Rule R10.3, D-37 & Task 18 §2.C).
 * Filters out undetected tracks and strictly excludes all truth properties:
 * (trueClass, droneType, valueInr, hidden waypoints, secret composition, seeded kill draws).
 * Positions and velocities are derived purely from estimated tracker state, not raw ground truth.
 */
export function projectSafeTracks(
  tracks: OperatorTrackView[],
  selectedTrackNo: string | null
): SafeTrackView[] {
  return tracks
    .filter(
      (t) =>
        t.trackNo &&
        t.step !== 'UNDETECTED' &&
        (t.lifecycle === 'ACTIVE' || t.lifecycle === 'LEAKED' || t.lifecycle === 'NEUTRALISED')
    )
    .map((t) => ({
      trackNo: t.trackNo,
      pos: { ...t.estPos },
      vel: { ...t.estVel },
      traineeLabel: t.traineeLabel,
      step: t.step,
      q: t.q,
      masked: t.isCoasting,
      ghostSigmaM: t.uncertaintyM,
      isSelected: t.trackNo === selectedTrackNo,
      lifecycle: t.lifecycle,
      sensorObservation: t.sensorObservation ?? null,
    }));
}

function computeCursorCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): { brg: number; rngKm: number } {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const radius = Math.min(cx, cy) - 15;
  const scale = radius / 5000;
  const dx = clientX - rect.left - cx;
  const dy = cy - (clientY - rect.top);

  const rangeM = Math.hypot(dx, dy) / scale;
  const bearingRad = Math.atan2(dx, dy);
  let bearingDeg = Math.round((bearingRad * 180) / Math.PI);
  if (bearingDeg < 0) bearingDeg += 360;

  return { brg: bearingDeg, rngKm: Number((rangeM / 1000).toFixed(2)) };
}

export function findNearestTrackNo(
  clickX: number,
  clickY: number,
  tracks: OperatorTrackView[],
  scale: number = 245 / 5000
): string | null {
  let nearestTrackNo: string | null = null;
  let nearestDist = 15;

  for (const track of tracks) {
    if (!track.trackNo || track.lifecycle !== 'ACTIVE' || track.step === 'UNDETECTED') continue;
    const px = track.estPos.x;
    const py = track.estPos.y;
    const ex = px * scale;
    const ey = py * scale;
    const d = Math.hypot(clickX - ex, clickY - ey);
    if (d < nearestDist) {
      nearestDist = d;
      nearestTrackNo = track.trackNo;
    }
  }

  return nearestTrackNo;
}

interface ThreeDViewportControlsProps {
  cameraPreset: CameraPreset;
  showEnvelopes: boolean;
  showLos: boolean;
  showClusters: boolean;
  showTrainingAid: boolean;
  showCrossSection: boolean;
  targetDisplayMode: TargetDisplayMode;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  onCameraPreset: (p: CameraPreset) => void;
  onToggleEnvelopes: () => void;
  onToggleLos: () => void;
  onToggleClusters: () => void;
  onToggleTrainingAid: () => void;
  onToggleCrossSection: () => void;
  onTargetDisplayMode: (m: TargetDisplayMode) => void;
  onOpenRecogModal: () => void;
}

const ThreeDViewportControls: React.FC<ThreeDViewportControlsProps> = ({
  cameraPreset,
  showEnvelopes,
  showLos,
  showClusters,
  showTrainingAid,
  showCrossSection,
  targetDisplayMode,
  mode,
  onCameraPreset,
  onToggleEnvelopes,
  onToggleLos,
  onToggleClusters,
  onToggleTrainingAid,
  onToggleCrossSection,
  onTargetDisplayMode,
  onOpenRecogModal,
}) => {
  return (
    <>
      {(['OBLIQUE', 'TOP', 'POST'] as const).map((preset) => (
        <button
          key={preset}
          onClick={() => onCameraPreset(preset)}
          className={`px-1.5 py-0.5 text-[8.5px] border transition-colors ${
            cameraPreset === preset
              ? 'border-friend text-friend bg-friend/20 font-bold'
              : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
          }`}
        >
          {preset === 'POST' ? 'POST' : `[${preset[0]}] ${preset}`}
        </button>
      ))}

      {(['AUTO', 'RADAR', 'AIRFRAME'] as const).map((dm) => (
        <button
          key={dm}
          onClick={() => onTargetDisplayMode(dm)}
          title={getTargetDisplayTitle(dm)}
          className={`px-1.5 py-0.5 text-[8.5px] border transition-colors ${
            targetDisplayMode === dm
              ? 'border-amber text-amber bg-amber/20 font-bold'
              : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
          }`}
        >
          {getTargetDisplayLabel(dm)}
        </button>
      ))}

      {mode === 'EVAL' ? (
        <button
          disabled
          title="Target Recognition Guide locked during EVALUATION exercise (Rule F5)"
          className="px-1.5 py-0.5 text-[8.5px] border border-line text-text-dim/40 bg-carbon-950 cursor-not-allowed"
        >
          RECOG (EVAL LOCK)
        </button>
      ) : (
        <button
          onClick={onOpenRecogModal}
          title="Open C-UAS Target Recognition Manual & Threat Taxonomy [M]"
          className="px-1.5 py-0.5 text-[8.5px] border border-amber/70 text-amber bg-carbon-900/80 hover:bg-amber hover:text-carbon-950 font-bold transition-colors"
        >
          RECOG GUIDE
        </button>
      )}

      <button
        onClick={onToggleEnvelopes}
        title="Toggle 3D Effector Envelopes [E]"
        className={`px-1.5 py-0.5 text-[8.5px] border font-bold transition-colors ${
          showEnvelopes
            ? 'border-amber text-amber bg-amber/20'
            : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
        }`}
      >
        [E] {showEnvelopes ? 'WEAPONS ON' : 'WEAPONS OFF'}
      </button>

      <button
        onClick={onToggleLos}
        title="Toggle Modelled Line-of-Sight / Masking [K]"
        className={`px-1.5 py-0.5 text-[8.5px] border font-bold transition-colors ${
          showLos
            ? 'border-friend text-friend bg-friend/20'
            : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
        }`}
      >
        [K] {showLos ? 'LOS ON' : 'LOS OFF'}
      </button>

      <button
        onClick={onToggleClusters}
        title="Toggle Operator-Visible 3D Clusters [U]"
        className={`px-1.5 py-0.5 text-[8.5px] border font-bold transition-colors ${
          showClusters
            ? 'border-phosphor text-phosphor bg-phosphor/20'
            : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
        }`}
      >
        [U] {showClusters ? 'CLUSTERS ON' : 'CLUSTERS OFF'}
      </button>

      {mode === 'EVAL' ? (
        <button
          disabled
          title="Training Aid locked and unavailable in EVALUATION mode (Rule F5)"
          className="px-1.5 py-0.5 text-[8.5px] border border-line text-text-dim/40 bg-carbon-950 cursor-not-allowed"
        >
          [X] AID (LOCKED IN EVAL)
        </button>
      ) : (
        <>
          <button
            onClick={onToggleTrainingAid}
            title="Toggle 3D Training Aid (Modelled Shadows & Ref-RCS Shells) [X]"
            className={`px-1.5 py-0.5 text-[8.5px] border font-bold transition-colors ${
              showTrainingAid
                ? 'border-amber text-amber bg-amber/20'
                : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
            }`}
          >
            [X] {showTrainingAid ? 'AID ON' : 'AID OFF'}
          </button>
          <button
            onClick={onToggleCrossSection}
            title="Open 2D Elevation Cross-Section Along Bearing"
            className={`px-1.5 py-0.5 text-[8.5px] border font-bold transition-colors ${
              showCrossSection
                ? 'border-amber text-amber bg-amber/20'
                : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
            }`}
          >
            X-SECTION
          </button>
        </>
      )}
    </>
  );
};

interface TacticalViewportTabsProps {
  viewMode: '2D' | '3D';
  activeSensor: SensorMode;
  cameraPreset: CameraPreset;
  showEnvelopes: boolean;
  showLos: boolean;
  showClusters: boolean;
  showTrainingAid: boolean;
  showCrossSection: boolean;
  targetDisplayMode: TargetDisplayMode;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  currentScenarioId: string;
  onOpenScenarioModal: () => void;
  onSetSensor: (m: SensorMode) => void;
  onCameraPreset: (p: CameraPreset) => void;
  onToggleEnvelopes: () => void;
  onToggleLos: () => void;
  onToggleClusters: () => void;
  onToggleTrainingAid: () => void;
  onToggleCrossSection: () => void;
  onTargetDisplayMode: (m: TargetDisplayMode) => void;
  onOpenRecogModal: () => void;
  onToggleViewMode: () => void;
  onEnterVr: () => void;
}

const TacticalViewportTabs: React.FC<TacticalViewportTabsProps> = ({
  viewMode,
  activeSensor,
  cameraPreset,
  showEnvelopes,
  showLos,
  showClusters,
  showTrainingAid,
  showCrossSection,
  targetDisplayMode,
  mode,
  currentScenarioId,
  onOpenScenarioModal,
  onSetSensor,
  onCameraPreset,
  onToggleEnvelopes,
  onToggleLos,
  onToggleClusters,
  onToggleTrainingAid,
  onToggleCrossSection,
  onTargetDisplayMode,
  onOpenRecogModal,
  onToggleViewMode,
  onEnterVr,
}) => {
  return (
    <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 font-display text-[9px] max-w-[calc(100%-140px)] pointer-events-auto select-none bg-carbon-950/80 border border-line/60 p-1 backdrop-blur-[2px]">
      {/* Primary Row: Sensors & Core Navigation */}
      <div className="flex items-center gap-1 flex-wrap">
        {(['RADAR', 'EOIR', 'RF'] as const).map((m: SensorMode, idx) => (
          <button
            key={m}
            onClick={() => onSetSensor(m)}
            className={`px-1.5 py-0.5 border transition-colors ${
              activeSensor === m
                ? 'border-phosphor text-phosphor bg-phosphorDim/40 font-bold'
                : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
            }`}
          >
            [{idx + 1}] {m === 'EOIR' ? 'EO/IR' : m}
          </button>
        ))}

        <button
          onClick={onToggleViewMode}
          title="Toggle 2D/3D Tactical View [V]"
          className={`px-1.5 py-0.5 border font-bold transition-colors ${
            viewMode === '3D'
              ? 'border-friend text-friend bg-friend/20'
              : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
          }`}
        >
          [V] {viewMode === '3D' ? '2D RADAR' : '3D VIEW'}
        </button>

        <button
          onClick={onEnterVr}
          title="Enter WebXR Immersive VR Mode (Experimental, Unverified)"
          className="px-1.5 py-0.5 border font-bold transition-colors border-amber/70 text-amber bg-amber/10 hover:bg-amber hover:text-carbon-950"
        >
          [VR] EXPERIMENTAL
        </button>

        <button
          onClick={onOpenScenarioModal}
          disabled={mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0}
          title="Open Mission / Exercise Scenario Selector [S]"
          className={`px-1.5 py-0.5 border font-bold transition-colors ${
            mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0
              ? 'border-line text-text-dim opacity-40 cursor-not-allowed bg-carbon-900'
              : 'border-phosphor/70 text-phosphor bg-phosphorDim/20 hover:bg-phosphor hover:text-carbon-950'
          }`}
        >
          [S] {currentScenarioId}
        </button>

        {viewMode === '3D' && activeSensor === 'RADAR' && (
          <button
            onClick={() => onSetSensor('EOIR')}
            title="Switch to EO/IR sensor to resolve 3D drone & aircraft models [2]"
            className="px-1.5 py-0.5 border border-amber/70 text-amber bg-amber/15 hover:bg-amber hover:text-carbon-950 font-bold transition-colors animate-pulse"
          >
            → [2] VIEW 3D DRONES
          </button>
        )}
      </div>

      {/* Secondary Row: 3D Tactical Tools (Only visible in 3D view) */}
      {viewMode === '3D' && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5 border-t border-line/40">
          <ThreeDViewportControls
            cameraPreset={cameraPreset}
            showEnvelopes={showEnvelopes}
            showLos={showLos}
            showClusters={showClusters}
            showTrainingAid={showTrainingAid}
            showCrossSection={showCrossSection}
            targetDisplayMode={targetDisplayMode}
            mode={mode}
            onCameraPreset={onCameraPreset}
            onToggleEnvelopes={onToggleEnvelopes}
            onToggleLos={onToggleLos}
            onToggleClusters={onToggleClusters}
            onToggleTrainingAid={onToggleTrainingAid}
            onToggleCrossSection={onToggleCrossSection}
            onTargetDisplayMode={onTargetDisplayMode}
            onOpenRecogModal={onOpenRecogModal}
          />
        </div>
      )}
    </div>
  );
};

export const DEFAULT_CHUNK_LOAD_TIMEOUT_MS = 3000;

export interface LoadRender3DOptions {
  timeoutMs?: number;
  loader?: () => Promise<typeof import('@/render3d')>;
}

export async function loadRender3DModuleWithTimeout(
  options?: LoadRender3DOptions
): Promise<typeof import('@/render3d')> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CHUNK_LOAD_TIMEOUT_MS;
  const loader = options?.loader ?? (() => import('@/render3d'));

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`3D chunk loading timed out (> ${timeoutMs}ms, Rule R10.6)`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([loader(), timeoutPromise]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function getTargetDisplayTitle(dm: 'AUTO' | 'RADAR' | 'AIRFRAME'): string {
  if (dm === 'AUTO') {
    return 'Sensor-Auto Target Display (Adapts to Active Sensor & Optical Environment)';
  }
  if (dm === 'RADAR') {
    return 'Force Radar Contact Symbols';
  }
  return 'Observed Airframe Silhouettes (Permitted only when optically observed)';
}

function getTargetDisplayLabel(dm: 'AUTO' | 'RADAR' | 'AIRFRAME'): string {
  if (dm === 'AUTO') return 'TGT:AUTO';
  if (dm === 'RADAR') return 'TGT:RADAR';
  return 'TGT:AIR';
}

export const Console: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ConsoleRenderer | null>(null);
  const renderer3dRef = useRef<Renderer3D | null>(null);
  const xrManagerRef = useRef<WebXRManager | null>(null);
  const isInitializing3DRef = useRef<boolean>(false);

  const [isVrModalOpen, setIsVrModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [webGlError, setWebGlError] = useState<string | null>(null);
  const [selectedEnvObject, setSelectedEnvObject] = useState<EnvironmentObjectInfo | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('OBLIQUE');
  const [showEnvelopes, setShowEnvelopes] = useState<boolean>(true);
  const showEnvelopesRef = useRef<boolean>(true);
  showEnvelopesRef.current = showEnvelopes;
  const toggleEnvelopes = () => setShowEnvelopes((prev) => !prev);

  const [showLos, setShowLos] = useState<boolean>(true);
  const showLosRef = useRef<boolean>(true);
  showLosRef.current = showLos;
  const toggleLos = () => setShowLos((prev) => !prev);

  const [showClusters, setShowClusters] = useState<boolean>(true);
  const showClustersRef = useRef<boolean>(true);
  showClustersRef.current = showClusters;
  const toggleClusters = () => setShowClusters((prev) => !prev);

  const [showTrainingAid, setShowTrainingAid] = useState<boolean>(false);
  const [showCrossSection, setShowCrossSection] = useState<boolean>(false);
  const showTrainingAidRef = useRef<boolean>(false);
  showTrainingAidRef.current = showTrainingAid;
  const toggleTrainingAid = () => {
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    setShowTrainingAid((prev) => !prev);
  };

  const [targetDisplayMode, setTargetDisplayMode] = useState<TargetDisplayMode>('AUTO');
  const [isRecogModalOpen, setIsRecogModalOpen] = useState<boolean>(false);

  useEffect(() => {
    renderer3dRef.current?.setShowLos(showLos);
  }, [showLos]);

  useEffect(() => {
    renderer3dRef.current?.setShowClusters(showClusters);
  }, [showClusters]);

  useEffect(() => {
    renderer3dRef.current?.setShowTrainingAid(showTrainingAid);
    engineInstance.trainingAidActive = showTrainingAid;
  }, [showTrainingAid]);

  useEffect(() => {
    renderer3dRef.current?.setTargetDisplayMode(targetDisplayMode);
  }, [targetDisplayMode]);

  const toggleCrossSection = () => {
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    setShowCrossSection((prev) => !prev);
  };

  const activeSensor = useSessionStore((s) => s.ui.activeSensor);

let toastCounter = 0;

  const handleTargetDisplayMode = (mode: TargetDisplayMode) => {
    setTargetDisplayMode(mode);
    if (mode === 'AIRFRAME' && activeSensor !== 'EOIR') {
      const fb: OperatorFeedback = {
        id: `fb_toast_${Date.now()}_${++toastCounter}`,
        timestampMs: Date.now(),
        category: 'SYSTEM_WARNING',
        severity: 'INFO',
        title: 'AIRFRAME VIEW REQUIRES CLEAR EO/IR OBSERVATION',
        explanation: 'Radar contacts displayed as symbols until EO/IR is active.',
      };
      useSessionStore.setState((s) => ({
        feedbackList: [fb, ...s.feedbackList].slice(0, 20),
        activeFeedback: fb,
      }));
    }
  };

  useEffect(() => {
    renderer3dRef.current?.setActiveSensor(activeSensor);
  }, [activeSensor]);

  const recentEvents = useSessionStore((s) => s.ui.recentEvents);
  const setSensor = useSessionStore((s) => s.setSensor);
  const designate = useSessionStore((s) => s.designate);
  const isAarOpen = useSessionStore((s) => s.isAarOpen);
  const openAar = useSessionStore((s) => s.openAar);
  const closeAar = useSessionStore((s) => s.closeAar);
  const isQuickGuideOpen = useSessionStore((s) => s.isQuickGuideOpen);
  const closeQuickGuide = useSessionStore((s) => s.closeQuickGuide);
  const isScenarioModalOpen = useSessionStore((s) => s.isScenarioModalOpen);
  const openScenarioModal = useSessionStore((s) => s.openScenarioModal);
  const closeScenarioModal = useSessionStore((s) => s.closeScenarioModal);
  const currentScenarioId = useSessionStore((s) => s.currentScenarioId);
  const abortSession = useSessionStore((s) => s.abortSession);
  const sessionStatus = useSessionStore((s) => s.sessionStatus);
  const isBriefingOpen = useSessionStore((s) => s.isBriefingOpen);
  const openBriefing = useSessionStore((s) => s.openBriefing);
  const closeBriefing = useSessionStore((s) => s.closeBriefing);
  const startSession = useSessionStore((s) => s.startSession);

  const [mousePos, setMousePos] = useState<{ brg: number; rngKm: number } | null>(null);
  const [lowFi, setLowFi] = useState<boolean>(false);
  const radarFrameRef = useRef<HTMLDivElement>(null);
  const [radarSize, setRadarSize] = useState<number>(520);

  // Responsive radar viewport dimension synchronization (Task 23.1 Section 4, Task 28 Fix C)
  useEffect(() => {
    const el = radarFrameRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        if (width >= 300 && height >= 300) {
          if (viewMode === '3D') {
            if (canvas3dRef.current) {
              canvas3dRef.current.width = width;
              canvas3dRef.current.height = height;
            }
            renderer3dRef.current?.resize(width, height);
          } else {
            setRadarSize(width);
            if (canvasRef.current) {
              canvasRef.current.width = width;
              canvasRef.current.height = width;
            }
            if (canvas3dRef.current) {
              canvas3dRef.current.width = width;
              canvas3dRef.current.height = height;
            }
            renderer3dRef.current?.resize(width, height);
          }
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  useEffect(() => {
    renderer3dRef.current?.setLowFidelity(lowFi);
  }, [lowFi]);

  // Initialize Canvas 2D Renderer Loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const currentDim = radarSize || 520;
    canvas.width = currentDim;
    canvas.height = currentDim;

    const renderer = new ConsoleRenderer(canvas);
    rendererRef.current = renderer;
    renderer.start();

    return () => {
      renderer.stop();
      rendererRef.current = null;
    };
  }, []);

  // Cleanup 3D Renderer, WebXR and E2E Test Bridge on unmount
  useEffect(() => {
    const uninstallTestBridge = installDrishtiTestBridge(engineInstance, () => renderer3dRef.current);
    return () => {
      uninstallTestBridge();
      xrManagerRef.current?.dispose();
      xrManagerRef.current = null;
      renderer3dRef.current?.dispose();
      renderer3dRef.current = null;
    };
  }, []);

  // Sync persisted trainee difficulty across application reloads
  const currentCallsign = useSessionStore((s) => s.currentCallsign);
  useEffect(() => {
    void (async () => {
      try {
        const d = await getTraineeDifficulty(currentCallsign);
        if (typeof d === 'number' && Number.isFinite(d)) {
          useSessionStore.setState((s) => ({
            ui: { ...s.ui, difficulty: d },
          }));
          if (engineInstance.spec && engineInstance.mode === 'TRAIN' && engineInstance.tickIndex === 0) {
            engineInstance.spec.difficulty = d;
          }
        }
      } catch {
        // fail-safe
      }
    })();
  }, [currentCallsign]);

  const initRenderer3D = async (): Promise<Renderer3D | null> => {
    if (renderer3dRef.current) {
      return renderer3dRef.current;
    }
    if (!canvas3dRef.current) {
      return null;
    }

    // Rule R10.6: Enforce 3-second chunk load timeout for lazy 3D bundle
    const render3dModule = await loadRender3DModuleWithTimeout();

    const {
      Renderer3D,
      checkWebGL2Support,
      calculateRadarCoverage,
      calculateEoirCoverage,
      calculateRfCoverage,
      getScenarioEnvironmentDescriptor,
    } = render3dModule;

    const cap = checkWebGL2Support();
    if (!cap.supported) {
      setWebGlError(cap.reason || 'WebGL2 not supported');
      return null;
    }

    const currentDim = radarSize || 520;
    canvas3dRef.current.width = currentDim;
    canvas3dRef.current.height = currentDim;

    const r3d = new Renderer3D(canvas3dRef.current, {
      maxRangeM: CONFIG.thresholds.radarMaxRangeM,
      rMinM: CONFIG.thresholds.rMinM,
      zones: engineInstance.spec?.zones || [],
      mode: engineInstance.mode,
      showTrainingAid,
      environment: getScenarioEnvironmentDescriptor(currentScenarioId, engineInstance.spec),
      onSelectTrack: (trackNo: string) => {
        setSelectedEnvObject(null);
        designate(trackNo, 'CLICK');
      },
      onSelectEnvironment: (info: EnvironmentObjectInfo | null) => {
        setSelectedEnvObject(info);
      },
      onContextLost: () => {
        xrManagerRef.current?.exitVR();
        const lostRenderer = renderer3dRef.current ?? r3d;
        renderer3dRef.current = null;
        if (lostRenderer) {
          try {
            lostRenderer.dispose();
          } catch {
            // safe idempotent cleanup
          }
        }
        setViewMode('2D');
        setWebGlError('WebGL2 context lost. Restored 2D Canvas baseline.');
      },
    });

    r3d.setSimTimeProvider(() => ({
      simMs: engineInstance.tickIndex * 50,
      chaosList: engineInstance.spec?.chaos,
    }));

    r3d.setEventsProvider(() => engineInstance.getOperatorEvents());
    r3d.setSensorHealthProvider(() => engineInstance.sensorHealth);

    r3d.setTrackProvider(() => {
      const opTracks = engineInstance.getOperatorTracks();
      return {
        tracks: projectSafeTracks(opTracks, engineInstance.selectedTrackNo),
        selectedTrackNo: engineInstance.selectedTrackNo,
      };
    });

    r3d.setCoverageProvider(() => {
      const currentSimMs = engineInstance.tickIndex * 50;
      return {
        radar: calculateRadarCoverage({
          sensorHealth: engineInstance.sensorHealth.RADAR,
          chaosList: engineInstance.spec?.chaos,
          tMs: currentSimMs,
        }),
        eoir: calculateEoirCoverage({
          azimuthDeg: engineInstance.eoirAzimuthDeg,
          isNight: engineInstance.spec?.dayNight === 'NIGHT',
          sensorHealth: engineInstance.sensorHealth.EOIR,
          chaosList: engineInstance.spec?.chaos,
          tMs: currentSimMs,
        }),
        rf: calculateRfCoverage({
          sensorHealth: engineInstance.sensorHealth.RF,
          chaosList: engineInstance.spec?.chaos,
          tMs: currentSimMs,
        }),
        activeSensor: useSessionStore.getState().ui.activeSensor,
        visible: true,
      };
    });

    r3d.setEffectorProvider(() => {
      const currentSimMs = engineInstance.tickIndex * 50;
      const opTracks = engineInstance.getOperatorTracks();
      const selectedTrack = engineInstance.selectedTrackNo
        ? opTracks.find((t) => t.trackNo === engineInstance.selectedTrackNo)
        : null;

      return {
        activeEffector: useSessionStore.getState().ui.activeEffector,
        selectedTrack: selectedTrack && selectedTrack.step !== 'UNDETECTED'
          ? {
              trackNo: selectedTrack.trackNo,
              pos: { x: selectedTrack.estPos.x, y: selectedTrack.estPos.y, z: selectedTrack.estPos.z },
              q: selectedTrack.q,
            }
          : null,
        sensorHealth: engineInstance.sensorHealth,
        chaosList: engineInstance.spec?.chaos,
        tMs: currentSimMs,
        visible: showEnvelopesRef.current,
      };
    });

    r3d.setShowLos(showLos);
    r3d.setShowClusters(showClusters);
    r3d.setLowFidelity(lowFi);
    r3d.setTargetDisplayMode(targetDisplayMode);
    r3d.setActiveSensor(activeSensor);
    renderer3dRef.current = r3d;
    return r3d;
  };

  // Toggle 2D / 3D Tactical View with WebGL2 probe and graceful fallback
  const toggleViewMode = async () => {
    if (isInitializing3DRef.current) {
      return;
    }
    if (viewMode === '3D') {
      xrManagerRef.current?.exitVR();
      renderer3dRef.current?.stop();
      setViewMode('2D');
      return;
    }

    isInitializing3DRef.current = true;
    try {
      const r3d = await initRenderer3D();
      if (!r3d) {
        return;
      }

      r3d.start();
      setViewMode('3D');
      // Operator requirement: Default to EO/IR sensor in 3D view so 3D airframes are immediately visible
      setSensor('EOIR');
      setWebGlError(null);
    } catch (err) {
      if (renderer3dRef.current) {
        try {
          renderer3dRef.current.dispose();
        } catch {
          // ignore cleanup error
        }
        renderer3dRef.current = null;
      }
      console.error('[Console] Failed to load 3D view:', err);
      const isTimeout = err instanceof Error && err.message.includes('timed out');
      setWebGlError(
        isTimeout
          ? '3D chunk loading timed out (> 3000ms). Restoring 2D mode.'
          : 'Failed to load 3D renderer. Restoring 2D mode.'
      );
      setViewMode('2D');
    } finally {
      isInitializing3DRef.current = false;
    }
  };

  const handleOpenVr = () => {
    setIsVrModalOpen(true);
  };

  const handleConfirmVr = async () => {
    setIsVrModalOpen(false);

    try {
      const {
        checkWebXRSupport,
        WebXRManager,
      } = await import('@/render3d');

      const cap = await checkWebXRSupport();
      if (!cap.supported) {
        setWebGlError(cap.reason || 'WebXR immersive-vr not supported on this device/runtime.');
        return;
      }

      const r3d = await initRenderer3D();
      if (!r3d) {
        return;
      }

      if (rendererRef.current) {
        setViewMode('3D');
        r3d.start();

        const xrMgr = new WebXRManager(
          r3d.getThreeRenderer(),
          r3d.getScene3D().scene,
          rendererRef.current,
          () => {
            xrMgr.dispose();
            xrManagerRef.current = null;
          },
          r3d.getCamera()
        );
        xrManagerRef.current = xrMgr;
        const res = await xrMgr.enterVR();
        if (!res.success) {
          setWebGlError(res.error || 'Failed to enter WebXR VR session');
          xrMgr.dispose();
          xrManagerRef.current = null;
        } else {
          setWebGlError(null);
        }
      }
    } catch (err) {
      console.error('[Console] Failed to enter VR mode:', err);
      setWebGlError('WebXR VR entry failed. Restored desktop view.');
    }
  };

  const handleCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    renderer3dRef.current?.setPreset(preset);
  };

  // Scored-session visibility guard: abort session if tab is hidden during EVAL (Rules.md R2.10)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded) {
        abortSession('TAB_BACKGROUNDED');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [abortSession]);

  // Synchronize 3D environment when active scenario changes
  useEffect(() => {
    if (renderer3dRef.current) {
      renderer3dRef.current.setScenarioEnvironment(currentScenarioId, engineInstance.spec);
      setSelectedEnvObject(null);
    }
  }, [currentScenarioId]);

  // Keyboard navigation & Hotkeys (including 'v' 2D/3D, presets, 'e' envelopes, 'k' LOS, 'u' clusters, and 'x' training aid)
  useConsoleKeyboard(rendererRef, setLowFi, {
    toggle3D: toggleViewMode,
    setCameraPreset: handleCameraPreset,
    toggleEnvelopes,
    toggleLos,
    toggleClusters,
    toggleTrainingAid,
    focusSelection: () => renderer3dRef.current?.focusSelection(),
    resetCamera: () => renderer3dRef.current?.resetCamera(),
  });

  // Automatically trigger HotWash AAR when simulation session ends
  useEffect(() => {
    const hasEnded = recentEvents.some((e) => e.type === 'SESSION_END');
    if (hasEnded) {
      openAar();
    }
  }, [recentEvents, openAar]);

  // Track cursor range/bearing on Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setMousePos(computeCursorCoords(e.clientX, e.clientY, canvasRef.current));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(cx, cy) - 15;
    const scale = radius / 5000;
    const clickX = e.clientX - rect.left - cx;
    const clickY = cy - (e.clientY - rect.top);

    const nearestTrackNo = findNearestTrackNo(clickX, clickY, engineInstance.getOperatorTracks(), scale);
    if (nearestTrackNo) {
      designate(nearestTrackNo, 'CLICK');
    }
  };

  const renderScopeReadout = () => {
    if (viewMode === '3D') {
      return (
        <span>
          3D VIEW | CAM: <span className="text-friend">{cameraPreset}</span>
        </span>
      );
    }
    if (mousePos) {
      return (
        <span>
          AZ <span className="text-phosphor">{String(mousePos.brg).padStart(3, '0')}°</span> | RNG{' '}
          <span className="text-phosphor">{mousePos.rngKm.toFixed(2)} km</span>
        </span>
      );
    }
    return <span>PPI SCOPE 360°</span>;
  };

  return (
    <div className="console bg-carbon-950 overflow-hidden select-none">
      {/* 1. Top Bar (45px) */}
      <div className="console-top">
        <TopBar />
      </div>

      {/* 2. Left Rail: Track Table (240px) */}
      <div className="console-left">
        <TrackTable />
      </div>

      {/* 3. Center Radar Scope Viewport */}
      <div className="console-center bg-carbon-950">
        <div className="flex items-center justify-between w-full h-full relative px-1">
          {/* Left Gutter: Range Rings Legend (restored across tactical displays) */}
          <div className="flex flex-col justify-center space-y-3 text-[8px] font-mono text-text-dim pr-1 select-none shrink-0 w-[92px] overflow-hidden">
            <div className="border-l border-phosphorDim pl-1">
              <span className="text-phosphor block font-bold whitespace-nowrap">5.0 km</span>
              <span className="whitespace-nowrap tracking-tighter">MAX RADAR</span>
            </div>
            <div className="border-l border-phosphorDim pl-1">
              <span className="text-text-main block whitespace-nowrap">3.0 km</span>
              <span className="whitespace-nowrap tracking-tighter">NOMINAL REF</span>
            </div>
            <div className="border-l border-amber pl-1">
              <span className="text-amber block font-bold whitespace-nowrap">0.5 km</span>
              <span className="whitespace-nowrap tracking-tighter">POINT OF NO RETURN</span>
            </div>
          </div>

          {/* Responsive Canvas Frame bounded by var(--radar) in 2D, or wider landscape in 3D */}
          <div
            ref={radarFrameRef}
            className={`radar-frame shrink-0 border border-line bg-carbon-950 flex items-center justify-center relative overflow-hidden ${
              viewMode === '3D' ? 'radar-frame-3d' : ''
            }`}
            style={
              viewMode === '3D'
                ? {
                    width: 'var(--radar-w-3d, min(960px, max(var(--radar), calc(100vw - 778px))))',
                    maxWidth: 'calc(100% - 194px)',
                    height: 'var(--radar)',
                  }
                : {
                    width: 'var(--radar)',
                    height: 'var(--radar)',
                  }
            }
          >
            {/* Native HTML5 2D Radar Canvas */}
            <canvas
              ref={canvasRef}
              width={radarSize}
              height={radarSize}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setMousePos(null)}
              onClick={handleCanvasClick}
              className={`cursor-crosshair ${viewMode === '2D' ? 'block' : 'hidden'}`}
            />

            {/* Three.js 3D Viewport Canvas */}
            <canvas
              ref={canvas3dRef}
              width={radarSize}
              height={radarSize}
              style={{ touchAction: 'none' }}
              className={`cursor-grab active:cursor-grabbing ${viewMode === '3D' ? 'block' : 'hidden'}`}
            />

            {/* Overlaid Mode Selector Tabs Inside Canvas */}
            <TacticalViewportTabs
              viewMode={viewMode}
              activeSensor={activeSensor}
              cameraPreset={cameraPreset}
              showEnvelopes={showEnvelopes}
              showLos={showLos}
              showClusters={showClusters}
              showTrainingAid={showTrainingAid}
              showCrossSection={showCrossSection}
              targetDisplayMode={targetDisplayMode}
              mode={engineInstance.mode}
              currentScenarioId={currentScenarioId}
              onOpenScenarioModal={openScenarioModal}
              onSetSensor={setSensor}
              onCameraPreset={handleCameraPreset}
              onToggleEnvelopes={toggleEnvelopes}
              onToggleLos={toggleLos}
              onToggleClusters={toggleClusters}
              onToggleTrainingAid={toggleTrainingAid}
              onToggleCrossSection={toggleCrossSection}
              onTargetDisplayMode={handleTargetDisplayMode}
              onOpenRecogModal={() => setIsRecogModalOpen(true)}
              onToggleViewMode={toggleViewMode}
              onEnterVr={handleOpenVr}
            />

            {/* Overlaid Cursor Bearing / Range Readout (2D) or 3D Camera Readout */}
            <div className="absolute top-2 right-2 z-10 font-mono text-[10px] text-text-dim bg-carbon-900/80 border border-line px-2 py-0.5 pointer-events-none select-none">
              {renderScopeReadout()}
            </div>

            {/* 3D Model Scale & Control Hint */}
            {viewMode === '3D' && (
              <div className="absolute bottom-1 inset-x-2 z-10 flex flex-col items-center gap-0.5 pointer-events-none select-none font-mono text-text-dim text-[7.5px] tracking-tight">
                <div
                  title="Aircraft models are enlarged for tactical visual identification. Underlying world positions and radar ranges are authoritative and unchanged."
                  className="bg-carbon-900/95 border border-line/70 px-2 py-0.5 whitespace-nowrap text-center shadow-sm max-w-[96%] overflow-hidden text-ellipsis"
                >
                  AIRCRAFT MODELS ENLARGED FOR VISIBILITY — TRACK POSITIONS AND RANGES UNCHANGED
                </div>
                <div className="bg-carbon-900/95 border border-line/70 px-2 py-0.5 whitespace-nowrap text-center shadow-sm max-w-[96%] overflow-hidden text-ellipsis">
                  DRAG: ORBIT | SCROLL: ZOOM | CLICK: SELECT TARGET | PAN: RMB | FOCUS: DBLCLICK / [G] | RESET: [HOME]
                </div>
              </div>
            )}

            {/* 3D Environment Object Inspector */}
            {viewMode === '3D' && selectedEnvObject && (
              <EnvironmentInspector
                objectInfo={selectedEnvObject}
                onClose={() => setSelectedEnvObject(null)}
                onFocus={() => renderer3dRef.current?.focusSelection()}
              />
            )}

            {/* WebGL Error / Context Loss Fallback Banner */}
            {webGlError && (
              <div className="absolute bottom-8 left-2 z-20 text-[9px] font-mono text-amber border border-amber px-2 py-1 bg-carbon-950/95 flex items-center gap-2">
                <span>⚠ {webGlError}</span>
                <button
                  onClick={() => setWebGlError(null)}
                  className="text-text-dim hover:text-text-main font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Low-Fidelity Indicator */}
            {lowFi && (
              <div className="absolute bottom-8 left-2 z-10 text-[9px] font-mono text-amber border border-amber px-1.5 py-0.5 bg-carbon-900/80">
                LOW-FIDELITY MODE [L]
              </div>
            )}

            {/* Standby Banner when in READY state and briefing modal is dismissed */}
            {sessionStatus === 'READY' && !isBriefingOpen && (
              <div className="absolute inset-0 z-20 bg-carbon-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-6 select-none pointer-events-auto">
                <div className="text-center space-y-1">
                  <div className="font-display font-bold text-lg text-text-main tracking-wider">
                    DRISHTI-CUAS — STANDBY
                  </div>
                  <div className="font-mono text-xs text-phosphor border border-phosphor px-2 py-0.5 bg-phosphorDim/20 inline-block">
                    STATUS: READY FOR EXERCISE
                  </div>
                </div>
                <div className="text-center font-mono text-[11px] text-text-dim max-w-sm">
                  Simulation clock and target physics are held at T+00:00.000. Review mission parameters or launch the active scenario when ready.
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={openBriefing}
                    data-testid="open-briefing-btn"
                    className="px-4 py-2 font-display font-semibold text-xs border border-phosphor/70 hover:border-phosphor text-phosphor hover:bg-phosphorDim/30 transition-colors"
                  >
                    [ REVIEW BRIEFING ]
                  </button>
                  <button
                    onClick={() => void startSession()}
                    data-testid="standby-start-session-btn"
                    className="px-5 py-2 font-display font-bold text-xs tracking-wider border border-phosphor bg-phosphor text-carbon-950 hover:bg-phosphor/90 shadow-md shadow-phosphor/20 active:scale-95 transition-all"
                  >
                    START SESSION ►
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Gutter: Active Mode Telemetry (restored across tactical displays) */}
          <div className="flex flex-col justify-center space-y-3 text-[8px] font-mono text-text-dim pl-1 select-none shrink-0 w-[92px] text-right overflow-hidden">
            <div className="border-r border-line pr-1 text-right">
              <span className="text-text-main block font-bold whitespace-nowrap">30 RPM</span>
              <span className="whitespace-nowrap tracking-tighter">SWEEP RATE</span>
            </div>
            <div className="border-r border-line pr-1 text-right">
              <span className="text-text-main block font-bold whitespace-nowrap">20 Hz</span>
              <span className="whitespace-nowrap tracking-tighter">DETERMINISTIC SIM</span>
            </div>
            <div className="border-r border-line pr-1 text-right">
              <span className="text-phosphor block font-bold whitespace-nowrap">60 FPS</span>
              <span className="whitespace-nowrap tracking-tighter">RENDER TARGET</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Right Rail: F2T2EA & Effector Panel (320px) */}
      <div className="console-right">
        <EngagementPanel />
      </div>

      {/* 5. Bottom Event Console (110px) */}
      <div className="console-bottom">
        <EventLog />
      </div>

      {/* 6. Hot-Wash / AAR Scoring Debrief Modal */}
      {isAarOpen && (
        <ErrorBoundary fallbackTitle="HOTWASH AAR INSPECTOR ERROR" onReset={closeAar}>
          <React.Suspense fallback={null}>
            <HotWash onClose={closeAar} />
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* 7. Operator Quick-Start Guide Modal */}
      {isQuickGuideOpen && <QuickGuide onClose={closeQuickGuide} />}

      {/* 8. F5 Elevation Cross-Section Training Aid Modal */}
      {showCrossSection && engineInstance.mode !== 'EVAL' && (
        <ErrorBoundary
          fallbackTitle="ELEVATION CROSS-SECTION AID ERROR"
          onReset={() => setShowCrossSection(false)}
        >
          <CrossSectionPanel
            onClose={() => setShowCrossSection(false)}
            zones={engineInstance.spec?.zones || []}
            selectedTrack={
              engineInstance.selectedTrackNo
                ? (() => {
                    const ent = engineInstance.curr.find(
                      (e) => e.trackNo === engineInstance.selectedTrackNo && e.step !== 'UNDETECTED'
                    );
                    return ent ? { trackNo: ent.trackNo!, pos: { ...ent.pos }, masked: ent.masked } : null;
                  })()
                : null
            }
          />
        </ErrorBoundary>
      )}

      {/* 9. Mission Scenario Selector Modal */}
      {isScenarioModalOpen && <ScenarioModal onClose={closeScenarioModal} />}

      {/* 10. Mission Briefing Modal */}
      {sessionStatus === 'READY' && isBriefingOpen && (
        <MissionBriefing onClose={closeBriefing} />
      )}

      {/* 11. WebXR VR Comfort & Safety Advisory Modal */}
      <WebXrComfortModal
        isOpen={isVrModalOpen}
        onConfirm={handleConfirmVr}
        onCancel={() => setIsVrModalOpen(false)}
      />

      {/* 12. Intelligent Operator Tactical Feedback HUD Toast */}
      <OperatorFeedbackToast />

      {/* 13. C-UAS Target Recognition Manual & Threat Taxonomy Modal */}
      {isRecogModalOpen && <TargetRecognitionModal onClose={() => setIsRecogModalOpen(false)} />}
    </div>
  );
};

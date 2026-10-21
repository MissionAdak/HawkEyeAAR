import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { TrackTable } from './TrackTable';
import { EngagementPanel } from './EngagementPanel';
import { EventLog } from './EventLog';
const HotWash = React.lazy(() => import('./HotWash').then((m) => ({ default: m.HotWash })));
import { QuickGuide } from './QuickGuide';
import { ScenarioModal } from './ScenarioModal';
import { WebXrComfortModal } from './WebXrComfortModal';
const CrossSectionPanel = React.lazy(() => import('./CrossSectionPanel').then((m) => ({ default: m.CrossSectionPanel })));
import { ConsoleRenderer } from '@/render/renderer';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import type { SensorMode, TrackEntity } from '@/sim/types';
import type { SafeTrackView, CameraPreset } from '@/render3d/types';
import type { Renderer3D, WebXRManager } from '@/render3d';
import { CONFIG } from '@/config';
import { useConsoleKeyboard } from './useConsoleKeyboard';

/**
 * Redacts raw simulation ground truth before passing tracks to 3D visualization (Rule R10.3 & D-37).
 * Filters out undetected tracks and excludes all truth properties (trueClass, droneType, valueInr, etc.).
 */
function projectSafeTracks(curr: TrackEntity[], selectedTrackNo: string | null): SafeTrackView[] {
  return curr
    .filter(
      (e) =>
        e.trackNo &&
        e.step !== 'UNDETECTED' &&
        (e.lifecycle === 'ACTIVE' || e.lifecycle === 'LEAKED' || e.lifecycle === 'NEUTRALISED')
    )
    .map((e) => ({
      trackNo: e.trackNo!,
      pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
      vel: { x: e.vel.x, y: e.vel.y, z: e.vel.z },
      traineeLabel: e.traineeLabel,
      step: e.step,
      q: e.q,
      masked: e.masked,
      ghostSigmaM: e.ghostSigmaM,
      isSelected: e.trackNo === selectedTrackNo,
      lifecycle: e.lifecycle as 'ACTIVE' | 'LEAKED' | 'NEUTRALISED',
    }));
}

function computeCursorCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): { brg: number; rngKm: number } {
  const rect = canvas.getBoundingClientRect();
  const dx = clientX - rect.left - 260;
  const dy = 260 - (clientY - rect.top);

  const scale = 245 / 5000;
  const rangeM = Math.hypot(dx, dy) / scale;
  const bearingRad = Math.atan2(dx, dy);
  let bearingDeg = Math.round((bearingRad * 180) / Math.PI);
  if (bearingDeg < 0) bearingDeg += 360;

  return { brg: bearingDeg, rngKm: Number((rangeM / 1000).toFixed(2)) };
}

function findNearestTrackNo(
  clickX: number,
  clickY: number,
  entities: TrackEntity[],
  scale: number = 245 / 5000
): string | null {
  let nearestTrackNo: string | null = null;
  let nearestDist = 15;

  for (const entity of entities) {
    if (!entity.trackNo || entity.lifecycle !== 'ACTIVE') continue;
    const ex = entity.pos.x * scale;
    const ey = entity.pos.y * scale;
    const d = Math.hypot(clickX - ex, clickY - ey);
    if (d < nearestDist) {
      nearestDist = d;
      nearestTrackNo = entity.trackNo;
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
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  onCameraPreset: (p: CameraPreset) => void;
  onToggleEnvelopes: () => void;
  onToggleLos: () => void;
  onToggleClusters: () => void;
  onToggleTrainingAid: () => void;
  onToggleCrossSection: () => void;
}

const ThreeDViewportControls: React.FC<ThreeDViewportControlsProps> = ({
  cameraPreset,
  showEnvelopes,
  showLos,
  showClusters,
  showTrainingAid,
  showCrossSection,
  mode,
  onCameraPreset,
  onToggleEnvelopes,
  onToggleLos,
  onToggleClusters,
  onToggleTrainingAid,
  onToggleCrossSection,
}) => {
  return (
    <>
      {(['OBLIQUE', 'TOP', 'POST'] as const).map((preset) => (
        <button
          key={preset}
          onClick={() => onCameraPreset(preset)}
          className={`px-2 py-0.5 border transition-colors ${
            cameraPreset === preset
              ? 'border-friend text-friend bg-friend/20 font-bold'
              : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
          }`}
        >
          {preset === 'POST' ? 'POST' : `[${preset[0]}] ${preset}`}
        </button>
      ))}

      <button
        onClick={onToggleEnvelopes}
        title="Toggle 3D Effector Envelopes [E]"
        className={`px-2 py-0.5 border font-bold transition-colors ${
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
        className={`px-2 py-0.5 border font-bold transition-colors ${
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
        className={`px-2 py-0.5 border font-bold transition-colors ${
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
          className="px-2 py-0.5 border border-line text-text-dim/40 bg-carbon-950 cursor-not-allowed text-[10px]"
        >
          [X] AID (LOCKED IN EVAL)
        </button>
      ) : (
        <>
          <button
            onClick={onToggleTrainingAid}
            title="Toggle 3D Training Aid (Modelled Shadows & Ref-RCS Shells) [X]"
            className={`px-2 py-0.5 border font-bold transition-colors ${
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
            className={`px-2 py-0.5 border font-bold transition-colors ${
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
  onToggleViewMode,
  onEnterVr,
}) => {
  return (
    <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1 font-display text-[10px] max-w-[420px]">
      {(['RADAR', 'EOIR', 'RF'] as const).map((m: SensorMode, idx) => (
        <button
          key={m}
          onClick={() => onSetSensor(m)}
          className={`px-2 py-0.5 border transition-colors ${
            activeSensor === m
              ? 'border-phosphor text-phosphor bg-phosphorDim/40 font-bold'
              : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
          }`}
        >
          [{idx + 1}] {m === 'EOIR' ? 'EO/IR' : m}
        </button>
      ))}

      {viewMode === '3D' && (
        <ThreeDViewportControls
          cameraPreset={cameraPreset}
          showEnvelopes={showEnvelopes}
          showLos={showLos}
          showClusters={showClusters}
          showTrainingAid={showTrainingAid}
          showCrossSection={showCrossSection}
          mode={mode}
          onCameraPreset={onCameraPreset}
          onToggleEnvelopes={onToggleEnvelopes}
          onToggleLos={onToggleLos}
          onToggleClusters={onToggleClusters}
          onToggleTrainingAid={onToggleTrainingAid}
          onToggleCrossSection={onToggleCrossSection}
        />
      )}

      <button
        onClick={onToggleViewMode}
        title="Toggle 2D/3D Tactical View [V]"
        className={`px-2 py-0.5 border font-bold transition-colors ${
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
        className="px-2 py-0.5 border font-bold transition-colors border-amber/70 text-amber bg-amber/10 hover:bg-amber hover:text-carbon-950"
      >
        [VR] EXPERIMENTAL
      </button>

      <button
        onClick={onOpenScenarioModal}
        disabled={mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0}
        title="Open Mission / Exercise Scenario Selector [S]"
        className={`px-2 py-0.5 border font-bold transition-colors ${
          mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0
            ? 'border-line text-text-dim opacity-40 cursor-not-allowed bg-carbon-900'
            : 'border-phosphor/70 text-phosphor bg-phosphorDim/20 hover:bg-phosphor hover:text-carbon-950'
        }`}
      >
        [S] {currentScenarioId}
      </button>
    </div>
  );
};

export const Console: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ConsoleRenderer | null>(null);
  const renderer3dRef = useRef<Renderer3D | null>(null);
  const xrManagerRef = useRef<WebXRManager | null>(null);

  const [isVrModalOpen, setIsVrModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [webGlError, setWebGlError] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('OBLIQUE');
  const [showEnvelopes, setShowEnvelopes] = useState<boolean>(true);
  const showEnvelopesRef = useRef<boolean>(true);
  showEnvelopesRef.current = showEnvelopes;
  const toggleEnvelopes = () => setShowEnvelopes((prev) => !prev);

  const [showLos, setShowLos] = useState<boolean>(true);
  const showLosRef = useRef<boolean>(true);
  showLosRef.current = showLos;
  const toggleLos = () => {
    setShowLos((prev) => {
      const next = !prev;
      renderer3dRef.current?.setShowLos(next);
      return next;
    });
  };

  const [showClusters, setShowClusters] = useState<boolean>(true);
  const showClustersRef = useRef<boolean>(true);
  showClustersRef.current = showClusters;
  const toggleClusters = () => {
    setShowClusters((prev) => {
      const next = !prev;
      renderer3dRef.current?.setShowClusters(next);
      return next;
    });
  };

  const [showTrainingAid, setShowTrainingAid] = useState<boolean>(false);
  const [showCrossSection, setShowCrossSection] = useState<boolean>(false);
  const showTrainingAidRef = useRef<boolean>(false);
  showTrainingAidRef.current = showTrainingAid;
  const toggleTrainingAid = () => {
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    setShowTrainingAid((prev) => {
      const next = !prev;
      renderer3dRef.current?.setShowTrainingAid(next);
      engineInstance.trainingAidActive = next;
      return next;
    });
  };

  const toggleCrossSection = () => {
    if (engineInstance.mode === 'EVAL') {
      return;
    }
    setShowCrossSection((prev) => !prev);
  };

  const activeSensor = useSessionStore((s) => s.ui.activeSensor);
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

  const [mousePos, setMousePos] = useState<{ brg: number; rngKm: number } | null>(null);
  const [lowFi, setLowFi] = useState<boolean>(false);
  useEffect(() => {
    renderer3dRef.current?.setLowFidelity(lowFi);
  }, [lowFi]);

  // Initialize Canvas 2D Renderer Loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 520;
    canvas.height = 520;

    const renderer = new ConsoleRenderer(canvas);
    rendererRef.current = renderer;
    renderer.start();

    return () => {
      renderer.stop();
      rendererRef.current = null;
    };
  }, []);

  // Cleanup 3D Renderer and WebXR on unmount
  useEffect(() => {
    return () => {
      xrManagerRef.current?.dispose();
      xrManagerRef.current = null;
      renderer3dRef.current?.dispose();
      renderer3dRef.current = null;
    };
  }, []);

  // Toggle 2D / 3D Tactical View with WebGL2 probe and graceful fallback
  const toggleViewMode = async () => {
    if (viewMode === '3D') {
      xrManagerRef.current?.exitVR();
      renderer3dRef.current?.stop();
      setViewMode('2D');
      return;
    }

    try {
      const {
        Renderer3D,
        checkWebGL2Support,
        calculateRadarCoverage,
        calculateEoirCoverage,
        calculateRfCoverage,
      } = await import('@/render3d');
      const cap = checkWebGL2Support();
      if (!cap.supported) {
        setWebGlError(cap.reason || 'WebGL2 not supported');
        return;
      }

      if (!renderer3dRef.current && canvas3dRef.current) {
        canvas3dRef.current.width = 520;
        canvas3dRef.current.height = 520;

        const r3d = new Renderer3D(canvas3dRef.current, {
          maxRangeM: CONFIG.thresholds.radarMaxRangeM,
          rMinM: CONFIG.thresholds.rMinM,
          zones: engineInstance.spec?.zones || [],
          mode: engineInstance.mode,
          showTrainingAid: showTrainingAidRef.current,
          onContextLost: () => {
            xrManagerRef.current?.exitVR();
            renderer3dRef.current?.stop();
            setViewMode('2D');
            setWebGlError('WebGL2 context lost. Restored 2D Canvas baseline.');
          },
        });

        r3d.setTrackProvider(() => ({
          tracks: projectSafeTracks(engineInstance.curr, engineInstance.selectedTrackNo),
          selectedTrackNo: engineInstance.selectedTrackNo,
        }));

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
          const selectedEntity = engineInstance.selectedTrackNo
            ? engineInstance.curr.find((e) => e.trackNo === engineInstance.selectedTrackNo)
            : null;

          return {
            activeEffector: useSessionStore.getState().ui.activeEffector,
            selectedTrack: selectedEntity && selectedEntity.step !== 'UNDETECTED'
              ? {
                  trackNo: selectedEntity.trackNo!,
                  pos: { x: selectedEntity.pos.x, y: selectedEntity.pos.y, z: selectedEntity.pos.z },
                  q: selectedEntity.q,
                }
              : null,
            sensorHealth: engineInstance.sensorHealth,
            chaosList: engineInstance.spec?.chaos,
            tMs: currentSimMs,
            visible: showEnvelopesRef.current,
          };
        });

        r3d.setShowLos(showLosRef.current);
        r3d.setShowClusters(showClustersRef.current);
        r3d.setLowFidelity(lowFi);
        renderer3dRef.current = r3d;
      }

      renderer3dRef.current?.start();
      setViewMode('3D');
      setWebGlError(null);
    } catch (err) {
      console.error('[Console] Failed to load 3D view:', err);
      setWebGlError('Failed to load 3D renderer. Restoring 2D mode.');
      setViewMode('2D');
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
        Renderer3D,
        checkWebGL2Support,
        calculateRadarCoverage,
        calculateEoirCoverage,
        calculateRfCoverage,
      } = await import('@/render3d');

      const cap = await checkWebXRSupport();
      if (!cap.supported) {
        setWebGlError(cap.reason || 'WebXR immersive-vr not supported on this device/runtime.');
        return;
      }

      const glCap = checkWebGL2Support();
      if (!glCap.supported) {
        setWebGlError(glCap.reason || 'WebGL2 not supported');
        return;
      }

      // Ensure 3D renderer is instantiated
      if (!renderer3dRef.current && canvas3dRef.current) {
        canvas3dRef.current.width = 520;
        canvas3dRef.current.height = 520;

        const r3d = new Renderer3D(canvas3dRef.current, {
          maxRangeM: CONFIG.thresholds.radarMaxRangeM,
          rMinM: CONFIG.thresholds.rMinM,
          zones: engineInstance.spec?.zones || [],
          mode: engineInstance.mode,
          showTrainingAid: showTrainingAidRef.current,
          onContextLost: () => {
            xrManagerRef.current?.exitVR();
            renderer3dRef.current?.stop();
            setViewMode('2D');
            setWebGlError('WebGL2 context lost. Restored 2D Canvas baseline.');
          },
        });

        r3d.setTrackProvider(() => ({
          tracks: projectSafeTracks(engineInstance.curr, engineInstance.selectedTrackNo),
          selectedTrackNo: engineInstance.selectedTrackNo,
        }));

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
          const selectedEntity = engineInstance.selectedTrackNo
            ? engineInstance.curr.find((e) => e.trackNo === engineInstance.selectedTrackNo)
            : null;

          return {
            activeEffector: useSessionStore.getState().ui.activeEffector,
            selectedTrack: selectedEntity && selectedEntity.step !== 'UNDETECTED'
              ? {
                  trackNo: selectedEntity.trackNo!,
                  pos: { x: selectedEntity.pos.x, y: selectedEntity.pos.y, z: selectedEntity.pos.z },
                  q: selectedEntity.q,
                }
              : null,
            sensorHealth: engineInstance.sensorHealth,
            chaosList: engineInstance.spec?.chaos,
            tMs: currentSimMs,
            visible: showEnvelopesRef.current,
          };
        });

        r3d.setShowLos(showLosRef.current);
        r3d.setShowClusters(showClustersRef.current);
        r3d.setLowFidelity(lowFi);
        renderer3dRef.current = r3d;
      }

      if (renderer3dRef.current && rendererRef.current) {
        setViewMode('3D');
        renderer3dRef.current.start();

        const xrMgr = new WebXRManager(
          renderer3dRef.current.getThreeRenderer(),
          renderer3dRef.current.getScene3D().scene,
          rendererRef.current,
          () => {
            xrMgr.dispose();
            xrManagerRef.current = null;
          },
          renderer3dRef.current.getCamera()
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

  // Keyboard navigation & Hotkeys (including 'v' 2D/3D, presets, 'e' envelopes, 'k' LOS, 'u' clusters, and 'x' training aid)
  useConsoleKeyboard(rendererRef, setLowFi, {
    toggle3D: toggleViewMode,
    setCameraPreset: handleCameraPreset,
    toggleEnvelopes,
    toggleLos,
    toggleClusters,
    toggleTrainingAid,
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
    const clickX = e.clientX - rect.left - 260;
    const clickY = 260 - (e.clientY - rect.top);

    const nearestTrackNo = findNearestTrackNo(clickX, clickY, engineInstance.curr);
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
        <div className="flex items-center justify-center w-full h-full relative">
          {/* Left Gutter: Range Rings Legend */}
          <div className="hidden xl:flex flex-col justify-center space-y-3 text-[10px] font-mono text-text-dim pr-4 select-none">
            <div className="border-l border-phosphorDim pl-2">
              <span className="text-phosphor block font-bold">5.0 km</span>
              <span>MAX RADAR</span>
            </div>
            <div className="border-l border-phosphorDim pl-2">
              <span className="text-text-main block">3.0 km</span>
              <span>NOMINAL REF</span>
            </div>
            <div className="border-l border-amber pl-2">
              <span className="text-amber block font-bold">0.5 km</span>
              <span>POINT OF NO RETURN</span>
            </div>
          </div>

          {/* 520px x 520px Canvas Frame bounded by var(--radar) */}
          <div
            className="radar-frame border border-line bg-carbon-950 flex items-center justify-center relative overflow-hidden"
            style={{
              width: 'var(--radar)',
              height: 'var(--radar)',
            }}
          >
            {/* Native HTML5 2D Radar Canvas */}
            <canvas
              ref={canvasRef}
              width={520}
              height={520}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setMousePos(null)}
              onClick={handleCanvasClick}
              className={`cursor-crosshair ${viewMode === '2D' ? 'block' : 'hidden'}`}
            />

            {/* Three.js 3D Viewport Canvas */}
            <canvas
              ref={canvas3dRef}
              width={520}
              height={520}
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
              onToggleViewMode={toggleViewMode}
              onEnterVr={handleOpenVr}
            />

            {/* Overlaid Cursor Bearing / Range Readout (2D) or 3D Camera Readout */}
            <div className="absolute top-2 right-2 z-10 font-mono text-[10px] text-text-dim bg-carbon-900/80 border border-line px-2 py-0.5 pointer-events-none select-none">
              {renderScopeReadout()}
            </div>

            {/* 3D Orbit Control Hint */}
            {viewMode === '3D' && (
              <div className="absolute bottom-2 right-2 z-10 text-[9px] font-mono text-text-dim bg-carbon-900/80 border border-line px-1.5 py-0.5 pointer-events-none select-none">
                DRAG: ORBIT | SCROLL: ZOOM
              </div>
            )}

            {/* WebGL Error / Context Loss Fallback Banner */}
            {webGlError && (
              <div className="absolute bottom-2 left-2 z-20 text-[9px] font-mono text-amber border border-amber px-2 py-1 bg-carbon-950/95 flex items-center gap-2">
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
              <div className="absolute bottom-2 left-2 z-10 text-[9px] font-mono text-amber border border-amber px-1.5 py-0.5 bg-carbon-900/80">
                LOW-FIDELITY MODE [L]
              </div>
            )}
          </div>

          {/* Right Gutter: Active Mode Telemetry */}
          <div className="hidden xl:flex flex-col justify-center space-y-3 text-[10px] font-mono text-text-dim pl-4 select-none">
            <div className="border-r border-line pr-2 text-right">
              <span className="text-text-main block font-bold">30 RPM</span>
              <span>SWEEP RATE</span>
            </div>
            <div className="border-r border-line pr-2 text-right">
              <span className="text-text-main block font-bold">20 Hz</span>
              <span>DETERMINISTIC SIM</span>
            </div>
            <div className="border-r border-line pr-2 text-right">
              <span className="text-phosphor block font-bold">60 FPS</span>
              <span>INTERPOLATED</span>
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
        <React.Suspense fallback={null}>
          <HotWash onClose={closeAar} />
        </React.Suspense>
      )}

      {/* 7. Operator Quick-Start Guide Modal */}
      {isQuickGuideOpen && <QuickGuide onClose={closeQuickGuide} />}

      {/* 8. F5 Elevation Cross-Section Training Aid Modal */}
      {showCrossSection && engineInstance.mode !== 'EVAL' && (
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      )}

      {/* 9. Mission Scenario Selector Modal */}
      {isScenarioModalOpen && <ScenarioModal onClose={closeScenarioModal} />}

      {/* 10. WebXR VR Comfort & Safety Advisory Modal */}
      <WebXrComfortModal
        isOpen={isVrModalOpen}
        onConfirm={handleConfirmVr}
        onCancel={() => setIsVrModalOpen(false)}
      />
    </div>
  );
};

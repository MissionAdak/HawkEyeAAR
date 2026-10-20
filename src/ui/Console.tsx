import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { TrackTable } from './TrackTable';
import { EngagementPanel } from './EngagementPanel';
import { EventLog } from './EventLog';
import { HotWash } from './HotWash';
import { QuickGuide } from './QuickGuide';
import { ConsoleRenderer } from '@/render/renderer';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import type { SensorMode, TrackEntity } from '@/sim/types';
import type { SafeTrackView, CameraPreset } from '@/render3d/types';
import type { Renderer3D } from '@/render3d';
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

export const Console: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ConsoleRenderer | null>(null);
  const renderer3dRef = useRef<Renderer3D | null>(null);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [webGlError, setWebGlError] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('OBLIQUE');

  const activeSensor = useSessionStore((s) => s.ui.activeSensor);
  const recentEvents = useSessionStore((s) => s.ui.recentEvents);
  const setSensor = useSessionStore((s) => s.setSensor);
  const designate = useSessionStore((s) => s.designate);
  const isAarOpen = useSessionStore((s) => s.isAarOpen);
  const openAar = useSessionStore((s) => s.openAar);
  const closeAar = useSessionStore((s) => s.closeAar);
  const isQuickGuideOpen = useSessionStore((s) => s.isQuickGuideOpen);
  const closeQuickGuide = useSessionStore((s) => s.closeQuickGuide);
  const abortSession = useSessionStore((s) => s.abortSession);

  const [mousePos, setMousePos] = useState<{ brg: number; rngKm: number } | null>(null);
  const [lowFi, setLowFi] = useState<boolean>(false);

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

  // Cleanup 3D Renderer on unmount
  useEffect(() => {
    return () => {
      renderer3dRef.current?.dispose();
      renderer3dRef.current = null;
    };
  }, []);

  // Toggle 2D / 3D Tactical View with WebGL2 probe and graceful fallback
  const toggleViewMode = async () => {
    if (viewMode === '3D') {
      renderer3dRef.current?.stop();
      setViewMode('2D');
      return;
    }

    try {
      const { Renderer3D, checkWebGL2Support } = await import('@/render3d');
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
          onContextLost: () => {
            renderer3dRef.current?.stop();
            setViewMode('2D');
            setWebGlError('WebGL2 context lost. Restored 2D Canvas baseline.');
          },
        });

        r3d.setTrackProvider(() => ({
          tracks: projectSafeTracks(engineInstance.curr, engineInstance.selectedTrackNo),
          selectedTrackNo: engineInstance.selectedTrackNo,
        }));

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

  // Keyboard navigation & Hotkeys (including 'v' toggle and 3D camera presets)
  useConsoleKeyboard(rendererRef, setLowFi, toggleViewMode, handleCameraPreset);

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
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left - 260; // relative to center
    const dy = 260 - (e.clientY - rect.top); // y-up

    const scale = 245 / 5000; // 245px radius = 5000m
    const rangeM = Math.hypot(dx, dy) / scale;
    const bearingRad = Math.atan2(dx, dy);
    let bearingDeg = Math.round((bearingRad * 180) / Math.PI);
    if (bearingDeg < 0) bearingDeg += 360;

    setMousePos({ brg: bearingDeg, rngKm: Number((rangeM / 1000).toFixed(2)) });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - 260;
    const clickY = 260 - (e.clientY - rect.top);

    const scale = 245 / 5000;
    // Find nearest entity within 15px radius
    let nearestTrackNo: string | null = null;
    let nearestDist = 15;

    for (const entity of engineInstance.curr) {
      if (!entity.trackNo || entity.lifecycle !== 'ACTIVE') continue;
      const ex = entity.pos.x * scale;
      const ey = entity.pos.y * scale;
      const d = Math.hypot(clickX - ex, clickY - ey);
      if (d < nearestDist) {
        nearestDist = d;
        nearestTrackNo = entity.trackNo;
      }
    }

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
            <div className="absolute top-2 left-2 z-10 flex gap-1 font-display text-[10px]">
              {/* Sensor Tabs (2D Mode) */}
              {viewMode === '2D' &&
                (['RADAR', 'EOIR', 'RF'] as const).map((m: SensorMode, idx) => (
                  <button
                    key={m}
                    onClick={() => setSensor(m)}
                    className={`px-2 py-0.5 border transition-colors ${
                      activeSensor === m
                        ? 'border-phosphor text-phosphor bg-phosphorDim/40 font-bold'
                        : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
                    }`}
                  >
                    [{idx + 1}] {m === 'EOIR' ? 'EO/IR' : m}
                  </button>
                ))}

              {/* 3D Camera Presets (3D Mode) */}
              {viewMode === '3D' && (
                <>
                  {(['OBLIQUE', 'TOP', 'POST'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleCameraPreset(preset)}
                      className={`px-2 py-0.5 border transition-colors ${
                        cameraPreset === preset
                          ? 'border-phosphor text-phosphor bg-phosphorDim/40 font-bold'
                          : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
                      }`}
                    >
                      [{preset[0]}] {preset}
                    </button>
                  ))}
                </>
              )}

              {/* 2D / 3D Mode Toggle Button */}
              <button
                onClick={toggleViewMode}
                title="Toggle 2D/3D Tactical View [V]"
                className={`px-2 py-0.5 border font-bold transition-colors ${
                  viewMode === '3D'
                    ? 'border-friend text-friend bg-friend/20'
                    : 'border-line text-text-dim bg-carbon-900/80 hover:text-text-main'
                }`}
              >
                [V] {viewMode === '3D' ? '2D RADAR' : '3D VIEW'}
              </button>
            </div>

            {/* Overlaid Cursor Bearing / Range Readout (2D) or 3D Camera Readout */}
            <div className="absolute top-2 right-2 z-10 font-mono text-[10px] text-text-dim bg-carbon-900/80 border border-line px-2 py-0.5">
              {renderScopeReadout()}
            </div>

            {/* 3D Orbit Control Hint */}
            {viewMode === '3D' && (
              <div className="absolute bottom-2 right-2 z-10 text-[9px] font-mono text-text-dim bg-carbon-900/80 border border-line px-1.5 py-0.5">
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
      {isAarOpen && <HotWash onClose={closeAar} />}

      {/* 7. Operator Quick-Start Guide Modal */}
      {isQuickGuideOpen && <QuickGuide onClose={closeQuickGuide} />}
    </div>
  );
};

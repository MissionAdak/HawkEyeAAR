import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { TrackTable } from './TrackTable';
import { EngagementPanel } from './EngagementPanel';
import { EventLog } from './EventLog';
import { HotWash } from './HotWash';
import { QuickGuide } from './QuickGuide';
import { ConsoleRenderer } from '@/render/renderer';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import type { SensorMode } from '@/sim/types';
import { CLASSES, type TrackClass } from '@/sim/taxonomy';

export const Console: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ConsoleRenderer | null>(null);

  const activeSensor = useSessionStore((s) => s.ui.activeSensor);
  const selectedTrack = useSessionStore((s) => s.ui.selectedTrack);
  const recentEvents = useSessionStore((s) => s.ui.recentEvents);
  const setSensor = useSessionStore((s) => s.setSensor);
  const designate = useSessionStore((s) => s.designate);
  const classify = useSessionStore((s) => s.classify);
  const assess = useSessionStore((s) => s.assess);
  const cycleTrack = useSessionStore((s) => s.cycleTrack);
  const fire = useSessionStore((s) => s.fire);
  const pause = useSessionStore((s) => s.pause);
  const resume = useSessionStore((s) => s.resume);
  const isPaused = useSessionStore((s) => s.ui.isPaused);
  const isAarOpen = useSessionStore((s) => s.isAarOpen);
  const openAar = useSessionStore((s) => s.openAar);
  const closeAar = useSessionStore((s) => s.closeAar);
  const isQuickGuideOpen = useSessionStore((s) => s.isQuickGuideOpen);
  const openQuickGuide = useSessionStore((s) => s.openQuickGuide);
  const closeQuickGuide = useSessionStore((s) => s.closeQuickGuide);

  const [mousePos, setMousePos] = useState<{ brg: number; rngKm: number } | null>(null);
  const [lowFi, setLowFi] = useState<boolean>(false);

  // Initialize Canvas Renderer Loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    // Set internal resolution matching CSS 520x520
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

  // Keyboard navigation & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '1':
          setSensor('RADAR');
          break;
        case '2':
          setSensor('EOIR');
          break;
        case '3':
          setSensor('RF');
          break;
        case 'Tab':
          e.preventDefault();
          cycleTrack(e.shiftKey ? 'PREV' : 'NEXT');
          break;
        case ' ':
          e.preventDefault();
          if (selectedTrack) {
            designate(selectedTrack.trackNo, 'KEY');
          } else {
            cycleTrack('NEXT');
          }
          break;
        case 'f':
        case 'F':
          if (selectedTrack && e.repeat === false) {
            fire(selectedTrack.trackNo);
          }
          break;
        case 'c':
        case 'C':
          if (selectedTrack) {
            const currentIdx = CLASSES.indexOf(selectedTrack.label as TrackClass);
            const nextClass = CLASSES[(currentIdx + 1) % CLASSES.length];
            classify(selectedTrack.trackNo, nextClass);
          }
          break;
        case 'a':
        case 'A':
          if (selectedTrack) {
            assess(selectedTrack.trackNo, 'KILL');
          }
          break;
        case 'm':
        case 'M':
          openAar();
          break;
        case '?':
        case 'h':
        case 'H':
          openQuickGuide();
          break;
        case 'Escape':
          closeQuickGuide();
          closeAar();
          break;
        case 'p':
        case 'P':
          if (isPaused) {
            resume();
          } else {
            pause();
          }
          break;
        case 'l':
        case 'L':
          setLowFi((prev) => {
            const next = !prev;
            rendererRef.current?.setLowFidelity(next);
            return next;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrack, isPaused, setSensor, cycleTrack, designate, classify, assess, fire, pause, resume, openAar, openQuickGuide, closeQuickGuide, closeAar]);

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
            className="radar-frame border border-line bg-carbon-950 flex items-center justify-center"
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
              className="cursor-crosshair block"
            />

            {/* Overlaid Mode Selector Tabs Inside Canvas (Zero Height Consumption) */}
            <div className="absolute top-2 left-2 z-10 flex gap-1 font-display text-[10px]">
              {(['RADAR', 'EOIR', 'RF'] as const).map((m: SensorMode, idx) => (
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
            </div>

            {/* Overlaid Cursor Bearing / Range Readout */}
            <div className="absolute top-2 right-2 z-10 font-mono text-[10px] text-text-dim bg-carbon-900/80 border border-line px-2 py-0.5">
              {mousePos ? (
                <span>
                  AZ <span className="text-phosphor">{String(mousePos.brg).padStart(3, '0')}°</span> | RNG{' '}
                  <span className="text-phosphor">{mousePos.rngKm.toFixed(2)} km</span>
                </span>
              ) : (
                <span>PPI SCOPE 360°</span>
              )}
            </div>

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

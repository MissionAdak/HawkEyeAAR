import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import type { SimEvent, ScenarioSpec, ZoneSpec } from '@/sim/types';
import { ReplayCanvas } from './ReplayCanvas';
const AarReplay3D = lazy(() => import('./AarReplay3D').then((m) => ({ default: m.AarReplay3D })));
import {
  reconstructAarReplayState,
  convertToReplayEntities,
} from './aarReplayData';

interface AarReplaySectionProps {
  events: SimEvent[];
  spec?: ScenarioSpec;
  zones?: ZoneSpec[];
  initialTrackNo?: string | null;
}

export const AarReplaySection: React.FC<AarReplaySectionProps> = ({
  events,
  spec,
  zones = [],
  initialTrackNo = null,
}) => {
  const endEvent = events.find((e) => e.type === 'SESSION_END');
  const durationMs =
    (endEvent?.payload as { durationMs?: number })?.durationMs ??
    (spec?.durationMs ?? 120000);

  const [tMs, setTMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [showGroundTruth, setShowGroundTruth] = useState<boolean>(true);
  const [selectedTrackNo, setSelectedTrackNo] = useState<string | null>(initialTrackNo);

  const lastAnimTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Reconstruct AAR state for current playhead
  const replayState = reconstructAarReplayState(events, tMs, spec);
  const replayEntities = convertToReplayEntities(replayState.tracks);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      lastAnimTimeRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const stepPlayhead = (now: number) => {
      if (lastAnimTimeRef.current !== null) {
        const deltaRealMs = now - lastAnimTimeRef.current;
        const deltaSimMs = deltaRealMs * playbackSpeed;

        setTMs((prev) => {
          const next = prev + deltaSimMs;
          if (next >= durationMs) {
            setIsPlaying(false);
            return durationMs;
          }
          return next;
        });
      }
      lastAnimTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(stepPlayhead);
    };

    animFrameRef.current = requestAnimationFrame(stepPlayhead);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, durationMs]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const seek = useCallback((newTMs: number) => {
    setTMs(Math.max(0, Math.min(durationMs, newTMs)));
  }, [durationMs]);

  const stepTime = useCallback((deltaMs: number) => {
    seek(tMs + deltaMs);
  }, [seek, tMs]);

  const totalSec = Math.floor(tMs / 1000);
  const ms = Math.floor(tMs % 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const currentClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

  const durTotalSec = Math.floor(durationMs / 1000);
  const durMins = Math.floor(durTotalSec / 60);
  const durSecs = durTotalSec % 60;
  const totalClock = `${String(durMins).padStart(2, '0')}:${String(durSecs).padStart(2, '0')}.000`;

  return (
    <div className="border border-line bg-carbon-950 p-3 space-y-3 font-mono">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-display font-bold text-text-main tracking-wider">
            SYNCHRONIZED AAR TIMELINE REPLAY
          </span>
          <span className="text-[9px] text-text-dim border border-line px-1.5 py-0.5">
            {replayState.hasSnapshotHistory ? 'SNAPSHOT REPLAY' : 'EVENT LOG ONLY'}
          </span>
        </div>

        {/* Replay Mode Toggle (2D / 3D) */}
        <div className="flex items-center gap-1.5">
          <div className="flex border border-line bg-carbon-900 p-0.5">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                viewMode === '2D'
                  ? 'bg-phosphor text-carbon-950'
                  : 'text-text-dim hover:text-text-main'
              }`}
            >
              2D RADAR
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                viewMode === '3D'
                  ? 'bg-phosphor text-carbon-950'
                  : 'text-text-dim hover:text-text-main'
              }`}
            >
              3D TACTICAL
            </button>
          </div>

          <button
            onClick={() => setShowGroundTruth((p) => !p)}
            className={`px-2 py-1 text-[10px] font-bold border transition-colors ${
              showGroundTruth
                ? 'bg-white text-carbon-950 border-white'
                : 'bg-carbon-900 text-text-dim border-line hover:text-text-main'
            }`}
          >
            {`[G] TRUTH: ${showGroundTruth ? 'ON' : 'OFF'}`}
          </button>
        </div>
      </div>

      {/* Main Display: Replay Screen + Track Inspector */}
      <div className="flex flex-col md:flex-row gap-3 items-center md:items-start justify-center">
        {/* Replay View Container */}
        <div className="flex-shrink-0">
          {viewMode === '2D' ? (
            <ReplayCanvas
              tMs={tMs}
              entities={replayEntities}
              events={events}
              zones={zones}
              showGroundTruth={showGroundTruth}
              onToggleGroundTruth={() => setShowGroundTruth((p) => !p)}
              selectedTrackNo={selectedTrackNo}
              onSelectTrack={(t) => setSelectedTrackNo(t)}
            />
          ) : (
            <Suspense
              fallback={
                <div
                  className="border border-line bg-carbon-950 flex items-center justify-center font-mono text-[11px] text-text-dim"
                  style={{ width: 'var(--radar, 520px)', height: 'var(--radar, 520px)' }}
                >
                  LOADING 3D AAR...
                </div>
              }
            >
              <AarReplay3D
                replayState={replayState}
                selectedTrackNo={selectedTrackNo}
                onSelectTrack={(t) => setSelectedTrackNo(t)}
              />
            </Suspense>
          )}
        </div>

        {/* Tracks at Playhead Table */}
        <div className="flex-1 w-full border border-line bg-carbon-900 p-2.5 space-y-2 h-[360px] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center text-[10px] text-text-dim border-b border-line pb-1">
            <span className="font-bold text-text-main">ACTIVE TRACKS AT T+{currentClock}</span>
            <span>{replayState.tracks.length} TARGETS</span>
          </div>

          {!replayState.hasSnapshotHistory && (
            <div className="flex-1 flex items-center justify-center text-center p-4 text-[10px] text-amber italic border border-amber/30 bg-amber/5">
              ⚠ Historical snapshot keyframes not present in this event stream.
              Positions are not fabricated to maintain empirical fidelity.
            </div>
          )}

          {replayState.hasSnapshotHistory && replayState.tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center p-4 text-[11px] text-text-dim italic">
              NO DETECTED THREATS IN SENSOR RANGE AT THIS TIME.
            </div>
          )}

          {replayState.hasSnapshotHistory && replayState.tracks.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {replayState.tracks.map((trk) => {
                const isSelected = trk.trackNo === selectedTrackNo;
                let trackClassColor = 'text-text-dim';
                if (trk.trueClass === 'HOSTILE_ATTACK' || trk.trueClass === 'HOSTILE_ISR' || trk.trueClass === 'SWARM_ELEMENT') {
                  trackClassColor = 'text-threat';
                } else if (trk.trueClass === 'CIVIL_UAS') {
                  trackClassColor = 'text-amber';
                } else if (trk.trueClass === 'FRIENDLY') {
                  trackClassColor = 'text-friend';
                }

                return (
                  <button
                    type="button"
                    key={trk.id}
                    onClick={() => setSelectedTrackNo(trk.trackNo)}
                    className={`w-full text-left p-2 border cursor-pointer text-[10px] transition-colors ${
                      isSelected
                        ? 'border-friend bg-friend/15'
                        : 'border-line bg-carbon-950 hover:border-text-dim'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-text-main">{trk.trackNo ?? 'UNKNOWN'}</span>
                      <span className={trackClassColor}>
                        {trk.trueClass}
                      </span>
                    </div>

                    <div className="flex justify-between text-[9px] text-text-dim mt-1">
                      <span>
                        OP LBL: <span className="text-text-main font-semibold">{trk.traineeLabel ?? 'NONE'}</span>
                      </span>
                      <span>
                        ALT: <span className="text-text-main font-semibold">{trk.truthPos.z.toFixed(0)}m</span>
                      </span>
                      <span>
                        STATUS: <span className={trk.isMasked ? 'text-amber' : 'text-phosphor'}>
                          {trk.isMasked ? 'MASKED' : trk.step}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Event Marker Banner */}
          {replayState.activeMaskingMarker && (
            <div className="text-[10px] p-1.5 border border-amber bg-amber/20 text-amber font-bold flex justify-between">
              <span>{replayState.activeMaskingMarker.label}</span>
              <span>T+{Math.floor(replayState.activeMaskingMarker.tMs / 1000)}s</span>
            </div>
          )}

          {replayState.activeEngagement && (
            <div className="text-[10px] p-1.5 border border-threat bg-threat/20 text-threat font-bold flex justify-between">
              <span>ENGAGE {replayState.activeEngagement.effector}</span>
              <span>{replayState.activeEngagement.killed ? 'HIT' : 'MISS'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrubber Timeline Bar & Play Controls */}
      <div className="border border-line bg-carbon-900 p-2.5 space-y-2">
        {/* Playback Controls & Clocks */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => seek(0)}
              title="Jump to Start"
              className="px-2 py-1 text-[10px] font-bold border border-line bg-carbon-950 hover:border-text-dim text-text-dim"
            >
              ⏮
            </button>
            <button
              onClick={() => stepTime(-1000)}
              title="Step Back 1s"
              className="px-2 py-1 text-[10px] font-bold border border-line bg-carbon-950 hover:border-text-dim text-text-dim"
            >
              -1s
            </button>
            <button
              onClick={togglePlay}
              className={`px-3 py-1 text-[10px] font-bold border transition-colors ${
                isPlaying
                  ? 'border-amber bg-amber text-carbon-950'
                  : 'border-phosphor bg-phosphor text-carbon-950'
              }`}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button
              onClick={() => stepTime(1000)}
              title="Step Forward 1s"
              className="px-2 py-1 text-[10px] font-bold border border-line bg-carbon-950 hover:border-text-dim text-text-dim"
            >
              +1s
            </button>
          </div>

          {/* Speed Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-dim mr-1">SPEED:</span>
            {[0.5, 1.0, 2.0, 4.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                  playbackSpeed === spd
                    ? 'border-phosphor bg-phosphor/20 text-phosphor'
                    : 'border-line text-text-dim hover:text-text-main'
                }`}
              >
                {`${spd}x`}
              </button>
            ))}
          </div>

          {/* Clock Display */}
          <div className="text-[11px] font-clock font-bold text-text-main bg-carbon-950 px-2 py-1 border border-line">
            <span className="text-phosphor">{currentClock}</span>
            <span className="text-text-dim"> / {totalClock}</span>
          </div>
        </div>

        {/* Range Slider Scrubber */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={durationMs}
            step={50}
            value={tMs}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full accent-phosphor bg-carbon-950 cursor-pointer h-2"
          />
        </div>

        {/* Key Events Jump Strip */}
        {replayState.keyEvents.length > 0 && (
          <div className="pt-1 border-t border-line/40">
            <div className="text-[9px] text-text-dim mb-1">KEY EVENT TIMELINE (CLICK TO JUMP):</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {replayState.keyEvents.map((ev) => (
                <button
                  key={`${ev.seq}-${ev.tMs}`}
                  onClick={() => seek(ev.tMs)}
                  className={`px-2 py-0.5 text-[9px] font-bold border whitespace-nowrap transition-colors bg-carbon-950 hover:bg-carbon-800 ${ev.badgeClass}`}
                >
                  {`T+${(ev.tMs / 1000).toFixed(1)}s [${ev.type}]`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

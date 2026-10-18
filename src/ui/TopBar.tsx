import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '@/store/sessionStore';

export const TopBar: React.FC = () => {
  const { roeText, sensorHealth, formattedClock, mode, difficulty, isPaused } = useSessionStore(
    useShallow((s) => ({
      roeText: s.ui.roeText,
      sensorHealth: s.ui.sensorHealth,
      formattedClock: s.ui.formattedClock,
      mode: s.ui.mode,
      difficulty: s.ui.difficulty,
      isPaused: s.ui.isPaused,
    }))
  );
  const pause = useSessionStore((s) => s.pause);
  const resume = useSessionStore((s) => s.resume);
  const simSpeed = useSessionStore((s) => s.simSpeed);
  const setSpeed = useSessionStore((s) => s.setSpeed);
  const openAar = useSessionStore((s) => s.openAar);

  const getPillClass = (status: 'OK' | 'DEG' | 'OUT') => {
    switch (status) {
      case 'OK':
        return 'text-phosphor border-phosphor bg-phosphorDim/30';
      case 'DEG':
        return 'text-amber border-amber bg-amber/20 animate-pulse';
      case 'OUT':
        return 'text-threat border-threat bg-threat/20 animate-pulse';
    }
  };

  return (
    <header className="h-[45px] w-full bg-carbon-900 border-b border-line px-3 flex items-center justify-between font-display text-xs select-none">
      {/* Left: ROE Active Banner */}
      <div className="flex items-center gap-2 max-w-[45%] truncate">
        <span className="text-[10px] tracking-wider text-text-dim px-1.5 py-0.5 bg-carbon-800 border border-line">
          ROE
        </span>
        <span className="text-amber font-mono text-[11px] font-semibold tracking-wide truncate">
          {roeText}
        </span>
      </div>

      {/* Center: Sensor Health Indicators */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-text-dim text-[10px]">SENSORS:</span>
          <span className={`px-1.5 py-0.5 border text-[10px] ${getPillClass(sensorHealth.RADAR)}`}>
            RDR {sensorHealth.RADAR}
          </span>
          <span className={`px-1.5 py-0.5 border text-[10px] ${getPillClass(sensorHealth.EOIR)}`}>
            EO/IR {sensorHealth.EOIR}
          </span>
          <span className={`px-1.5 py-0.5 border text-[10px] ${getPillClass(sensorHealth.RF)}`}>
            RF {sensorHealth.RF}
          </span>
        </div>
      </div>

      {/* Right: Mission Clock, Mode, Controls */}
      <div className="flex items-center gap-3">
        <div className="font-clock text-lg text-phosphor tracking-widest bg-carbon-950 px-2.5 py-0.5 border border-line">
          {formattedClock}
        </div>

        <div className="text-[11px] font-mono text-text-dim border border-line px-2 py-0.5 bg-carbon-800">
          <span className="text-text-main font-semibold">{mode}</span> d={difficulty.toFixed(2)}
        </div>

        {/* Simulation Speed Toggle */}
        <div className="flex items-center border border-line bg-carbon-800 text-[10px] font-mono">
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setSpeed(spd)}
              className={`px-1.5 py-0.5 transition-colors ${
                simSpeed === spd
                  ? 'bg-phosphor text-carbon-950 font-bold'
                  : 'text-text-dim hover:text-text-main'
              }`}
              title={`Sim Speed ${spd}x`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* AAR Debrief Modal Button */}
        <button
          onClick={openAar}
          className="px-2.5 py-0.5 border border-phosphor bg-phosphorDim/30 text-phosphor hover:bg-phosphor hover:text-carbon-950 text-[11px] font-display font-bold tracking-wider transition-all"
          title="Open After Action Review & Scoring Debrief"
        >
          [AAR SCORECARD]
        </button>

        <button
          onClick={() => (isPaused ? resume() : pause())}
          className="px-2 py-0.5 border border-line hover:border-phosphor text-[11px] font-mono bg-carbon-800 text-text-main hover:text-phosphor transition-colors"
          title="Pause / Resume Sim (P)"
        >
          {isPaused ? '[P] RESUME' : '[P] PAUSE'}
        </button>
      </div>
    </header>
  );
};

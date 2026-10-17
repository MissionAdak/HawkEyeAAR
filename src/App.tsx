import React, { useEffect } from 'react';
import { useSessionStore } from './store/sessionStore';
import { SimEngine } from './sim/engine';
import { SimClock } from './sim/clock';
import { CONFIG, CONFIG_HASH } from './config';

export const App: React.FC = () => {
  const ui = useSessionStore((state) => state.ui);
  const setEngine = useSessionStore((state) => state.setEngine);

  useEffect(() => {
    const engine = new SimEngine();
    setEngine(engine);
  }, [setEngine]);

  const clockText = `T+${String(Math.floor(ui.simTimeMs / 1000)).padStart(2, '0')}:${String(
    Math.floor((ui.simTimeMs % 1000) / 10)
  ).padStart(2, '0')}.${String(ui.simTimeMs % 10).padStart(1, '0')}`;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-carbon-950 text-text font-mono select-none">
      {/* Top Bar (45px) */}
      <header className="h-[45px] px-3 border-b border-line bg-carbon-900 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 text-xs">
          <span className="font-chakra font-bold tracking-wider text-phosphor text-sm">
            DRISHTI-CUAS
          </span>
          <span className="text-amber bg-amber/10 border border-amber/30 px-2 py-0.5 text-[11px] font-chakra">
            {ui.roeBanner}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          {/* Sensor health pills */}
          <div className="flex space-x-1 font-chakra font-semibold text-[11px]">
            <span
              className={`px-1.5 py-0.5 border ${
                ui.sensorHealth.radar === 'OK'
                  ? 'border-phosphor/40 text-phosphor bg-phosphor/10'
                  : 'border-amber/40 text-amber bg-amber/10'
              }`}
            >
              RDR {ui.sensorHealth.radar}
            </span>
            <span
              className={`px-1.5 py-0.5 border ${
                ui.sensorHealth.eoir === 'OK'
                  ? 'border-phosphor/40 text-phosphor bg-phosphor/10'
                  : 'border-amber/40 text-amber bg-amber/10'
              }`}
            >
              EO/IR {ui.sensorHealth.eoir}
            </span>
            <span
              className={`px-1.5 py-0.5 border ${
                ui.sensorHealth.rf === 'OK'
                  ? 'border-phosphor/40 text-phosphor bg-phosphor/10'
                  : 'border-amber/40 text-amber bg-amber/10'
              }`}
            >
              RF {ui.sensorHealth.rf}
            </span>
          </div>

          <span className="font-share text-phosphor text-lg tracking-wider">
            {clockText}
          </span>

          <span className="text-text-dim text-[11px] border border-line px-1.5 py-0.5">
            SPEED 1x
          </span>

          <span className="text-phosphor text-[11px] border border-phosphor-dim px-1.5 py-0.5 font-chakra">
            TRAIN d=0.30
          </span>
        </div>
      </header>

      {/* Main Console Grid */}
      <main className="flex-1 grid grid-cols-[240px_minmax(0,1fr)_320px] overflow-hidden min-h-0">
        {/* Left Rail: Track Table (240px) */}
        <aside className="w-[240px] border-r border-line bg-carbon-900 flex flex-col overflow-hidden">
          <div className="h-7 border-b border-line px-2 flex items-center justify-between text-[11px] font-chakra font-semibold text-text-dim">
            <span>TRACK TABLE</span>
            <span>{ui.tracks.length} / 150</span>
          </div>
          <div className="flex-1 overflow-y-auto text-xs p-1">
            {ui.tracks.length === 0 ? (
              <div className="p-3 text-text-dim text-[11px] text-center">
                NO ACTIVE TRACKS
              </div>
            ) : (
              ui.tracks.map((t) => (
                <div
                  key={t.trackNo}
                  className="px-2 py-1 border-b border-line/40 flex justify-between items-center text-[11px] hover:bg-carbon-800"
                >
                  <span className="text-phosphor font-semibold">{t.trackNo}</span>
                  <span className="text-text-dim">{t.shortCode}</span>
                  <span>{t.rangeKm} km</span>
                  <span className="text-text-dim">{t.status}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center: Radar Canvas Frame */}
        <section className="flex items-center justify-center bg-carbon-950 p-2 overflow-hidden relative">
          <div
            className="border border-line bg-carbon-900/40 relative flex items-center justify-center"
            style={{ width: 'var(--radar)', height: 'var(--radar)' }}
          >
            {/* Overlay Sensor Mode Tabs */}
            <div className="absolute top-2 left-2 z-10 flex space-x-1 font-chakra text-[10px]">
              <button
                className={`px-2 py-0.5 border ${
                  ui.sensorMode === 'RADAR'
                    ? 'border-phosphor text-phosphor bg-phosphor/10'
                    : 'border-line text-text-dim bg-carbon-900'
                }`}
              >
                [1] RADAR
              </button>
              <button
                className={`px-2 py-0.5 border ${
                  ui.sensorMode === 'EOIR'
                    ? 'border-phosphor text-phosphor bg-phosphor/10'
                    : 'border-line text-text-dim bg-carbon-900'
                }`}
              >
                [2] EO/IR
              </button>
              <button
                className={`px-2 py-0.5 border ${
                  ui.sensorMode === 'RF'
                    ? 'border-phosphor text-phosphor bg-phosphor/10'
                    : 'border-line text-text-dim bg-carbon-900'
                }`}
              >
                [3] RF
              </button>
            </div>

            {/* Radar Viewport placeholder */}
            <div className="text-center text-text-dim text-xs font-chakra space-y-1">
              <div className="text-phosphor font-bold tracking-widest text-sm">
                RADAR SCOPE VIEWPORT
              </div>
              <div className="text-[11px]">
                520x520 px Native Canvas 2D Core
              </div>
              <div className="text-[10px] text-text-dim">
                CONFIG HASH: {CONFIG_HASH.slice(0, 16)}...
              </div>
            </div>
          </div>
        </section>

        {/* Right Rail: F2T2EA & Effectors (320px) */}
        <aside className="w-[320px] border-l border-line bg-carbon-900 flex flex-col overflow-hidden">
          <div className="h-7 border-b border-line px-2 flex items-center justify-between text-[11px] font-chakra font-semibold text-text-dim">
            <span>F2T2EA ENGAGEMENT PANEL</span>
            <span className="text-phosphor text-[10px]">[SPACE] DESIGNATE</span>
          </div>
          <div className="p-2 space-y-2 text-xs">
            {/* Kill Chain Cells */}
            <div className="grid grid-cols-6 gap-1 text-[9px] font-chakra text-center">
              {['FIND', 'FIX', 'TRACK', 'TARGET', 'ENGAGE', 'ASSESS'].map(
                (step, idx) => (
                  <div
                    key={step}
                    className={`p-1 border ${
                      idx === 0
                        ? 'border-phosphor text-phosphor bg-phosphor/10 font-bold'
                        : 'border-line text-text-dim'
                    }`}
                  >
                    {step}
                  </div>
                )
              )}
            </div>

            {/* Effector Catalog Preview */}
            <div className="border border-line p-2 bg-carbon-950/60 space-y-1">
              <div className="text-[10px] font-chakra text-text-dim">
                AVAILABLE EFFECTORS
              </div>
              {Object.entries(CONFIG.effectors).map(([key, eff]) => (
                <div
                  key={key}
                  className="flex justify-between items-center text-[10px] border-b border-line/30 py-0.5"
                >
                  <span className="text-phosphor">{eff.name}</span>
                  <span className="text-text-dim">₹{eff.costInr.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Bar: Event Log (110px) */}
      <footer className="h-[110px] border-t border-line bg-carbon-900 flex flex-col shrink-0">
        <div className="h-6 border-b border-line px-3 flex items-center justify-between text-[10px] font-chakra text-text-dim">
          <span>TACTICAL EVENT CONSOLE (8 LINES MAX)</span>
          <span>AIR-GAP ENFORCED: ZERO SERVER</span>
        </div>
        <div className="flex-1 overflow-hidden px-3 py-1 font-mono text-[11px] leading-[13px] space-y-0.5">
          {ui.recentEvents.length === 0 ? (
            <div className="text-text-dim">00:00.000  SYS  INITIALIZED DETERMINISTIC 20 HZ ENGINE CORE</div>
          ) : (
            ui.recentEvents.map((ev) => (
              <div key={ev.seq} className="text-text-dim">
                {SimClock.toSimTimeMs(ev.seq)} ms  [{ev.type}] {JSON.stringify(ev.payload)}
              </div>
            ))
          )}
        </div>
        <div className="h-4 bg-carbon-950 border-t border-line px-3 flex items-center justify-between text-[9px] text-text-dim font-chakra">
          <span>SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION</span>
          <span>SIH PS 26247</span>
        </div>
      </footer>
    </div>
  );
};

export default App;

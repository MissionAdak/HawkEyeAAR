import React from 'react';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import { getScenarioCatalogEntry } from '@/director/catalog';
import type { UiTrackRow } from '@/sim/engine';

export const TrackTable: React.FC = () => {
  const trackRows = useSessionStore((s) => s.ui.trackRows);
  const selectedTrackNo = useSessionStore((s) => s.ui.selectedTrackNo);
  const designate = useSessionStore((s) => s.designate);
  const currentScenarioId = useSessionStore((s) => s.currentScenarioId);
  const openScenarioModal = useSessionStore((s) => s.openScenarioModal);
  const restartSession = useSessionStore((s) => s.restartSession);
  const mode = useSessionStore((s) => s.ui.mode);

  const isEvalLocked = mode === 'EVAL' && !engineInstance.sessionEnded && engineInstance.tickIndex > 0;
  const currentEntry = getScenarioCatalogEntry(currentScenarioId);

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'COAST':
        return 'text-amber border-amber bg-amber/10';
      case 'LEAK':
        return 'text-threat border-threat bg-threat/20 font-bold';
      case 'ASSESS':
        return 'text-friend border-friend bg-friend/10';
      case 'TARGET':
        return 'text-phosphor border-phosphor bg-phosphorDim/20';
      case 'ENGAGE':
        return 'text-threat border-threat bg-threat/10';
      default:
        return 'text-text-dim border-line bg-carbon-800';
    }
  };

  const getLabelColor = (label: string | null) => {
    if (!label) return 'text-text-dim';
    if (label.startsWith('HOSTILE') || label.startsWith('SWARM')) return 'text-threat font-bold';
    if (label === 'FRIENDLY') return 'text-friend font-bold';
    if (label === 'CIVIL_UAS') return 'text-phosphor';
    if (label === 'BIRD') return 'text-unknown';
    return 'text-unknown';
  };

  return (
    <aside className="w-[240px] h-full bg-carbon-900 border-r border-line flex flex-col font-mono text-xs select-none">
      {/* Exercise / Scenario Selector Card */}
      <div className="px-2 py-1.5 border-b border-line bg-carbon-950 flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-display text-text-dim">EXERCISE:</span>
          <span
            className="font-mono font-bold text-phosphor truncate max-w-[150px]"
            title={currentEntry?.name ?? currentScenarioId}
          >
            {currentScenarioId}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openScenarioModal}
            disabled={isEvalLocked}
            className={`flex-1 py-1 px-1.5 text-center text-[10px] font-display font-bold border transition-colors ${
              isEvalLocked
                ? 'border-line text-text-dim opacity-40 cursor-not-allowed bg-carbon-900'
                : 'border-phosphor/70 hover:border-phosphor text-phosphor bg-phosphorDim/20 hover:bg-phosphorDim/40'
            }`}
            title={isEvalLocked ? 'Scenario selection locked during active EVAL' : 'Open Scenario Selector (S)'}
          >
            [S] SCENARIO
          </button>
          <button
            onClick={() => {
              if (engineInstance.tickIndex > 0 && !engineInstance.sessionEnded) {
                openScenarioModal();
              } else {
                void restartSession();
              }
            }}
            disabled={isEvalLocked}
            className={`py-1 px-2 text-center text-[10px] font-mono border transition-colors ${
              isEvalLocked
                ? 'border-line text-text-dim opacity-40 cursor-not-allowed bg-carbon-900'
                : 'border-line hover:border-text-main text-text-dim hover:text-text-main bg-carbon-900'
            }`}
            title={isEvalLocked ? 'Restart locked during active EVAL' : 'Restart active scenario'}
          >
            RESTART
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="h-[28px] px-2 flex items-center justify-between border-b border-line bg-carbon-800/60 shrink-0">
        <span className="font-display font-semibold text-[11px] text-text-main tracking-widest">
          TRACK DIRECTORY
        </span>
        <span className="text-[10px] text-text-dim">
          LIVE: {trackRows.length}
        </span>
      </div>

      {/* Table Headers */}
      <div className="h-[22px] px-1 flex items-center text-[10px] text-text-dim border-b border-line bg-carbon-950 font-mono">
        <div className="w-[44px] text-left pl-1">TRK</div>
        <div className="w-[28px] text-center">LBL</div>
        <div className="w-[46px] text-right">RNG</div>
        <div className="w-[36px] text-right">BRG</div>
        <div className="w-[34px] text-right">SPD</div>
        <div className="w-[52px] text-center">ST</div>
      </div>

      {/* Rows Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-line/40 custom-scrollbar">
        {trackRows.length === 0 ? (
          <div className="p-4 text-center text-text-dim text-[11px] italic">
            NO ACTIVE RADAR TRACKS
          </div>
        ) : (
          trackRows.map((t: UiTrackRow, idx: number) => {
            const isSelected = t.trackNo === selectedTrackNo;
            const isPriority = idx === 0 && !selectedTrackNo;
            return (
              <div
                key={t.trackNo}
                onClick={() => designate(t.trackNo, 'CLICK')}
                title="Click to lock track"
                className={`h-[24px] px-1 flex items-center text-[11px] cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-carbon-800 border-l-2 border-friend'
                    : isPriority
                      ? 'bg-phosphor/10 border-l-2 border-phosphor animate-pulse'
                      : 'hover:bg-carbon-800/60'
                }`}
              >
                <div className="w-[44px] font-bold text-text-main pl-1 flex items-center gap-1">
                  {isPriority && <span className="text-phosphor text-[8px]">▶</span>}
                  <span>{t.trackNo}</span>
                </div>
                <div className={`w-[28px] text-center ${getLabelColor(t.label)}`}>
                  {t.shortCode}
                </div>
                <div className="w-[46px] text-right tabular-nums text-text-main">
                  {t.rangeKm.toFixed(2)}
                </div>
                <div className="w-[36px] text-right tabular-nums text-text-dim">
                  {String(t.bearingDeg).padStart(3, '0')}°
                </div>
                <div className="w-[34px] text-right tabular-nums text-text-dim">
                  {t.speedMps}
                </div>
                <div className="w-[52px] flex justify-center">
                  <span className={`px-1 py-0 text-[9px] border leading-none ${getStatusPill(t.statusPill)}`}>
                    {t.statusPill}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Nav Hint */}
      <div className="h-[20px] px-2 border-t border-line text-[9px] text-text-dim flex items-center justify-between bg-carbon-950">
        <span>[TAB] CYCLE URGENCY</span>
        <span>[SPACE] FIX</span>
      </div>
    </aside>
  );
};

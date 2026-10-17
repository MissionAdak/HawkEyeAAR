import React from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { UiTrackRow } from '@/sim/engine';

export const TrackTable: React.FC = () => {
  const trackRows = useSessionStore((s) => s.ui.trackRows);
  const selectedTrackNo = useSessionStore((s) => s.ui.selectedTrackNo);
  const designate = useSessionStore((s) => s.designate);

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

  const getLabelColor = (label: string) => {
    if (label.startsWith('HOSTILE') || label.startsWith('SWARM')) return 'text-threat font-bold';
    if (label === 'FRIENDLY') return 'text-friend font-bold';
    if (label === 'CIVIL_UAS') return 'text-phosphor';
    if (label === 'BIRD') return 'text-unknown';
    return 'text-unknown';
  };

  return (
    <aside className="w-[240px] h-full bg-carbon-900 border-r border-line flex flex-col font-mono text-xs select-none">
      {/* Title */}
      <div className="h-[28px] px-2 flex items-center justify-between border-b border-line bg-carbon-800/60">
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
          trackRows.map((t: UiTrackRow) => {
            const isSelected = t.trackNo === selectedTrackNo;
            return (
              <div
                key={t.trackNo}
                onClick={() => designate(t.trackNo, 'CLICK')}
                className={`h-[22px] px-1 flex items-center text-[11px] cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-carbon-800 border-l-2 border-friend'
                    : 'hover:bg-carbon-800/40'
                }`}
              >
                <div className="w-[44px] font-bold text-text-main pl-1">{t.trackNo}</div>
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

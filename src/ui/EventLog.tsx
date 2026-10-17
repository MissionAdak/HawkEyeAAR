import React, { useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { SimEvent } from '@/sim/types';

export const EventLog: React.FC = () => {
  const events = useSessionStore((s) => s.ui.recentEvents);
  const [filter, setFilter] = useState<'ALL' | 'TRK' | 'ENG' | 'CHAOS' | 'ROE'>('ALL');

  const filteredEvents = events.filter((ev: SimEvent) => {
    if (filter === 'ALL') return true;
    if (filter === 'TRK') return ev.type === 'DETECT' || ev.type === 'TRACK_INIT' || ev.type === 'MASKED' || ev.type === 'REACQUIRE';
    if (filter === 'ENG') return ev.type === 'ENGAGE' || ev.type === 'ENGAGE_RESULT' || ev.type === 'ASSESS';
    if (filter === 'CHAOS') return ev.type === 'CHAOS_ON' || ev.type === 'CHAOS_OFF';
    if (filter === 'ROE') return ev.type === 'ROE_VIOLATION' || ev.type === 'FLAG' || ev.type === 'LEAK';
    return true;
  });

  const getEventColor = (type: string) => {
    switch (type) {
      case 'ROE_VIOLATION':
      case 'LEAK':
        return 'text-threat font-bold';
      case 'CHAOS_ON':
      case 'CHAOS_OFF':
      case 'MASKED':
        return 'text-amber';
      case 'ENGAGE_RESULT':
      case 'ENGAGE':
        return 'text-friend';
      case 'DETECT':
      case 'TRACK_INIT':
        return 'text-phosphor';
      default:
        return 'text-text-main';
    }
  };

  const formatPayload = (ev: SimEvent) => {
    const parts: string[] = [];
    if (ev.trackNo) parts.push(`TRK ${ev.trackNo}`);
    for (const [key, val] of Object.entries(ev.payload)) {
      if (typeof val === 'number') {
        parts.push(`${key}: ${val.toFixed(1)}`);
      } else if (typeof val === 'boolean' || typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      }
    }
    return parts.join(' | ');
  };

  return (
    <footer className="h-[110px] w-full bg-carbon-900 border-t border-line flex flex-col font-mono text-[11px] select-none">
      {/* Top Bar inside Footer: Filter Tabs & Status */}
      <div className="h-[20px] px-3 flex items-center justify-between border-b border-line bg-carbon-800 text-[10px]">
        <div className="flex items-center gap-1 font-display">
          <span className="text-text-dim mr-1">EVENT LOG:</span>
          {(['ALL', 'TRK', 'ENG', 'CHAOS', 'ROE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 py-0 border ${
                filter === f
                  ? 'border-phosphor text-phosphor bg-phosphorDim/30 font-bold'
                  : 'border-line text-text-dim hover:text-text-main'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="text-text-dim tracking-wider font-display text-[9px]">
          SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION
        </div>
      </div>

      {/* 8-Line Monospaced Event Stream */}
      <div className="flex-1 px-3 py-1 overflow-hidden flex flex-col justify-end space-y-0.5 leading-[13px]">
        {filteredEvents.length === 0 ? (
          <div className="text-text-dim italic text-[10px]">AWAITING SIMULATION EVENTS...</div>
        ) : (
          filteredEvents.slice(-8).map((ev: SimEvent) => {
            const totalSec = Math.floor(ev.tMs / 1000);
            const ms = ev.tMs % 1000;
            const timeStr = `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

            return (
              <div key={`${ev.seq}-${ev.tMs}`} className="flex items-center gap-2 truncate">
                <span className="text-text-dim shrink-0">{timeStr}</span>
                <span className={`shrink-0 font-bold ${getEventColor(ev.type)}`}>
                  {ev.type.padEnd(14, ' ')}
                </span>
                <span className="text-text-main truncate">{formatPayload(ev)}</span>
              </div>
            );
          })
        )}
      </div>
    </footer>
  );
};

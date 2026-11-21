import React, { useState, useMemo } from 'react';
import type { SessionRow } from '@/db/dexie';

interface SessionTableProps {
  sessions: SessionRow[];
  selectedSessionUid?: string | null;
  onSelectSession?: (session: SessionRow) => void;
}

export const SessionTable: React.FC<SessionTableProps> = ({
  sessions,
  selectedSessionUid,
  onSelectSession,
}) => {
  const [modeFilter, setModeFilter] = useState<'ALL' | 'EVAL' | 'TRAIN'>('ALL');

  // Sort descending by timestamp for recent history table
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  }, [sessions]);

  // Compute delta S relative to the chronologically prior session
  const deltasByUid = useMemo(() => {
    const chron = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
    const deltas: Record<string, number | null> = {};
    for (let i = 0; i < chron.length; i++) {
      if (i === 0) {
        deltas[chron[i].uid] = null;
      } else {
        deltas[chron[i].uid] = chron[i].score - chron[i - 1].score;
      }
    }
    return deltas;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (modeFilter === 'ALL') return sortedSessions;
    return sortedSessions.filter((s) => s.mode === modeFilter);
  }, [sortedSessions, modeFilter]);

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'EVAL':
        return 'text-phosphor border-phosphor bg-phosphorDim/30';
      case 'TRAIN':
        return 'text-friend border-friend bg-friend/20';
      case 'DEMO':
        return 'text-purple-400 border-purple-500 bg-purple-900/30';
      default:
        return 'text-text-main border-line bg-carbon-800';
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'PROFICIENT_IN_SIMULATION':
        return 'text-phosphor border-phosphor/60';
      case 'DEVELOPING':
        return 'text-amber border-amber/60';
      case 'NEEDS_RETRAINING':
        return 'text-threat border-threat/60';
      default:
        return 'text-text-dim border-line';
    }
  };

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      className="bg-carbon-950 border border-line p-3 font-mono text-xs select-none space-y-2"
      data-testid="session-table-container"
    >
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-text-main tracking-wider text-xs">
            SESSION DRILL LOG
          </span>
          <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
            {filteredSessions.length} RECORDS
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1">
          {(['ALL', 'EVAL', 'TRAIN'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setModeFilter(filter)}
              className={`px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                modeFilter === filter
                  ? 'bg-carbon-800 text-phosphor border-phosphor'
                  : 'bg-carbon-900 text-text-dim border-line hover:text-text-main'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" data-testid="session-history-table">
          <thead>
            <tr className="border-b border-line text-[10px] text-text-dim uppercase bg-carbon-900/50">
              <th className="py-1.5 px-2">Drill</th>
              <th className="py-1.5 px-2">Date/Time</th>
              <th className="py-1.5 px-2">Mode</th>
              <th className="py-1.5 px-2">Scenario</th>
              <th className="py-1.5 px-2 text-right">Score</th>
              <th className="py-1.5 px-2 text-center">&Delta;S</th>
              <th className="py-1.5 px-2 text-center">Grade</th>
              <th className="py-1.5 px-2 text-right">D</th>
              <th className="py-1.5 px-2 text-right">C</th>
              <th className="py-1.5 px-2 text-right">G</th>
              <th className="py-1.5 px-2 text-right">R</th>
              <th className="py-1.5 px-2 text-right">MET</th>
              <th className="py-1.5 px-2 text-right">d</th>
              <th className="py-1.5 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-6 text-center text-text-dim text-[11px]">
                  No sessions match filter criteria.
                </td>
              </tr>
            ) : (
              filteredSessions.map((session, idx) => {
                const isSelected = session.uid === selectedSessionUid;
                const delta = deltasByUid[session.uid];
                const metSec = session.metrics?.metMs
                  ? (session.metrics.metMs / 1000).toFixed(1) + 's'
                  : '—';

                return (
                  <tr
                    key={session.uid}
                    onClick={() => onSelectSession?.(session)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-carbon-800/90 border-l-2 border-l-phosphor'
                        : 'hover:bg-carbon-900/60'
                    }`}
                    data-testid={`session-row-${session.uid}`}
                  >
                    <td className="py-1.5 px-2 font-bold text-text-dim">
                      {`#${filteredSessions.length - idx}`}
                    </td>
                    <td className="py-1.5 px-2 text-text-dim text-[11px]">
                      {formatDate(session.startedAt)}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 text-[9px] border font-bold ${getModeBadge(session.mode)}`}>
                        {session.mode}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-text-main text-[11px]">
                      {session.scenarioId ?? '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-clock font-bold text-phosphor text-sm">
                      {session.score}
                    </td>
                    <td className="py-1.5 px-2 text-center text-[10px] font-bold">
                      {delta === null || delta === undefined ? (
                        <span className="text-text-dim">—</span>
                      ) : delta > 0 ? (
                        <span className="text-phosphor">{`+${delta}`}</span>
                      ) : delta < 0 ? (
                        <span className="text-threat">{delta}</span>
                      ) : (
                        <span className="text-text-dim">0</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 text-[9px] border ${getGradeBadge(session.grade)}`}>
                        {session.grade === 'PROFICIENT_IN_SIMULATION'
                          ? 'PROFICIENT'
                          : session.grade === 'DEVELOPING'
                            ? 'DEV'
                            : 'RETRAIN'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-text-dim">{session.metrics?.dScore ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right text-text-dim">{session.metrics?.cScore ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right text-text-dim">{session.metrics?.econScore ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right text-text-dim">{session.metrics?.rScore ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right text-text-dim">{metSec}</td>
                    <td className="py-1.5 px-2 text-right text-friend">{session.dStart.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-center">
                      {session.aborted ? (
                        <span className="text-threat text-[9px] border border-threat/50 px-1">ABORT</span>
                      ) : (
                        <span className="text-phosphor text-[9px] border border-phosphor/50 px-1">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

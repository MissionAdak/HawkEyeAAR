import React from 'react';
import type { UnitTraineeSummary, UnitCohortStats } from '@/db/sessionRepo';

interface UnitViewProps {
  summaries: UnitTraineeSummary[];
  cohortStats: UnitCohortStats;
  selectedTraineeCallsign: string;
  onSelectTrainee: (callsign: string) => void;
}

export const UnitView: React.FC<UnitViewProps> = ({
  summaries,
  cohortStats,
  selectedTraineeCallsign,
  onSelectTrainee,
}) => {
  const getGradeBadge = (grade: string | null) => {
    switch (grade) {
      case 'PROFICIENT_IN_SIMULATION':
        return 'text-phosphor border-phosphor bg-phosphorDim/20';
      case 'DEVELOPING':
        return 'text-amber border-amber bg-amber/10';
      case 'NEEDS_RETRAINING':
        return 'text-threat border-threat bg-threat/10';
      default:
        return 'text-text-dim border-line bg-carbon-800';
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none" data-testid="unit-view-container">
      {/* 1. Cohort Readiness Overview Cards */}
      <div className="grid grid-cols-4 gap-3">
        {/* Mean EVAL Score */}
        <div className="p-3 border border-line bg-carbon-950 flex flex-col justify-between">
          <div className="text-[10px] text-text-dim font-display tracking-wider">
            COHORT MEAN EVAL SCORE
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-clock font-bold text-phosphor">
              {cohortStats.cohortMeanEvalScore !== null ? cohortStats.cohortMeanEvalScore : '—'}
            </span>
            <span className="text-xs text-text-dim">/ 100</span>
          </div>
          <div className="text-[9px] text-text-dim mt-1 border-t border-line/40 pt-1">
            RULES.MD R4.4: EVAL BENCHMARKS ONLY
          </div>
        </div>

        {/* EVAL Pass Rate */}
        <div className="p-3 border border-line bg-carbon-950 flex flex-col justify-between">
          <div className="text-[10px] text-text-dim font-display tracking-wider">
            EVAL PASS RATE (&ge;70)
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-clock font-bold text-friend">
              {cohortStats.cohortEvalPassRate !== null ? `${cohortStats.cohortEvalPassRate}%` : '—'}
            </span>
            <span className="text-xs text-text-dim">PROFICIENT</span>
          </div>
          <div className="text-[9px] text-text-dim mt-1 border-t border-line/40 pt-1">
            DOCTRINAL COMBAT READINESS
          </div>
        </div>

        {/* Total EVAL Sessions */}
        <div className="p-3 border border-line bg-carbon-950 flex flex-col justify-between">
          <div className="text-[10px] text-text-dim font-display tracking-wider">
            TOTAL EVAL DRILLS
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-clock font-bold text-text-main">
              {cohortStats.totalEvalSessions}
            </span>
            <span className="text-xs text-text-dim">COMPLETED</span>
          </div>
          <div className="text-[9px] text-text-dim mt-1 border-t border-line/40 pt-1">
            VERIFIED STANDARDIZED PACKS
          </div>
        </div>

        {/* Active Operators */}
        <div className="p-3 border border-line bg-carbon-950 flex flex-col justify-between">
          <div className="text-[10px] text-text-dim font-display tracking-wider">
            UNIT OPERATOR ROSTER
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-clock font-bold text-amber">
              {cohortStats.activeTraineesCount}
            </span>
            <span className="text-xs text-text-dim">TRAINEES</span>
          </div>
          <div className="text-[9px] text-text-dim mt-1 border-t border-line/40 pt-1">
            ALPHA COY CUAS DETACHMENT
          </div>
        </div>
      </div>

      {/* 2. Unit Leaderboard Table */}
      <div className="border border-line bg-carbon-950 p-3 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-text-main tracking-wider text-xs">
              UNIT READINESS LEADERBOARD (EVAL BENCHMARKS)
            </span>
            <span className="text-[10px] text-phosphor border border-line px-1.5 py-0.5 bg-carbon-900 font-bold">
              STANDARDIZED EVAL PACKS
            </span>
          </div>
          <div className="text-[10px] text-text-dim">
            Click operator callsign to view longitudinal trend
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="unit-leaderboard-table">
            <thead>
              <tr className="border-b border-line text-[10px] text-text-dim uppercase bg-carbon-900/50">
                <th className="py-2 px-2.5 text-center">Rank</th>
                <th className="py-2 px-2.5">Callsign</th>
                <th className="py-2 px-2.5">Unit</th>
                <th className="py-2 px-2.5 text-right">Latest EVAL Score</th>
                <th className="py-2 px-2.5 text-center">Grade</th>
                <th className="py-2 px-2.5 text-right">Highest Train d</th>
                <th className="py-2 px-2.5 text-right">D</th>
                <th className="py-2 px-2.5 text-right">C</th>
                <th className="py-2 px-2.5 text-right">G</th>
                <th className="py-2 px-2.5 text-right">R</th>
                <th className="py-2 px-2.5 text-right">MET</th>
                <th className="py-2 px-2.5 text-right">Drills</th>
                <th className="py-2 px-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-text-dim text-[11px]">
                    No unit data recorded yet. Complete sessions to generate leaderboard.
                  </td>
                </tr>
              ) : (
                summaries.map((trainee, idx) => {
                  const isCurrent = trainee.callsign === selectedTraineeCallsign;
                  const hasEval = trainee.latestEvalScore !== null;
                  const metSec = trainee.latestMetrics?.metMs
                    ? `${(trainee.latestMetrics.metMs / 1000).toFixed(1)}s`
                    : '—';

                  return (
                    <tr
                      key={trainee.traineeUid}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-carbon-800/80 border-l-2 border-l-phosphor'
                          : 'hover:bg-carbon-900/50'
                      }`}
                      data-testid={`unit-trainee-row-${trainee.callsign}`}
                    >
                      {/* Rank */}
                      <td className="py-2 px-2.5 text-center font-bold text-text-dim">
                        {hasEval ? `#${idx + 1}` : '—'}
                      </td>

                      {/* Callsign */}
                      <td className="py-2 px-2.5 font-bold">
                        <span className={isCurrent ? 'text-phosphor' : 'text-text-main'}>
                          {trainee.callsign}
                        </span>
                        {isCurrent && (
                          <span className="ml-1.5 text-[9px] text-phosphor border border-phosphor/40 px-1 py-0.2">
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2.5 text-text-dim text-[11px]">
                        {trainee.unitName}
                      </td>

                      {/* Latest EVAL Score (Rules.md R4.4: TRAIN-only shows '—') */}
                      <td className="py-2 px-2.5 text-right font-clock font-bold text-sm">
                        {hasEval ? (
                          <span className="text-phosphor">{trainee.latestEvalScore}</span>
                        ) : (
                          <span className="text-text-dim text-xs font-mono font-normal">
                            — <span className="text-[9px] text-amber border border-amber/40 px-1">IN TRAINING</span>
                          </span>
                        )}
                      </td>

                      {/* Grade */}
                      <td className="py-2 px-2.5 text-center">
                        {hasEval && trainee.latestEvalGrade ? (
                          <span className={`px-1.5 py-0.5 text-[9px] border font-bold ${getGradeBadge(trainee.latestEvalGrade)}`}>
                            {trainee.latestEvalGrade === 'PROFICIENT_IN_SIMULATION'
                              ? 'PROFICIENT'
                              : trainee.latestEvalGrade === 'DEVELOPING'
                                ? 'DEV'
                                : 'RETRAIN'}
                          </span>
                        ) : (
                          <span className="text-text-dim text-[10px]">—</span>
                        )}
                      </td>

                      {/* Highest Train d */}
                      <td className="py-2 px-2.5 text-right text-friend font-bold">
                        {trainee.highestTrainDifficulty > 0
                          ? `d=${trainee.highestTrainDifficulty.toFixed(2)}`
                          : '—'}
                      </td>

                      {/* D, C, G, R */}
                      <td className="py-2 px-2.5 text-right text-text-dim">{trainee.latestMetrics?.dScore ?? '—'}</td>
                      <td className="py-2 px-2.5 text-right text-text-dim">{trainee.latestMetrics?.cScore ?? '—'}</td>
                      <td className="py-2 px-2.5 text-right text-text-dim">{trainee.latestMetrics?.econScore ?? '—'}</td>
                      <td className="py-2 px-2.5 text-right text-text-dim">{trainee.latestMetrics?.rScore ?? '—'}</td>
                      <td className="py-2 px-2.5 text-right text-text-dim">{metSec}</td>

                      {/* Drills Count */}
                      <td className="py-2 px-2.5 text-right text-text-dim">
                        <span className="font-bold text-text-main">{trainee.totalSessions}</span>
                        <span className="text-[10px] text-text-dim ml-1">
                          ({trainee.evalSessionsCount}E / {trainee.trainSessionsCount}T)
                        </span>
                      </td>

                      {/* Select Action */}
                      <td className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectTrainee(trainee.callsign)}
                          className={`px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                            isCurrent
                              ? 'bg-phosphor text-carbon-950 border-phosphor'
                              : 'bg-carbon-900 text-text-dim border-line hover:text-text-main hover:border-phosphor/50'
                          }`}
                        >
                          {isCurrent ? 'VIEWING' : 'INSPECT'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

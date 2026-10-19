import React from 'react';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import { aggregateAARMetrics } from '@/sim/metrics';
import { CLASSES, SHORT_CODES } from '@/sim/taxonomy';
import { computeOracleEffector, computeCostRegret } from '@/sim/oracle';
import type { EffectorId } from '@/sim/types';
import demo1Spec from '@/director/bundled/demo1.json';
import type { ScenarioSpec } from '@/sim/types';

interface HotWashProps {
  onClose: () => void;
}

export const HotWash: React.FC<HotWashProps> = ({ onClose }) => {
  const loadScenario = useSessionStore((s) => s.loadScenario);

  // Reconstruct metrics from raw event log
  const metrics = aggregateAARMetrics(
    engineInstance.events,
    engineInstance.spec ?? (demo1Spec as unknown as ScenarioSpec)
  );

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'PROFICIENT_IN_SIMULATION':
        return 'text-phosphor border-phosphor bg-phosphorDim/30';
      case 'DEVELOPING':
        return 'text-amber border-amber bg-amber/20';
      case 'NEEDS_RETRAINING':
        return 'text-threat border-threat bg-threat/20';
      default:
        return 'text-text-main border-line bg-carbon-800';
    }
  };

  const getGradeText = (grade: string) => {
    switch (grade) {
      case 'PROFICIENT_IN_SIMULATION':
        return 'PROFICIENT IN SIMULATION';
      case 'DEVELOPING':
        return 'DEVELOPING';
      case 'NEEDS_RETRAINING':
        return 'NEEDS RETRAINING';
      default:
        return grade;
    }
  };

  // Find all engaged tracks to show Oracle decision comparison
  const engagedTracks = engineInstance.curr.filter((e) => e.engagements > 0);

  const handleRestart = () => {
    loadScenario(demo1Spec as unknown as ScenarioSpec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-[960px] max-h-[90vh] bg-carbon-900 border border-line flex flex-col font-mono text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-[42px] px-4 border-b border-line bg-carbon-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-widest text-text-main">
              AFTER ACTION REVIEW (AAR) & SCORING DEBRIEF
            </span>
            <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
              SIH26247 DOCTRINE ENGINE
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] font-bold border border-line hover:border-threat hover:text-threat text-text-dim transition-colors"
          >
            ✕ ESC / CLOSE
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* 1. Scorecard Hero Strip */}
          <div className="p-4 border border-line bg-carbon-950 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[10px] text-text-dim font-display tracking-wider">
                  GLOBAL MISSION SCORE
                </div>
                <div className="text-4xl font-clock font-bold text-phosphor tracking-wider">
                  {metrics.score}
                  <span className="text-lg text-text-dim font-normal"> / 100</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-text-dim font-display tracking-wider mb-1">
                  DOCTRINAL GRADE EVALUATION
                </div>
                <div
                  className={`inline-block px-3 py-1 font-display font-bold text-xs tracking-widest border ${getGradeBadge(
                    metrics.grade
                  )}`}
                >
                  {getGradeText(metrics.grade)}
                </div>
              </div>
            </div>

            {/* Component Scores Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 border border-line bg-carbon-900 min-w-[70px]">
                <div className="text-[9px] text-text-dim">DETECTION [D]</div>
                <div className="text-sm font-bold text-text-main">{metrics.dScore}</div>
              </div>
              <div className="p-2 border border-line bg-carbon-900 min-w-[70px]">
                <div className="text-[9px] text-text-dim">CLASSIFY [C]</div>
                <div className="text-sm font-bold text-text-main">{metrics.cScore}</div>
              </div>
              <div className="p-2 border border-line bg-carbon-900 min-w-[70px]">
                <div className="text-[9px] text-text-dim">ENGAGE [G]</div>
                <div className="text-sm font-bold text-text-main">{metrics.econScore}</div>
              </div>
              <div className="p-2 border border-line bg-carbon-900 min-w-[70px]">
                <div className="text-[9px] text-text-dim">ROE [R]</div>
                <div className="text-sm font-bold text-text-main">{metrics.rScore}</div>
              </div>
            </div>
          </div>

          {/* 2. Key Operational Performance Metrics */}
          <div>
            <div className="text-[11px] font-display font-semibold text-text-main mb-2 tracking-wider flex items-center gap-2">
              <span>OPERATIONAL METRICS & LATENCIES</span>
              <span className="text-[9px] text-text-dim font-normal font-mono">
                (Quantised to 50ms ticks)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">MEAN ENGAGEMENT (MET)</div>
                <div className="text-base font-bold text-phosphor mt-0.5">
                  {metrics.metMs !== null ? `${(metrics.metMs / 1000).toFixed(2)}s` : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">Mean (tEng - tTrk)</div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">MEAN DETECTION (MDT)</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {metrics.mdtMs !== null ? `${(metrics.mdtMs / 1000).toFixed(2)}s` : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">Mean (tDesig - tTrk)</div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">SENSOR-TO-SHOOTER (S2S)</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {metrics.s2sMs !== null ? `${(metrics.s2sMs / 1000).toFixed(2)}s` : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">Mean (tEng - tDesig)</div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">CLASSIFICATION ACCURACY</div>
                <div className="text-base font-bold text-phosphor mt-0.5">
                  {(metrics.clsAccuracy * 100).toFixed(0)}%
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  Coverage: {(metrics.clsCoverage * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">AGGREGATE CER</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    metrics.unfavourableExchanges > 0 ? 'text-threat' : 'text-phosphor'
                  }`}
                >
                  {metrics.aggregateCer !== null ? `CER ${metrics.aggregateCer.toFixed(3)}` : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  Unfavourable: {metrics.unfavourableExchanges}
                </div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">ROE VIOLATIONS</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    metrics.roeViolations > 0 ? 'text-threat' : 'text-phosphor'
                  }`}
                >
                  {metrics.roeViolations}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  Collateral: {metrics.collateralIncidents}
                </div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">LEAK RATE</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    metrics.leakers > 0 ? 'text-threat' : 'text-phosphor'
                  }`}
                >
                  {metrics.leakers} ({((metrics.leakRate || 0) * 100).toFixed(0)}%)
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">Penalty: -20 pts each</div>
              </div>

              <div className="p-2.5 border border-line bg-carbon-950">
                <div className="text-[10px] text-text-dim">SENSOR ADAPTATION (SAL)</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {metrics.salMs !== null ? `${(metrics.salMs / 1000).toFixed(2)}s` : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  Score: {metrics.salScore !== null ? `${metrics.salScore}/100` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Confusion Matrix 7x7 */}
          <div>
            <div className="text-[11px] font-display font-semibold text-text-main mb-2 tracking-wider">
              7x7 CLASSIFICATION CONFUSION MATRIX (COST-WEIGHTED)
            </div>

            <div className="border border-line bg-carbon-950 p-2 overflow-x-auto">
              <table className="w-full text-center text-[10px] border-collapse font-mono">
                <thead>
                  <tr className="border-b border-line text-text-dim">
                    <th className="p-1 text-left">TRUE \ PREDICTED</th>
                    {CLASSES.map((c) => (
                      <th key={c} className="p-1 w-[48px]" title={c}>
                        {SHORT_CODES[c]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.slice(1).map((trueCls, rowIdx) => {
                    const rowData = metrics.confusion[rowIdx + 1] || [];
                    return (
                      <tr key={trueCls} className="border-b border-line/40 hover:bg-carbon-800/40">
                        <td className="p-1 text-left font-bold text-text-main truncate max-w-[140px]">
                          [{SHORT_CODES[trueCls]}] {trueCls}
                        </td>
                        {CLASSES.map((predCls, colIdx) => {
                          const val = rowData[colIdx] || 0;
                          const isMatch = trueCls === predCls;
                          const cellBg =
                            val > 0
                              ? isMatch
                                ? 'bg-phosphor/20 text-phosphor font-bold'
                                : 'bg-threat/20 text-threat font-bold'
                              : 'text-text-dim';

                          return (
                            <td key={predCls} className={`p-1 border-l border-line/40 ${cellBg}`}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Trainee vs Oracle Decision & Cost Regret */}
          <div>
            <div className="text-[11px] font-display font-semibold text-text-main mb-2 tracking-wider">
              ORACLE ("SCHOOL SOLUTION") & COST REGRET COMPARISON
            </div>

            <div className="border border-line bg-carbon-950 p-2">
              {engagedTracks.length === 0 ? (
                <div className="p-4 text-center text-text-dim italic">
                  NO ENGAGEMENTS RECORDED THIS SESSION.
                </div>
              ) : (
                <div className="space-y-2">
                  {engagedTracks.map((trk) => {
                    const oracle = computeOracleEffector({
                      rangeM: Math.hypot(trk.pos.x, trk.pos.y),
                      trueClass: trk.trueClass,
                      emitsRf: trk.emitsRf,
                      droneType: trk.droneType,
                    });

                    const regret = trk.weaponUsed
                      ? computeCostRegret(trk.weaponUsed as EffectorId, oracle.oracleEffector)
                      : null;

                    return (
                      <div
                        key={trk.id}
                        className="p-2 border border-line bg-carbon-900 flex items-center justify-between text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-text-main">
                            TARGET: <span className="text-friend">{trk.trackNo}</span> ({trk.trueClass})
                          </div>
                          <div className="text-[10px] text-text-dim">
                            TRAINEE RELEASE: <span className="text-text-main font-bold">{trk.weaponUsed}</span> |
                            STATUS: <span className={trk.lifecycle === 'NEUTRALISED' ? 'text-phosphor' : 'text-threat'}>{trk.lifecycle}</span>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <div className="text-[10px] text-text-dim">
                            ORACLE RECOMMENDATION: <span className="text-phosphor font-bold">{oracle.oracleEffector}</span>
                          </div>
                          <div
                            className={`text-[11px] font-bold ${
                              regret?.isOptimal ? 'text-phosphor' : 'text-amber'
                            }`}
                          >
                            {regret?.text ?? 'EVALUATED'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-[46px] px-4 border-t border-line bg-carbon-800/80 flex items-center justify-between">
          <div className="text-[10px] text-text-dim">
            SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRestart}
              className="px-3 py-1 font-display font-semibold text-[11px] border border-line hover:border-amber text-amber transition-colors"
            >
              [R] RESTART SCENARIO
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 font-display font-semibold text-[11px] border border-phosphor bg-phosphor text-carbon-950 font-bold hover:bg-phosphor/80 transition-colors"
            >
              RETURN TO C2 CONSOLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

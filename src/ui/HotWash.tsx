import React, { useState, useEffect } from 'react';
import { useSessionStore, engineInstance, getActiveRecorder } from '@/store/sessionStore';
import { exportSessionJson, exportSessionCsv } from '@/db/io';
import { aggregateAARMetrics } from '@/sim/metrics';
import { TRUE_CLASSES, PRED_COLUMNS, SHORT_CODES, CLASS_LABELS } from '@/sim/taxonomy';
import { computeOracleEffector, computeCostRegret } from '@/sim/oracle';
import type { EffectorId, ScenarioSpec, ZoneSpec } from '@/sim/types';
import demo1Spec from '@/director/bundled/demo1.json';
import { AarEngagementInspector } from './aar/AarEngagementInspector';
import {
  extractEngagementInspectionData,
  type AarEngagementInspectionData,
} from './aar/engagementInspectorData';
import { AarReplaySection } from './aar/AarReplaySection';
import { TrendChart } from './aar/charts/TrendChart';
import { SessionTable } from './aar/panels/SessionTable';
import { UnitView } from './aar/panels/UnitView';
import {
  getTraineeSessions,
  getUnitTraineeSummaries,
  getCohortStats,
  seedDemoSessionsIfEmpty,
  type UnitTraineeSummary,
  type UnitCohortStats,
} from '@/db/sessionRepo';
import type { SessionRow } from '@/db/dexie';

interface HotWashProps {
  onClose: () => void;
}

export const HotWash: React.FC<HotWashProps> = ({ onClose }) => {
  const restartSession = useSessionStore((s) => s.restartSession);
  const rerunExactSeedSession = useSessionStore((s) => s.rerunExactSeedSession);
  const openScenarioModal = useSessionStore((s) => s.openScenarioModal);
  const returnToBriefing = useSessionStore((s) => s.returnToBriefing);
  const currentScenarioId = useSessionStore((s) => s.currentScenarioId);
  const currentCallsign = useSessionStore((s) => s.currentCallsign);
  const setCallsign = useSessionStore((s) => s.setCallsign);
  const latestSavedSessionUid = useSessionStore((s) => s.latestSavedSessionUid);
  const sessionPersistenceStatus = useSessionStore((s) => s.sessionPersistenceStatus);

  const [traineeSessions, setTraineeSessions] = useState<SessionRow[]>([]);
  const [unitSummaries, setUnitSummaries] = useState<UnitTraineeSummary[]>([]);
  const [cohortStats, setCohortStats] = useState<UnitCohortStats>({
    cohortMeanEvalScore: null,
    cohortEvalPassRate: null,
    totalEvalSessions: 0,
    activeTraineesCount: 0,
  });
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [cohortScope, setCohortScope] = useState<'REAL' | 'DEMO'>('REAL');

  // Load historical sessions & unit summaries
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        await seedDemoSessionsIfEmpty();
        const sessions = await getTraineeSessions(currentCallsign, 'asc', cohortScope);
        const summaries = await getUnitTraineeSummaries(cohortScope);
        const stats = await getCohortStats(cohortScope);
        if (isMounted) {
          setTraineeSessions(sessions);
          setUnitSummaries(summaries);
          setCohortStats(stats);
        }
      } catch (err) {
        console.error('[HotWash] Failed to load historical sessions:', err);
      }
    };
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [currentCallsign, latestSavedSessionUid, sessionPersistenceStatus, cohortScope]);

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

  const [inspectingEngagement, setInspectingEngagement] = useState<AarEngagementInspectionData | null>(null);
  const [activeTab, setActiveTab] = useState<'SCORECARD' | 'REPLAY' | 'TRENDS' | 'UNIT'>('SCORECARD');

  // Find all engaged tracks to show Oracle decision comparison
  const engagedTracks = engineInstance.curr.filter((e) => e.engagements > 0);

  const handleRestart = () => {
    void restartSession();
    onClose();
  };

  const handleSelectScenario = () => {
    onClose();
    openScenarioModal();
  };

  return (
    <div data-testid="aar-modal" className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none">
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
            <span className="text-[10px] text-phosphor border border-line px-1.5 py-0.5 font-bold bg-carbon-950">
              SCENARIO: {engineInstance.spec?.id ?? currentScenarioId}
            </span>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
                OPERATOR:
              </span>
              <select
                value={currentCallsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="bg-carbon-950 border border-line text-phosphor font-bold text-[10px] px-1 py-0.5 cursor-pointer outline-none hover:border-phosphor/60"
                data-testid="operator-callsign-select"
              >
                {unitSummaries.map((u) => (
                  <option key={u.callsign} value={u.callsign}>
                    {u.callsign} ({u.unitName})
                  </option>
                ))}
                {!unitSummaries.some((u) => u.callsign === currentCallsign) && (
                  <option value={currentCallsign}>{currentCallsign}</option>
                )}
              </select>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] font-bold border border-line hover:border-threat hover:text-threat text-text-dim transition-colors"
          >
            ✕ ESC / CLOSE
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 py-1.5 border-b border-line bg-carbon-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="tab-scorecard"
              onClick={() => setActiveTab('SCORECARD')}
              className={`px-3 py-1 font-display font-bold text-xs tracking-wider border transition-colors ${
                activeTab === 'SCORECARD'
                  ? 'bg-phosphor text-carbon-950 border-phosphor'
                  : 'bg-carbon-900 text-text-dim border-line hover:text-text-main'
              }`}
            >
              SCORECARD
            </button>
            <button
              type="button"
              data-testid="tab-replay"
              onClick={() => setActiveTab('REPLAY')}
              className={`px-3 py-1 font-display font-bold text-xs tracking-wider border transition-colors ${
                activeTab === 'REPLAY'
                  ? 'bg-phosphor text-carbon-950 border-phosphor'
                  : 'bg-carbon-900 text-text-dim border-line hover:text-text-main'
              }`}
            >
              REPLAY
            </button>
            <button
              type="button"
              data-testid="tab-trends"
              onClick={() => setActiveTab('TRENDS')}
              className={`px-3 py-1 font-display font-bold text-xs tracking-wider border transition-colors ${
                activeTab === 'TRENDS'
                  ? 'bg-phosphor text-carbon-950 border-phosphor'
                  : 'bg-carbon-900 text-text-dim border-line hover:text-text-main'
              }`}
            >
              TRENDS & HISTORY
            </button>
            <button
              type="button"
              data-testid="tab-unit"
              onClick={() => setActiveTab('UNIT')}
              className={`px-3 py-1 font-display font-bold text-xs tracking-wider border transition-colors ${
                activeTab === 'UNIT'
                  ? 'bg-phosphor text-carbon-950 border-phosphor'
                  : 'bg-carbon-900 text-text-dim border-line hover:text-text-main'
              }`}
            >
              UNIT READINESS
            </button>
          </div>

          <div className="text-[10px] text-text-dim">
            {activeTab === 'SCORECARD' && 'SINGLE-DRILL MISSION DEBRIEF'}
            {activeTab === 'REPLAY' && '2D/3D SYNCHRONIZED TIMELINE'}
            {activeTab === 'TRENDS' && `OPERATOR ${currentCallsign} MULTI-SESSION PROGRESSION`}
            {activeTab === 'UNIT' && 'ALPHA COY STANDARDIZED EVALUATION LEADERBOARD'}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {activeTab === 'SCORECARD' && (
            <>
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
                <div className="text-sm font-bold text-text-main">{metrics.gScore}</div>
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

            {/* Training Aid Transparency Metadata (Task F5) */}
            <div className="mt-2 p-2 border border-line bg-carbon-900/60 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-text-dim">F5 TRAINING AID:</span>
                {metrics.trainingAidUsed ? (
                  <span className="text-amber font-bold">
                    ACTIVE FOR {metrics.trainingAidDurationSec ?? 0}s (SIMULATION TICKS)
                  </span>
                ) : (
                  <span className="text-phosphor font-bold">OFF / ZERO USAGE</span>
                )}
              </div>
              <span className="text-[9px] text-text-dim">
                TRANSPARENCY METADATA ONLY (NO SCORE PENALTY)
              </span>
            </div>
          </div>

          {/* 3. Confusion Matrix 6x8 */}
          <div>
            <div className="text-[11px] font-display font-semibold text-text-main mb-2 tracking-wider">
              6x8 CLASSIFICATION CONFUSION MATRIX (COUNTS)
            </div>

            <div className="border border-line bg-carbon-950 p-2 overflow-x-auto">
              <table className="w-full text-center text-[10px] border-collapse font-mono">
                <thead>
                  <tr className="border-b border-line text-text-dim">
                    <th className="p-1 text-left">GROUND TRUTH \ COMMITTED</th>
                    {PRED_COLUMNS.map((c) => (
                      <th key={c} className="p-1 w-[44px]" title={CLASS_LABELS[c]}>
                        {SHORT_CODES[c]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRUE_CLASSES.map((trueCls, rowIdx) => {
                    const rowData = metrics.confusion[rowIdx] || [];
                    return (
                      <tr key={trueCls} className="border-b border-line/40 hover:bg-carbon-800/40">
                        <td className="p-1 text-left font-bold text-text-main truncate max-w-[140px]">
                          [{SHORT_CODES[trueCls]}] {trueCls}
                        </td>
                        {PRED_COLUMNS.map((predCls, colIdx) => {
                          const val = rowData[colIdx] || 0;
                          const isMatch = trueCls === predCls;
                          let cellBg = 'text-text-dim';
                          if (val > 0) {
                            cellBg = isMatch
                              ? 'bg-phosphor/20 text-phosphor font-bold'
                              : 'bg-threat/20 text-threat font-bold';
                          }

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

                        <div className="flex items-center gap-3">
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

                          {(() => {
                            const engageEv = engineInstance.events.find(
                              (e) => e.type === 'ENGAGE' && (e.trackNo === trk.trackNo || e.entityId === trk.id)
                            );
                            if (!engageEv) return null;
                            return (
                              <button
                                onClick={() => {
                                  const inspectionData = extractEngagementInspectionData(
                                    engageEv,
                                    engineInstance.events,
                                    engineInstance.spec ?? (demo1Spec as unknown as ScenarioSpec),
                                    engineInstance.curr
                                  );
                                  if (inspectionData) {
                                    setInspectingEngagement(inspectionData);
                                  }
                                }}
                                title="Inspect Recorded Probability & Scoring Inputs"
                                className="px-2 py-1 text-[10px] font-bold border border-friend text-friend hover:bg-friend/20 transition-colors whitespace-nowrap"
                              >
                                🔍 INSPECT
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Synchronized 2D/3D AAR Mission Timeline Replay (Task F7) */}
      {activeTab === 'REPLAY' && (
        <AarReplaySection
          events={engineInstance.events}
          spec={engineInstance.spec ?? (demo1Spec as unknown as ScenarioSpec)}
          zones={engineInstance.spec?.zones ?? (demo1Spec.zones as unknown as ZoneSpec[])}
        />
      )}

      {/* Tab 3: Longitudinal Trend Chart and Session Drill Table (Task 20 / P3-09) */}
      {activeTab === 'TRENDS' && (
        <div className="space-y-4" data-testid="aar-trends-panel">
          <TrendChart
            sessions={traineeSessions}
            selectedSessionUid={selectedSession?.uid}
            onSelectSession={(s) => setSelectedSession(s)}
          />
          <SessionTable
            sessions={traineeSessions}
            selectedSessionUid={selectedSession?.uid}
            onSelectSession={(s) => setSelectedSession(s)}
          />
        </div>
      )}

      {/* Tab 4: Unit Readiness View & Cohort Leaderboard (Task 20 / P3-10 / Rules.md R4.4) */}
      {activeTab === 'UNIT' && (
        <div data-testid="aar-unit-panel">
          <UnitView
            summaries={unitSummaries}
            cohortStats={cohortStats}
            selectedTraineeCallsign={currentCallsign}
            datasetScope={cohortScope}
            onSelectScope={(scope) => setCohortScope(scope)}
            onSelectTrainee={(callsign) => {
              setCallsign(callsign);
              setActiveTab('TRENDS');
            }}
          />
        </div>
      )}
    </div>

        {/* Modal Footer */}
        <div className="h-[46px] px-4 border-t border-line bg-carbon-800/80 flex items-center justify-between">
          <div className="text-[10px] text-text-dim">
            SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                const sessionUid = getActiveRecorder()?.getSessionUid() ?? metrics.sessionUid;
                void exportSessionJson(sessionUid);
              }}
              data-testid="aar-export-json-btn"
              className="px-2.5 py-1 font-display font-semibold text-[11px] border border-line hover:border-phosphor text-text-dim hover:text-phosphor transition-colors"
              title="Export AAR Session JSON with SHA-256 Checksum"
            >
              [X] EXPORT JSON
            </button>
            <button
              onClick={() => {
                const sessionUid = getActiveRecorder()?.getSessionUid() ?? metrics.sessionUid;
                void exportSessionCsv(sessionUid);
              }}
              data-testid="aar-export-csv-btn"
              className="px-2.5 py-1 font-display font-semibold text-[11px] border border-line hover:border-phosphor text-text-dim hover:text-phosphor transition-colors"
              title="Export AAR Session CSV"
            >
              [C] EXPORT CSV
            </button>
            <button
              onClick={() => {
                onClose();
                returnToBriefing();
              }}
              data-testid="aar-return-briefing-btn"
              className="px-3 py-1 font-display font-semibold text-[11px] border border-phosphor/70 hover:border-phosphor text-phosphor hover:bg-phosphorDim/30 transition-colors"
            >
              [B] MISSION BRIEFING
            </button>
            <button
              onClick={handleSelectScenario}
              className="px-3 py-1 font-display font-semibold text-[11px] border border-line hover:border-text-main text-text-dim hover:text-text-main transition-colors"
            >
              [S] SELECT SCENARIO
            </button>
            <button
              onClick={() => {
                onClose();
                void rerunExactSeedSession();
              }}
              className="px-3 py-1 font-display font-semibold text-[11px] border border-line hover:border-friend text-friend transition-colors"
              title="Replay this exact scenario run using the same seed"
            >
              [E] REPLAY EXACT SEED
            </button>
            <button
              onClick={handleRestart}
              className="px-3 py-1 font-display font-semibold text-[11px] border border-line hover:border-amber text-amber transition-colors"
            >
              [R] RUN AGAIN (NEW SEED)
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 font-display font-bold text-[11px] border border-phosphor bg-phosphor text-carbon-950 hover:bg-phosphor/80 transition-colors"
            >
              RETURN TO C2 CONSOLE
            </button>
          </div>
        </div>
      </div>

      {/* F8 AAR Engagement Inspector Modal */}
      {inspectingEngagement && (
        <AarEngagementInspector
          data={inspectingEngagement}
          onClose={() => setInspectingEngagement(null)}
        />
      )}
    </div>
  );
};

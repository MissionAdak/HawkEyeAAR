import React from 'react';
import type { WeaknessVector } from '@/sim/types';
import {
  getAdaptivePlan,
  type WeaknessDimension,
} from '@/director/adaptive';

export interface RedTeamPlanProps {
  traineeId: string;
  callsign: string;
  currentDifficulty: number;
  sessionStartDifficulty?: number;
  mode: 'TRAIN' | 'EVAL' | 'DEMO';
  profile: WeaknessVector | null;
  lastScore?: number;
  onSelectRecommendedScenario?: (scenarioId: string, targetDifficulty: number) => void;
}

export const RedTeamPlan: React.FC<RedTeamPlanProps> = ({
  traineeId,
  callsign,
  currentDifficulty,
  sessionStartDifficulty,
  mode,
  profile,
  lastScore,
  onSelectRecommendedScenario,
}) => {
  const plan = getAdaptivePlan(traineeId, profile, currentDifficulty, lastScore, {
    sessionStartDifficulty,
  });
  const isEval = mode === 'EVAL';

  const formatDimensionName = (dim: WeaknessDimension): string => {
    switch (dim) {
      case 'd':
        return 'Detection [D]';
      case 'c':
        return 'Classification [C]';
      case 'econ':
        return 'Economics [E_econ]';
      case 'r':
        return 'ROE & Collateral [R]';
      case 'sal':
        return 'Sensor Latency [SAL]';
      case 'sat':
        return 'Swarm Saturation [SAT]';
    }
  };

  const getDimensionStatus = (val: number, isWeakest: boolean) => {
    if (isWeakest) {
      return { text: 'WEAKEST', badgeClass: 'text-threat border-threat bg-threat/20 font-bold' };
    }
    if (val >= 70) {
      return { text: 'PROFICIENT', badgeClass: 'text-phosphor border-phosphor/60 bg-phosphorDim/20' };
    }
    return { text: 'DEVELOPING', badgeClass: 'text-amber border-amber/60 bg-amber/10' };
  };

  const dimensions: WeaknessDimension[] = ['d', 'c', 'econ', 'r', 'sal', 'sat'];

  return (
    <div
      className="p-3 border border-line bg-carbon-950 font-mono text-xs space-y-3"
      data-testid="red-team-plan-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm tracking-widest text-text-main">
            ADAPTIVE RED TEAM DIRECTOR — TRAINING PROGRESSION
          </span>
          <span
            data-testid="red-team-mode-badge"
            className={`text-[10px] px-1.5 py-0.5 border font-bold ${
              isEval
                ? 'text-cyan border-cyan/60 bg-carbon-900'
                : 'text-phosphor border-phosphor/60 bg-carbon-900'
            }`}
          >
            {isEval ? 'EVAL BENCHMARK MODE' : 'ADAPTIVE TRAIN MODE'}
          </span>
        </div>

        <div className="text-[10px] text-text-dim">
          OPERATOR: <span className="text-text-main font-bold">{callsign}</span>
        </div>
      </div>

      {/* Mode Isolation Explanation Strip */}
      <div
        className={`p-2 border text-[10px] flex items-center justify-between ${
          isEval
            ? 'border-cyan/40 bg-cyan/5 text-cyan'
            : 'border-phosphor/40 bg-phosphorDim/10 text-phosphor'
        }`}
        data-testid="mode-policy-indicator"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold">POLICY:</span>
          <span>
            {isEval
              ? 'Fixed benchmark evaluation drill. Difficulty and EMA adaptation are locked. Scores feed the Alpha Coy unit readiness leaderboard.'
              : 'Profile-driven adaptive training. Next difficulty and threat geometry are adapted to trainee weaknesses to maintain learning challenge near score 70.'}
          </span>
        </div>
        <span className="text-[9px] text-text-dim font-mono uppercase whitespace-nowrap ml-2">
          {isEval ? 'Rules.md R4.4 (EVAL Locked)' : 'Rules.md R4.2 (Adaptive d)'}
        </span>
      </div>

      {/* Difficulty & Score Adjustment Card */}
      <div className="grid grid-cols-4 gap-2 text-center" data-testid="difficulty-adaptation-strip">
        <div className="p-2 border border-line bg-carbon-900">
          <div className="text-[9px] text-text-dim">
            {typeof sessionStartDifficulty === 'number' ? 'STARTING DIFFICULTY' : 'CURRENT DIFFICULTY'}
          </div>
          <div className="text-base font-bold text-text-main mt-0.5" data-testid="current-diff-display">
            d = {plan.currentDifficulty.toFixed(2)}
          </div>
          <div className="text-[9px] text-text-dim mt-0.5">d ∈ [0.0, 1.0]</div>
        </div>

        <div className="p-2 border border-line bg-carbon-900">
          <div className="text-[9px] text-text-dim">SESSION SCORE</div>
          <div className="text-base font-bold text-phosphor mt-0.5" data-testid="session-score-display">
            {typeof lastScore === 'number' ? `${lastScore} / 100` : '—'}
          </div>
          <div className="text-[9px] text-text-dim mt-0.5">Target: 70 (Learning Zone)</div>
        </div>

        <div className="p-2 border border-line bg-carbon-900">
          <div className="text-[9px] text-text-dim">NEXT DIFFICULTY</div>
          <div
            className={`text-base font-bold mt-0.5 ${
              isEval
                ? 'text-text-dim'
                : plan.nextDifficulty > plan.currentDifficulty
                  ? 'text-phosphor'
                  : plan.nextDifficulty < plan.currentDifficulty
                    ? 'text-amber'
                    : 'text-text-main'
            }`}
            data-testid="next-diff-display"
          >
            {isEval ? `d = ${plan.currentDifficulty.toFixed(2)} (LOCKED)` : `d = ${plan.nextDifficulty.toFixed(2)}`}
          </div>
          <div className="text-[9px] text-text-dim mt-0.5">
            {isEval ? 'No Adaptation in EVAL' : `Δd = ${(plan.nextDifficulty - plan.currentDifficulty).toFixed(3)}`}
          </div>
        </div>

        <div className="p-2 border border-line bg-carbon-900">
          <div className="text-[9px] text-text-dim">ADAPTIVE LEVER</div>
          <div
            className="text-xs font-bold text-phosphor mt-1 truncate"
            title={plan.leverName}
            data-testid="target-lever-display"
          >
            {plan.targetLever}
          </div>
          <div className="text-[9px] text-text-dim mt-0.5">Exploits {plan.weakestDimension.toUpperCase()}</div>
        </div>
      </div>

      {/* Trainee Weakness Profile Grid */}
      <div>
        <div className="text-[10px] font-display font-semibold text-text-main mb-1.5 flex items-center justify-between">
          <span>OPERATOR PERFORMANCE PROFILE (EXPONENTIAL MOVING AVERAGE, α = 0.4)</span>
          <span className="text-[9px] text-text-dim font-normal">
            Missing observations skipped without zeroing (PRD §4.9)
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2" data-testid="ema-metrics-grid">
          {dimensions.map((dim) => {
            const val = plan.profile[dim];
            const isWeakest = dim === plan.weakestDimension;
            const status = getDimensionStatus(val, isWeakest);
            const weightPct = ((plan.weights[dim] || 0.1667) * 100).toFixed(1);

            return (
              <div
                key={dim}
                className={`p-2 border ${
                  isWeakest ? 'border-threat bg-threat/10' : 'border-line bg-carbon-900'
                }`}
                data-testid={`ema-card-${dim}`}
              >
                <div className="text-[9px] text-text-dim truncate">{formatDimensionName(dim)}</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    isWeakest ? 'text-threat' : val >= 70 ? 'text-phosphor' : 'text-amber'
                  }`}
                  data-testid={`ema-val-${dim}`}
                >
                  {val.toFixed(1)}
                </div>
                <div className="flex items-center justify-between mt-1 text-[8px]">
                  <span className={`px-1 py-0.2 border ${status.badgeClass}`}>{status.text}</span>
                  <span className="text-text-dim" title="Softmax Red Team Sampling Weight">
                    p={weightPct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Director Next Session Rationale Card */}
      <div className="p-2.5 border border-line bg-carbon-900 space-y-1.5" data-testid="director-rationale-box">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-text-main flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-phosphor inline-block"></span>
            NEXT RECOMMENDED TRAINING DRILL: {plan.leverName.toUpperCase()}
          </span>
          <span className="text-text-dim">
            TARGET SCENARIO: <span className="text-phosphor font-bold">{plan.recommendedScenarioId}</span>
          </span>
        </div>

        <p className="text-[11px] text-text-dim font-mono leading-relaxed" data-testid="director-rationale-text">
          <span className="text-text-main font-semibold">Director Rationale: </span>
          {plan.rationale} Operator currently shows lowest historical EMA in{' '}
          <span className="text-threat font-bold">{formatDimensionName(plan.weakestDimension)}</span> (
          {plan.weakestEma.toFixed(1)}/100). The Red Team has scheduled procedural threat geometry scaled to
          difficulty <span className="text-phosphor font-bold">d = {plan.nextDifficulty.toFixed(2)}</span> to drill
          this dimension while preserving kinematic fairness.
        </p>

        {onSelectRecommendedScenario && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              data-testid="load-recommended-drill-btn"
              onClick={() => onSelectRecommendedScenario(plan.recommendedScenarioId, plan.nextDifficulty)}
              className="px-3 py-1 font-display font-bold text-xs bg-phosphor text-carbon-950 hover:bg-phosphorDim transition-colors"
            >
              LOAD ADAPTED DRILL [d = {plan.nextDifficulty.toFixed(2)}]
            </button>
          </div>
        )}
      </div>

      {/* Doctrinal Disclaimer */}
      <div className="text-[9px] text-text-dim border-t border-line/40 pt-1 flex items-center justify-between">
        <span>EXPLAINABLE RULE-BASED RED TEAM PROFILING | NOT AN OPERATIONAL CERTIFICATION</span>
        <span>SIH26247 PROGRESSION ENGINE</span>
      </div>
    </div>
  );
};

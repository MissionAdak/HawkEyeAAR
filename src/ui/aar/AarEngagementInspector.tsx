import React from 'react';
import type { AarEngagementInspectionData } from './engagementInspectorData';

interface AarEngagementInspectorProps {
  data: AarEngagementInspectionData;
  onClose: () => void;
}

export const AarEngagementInspector: React.FC<AarEngagementInspectorProps> = ({ data, onClose }) => {
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const msRemainder = ms % 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(msRemainder).padStart(3, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-[840px] max-h-[92vh] bg-carbon-900 border border-line flex flex-col font-mono text-xs overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="h-[44px] px-4 border-b border-line bg-carbon-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-sm tracking-widest text-text-main">
              AAR ENGAGEMENT PROBABILITY INSPECTOR
            </span>
            <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
              SEQ #{data.seq} | {formatTime(data.tMs)}
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
          {/* Subtitle / Non-Kill-Cam Teaching Disclaimer */}
          <div className="text-[10px] text-text-dim border-l-2 border-friend pl-2 py-0.5 bg-carbon-950">
            TEACHING HEURISTIC & RECORDED PROBABILITY BREAKDOWN — NOT A PHYSICAL KILL-CAM
          </div>

          {/* 1. Hero Decision vs Luck Teaching Banner */}
          <div className={`p-3.5 border ${data.decisionLuck.badgeClass} flex flex-col gap-1.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-wider">
                  {data.decisionLuck.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 border border-current font-bold">
                  {data.killed ? 'HIT' : 'MISS'}
                </span>
              </div>
              <div className="font-mono text-xs font-bold">
                {data.decisionLuck.comparisonText}
              </div>
            </div>
            <div className="text-[11px] text-text-main">
              {data.decisionLuck.description}
            </div>
          </div>

          {/* 2. Recorded Probability Breakdown */}
          <div className="border border-line bg-carbon-950 p-3 space-y-2.5">
            <div className="text-[10px] font-display text-text-dim tracking-wider">
              RECORDED PROBABILITY INPUTS & SEEDED DRAW
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2 border border-line bg-carbon-900">
                <div className="text-[9px] text-text-dim">EFFECTIVE Pk</div>
                <div className="text-base font-bold text-phosphor mt-0.5">
                  {(data.pk * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">pk = {data.pk.toFixed(4)}</div>
              </div>

              <div className="p-2 border border-line bg-carbon-900">
                <div className="text-[9px] text-text-dim">SEEDED DRAW (u)</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {data.u.toFixed(4)}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">kill PRNG stream</div>
              </div>

              <div className="p-2 border border-line bg-carbon-900">
                <div className="text-[9px] text-text-dim">BASE Pk0</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {data.pk0 !== undefined ? `${(data.pk0 * 100).toFixed(0)}%` : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  {data.pk0 !== undefined ? `pk0 = ${data.pk0.toFixed(2)}` : 'legacy record'}
                </div>
              </div>

              <div className="p-2 border border-line bg-carbon-900">
                <div className="text-[9px] text-text-dim">RANGE ATTEN g(R)</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {data.g !== undefined ? data.g.toFixed(2) : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  {data.rangeM > 0 ? `${Math.round(data.rangeM)}m range` : 'open'}
                </div>
              </div>

              <div className="p-2 border border-line bg-carbon-900">
                <div className="text-[9px] text-text-dim">CHAOS MULT h(env)</div>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {data.h !== undefined ? data.h.toFixed(2) : 'N/A'}
                </div>
                <div className="text-[9px] text-text-dim mt-0.5">
                  {data.h === 0.5 ? 'FOG ACTIVE' : data.h === 0.0 ? 'JAMMING' : 'CLEAR'}
                </div>
              </div>
            </div>

            {data.pk0 !== undefined && data.g !== undefined && data.h !== undefined && (
              <div className="text-[10px] text-text-dim font-mono bg-carbon-900 p-2 border border-line/60 flex items-center justify-between">
                <span>MATHEMATICAL CHECK: Pk = Pk0 · g(R) · h(chaos)</span>
                <span className="text-text-main font-bold">
                  {data.pk0.toFixed(2)} × {data.g.toFixed(2)} × {data.h.toFixed(2)} = {(data.pk0 * data.g * data.h).toFixed(4)} (diff: {Math.abs(data.pk - data.pk0 * data.g * data.h).toExponential(2)})
                </span>
              </div>
            )}
          </div>

          {/* 3. Operational & ROE Audit */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left: Engagement Identity & Economics */}
            <div className="border border-line bg-carbon-950 p-3 space-y-2">
              <div className="text-[10px] font-display text-text-dim tracking-wider">
                ENGAGEMENT WEAPON & ECONOMICS
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-dim">WEAPON RELEASED:</span>
                  <span className="text-friend font-bold">{data.effectorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">ENGAGEMENT RANGE:</span>
                  <span className="text-text-main">{Math.round(data.rangeM)}m ({(data.rangeM / 1000).toFixed(2)} km)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">EFFECTOR COST:</span>
                  <span className="text-text-main">₹{data.costInr.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">TARGET COMMERCIAL VALUE:</span>
                  <span className="text-text-main">
                    {data.targetValueInr ? `₹${data.targetValueInr.toLocaleString('en-IN')}` : 'NOT DECLARED'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-line/50 pt-1">
                  <span className="text-text-dim">COST-EXCHANGE RATIO (CER):</span>
                  <span className={`font-bold ${data.isUnfavourableCer ? 'text-threat' : 'text-phosphor'}`}>
                    {data.cer !== undefined ? `CER ${data.cer.toFixed(2)}` : 'N/A'}
                    {data.isUnfavourableCer && ' [UNFAVOURABLE]'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: ROE & Overflight Audit */}
            <div className="border border-line bg-carbon-950 p-3 space-y-2">
              <div className="text-[10px] font-display text-text-dim tracking-wider">
                RULES OF ENGAGEMENT (ROE) AUDIT
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-dim">TARGET IDENTIFIER:</span>
                  <span className="text-friend font-bold">{data.trackNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">TRUE CLASSIFICATION:</span>
                  <span className={`font-bold ${data.trueClass === 'CIVIL_UAS' ? 'text-threat' : data.trueClass === 'FRIENDLY' ? 'text-friend' : 'text-text-main'}`}>
                    {data.trueClass ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">CLASSIFICATION STATUS:</span>
                  <span className={data.roeGate?.classifiedOk ? 'text-phosphor' : 'text-threat font-bold'}>
                    {data.roeGate?.classifiedOk ? 'CLASSIFIED PRIOR TO RELEASE' : 'UNCLASSIFIED (-20 PTS)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dim">URBAN OVERFLIGHT ZONE:</span>
                  <span className="text-text-main">
                    {data.zoneId ? `${data.zoneId} (ρ = ${data.rhoZone ?? 0})` : 'OPEN SECTOR'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-line/50 pt-1">
                  <span className="text-text-dim">COLLATERAL HAZARD:</span>
                  <span className={`font-bold ${data.isKineticOverDenseZone ? 'text-threat' : 'text-phosphor'}`}>
                    {data.isKineticOverDenseZone ? '⚠ KINETIC OVER URBAN ZONE' : 'SAFE GATED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Oracle ("School Solution") Comparison */}
          {data.oracleEffector && (
            <div className="border border-line bg-carbon-950 p-3 space-y-1.5">
              <div className="text-[10px] font-display text-text-dim tracking-wider">
                ORACLE ("SCHOOL SOLUTION") & DOCTRINAL REGRET
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-text-dim">RECOMMENDED WEAPON: </span>
                  <span className="text-phosphor font-bold">{data.oracleEffector}</span>
                  <span className="text-text-dim ml-3">TRAINEE CHOICE: </span>
                  <span className="text-friend font-bold">{data.effector}</span>
                </div>
                <div className={`font-bold ${data.isOptimalChoice ? 'text-phosphor' : 'text-amber'}`}>
                  {data.costRegretText ?? 'DOCTRINALLY EVALUATED'}
                </div>
              </div>
            </div>
          )}

          {/* 5. Illustrative Geometry Flight Schematic with Mandatory Caption */}
          <div className="border border-line bg-carbon-950 p-3 space-y-2">
            <div className="text-[10px] font-display text-text-dim tracking-wider">
              ILLUSTRATIVE ENGAGEMENT GEOMETRY
            </div>

            <div className="h-[90px] w-full bg-carbon-900 border border-line flex items-center justify-between px-8 relative overflow-hidden">
              {/* Asset Origin Marker */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full border border-friend bg-friend/30" />
                <span className="text-[9px] text-text-dim mt-1">ASSET (0, 0)</span>
              </div>

              {/* Engagement Path Line */}
              <div className="flex-1 mx-4 relative flex items-center">
                <div
                  className={`w-full border-t-2 ${
                    data.killed ? 'border-dashed border-phosphor' : 'border-dotted border-threat'
                  }`}
                />
                <div className="absolute inset-x-0 -top-3 text-center text-[9px] text-text-dim font-bold">
                  {data.effector} | {Math.round(data.rangeM)}m | Pk: {(data.pk * 100).toFixed(0)}%
                </div>
              </div>

              {/* Target Marker */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rotate-45 border ${
                    data.killed ? 'border-phosphor bg-phosphor/20' : 'border-threat bg-threat/20'
                  }`}
                />
                <span className="text-[9px] text-text-dim mt-1">
                  {data.trackNo} {data.killed ? '(KILL)' : '(SURVIVED)'}
                </span>
              </div>
            </div>

            {/* MANDATORY CAPTION (Rule R10.3 & F8 Spec) */}
            <div className="text-[10px] text-center font-bold tracking-wider text-amber bg-amber/10 border border-amber/30 py-1">
              ILLUSTRATIVE — OUTCOME IS A SEEDED PROBABILITY DRAW
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-[42px] px-4 border-t border-line bg-carbon-800/90 flex items-center justify-between">
          <div className="text-[10px] text-text-dim">
            POST-ACTION DEBRIEFING AID | SYNTHETIC SIMULATION REPLAY
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 font-display font-semibold text-[11px] border border-line hover:border-text-main text-text-main transition-colors"
          >
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { CONFIG } from '@/config';
import { CLASSES, SHORT_CODES, CLASS_LABELS, type TrackClass } from '@/sim/taxonomy';
import type { EffectorId } from '@/sim/types';

export const EngagementPanel: React.FC = () => {
  const selectedTrack = useSessionStore((s) => s.ui.selectedTrack);
  const activeEffector = useSessionStore((s) => s.ui.activeEffector);
  const selectEffector = useSessionStore((s) => s.selectEffector);
  const classify = useSessionStore((s) => s.classify);
  const fire = useSessionStore((s) => s.fire);
  const assess = useSessionStore((s) => s.assess);

  const [missileHoldProgress, setMissileHoldProgress] = useState<number>(0);
  const holdIntervalRef = useRef<number | null>(null);

  const killChainSteps = ['FIND', 'FIX', 'TRACK', 'TARGET', 'ENGAGE', 'ASSESS'];
  const currentStep = selectedTrack?.step || 'FIND';

  const getStepIndex = (step: string) => {
    const idx = killChainSteps.indexOf(step);
    return idx >= 0 ? idx : 0;
  };

  const activeIdx = getStepIndex(currentStep);

  // Compute live CER for each effector based on trainee classification (Rules.md TX-4, SC-1)
  const selectedLabel = selectedTrack?.label;
  const notionalThreatValue =
    selectedLabel === 'HOSTILE_ATTACK'
      ? (CONFIG.droneClasses.FPV_ATTACK.valueInr ?? 100000)
      : selectedLabel === 'HOSTILE_ISR'
        ? (CONFIG.droneClasses.RECON_QUAD.valueInr ?? 40000)
        : selectedLabel === 'SWARM_ELEMENT'
          ? (CONFIG.droneClasses.SWARM_ELEMENT.valueInr ?? 50000)
          : (CONFIG.droneClasses.RECON_QUAD.valueInr ?? 40000);

  const calculateCer = (costInr: number) => {
    return Number((costInr / notionalThreatValue).toFixed(3));
  };

  const handleMissileMouseDown = () => {
    if (!selectedTrack) return;
    setMissileHoldProgress(0);
    const start = performance.now();
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const progress = Math.min(100, (elapsed / 500) * 100);
      setMissileHoldProgress(progress);
      if (progress >= 100) {
        if (holdIntervalRef.current !== null) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        fire(selectedTrack.trackNo);
        setMissileHoldProgress(0);
      }
    }, 20);
  };

  const handleMissileMouseUp = () => {
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setMissileHoldProgress(0);
  };

  return (
    <aside className="w-[320px] h-full bg-carbon-900 border-l border-line flex flex-col font-mono text-xs select-none">
      {/* Title */}
      <div className="h-[28px] px-3 flex items-center justify-between border-b border-line bg-carbon-800/60">
        <span className="font-display font-semibold text-[11px] text-text-main tracking-widest">
          FIRE CONTROL & F2T2EA
        </span>
        <span className="text-[10px] text-phosphor font-bold">
          {selectedTrack ? selectedTrack.trackNo : 'NO TRACK'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
        {/* 1. Kill-Chain Strip */}
        <div>
          <div className="text-[10px] font-display text-text-dim mb-1 tracking-wider">
            KILL-CHAIN STATE:
          </div>
          <div className="grid grid-cols-6 gap-0.5 border border-line p-0.5 bg-carbon-950 text-center font-display text-[9px]">
            {killChainSteps.map((step, idx) => {
              const isPast = idx < activeIdx;
              const isCurrent = idx === activeIdx;
              return (
                <div
                  key={step}
                  className={`py-1 border ${
                    isCurrent
                      ? 'bg-phosphor text-carbon-950 font-bold border-phosphor'
                      : isPast
                        ? 'border-phosphor/60 text-phosphor bg-phosphorDim/20'
                        : 'border-line/60 text-text-dim bg-carbon-900'
                  }`}
                >
                  {step}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Target Telemetry Summary */}
        {selectedTrack ? (
          <div className="p-2 border border-line bg-carbon-950 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-text-dim">TRACK ID:</span>
              <span className="text-friend font-bold">{selectedTrack.trackNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">RANGE / BRG:</span>
              <span className="text-text-main">
                {selectedTrack.rangeKm.toFixed(2)} km / {String(selectedTrack.bearingDeg).padStart(3, '0')}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">SPEED / PNR:</span>
              <span className="text-text-main">
                {selectedTrack.speedMps} m/s | {selectedTrack.timeToPnrSec}s PNR
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-dim">TRACK QUALITY (q):</span>
              <span className={selectedTrack.q >= 0.6 ? 'text-phosphor font-bold' : 'text-threat font-bold'}>
                {selectedTrack.q.toFixed(2)} {selectedTrack.q < 0.6 ? '(LOW - WEAPONS BLOCKED)' : '(FIRM)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 border border-line border-dashed bg-carbon-950 text-center text-text-dim text-[11px] italic">
            DESIGNATE A TRACK (SPACE / CLICK) TO ACTIVATE FIRE CONTROL
          </div>
        )}

        {/* 3. Classification Selector */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-display text-text-dim tracking-wider">
              [C] CLASSIFY TARGET:
            </span>
            {selectedTrack && (
              <span className="text-[10px] text-text-dim">
                CONFIDENCE: {(selectedTrack.cCls * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {CLASSES.map((cls: TrackClass) => {
              const isSelected = selectedTrack?.label === cls;
              const short = SHORT_CODES[cls];
              return (
                <button
                  key={cls}
                  disabled={!selectedTrack}
                  onClick={() => selectedTrack && classify(selectedTrack.trackNo, cls)}
                  className={`px-1.5 py-1 text-left border text-[10px] font-mono truncate transition-colors ${
                    isSelected
                      ? 'bg-carbon-800 border-friend text-friend font-bold'
                      : 'border-line bg-carbon-950 text-text-main hover:border-text-dim disabled:opacity-40'
                  }`}
                  title={CLASS_LABELS[cls]}
                >
                  <span className="text-text-dim font-bold mr-1">[{short}]</span>
                  {CLASS_LABELS[cls]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Tiered Effector Catalog */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-display text-text-dim tracking-wider">
            [F] WEAPONS ENGAGEMENT SUITE:
          </div>

          {/* Effector Buttons */}
          {Object.entries(CONFIG.effectors).map(([effId, eff]) => {
            const isSelectedEffector = activeEffector === effId;
            const cer = calculateCer(eff.costInr);
            const isUnfavourable = cer > 10;
            const isWarning = cer > 1 && cer <= 10;
            const isHeavyMissile = effId === 'MISSILE';

            // Gating checks
            const isTrackQualityBlocked = !selectedTrack || selectedTrack.q < 0.6;
            const isOutOfEnvelope =
              !selectedTrack ||
              selectedTrack.rangeKm * 1000 < eff.envelopeMinM ||
              selectedTrack.rangeKm * 1000 > eff.envelopeMaxM;
            const isHardBlocked = isTrackQualityBlocked || isOutOfEnvelope;

            const isUnclassifiedWarning =
              selectedTrack?.label === 'UNKNOWN_EVIDENCE_INSUFFICIENT';

            return (
              <div
                key={effId}
                onClick={() => selectEffector(effId as EffectorId)}
                className={`p-2 border transition-all cursor-pointer ${
                  isSelectedEffector
                    ? eff.tier === 'T3_HEAVY'
                      ? 'border-threat bg-threat/10'
                      : eff.tier === 'T2_KINETIC'
                        ? 'border-amber bg-amber/10'
                        : 'border-phosphor bg-phosphorDim/20'
                    : 'border-line bg-carbon-950 hover:border-text-dim'
                }`}
              >
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-text-main">{eff.name}</span>
                  <span className="text-text-dim font-mono">₹{eff.costInr.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-[10px] text-text-dim mt-0.5">
                  <span>ENV: {(eff.envelopeMinM / 1000).toFixed(1)}-{(eff.envelopeMaxM / 1000).toFixed(1)} km</span>
                  <span>BASE Pk: {eff.pk0.toFixed(2)}</span>
                </div>

                {/* CER Readout */}
                <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-line/60">
                  <span className="text-text-dim">COST RATIO (CER):</span>
                  <span
                    className={`font-mono font-bold ${
                      isUnfavourable
                        ? 'text-threat animate-pulse'
                        : isWarning
                          ? 'text-amber'
                          : 'text-phosphor'
                    }`}
                  >
                    CER {cer.toFixed(3)}
                    {isUnfavourable && ' [UNFAVOURABLE EXCHANGE]'}
                  </span>
                </div>

                {/* Soft Warnings */}
                {isUnclassifiedWarning && (
                  <div className="text-[9px] text-threat mt-0.5">
                    ⚠ ROE VIOLATION: RELEASE ON UNCLASSIFIED TARGET
                  </div>
                )}

                {/* Fire Button inside Card */}
                {isSelectedEffector && (
                  <div className="mt-2">
                    {isHeavyMissile ? (
                      <button
                        disabled={isHardBlocked}
                        onMouseDown={handleMissileMouseDown}
                        onMouseUp={handleMissileMouseUp}
                        onMouseLeave={handleMissileMouseUp}
                        className={`w-full py-1.5 text-center font-display font-bold text-[11px] border border-threat text-threat relative overflow-hidden ${
                          isHardBlocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-threat/20'
                        }`}
                      >
                        <div
                          className="absolute inset-0 bg-threat/40 pointer-events-none transition-all"
                          style={{ width: `${missileHoldProgress}%` }}
                        />
                        <span className="relative z-10">
                          {isHardBlocked
                            ? 'MISSILE HARD-BLOCKED'
                            : missileHoldProgress > 0
                              ? `HOLDING... ${missileHoldProgress.toFixed(0)}%`
                              : '[HOLD F 500ms] RELEASE MISSILE'}
                        </span>
                      </button>
                    ) : (
                      <button
                        disabled={isHardBlocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTrack) fire(selectedTrack.trackNo);
                        }}
                        className={`w-full py-1 text-center font-display font-bold text-[11px] border ${
                          eff.tier === 'T2_KINETIC'
                            ? 'border-amber text-amber hover:bg-amber/20'
                            : 'border-phosphor text-phosphor hover:bg-phosphorDim/40'
                        } ${isHardBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        {isHardBlocked ? 'RELEASE HARD-BLOCKED' : `[F] RELEASE ${eff.name.toUpperCase()}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 5. BDA Row */}
        <div>
          <div className="text-[10px] font-display text-text-dim mb-1 tracking-wider">
            [A] BATTLE DAMAGE ASSESSMENT:
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              disabled={!selectedTrack}
              onClick={() => selectedTrack && assess(selectedTrack.trackNo, 'KILL')}
              className="py-1 border border-phosphor text-phosphor text-[10px] font-bold hover:bg-phosphorDim/30 disabled:opacity-40"
            >
              CONFIRM KILL
            </button>
            <button
              disabled={!selectedTrack}
              onClick={() => selectedTrack && assess(selectedTrack.trackNo, 'NO_KILL')}
              className="py-1 border border-amber text-amber text-[10px] font-bold hover:bg-amber/20 disabled:opacity-40"
            >
              NO KILL
            </button>
            <button
              disabled={!selectedTrack}
              onClick={() => selectedTrack && assess(selectedTrack.trackNo, 'UNKNOWN')}
              className="py-1 border border-text-dim text-text-dim text-[10px] hover:bg-carbon-800 disabled:opacity-40"
            >
              UNKNOWN
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

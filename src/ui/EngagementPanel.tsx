import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { CONFIG } from '@/config';
import { CLASSES, SHORT_CODES, CLASS_LABELS, type TrackClass } from '@/sim/taxonomy';
import type { EffectorId } from '@/sim/types';

export const EngagementPanel: React.FC = () => {
  const selectedTrack = useSessionStore((s) => s.ui.selectedTrack);
  const activeEffector = useSessionStore((s) => s.ui.activeEffector);
  const sensorHealth = useSessionStore((s) => s.ui.sensorHealth);
  const trackRows = useSessionStore((s) => s.ui.trackRows);
  const selectEffector = useSessionStore((s) => s.selectEffector);
  const classify = useSessionStore((s) => s.classify);
  const fire = useSessionStore((s) => s.fire);
  const assess = useSessionStore((s) => s.assess);
  const designate = useSessionStore((s) => s.designate);
  const openAar = useSessionStore((s) => s.openAar);

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

  // Find in-range effectors for the currently selected track
  const rangeM = selectedTrack ? selectedTrack.rangeKm * 1000 : 0;
  const inRangeEffectors = selectedTrack
    ? Object.entries(CONFIG.effectors).filter(([id, eff]) => {
        if (id === 'RF_SOFTKILL' && sensorHealth?.RF === 'OUT') return false;
        return rangeM >= eff.envelopeMinM && rangeM <= eff.envelopeMaxM;
      })
    : [];

  // Optimal in-range weapon: prioritize lowest cost (best CER), e.g. RF_SOFTKILL / GUN / LASER before INTERCEPTOR / MISSILE
  const bestEffectorEntry = inRangeEffectors.length > 0
    ? [...inRangeEffectors].sort((a, b) => a[1].costInr - b[1].costInr)[0]
    : null;

  // Auto-switch to best in-envelope effector if current weapon is out of envelope
  useEffect(() => {
    if (!selectedTrack || inRangeEffectors.length === 0) return;
    const currentEff = CONFIG.effectors[activeEffector as keyof typeof CONFIG.effectors];
    const isCurrentOutOfEnv =
      currentEff && (rangeM < currentEff.envelopeMinM || rangeM > currentEff.envelopeMaxM);
    if (isCurrentOutOfEnv && bestEffectorEntry) {
      selectEffector(bestEffectorEntry[0] as EffectorId);
    }
  }, [selectedTrack?.trackNo, selectedTrack?.rangeKm, activeEffector, bestEffectorEntry, inRangeEffectors.length, rangeM, selectEffector, selectedTrack]);

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

  // Determine tactical assistant state
  const isTargetClosed = selectedTrack?.step === 'CLOSED';
  const isEngagedOrAssess = selectedTrack?.step === 'ENGAGE' || selectedTrack?.step === 'ASSESS';
  const isUnclassified = selectedTrack?.label === 'UNKNOWN_EVIDENCE_INSUFFICIENT';

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

      <div className="flex-1 overflow-y-auto p-2 space-y-2.5 custom-scrollbar">
        {/* 🌟 TACTICAL OPERATOR ASSISTANT (1-CLICK GUIDED FLOW) 🌟 */}
        <div className="p-2.5 bg-carbon-950 border border-phosphor/70 shadow-lg shadow-phosphor/5 space-y-2">
          {!selectedTrack ? (
            /* STEP 1: SELECT TRACK */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[11px] text-phosphor tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-phosphor animate-ping inline-block" />
                  👉 STEP 1: TARGET THREAT
                </span>
                <span className="text-[9px] text-text-dim">[SPACE / TAB]</span>
              </div>
              <p className="text-[10px] text-text-dim leading-snug">
                Radar detected active incoming drone. Click button below to auto-lock priority contact.
              </p>
              <button
                onClick={() => {
                  if (trackRows.length > 0) {
                    designate(trackRows[0].trackNo, 'CLICK');
                  }
                }}
                disabled={trackRows.length === 0}
                className="w-full py-1.5 bg-phosphor text-carbon-950 font-display font-bold text-xs tracking-wider hover:bg-phosphorDim transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <span>🎯 LOCK PRIORITY TARGET {trackRows[0] ? `(${trackRows[0].trackNo})` : ''}</span>
              </button>
            </div>
          ) : isTargetClosed ? (
            /* TARGET CLOSED / SUCCESS */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[11px] text-friend tracking-wider">
                  ✓ THREAT NEUTRALISED
                </span>
                <span className="text-[9px] text-friend font-bold">KILL CONFIRMED</span>
              </div>
              <p className="text-[10px] text-text-dim leading-snug">
                Target eliminated cleanly according to doctrine. Engagement cycle closed.
              </p>
              <div className="flex gap-1.5">
                {trackRows.filter((t) => t.step !== 'CLOSED').length > 0 ? (
                  <button
                    onClick={() => {
                      const next = trackRows.find((t) => t.step !== 'CLOSED');
                      if (next) designate(next.trackNo, 'CLICK');
                    }}
                    className="flex-1 py-1.5 bg-phosphor text-carbon-950 font-display font-bold text-[11px] tracking-wider hover:bg-phosphorDim transition-all"
                  >
                    🎯 LOCK NEXT THREAT
                  </button>
                ) : null}
                <button
                  onClick={openAar}
                  className="flex-1 py-1.5 bg-carbon-800 border border-phosphor text-phosphor font-display font-bold text-[11px] tracking-wider hover:bg-phosphor hover:text-carbon-950 transition-all"
                >
                  📊 VIEW SCORECARD
                </button>
              </div>
            </div>
          ) : isEngagedOrAssess ? (
            /* STEP 4: CONFIRM KILL / ASSESS */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[11px] text-amber tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber animate-ping inline-block" />
                  👉 STEP 4: ASSESS KILL (BDA)
                </span>
                <span className="text-[9px] text-text-dim">[A] KEY</span>
              </div>
              <p className="text-[10px] text-text-dim leading-snug">
                Weapon fired at {selectedTrack.trackNo}. Confirm neutralisation to close kill-chain.
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => assess(selectedTrack.trackNo, 'KILL')}
                  className="flex-1 py-1.5 bg-friend text-carbon-950 font-display font-bold text-xs tracking-wider hover:bg-green-400 transition-all flex items-center justify-center gap-1"
                >
                  <span>💥 CONFIRM KILL (BDA)</span>
                </button>
                <button
                  onClick={() => assess(selectedTrack.trackNo, 'NO_KILL')}
                  className="px-2 py-1.5 border border-amber text-amber text-[10px] hover:bg-amber/20"
                  title="Target survived - re-engage"
                >
                  NO KILL
                </button>
              </div>
            </div>
          ) : isUnclassified ? (
            /* STEP 2: CLASSIFY THREAT */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[11px] text-threat tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-threat animate-ping inline-block" />
                  👉 STEP 2: CLASSIFY TARGET
                </span>
                <span className="text-[9px] text-text-dim">[C] KEY</span>
              </div>
              <p className="text-[10px] text-text-dim leading-snug">
                Target {selectedTrack.trackNo} at {selectedTrack.rangeKm.toFixed(2)} km. ROE requires classification before firing!
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => classify(selectedTrack.trackNo, 'HOSTILE_ATTACK')}
                  className="flex-1 py-1.5 bg-threat text-carbon-950 font-display font-bold text-xs tracking-wider hover:bg-red-400 transition-all flex items-center justify-center gap-1"
                >
                  <span>⚡ CLASSIFY HOSTILE (HA)</span>
                </button>
                <button
                  onClick={() => classify(selectedTrack.trackNo, 'HOSTILE_ISR')}
                  className="px-2 py-1.5 border border-threat text-threat hover:bg-threat/20 font-bold text-[10px]"
                  title="Classify as Hostile Recon / ISR"
                >
                  ISR [HI]
                </button>
              </div>
            </div>
          ) : (
            /* STEP 3: FIRE WEAPON */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[11px] text-phosphor tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-phosphor animate-ping inline-block" />
                  👉 STEP 3: ENGAGE TARGET
                </span>
                <span className="text-[9px] text-text-dim">[F] KEY</span>
              </div>
              {bestEffectorEntry ? (
                <>
                  <p className="text-[10px] text-text-dim leading-snug">
                    <span className="text-phosphor font-bold">{bestEffectorEntry[1].name}</span> is in envelope (Target at{' '}
                    {selectedTrack.rangeKm.toFixed(2)} km). Ready to fire!
                  </p>
                  <button
                    onClick={() => {
                      selectEffector(bestEffectorEntry[0] as EffectorId);
                      fire(selectedTrack.trackNo);
                    }}
                    className="w-full py-1.5 bg-phosphor text-carbon-950 font-display font-bold text-xs tracking-wider hover:bg-phosphorDim transition-all flex items-center justify-center gap-1.5 shadow-md shadow-phosphor/20"
                  >
                    <span>🚀 FIRE {bestEffectorEntry[1].name.toUpperCase()} (₹{bestEffectorEntry[1].costInr.toLocaleString()})</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-amber leading-snug">
                    Target at {selectedTrack.rangeKm.toFixed(2)} km. Approaching firing envelope...
                  </p>
                  <button
                    disabled
                    className="w-full py-1.5 bg-carbon-800 text-text-dim border border-line font-display font-bold text-[10px] tracking-wider cursor-not-allowed opacity-60"
                  >
                    ⏳ TARGET OUT OF ALL WEAPON ENVELOPES
                  </button>
                </>
              )}
            </div>
          )}
        </div>

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
          <div className="flex justify-between items-center text-[10px] font-display text-text-dim tracking-wider">
            <span>[F] WEAPONS ENGAGEMENT SUITE:</span>
            {selectedTrack && (
              <span className="text-phosphor font-mono text-[9px]">
                {inRangeEffectors.length} IN RANGE
              </span>
            )}
          </div>

          {/* Effector Buttons */}
          {Object.entries(CONFIG.effectors).map(([effId, eff]) => {
            const isSelectedEffector = activeEffector === effId;
            const cer = calculateCer(eff.costInr);
            const isUnfavourable = cer > 10;
            const isWarning = cer > 1 && cer <= 10;
            const isHeavyMissile = effId === 'MISSILE';

            // Gating checks (Rules.md SC-10)
            const isTrackQualityBlocked = !selectedTrack || selectedTrack.q < 0.6;
            const isOutOfEnvelope =
              !selectedTrack ||
              selectedTrack.rangeKm * 1000 < eff.envelopeMinM ||
              selectedTrack.rangeKm * 1000 > eff.envelopeMaxM;
            const isRfJamBlocked = effId === 'RF_SOFTKILL' && sensorHealth?.RF === 'OUT';
            const isHardBlocked = isTrackQualityBlocked || isOutOfEnvelope || isRfJamBlocked;
            const hardBlockReason = isTrackQualityBlocked
              ? 'Q < 0.6'
              : isOutOfEnvelope
                ? 'OUT ENV'
                : isRfJamBlocked
                  ? 'RF JAMMED'
                  : 'BLOCKED';

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
                    : !isOutOfEnvelope && selectedTrack
                      ? 'border-phosphor/40 bg-carbon-950 hover:border-phosphor'
                      : 'border-line bg-carbon-950 hover:border-text-dim'
                }`}
              >
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-main">{eff.name}</span>
                    {!isOutOfEnvelope && selectedTrack && (
                      <span className="text-[8px] px-1 py-0.2 bg-phosphor/20 text-phosphor border border-phosphor font-bold leading-none">
                        IN RANGE
                      </span>
                    )}
                  </div>
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

                {/* In/Out of Envelope Indicator */}
                {selectedTrack && (
                  <div className="mt-1">
                    {isOutOfEnvelope ? (
                      <div className="text-[9px] text-amber font-mono">
                        ⚡ OUT OF RANGE ({selectedTrack.rangeKm.toFixed(2)} km &gt; {(eff.envelopeMaxM / 1000).toFixed(1)} km)
                      </div>
                    ) : !isHardBlocked ? (
                      <div className="text-[9px] text-phosphor font-mono font-bold">
                        ✓ IN ENVELOPE (OPTIMAL ENGAGEMENT)
                      </div>
                    ) : null}
                  </div>
                )}

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
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTrack && !isHardBlocked) fire(selectedTrack.trackNo);
                        }}
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
                            ? `MISSILE BLOCKED (${hardBlockReason})`
                            : missileHoldProgress > 0
                              ? `HOLDING... ${missileHoldProgress.toFixed(0)}%`
                              : '[F / CLICK] RELEASE HEAVY MISSILE'}
                        </span>
                      </button>
                    ) : (
                      <button
                        disabled={isHardBlocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTrack && !isHardBlocked) fire(selectedTrack.trackNo);
                        }}
                        className={`w-full py-1 text-center font-display font-bold text-[11px] border ${
                          eff.tier === 'T2_KINETIC'
                            ? 'border-amber text-amber hover:bg-amber/20'
                            : 'border-phosphor text-phosphor hover:bg-phosphorDim/40'
                        } ${isHardBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        {isHardBlocked ? `RELEASE BLOCKED (${hardBlockReason})` : `[F] RELEASE ${eff.name.toUpperCase()}`}
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

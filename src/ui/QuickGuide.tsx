import React from 'react';

interface QuickGuideProps {
  onClose: () => void;
}

export const QuickGuide: React.FC<QuickGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl max-h-[90vh] bg-carbon-900 border border-phosphor/60 flex flex-col font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="h-[42px] px-4 bg-carbon-950 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-phosphor rounded-full animate-ping" />
            <span className="font-display font-bold text-sm tracking-widest text-phosphor">
              OPERATOR QUICK-START GUIDE & RULES OF ENGAGEMENT
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-0.5 border border-line hover:border-threat text-text-dim hover:text-threat font-bold transition-colors"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-text-main">
          {/* Mission Objective */}
          <div className="p-3 bg-carbon-950 border-l-4 border-phosphor border-line">
            <div className="font-display font-bold text-xs text-phosphor tracking-wider mb-1">
              MISSION OBJECTIVE:
            </div>
            <p className="text-[11px] leading-relaxed text-text-main">
              Hostile drones are penetrating the defensive perimeter. Your goal is to detect, classify, engage,
              and neutralise all airborne threats before they reach the Point of No Return (500m).
              Maintain high Cost-Exchange Ratio (CER) by choosing the right weapon for each threat.
            </p>
          </div>

          {/* 4-Step Kill Chain */}
          <div>
            <div className="font-display font-bold text-xs text-text-dim tracking-wider mb-2">
              THE 4-STEP KILL CHAIN (F2T2EA WORKFLOW):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {/* Step 1 */}
              <div className="p-2.5 bg-carbon-950 border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-phosphor font-bold font-display text-[11px]">STEP 1: TARGET</span>
                  <span className="text-[9px] text-text-dim px-1 border border-line">SPACE / TAB</span>
                </div>
                <div className="text-[10px] text-text-dim">
                  Click any drone on the radar scope or track list on the left to lock it.
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-2.5 bg-carbon-950 border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber font-bold font-display text-[11px]">STEP 2: CLASSIFY</span>
                  <span className="text-[9px] text-text-dim px-1 border border-line">[C] KEY</span>
                </div>
                <div className="text-[10px] text-text-dim">
                  Identify threat type. Click <span className="text-threat font-bold">[HA] Hostile Attack</span>.
                  Firing on unclassified tracks is an ROE violation!
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-2.5 bg-carbon-950 border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-threat font-bold font-display text-[11px]">STEP 3: FIRE</span>
                  <span className="text-[9px] text-text-dim px-1 border border-line">[F] KEY</span>
                </div>
                <div className="text-[10px] text-text-dim">
                  Choose a weapon <span className="text-phosphor font-bold">IN ENVELOPE</span> and click FIRE.
                  Use Interceptor for long range, Soft-Kill or Gun for short range.
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-2.5 bg-carbon-950 border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-friend font-bold font-display text-[11px]">STEP 4: ASSESS</span>
                  <span className="text-[9px] text-text-dim px-1 border border-line">[A] KEY</span>
                </div>
                <div className="text-[10px] text-text-dim">
                  After effector impact, click <span className="text-friend font-bold">CONFIRM KILL</span> to close the
                  engagement and receive full doctrine points.
                </div>
              </div>
            </div>
          </div>

          {/* Effector Arsenal & Firing Ranges */}
          <div>
            <div className="font-display font-bold text-xs text-text-dim tracking-wider mb-2">
              WEAPONS ARSENAL & FIRING RANGES:
            </div>
            <div className="border border-line overflow-hidden bg-carbon-950 text-[11px]">
              <div className="grid grid-cols-5 p-1.5 font-bold text-text-dim border-b border-line bg-carbon-900/60 text-[10px]">
                <div>EFFECTOR</div>
                <div>FIRING ENVELOPE</div>
                <div>BASE PK</div>
                <div>UNIT COST</div>
                <div>TACTICAL ROLE</div>
              </div>
              <div className="divide-y divide-line/40 font-mono text-[10px]">
                <div className="grid grid-cols-5 p-1.5 items-center">
                  <span className="text-phosphor font-bold">RF Soft-Kill</span>
                  <span>0.2 – 2.0 km</span>
                  <span>80%</span>
                  <span className="text-phosphor">₹100</span>
                  <span className="text-text-dim">Cheapest; denies RF/GNSS</span>
                </div>
                <div className="grid grid-cols-5 p-1.5 items-center">
                  <span className="text-phosphor font-bold">Laser Directed Energy</span>
                  <span>0.2 – 1.5 km</span>
                  <span>70%</span>
                  <span className="text-phosphor">₹500</span>
                  <span className="text-text-dim">Instant burn; unaffected by RF</span>
                </div>
                <div className="grid grid-cols-5 p-1.5 items-center">
                  <span className="text-amber font-bold">Gun 30mm Burst</span>
                  <span>0.1 – 2.0 km</span>
                  <span>60%</span>
                  <span className="text-amber">₹20,000</span>
                  <span className="text-text-dim">Kinetic shells with debris spread</span>
                </div>
                <div className="grid grid-cols-5 p-1.5 items-center bg-carbon-800/30">
                  <span className="text-amber font-bold">Interceptor Drone</span>
                  <span className="text-phosphor font-bold">0.5 – 4.0 km (LONG)</span>
                  <span>80%</span>
                  <span className="text-amber">₹2,00,000</span>
                  <span className="text-friend font-bold">Best for threats beyond 2 km</span>
                </div>
                <div className="grid grid-cols-5 p-1.5 items-center">
                  <span className="text-threat font-bold">SAM Missile</span>
                  <span className="text-phosphor font-bold">1.0 – 5.0 km (MAX)</span>
                  <span>90%</span>
                  <span className="text-threat">₹30,00,000</span>
                  <span className="text-threat">Heavy last-resort; expensive</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Operator Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 border border-line bg-carbon-950 space-y-1">
              <span className="text-phosphor font-bold block">💡 TIP: SPEED CONTROLS</span>
              <p className="text-text-dim">
                Use the <span className="text-phosphor font-bold">1x / 2x / 4x</span> toggles in the top bar
                to speed up the simulation and eliminate waiting time!
              </p>
            </div>
            <div className="p-2 border border-line bg-carbon-950 space-y-1">
              <span className="text-amber font-bold block">💡 TIP: 1-CLICK TACTICAL ASSISTANT</span>
              <p className="text-text-dim">
                The green action card on top of the right rail always tells you what to do next with a single click!
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="h-[46px] px-4 bg-carbon-950 border-t border-line flex items-center justify-between">
          <span className="text-[10px] text-text-dim font-mono">
            PRESS [ESC] OR CLICK BUTTON TO RESUME
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-phosphor text-carbon-950 font-display font-bold text-xs tracking-wider hover:bg-phosphorDim transition-colors"
          >
            [ 🚀 PROCEED TO CONSOLE ]
          </button>
        </div>
      </div>
    </div>
  );
};

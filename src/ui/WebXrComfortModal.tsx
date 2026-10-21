import React from 'react';

interface WebXrComfortModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WebXrComfortModal: React.FC<WebXrComfortModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="WebXR VR Comfort & Safety Advisory"
      className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="w-full max-w-2xl bg-carbon-900 border border-amber/60 flex flex-col font-mono text-xs overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-[44px] px-4 bg-carbon-950 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber rounded-full animate-ping" />
            <span className="font-display font-bold text-sm tracking-widest text-amber">
              WEBXR VR MODE — OPERATOR ADVISORY
            </span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber/20 text-amber border border-amber/40">
            EXPERIMENTAL · UNVERIFIED
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-text-main">
          {/* Status & Hardware Notice */}
          <div className="p-3 bg-carbon-950 border border-line border-l-4 border-l-amber">
            <div className="font-display font-bold text-xs text-amber tracking-wider mb-1">
              STATUS: EXPERIMENTAL PROTOTYPE (OQ-11 & Rules.md R10.15)
            </div>
            <p className="text-[11px] leading-relaxed text-text-dim">
              WebXR VR is designated as an experimental presentation track. While the Three.js scene,
              pluggable FrameDriver, and deterministic quantized inputs are fully wired, broad headset
              certification requires physical verification logs in MEMORY.md.
            </p>
          </div>

          {/* Table-Top & Motion Comfort */}
          <div className="space-y-2">
            <div className="font-display font-bold text-xs text-phosphor tracking-wider">
              1. TABLE-TOP CONSOLE SCALE & MOTION COMFORT:
            </div>
            <div className="p-3 bg-carbon-950 border border-line text-[11px] leading-relaxed space-y-1.5 text-text-main">
              <div>
                • <strong className="text-text-main">Zero Artificial Locomotion:</strong> The 5 km tactical zone is projected at 1:10,000 scale (1.0m table diameter) positioned 0.85m in front of you. Your camera is 100% 1:1 physical head movement.
              </div>
              <div>
                • <strong className="text-text-main">Altitude Exaggeration:</strong> Altitudes are rendered with 4x vertical exaggeration (HUD indicates ALT x4) to ensure low-flying threats remain distinct from ground level.
              </div>
              <div>
                • <strong className="text-text-main">Session Comfort:</strong> Recommended maximum session duration is 10 minutes. If you experience visual fatigue, exit immediately.
              </div>
            </div>
          </div>

          {/* Controls & Interaction */}
          <div className="space-y-2">
            <div className="font-display font-bold text-xs text-phosphor tracking-wider">
              2. CONTROLLER BINDINGS & DETERMINISTIC INPUTS:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-carbon-950 border border-line space-y-1">
                <span className="text-phosphor font-bold">AIM RAY & PULL TRIGGER</span>
                <div className="text-text-dim">Designate or select track under laser pointer</div>
              </div>
              <div className="p-2 bg-carbon-950 border border-line space-y-1">
                <span className="text-phosphor font-bold">GRIP / SQUEEZE</span>
                <div className="text-text-dim">Cycle through 5 available effector systems</div>
              </div>
              <div className="p-2 bg-carbon-950 border border-line space-y-1">
                <span className="text-phosphor font-bold">BUTTON A (PRIMARY)</span>
                <div className="text-text-dim">FIRE currently armed effector at designated track</div>
              </div>
              <div className="p-2 bg-carbon-950 border border-line space-y-1">
                <span className="text-phosphor font-bold">BUTTON B (SECONDARY)</span>
                <div className="text-text-dim">ASSESS engagement outcome (KILL assessment)</div>
              </div>
              <div className="p-2 bg-carbon-950 border border-line space-y-1">
                <span className="text-phosphor font-bold">THUMBSTICK FLICK</span>
                <div className="text-text-dim">Cycle previous/next track; Click to recenter table</div>
              </div>
              <div className="p-2 bg-carbon-950 border border-line space-y-1">
                <span className="text-threat font-bold">KEYBOARD ESC / EXIT</span>
                <div className="text-text-dim">Instantly exits VR and restores desktop console</div>
              </div>
            </div>
          </div>

          {/* Parity & Information Gating */}
          <div className="p-3 bg-carbon-950 border border-line text-[11px] leading-relaxed text-text-dim">
            <strong className="text-text-main">Information Gating & Scored Parity:</strong> In EVAL mode, all decision aids are locked ([AIDS LOCKED]). True drone classifications, formations, and waypoints are strictly air-gapped from live presentation. All actions route through the 20 Hz quantized input queue.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-[52px] px-4 bg-carbon-950 border-t border-line flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 border border-line hover:border-text-dim text-text-dim hover:text-text-main font-bold transition-colors"
          >
            [CANCEL & STAY ON DESKTOP]
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 bg-amber hover:bg-amber/90 text-carbon-950 font-display font-bold tracking-wider transition-colors shadow"
          >
            [ENTER VR (EXPERIMENTAL)]
          </button>
        </div>
      </div>
    </div>
  );
};

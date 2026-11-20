import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { FeedbackCategory } from '@/sim/operatorFeedback';

const CATEGORY_STYLES: Record<
  FeedbackCategory,
  {
    border: string;
    bg: string;
    badge: string;
    badgeBg: string;
    icon: string;
  }
> = {
  RELEASE_BLOCKED: {
    border: 'border-threat',
    bg: 'bg-carbon-900/95',
    badge: 'text-threat',
    badgeBg: 'bg-threat/20',
    icon: '⛔',
  },
  ROE_WARNING: {
    border: 'border-amber',
    bg: 'bg-carbon-900/95',
    badge: 'text-amber',
    badgeBg: 'bg-amber/20',
    icon: '⚠️',
  },
  ENGAGEMENT_UNSUCCESSFUL: {
    border: 'border-amber/80',
    bg: 'bg-carbon-900/95',
    badge: 'text-amber',
    badgeBg: 'bg-amber/20',
    icon: '🎯',
  },
  NEUTRALIZATION_INDICATED: {
    border: 'border-phosphor',
    bg: 'bg-carbon-900/95',
    badge: 'text-phosphor',
    badgeBg: 'bg-phosphor/20',
    icon: '💥',
  },
  RELEASE_ACCEPTED: {
    border: 'border-friend',
    bg: 'bg-carbon-900/95',
    badge: 'text-friend',
    badgeBg: 'bg-friend/20',
    icon: '🚀',
  },
  SYSTEM_WARNING: {
    border: 'border-line',
    bg: 'bg-carbon-900/95',
    badge: 'text-text-main',
    badgeBg: 'bg-carbon-800',
    icon: 'ℹ️',
  },
};

export const OperatorFeedbackToast: React.FC = () => {
  const activeFeedback = useSessionStore((state) => state.activeFeedback);
  const dismissFeedback = useSessionStore((state) => state.dismissFeedback);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!activeFeedback) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    // Auto-dismiss after 5 seconds
    const timer = window.setTimeout(() => {
      dismissFeedback(activeFeedback.id);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeFeedback, dismissFeedback]);

  if (!activeFeedback || !isVisible) {
    return null;
  }

  const style = CATEGORY_STYLES[activeFeedback.category] ?? CATEGORY_STYLES.SYSTEM_WARNING;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="operator-feedback-toast"
      className={`fixed top-12 right-6 z-50 w-[380px] max-w-[90vw] ${style.bg} border-2 ${style.border} shadow-2xl backdrop-blur-md p-3.5 font-mono select-none transition-all duration-200 pointer-events-auto`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{style.icon}</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wider rounded ${style.badgeBg} ${style.badge}`}
          >
            {activeFeedback.category}
          </span>
          {activeFeedback.trackNo && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-carbon-800 text-text-main rounded border border-line">
              {activeFeedback.trackNo}
            </span>
          )}
        </div>
        <button
          onClick={() => dismissFeedback(activeFeedback.id)}
          aria-label="Dismiss feedback"
          className="text-text-dim hover:text-text-main text-sm font-bold px-1.5 hover:bg-carbon-800 rounded transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Main Title */}
      <h4 className="font-display font-bold text-xs tracking-wide text-text-main mb-1.5 leading-snug">
        {activeFeedback.title}
      </h4>

      {/* Detailed Tactical Explanation */}
      <p className="text-[11px] text-text-dim leading-relaxed mb-2.5">
        {activeFeedback.explanation}
      </p>

      {/* Measured Values (Actual vs Required) */}
      {activeFeedback.measured && (
        <div className="flex items-center gap-4 bg-carbon-950/80 px-2.5 py-1.5 border border-line/40 text-[10px] mb-2">
          <div>
            <span className="text-text-dim block text-[9px]">MEASURED</span>
            <span className="font-bold text-text-main">{activeFeedback.measured.actual}</span>
          </div>
          <div className="border-l border-line/40 pl-3">
            <span className="text-text-dim block text-[9px]">REQUIRED</span>
            <span className="font-bold text-phosphor">{activeFeedback.measured.required}</span>
          </div>
          {activeFeedback.measured.unit && (
            <span className="text-text-dim text-[9px] ml-auto">({activeFeedback.measured.unit})</span>
          )}
        </div>
      )}

      {/* Suggested Tactical Action */}
      {activeFeedback.recommendedAction && (
        <div className="text-[10px] text-text-dim/90 border-t border-line/40 pt-1.5 flex items-start gap-1">
          <span className="text-amber font-bold shrink-0">ACTION:</span>
          <span>{activeFeedback.recommendedAction}</span>
        </div>
      )}
    </div>
  );
};

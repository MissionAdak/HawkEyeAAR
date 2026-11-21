import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { getScenarioCatalogEntry, DEFAULT_SCENARIO_ID } from '@/director/catalog';
import { SHORT_CODES, type TrueClass } from '@/sim/taxonomy';
import { getScenarioEnvironmentDescriptor } from '@/render3d/environment/descriptor';
import type { SessionMode } from '@/sim/types';

interface MissionBriefingProps {
  onClose?: () => void;
}

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return (
    target.closest(
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"], [contenteditable="true"]'
    ) !== null
  );
}

export const MissionBriefing: React.FC<MissionBriefingProps> = ({ onClose }) => {
  const selectedScenarioId = useSessionStore((s) => s.selectedScenarioId) || DEFAULT_SCENARIO_ID;
  const startSession = useSessionStore((s) => s.startSession);
  const openScenarioModal = useSessionStore((s) => s.openScenarioModal);
  const closeBriefing = useSessionStore((s) => s.closeBriefing);
  const sessionStatus = useSessionStore((s) => s.sessionStatus);
  const isScenarioModalOpen = useSessionStore((s) => s.isScenarioModalOpen);

  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exerciseMode, setExerciseMode] = useState<SessionMode>('TRAIN');

  const entry = getScenarioCatalogEntry(selectedScenarioId);
  const isRandom = selectedScenarioId.startsWith('RANDOM-');
  const envDesc = getScenarioEnvironmentDescriptor(selectedScenarioId);

  const getClassBadgeClass = (cls: TrueClass) => {
    switch (cls) {
      case 'HOSTILE_ATTACK':
      case 'HOSTILE_ISR':
      case 'SWARM_ELEMENT':
        return 'border-threat text-threat bg-threat/10';
      case 'CIVIL_UAS':
        return 'border-phosphor text-phosphor bg-phosphorDim/20';
      case 'BIRD':
        return 'border-unknown text-unknown bg-carbon-800';
      case 'FRIENDLY':
        return 'border-friend text-friend bg-friend/20';
      default:
        return 'border-line text-text-dim bg-carbon-800';
    }
  };

  const handleStart = async () => {
    if (isStarting || sessionStatus === 'STARTING') return;
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const ok = await startSession(selectedScenarioId, undefined, exerciseMode);
      if (!ok) {
        setErrorMessage(`Failed to start scenario "${selectedScenarioId}". Validation or initialization failed.`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStarting(false);
    }
  };

  const handleDismiss = () => {
    if (onClose) onClose();
    closeBriefing();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScenarioModalOpen) return;

      if (e.key === 'Enter') {
        const isInteractive =
          isInteractiveElement(e.target) ||
          (typeof document !== 'undefined' && isInteractiveElement(document.activeElement));

        // Enter triggers the global START SESSION shortcut only when focus is on a non-interactive area.
        // When a button, link, input, select, textarea, or other interactive element has focus,
        // preserve its native keyboard behavior (e.g. Enter on a focused button triggers its onClick).
        if (!isInteractive) {
          e.preventDefault();
          void handleStart();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        openScenarioModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScenarioId, isStarting, sessionStatus, isScenarioModalOpen, onClose, closeBriefing]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mission Briefing & Exercise Control"
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-carbon-950/95 flex items-center justify-center p-4 select-none font-mono text-xs outline-none"
    >
      <div
        tabIndex={-1}
        className="w-[840px] max-h-[92vh] bg-carbon-900 border border-phosphor/60 flex flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="h-[46px] px-4 border-b border-line bg-carbon-800/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span
              data-testid="briefing-title"
              className="font-display font-bold text-sm tracking-widest text-text-main"
            >
              DRISHTI-CUAS — MISSION CONTROL
            </span>
            <span className="text-[10px] font-display font-bold px-2 py-0.5 border border-phosphor text-phosphor bg-phosphorDim/20 tracking-wider">
              STATUS: READY FOR EXERCISE
            </span>
          </div>

          <button
            onClick={handleDismiss}
            data-testid="standby-view-btn"
            aria-label="Close Briefing to Standby View"
            className="px-2 py-0.5 text-[11px] font-bold border border-line hover:border-text-main text-text-dim hover:text-text-main transition-colors"
            title="Preview tactical console scope in standby mode (Esc)"
          >
            ✕ STANDBY VIEW
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Scenario Identification Strip */}
          <div className="p-3 bg-carbon-950 border border-line flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-base text-text-main tracking-wide">
                  {entry?.name ?? selectedScenarioId}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-carbon-800 border border-line text-text-dim">
                  ID: {selectedScenarioId}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-carbon-800 border border-line text-phosphor">
                  DURATION: {entry?.durationSec ?? 120}s
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 border ${
                    entry?.category === 'DEMO'
                      ? 'border-amber text-amber bg-amber/10'
                      : 'border-friend text-friend bg-friend/10'
                  }`}
                >
                  {entry?.category ?? 'TRAIN'}
                </span>
              </div>
              <div className="text-[11px] text-text-dim">
                Exercise doctrine: Counter-Unmanned Aerial Systems (C-UAS) Air Defense Simulation
              </div>
            </div>

            <button
              onClick={openScenarioModal}
              data-testid="change-scenario-btn"
              className="px-3 py-1.5 font-display font-semibold text-[11px] border border-phosphor/70 hover:border-phosphor text-phosphor hover:bg-phosphorDim/30 transition-colors shrink-0"
              title="Browse and select another scenario from catalog (S)"
            >
              [S] CHANGE SCENARIO
            </button>
          </div>

          {/* Exercise Mode Selection Strip (TRAIN vs EVAL Benchmark) */}
          <div className="p-3 bg-carbon-950 border border-line flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-display font-bold text-text-dim tracking-wider">
                EXERCISE EVALUATION MODE
              </div>
              <div className="text-[11px] text-text-dim">
                {exerciseMode === 'EVAL'
                  ? 'Standardized benchmark: Speed locked at 1×, decision aids locked, scores persist to Unit Readiness Leaderboard.'
                  : 'Adaptive practice drill: Adaptive difficulty scaling and training aids permitted.'}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-testid="briefing-mode-train-btn"
                onClick={() => setExerciseMode('TRAIN')}
                className={`px-3 py-1 font-display font-bold text-xs tracking-wider border transition-colors ${
                  exerciseMode === 'TRAIN'
                    ? 'border-friend text-friend bg-friend/20 font-bold'
                    : 'border-line text-text-dim bg-carbon-900 hover:text-text-main'
                }`}
              >
                TRAIN (PRACTICE)
              </button>
              <button
                type="button"
                data-testid="briefing-mode-eval-btn"
                onClick={() => setExerciseMode('EVAL')}
                className={`px-3 py-1 font-display font-bold text-xs tracking-wider border transition-colors ${
                  exerciseMode === 'EVAL'
                    ? 'border-phosphor text-phosphor bg-phosphorDim/40 font-bold'
                    : 'border-line text-text-dim bg-carbon-900 hover:text-text-main'
                }`}
              >
                EVAL (BENCHMARK)
              </button>
            </div>
          </div>

          {/* Section: Training Objective */}
          <div className="p-3 bg-carbon-850 border border-line">
            <div className="text-[10px] font-display font-bold text-text-dim tracking-wider mb-1">
              TRAINING OBJECTIVE
            </div>
            <div className="text-sm font-semibold text-text-main font-mono leading-relaxed">
              {entry?.objective ?? 'Intercept and neutralize unauthorized aerial threats under strict rules of engagement.'}
            </div>
          </div>

          {/* Section: Operational Briefing */}
          <div className="p-3 bg-carbon-850 border border-line">
            <div className="text-[10px] font-display font-bold text-text-dim tracking-wider mb-1">
              OPERATIONAL BRIEFING & TACTICAL CONTEXT
            </div>
            <div className="text-[11px] text-text-dim font-mono leading-relaxed">
              {entry?.description ?? 'Monitor the 5 km primary radar coverage area. Detect, track, designate, and assess incoming aerial vehicles.'}
            </div>
          </div>

          {/* Randomized Scenario Ground-Truth Protection Banner */}
          {isRandom ? (
            <div className="p-3 bg-amber/10 border border-amber/70 flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-2 text-amber font-bold">
                <span>⚡ RANDOMIZED ENCOUNTER EXERCISE</span>
              </div>
              <p className="text-amber/90 leading-relaxed">
                Threat composition, arrival timelines, and flight corridors are randomized on start. Ground-truth numbers and flight schedules are strictly withheld during briefing to simulate real-world radar interception.
              </p>
            </div>
          ) : (
            entry?.adaptiveNote && (
              <div className="p-2.5 bg-amber/10 border border-amber/60 text-amber text-[11px]">
                <span className="font-bold">EXERCISE ADVISORY: </span>
                {entry.adaptiveNote}
              </div>
            )
          )}

          {/* Environmental Conditions & Tactical Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Box: Environment & Radar Suite */}
            <div className="p-3 bg-carbon-850 border border-line flex flex-col gap-1.5" data-testid="briefing-environment-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-display font-bold text-text-dim tracking-wider">
                  3D TACTICAL ENVIRONMENT & ATMOSPHERE
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 border border-friend text-friend bg-friend/10">
                  {envDesc.preset.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] text-text-main font-semibold">
                {envDesc.terrainType}
              </div>
              <div className="text-[10px] text-text-dim italic leading-tight">
                {envDesc.description}
              </div>
              <ul className="text-[11px] space-y-1 text-text-main list-disc list-inside pt-1">
                <li><span className="text-text-dim">Lighting:</span> {envDesc.dayNight === 'NIGHT' ? '🌙 Night Operations (Thermal EO/IR Priority)' : '☀️ Daylight Standard (Visual & EO/IR Active)'}</li>
                <li><span className="text-text-dim">Atmosphere:</span> {envDesc.weather === 'FOG' ? `🌫 Dense Fog (Severity ${(envDesc.fogSeverity ?? 1).toFixed(1)}x - Optical Range Reduced)` : envDesc.weather === 'RAIN' ? '🌧 Precipitation / Rain (Radar Backscatter Present)' : '🌤 Clear Visibility (Nominal Propagation)'}</li>
                <li><span className="text-text-dim">Coverage Radius:</span> 5,000 meters tactical radius (S-Band 30 RPM)</li>
                <li><span className="text-text-dim">Exclusion Zone:</span> 500m Point-of-No-Return (PNR) Defense Core</li>
              </ul>
            </div>

            {/* Right Box: Rules of Engagement */}
            <div className="p-3 bg-carbon-850 border border-line flex flex-col gap-1.5">
              <div className="text-[10px] font-display font-bold text-text-dim tracking-wider">
                RULES OF ENGAGEMENT (ROE)
              </div>
              <ul className="text-[11px] space-y-1 text-text-main list-disc list-inside">
                <li><span className="text-text-dim">Weapons Posture:</span> WEAPONS TIGHT URBAN</li>
                <li><span className="text-text-dim">Civilian Airspace:</span> HOLD FIRE CIVIL / BIRDS</li>
                <li><span className="text-text-dim">Doctrine Mandate:</span> Unclassified release is an ROE violation</li>
                <li><span className="text-text-dim">Effector Policy:</span> Proportional escalation (RF Jam &rarr; High-Power &rarr; Kinetic)</li>
              </ul>
            </div>
          </div>

          {/* Target Profile Breakdown */}
          <div className="p-3 bg-carbon-850 border border-line flex flex-col gap-1.5">
            <div className="text-[10px] font-display font-bold text-text-dim tracking-wider">
              {isRandom ? 'ENCOUNTER PROFILE' : 'AUTHORIZED TARGET CLASSES IN SCENARIO'}
            </div>
            {isRandom ? (
              <div className="text-[11px] text-text-dim italic">
                Unknown ahead of time. Operator must classify targets via kinematic speed and radar cross-section.
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {entry?.classes.map((cls) => (
                  <span
                    key={cls}
                    className={`px-2 py-0.5 border text-[10px] font-mono ${getClassBadgeClass(cls)}`}
                  >
                    {SHORT_CODES[cls]} — {cls.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="p-2.5 bg-threat/10 border border-threat text-threat text-[11px] font-bold">
              ⚠ {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-[52px] px-4 border-t border-line bg-carbon-800/90 flex items-center justify-between shrink-0">
          <div className="flex flex-col text-[10px] text-text-dim">
            <span className="font-semibold text-text-dim">C-UAS TACTICAL AIR DEFENSE SIMULATION ENVIRONMENT</span>
            <span className="text-[9px] text-text-dim/80 hidden sm:block">
              PRESS <span className="text-phosphor font-bold">[ENTER]</span> TO START | <span className="text-text-main font-bold">[S]</span> CHANGE SCENARIO | <span className="text-text-main font-bold">[ESC]</span> STANDBY SCOPE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openScenarioModal}
              data-testid="footer-change-scenario-btn"
              className="px-3 py-1.5 font-display font-semibold text-[11px] border border-line hover:border-text-main text-text-dim hover:text-text-main transition-colors"
            >
              CHANGE SCENARIO
            </button>
            <button
              onClick={handleStart}
              disabled={isStarting}
              data-testid="start-session-btn"
              className={`px-6 py-2 font-display font-bold text-sm tracking-wider border transition-all ${
                isStarting
                  ? 'border-line text-text-dim bg-carbon-800 cursor-wait'
                  : 'border-phosphor bg-phosphor text-carbon-950 hover:bg-phosphor/90 active:scale-95'
              }`}
            >
              {isStarting ? 'INITIALIZING...' : 'START SESSION ►'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useSessionStore, engineInstance } from '@/store/sessionStore';
import {
  SCENARIO_CATALOG,
  type ScenarioCatalogEntry,
  getScenarioCatalogEntry,
} from '@/director/catalog';
import { SHORT_CODES, type TrueClass } from '@/sim/taxonomy';

interface ScenarioModalProps {
  onClose: () => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({ onClose }) => {
  const currentScenarioId = useSessionStore((s) => s.currentScenarioId);
  const loadScenarioById = useSessionStore((s) => s.loadScenarioById);
  const restartSession = useSessionStore((s) => s.restartSession);
  const formattedClock = useSessionStore((s) => s.ui.formattedClock);

  const [pendingScenario, setPendingScenario] = useState<ScenarioCatalogEntry | null>(null);
  const [isRestartConfirm, setIsRestartConfirm] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isEvalActive = engineInstance.mode === 'EVAL' && !engineInstance.sessionEnded;
  const isSessionActive = engineInstance.tickIndex > 0 && !engineInstance.sessionEnded;

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

  const handleSelectScenario = (entry: ScenarioCatalogEntry) => {
    setLoadError(null);
    if (isEvalActive) return;

    if (entry.id === currentScenarioId) {
      if (isSessionActive) {
        setPendingScenario(entry);
        setIsRestartConfirm(true);
      } else {
        void restartSession().then(() => onClose());
      }
      return;
    }

    if (isSessionActive) {
      setPendingScenario(entry);
      setIsRestartConfirm(false);
    } else {
      executeLoad(entry.id);
    }
  };

  const executeLoad = async (scenarioId: string) => {
    try {
      const success = await loadScenarioById(scenarioId);
      if (success) {
        onClose();
      } else {
        setLoadError(`Failed to load scenario "${scenarioId}". Verification failed.`);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingScenario(null);
      setIsRestartConfirm(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingScenario) return;
    if (isRestartConfirm) {
      await restartSession();
      onClose();
    } else {
      await executeLoad(pendingScenario.id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mission / Exercise Scenario Selector"
      className="fixed inset-0 z-50 bg-carbon-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none font-mono"
    >
      <div className="w-[860px] max-h-[88vh] bg-carbon-900 border border-line flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-[44px] px-4 border-b border-line bg-carbon-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-wider text-text-main">
              TACTICAL EXERCISE & SCENARIO CATALOG
            </span>
            <span className="text-[10px] text-text-dim border border-line px-1.5 py-0.5">
              SIH26247 SCENARIO DIRECTORY
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Scenario Selector"
            className="px-2 py-0.5 text-[11px] font-bold border border-line hover:border-threat hover:text-threat text-text-dim transition-colors"
          >
            ✕ ESC
          </button>
        </div>

        {/* Warning & EVAL Banners */}
        <div className="px-4 py-2 bg-carbon-950 border-b border-line flex flex-col gap-1.5 text-[11px] shrink-0">
          <div className="flex items-center gap-2 text-amber">
            <span className="font-bold">⚠ WARNING:</span>
            <span>
              Loading a scenario ends the active session. All pending events will be flushed to AAR before the new session begins.
            </span>
          </div>

          {isEvalActive && (
            <div className="flex items-center gap-2 text-threat bg-threat/10 border border-threat px-2 py-1 font-bold">
              <span>🔒 LOCKED IN EVALUATION MODE:</span>
              <span>Scenario switching is strictly prohibited mid-evaluation to preserve scoring integrity.</span>
            </div>
          )}

          {loadError && (
            <div className="text-threat bg-threat/10 border border-threat px-2 py-1 font-bold">
              ⚠ {loadError}
            </div>
          )}
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {SCENARIO_CATALOG.map((entry) => {
            const isActive = entry.id === currentScenarioId;

            return (
              <div
                key={entry.id}
                data-testid={`scenario-card-${entry.id}`}
                className={`p-3 border transition-colors flex flex-col gap-2 ${
                  isActive
                    ? 'border-phosphor bg-phosphorDim/10'
                    : 'border-line bg-carbon-850 hover:border-text-dim'
                }`}
              >
                {/* Title Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm text-text-main tracking-wide">
                      {entry.name}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-carbon-800 border border-line text-text-dim">
                      ID: {entry.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 border ${
                        entry.category === 'DEMO'
                          ? 'border-amber text-amber bg-amber/10'
                          : 'border-friend text-friend bg-friend/10'
                      }`}
                    >
                      {entry.category}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-display font-bold px-2 py-0.5 border border-phosphor bg-phosphor text-carbon-950">
                        ACTIVE SESSION
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    <button
                      disabled={isEvalActive}
                      onClick={() => handleSelectScenario(entry)}
                      className={`px-3 py-1 font-display font-bold text-[11px] border transition-colors ${
                        isEvalActive
                          ? 'opacity-40 cursor-not-allowed border-line text-text-dim bg-carbon-900'
                          : isActive
                            ? 'border-amber text-amber hover:bg-amber hover:text-carbon-950'
                            : 'border-phosphor text-phosphor hover:bg-phosphor hover:text-carbon-950'
                      }`}
                      title={
                        isEvalActive
                          ? 'Locked in EVAL mode'
                          : isActive
                            ? 'Restart current scenario session'
                            : `Load ${entry.name}`
                      }
                    >
                      {isActive ? '[R] RESTART SCENARIO' : '[LOAD SCENARIO]'}
                    </button>
                  </div>
                </div>

                {/* Training Objective */}
                <div className="text-[11px] text-text-main font-mono">
                  <span className="text-text-dim font-display font-semibold mr-1">OBJECTIVE:</span>
                  {entry.objective}
                </div>

                {/* Description */}
                <div className="text-[10px] text-text-dim font-mono">
                  {entry.description}
                </div>

                {/* Adaptive Disclaimer Note */}
                {entry.adaptiveNote && (
                  <div className="text-[10px] text-amber border-l-2 border-amber pl-2 bg-amber/5 py-0.5 font-mono">
                    <span className="font-bold">NOTE: </span>
                    {entry.adaptiveNote}
                  </div>
                )}

                {/* Target Classes & Tags Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-line/40 text-[10px] flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-text-dim text-[9px]">TARGET CLASSES:</span>
                    {entry.classes.map((cls) => (
                      <span
                        key={cls}
                        className={`px-1.5 py-0.5 border text-[9px] font-mono ${getClassBadgeClass(cls)}`}
                        title={cls}
                      >
                        {SHORT_CODES[cls]}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[9px] text-text-dim">
                    {entry.tags.map((t) => (
                      <span key={t} className="px-1 bg-carbon-800 border border-line">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="h-[40px] px-4 border-t border-line bg-carbon-800/70 flex items-center justify-between text-[11px] text-text-dim shrink-0">
          <div>
            CURRENT SCENARIO:{' '}
            <span className="text-phosphor font-bold font-mono">
              {getScenarioCatalogEntry(currentScenarioId)?.name ?? currentScenarioId}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 border border-line hover:border-text-main text-text-main font-bold"
          >
            CLOSE
          </button>
        </div>
      </div>

      {/* Explicit Session Replacement Confirmation Dialog */}
      {pendingScenario && (
        <div
          role="alertdialog"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-60 bg-carbon-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-[460px] bg-carbon-900 border-2 border-amber p-4 shadow-2xl flex flex-col gap-3 font-mono">
            <div className="flex items-center gap-2 text-amber font-display font-bold text-sm">
              <span>⚠</span>
              <span id="confirm-modal-title">
                {isRestartConfirm ? 'CONFIRM SCENARIO RESTART' : 'CONFIRM SCENARIO SWITCH'}
              </span>
            </div>

            <div className="text-[11px] text-text-main leading-relaxed">
              An active simulation session is currently running at{' '}
              <span className="text-phosphor font-bold">{formattedClock}</span>.
              <br />
              <br />
              {isRestartConfirm ? (
                <>
                  Restarting <span className="text-amber font-bold">{pendingScenario.name}</span> will finalize the active run and start a fresh session with the same scenario and seed.
                </>
              ) : (
                <>
                  Loading <span className="text-phosphor font-bold">{pendingScenario.name}</span> ({pendingScenario.id}) will abort the current active session. All events recorded up to this moment will be preserved in AAR.
                </>
              )}
            </div>

            <div className="text-[10px] text-text-dim bg-carbon-950 p-2 border border-line">
              Confirming will reset the mission clock to T+00:00.000 and spawn entities for the selected scenario.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => {
                  setPendingScenario(null);
                  setIsRestartConfirm(false);
                }}
                className="px-3 py-1 text-xs border border-line hover:border-text-main text-text-dim hover:text-text-main"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-3 py-1 text-xs font-bold border border-amber bg-amber text-carbon-950 hover:bg-amber/90"
              >
                {isRestartConfirm ? 'CONFIRM & RESTART' : 'CONFIRM & LOAD SCENARIO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

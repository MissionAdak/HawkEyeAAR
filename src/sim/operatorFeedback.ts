import type { EffectorId } from './types';
import { CONFIG } from '@/config';

export type FeedbackCategory =
  | 'RELEASE_BLOCKED'
  | 'RELEASE_ACCEPTED'
  | 'ROE_WARNING'
  | 'ENGAGEMENT_UNSUCCESSFUL'
  | 'NEUTRALIZATION_INDICATED'
  | 'SYSTEM_WARNING';

export type FeedbackSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface OperatorFeedback {
  id: string;
  timestampMs: number;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  title: string;
  explanation: string;
  trackNo?: string;
  effectorId?: EffectorId;
  reasonCode?: string;
  measured?: {
    actual: number | string;
    required: number | string;
    unit?: string;
  };
  recommendedAction?: string;
}

let feedbackCounter = 0;

/**
 * Creates typed operator feedback for weapon release blocks, soft ROE warnings, and engagement outcomes.
 * Strictly guarantees zero disclosure of secret ground truth (trueClass, droneType, seeded draws) during live play.
 */
function createOutOfEnvelopeFeedback(params: {
  id: string;
  timestampMs: number;
  trackNo?: string;
  effectorId?: EffectorId;
  reasonCode: string;
  effConfig?: { envelopeMinM?: number; envelopeMaxM?: number };
  effectorName: string;
  rangeM?: number;
}): OperatorFeedback {
  const { id, timestampMs, trackNo, effectorId, reasonCode, effConfig, effectorName, rangeM } = params;
  const minM = effConfig?.envelopeMinM ?? 0;
  const maxM = effConfig?.envelopeMaxM ?? 5000;
  const hasEstimatedRange = typeof rangeM === 'number';
  const isTooClose = hasEstimatedRange && rangeM < minM;
  let explanation = `Target is outside effective engagement envelope for ${effectorName} (${(minM / 1000).toFixed(2)} - ${(maxM / 1000).toFixed(2)} km).`;
  if (typeof rangeM === 'number') {
    const proximityDesc = isTooClose ? 'inside minimum arming range' : 'beyond maximum effective range';
    explanation = `Target estimated range (~${(rangeM / 1000).toFixed(2)} km) is ${proximityDesc} for ${effectorName} (${(minM / 1000).toFixed(2)} - ${(maxM / 1000).toFixed(2)} km).`;
  }

  return {
    id,
    timestampMs,
    category: 'RELEASE_BLOCKED',
    severity: 'ERROR',
    title: 'RELEASE BLOCKED — OUTSIDE EFFECTOR ENVELOPE',
    explanation,
    trackNo,
    effectorId,
    reasonCode,
    ...(hasEstimatedRange
      ? {
          measured: {
            actual: `~${(rangeM / 1000).toFixed(2)} km`,
            required: `${(minM / 1000).toFixed(2)} - ${(maxM / 1000).toFixed(2)} km`,
            unit: 'Range',
          },
        }
      : {}),
    recommendedAction: isTooClose
      ? 'Switch to close-in kinetic effector (GUN) or RF Soft-Kill.'
      : 'Wait for target to close into envelope or select long-range effector.',
  };
}

export function createOperatorFeedback(params: {
  category: FeedbackCategory;
  reasonCode: string;
  timestampMs: number;
  trackNo?: string;
  effectorId?: EffectorId;
  targetQ?: number;
  rangeM?: number;
  isJammingActive?: boolean;
}): OperatorFeedback {
  const { category, reasonCode, timestampMs, trackNo, effectorId, targetQ, rangeM } = params;
  const id = `fb_${timestampMs}_${++feedbackCounter}_${reasonCode}`;
  const effConfig = effectorId ? CONFIG.effectors[effectorId] : undefined;
  const effectorName = effConfig?.name ?? effectorId ?? 'WEAPON';

  switch (reasonCode) {
    case 'Q_MIN_VIOLATION': {
      const actualQ = targetQ ?? 0;
      const qMin = CONFIG.thresholds.qMin ?? 0.6;
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'ERROR',
        title: 'RELEASE BLOCKED — INSUFFICIENT TRACK QUALITY',
        explanation: `Track quality (Q=${(actualQ * 100).toFixed(0)}%) is below the minimum release threshold (Q >= ${(qMin * 100).toFixed(0)}%). Track must be stabilized before engagement.`,
        trackNo,
        effectorId,
        reasonCode,
        measured: {
          actual: `${(actualQ * 100).toFixed(0)}%`,
          required: `${(qMin * 100).toFixed(0)}%`,
          unit: 'Quality',
        },
        recommendedAction: 'Wait for radar/sensor track correlation or switch to EO/IR sensor to boost track quality.',
      };
    }

    case 'PNR_VIOLATION': {
      const rMin = CONFIG.thresholds.rMinM ?? 500;
      const hasEstimatedRange = typeof rangeM === 'number';
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'ERROR',
        title: 'RELEASE BLOCKED — RELEASE WINDOW CLOSED',
        explanation: hasEstimatedRange
          ? `Target estimated range (~${(rangeM / 1000).toFixed(2)} km) has breached the no-release boundary (${(rMin / 1000).toFixed(2)} km). Point of No Return exceeded.`
          : `Target has breached the no-release boundary (${(rMin / 1000).toFixed(2)} km). Point of No Return exceeded.`,
        trackNo,
        effectorId,
        reasonCode,
        ...(hasEstimatedRange
          ? {
              measured: {
                actual: `~${(rangeM / 1000).toFixed(2)} km`,
                required: `> ${(rMin / 1000).toFixed(2)} km`,
                unit: 'Range',
              },
            }
          : {}),
        recommendedAction: 'Engage secondary threats or initiate terminal alert protocols.',
      };
    }

    case 'INACTIVE_TARGET': {
      const hasEstimatedRange = typeof rangeM === 'number';
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'ERROR',
        title: 'RELEASE BLOCKED — CONTACT NO LONGER ACTIVE',
        explanation: hasEstimatedRange
          ? `Target ${trackNo ?? ''} at estimated range (~${(rangeM / 1000).toFixed(2)} km) is no longer active in the tactical tracking pipeline.`
          : `Target ${trackNo ?? ''} is no longer active in the tactical tracking pipeline.`,
        trackNo,
        effectorId,
        reasonCode,
        ...(hasEstimatedRange
          ? {
              measured: {
                actual: `~${(rangeM / 1000).toFixed(2)} km`,
                required: 'Active Track',
                unit: 'Range',
              },
            }
          : {}),
        recommendedAction: 'Select an active aerial contact from the radar scope or track table.',
      };
    }

    case 'OUT_OF_ENVELOPE':
      return createOutOfEnvelopeFeedback({
        id,
        timestampMs,
        trackNo,
        effectorId,
        reasonCode,
        effConfig,
        effectorName,
        rangeM,
      });

    case 'RF_JAMMING_ACTIVE': {
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'ERROR',
        title: 'RF SOFT-KILL UNAVAILABLE — RF CHANNEL JAMMED',
        explanation: 'Active electronic countermeasures or hostile jamming have degraded the RF control channel.',
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Deploy kinetic effector (GUN, INTERCEPTOR, or MISSILE) or wait for RF clearing.',
      };
    }

    case 'RF_SILENT_TARGET': {
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'ERROR',
        title: 'RF SOFT-KILL UNAVAILABLE — NO USABLE RF CUE',
        explanation: 'Target has no usable radio frequency control emission signature for protocol takeover.',
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Switch to directed-energy or kinetic effector (LASER or GUN).',
      };
    }

    case 'NO_TARGET_SELECTED': {
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'WARNING',
        title: 'ACTION REJECTED — NO TARGET DESIGNATED',
        explanation: 'An aerial track must be designated (CLICK / SPACE) before issuing weapon release.',
        effectorId,
        reasonCode,
        recommendedAction: 'Click a contact on the 3D tactical view or 2D radar to designate.',
      };
    }

    case 'DUPLICATE_PENDING_FIRE': {
      return {
        id,
        timestampMs,
        category: 'RELEASE_BLOCKED',
        severity: 'WARNING',
        title: 'ACTION REJECTED — ENGAGEMENT IN PROGRESS',
        explanation: `An active engagement is already pending resolution for track ${trackNo ?? ''}.`,
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Await simulated engagement result before releasing subsequent weapons.',
      };
    }

    case 'UNCLASSIFIED_RELEASE': {
      return {
        id,
        timestampMs,
        category: 'ROE_WARNING',
        severity: 'WARNING',
        title: 'RELEASE ACCEPTED — ROE WARNING',
        explanation: 'Target was engaged prior to classification. ROE violation penalty has been recorded.',
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Always classify aerial contacts [C] before weapons release.',
      };
    }

    case 'KINETIC_OVER_DENSE_ZONE': {
      return {
        id,
        timestampMs,
        category: 'ROE_WARNING',
        severity: 'WARNING',
        title: 'RELEASE ACCEPTED — COLLATERAL-RISK WARNING',
        explanation: 'Kinetic weapon released over dense urban infrastructure. Collateral debris risk recorded.',
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Prefer non-kinetic effectors (RF SOFT-KILL or LASER) over populated zones.',
      };
    }

    case 'ROE_WARNING':
    case 'ROE_CONFIRMATION_REQUIRED': {
      return {
        id,
        timestampMs,
        category: 'ROE_WARNING',
        severity: 'WARNING',
        title: 'ROE VERIFICATION REQUIRED — POTENTIAL AMBIGUITY',
        explanation: `Target ${trackNo ?? ''} engagement requires operator ROE confirmation. Verify classification and collateral risks.`,
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Verify target track assessment against ROE directives before confirming release.',
      };
    }

    case 'ENGAGEMENT_INEFFECTIVE':
    case 'ENGAGEMENT_UNSUCCESSFUL': {
      return {
        id,
        timestampMs,
        category: 'ENGAGEMENT_UNSUCCESSFUL',
        severity: 'WARNING',
        title: 'ENGAGEMENT UNSUCCESSFUL — TARGET NOT NEUTRALIZED',
        explanation: `${effectorName} release was accepted and resolved, but the target survived this engagement attempt.`,
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Assess target telemetry and prepare immediate follow-up engagement if in envelope.',
      };
    }

    case 'TARGET_NEUTRALISED':
    case 'NEUTRALIZATION_INDICATED': {
      return {
        id,
        timestampMs,
        category: 'NEUTRALIZATION_INDICATED',
        severity: 'SUCCESS',
        title: 'SIMULATED NEUTRALIZATION INDICATED — BDA REQUIRED',
        explanation: `Simulated kinetic/directed-energy defeat confirmed for track ${trackNo ?? ''}. Complete Battle Damage Assessment [ASSESS].`,
        trackNo,
        effectorId,
        reasonCode,
        recommendedAction: 'Press [K / ASSESS] to confirm kill and close out track.',
      };
    }

    default: {
      let severity: 'WARNING' | 'SUCCESS' | 'INFO' = 'INFO';
      if (category === 'ROE_WARNING') {
        severity = 'WARNING';
      } else if (category === 'NEUTRALIZATION_INDICATED') {
        severity = 'SUCCESS';
      }
      return {
        id,
        timestampMs,
        category,
        severity,
        title: `TACTICAL SYSTEM NOTICE — ${reasonCode}`,
        explanation: `System notification regarding ${trackNo ?? 'operation'}.`,
        trackNo,
        effectorId,
        reasonCode,
      };
    }
  }
}

/**
 * Checks whether duplicate feedback for the same track and reason should be throttled within a short time window.
 */
export function shouldThrottleFeedback(
  trackNo: string | undefined,
  reasonCode: string,
  timestampMs: number,
  recentList: OperatorFeedback[]
): boolean {
  const THROTTLE_WINDOW_MS = 1500;
  for (const fb of recentList) {
    if (
      fb.reasonCode === reasonCode &&
      fb.trackNo === trackNo &&
      timestampMs - fb.timestampMs < THROTTLE_WINDOW_MS
    ) {
      return true;
    }
  }
  return false;
}

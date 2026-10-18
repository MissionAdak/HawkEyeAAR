import { CONFIG } from '@/config';
import type {
  F2T2EAStep,
  TrackEntity,
  EffectorId,
  ZoneSpec,
} from './types';
import { isPointInPolygon } from './masking';

export interface TransitionContext {
  q: number;
  isDesignated: boolean;
  hasNonUnknownLabel: boolean;
  isNeutralised: boolean;
  isLeaked: boolean;
  assessResult?: 'KILL' | 'NO_KILL' | 'UNKNOWN';
}

export type RoeViolationReason =
  | 'UNCLASSIFIED_RELEASE'
  | 'KINETIC_OVER_DENSE_ZONE'
  | 'CIVILIAN_ENGAGED'
  | 'FRIENDLY_ENGAGED';

export interface ReleaseGatingResult {
  canFire: boolean;
  isHardBlocked: boolean;
  hardBlockReason?: string;
  roeGate: {
    qOk: boolean;
    classifiedOk: boolean;
    pnrOk: boolean;
    zoneOk: boolean;
  };
  violations: RoeViolationReason[];
  cer: number;
  isUnfavourableCer: boolean;
  isKineticOverDenseZone: boolean;
  overlappingZone?: ZoneSpec;
}

/**
 * Checks if a transition between two F2T2EA steps is valid under military doctrine rules.
 * Enforces transition guards (Rules.md DT-1, SC-10, ARCHITECTURE.md 3.3).
 */
export function canTransition(
  fromStep: F2T2EAStep,
  toStep: F2T2EAStep,
  context: TransitionContext
): boolean {
  const qMin = CONFIG.thresholds.qMin;

  // 1. Terminal / Closed state handling
  if (toStep === 'CLOSED') {
    return (
      context.isLeaked ||
      context.isNeutralised ||
      context.assessResult === 'KILL'
    );
  }

  // 2. Demotion Guard: If track quality drops below Q_min, tracked entities MUST return to FIX (Rules.md R-14, SC-10)
  if (context.q < qMin) {
    if (toStep === 'FIX') {
      return fromStep !== 'UNDETECTED' && fromStep !== 'CLOSED';
    }
    // Weapons release and advanced targeting are blocked when q < Q_min
    if (toStep === 'TARGET' || toStep === 'ENGAGE') {
      return false;
    }
  }

  // 3. Forward progression rules
  switch (fromStep) {
    case 'UNDETECTED':
      return toStep === 'FIND';

    case 'FIND':
      // Progresses to FIX once designated by trainee
      return toStep === 'FIX' && context.isDesignated;

    case 'FIX':
      // Progresses to TRACK once track quality is firm (q >= Q_min)
      if (toStep === 'TRACK') {
        return context.q >= qMin;
      }
      // Trainee may also directly classify while in FIX if q >= Q_min
      if (toStep === 'TARGET') {
        return context.q >= qMin && context.hasNonUnknownLabel;
      }
      return false;

    case 'TRACK':
      // Progresses to TARGET once trainee classifies target with a non-unknown label
      if (toStep === 'TARGET') {
        return context.hasNonUnknownLabel;
      }
      return false;

    case 'TARGET':
      // Can engage with chosen effector (soft violations don't block transition to ENGAGE)
      if (toStep === 'ENGAGE') {
        return context.q >= qMin;
      }
      return false;

    case 'ENGAGE':
      // Moves to ASSESS post-engagement
      return toStep === 'ASSESS';

    case 'ASSESS':
      // If assessed NO_KILL and alive, returns to TARGET for re-engagement
      if (toStep === 'TARGET') {
        return context.assessResult === 'NO_KILL' && !context.isNeutralised;
      }
      return false;

    case 'CLOSED':
      return false;

    default:
      return false;
  }
}

/**
 * Calculates distance from a point (px, py) to a line segment (x1, y1) -> (x2, y2).
 */
export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-9) {
    return Math.hypot(px - x1, py - y1);
  }

  // Project point onto segment: t in [0, 1]
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Checks if target position at fire lies inside a zone polygon expanded by effector debris radius (Rules.md SC-8).
 * I_overlap = 1 if inside polygon or distance to nearest polygon edge <= debrisRadiusM.
 */
export function isPointInsideZoneExpanded(
  px: number,
  py: number,
  zone: ZoneSpec,
  debrisRadiusM: number
): boolean {
  if (zone.polygon.length < 3) return false;

  // 1. Directly inside zone polygon
  if (isPointInPolygon(px, py, zone.polygon)) {
    return true;
  }

  // 2. If no debris radius, no expansion
  if (debrisRadiusM <= 0) {
    return false;
  }

  // 3. Check distance to each boundary edge
  for (let i = 0; i < zone.polygon.length; i++) {
    const p1 = zone.polygon[i];
    const p2 = zone.polygon[(i + 1) % zone.polygon.length];
    const dist = pointToSegmentDistance(px, py, p1[0], p1[1], p2[0], p2[1]);
    if (dist <= debrisRadiusM) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates weapon release gating against military Rules of Engagement (Rules.md SC-8, SC-9, SC-10).
 * Distinguishes Hard Blocks (physically impossible) from Soft Gates (violations).
 */
export function evaluateReleaseGating(params: {
  target: TrackEntity;
  effectorId: EffectorId;
  rangeM: number;
  zones: ZoneSpec[];
  isJammingActive?: boolean;
}): ReleaseGatingResult {
  const { target, effectorId, rangeM, zones, isJammingActive = false } = params;

  const eff = CONFIG.effectors[effectorId];
  const qMin = CONFIG.thresholds.qMin;
  const rMin = CONFIG.thresholds.rMinM;

  // ----------------------------------------------------
  // 1. HARD BLOCKS (Weapons release hard-blocked in engine & UI)
  // ----------------------------------------------------
  const qOk = target.q >= qMin;
  const pnrOk = rangeM > rMin && target.lifecycle === 'ACTIVE';
  const envelopeOk = eff ? rangeM >= eff.envelopeMinM && rangeM <= eff.envelopeMaxM : false;

  // RF soft-kill physical constraints
  let rfPhysicsOk = true;
  let rfBlockReason: string | undefined;
  if (effectorId === 'RF_SOFTKILL') {
    if (isJammingActive) {
      rfPhysicsOk = false;
      rfBlockReason = 'RF_JAMMING_ACTIVE';
    } else if (!target.emitsRf) {
      rfPhysicsOk = false;
      rfBlockReason = 'RF_SILENT_TARGET';
    }
  }

  let isHardBlocked = false;
  let hardBlockReason: string | undefined;

  if (!qOk) {
    isHardBlocked = true;
    hardBlockReason = 'Q_MIN_VIOLATION';
  } else if (!pnrOk) {
    isHardBlocked = true;
    hardBlockReason = 'PNR_OR_INACTIVE';
  } else if (!envelopeOk) {
    isHardBlocked = true;
    hardBlockReason = 'OUT_OF_ENVELOPE';
  } else if (!rfPhysicsOk) {
    isHardBlocked = true;
    hardBlockReason = rfBlockReason;
  }

  // ----------------------------------------------------
  // 2. SOFT GATES (Permitted to fire, but triggers ROE Violations & scoring penalties)
  // ----------------------------------------------------
  const violations: RoeViolationReason[] = [];

  // Soft Gate 1: Unclassified release (Rules.md SC-9, SC-10)
  const classifiedOk = target.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT';
  if (!classifiedOk) {
    violations.push('UNCLASSIFIED_RELEASE');
  }

  // Soft Gate 2: Kinetic effector over dense urban zone (Rules.md SC-8)
  let isKineticOverDenseZone = false;
  let zoneOk = true;
  let overlappingZone: ZoneSpec | undefined;

  const isKinetic = eff ? eff.we >= 0.3 : false;
  if (isKinetic) {
    for (const zone of zones) {
      if (zone.rho > 0.5) {
        const overlap = isPointInsideZoneExpanded(
          target.pos.x,
          target.pos.y,
          zone,
          eff?.debrisRadiusM ?? 0
        );
        if (overlap) {
          isKineticOverDenseZone = true;
          zoneOk = false;
          overlappingZone = zone;
          violations.push('KINETIC_OVER_DENSE_ZONE');
          break;
        }
      }
    }
  }

  // Soft Gate 3: Civil or Friendly targets (Rules.md SC-8, SC-3)
  if (target.trueClass === 'CIVIL_UAS') {
    violations.push('CIVILIAN_ENGAGED');
  } else if (target.trueClass === 'FRIENDLY') {
    violations.push('FRIENDLY_ENGAGED');
  }

  // ----------------------------------------------------
  // 3. Live CER & Unfavourable Calculation
  // ----------------------------------------------------
  const threatValue = target.valueInr ?? (CONFIG.droneClasses.RECON_QUAD.valueInr ?? 40000);
  const costInr = eff?.costInr ?? 0;
  const cer = threatValue > 0 ? Number((costInr / threatValue).toFixed(3)) : 999;
  const isUnfavourableCer = cer > CONFIG.thresholds.cerUnfavourableThreshold;

  return {
    canFire: !isHardBlocked,
    isHardBlocked,
    hardBlockReason,
    roeGate: {
      qOk,
      classifiedOk,
      pnrOk,
      zoneOk,
    },
    violations,
    cer,
    isUnfavourableCer,
    isKineticOverDenseZone,
    overlappingZone,
  };
}

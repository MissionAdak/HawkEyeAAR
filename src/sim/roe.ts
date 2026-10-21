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
function canProgressForward(
  fromStep: F2T2EAStep,
  toStep: F2T2EAStep,
  context: TransitionContext,
  qMin: number
): boolean {
  switch (fromStep) {
    case 'UNDETECTED':
      return toStep === 'FIND';
    case 'FIND':
      return toStep === 'FIX' && context.isDesignated;
    case 'FIX':
      if (toStep === 'TRACK') return context.q >= qMin;
      if (toStep === 'TARGET') return context.q >= qMin && context.hasNonUnknownLabel;
      return false;
    case 'TRACK':
      return toStep === 'TARGET' && context.hasNonUnknownLabel;
    case 'TARGET':
      return toStep === 'ENGAGE' && context.q >= qMin;
    case 'ENGAGE':
      return toStep === 'ASSESS';
    case 'ASSESS':
      if (toStep === 'TARGET') return context.assessResult === 'NO_KILL' && !context.isNeutralised;
      return false;
    case 'CLOSED':
    default:
      return false;
  }
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
    return context.isLeaked || context.isNeutralised || context.assessResult === 'KILL';
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
  return canProgressForward(fromStep, toStep, context, qMin);
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

function checkHardBlocks(
  target: TrackEntity,
  eff: (typeof CONFIG.effectors)[EffectorId] | undefined,
  effectorId: EffectorId,
  rangeM: number,
  isJammingActive: boolean,
  qMin: number,
  rMin: number
): { isHardBlocked: boolean; hardBlockReason?: string } {
  if (target.q < qMin) {
    return { isHardBlocked: true, hardBlockReason: 'Q_MIN_VIOLATION' };
  }
  if (rangeM <= rMin || target.lifecycle !== 'ACTIVE') {
    return { isHardBlocked: true, hardBlockReason: 'PNR_OR_INACTIVE' };
  }
  if (!eff || rangeM < eff.envelopeMinM || rangeM > eff.envelopeMaxM) {
    return { isHardBlocked: true, hardBlockReason: 'OUT_OF_ENVELOPE' };
  }
  if (effectorId === 'RF_SOFTKILL') {
    if (isJammingActive) {
      return { isHardBlocked: true, hardBlockReason: 'RF_JAMMING_ACTIVE' };
    }
    if (!target.emitsRf) {
      return { isHardBlocked: true, hardBlockReason: 'RF_SILENT_TARGET' };
    }
  }
  return { isHardBlocked: false };
}

function findOverlappingDenseZone(
  targetPos: { x: number; y: number },
  zones: ZoneSpec[],
  debrisRadiusM: number
): ZoneSpec | undefined {
  for (const zone of zones) {
    if (zone.rho > 0.5) {
      const overlap = isPointInsideZoneExpanded(targetPos.x, targetPos.y, zone, debrisRadiusM);
      if (overlap) return zone;
    }
  }
  return undefined;
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

  // 1. HARD BLOCKS
  const qOk = target.q >= qMin;
  const pnrOk = rangeM > rMin && target.lifecycle === 'ACTIVE';
  const { isHardBlocked, hardBlockReason } = checkHardBlocks(
    target,
    eff,
    effectorId,
    rangeM,
    isJammingActive,
    qMin,
    rMin
  );

  // 2. SOFT GATES
  const violations: RoeViolationReason[] = [];

  // Soft Gate 1: Unclassified release
  const classifiedOk = target.traineeLabel !== null && target.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT';
  if (!classifiedOk) {
    violations.push('UNCLASSIFIED_RELEASE');
  }

  // Soft Gate 2: Kinetic effector over dense urban zone
  let isKineticOverDenseZone = false;
  let zoneOk = true;
  let overlappingZone: ZoneSpec | undefined;

  const isKinetic = eff ? eff.we >= 0.3 : false;
  if (isKinetic) {
    overlappingZone = findOverlappingDenseZone(target.pos, zones, eff?.debrisRadiusM ?? 0);
    if (overlappingZone) {
      isKineticOverDenseZone = true;
      zoneOk = false;
      violations.push('KINETIC_OVER_DENSE_ZONE');
    }
  }

  // Soft Gate 3: Civil or Friendly targets
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

import { CONFIG } from '@/config';
import type { SimEvent, ScenarioSpec, TrackEntity, EffectorId, TrueClass } from '@/sim/types';
import { computeOracleEffector, computeCostRegret } from '@/sim/oracle';

export type DecisionLuckCategory = 'LUCKY_HIT' | 'UNLUCKY_MISS' | 'AS_EXPECTED';

export interface DecisionLuckEvaluation {
  category: DecisionLuckCategory;
  title: string;
  badgeClass: string;
  description: string;
  comparisonText: string;
}

export interface AarEngagementInspectionData {
  seq: number;
  tMs: number;
  trackNo: string;
  entityId?: string;
  effector: EffectorId;
  effectorName: string;
  rangeM: number;
  killed: boolean;
  pk: number;
  u: number;
  pk0?: number;
  g?: number;
  h?: number;
  costInr: number;
  targetValueInr?: number | null;
  cer?: number;
  isUnfavourableCer?: boolean;
  roeGate?: {
    classifiedOk: boolean;
    zoneOk: boolean;
  };
  zoneId?: string;
  rhoZone?: number;
  isKineticOverDenseZone?: boolean;
  trueClass?: TrueClass;
  oracleEffector?: EffectorId | 'HOLD_FIRE';
  costRegretText?: string;
  isOptimalChoice?: boolean;
  decisionLuck: DecisionLuckEvaluation;
  targetPos?: { x: number; y: number; z: number };
}

/**
 * Evaluates decision versus luck interpretation according to declared design thresholds.
 * Strictly labelled as a teaching heuristic — does not judge operational readiness.
 *
 * Thresholds:
 * - HIT with Pk < 0.4  => LUCKY HIT (favourable RNG on marginal probability)
 * - MISS with Pk >= 0.7 => UNLUCKY MISS (unfavourable RNG on high-probability release)
 * - Otherwise           => AS EXPECTED (outcome directly aligns with modelled probability)
 */
export function evaluateDecisionLuck(
  killed: boolean,
  pk: number,
  u: number
): DecisionLuckEvaluation {
  const comparisonText = `u = ${u.toFixed(4)} ${killed ? '≤' : '>'} Pk ${pk.toFixed(4)} → ${killed ? 'HIT' : 'MISS'}`;

  if (killed && pk < 0.4) {
    return {
      category: 'LUCKY_HIT',
      title: 'LUCKY HIT',
      badgeClass: 'text-amber border-amber bg-amber/20',
      description: 'Teaching Heuristic: Favourable random draw succeeded despite low modelled probability (< 0.40). Release was doctrinally marginal.',
      comparisonText,
    };
  }

  if (!killed && pk >= 0.7) {
    return {
      category: 'UNLUCKY_MISS',
      title: 'UNLUCKY MISS',
      badgeClass: 'text-threat border-threat bg-threat/20',
      description: 'Teaching Heuristic: Unfavourable random draw resulted in a miss despite high modelled probability (≥ 0.70). Release timing and envelope were optimal.',
      comparisonText,
    };
  }

  return {
    category: 'AS_EXPECTED',
    title: 'AS EXPECTED',
    badgeClass: 'text-phosphor border-phosphor bg-phosphor/20',
    description: 'Teaching Heuristic: Engagement outcome statistically aligns with the modelled Probability of Kill (Pk).',
    comparisonText,
  };
}

/**
 * Extracts and structures all recorded engagement event inputs and probability data.
 * Purely reads recorded event values — never recomputes or backfills recorded Pk.
 */
export function extractEngagementInspectionData(
  event: SimEvent,
  events: SimEvent[] = [],
  spec?: ScenarioSpec,
  entities?: TrackEntity[]
): AarEngagementInspectionData | null {
  // If an ENGAGE_RESULT event was passed, resolve the corresponding ENGAGE event
  let engageEv = event;
  if (event.type === 'ENGAGE_RESULT') {
    const matching = [...events]
      .reverse()
      .find(
        (e) =>
          e.type === 'ENGAGE' &&
          e.trackNo === event.trackNo &&
          e.tMs <= event.tMs
      );
    if (matching) {
      engageEv = matching;
    }
  }

  if (engageEv.type !== 'ENGAGE') {
    return null;
  }

  const payload = engageEv.payload as {
    effector?: EffectorId;
    rangeM?: number;
    pk?: number;
    u?: number;
    killed?: boolean;
    pk0?: number;
    g?: number;
    h?: number;
    costInr?: number;
    cer?: number;
    roeGate?: { classifiedOk: boolean; zoneOk: boolean };
    zoneId?: string;
    rhoZone?: number;
    targetPos?: { x: number; y: number; z: number };
  };

  const effectorId: EffectorId = payload.effector ?? 'RF_SOFTKILL';
  const effConfig = CONFIG.effectors[effectorId];
  const effectorName = effConfig?.name ?? effectorId;
  const costInr = payload.costInr ?? effConfig?.costInr ?? 0;
  const rangeM = payload.rangeM ?? 0;
  const pk = payload.pk ?? 0;
  const u = payload.u ?? 0;
  const killed = payload.killed ?? false;

  // Resolve matching entity / ground truth safely in post-session AAR
  const matchingEntity = entities?.find(
    (e) => e.trackNo === engageEv.trackNo || e.id === engageEv.entityId
  );
  const matchingSpawn = spec?.threats
    ?.concat(spec.decoys ?? [])
    ?.find((t) => t.id === engageEv.entityId);

  const trueClass = matchingEntity?.trueClass ?? matchingSpawn?.trueClass;
  const droneType = matchingEntity?.droneType ?? matchingSpawn?.droneType;
  const targetValueInr = matchingEntity?.valueInr ?? matchingSpawn?.valueInr ?? null;
  const emitsRf = matchingEntity?.emitsRf ?? matchingSpawn?.emitsRf ?? true;

  // CER evaluation
  const cer = payload.cer ?? (targetValueInr ? costInr / targetValueInr : undefined);
  const isUnfavourableCer = cer !== undefined ? cer > 10 : false;

  // Kinetic over dense zone check (Rules.md R3.3)
  const isKinetic = effConfig?.tier === 'T2_KINETIC' || effConfig?.tier === 'T3_HEAVY';
  const isKineticOverDenseZone = isKinetic && (payload.rhoZone ?? 0) >= 0.5;

  // Oracle decision & regret comparison
  let oracleEffector: EffectorId | 'HOLD_FIRE' | undefined;
  let costRegretText: string | undefined;
  let isOptimalChoice: boolean | undefined;

  if (trueClass && droneType !== undefined) {
    const oracleResult = computeOracleEffector({
      rangeM,
      trueClass,
      emitsRf,
      droneType,
    });
    oracleEffector = oracleResult.oracleEffector;
    const regret = computeCostRegret(effectorId, oracleEffector);
    costRegretText = regret.text;
    isOptimalChoice = regret.isOptimal;
  }

  const decisionLuck = evaluateDecisionLuck(killed, pk, u);

  return {
    seq: engageEv.seq,
    tMs: engageEv.tMs,
    trackNo: engageEv.trackNo ?? 'UNKNOWN',
    entityId: engageEv.entityId,
    effector: effectorId,
    effectorName,
    rangeM,
    killed,
    pk,
    u,
    pk0: payload.pk0,
    g: payload.g,
    h: payload.h,
    costInr,
    targetValueInr,
    cer,
    isUnfavourableCer,
    roeGate: payload.roeGate,
    zoneId: payload.zoneId,
    rhoZone: payload.rhoZone,
    isKineticOverDenseZone,
    trueClass,
    oracleEffector,
    costRegretText,
    isOptimalChoice,
    decisionLuck,
    targetPos: payload.targetPos ?? matchingEntity?.pos,
  };
}

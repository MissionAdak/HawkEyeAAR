import type { ScenarioSpec, ThreatSpawn, ChaosSpec, Vec3 } from '@/sim/types';
import { CONFIG } from '@/config';
import { evaluateMasking } from '@/sim/masking';
import { calculateRadarPd } from '@/sim/sensors';
import { isPointInsideZoneExpanded } from '@/sim/roe';
import { HOSTILE, type TrackClass } from '@/sim/taxonomy';

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

/**
 * Computes position of a threat at sim time tMs by linearly interpolating along its waypoints.
 */
export function getThreatPositionAt(threat: ThreatSpawn, tMs: number): Vec3 {
  if (tMs <= threat.spawnTMs || threat.waypoints.length === 0) {
    return threat.waypoints[0] ?? { x: 0, y: 0, z: 0 };
  }
  if (threat.waypoints.length === 1) {
    return threat.waypoints[0];
  }

  const dtSec = (tMs - threat.spawnTMs) / 1000;
  let distRemaining = threat.speedMps * dtSec;

  for (let i = 0; i < threat.waypoints.length - 1; i++) {
    const w1 = threat.waypoints[i];
    const w2 = threat.waypoints[i + 1];
    const dx = w2.x - w1.x;
    const dy = w2.y - w1.y;
    const dz = (w2.z ?? 0) - (w1.z ?? 0);
    const segDist = Math.hypot(dx, dy, dz);

    if (segDist <= 0) continue;

    if (distRemaining <= segDist) {
      const frac = distRemaining / segDist;
      return {
        x: w1.x + dx * frac,
        y: w1.y + dy * frac,
        z: (w1.z ?? 0) + dz * frac,
      };
    }
    distRemaining -= segDist;
  }

  return threat.waypoints[threat.waypoints.length - 1];
}

/**
 * Checks if a specific chaos type is active at time tMs.
 */
function isChaosActive(chaosList: ChaosSpec[], tMs: number, type: ChaosSpec['type']): boolean {
  return chaosList.some((c) => c.type === type && tMs >= c.tStartMs && tMs < c.tEndMs);
}

/**
 * Validates that chaos events do not overlap concurrently (Rules.md AC-4).
 */
function validateChaosSchedule(chaosList: ChaosSpec[]): string | null {
  const sortedChaos = [...chaosList].sort((a, b) => a.tStartMs - b.tStartMs);
  for (let i = 0; i < sortedChaos.length - 1; i++) {
    const c1 = sortedChaos[i];
    const c2 = sortedChaos[i + 1];
    if (c2.tStartMs < c1.tEndMs) {
      return `Chaos schedule violation: concurrent events ${c1.type} and ${c2.type} overlap`;
    }
  }
  return null;
}

/**
 * Computes environment radar attenuation factor based on active chaos.
 */
function getRadarAttenuation(chaosList: ChaosSpec[], tMs: number): number {
  if (isChaosActive(chaosList, tMs, 'RADAR_DROPOUT')) {
    return 0.0;
  }
  if (isChaosActive(chaosList, tMs, 'RAIN')) {
    return 0.7;
  }
  return 1.0;
}

/**
 * Computes PNR timestamp for a threat entering the asset perimeter.
 */
function findThreatPnrMs(hostile: ThreatSpawn, durationMs: number, rMinM: number): number {
  for (let t = hostile.spawnTMs; t <= durationMs; t += 50) {
    const pos = getThreatPositionAt(hostile, t);
    const rangeM = Math.hypot(pos.x, pos.y);
    if (rangeM <= rMinM) {
      return t;
    }
  }
  return durationMs;
}

/**
 * Determines t_trk via 2-of-3 radar sweep hits.
 */
function findThreatTrackInitMs(
  hostile: ThreatSpawn,
  tPnr: number,
  spec: ScenarioSpec,
  sweepPeriodMs: number
): number | null {
  const sweepHits: boolean[] = [];
  const startSweep = Math.ceil(hostile.spawnTMs / sweepPeriodMs);
  const endSweep = Math.floor(tPnr / sweepPeriodMs);

  for (let sw = startSweep; sw <= endSweep; sw++) {
    const sweepTMs = sw * sweepPeriodMs;
    const pos = getThreatPositionAt(hostile, sweepTMs);
    const rangeM = Math.hypot(pos.x, pos.y);
    const masked = evaluateMasking(pos, spec.zones).isMasked;
    const aEnv = getRadarAttenuation(spec.chaos, sweepTMs);

    const { pd } = calculateRadarPd(hostile.rcsM2, rangeM, masked ? 0 : aEnv);
    sweepHits.push(pd >= 0.5);

    if (sweepHits.length >= 2) {
      const last3 = sweepHits.slice(-3);
      const hitsIn3 = last3.filter(Boolean).length;
      if (hitsIn3 >= 2) {
        return sweepTMs;
      }
    }
  }

  return null;
}

/**
 * Calculates fused track quality q(t) at a specific tick across Radar, EO/IR, and RF modalities.
 */
function computeTickTrackQuality(
  hostile: ThreatSpawn,
  t: number,
  spec: ScenarioSpec,
  nightFactor: number
): number {
  const pos = getThreatPositionAt(hostile, t);
  const rangeM = Math.hypot(pos.x, pos.y);
  const masked = evaluateMasking(pos, spec.zones).isMasked;

  // Radar
  const aEnv = getRadarAttenuation(spec.chaos, t);
  const { pd } = calculateRadarPd(hostile.rcsM2, rangeM, masked ? 0 : aEnv);
  const qRadar = pd >= 0.5 && !masked && aEnv > 0 ? 0.8 : 0;

  // EO/IR
  const fogFactor = isChaosActive(spec.chaos, t, 'FOG') ? 0.4 : 1.0;
  const eoMaxRange = 2500 * fogFactor * nightFactor;
  const qEo = rangeM <= eoMaxRange && !masked ? 0.7 : 0;

  // RF
  const isJamming = isChaosActive(spec.chaos, t, 'JAMMING');
  const qRf = hostile.emitsRf && rangeM <= 4000 && !isJamming ? 0.4 : 0;

  return 1 - (1 - qRadar) * (1 - qEo) * (1 - qRf);
}

/**
 * Determines baseline Pk for effector against threat.
 */
function getEffectorBaselinePk(effector: typeof CONFIG.effectors[string], hostile: ThreatSpawn): number {
  if (hostile.droneType === 'SWARM_ELEMENT' && effector.pk0Swarm !== undefined) {
    return effector.pk0Swarm;
  }
  if (!hostile.emitsRf) {
    return effector.pk0RfSilent;
  }
  return effector.pk0;
}

/**
 * Checks if effector is envelope and ROE admissible at tick t (incorporating debris-expanded zones).
 */
function isEffectorAdmissibleAtTick(
  effector: typeof CONFIG.effectors[string],
  hostile: ThreatSpawn,
  t: number,
  spec: ScenarioSpec
): boolean {
  const pos = getThreatPositionAt(hostile, t);
  const rangeM = Math.hypot(pos.x, pos.y);

  if (rangeM < effector.envelopeMinM || rangeM > effector.envelopeMaxM) {
    return false;
  }
  if (effector.id === 'RF_SOFTKILL' && (isChaosActive(spec.chaos, t, 'JAMMING') || !hostile.emitsRf)) {
    return false;
  }
  if (effector.we >= 0.3) {
    const debrisM = effector.debrisRadiusM ?? 0;
    const overDense = spec.zones.some(
      (z) => z.rho > 0.5 && isPointInsideZoneExpanded(pos.x, pos.y, z, debrisM)
    );
    if (overDense) {
      return false;
    }
  }
  return true;
}

/**
 * Computes contiguous sensing window W and joint feasibility window (q >= 0.6 AND E != empty).
 */
function calculateFeasibilityWindows(
  hostile: ThreatSpawn,
  tTrk: number,
  tPnr: number,
  spec: ScenarioSpec,
  qMin: number
): {
  sensingWindowMs: number;
  jointWindowMs: number;
  hasAdmissibleEffector: boolean;
} {
  let maxSensingTicks = 0;
  let curSensingTicks = 0;
  let maxJointTicks = 0;
  let curJointTicks = 0;
  let hasAdmissible = false;
  const nightFactor = spec.dayNight === 'NIGHT' ? 0.7 : 1.0;

  for (let t = tTrk; t < tPnr; t += 50) {
    const q = computeTickTrackQuality(hostile, t, spec, nightFactor);
    const qOk = q >= qMin;

    if (qOk) {
      curSensingTicks++;
      maxSensingTicks = Math.max(maxSensingTicks, curSensingTicks);
    } else {
      curSensingTicks = 0;
    }

    const admissibleEffectorExists = Object.values(CONFIG.effectors).some((effector) => {
      let pk = getEffectorBaselinePk(effector, hostile);
      if (effector.id === 'LASER' && isChaosActive(spec.chaos, t, 'FOG')) {
        pk *= (CONFIG.chaos.FOG.laserPkMultiplier ?? 0.5);
      }
      if (effector.id === 'RF_SOFTKILL' && isChaosActive(spec.chaos, t, 'JAMMING')) {
        pk = 0;
      }
      if (pk < 0.6) return false;
      return isEffectorAdmissibleAtTick(effector, hostile, t, spec);
    });

    if (admissibleEffectorExists) {
      hasAdmissible = true;
    }

    if (qOk && admissibleEffectorExists) {
      curJointTicks++;
      maxJointTicks = Math.max(maxJointTicks, curJointTicks);
    } else {
      curJointTicks = 0;
    }
  }

  return {
    sensingWindowMs: maxSensingTicks * 50,
    jointWindowMs: maxJointTicks * 50,
    hasAdmissibleEffector: hasAdmissible,
  };
}

export interface HostileValidationInfo {
  tTrk: number;
  tPnr: number;
  error?: string;
}

/**
 * Validates a single hostile threat against all fairness criteria (ARCHITECTURE.md 6.1).
 */
function validateHostileThreat(
  hostile: ThreatSpawn,
  spec: ScenarioSpec,
  rMinM: number,
  qMin: number,
  sweepPeriodMs: number
): HostileValidationInfo {
  if (!hostile.waypoints || hostile.waypoints.length === 0) {
    return { tTrk: 0, tPnr: 0, error: `Hostile ${hostile.id} has no waypoints` };
  }

  const tPnr = findThreatPnrMs(hostile, spec.durationMs, rMinM);
  const tTrk = findThreatTrackInitMs(hostile, tPnr, spec, sweepPeriodMs);

  if (tTrk === null) {
    return { tTrk: 0, tPnr, error: `Hostile ${hostile.id} failed track initiation before PNR` };
  }

  // (a) Budget check: t_PNR - t_trk >= 6000ms
  const tBudgetMs = tPnr - tTrk;
  if (tBudgetMs < 6000) {
    return {
      tTrk,
      tPnr,
      error: `Hostile ${hostile.id} time budget ${tBudgetMs}ms < 6000ms (tTrk=${tTrk}, tPnr=${tPnr})`,
    };
  }

  // (e) PNR inside session with 1s margin: t_PNR <= durationMs - 1000ms
  if (tPnr > spec.durationMs - 1000) {
    return {
      tTrk,
      tPnr,
      error: `Hostile ${hostile.id} PNR ${tPnr}ms > duration ${spec.durationMs}ms - 1000ms`,
    };
  }

  const { sensingWindowMs, jointWindowMs, hasAdmissibleEffector } = calculateFeasibilityWindows(
    hostile,
    tTrk,
    tPnr,
    spec,
    qMin
  );

  // (b) Effector admissibility: at least one admissible effector in [t_trk, t_PNR)
  if (!hasAdmissibleEffector) {
    return {
      tTrk,
      tPnr,
      error: `Hostile ${hostile.id} has no admissible effector in tracking window`,
    };
  }

  // (c) Continuous sensing window W >= 6000ms
  if (sensingWindowMs < 6000) {
    return {
      tTrk,
      tPnr,
      error: `Hostile ${hostile.id} sensing window W=${sensingWindowMs}ms < 6000ms`,
    };
  }

  // (d) Joint feasibility window: contiguous run of length >= 6000ms where both q >= 0.6 AND E != empty
  if (jointWindowMs < 6000) {
    return {
      tTrk,
      tPnr,
      error: `Hostile ${hostile.id} joint feasibility window ${jointWindowMs}ms < 6000ms`,
    };
  }

  return { tTrk, tPnr };
}

/**
 * Fairness Validator enforcing all criteria from ARCHITECTURE.md 6.1.
 */
export function validateDetailed(spec: ScenarioSpec): ValidationResult {
  const reasons: string[] = [];
  const rMinM = spec.asset?.rMinM || CONFIG.thresholds.rMinM;
  const qMin = CONFIG.thresholds.qMin;
  const sweepPeriodMs = CONFIG.thresholds.radarSweepPeriodMs || 2000;

  const chaosError = validateChaosSchedule(spec.chaos);
  if (chaosError) {
    reasons.push(chaosError);
    return { valid: false, reasons };
  }

  const hostiles = spec.threats.filter(
    (th) => th.trueClass === 'HOSTILE_ATTACK' || th.trueClass === 'HOSTILE_ISR' || th.trueClass === 'SWARM_ELEMENT'
  );

  const hostileTrkList: number[] = [];
  const hostilePnrList: number[] = [];

  for (const hostile of hostiles) {
    const res = validateHostileThreat(hostile, spec, rMinM, qMin, sweepPeriodMs);
    if (res.error) {
      reasons.push(res.error);
      return { valid: false, reasons };
    }
    hostileTrkList.push(res.tTrk);
    hostilePnrList.push(res.tPnr);
  }

  // (f) Scenario-level load check: Sigma = 4s * H + 2s * K <= 0.8 * (max_h t_PNR,h - min_h t_trk,h)
  if (hostiles.length > 0) {
    const H = hostiles.length;
    const decoyCount = (spec.decoys?.length ?? 0) + spec.threats.filter((th) => !HOSTILE.has(th.trueClass as TrackClass)).length;
    const requiredHandlingSec = 4 * H + 2 * decoyCount;
    const minTrk = Math.min(...hostileTrkList);
    const maxPnr = Math.max(...hostilePnrList);
    const spanSec = (maxPnr - minTrk) / 1000;

    if (spanSec > 0 && requiredHandlingSec > 0.8 * spanSec) {
      reasons.push(
        `Scenario load check failed: required handling time ${requiredHandlingSec}s > 0.8 * timeline span ${spanSec.toFixed(1)}s`
      );
      return { valid: false, reasons };
    }
  }

  return { valid: true, reasons: [] };
}

/**
 * Validates a ScenarioSpec against all fairness criteria.
 * Returns true if valid, false otherwise.
 */
export function validate(spec: ScenarioSpec): boolean {
  return validateDetailed(spec).valid;
}

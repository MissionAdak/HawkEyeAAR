import { CONFIG } from '@/config';
import type {
  SimEvent,
  ScenarioSpec,
  AARMetrics,
  Grade,
  TrackClass,
  TrueClass,
  EffectorId,
  SensorMode,
} from './types';
import { CLASSES, TRUE_CLASSES, isHostile } from './taxonomy';
import {
  computeDScore,
  computeCScore,
  computeEconScore,
  computeTimeScore,
  computeGScore,
  computeRScore,
  computeTrackScore,
  computeSessionScore,
  getGrade,
  clamp,
} from './scoring';

interface TrackAggregate {
  id: string;
  trackNo: string | null;
  trueClass: TrueClass;
  droneType: string;
  valueInr: number | null;
  traineeLabel: TrackClass | null;
  tVis: number | null;
  tTrk: number | null;
  tDesig: number | null;
  tCls: number | null;
  tEng: number | null;
  tPnr: number | null;
  engaged: boolean;
  neutralised: boolean;
  leaked: boolean;
  weaponUsed: EffectorId | null;
  rangeAtEngageM: number | null;
  isKineticOverDenseZone: boolean;
  unclassifiedFired: boolean;
}

/**
 * Pure function to aggregate complete AARMetrics from the recorded SimEvent stream (Rules.md DT-8, TASK-P3-03).
 */
interface SessionMetadata {
  sessionMode: 'TRAIN' | 'EVAL' | 'DEMO';
  scenarioId: string;
  aidTicks: number;
  trainingAidDurationSec: number;
  trainingAidUsed: boolean;
}

function extractSessionMetadata(
  events: SimEvent[],
  scenarioSpec?: ScenarioSpec,
  trainingAidTicks?: number
): SessionMetadata {
  let sessionMode: 'TRAIN' | 'EVAL' | 'DEMO' = scenarioSpec?.mode ?? 'TRAIN';
  let scenarioId = scenarioSpec?.id ?? 'sim';
  const startEv = events.find((e) => e.type === 'SIM_START');
  const endEv = events.find((e) => e.type === 'SESSION_END');
  const payloadTicks = typeof endEv?.payload?.trainingAidTicks === 'number' ? (endEv.payload.trainingAidTicks as number) : 0;
  const aidTicks = typeof trainingAidTicks === 'number' ? trainingAidTicks : payloadTicks;
  const trainingAidDurationSec = Number((aidTicks * 0.05).toFixed(1));
  const trainingAidUsed = aidTicks > 0;
  if (startEv?.payload) {
    if (typeof startEv.payload.mode === 'string') {
      sessionMode = startEv.payload.mode as 'TRAIN' | 'EVAL' | 'DEMO';
    }
    if (typeof startEv.payload.scenarioId === 'string') {
      scenarioId = startEv.payload.scenarioId;
    }
  }
  return { sessionMode, scenarioId, aidTicks, trainingAidDurationSec, trainingAidUsed };
}

function getOrCreateTrack(tracksMap: Map<string, TrackAggregate>, trackNo?: string, entityId?: string): TrackAggregate {
  const key = trackNo ?? entityId ?? 'unknown';
  let track = tracksMap.get(key);
  if (!track) {
    track = {
      id: entityId ?? key,
      trackNo: trackNo ?? null,
      trueClass: 'HOSTILE_ATTACK',
      droneType: 'FPV_ATTACK',
      valueInr: 100000,
      traineeLabel: null,
      tVis: null,
      tTrk: null,
      tDesig: null,
      tCls: null,
      tEng: null,
      tPnr: null,
      engaged: false,
      neutralised: false,
      leaked: false,
      weaponUsed: null,
      rangeAtEngageM: null,
      isKineticOverDenseZone: false,
      unclassifiedFired: false,
    };
    tracksMap.set(key, track);
  }
  return track;
}

interface EventProcessingState {
  tracksMap: Map<string, TrackAggregate>;
  roeViolationCount: number;
  unfavourableCount: number;
  totalEffectorCost: number;
  totalEngagedThreatValue: number;
}

function handleEngagePayload(
  target: TrackAggregate,
  payload: Record<string, unknown>,
  tMs: number,
  state: EventProcessingState
): void {
  const p = payload as {
    effector?: EffectorId;
    rangeM?: number;
    cer?: number;
    roeGate?: { classifiedOk?: boolean; zoneOk?: boolean };
  };
  target.engaged = true;
  target.tEng ??= tMs;
  if (p.effector) target.weaponUsed = p.effector;
  if (typeof p.rangeM === 'number') target.rangeAtEngageM = p.rangeM;

  if (p.roeGate) {
    if (p.roeGate.classifiedOk === false) target.unclassifiedFired = true;
    if (p.roeGate.zoneOk === false) target.isKineticOverDenseZone = true;
  }

  if (p.effector) {
    const cost = CONFIG.effectors[p.effector]?.costInr ?? 0;
    state.totalEffectorCost += cost;
    const val = target.valueInr ?? (CONFIG.droneClasses.RECON_QUAD.valueInr ?? 40000);
    state.totalEngagedThreatValue += val;
  }

  if (typeof p.cer === 'number' && p.cer > CONFIG.thresholds.cerUnfavourableThreshold) {
    state.unfavourableCount += 1;
  }
}

function processEvent(ev: SimEvent, target: TrackAggregate | null, state: EventProcessingState): void {
  switch (ev.type) {
    case 'SPAWN':
      if (target) {
        const p = ev.payload as { trueClass?: TrueClass; droneType?: string; valueInr?: number | null };
        if (p.trueClass) target.trueClass = p.trueClass;
        if (p.droneType) target.droneType = p.droneType;
        if (p.valueInr !== undefined) target.valueInr = p.valueInr;
        target.tVis = ev.tMs;
      }
      break;
    case 'DETECT':
      if (target?.tVis === null) target.tVis = ev.tMs;
      break;
    case 'TRACK_INIT':
      if (target) {
        target.tTrk = ev.tMs;
        if (ev.trackNo) target.trackNo = ev.trackNo;
      }
      break;
    case 'DESIGNATE':
      if (target?.tDesig === null) target.tDesig = ev.tMs;
      break;
    case 'CLASSIFY':
      if (target) {
        const p = ev.payload as { label?: TrackClass };
        if (p.label) target.traineeLabel = p.label;
        target.tCls ??= ev.tMs;
      }
      break;
    case 'ENGAGE':
      if (target) handleEngagePayload(target, ev.payload ?? {}, ev.tMs, state);
      break;
    case 'ENGAGE_RESULT':
      if (target && (ev.payload as { killed?: boolean })?.killed) target.neutralised = true;
      break;
    case 'LEAK':
      if (target) {
        target.leaked = true;
        target.tPnr ??= ev.tMs;
      }
      break;
    case 'ROE_VIOLATION':
      state.roeViolationCount += 1;
      break;
    default:
      break;
  }
}

function processEventStream(events: SimEvent[], scenarioSpec?: ScenarioSpec): EventProcessingState {
  const tracksMap = new Map<string, TrackAggregate>();
  if (scenarioSpec) {
    const allSpawns = [...(scenarioSpec.threats || []), ...(scenarioSpec.decoys || [])];
    for (let i = 0; i < allSpawns.length; i++) {
      const sp = allSpawns[i];
      const trackNo = `T-${String(i + 1).padStart(2, '0')}`;
      const t = getOrCreateTrack(tracksMap, trackNo, sp.id);
      t.id = sp.id;
      t.trackNo = trackNo;
      t.trueClass = sp.trueClass;
      t.droneType = sp.droneType;
      t.valueInr = sp.valueInr;
      t.tVis = sp.spawnTMs;
      t.tTrk = sp.spawnTMs;
    }
  }

  const state: EventProcessingState = {
    tracksMap,
    roeViolationCount: 0,
    unfavourableCount: 0,
    totalEffectorCost: 0,
    totalEngagedThreatValue: 0,
  };

  for (const ev of events) {
    const target = ev.trackNo || ev.entityId ? getOrCreateTrack(tracksMap, ev.trackNo, ev.entityId) : null;
    processEvent(ev, target, state);
  }

  return state;
}

function computeAverageDiff(
  tracks: TrackAggregate[],
  getT1: (t: TrackAggregate) => number | null,
  getT0: (t: TrackAggregate) => number | null
): number | null {
  const eligible = tracks.filter((t) => getT1(t) !== null && getT0(t) !== null);
  if (eligible.length === 0) return null;
  const sum = eligible.reduce((acc, t) => acc + (getT1(t)! - getT0(t)!), 0);
  return Math.round(sum / eligible.length);
}

interface LatencyMetrics {
  metMs: number | null;
  mdtMs: number | null;
  mctMs: number | null;
  s2sMs: number | null;
  detToTrackMs: number | null;
}

function computeTrackLatencies(allTracks: TrackAggregate[], hostileTracks: TrackAggregate[]): LatencyMetrics {
  const engagedHostile = hostileTracks.filter((t) => t.engaged && t.tEng !== null && t.tTrk !== null);
  return {
    metMs: computeAverageDiff(engagedHostile, (t) => t.tEng, (t) => t.tTrk),
    mdtMs: computeAverageDiff(allTracks, (t) => t.tDesig, (t) => t.tTrk),
    mctMs: computeAverageDiff(allTracks, (t) => t.tCls, (t) => t.tDesig),
    s2sMs: computeAverageDiff(allTracks, (t) => t.tEng, (t) => t.tDesig),
    detToTrackMs: computeAverageDiff(allTracks, (t) => t.tTrk, (t) => t.tVis),
  };
}

interface ConfusionMetrics {
  confusion: number[][];
  clsAccuracy: number;
  clsCoverage: number;
  hostileRecall: number;
  hostilePrecision: number;
}

function computeClassificationConfusion(
  allTracks: TrackAggregate[],
  hostileTracks: TrackAggregate[]
): ConfusionMetrics {
  const confusion: number[][] = Array.from({ length: 6 }, () => new Array(8).fill(0));
  let correctClsCount = 0;
  let coveredCount = 0;
  let hostilePredictedCount = 0;
  let hostileTrueAndPredictedCount = 0;

  for (const t of allTracks) {
    const trueRow = TRUE_CLASSES.indexOf(t.trueClass);
    let predCol = 7;
    if (t.traineeLabel) {
      const idx = (CLASSES as readonly string[]).indexOf(t.traineeLabel);
      predCol = idx >= 0 ? idx : 7;
    }

    if (trueRow >= 0 && predCol >= 0) {
      confusion[trueRow][predCol] += 1;
    }

    if (t.traineeLabel === t.trueClass) {
      correctClsCount += 1;
    }
    if (t.traineeLabel && t.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT') {
      coveredCount += 1;
    }

    const isTrueHostile = isHostile(t.trueClass);
    const isPredHostile = t.traineeLabel ? isHostile(t.traineeLabel) : false;
    if (isPredHostile) {
      hostilePredictedCount += 1;
      if (isTrueHostile) {
        hostileTrueAndPredictedCount += 1;
      }
    }
  }

  const totalTracksCount = Math.max(1, allTracks.length);
  const clsAccuracy = Number((correctClsCount / totalTracksCount).toFixed(3));
  const clsCoverage = Number((coveredCount / totalTracksCount).toFixed(3));
  const hostileRecall =
    hostileTracks.length > 0
      ? Number((hostileTrueAndPredictedCount / hostileTracks.length).toFixed(3))
      : 1.0;
  const hostilePrecision =
    hostilePredictedCount > 0
      ? Number((hostileTrueAndPredictedCount / hostilePredictedCount).toFixed(3))
      : 1.0;

  return { confusion, clsAccuracy, clsCoverage, hostileRecall, hostilePrecision };
}

function computeSalMetrics(events: SimEvent[]): { salMs: number | null; salScore: number | null } {
  let totalSalMs = 0;
  let salEventsCount = 0;

  const sensorSwitches = events
    .filter((e) => e.type === 'SENSOR_SWITCH')
    .map((e) => ({
      tMs: e.tMs,
      mode: (e.payload?.mode as SensorMode) ?? 'RADAR',
    }));

  const getSensorAt = (t: number): SensorMode => {
    let mode: SensorMode = 'RADAR';
    for (const s of sensorSwitches) {
      if (s.tMs <= t) mode = s.mode;
      else break;
    }
    return mode;
  };

  const chaosOnEvents = events.filter((e) => e.type === 'CHAOS_ON');
  for (const cOn of chaosOnEvents) {
    const cType = cOn.payload?.type as string;
    const tStart = cOn.tMs;
    const cOff = events.find(
      (e) => e.type === 'CHAOS_OFF' && e.payload?.type === cType && e.tMs >= tStart
    );
    const tEnd = cOff ? cOff.tMs : tStart + 15000;
    const eventDuration = tEnd - tStart;

    const sensorAtOnset = getSensorAt(tStart);
    const degraded =
      (cType === 'FOG' && sensorAtOnset === 'EOIR') ||
      (cType === 'JAMMING' && sensorAtOnset === 'RF') ||
      (cType === 'RADAR_DROPOUT' && sensorAtOnset === 'RADAR');

    if (degraded) {
      salEventsCount += 1;
      const nextSwitch = sensorSwitches.find((s) => s.tMs > tStart && s.tMs <= tEnd);
      totalSalMs += nextSwitch ? nextSwitch.tMs - tStart : eventDuration;
    }
  }

  const salMs = salEventsCount > 0 ? Math.round(totalSalMs / salEventsCount) : null;
  const salScore = salMs !== null ? clamp(100 * (1 - salMs / 6000)) : null;
  return { salMs, salScore };
}

interface SessionScoreResults {
  dScore: number;
  cScore: number;
  econScore: number;
  rScore: number;
  sessionScore: number;
  grade: Grade;
}

function computeAggregatedScores(
  allTracks: TrackAggregate[],
  leakers: number,
  collateralIncidents: number
): SessionScoreResults {
  let totalD = 0;
  let totalC = 0;
  let totalEcon = 0;
  let totalR = 0;
  const totalTracksCount = Math.max(1, allTracks.length);

  const trackScoresList = allTracks.map((t) => {
    const isHost = isHostile(t.trueClass);
    const d = computeDScore(t.tTrk, t.tDesig, t.tPnr ?? 120000);
    totalD += d;

    const c = computeCScore(t.trueClass, t.traineeLabel);
    totalC += c;

    let econ = 100;
    let time = 100;
    if (t.engaged && t.weaponUsed) {
      const eff = CONFIG.effectors[t.weaponUsed];
      const val = t.valueInr ?? (CONFIG.droneClasses.RECON_QUAD.valueInr ?? 40000);
      const cer = val > 0 ? eff.costInr / val : 999;
      econ = computeEconScore(cer).econScore;
      time = computeTimeScore(t.rangeAtEngageM ?? 1000, eff.envelopeMinM, eff.envelopeMaxM);
    }
    totalEcon += econ;

    const g = computeGScore({
      isHostile: isHost,
      neutralisedBeforePnr: t.neutralised,
      engaged: t.engaged,
      econScore: econ,
      timeScore: time,
      kineticOverDenseZone: t.isKineticOverDenseZone,
      unclassifiedFired: t.unclassifiedFired,
    });

    const r = computeRScore({
      effectorId: t.weaponUsed,
      rhoZone: t.isKineticOverDenseZone ? 0.8 : 0,
      isInsideZoneOverlap: t.isKineticOverDenseZone,
      civilEngaged: t.trueClass === 'CIVIL_UAS' && t.engaged,
      friendlyEngaged: t.trueClass === 'FRIENDLY' && t.engaged,
      unclassifiedFired: t.unclassifiedFired,
    });
    totalR += r;

    const trackScore = computeTrackScore({ isHostile: isHost, d, c, g, r });
    return { trackScore, trueClass: t.trueClass };
  });

  const sessionScore = computeSessionScore({
    trackScores: trackScoresList,
    leakersCount: leakers,
    criticalEventsCount: collateralIncidents,
  });

  return {
    dScore: Math.round(totalD / totalTracksCount),
    cScore: Math.round(totalC / totalTracksCount),
    econScore: Math.round(totalEcon / totalTracksCount),
    rScore: Math.round(totalR / totalTracksCount),
    sessionScore,
    grade: getGrade(sessionScore),
  };
}

/**
 * Pure function to aggregate complete AARMetrics from the recorded SimEvent stream (Rules.md DT-8, TASK-P3-03).
 */
export function aggregateAARMetrics(
  events: SimEvent[],
  scenarioSpec?: ScenarioSpec,
  trainingAidTicks?: number
): AARMetrics {
  const meta = extractSessionMetadata(events, scenarioSpec, trainingAidTicks);
  const streamState = processEventStream(events, scenarioSpec);

  const allTracks = Array.from(streamState.tracksMap.values());
  const hostileTracks = allTracks.filter((t) => isHostile(t.trueClass));

  const latencies = computeTrackLatencies(allTracks, hostileTracks);
  const confusionMetrics = computeClassificationConfusion(allTracks, hostileTracks);

  const aggregateCer =
    streamState.totalEngagedThreatValue > 0
      ? Number((streamState.totalEffectorCost / streamState.totalEngagedThreatValue).toFixed(3))
      : null;

  const leakers = hostileTracks.filter((t) => t.leaked && !t.neutralised).length;
  const leakRate = hostileTracks.length > 0 ? Number((leakers / hostileTracks.length).toFixed(3)) : 0;
  const collateralIncidents = allTracks.filter(
    (t) => (t.trueClass === 'CIVIL_UAS' || t.trueClass === 'FRIENDLY') && t.engaged
  ).length;

  const salMetrics = computeSalMetrics(events);

  const swarmElements = allTracks.filter((t) => t.droneType === 'SWARM_ELEMENT');
  const engagedSwarm = swarmElements.filter((t) => t.engaged);
  const swarmSat =
    swarmElements.length > 0
      ? Number((engagedSwarm.length / swarmElements.length).toFixed(3))
      : null;

  const scoreResults = computeAggregatedScores(allTracks, leakers, collateralIncidents);

  return {
    sessionUid: `session-${meta.scenarioId}-${events[0]?.tMs ?? 0}`,
    mode: meta.sessionMode,
    score: scoreResults.sessionScore,
    grade: scoreResults.grade,
    ...latencies,
    ...confusionMetrics,
    aggregateCer,
    unfavourableExchanges: streamState.unfavourableCount,
    collateralIncidents,
    roeViolations: streamState.roeViolationCount,
    leakers,
    leakRate,
    ...salMetrics,
    swarmSat,
    dScore: scoreResults.dScore,
    cScore: scoreResults.cScore,
    econScore: scoreResults.econScore,
    rScore: scoreResults.rScore,
    trainingAidTicks: meta.aidTicks,
    trainingAidDurationSec: meta.trainingAidDurationSec,
    trainingAidUsed: meta.trainingAidUsed,
  };
}

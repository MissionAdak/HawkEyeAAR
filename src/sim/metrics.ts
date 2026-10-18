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
import { CLASSES, isHostile } from './taxonomy';
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
  traineeLabel: TrackClass;
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
export function aggregateAARMetrics(
  events: SimEvent[],
  scenarioSpec?: ScenarioSpec
): AARMetrics {
  // 1. Session Mode and Metadata
  let sessionMode: 'TRAIN' | 'EVAL' | 'DEMO' = scenarioSpec?.mode ?? 'TRAIN';
  let scenarioId = scenarioSpec?.id ?? 'sim';
  const startEv = events.find((e) => e.type === 'SIM_START');
  if (startEv?.payload) {
    if (typeof startEv.payload.mode === 'string') {
      sessionMode = startEv.payload.mode as 'TRAIN' | 'EVAL' | 'DEMO';
    }
    if (typeof startEv.payload.scenarioId === 'string') {
      scenarioId = startEv.payload.scenarioId;
    }
  }

  // 2. Track entity tracking dictionary
  const tracksMap = new Map<string, TrackAggregate>();

  // Helper to get or create track entry
  const getOrCreateTrack = (trackNo?: string, entityId?: string): TrackAggregate => {
    const key = trackNo ?? entityId ?? 'unknown';
    let track = tracksMap.get(key);
    if (!track) {
      track = {
        id: entityId ?? key,
        trackNo: trackNo ?? null,
        trueClass: 'HOSTILE_ATTACK',
        droneType: 'FPV_ATTACK',
        valueInr: 100000,
        traineeLabel: 'UNKNOWN_EVIDENCE_INSUFFICIENT',
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
  };

  // Pre-seed from ScenarioSpec if provided
  if (scenarioSpec) {
    const allSpawns = [...(scenarioSpec.threats || []), ...(scenarioSpec.decoys || [])];
    for (let i = 0; i < allSpawns.length; i++) {
      const sp = allSpawns[i];
      const trackNo = `T-${String(i + 1).padStart(2, '0')}`;
      const t = getOrCreateTrack(trackNo, sp.id);
      t.id = sp.id;
      t.trackNo = trackNo;
      t.trueClass = sp.trueClass;
      t.droneType = sp.droneType;
      t.valueInr = sp.valueInr;
      t.tVis = sp.spawnTMs;
      t.tTrk = sp.spawnTMs;
    }
  }

  let roeViolationCount = 0;
  let unfavourableCount = 0;
  let totalEffectorCost = 0;
  let totalEngagedThreatValue = 0;

  // Process all events in temporal sequence
  for (const ev of events) {
    const target = ev.trackNo || ev.entityId ? getOrCreateTrack(ev.trackNo, ev.entityId) : null;

    switch (ev.type) {
      case 'SPAWN': {
        if (target) {
          const p = ev.payload as {
            trueClass?: TrueClass;
            droneType?: string;
            valueInr?: number | null;
          };
          if (p.trueClass) target.trueClass = p.trueClass;
          if (p.droneType) target.droneType = p.droneType;
          if (p.valueInr !== undefined) target.valueInr = p.valueInr;
          target.tVis = ev.tMs;
        }
        break;
      }

      case 'DETECT': {
        if (target && target.tVis === null) {
          target.tVis = ev.tMs;
        }
        break;
      }

      case 'TRACK_INIT': {
        if (target) {
          target.tTrk = ev.tMs;
          if (ev.trackNo) target.trackNo = ev.trackNo;
        }
        break;
      }

      case 'DESIGNATE': {
        if (target && target.tDesig === null) {
          target.tDesig = ev.tMs;
        }
        break;
      }

      case 'CLASSIFY': {
        if (target) {
          const p = ev.payload as { label?: TrackClass };
          if (p.label) {
            target.traineeLabel = p.label;
          }
          if (target.tCls === null) {
            target.tCls = ev.tMs;
          }
        }
        break;
      }

      case 'ENGAGE': {
        if (target) {
          const p = ev.payload as {
            effector?: EffectorId;
            rangeM?: number;
            cer?: number;
            roeGate?: { classifiedOk?: boolean; zoneOk?: boolean };
          };
          target.engaged = true;
          if (target.tEng === null) target.tEng = ev.tMs;
          if (p.effector) target.weaponUsed = p.effector;
          if (typeof p.rangeM === 'number') target.rangeAtEngageM = p.rangeM;

          if (p.roeGate) {
            if (p.roeGate.classifiedOk === false) {
              target.unclassifiedFired = true;
            }
            if (p.roeGate.zoneOk === false) {
              target.isKineticOverDenseZone = true;
            }
          }

          if (p.effector) {
            const cost = CONFIG.effectors[p.effector]?.costInr ?? 0;
            totalEffectorCost += cost;
            const val = target.valueInr ?? (CONFIG.droneClasses.RECON_QUAD.valueInr ?? 40000);
            totalEngagedThreatValue += val;
          }

          if (typeof p.cer === 'number' && p.cer > CONFIG.thresholds.cerUnfavourableThreshold) {
            unfavourableCount += 1;
          }
        }
        break;
      }

      case 'ENGAGE_RESULT': {
        if (target) {
          const p = ev.payload as { killed?: boolean };
          if (p.killed) {
            target.neutralised = true;
          }
        }
        break;
      }

      case 'LEAK': {
        if (target) {
          target.leaked = true;
          if (target.tPnr === null) target.tPnr = ev.tMs;
        }
        break;
      }

      case 'ROE_VIOLATION': {
        roeViolationCount += 1;
        break;
      }

      case 'FLAG': {
        const p = ev.payload as { type?: string };
        if (p.type === 'UNFAVOURABLE_EXCHANGE') {
          // Tracked already or increment if not counted from ENGAGE
        }
        break;
      }
    }
  }

  const allTracks = Array.from(tracksMap.values());
  const hostileTracks = allTracks.filter((t) => isHostile(t.trueClass));
  const engagedHostileTracks = hostileTracks.filter((t) => t.engaged && t.tEng !== null && t.tTrk !== null);

  // 3. Compute Latencies
  const metMs =
    engagedHostileTracks.length > 0
      ? Math.round(
          engagedHostileTracks.reduce((acc, t) => acc + (t.tEng! - t.tTrk!), 0) /
            engagedHostileTracks.length
        )
      : null;

  const designatedTracks = allTracks.filter((t) => t.tDesig !== null && t.tTrk !== null);
  const mdtMs =
    designatedTracks.length > 0
      ? Math.round(
          designatedTracks.reduce((acc, t) => acc + (t.tDesig! - t.tTrk!), 0) /
            designatedTracks.length
        )
      : null;

  const classifiedTracks = allTracks.filter((t) => t.tCls !== null && t.tDesig !== null);
  const mctMs =
    classifiedTracks.length > 0
      ? Math.round(
          classifiedTracks.reduce((acc, t) => acc + (t.tCls! - t.tDesig!), 0) /
            classifiedTracks.length
        )
      : null;

  const s2sTracks = allTracks.filter((t) => t.tEng !== null && t.tDesig !== null);
  const s2sMs =
    s2sTracks.length > 0
      ? Math.round(
          s2sTracks.reduce((acc, t) => acc + (t.tEng! - t.tDesig!), 0) / s2sTracks.length
        )
      : null;

  const detToTrackTracks = allTracks.filter((t) => t.tTrk !== null && t.tVis !== null);
  const detToTrackMs =
    detToTrackTracks.length > 0
      ? Math.round(
          detToTrackTracks.reduce((acc, t) => acc + (t.tTrk! - t.tVis!), 0) /
            detToTrackTracks.length
        )
      : null;

  // 4. 7x7 Confusion Matrix & Classification Metrics
  const confusion: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
  let correctClsCount = 0;
  let coveredCount = 0;
  let hostilePredictedCount = 0;
  let hostileTrueAndPredictedCount = 0;

  for (const t of allTracks) {
    const trueRow = CLASSES.indexOf(t.trueClass);
    const predCol = CLASSES.indexOf(t.traineeLabel);

    if (trueRow >= 0 && predCol >= 0) {
      confusion[trueRow][predCol] += 1;
    }

    if (t.traineeLabel === t.trueClass) {
      correctClsCount += 1;
    }

    if (t.traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT') {
      coveredCount += 1;
    }

    const isTrueHostile = isHostile(t.trueClass);
    const isPredHostile = isHostile(t.traineeLabel);

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

  // 5. Economic & Leaker Metrics
  const aggregateCer =
    totalEngagedThreatValue > 0
      ? Number((totalEffectorCost / totalEngagedThreatValue).toFixed(3))
      : null;

  const leakers = hostileTracks.filter((t) => t.leaked && !t.neutralised).length;
  const leakRate =
    hostileTracks.length > 0 ? Number((leakers / hostileTracks.length).toFixed(3)) : 0;

  const collateralIncidents = allTracks.filter(
    (t) =>
      (t.trueClass === 'CIVIL_UAS' || t.trueClass === 'FRIENDLY') && t.engaged
  ).length;

  // 6. Sensor Adaptation Latency (SAL) (Rules.md SC-13, PRD 4.8)
  let totalSalMs = 0;
  let salEventsCount = 0;

  // Track active sensor timeline
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
    // Find matching CHAOS_OFF
    const cOff = events.find(
      (e) => e.type === 'CHAOS_OFF' && (e.payload?.type === cType) && e.tMs >= tStart
    );
    const tEnd = cOff ? cOff.tMs : tStart + 15000;
    const eventDuration = tEnd - tStart;

    const sensorAtOnset = getSensorAt(tStart);
    let degraded = false;
    if (cType === 'FOG' && sensorAtOnset === 'EOIR') degraded = true;
    if (cType === 'JAMMING' && sensorAtOnset === 'RF') degraded = true;
    if (cType === 'RADAR_DROPOUT' && sensorAtOnset === 'RADAR') degraded = true;

    if (degraded) {
      salEventsCount += 1;
      const nextSwitch = sensorSwitches.find((s) => s.tMs > tStart && s.tMs <= tEnd);
      if (nextSwitch) {
        totalSalMs += nextSwitch.tMs - tStart;
      } else {
        totalSalMs += eventDuration; // Fallback: never switched
      }
    }
  }

  const salMs = salEventsCount > 0 ? Math.round(totalSalMs / salEventsCount) : null;
  const salScore = salMs !== null ? clamp(100 * (1 - salMs / 6000)) : null;

  // 7. Swarm Saturation (SAT)
  const swarmElements = allTracks.filter((t) => t.droneType === 'SWARM_ELEMENT');
  const engagedSwarmElements = swarmElements.filter((t) => t.engaged);
  const swarmSat =
    swarmElements.length > 0
      ? Number((engagedSwarmElements.length / swarmElements.length).toFixed(3))
      : null;

  // 8. Individual Track Scores & Session Aggregation
  let totalD = 0;
  let totalC = 0;
  let totalEcon = 0;
  let totalR = 0;

  const trackScoresList = allTracks.map((t) => {
    const isHost = isHostile(t.trueClass);

    // Compute D
    const d = computeDScore(t.tTrk, t.tDesig, t.tPnr ?? 120000);
    totalD += d;

    // Compute C
    const c = computeCScore(t.trueClass, t.traineeLabel);
    totalC += c;

    // Compute Econ & Time
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

    // Compute G
    const g = computeGScore({
      isHostile: isHost,
      neutralisedBeforePnr: t.neutralised,
      engaged: t.engaged,
      econScore: econ,
      timeScore: time,
      kineticOverDenseZone: t.isKineticOverDenseZone,
    });

    // Compute R
    const r = computeRScore({
      effectorId: t.weaponUsed,
      rhoZone: t.isKineticOverDenseZone ? 0.8 : 0,
      isInsideZoneOverlap: t.isKineticOverDenseZone,
      civilEngaged: t.trueClass === 'CIVIL_UAS' && t.engaged,
      friendlyEngaged: t.trueClass === 'FRIENDLY' && t.engaged,
      unclassifiedFired: t.unclassifiedFired,
    });
    totalR += r;

    const trackScore = computeTrackScore({
      isHostile: isHost,
      d,
      c,
      g,
      r,
    });

    return { trackScore, trueClass: t.trueClass };
  });

  const dScore = Math.round(totalD / totalTracksCount);
  const cScore = Math.round(totalC / totalTracksCount);
  const econScore = Math.round(totalEcon / totalTracksCount);
  const rScore = Math.round(totalR / totalTracksCount);

  const sessionScore = computeSessionScore({
    trackScores: trackScoresList,
    leakersCount: leakers,
    criticalEventsCount: collateralIncidents,
  });

  const grade: Grade = getGrade(sessionScore);

  return {
    sessionUid: `session-${scenarioId}-${events[0]?.tMs ?? 0}`,
    mode: sessionMode,
    score: sessionScore,
    grade,
    metMs,
    mdtMs,
    mctMs,
    s2sMs,
    detToTrackMs,
    clsAccuracy,
    clsCoverage,
    hostileRecall,
    hostilePrecision,
    aggregateCer,
    unfavourableExchanges: unfavourableCount,
    collateralIncidents,
    roeViolations: roeViolationCount,
    leakers,
    leakRate,
    salMs,
    salScore,
    swarmSat,
    dScore,
    cScore,
    econScore,
    rScore,
    confusion,
  };
}

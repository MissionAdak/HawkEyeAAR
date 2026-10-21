import { evaluateMasking, isPointInPolygon, raySegmentIntersection } from '@/sim/masking';
import type { ZoneSpec } from '@/sim/types';
import { CONFIG } from '@/config';
import { RCS_REF, R_REF } from '@/sim/sensors';

/**
 * Radar Constant-SNR Radius (R90) derived from radar equation Pd function (PRD 3.2 & sensors.ts):
 * Pd = 1 - exp(-2.303 * SNR)
 * For Pd = 0.90: SNR_req = 1.0
 * SNR = (RCS / RCS_REF) * (R_REF / R)^4 * A_env
 * R_const = R_REF * ((RCS / RCS_REF) * A_env / SNR_req)^(1/4)
 */
export function calculateRadarR90Radius(
  rcsM2: number = RCS_REF,
  aEnv: number = 1.0,
  pdThreshold: number = 0.90,
  maxRangeM: number = CONFIG.thresholds.radarMaxRangeM
): number {
  if (rcsM2 <= 0 || aEnv <= 0 || pdThreshold <= 0 || pdThreshold >= 1) {
    return 0;
  }
  const snrReq = Math.abs(pdThreshold - 0.90) < 1e-6 ? 1.0 : -Math.log(1 - pdThreshold) / 2.303;
  if (snrReq <= 0) return 0;
  const r = R_REF * Math.pow(((rcsM2 / RCS_REF) * aEnv) / snrReq, 0.25);
  return Math.min(r, maxRangeM);
}

export interface CrossSectionSample {
  rangeM: number;
  x: number;
  y: number;
  isInsideZone: boolean;
  zoneHeightM: number;
  zoneId?: string;
  shadowCeilingM: number;
  isMaskedAtGround: boolean;
}

export interface ZoneCrossSectionBlock {
  zoneId: string;
  dNearM: number;
  dFarM: number;
  heightM: number;
  shadowM: number;
  shadowEndM: number;
}

export interface CrossSectionProfile {
  bearingDeg: number;
  maxRangeM: number;
  antennaHeightM: number;
  blocks: ZoneCrossSectionBlock[];
  samples: CrossSectionSample[];
  verticalExaggerationFactor: number;
  altitudeBands: {
    lowCeilingM: number;
    midCeilingM: number;
    highCeilingM: number;
  };
}

export interface RadarRcsShell {
  rcsM2: number;
  radiusM: number;
  label: string;
  isGuaranteedLimit: boolean;
  description: string;
}

/**
 * Converts a tactical bearing (0 = North/+Y, 90 = East/+X) and range into Cartesian coordinates.
 */
export function bearingRangeToCartesian(bearingDeg: number, rangeM: number): { x: number; y: number } {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    x: rangeM * Math.sin(rad),
    y: rangeM * Math.cos(rad),
  };
}

/**
 * Evaluates the exact shadow ceiling z_c at (x, y) derived authoritatively
 * from the simulation's canonical evaluateMasking rule (Rules R10.3 & D-37).
 *
 * For any z < ceiling, evaluateMasking({x, y, z}, zones).isMasked is true.
 * For any z >= ceiling, evaluateMasking({x, y, z}, zones).isMasked is false.
 */
function findZoneNearEdgeDistance(x: number, y: number, polygon: [number, number][]): number {
  let dNearM = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const dist = raySegmentIntersection(x, y, p1, p2);
    if (dist !== null && dist < dNearM) {
      dNearM = dist;
    }
  }
  return dNearM;
}

function calculateZoneShadowHeight(
  R: number,
  dNearM: number,
  zone: ZoneSpec,
  antennaHeightM: number,
  isInside: boolean
): number {
  const isPastNear = dNearM < Infinity && dNearM <= R && R - dNearM <= zone.shadowM && dNearM > 0;
  if (isInside) {
    let zoneCeiling = zone.heightM;
    if (isPastNear) {
      const zRay = antennaHeightM + (R / dNearM) * (zone.heightM - antennaHeightM);
      zoneCeiling = Math.max(zoneCeiling, zRay);
    }
    return zoneCeiling;
  }
  if (isPastNear) {
    const zRay = antennaHeightM + (R / dNearM) * (zone.heightM - antennaHeightM);
    return Math.max(0, zRay);
  }
  return 0;
}

export function calculateShadowCeilingAt(
  x: number,
  y: number,
  zones: ZoneSpec[] = [],
  antennaHeightM: number = CONFIG.thresholds.antennaHeightM || 15
): number {
  const R = Math.hypot(x, y);
  if (R < 1) return 0;

  // Check if masked at ground level (z = 0)
  const groundMask = evaluateMasking({ x, y, z: 0 }, zones);
  if (!groundMask.isMasked) {
    return 0; // Completely unmasked along line of sight
  }

  let maxCeiling = 0;

  for (const zone of zones) {
    if (zone.polygon.length < 3) continue;

    const isInside = isPointInPolygon(x, y, zone.polygon);
    const dNearM = findZoneNearEdgeDistance(x, y, zone.polygon);
    const zoneCeiling = calculateZoneShadowHeight(R, dNearM, zone, antennaHeightM, isInside);
    maxCeiling = Math.max(maxCeiling, zoneCeiling);
  }

  return Math.max(0, maxCeiling);
}

function extractZoneCrossSectionBlock(
  zone: ZoneSpec,
  farX: number,
  farY: number,
  maxRangeM: number
): ZoneCrossSectionBlock | null {
  if (zone.polygon.length < 3) return null;

  const intersections: number[] = [];
  for (let i = 0; i < zone.polygon.length; i++) {
    const p1 = zone.polygon[i];
    const p2 = zone.polygon[(i + 1) % zone.polygon.length];
    const dist = raySegmentIntersection(farX, farY, p1, p2);
    if (dist !== null && dist <= maxRangeM) {
      intersections.push(dist);
    }
  }

  if (intersections.length === 0) return null;

  intersections.sort((a, b) => a - b);
  const dNearM = intersections[0];
  const dFarM = intersections.length >= 2 ? intersections.at(-1)! : Math.min(maxRangeM, dNearM + 100);

  return {
    zoneId: zone.id,
    dNearM,
    dFarM,
    heightM: zone.heightM,
    shadowM: zone.shadowM,
    shadowEndM: Math.min(maxRangeM, dNearM + zone.shadowM),
  };
}

/**
 * Calculates a complete side elevation cross-section profile along a specified bearing.
 * Compiles zone obstacle intersections, canonical shadow envelopes, and vertical altitude bands.
 */
export function calculateCrossSection(
  bearingDeg: number,
  maxRangeM: number = 5000,
  zones: ZoneSpec[] = [],
  stepM: number = 50,
  antennaHeightM: number = CONFIG.thresholds.antennaHeightM || 15
): CrossSectionProfile {
  const normBearing = ((bearingDeg % 360) + 360) % 360;
  const samples: CrossSectionSample[] = [];

  // 1. Identify zone intersection blocks along this bearing
  const blocks: ZoneCrossSectionBlock[] = [];
  const rad = (normBearing * Math.PI) / 180;
  const farX = maxRangeM * Math.sin(rad);
  const farY = maxRangeM * Math.cos(rad);

  for (const zone of zones) {
    const block = extractZoneCrossSectionBlock(zone, farX, farY, maxRangeM);
    if (block) {
      blocks.push(block);
    }
  }

  // 2. Sample along range
  for (let r = 0; r <= maxRangeM; r += stepM) {
    const pt = bearingRangeToCartesian(normBearing, r);
    const ceiling = calculateShadowCeilingAt(pt.x, pt.y, zones, antennaHeightM);
    const groundResult = evaluateMasking({ x: pt.x, y: pt.y, z: 0 }, zones);

    let isInside = false;
    let zoneHeightM = 0;
    let zoneId: string | undefined;

    for (const z of zones) {
      if (isPointInPolygon(pt.x, pt.y, z.polygon)) {
        isInside = true;
        zoneHeightM = z.heightM;
        zoneId = z.id;
        break;
      }
    }

    samples.push({
      rangeM: r,
      x: pt.x,
      y: pt.y,
      isInsideZone: isInside,
      zoneHeightM,
      zoneId,
      shadowCeilingM: ceiling,
      isMaskedAtGround: groundResult.isMasked,
    });
  }

  // Vertical exaggeration factor:
  // Typical display: 5000m range maps to ~460px (0.092 px/m).
  // 160m altitude maps to ~180px (1.125 px/m).
  // Exaggeration = 1.125 / 0.092 ≈ 12.2x.
  const verticalExaggerationFactor = 12.2;

  return {
    bearingDeg: normBearing,
    maxRangeM,
    antennaHeightM,
    blocks,
    samples,
    verticalExaggerationFactor,
    altitudeBands: {
      lowCeilingM: 40,
      midCeilingM: 100,
      highCeilingM: 160,
    },
  };
}

/**
 * Calculates canonical radar reference-RCS shells derived from the radar equation.
 * Strictly separates probabilistic constant-SNR shells from the maximum horizontal radar limit (Rule 4).
 */
export function calculateRadarRcsShells(
  maxRangeM: number = CONFIG.thresholds.radarMaxRangeM || 5000
): RadarRcsShell[] {
  const microR = Math.round(calculateRadarR90Radius(0.005, 1.0, 0.9, maxRangeM));
  const nominalR = Math.round(calculateRadarR90Radius(RCS_REF, 1.0, 0.9, maxRangeM));
  const mediumR = Math.round(calculateRadarR90Radius(0.05, 1.0, 0.9, maxRangeM));

  return [
    {
      rcsM2: 0.005,
      radiusM: microR,
      label: `REF-RCS 0.005m² · R90: ${microR}m`,
      isGuaranteedLimit: false,
      description: 'Probabilistic SNR R90 Shell for Micro Drone (quadcopter). Detection is not guaranteed.',
    },
    {
      rcsM2: 0.01,
      radiusM: nominalR,
      label: `REF-RCS 0.010m² · R90: ${nominalR}m`,
      isGuaranteedLimit: false,
      description: 'Nominal Reference RCS Benchmark (mini drone). Detection is not guaranteed.',
    },
    {
      rcsM2: 0.05,
      radiusM: mediumR,
      label: `REF-RCS 0.050m² · R90: ${mediumR}m`,
      isGuaranteedLimit: false,
      description: 'Group 2 Medium Drone constant-SNR boundary.',
    },
    {
      rcsM2: 1.0,
      radiusM: maxRangeM,
      label: `RADAR HORIZON CUTOFF · ${maxRangeM}m`,
      isGuaranteedLimit: true,
      description: 'Maximum horizontal instrumented processing limit. Hard simulation horizon.',
    },
  ];
}

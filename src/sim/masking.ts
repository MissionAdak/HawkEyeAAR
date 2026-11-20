import type { ZoneSpec, Vec3 } from './types';
import { CONFIG } from '@/config';

export interface MaskResult {
  isMasked: boolean;
  zoneId?: string;
  thetaT: number;
  thetaMask: number;
  dNearM: number;
  shadowRemainingM: number;
}

/**
 * Checks if a 2D point (px, py) is inside a polygon using ray-casting.
 */
export function isPointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Finds the intersection between ray (0,0) -> (tx, ty) and segment (p1 -> p2).
 * Returns the distance from origin to intersection if valid, otherwise null.
 */
export function raySegmentIntersection(
  tx: number,
  ty: number,
  p1: [number, number],
  p2: [number, number]
): number | null {
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  const dx = x2 - x1;
  const dy = y2 - y1;

  // Cross product
  const det = tx * dy - ty * dx;
  if (Math.abs(det) < 1e-9) return null; // Parallel

  const t = (x1 * dy - y1 * dx) / det;
  const u = (x1 * ty - y1 * tx) / det;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    // Intersection point is (t * tx, t * ty)
    const ix = t * tx;
    const iy = t * ty;
    return Math.hypot(ix, iy);
  }

  return null;
}

function findZoneNearEdgeDistance(targetX: number, targetY: number, polygon: [number, number][]): number {
  let dNearM = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const dist = raySegmentIntersection(targetX, targetY, p1, p2);
    if (dist !== null && dist < dNearM) {
      dNearM = dist;
    }
  }
  return dNearM;
}

function evaluateZoneMasking(
  pos: Vec3,
  zone: ZoneSpec,
  R: number,
  h_r: number,
  thetaT: number
): MaskResult | null {
  if (zone.polygon.length < 3) return null;

  if (isPointInPolygon(pos.x, pos.y, zone.polygon) && pos.z <= zone.heightM) {
    return {
      isMasked: true,
      zoneId: zone.id,
      thetaT,
      thetaMask: Math.PI / 2,
      dNearM: 0,
      shadowRemainingM: zone.shadowM,
    };
  }

  const dNearM = findZoneNearEdgeDistance(pos.x, pos.y, zone.polygon);
  if (dNearM <= R) {
    const thetaMask = Math.atan2(zone.heightM - h_r, dNearM);
    const distPastNearEdge = R - dNearM;
    if (thetaT < thetaMask && distPastNearEdge <= zone.shadowM) {
      return {
        isMasked: true,
        zoneId: zone.id,
        thetaT,
        thetaMask,
        dNearM,
        shadowRemainingM: zone.shadowM - distPastNearEdge,
      };
    }
  }

  return null;
}

/**
 * Evaluates line-of-sight terrain masking from radar at (0, 0, h_r) to target at pos (x, y, z).
 * Complies strictly with PRD 5.3 and ARCHITECTURE.md 5.1.
 */
export function evaluateMasking(pos: Vec3, zones: ZoneSpec[]): MaskResult {
  const h_r = CONFIG.thresholds.antennaHeightM || 15;
  const R = Math.hypot(pos.x, pos.y);

  if (R < 1) {
    return {
      isMasked: false,
      thetaT: 0,
      thetaMask: 0,
      dNearM: 0,
      shadowRemainingM: 0,
    };
  }

  const thetaT = Math.atan2(pos.z - h_r, R);

  for (const zone of zones) {
    const res = evaluateZoneMasking(pos, zone, R, h_r, thetaT);
    if (res) return res;
  }

  return {
    isMasked: false,
    thetaT,
    thetaMask: 0,
    dNearM: 0,
    shadowRemainingM: 0,
  };
}

/**
 * Calculates mathematical terrain masking line-of-sight elevation angles.
 * Provided for compatibility with director and external callers.
 */
export function isMasked(
  targetPos: Vec3,
  radarPos: { x: number; y: number; antennaHeightM: number },
  zone: ZoneSpec
): { masked: boolean; thetaT: number; thetaMask: number } {
  const dx = targetPos.x - radarPos.x;
  const dy = targetPos.y - radarPos.y;
  const R = Math.hypot(dx, dy);
  if (R === 0) return { masked: false, thetaT: 0, thetaMask: 0 };

  const d_n = Math.max(100, R * 0.4);
  const thetaMask = Math.atan2(zone.heightM - radarPos.antennaHeightM, d_n);
  const thetaT = Math.atan2(targetPos.z - radarPos.antennaHeightM, R);

  const inShadowRange = (R - d_n) <= zone.shadowM;
  const masked = thetaT < thetaMask && inShadowRange;

  return { masked, thetaT, thetaMask };
}

import type { SafeTrackView } from './types';

export type AltBand = 'LOW' | 'MID' | 'HIGH';

export interface AltBandBounds {
  floorM: number;
  ceilM: number;
  midM: number;
}

export function getAltBand(z: number): AltBand {
  if (z <= 40) return 'LOW';
  if (z <= 100) return 'MID';
  return 'HIGH';
}

export function getAltBandBounds(band: AltBand): AltBandBounds {
  switch (band) {
    case 'LOW':
      return { floorM: 0, ceilM: 40, midM: 20 };
    case 'MID':
      return { floorM: 40, ceilM: 100, midM: 70 };
    case 'HIGH':
      return { floorM: 100, ceilM: 160, midM: 150 };
  }
}

export interface Point2D {
  x: number;
  y: number;
}

export interface ClusterMetrics {
  clusterId: string;
  trackNos: string[];
  count: number;
  hull2D: Point2D[];
  centroid: Point2D;
  areaKm2: number;
  densityTrkPerKm2: number;
  meanSpacingM: number;
  lowestBand: AltBand;
  highestBand: AltBand;
  altSpan: string;
  zMinM: number;
  zMaxM: number;
  label: string;
  isDegenerate: boolean;
}

export interface ClusterOptions {
  epsM?: number;
  minPts?: number;
}

export const DEFAULT_CLUSTER_EPS_M = 200;
export const DEFAULT_CLUSTER_MIN_PTS = 3;

/**
 * 2D Euclidean distance on horizontal plane.
 */
export function horizontalDist(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * 2D cross product of vectors OA and OB.
 * Positive if O->A->B makes a counter-clockwise turn.
 */
function crossProduct(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Computes 2D Convex Hull of horizontal points using Andrew's Monotone Chain algorithm.
 * Returns vertices in counter-clockwise order.
 */
export function computeConvexHull2D(points: Point2D[]): Point2D[] {
  if (points.length <= 2) {
    return points.slice();
  }

  // Sort points lexicographically (by x, then by y)
  const sorted = points.slice().sort((a, b) => {
    if (Math.abs(a.x - b.x) > 1e-6) return a.x - b.x;
    return a.y - b.y;
  });

  // Build lower hull
  const lower: Point2D[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: Point2D[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove the last point of each half because it is repeated at the beginning of the other half
  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

/**
 * Computes the area of a 2D polygon using the Shoelace formula.
 */
export function computePolygonAreaM2(polygon: Point2D[]): number {
  const n = polygon.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) * 0.5;
}

/**
 * Builds a fallback 8-sided regular envelope around centroid/line when the hull is degenerate.
 */
function createFallbackEnvelope(points: Point2D[], epsM: number): Point2D[] {
  if (points.length === 0) return [];

  // Compute centroid
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  // Maximum spread from centroid
  let maxR = epsM * 0.5;
  for (const p of points) {
    const d = horizontalDist({ x: cx, y: cy }, p);
    if (d > maxR) maxR = d;
  }
  const bufferR = maxR + 25;

  const hull: Point2D[] = [];
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    hull.push({
      x: cx + Math.cos(theta) * bufferR,
      y: cy + Math.sin(theta) * bufferR,
    });
  }
  return hull;
}

/**
 * Deterministic DBSCAN-lite spatial clustering on operator-visible track estimates.
 *
 * Invariant:
 * Strictly uses only operator-visible SafeTrackView fields:
 * - trackNo
 * - pos.x, pos.y (horizontal coordinates)
 * - pos.z (quantized to discrete altitude band LOW/MID/HIGH)
 * Zero ground truth inputs are accepted.
 */
export function detectTrackClusters(
  tracks: SafeTrackView[],
  options: ClusterOptions = {}
): ClusterMetrics[] {
  const epsM = options.epsM ?? DEFAULT_CLUSTER_EPS_M;
  const minPts = options.minPts ?? DEFAULT_CLUSTER_MIN_PTS;

  // Filter for active, non-closed, operator-visible tracks
  const candidateTracks = tracks
    .filter(
      (t) =>
        t.step !== 'UNDETECTED' &&
        t.step !== 'CLOSED' &&
        (t.lifecycle === 'ACTIVE' || t.lifecycle === 'LEAKED' || t.lifecycle === 'NEUTRALISED')
    )
    .slice()
    // Deterministic sort by trackNo ensures order-independent iteration
    .sort((a, b) => a.trackNo.localeCompare(b.trackNo));

  if (candidateTracks.length < minPts) {
    return [];
  }

  const n = candidateTracks.length;
  const visited = new Set<string>();
  const clustered = new Set<string>();
  const clusterGroups: SafeTrackView[][] = [];

  // Distance matrix
  const distMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = horizontalDist(candidateTracks[i].pos, candidateTracks[j].pos);
      distMatrix[i][j] = d;
      distMatrix[j][i] = d;
    }
  }

  for (let i = 0; i < n; i++) {
    const rootTrack = candidateTracks[i];
    if (visited.has(rootTrack.trackNo)) continue;
    visited.add(rootTrack.trackNo);

    // Find neighbors of rootTrack
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      if (distMatrix[i][j] <= epsM) {
        neighbors.push(j);
      }
    }

    if (neighbors.length >= minPts) {
      // Core point: expand cluster
      const currentCluster: SafeTrackView[] = [rootTrack];
      clustered.add(rootTrack.trackNo);

      const queue: number[] = [...neighbors];

      while (queue.length > 0) {
        const neighborIdx = queue.shift()!;
        const neighborTrack = candidateTracks[neighborIdx];

        if (!visited.has(neighborTrack.trackNo)) {
          visited.add(neighborTrack.trackNo);

          // Find secondary neighbors
          const subNeighbors: number[] = [];
          for (let j = 0; j < n; j++) {
            if (distMatrix[neighborIdx][j] <= epsM) {
              subNeighbors.push(j);
            }
          }
          if (subNeighbors.length >= minPts) {
            queue.push(...subNeighbors);
          }
        }

        if (!clustered.has(neighborTrack.trackNo)) {
          clustered.add(neighborTrack.trackNo);
          currentCluster.push(neighborTrack);
        }
      }

      // Sort tracks in cluster deterministically
      currentCluster.sort((a, b) => a.trackNo.localeCompare(b.trackNo));
      clusterGroups.push(currentCluster);
    }
  }

  // Sort clusters deterministically by the trackNo of their first member
  clusterGroups.sort((a, b) => a[0].trackNo.localeCompare(b[0].trackNo));

  // Compute metrics for each cluster
  const results: ClusterMetrics[] = [];

  for (let cIdx = 0; cIdx < clusterGroups.length; cIdx++) {
    const cTracks = clusterGroups[cIdx];
    const count = cTracks.length;
    const trackNos = cTracks.map((t) => t.trackNo);
    const clusterId = `C-${String(cIdx + 1).padStart(2, '0')}`;

    const points2D: Point2D[] = cTracks.map((t) => ({ x: t.pos.x, y: t.pos.y }));

    // Centroid
    let cx = 0;
    let cy = 0;
    for (const p of points2D) {
      cx += p.x;
      cy += p.y;
    }
    cx /= count;
    cy /= count;
    const centroid: Point2D = { x: cx, y: cy };

    // Nearest-neighbor spacing
    let spacingSum = 0;
    for (let i = 0; i < count; i++) {
      let minD = Infinity;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const d = horizontalDist(points2D[i], points2D[j]);
        if (d < minD) minD = d;
      }
      spacingSum += minD === Infinity ? 0 : minD;
    }
    const meanSpacingM = spacingSum / count;

    // Convex Hull
    let rawHull = computeConvexHull2D(points2D);
    let areaM2 = computePolygonAreaM2(rawHull);
    let isDegenerate = false;

    // Check for degenerate hull (collinear points or area < 100 m^2)
    if (rawHull.length < 3 || areaM2 < 100) {
      isDegenerate = true;
      rawHull = createFallbackEnvelope(points2D, epsM);
      areaM2 = computePolygonAreaM2(rawHull);
    }

    const areaKm2 = areaM2 / 1_000_000;
    const densityTrkPerKm2 = count / Math.max(0.001, areaKm2);

    // Altitude bands
    const bandsPresent = new Set<AltBand>();
    for (const t of cTracks) {
      bandsPresent.add(getAltBand(t.pos.z));
    }

    const lowestBand: AltBand = bandsPresent.has('LOW')
      ? 'LOW'
      : bandsPresent.has('MID')
      ? 'MID'
      : 'HIGH';

    const highestBand: AltBand = bandsPresent.has('HIGH')
      ? 'HIGH'
      : bandsPresent.has('MID')
      ? 'MID'
      : 'LOW';

    const altSpan =
      lowestBand === highestBand ? lowestBand : `${lowestBand}–${highestBand}`;

    const zMinM = getAltBandBounds(lowestBand).floorM;
    const zMaxM = getAltBandBounds(highestBand).ceilM;

    const label = `CLUSTER ${count} · ${altSpan} · ${densityTrkPerKm2.toFixed(1)} TRK/KM² · SPACING ${Math.round(meanSpacingM)}m`;

    results.push({
      clusterId,
      trackNos,
      count,
      hull2D: rawHull,
      centroid,
      areaKm2,
      densityTrkPerKm2,
      meanSpacingM,
      lowestBand,
      highestBand,
      altSpan,
      zMinM,
      zMaxM,
      label,
      isDegenerate,
    });
  }

  return results;
}

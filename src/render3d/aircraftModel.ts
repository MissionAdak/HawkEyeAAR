import * as THREE from 'three';

/**
 * Base notional wingspan in native geometry units.
 */
export const BASE_WINGSPAN_M = 4.4;

/**
 * Bounds for distance-dependent screen-space scaling to guarantee
 * aircraft silhouettes remain recognizable without either vanishing or dominating.
 */
export const MIN_AIRCRAFT_SCALE = 15;
export const MAX_AIRCRAFT_SCALE = 140;
export const TARGET_PIXEL_SIZE = 32;

/**
 * Constructs a solid 3D tactical aerial-vehicle (UAV) body geometry:
 * Fuselage, swept wings, winglets, and twin V-tail stabilizers.
 * Reusable across tracks with zero external assets.
 */
export function createAircraftBodyGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  // Positions in Three.js coords (+X=East/Right, +Y=Up, -Z=North/Forward)
  const v: [number, number, number][] = [
    // --- Fuselage ---
    /* 0 */ [0, 0.0, -1.8],       // Nose tip
    /* 1 */ [0, 0.35, -0.6],      // Mid spine top
    /* 2 */ [0, -0.22, -0.6],     // Mid belly bottom
    /* 3 */ [-0.38, 0.05, -0.6],  // Mid port shoulder
    /* 4 */ [0.38, 0.05, -0.6],   // Mid starboard shoulder
    /* 5 */ [0, 0.22, 0.8],       // Aft spine top
    /* 6 */ [0, -0.15, 0.8],      // Aft belly bottom
    /* 7 */ [-0.25, 0.05, 0.8],   // Aft port flank
    /* 8 */ [0.25, 0.05, 0.8],    // Aft starboard flank
    /* 9 */ [0, 0.05, 1.45],      // Tail cone tip

    // --- Port (Left) Wing ---
    /* 10 */ [-0.38, 0.08, -0.5], // Port root upper leading
    /* 11 */ [-2.25, 0.12, 0.1],  // Port tip leading
    /* 12 */ [-2.15, 0.12, 0.6],  // Port tip trailing
    /* 13 */ [-0.25, 0.08, 0.5],  // Port root upper trailing
    /* 14 */ [-0.38, 0.02, -0.5], // Port root lower leading
    /* 15 */ [-2.25, 0.06, 0.1],  // Port tip lower leading
    /* 16 */ [-2.15, 0.06, 0.6],  // Port tip lower trailing
    /* 17 */ [-0.25, 0.02, 0.5],  // Port root lower trailing

    // --- Starboard (Right) Wing ---
    /* 18 */ [0.38, 0.08, -0.5],  // Starboard root upper leading
    /* 19 */ [2.25, 0.12, 0.1],   // Starboard tip leading
    /* 20 */ [2.15, 0.12, 0.6],   // Starboard tip trailing
    /* 21 */ [0.25, 0.08, 0.5],   // Starboard root upper trailing
    /* 22 */ [0.38, 0.02, -0.5],  // Starboard root lower leading
    /* 23 */ [2.25, 0.06, 0.1],   // Starboard tip lower leading
    /* 24 */ [2.15, 0.06, 0.6],   // Starboard tip lower trailing
    /* 25 */ [0.25, 0.02, 0.5],   // Starboard root lower trailing

    // --- Port Winglet ---
    /* 26 */ [-2.28, 0.48, 0.25], // Port winglet top leading
    /* 27 */ [-2.22, 0.45, 0.58], // Port winglet top trailing

    // --- Starboard Winglet ---
    /* 28 */ [2.28, 0.48, 0.25],  // Starboard winglet top leading
    /* 29 */ [2.22, 0.45, 0.58],  // Starboard winglet top trailing

    // --- Port V-Tail Fin ---
    /* 30 */ [-0.15, 0.18, 0.55], // Port root leading
    /* 31 */ [-0.10, 0.15, 1.20], // Port root trailing
    /* 32 */ [-0.55, 0.85, 1.10], // Port tip leading
    /* 33 */ [-0.48, 0.80, 1.42], // Port tip trailing

    // --- Starboard V-Tail Fin ---
    /* 34 */ [0.15, 0.18, 0.55],  // Starboard root leading
    /* 35 */ [0.10, 0.15, 1.20],  // Starboard root trailing
    /* 36 */ [0.55, 0.85, 1.10],  // Starboard tip leading
    /* 37 */ [0.48, 0.80, 1.42],  // Starboard tip trailing
  ];

  const positions: number[] = [];
  for (const pt of v) {
    positions.push(pt[0], pt[1], pt[2]);
  }

  const indices: number[] = [];
  function addQuad(a: number, b: number, c: number, d: number) {
    // Double-sided indices for rock-solid visual fidelity
    indices.push(a, b, c, a, c, d, a, c, b, a, d, c);
  }
  function addTri(a: number, b: number, c: number) {
    indices.push(a, b, c, a, c, b);
  }

  // Fuselage forward cone
  addTri(0, 1, 3); // Nose - top - left
  addTri(0, 4, 1); // Nose - right - top
  addTri(0, 3, 2); // Nose - left - bottom
  addTri(0, 2, 4); // Nose - bottom - right

  // Fuselage mid section
  addQuad(1, 5, 7, 3); // Top-left flank
  addQuad(1, 4, 8, 5); // Top-right flank
  addQuad(2, 3, 7, 6); // Bottom-left flank
  addQuad(2, 6, 8, 4); // Bottom-right flank

  // Fuselage aft cone
  addTri(5, 9, 7); // Aft top-left
  addTri(5, 8, 9); // Aft top-right
  addTri(6, 7, 9); // Aft bottom-left
  addTri(6, 9, 8); // Aft bottom-right

  // Port Wing
  addQuad(10, 11, 12, 13); // Upper surface
  addQuad(14, 17, 16, 15); // Lower surface
  addQuad(10, 14, 15, 11); // Leading edge
  addQuad(13, 12, 16, 17); // Trailing edge

  // Starboard Wing
  addQuad(18, 21, 20, 19); // Upper surface
  addQuad(22, 23, 24, 25); // Lower surface
  addQuad(18, 19, 23, 22); // Leading edge
  addQuad(21, 25, 24, 20); // Trailing edge

  // Port Winglet
  addQuad(11, 26, 27, 12);

  // Starboard Winglet
  addQuad(19, 20, 29, 28);

  // Port V-Tail Fin
  addQuad(30, 32, 33, 31);

  // Starboard V-Tail Fin
  addQuad(34, 35, 37, 36);

  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Constructs accent geometry for the aircraft (nose sensor turret and cockpit canopy ridge).
 */
export function createAircraftAccentGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const v: [number, number, number][] = [
    // Canopy ridge on top
    /* 0 */ [0, 0.42, -0.6],     // Canopy apex
    /* 1 */ [0, 0.22, -1.2],     // Canopy nose
    /* 2 */ [-0.18, 0.22, -0.6], // Canopy port
    /* 3 */ [0.18, 0.22, -0.6],  // Canopy starboard
    /* 4 */ [0, 0.28, 0.0],      // Canopy aft
    // Sensor turret ball under nose
    /* 5 */ [0, -0.16, -1.0],    // Turret center
    /* 6 */ [-0.12, -0.28, -1.0],// Turret port
    /* 7 */ [0.12, -0.28, -1.0], // Turret starboard
    /* 8 */ [0, -0.32, -0.9],    // Turret front
    /* 9 */ [0, -0.32, -1.1],    // Turret rear
  ];

  const positions: number[] = [];
  for (const pt of v) {
    positions.push(pt[0], pt[1], pt[2]);
  }

  const indices: number[] = [];
  function addTri(a: number, b: number, c: number) {
    indices.push(a, b, c, a, c, b);
  }

  // Canopy
  addTri(0, 1, 2);
  addTri(0, 3, 1);
  addTri(0, 2, 4);
  addTri(0, 4, 3);

  // Sensor ball
  addTri(5, 8, 6);
  addTri(5, 7, 8);
  addTri(5, 9, 7);
  addTri(5, 6, 9);

  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates an invisible collision proxy geometry for fast, robust 3D raycast hit testing.
 * Encompasses the entire aircraft with a forgiving target radius.
 */
export function createAircraftHitProxyGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(2.6, 12, 10);
}

/**
 * Computes the distance-dependent / screen-space scale factor for an aircraft at targetDistance
 * so that its apparent screen-space silhouette stays within [24, 40] CSS pixels across all zoom levels.
 */
export function calculateScreenSpaceScale(
  cameraFovDeg: number,
  targetDistanceM: number,
  viewportHeightPx: number = 520,
  targetPixelSize: number = TARGET_PIXEL_SIZE
): number {
  const fovRad = (cameraFovDeg * Math.PI) / 180;
  const metersPerPixel = (2 * targetDistanceM * Math.tan(fovRad / 2)) / Math.max(1, viewportHeightPx);
  const targetWorldSize = targetPixelSize * metersPerPixel;
  const scale = targetWorldSize / BASE_WINGSPAN_M;
  return Math.max(MIN_AIRCRAFT_SCALE, Math.min(MAX_AIRCRAFT_SCALE, scale));
}

/**
 * Derives aircraft orientation (heading and climb/dive pitch) from safe velocity vector.
 * Employs stable fallback when horizontal velocity is near zero to prevent NaN or flicker.
 */
export function calculateAircraftOrientation(
  vel: { x: number; y: number; z: number },
  fallbackHeadingRad: number = 0
): { headingRad: number; pitchRad: number } {
  const speedH = Math.hypot(vel.x, vel.y);

  if (speedH < 0.5) {
    return {
      headingRad: fallbackHeadingRad,
      pitchRad: 0,
    };
  }

  // Simulation coordinates: +x = East, +y = North
  // headingRad: 0 = North, pi/2 = East, pi = South, -pi/2 = West
  const headingRad = Math.atan2(vel.x, vel.y);
  // Pitch angle (climb is positive, dive is negative)
  const pitchRad = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, Math.atan2(vel.z, speedH)));

  return { headingRad, pitchRad };
}

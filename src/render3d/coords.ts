import * as THREE from 'three';

/**
 * Coordinate transformations between DRISHTI-CUAS simulation space and Three.js 3D space.
 *
 * DRISHTI-CUAS Simulation space:
 *   +x = East (meters)
 *   +y = North (meters)
 *   +z = Altitude (meters above ground level)
 *
 * Three.js standard 3D space:
 *   +X = East (meters)
 *   +Y = Altitude / Up (meters)
 *   -Z = North (meters)
 *   +Z = South (meters, towards default camera)
 *
 * Invariant:
 *   toThree(x, y, z) = (x, z, -y)
 *   toSim(X, Y, Z)   = (X, -Z, Y)
 */

export interface SimPoint {
  x: number;
  y: number;
  z: number;
}

export function toThree(x: number, y: number, z: number = 0): THREE.Vector3 {
  return new THREE.Vector3(x, z, -y);
}

export function toThreeCoords(sim: SimPoint): THREE.Vector3 {
  return new THREE.Vector3(sim.x, sim.z, -sim.y);
}

export function toSimCoords(three: THREE.Vector3): SimPoint {
  return {
    x: three.x,
    y: -three.z,
    z: three.y,
  };
}

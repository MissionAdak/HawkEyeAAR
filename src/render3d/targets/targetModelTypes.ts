import * as THREE from 'three';
import type { TrackClass } from '@/sim/types';

/**
 * Recognized visual categories for 3D aerial target models.
 * Strictly bounded by SIH PS 26247 Counter-UAS scope:
 * Multi-rotors, reconnaissance drones, swarm elements, loitering munitions,
 * civilian UAVs, friendly drones, birds, and unclassified contacts.
 *
 * (No fighter aircraft, no ballistic missiles, no out-of-scope heavy munitions).
 */
export type TargetModelCategory =
  | 'UNKNOWN'
  | 'HOSTILE_ATTACK'
  | 'HOSTILE_ISR'
  | 'SWARM_ELEMENT'
  | 'CIVIL_UAS'
  | 'FRIENDLY'
  | 'BIRD'
  | 'LOITERING_MUNITION'
  | 'RADAR_SYMBOL'
  | 'UNKNOWN_AIRFRAME'
  | 'OBSERVED_MULTIROTOR'
  | 'OBSERVED_FIXED_WING';

export interface BuiltTargetModel {
  category: TargetModelCategory;
  /** Root group containing the aircraft model */
  group: THREE.Group;
  /** Optional alias for root group */
  rootGroup?: THREE.Group;
  /** Main body mesh or wireframe outline */
  bodyMesh: THREE.Mesh | THREE.LineSegments;
  /** Symbology/accent mesh (canopy, turret, markings) */
  accentMesh: THREE.Mesh;
  /** Optional animated rotor or prop elements */
  animatedComponents?: THREE.Object3D[];
  /** Forgiving hit proxy sphere for 3D raycast picking */
  hitProxy: THREE.Mesh;
  /** Disposables for clean resource teardown */
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
  };
}

export interface TargetModelPalette {
  body: THREE.Material;
  accent: THREE.Material;
  rotors?: THREE.Material;
  hitProxy: THREE.Material;
}

export interface TargetModelOptions {
  category: TargetModelCategory;
  traineeLabel: TrackClass | null;
  trackNo: string;
  isLowFidelity?: boolean;
}

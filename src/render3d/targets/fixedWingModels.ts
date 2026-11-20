import * as THREE from 'three';
import type { BuiltTargetModel, TargetModelPalette } from './targetModelTypes';

/**
 * Procedural Fixed-Wing / Delta-Wing Loitering Munition UAV Model.
 * Features:
 * - Swept delta-wing geometry.
 * - Slender central fuselage with nose seeker optic.
 * - Twin vertical stabilizers.
 * - Rear pusher propeller spinner.
 */
export function buildLoiteringMunitionModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Loitering_Munition';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Fuselage and Delta-Wing Geometry
  const bodyGeom = new THREE.BufferGeometry();
  // Three.js coords: +X=East/Right, +Y=Up, -Z=Forward, +Z=Aft
  const v: [number, number, number][] = [
    /* 0 */ [0, 0.0, -1.9],       // Nose seeker tip
    /* 1 */ [0, 0.22, -0.8],      // Upper spine
    /* 2 */ [0, -0.16, -0.8],     // Lower belly
    /* 3 */ [-0.28, 0.04, -0.7],  // Port shoulder
    /* 4 */ [0.28, 0.04, -0.7],   // Starboard shoulder
    /* 5 */ [0, 0.18, 0.8],       // Aft spine
    /* 6 */ [0, -0.12, 0.8],      // Aft belly
    /* 7 */ [-0.22, 0.04, 0.8],   // Aft port
    /* 8 */ [0.22, 0.04, 0.8],    // Aft starboard
    /* 9 */ [0, 0.04, 1.3],       // Pusher motor hub
    // Swept Delta Wings
    /* 10 */ [-2.3, 0.08, 0.6],   // Port wingtip leading
    /* 11 */ [-2.1, 0.08, 0.9],   // Port wingtip trailing
    /* 12 */ [2.3, 0.08, 0.6],    // Starboard wingtip leading
    /* 13 */ [2.1, 0.08, 0.9],    // Starboard wingtip trailing
    // Twin Vertical Fins
    /* 14 */ [-0.6, 0.65, 0.7],   // Port fin tip
    /* 15 */ [-0.5, 0.60, 0.95],  // Port fin trailing
    /* 16 */ [0.6, 0.65, 0.7],    // Starboard fin tip
    /* 17 */ [0.5, 0.60, 0.95],   // Starboard fin trailing
  ];

  const positions: number[] = [];
  for (const pt of v) {
    positions.push(pt[0], pt[1], pt[2]);
  }

  const indices: number[] = [];
  function addTri(a: number, b: number, c: number) {
    indices.push(a, b, c, a, c, b);
  }
  function addQuad(a: number, b: number, c: number, d: number) {
    indices.push(a, b, c, a, c, d, a, c, b, a, d, c);
  }

  // Forward nose cone
  addTri(0, 1, 3);
  addTri(0, 4, 1);
  addTri(0, 3, 2);
  addTri(0, 2, 4);

  // Mid fuselage
  addQuad(1, 5, 7, 3);
  addQuad(1, 4, 8, 5);
  addQuad(2, 3, 7, 6);
  addQuad(2, 6, 8, 4);

  // Aft tail cone
  addTri(5, 9, 7);
  addTri(5, 8, 9);
  addTri(6, 7, 9);
  addTri(6, 9, 8);

  // Port Delta Wing
  addQuad(3, 10, 11, 7);
  // Starboard Delta Wing
  addQuad(4, 8, 13, 12);

  // Port Vertical Fin
  addTri(7, 14, 15);
  // Starboard Vertical Fin
  addTri(8, 17, 16);

  bodyGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  bodyGeom.setIndex(indices);
  bodyGeom.computeVertexNormals();
  geometries.push(bodyGeom);

  const bodyMesh = new THREE.Mesh(bodyGeom, palette.body);
  group.add(bodyMesh);

  // Nose Seeker Optic Dome (Accent)
  const seekerGeom = new THREE.SphereGeometry(0.16, 8, 8);
  geometries.push(seekerGeom);
  const accentMesh = new THREE.Mesh(seekerGeom, palette.accent);
  accentMesh.position.set(0, 0, -1.82);
  group.add(accentMesh);

  // Rear Pusher Propeller Disc
  const propGeom = new THREE.CircleGeometry(0.4, 12);
  geometries.push(propGeom);
  const propMesh = new THREE.Mesh(propGeom, palette.rotors ?? palette.accent);
  propMesh.position.set(0, 0.04, 1.35);
  group.add(propMesh);

  // Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.6, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'HOSTILE_ATTACK',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

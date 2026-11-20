import * as THREE from 'three';

/**
 * Procedural geometry generators for tactical aerial contacts.
 * Built entirely in Three.js BufferGeometry with zero external asset dependencies.
 *
 * Coordinate Convention (Three.js standard):
 * +X = East / Right
 * +Y = Altitude / Up
 * -Z = Forward / North
 * +Z = Aft / South
 */

/**
 * Creates a 4-arm X-frame quadcopter chassis with a central avionics bay.
 */
export function createQuadcopterFrameGeometry(armSpanM: number = 1.6, tubeRadiusM: number = 0.05): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const halfSpan = armSpanM / 2;

  // Diagonal cross tubes from corner to corner
  // Arm 1: Front-Left (-halfSpan, -halfSpan) to Rear-Right (+halfSpan, +halfSpan)
  // Arm 2: Front-Right (+halfSpan, -halfSpan) to Rear-Left (-halfSpan, +halfSpan)
  const vertices: number[] = [
    // Arm 1 (diagonal)
    -halfSpan, 0, -halfSpan,
     halfSpan, 0,  halfSpan,
    // Arm 2 (diagonal)
     halfSpan, 0, -halfSpan,
    -halfSpan, 0,  halfSpan,
    // Motor mount pillars
    -halfSpan, -tubeRadiusM * 2, -halfSpan,
    -halfSpan,  tubeRadiusM * 2, -halfSpan,
     halfSpan, -tubeRadiusM * 2, -halfSpan,
     halfSpan,  tubeRadiusM * 2, -halfSpan,
    -halfSpan, -tubeRadiusM * 2,  halfSpan,
    -halfSpan,  tubeRadiusM * 2,  halfSpan,
     halfSpan, -tubeRadiusM * 2,  halfSpan,
     halfSpan,  tubeRadiusM * 2,  halfSpan,
  ];

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geom;
}

/**
 * Creates 4 translucent rotor discs positioned at the tips of a quadcopter.
 */
export function createRotorDiscsGeometry(armSpanM: number = 1.6, rotorRadiusM: number = 0.35): THREE.BufferGeometry {
  const halfSpan = armSpanM / 2;
  const segments = 12;
  const positions: number[] = [];
  const indices: number[] = [];

  const motorPositions = [
    [-halfSpan, 0.08, -halfSpan],
    [ halfSpan, 0.08, -halfSpan],
    [-halfSpan, 0.08,  halfSpan],
    [ halfSpan, 0.08,  halfSpan],
  ];

  let vertexOffset = 0;
  for (const [mx, my, mz] of motorPositions) {
    const centerIdx = vertexOffset;
    positions.push(mx, my, mz);
    vertexOffset++;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const rx = mx + Math.cos(angle) * rotorRadiusM;
      const rz = mz + Math.sin(angle) * rotorRadiusM;
      positions.push(rx, my, rz);
      vertexOffset++;

      const nextI = (i + 1) % segments;
      const currIdx = centerIdx + 1 + i;
      const nextIdx = centerIdx + 1 + nextI;

      // Double sided disc
      indices.push(centerIdx, currIdx, nextIdx);
      indices.push(centerIdx, nextIdx, currIdx);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates protective ring guards around each rotor.
 */
export function createRotorGuardsGeometry(armSpanM: number = 1.6, guardRadiusM: number = 0.4): THREE.BufferGeometry {
  const halfSpan = armSpanM / 2;
  const segments = 16;
  const positions: number[] = [];

  const motorPositions = [
    [-halfSpan, 0.06, -halfSpan],
    [ halfSpan, 0.06, -halfSpan],
    [-halfSpan, 0.06,  halfSpan],
    [ halfSpan, 0.06,  halfSpan],
  ];

  for (const [mx, my, mz] of motorPositions) {
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      positions.push(
        mx + Math.cos(a1) * guardRadiusM, my, mz + Math.sin(a1) * guardRadiusM,
        mx + Math.cos(a2) * guardRadiusM, my, mz + Math.sin(a2) * guardRadiusM
      );
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

/**
 * Procedural bird silhouette: sleek aerodynamic body, wings with dihedral, and fan tail.
 */
export function createBirdBodyGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  // Bird vertices in Three.js coords (+X=Right, +Y=Up, -Z=Forward/Beak)
  const v: [number, number, number][] = [
    /* 0 */ [0, 0.0, -1.2],       // Beak tip
    /* 1 */ [0, 0.20, -0.4],      // Head/chest top
    /* 2 */ [0, -0.15, -0.4],     // Breast bottom
    /* 3 */ [-0.22, 0.05, -0.3],  // Left shoulder
    /* 4 */ [0.22, 0.05, -0.3],   // Right shoulder
    /* 5 */ [0, 0.12, 0.4],       // Mid back
    /* 6 */ [0, -0.10, 0.4],      // Belly
    /* 7 */ [0, 0.05, 0.9],       // Tail base
    // Left Wing (curved, dihedral)
    /* 8 */ [-1.2, 0.35, 0.0],    // Left mid wing
    /* 9 */ [-2.1, 0.55, 0.3],    // Left wingtip
    /* 10 */ [-1.8, 0.45, 0.6],   // Left wing trailing tip
    /* 11 */ [-0.3, 0.08, 0.4],   // Left wing root trailing
    // Right Wing
    /* 12 */ [1.2, 0.35, 0.0],    // Right mid wing
    /* 13 */ [2.1, 0.55, 0.3],    // Right wingtip
    /* 14 */ [1.8, 0.45, 0.6],    // Right wing trailing tip
    /* 15 */ [0.3, 0.08, 0.4],    // Right wing root trailing
    // Tail Fan
    /* 16 */ [-0.45, 0.15, 1.4],  // Left tail tip
    /* 17 */ [0, 0.18, 1.5],      // Center tail tip
    /* 18 */ [0.45, 0.15, 1.4],   // Right tail tip
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

  // Torso
  addTri(0, 1, 3);
  addTri(0, 4, 1);
  addTri(0, 3, 2);
  addTri(0, 2, 4);

  addQuad(1, 5, 7, 3);
  addQuad(1, 4, 7, 5);
  addQuad(2, 3, 7, 6);
  addQuad(2, 6, 7, 4);

  // Left wing
  addQuad(3, 8, 10, 11);
  addTri(8, 9, 10);

  // Right wing
  addQuad(4, 15, 14, 12);
  addTri(12, 14, 13);

  // Tail fan
  addTri(7, 16, 17);
  addTri(7, 17, 18);

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Neutral tactical beacon geometry for unknown or unclassified contacts.
 * Octahedral rhomboid with inset facets that obscures the true vehicle architecture.
 */
export function createUnknownContactGeometry(sizeM: number = 1.8): THREE.BufferGeometry {
  const geom = new THREE.OctahedronGeometry(sizeM * 0.7, 0);
  geom.scale(0.8, 1.3, 0.8);
  return geom;
}

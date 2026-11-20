import * as THREE from 'three';

export interface NeutralizationVisual {
  group: THREE.Group;
  update(progress: number): void;
  dispose(): void;
}

/**
 * Creates a tactical neutralization visual (small energy spark ring, core flash, and fading dissipation).
 * Strictly non-graphic and restrained per Task 17 Phase 2.7.
 */
export function createNeutralizationVisual(centerPos: THREE.Vector3, isNeutralized: boolean): NeutralizationVisual {
  const group = new THREE.Group();
  group.position.copy(centerPos);

  const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
    geometries: [],
    materials: [],
  };

  if (isNeutralized) {
    // 1. Brief expanding flash core
    const flashGeom = new THREE.SphereGeometry(1.5, 8, 8);
    disposables.geometries.push(flashGeom);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    disposables.materials.push(flashMat);
    const flashMesh = new THREE.Mesh(flashGeom, flashMat);
    group.add(flashMesh);

    // 2. Expanding tactical energy ring
    const ringGeom = new THREE.RingGeometry(1, 1.4, 24);
    ringGeom.rotateX(Math.PI / 2);
    disposables.geometries.push(ringGeom);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    disposables.materials.push(ringMat);
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    group.add(ringMesh);

    // 3. Spark particle points
    const sparkCount = 16;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const theta = (i / sparkCount) * Math.PI * 2;
      const phi = ((i % 4) / 4) * Math.PI - Math.PI / 2;
      sparkVelocities.push(
        new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * 45,
          Math.sin(phi) * 35 + 10,
          Math.sin(theta) * Math.cos(phi) * 45
        )
      );
    }
    const sparkGeom = new THREE.BufferGeometry();
    sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    disposables.geometries.push(sparkGeom);
    const sparkMat = new THREE.PointsMaterial({
      color: 0xff7700,
      size: 4,
      transparent: true,
      opacity: 0.85,
    });
    disposables.materials.push(sparkMat);
    const sparks = new THREE.Points(sparkGeom, sparkMat);
    group.add(sparks);

    return {
      group,
      update: (p: number) => {
        // Core flash peaks at p=0.1, fades out by p=0.4
        flashMesh.scale.setScalar(1 + p * 8);
        flashMat.opacity = Math.max(0, 1 - p * 2.5);

        // Ring expands from 1m to 25m
        ringMesh.scale.setScalar(1 + p * 18);
        ringMat.opacity = Math.max(0, 0.8 - p * 0.9);

        // Sparks travel outward
        const posAttr = sparkGeom.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < sparkCount; i++) {
          const v = sparkVelocities[i];
          posAttr.setXYZ(i, v.x * p, v.y * p - 9.8 * p * p * 0.5, v.z * p);
        }
        posAttr.needsUpdate = true;
        sparkMat.opacity = Math.max(0, 1 - p);
      },
      dispose: () => {
        for (const g of disposables.geometries) g.dispose();
        for (const m of disposables.materials) m.dispose();
      },
    };
  } else {
    // Ineffective / miss visual: brief deflection sparks and rapid dissipative fade
    const missGeom = new THREE.SphereGeometry(0.8, 6, 6);
    disposables.geometries.push(missGeom);
    const missMat = new THREE.MeshBasicMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    disposables.materials.push(missMat);
    const missMesh = new THREE.Mesh(missGeom, missMat);
    group.add(missMesh);

    return {
      group,
      update: (p: number) => {
        missMesh.scale.setScalar(1 + p * 4);
        missMat.opacity = Math.max(0, 0.6 - p * 1.5);
      },
      dispose: () => {
        for (const g of disposables.geometries) g.dispose();
        for (const m of disposables.materials) m.dispose();
      },
    };
  }
}

import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { toThree } from '../coords';

export interface VegetationBuildResult {
  group: THREE.Group;
  objects: EnvironmentObjectInfo[];
  selectableMeshes: THREE.Object3D[];
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

/**
 * Builds low-poly procedural vegetation using InstancedMesh for minimal draw calls.
 * Adheres strictly to deterministic seeded positioning.
 */
export function buildProceduralVegetation(descriptor: EnvironmentDescriptor): VegetationBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralVegetation';
  const objects: EnvironmentObjectInfo[] = [];
  const selectableMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const { preset, zones, seed } = descriptor;

  // Shared Geometries
  const trunkGeom = new THREE.CylinderGeometry(0.8, 1.4, 6, 5);
  trunkGeom.translate(0, 3, 0);
  const coniferGeom = new THREE.ConeGeometry(5, 14, 5);
  coniferGeom.translate(0, 12, 0);
  const broadGeom = new THREE.DodecahedronGeometry(6, 0);
  broadGeom.translate(0, 11, 0);

  geometries.push(trunkGeom, coniferGeom, broadGeom);

  // Shared Materials
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f, flatShading: true });
  const coniferMat = new THREE.MeshLambertMaterial({ color: 0x16331e, flatShading: true });
  const broadMat = new THREE.MeshLambertMaterial({ color: 0x1b3c22, flatShading: true });

  materials.push(trunkMat, coniferMat, broadMat);

  // Collect tree placement positions (in Three.js world space)
  interface TreeInstance {
    x: number;
    z: number;
    scale: number;
    isConifer: boolean;
  }
  const treePositions: TreeInstance[] = [];

  // 1. Forest Zones: populate trees within zone polygons
  for (const zone of zones) {
    if (zone.type === 'FOREST') {
      const minX = Math.min(...zone.polygon.map((p) => p[0]));
      const maxX = Math.max(...zone.polygon.map((p) => p[0]));
      const minY = Math.min(...zone.polygon.map((p) => p[1]));
      const maxY = Math.max(...zone.polygon.map((p) => p[1]));

      const width = maxX - minX;
      const depth = maxY - minY;
      const count = Math.min(120, Math.max(30, Math.floor((width * depth) / 14000)));

      // Deterministic pseudo-random generation based on seed & zone
      let localSeed = Math.abs(seed + 101);
      const lcg = (): number => {
        localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
        return localSeed / 4294967296;
      };

      for (let i = 0; i < count; i++) {
        const simX = minX + lcg() * width;
        const simY = minY + lcg() * depth;
        const threePos = toThree(simX, simY, 0);

        treePositions.push({
          x: threePos.x,
          z: threePos.z,
          scale: 0.8 + lcg() * 0.5,
          isConifer: lcg() > 0.4,
        });
      }

      // Register Forest Zone as an inspectable vegetation area
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const proxyGeom = new THREE.BoxGeometry(width * 0.9, zone.heightM, depth * 0.9);
      geometries.push(proxyGeom);
      const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      materials.push(proxyMat);

      const proxyMesh = new THREE.Mesh(proxyGeom, proxyMat);
      const proxyThree = toThree(centerX, centerY, 0);
      proxyMesh.position.set(proxyThree.x, zone.heightM / 2, proxyThree.z);
      group.add(proxyMesh);

      const forestInfo: EnvironmentObjectInfo = {
        id: `FOREST-ZONE-${zone.id}`,
        name: `Dense Woodland Sector ${zone.id}`,
        category: 'VEGETATION',
        preset,
        zoneId: zone.id,
        position: { x: centerX, y: centerY, z: 0 },
        heightM: zone.heightM,
        maskingProperties: {
          heightM: zone.heightM,
          shadowM: zone.shadowM,
          rho: zone.rho,
          zoneType: 'FOREST',
        },
        isObstructionEnvelope: false,
        description: `Dense coniferous canopy with ${count} mature trees. Provides natural RF and optical attenuation.`,
      };
      proxyMesh.userData = {
        isEnvironmentObject: true,
        envObjectId: forestInfo.id,
        envObjectInfo: forestInfo,
      };
      objects.push(forestInfo);
      selectableMeshes.push(proxyMesh);
    }
  }

  // 2. Additional environmental trees for presets (including urban parks, boulevards & hill slopes)
  if (preset === 'FOREST_VALLEY' || preset === 'SUBURBAN' || preset === 'OPEN_RURAL' || preset === 'URBAN_DENSE') {
    let localSeed = Math.abs(seed + 997);
    const lcg = (): number => {
      localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
      return localSeed / 4294967296;
    };

    const clusters = preset === 'FOREST_VALLEY' ? 5 : preset === 'URBAN_DENSE' ? 4 : 2;
    for (let c = 0; c < clusters; c++) {
      const clusterAngle = (c / clusters) * Math.PI * 2 + lcg() * 0.5;
      const clusterDist = preset === 'URBAN_DENSE' ? 900 + lcg() * 1200 : 1400 + lcg() * 1800;
      const clusterSimX = Math.cos(clusterAngle) * clusterDist;
      const clusterSimY = Math.sin(clusterAngle) * clusterDist;
      const clusterThree = toThree(clusterSimX, clusterSimY, 0);

      const clusterTreeCount = preset === 'URBAN_DENSE' ? 18 : 15;
      for (let t = 0; t < clusterTreeCount; t++) {
        const offX = (lcg() - 0.5) * 160;
        const offZ = (lcg() - 0.5) * 160;
        treePositions.push({
          x: clusterThree.x + offX,
          z: clusterThree.z + offZ,
          scale: 0.75 + lcg() * 0.45,
          isConifer: preset === 'URBAN_DENSE' ? lcg() > 0.7 : lcg() > 0.5,
        });
      }

      // Add selectable cluster proxy
      const clProxyGeom = new THREE.CylinderGeometry(80, 80, 16, 8);
      geometries.push(clProxyGeom);
      const clProxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      materials.push(clProxyMat);
      const clMesh = new THREE.Mesh(clProxyGeom, clProxyMat);
      clMesh.position.set(clusterThree.x, 8, clusterThree.z);
      group.add(clMesh);

      const clInfo: EnvironmentObjectInfo = {
        id: `VEGETATION-CLUSTER-${c + 1}`,
        name: preset === 'URBAN_DENSE' ? `Urban Park Grove & Green Belt ${c + 1}` : `Vegetation Cluster ${c + 1}`,
        category: 'VEGETATION',
        preset,
        position: { x: clusterSimX, y: clusterSimY, z: 0 },
        heightM: 16,
        isObstructionEnvelope: false,
        description: preset === 'URBAN_DENSE'
          ? 'Metropolitan urban park grove and roadside tree canopy.'
          : 'Scattered tree cluster along tactical sector boundaries.',
      };
      clMesh.userData = {
        isEnvironmentObject: true,
        envObjectId: clInfo.id,
        envObjectInfo: clInfo,
      };
      objects.push(clInfo);
      selectableMeshes.push(clMesh);
    }

    // For URBAN_DENSE, also add tree-lined avenues along primary roadways
    if (preset === 'URBAN_DENSE') {
      // Along North-South Expressway (X = 350m, boulevard margins at X=324 and X=376)
      for (let z = -2400; z <= 2400; z += 90) {
        if (Math.abs(z + 300) < 60) continue; // Skip intersection with EW highway
        treePositions.push(
          { x: 324, z, scale: 0.75, isConifer: false },
          { x: 376, z, scale: 0.75, isConifer: false }
        );
      }
      // Along East-West Metropolitan Highway (Z = -300m, margins at Z=-276 and Z=-324)
      for (let x = -2400; x <= 2400; x += 90) {
        if (Math.abs(x - 350) < 60) continue; // Skip intersection with NS highway
        treePositions.push(
          { x, z: -276, scale: 0.75, isConifer: false },
          { x, z: -324, scale: 0.75, isConifer: false }
        );
      }
    }
  }

  // 3. Instantiate InstancedMesh for All Collected Trees
  if (treePositions.length > 0) {
    const totalTrees = treePositions.length;
    const coniferCount = treePositions.filter((t) => t.isConifer).length;
    const broadCount = totalTrees - coniferCount;

    // Trunks InstancedMesh (all trees)
    const trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, totalTrees);
    trunkMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Conifers InstancedMesh
    const coniferMesh = coniferCount > 0 ? new THREE.InstancedMesh(coniferGeom, coniferMat, coniferCount) : null;
    if (coniferMesh) coniferMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Broad Canopy InstancedMesh
    const broadMesh = broadCount > 0 ? new THREE.InstancedMesh(broadGeom, broadMat, broadCount) : null;
    if (broadMesh) broadMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const dummy = new THREE.Object3D();
    let coniferIdx = 0;
    let broadIdx = 0;

    for (let i = 0; i < totalTrees; i++) {
      const t = treePositions[i];
      dummy.position.set(t.x, 0, t.z);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.rotation.y = (i * 1.37) % (Math.PI * 2);
      dummy.updateMatrix();

      trunkMesh.setMatrixAt(i, dummy.matrix);

      if (t.isConifer && coniferMesh) {
        coniferMesh.setMatrixAt(coniferIdx++, dummy.matrix);
      } else if (!t.isConifer && broadMesh) {
        broadMesh.setMatrixAt(broadIdx++, dummy.matrix);
      }
    }

    trunkMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh);

    if (coniferMesh) {
      coniferMesh.instanceMatrix.needsUpdate = true;
      group.add(coniferMesh);
    }
    if (broadMesh) {
      broadMesh.instanceMatrix.needsUpdate = true;
      group.add(broadMesh);
    }
  }

  return { group, objects, selectableMeshes, disposables: { geometries, materials } };
}

import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { toThree } from '../coords';
import { getTerrainElevation } from './terrain';
import { resolveRandomBiome } from './descriptor';

export interface VegetationBuildResult {
  group: THREE.Group;
  objects: EnvironmentObjectInfo[];
  selectableMeshes: THREE.Object3D[];
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

export function buildProceduralVegetation(descriptor: EnvironmentDescriptor): VegetationBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralVegetation';

  const objects: EnvironmentObjectInfo[] = [];
  const selectableMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const { preset, visualProfile, zones, seed } = descriptor;
  let activeProfile = visualProfile;
  if (visualProfile === 'RANDOM_SEEDED_LANDSCAPE') {
    activeProfile = resolveRandomBiome(seed).visualProfile;
  }

  // Base materials for procedural trees
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
  const coniferMat = new THREE.MeshLambertMaterial({ color: 0x0f3b20, flatShading: true });
  const broadMat = new THREE.MeshLambertMaterial({ color: 0x1c4d29, flatShading: true });
  materials.push(trunkMat, coniferMat, broadMat);

  // Common geometries
  const trunkGeom = new THREE.CylinderGeometry(0.5, 0.9, 5, 5);
  trunkGeom.translate(0, 2.5, 0);
  geometries.push(trunkGeom);

  const coniferGeom = new THREE.ConeGeometry(3.5, 9, 5);
  coniferGeom.translate(0, 7.5, 0);
  geometries.push(coniferGeom);

  const broadGeom = new THREE.DodecahedronGeometry(4.2, 0);
  broadGeom.translate(0, 6.5, 0);
  geometries.push(broadGeom);

  const treePositions: Array<{ x: number; z: number; scale: number; isConifer: boolean }> = [];

  // 1. Process Scenario Masking Zones (Forest & Urban)
  const forestZones = zones.filter((z) => z.type === 'FOREST');
  for (const fz of forestZones) {
    if (fz.polygon.length < 3) continue;

    const minX = Math.min(...fz.polygon.map((p) => p[0]));
    const maxX = Math.max(...fz.polygon.map((p) => p[0]));
    const minY = Math.min(...fz.polygon.map((p) => p[1]));
    const maxY = Math.max(...fz.polygon.map((p) => p[1]));

    let lcgSeed = Math.abs(seed + (fz.polygon[0]?.[0] ?? 100));
    const nextRng = (): number => {
      lcgSeed = (lcgSeed * 1664525 + 1013904223) % 4294967296;
      return lcgSeed / 4294967296;
    };

    const numTrees = Math.min(60, Math.max(15, Math.floor(((maxX - minX) * (maxY - minY)) / 12000)));

    for (let i = 0; i < numTrees; i++) {
      const rx = minX + nextRng() * (maxX - minX);
      const ry = minY + nextRng() * (maxY - minY);
      const tPos = toThree(rx, ry, 0);

      treePositions.push({
        x: tPos.x,
        z: tPos.z,
        scale: 0.8 + nextRng() * 0.4,
        isConifer: nextRng() > 0.4,
      });
    }

    // Selectable bounding proxy for forest zone
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerThree = toThree(centerX, centerY, 0);

    const proxyGeom = new THREE.BoxGeometry(maxX - minX, 16, maxY - minY);
    geometries.push(proxyGeom);
    const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    materials.push(proxyMat);
    const proxyMesh = new THREE.Mesh(proxyGeom, proxyMat);
    proxyMesh.position.set(centerThree.x, 8, centerThree.z);
    group.add(proxyMesh);

    const vegInfo: EnvironmentObjectInfo = {
      id: `VEGETATION-FOREST-ZONE-${fz.id}`,
      name: `Forest Canopy Sector (${fz.id})`,
      category: 'VEGETATION',
      preset,
      zoneId: fz.id,
      position: { x: centerX, y: centerY, z: 0 },
      heightM: 16,
      isObstructionEnvelope: false,
      description: `Natural dense vegetation canopy in masking zone ${fz.id}.`,
    };
    proxyMesh.userData = {
      isEnvironmentObject: true,
      envObjectId: vegInfo.id,
      envObjectInfo: vegInfo,
    };
    objects.push(vegInfo);
    selectableMeshes.push(proxyMesh);
  }

  // 2. Scenario-Specific Environmental Trees & Groves
  let localSeed = Math.abs(seed + 997);
  const lcg = (): number => {
    localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
    return localSeed / 4294967296;
  };

  // Distinct cluster parameters per scenario visual profile
  if (activeProfile === 'SPECTRUM_FOREST_RIVER' || (!activeProfile && preset === 'FOREST_VALLEY')) {
    // Dense woodland: 7 forest clusters flanking the river
    const clusters = 7;
    for (let c = 0; c < clusters; c++) {
      const angle = (c / clusters) * Math.PI * 2 + lcg() * 0.4;
      const dist = 1100 + lcg() * 1900;
      const simX = Math.cos(angle) * dist;
      const simY = Math.sin(angle) * dist;
      const threePt = toThree(simX, simY, 0);

      const treesPerCluster = 22;
      for (let t = 0; t < treesPerCluster; t++) {
        treePositions.push({
          x: threePt.x + (lcg() - 0.5) * 220,
          z: threePt.z + (lcg() - 0.5) * 220,
          scale: 0.85 + lcg() * 0.4,
          isConifer: lcg() > 0.25, // 75% conifer, 25% broadleaf
        });
      }

      // Proxy
      const clGeom = new THREE.CylinderGeometry(110, 110, 16, 8);
      geometries.push(clGeom);
      const clMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      materials.push(clMat);
      const clMesh = new THREE.Mesh(clGeom, clMat);
      clMesh.position.set(threePt.x, 8, threePt.z);
      group.add(clMesh);

      const clInfo: EnvironmentObjectInfo = {
        id: `VEGETATION-FOREST-GROVE-${c + 1}`,
        name: `Coniferous Forest Grove ${c + 1}`,
        category: 'VEGETATION',
        preset,
        position: { x: simX, y: simY, z: 0 },
        heightM: 18,
        isObstructionEnvelope: false,
        description: 'Dense woodland stand of towering Scots pines and Siberian firs flanking the river basin.',
      };
      clMesh.userData = { isEnvironmentObject: true, envObjectId: clInfo.id };
      objects.push(clInfo);
      selectableMeshes.push(clMesh);
    }
  } else if (visualProfile === 'FORMATION_ALPINE_PASS') {
    // Sparse hardy alpine pines on lower mountain slopes
    const clusters = 4;
    for (let c = 0; c < clusters; c++) {
      const angle = (c / clusters) * Math.PI * 2 + 0.3;
      const dist = 1300 + lcg() * 1200;
      const simX = Math.cos(angle) * dist;
      const simY = Math.sin(angle) * dist;
      const threePt = toThree(simX, simY, 0);

      for (let t = 0; t < 12; t++) {
        treePositions.push({
          x: threePt.x + (lcg() - 0.5) * 140,
          z: threePt.z + (lcg() - 0.5) * 140,
          scale: 0.6 + lcg() * 0.3,
          isConifer: true, // 100% hardy alpine conifer
        });
      }
    }
  } else if (visualProfile === 'SWARM_MOUNTAIN_VALLEY') {
    // Sparse dry scrub on valley margins
    const clusters = 3;
    for (let c = 0; c < clusters; c++) {
      const angle = (c / clusters) * Math.PI * 2 + 0.8;
      const dist = 1400 + lcg() * 1200;
      const simX = Math.cos(angle) * dist;
      const simY = Math.sin(angle) * dist;
      const threePt = toThree(simX, simY, 0);

      for (let t = 0; t < 10; t++) {
        treePositions.push({
          x: threePt.x + (lcg() - 0.5) * 120,
          z: threePt.z + (lcg() - 0.5) * 120,
          scale: 0.55 + lcg() * 0.25,
          isConifer: lcg() > 0.5,
        });
      }
    }
  } else if (visualProfile === 'DEMO_1_URBAN_METRO' || preset === 'URBAN_DENSE') {
    // Urban parks & green belts
    const clusters = 4;
    for (let c = 0; c < clusters; c++) {
      const angle = (c / clusters) * Math.PI * 2 + lcg() * 0.5;
      const dist = 900 + lcg() * 1200;
      const simX = Math.cos(angle) * dist;
      const simY = Math.sin(angle) * dist;
      const threePt = toThree(simX, simY, 0);

      for (let t = 0; t < 18; t++) {
        treePositions.push({
          x: threePt.x + (lcg() - 0.5) * 160,
          z: threePt.z + (lcg() - 0.5) * 160,
          scale: 0.75 + lcg() * 0.45,
          isConifer: lcg() > 0.7,
        });
      }

      const clGeom = new THREE.CylinderGeometry(80, 80, 16, 8);
      geometries.push(clGeom);
      const clMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      materials.push(clMat);
      const clMesh = new THREE.Mesh(clGeom, clMat);
      clMesh.position.set(threePt.x, 8, threePt.z);
      group.add(clMesh);

      const clInfo: EnvironmentObjectInfo = {
        id: `VEGETATION-PARK-${c + 1}`,
        name: `Urban Park & Green Belt ${c + 1}`,
        category: 'VEGETATION',
        preset,
        position: { x: simX, y: simY, z: 0 },
        heightM: 16,
        isObstructionEnvelope: false,
        description: 'Metropolitan urban park grove and roadside tree canopy.',
      };
      clMesh.userData = { isEnvironmentObject: true, envObjectId: clInfo.id };
      objects.push(clInfo);
      selectableMeshes.push(clMesh);
    }

    // Tree-lined avenues along primary expressways
    for (let z = -2400; z <= 2400; z += 90) {
      if (Math.abs(z + 300) < 60) continue;
      treePositions.push(
        { x: 324, z, scale: 0.75, isConifer: false },
        { x: 376, z, scale: 0.75, isConifer: false }
      );
    }
    for (let x = -2400; x <= 2400; x += 90) {
      if (Math.abs(x - 350) < 60) continue;
      treePositions.push(
        { x, z: -276, scale: 0.75, isConifer: false },
        { x, z: -324, scale: 0.75, isConifer: false }
      );
    }
  } else if (activeProfile === 'POPUP_URBAN_CORRIDOR') {
    // Mid-rise street trees along urban avenues
    for (let z = -2200; z <= 2200; z += 110) {
      treePositions.push(
        { x: 384, z, scale: 0.7, isConifer: false },
        { x: -866, z, scale: 0.7, isConifer: false }
      );
    }
  } else if (activeProfile === 'DEMO_2_SUBURBAN_LOGISTICS' || (!activeProfile && preset === 'SUBURBAN')) {
    // Sparse perimeter trees around logistics park
    const clusters = 3;
    for (let c = 0; c < clusters; c++) {
      const angle = (c / clusters) * Math.PI * 2;
      const dist = 1400 + lcg() * 800;
      const simX = Math.cos(angle) * dist;
      const simY = Math.sin(angle) * dist;
      const threePt = toThree(simX, simY, 0);

      for (let t = 0; t < 12; t++) {
        treePositions.push({
          x: threePt.x + (lcg() - 0.5) * 140,
          z: threePt.z + (lcg() - 0.5) * 140,
          scale: 0.7 + lcg() * 0.35,
          isConifer: lcg() > 0.6,
        });
      }
    }
  } else if (activeProfile === 'PROCEDURAL_COASTAL_AIRFIELD' || (!activeProfile && preset === 'COASTAL_AIRFIELD')) {
    // Coastal scrub near airfield perimeter
    for (let t = 0; t < 25; t++) {
      treePositions.push({
        x: -900 + (lcg() - 0.5) * 400,
        z: 400 + (lcg() - 0.5) * 400,
        scale: 0.6 + lcg() * 0.3,
        isConifer: false,
      });
    }
  }

  // 3. Instantiate InstancedMesh for All Collected Trees with Ground Surface Elevation
  if (treePositions.length > 0) {
    const totalTrees = treePositions.length;
    const coniferCount = treePositions.filter((t) => t.isConifer).length;
    const broadCount = totalTrees - coniferCount;

    const trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, totalTrees);
    trunkMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const coniferMesh = coniferCount > 0 ? new THREE.InstancedMesh(coniferGeom, coniferMat, coniferCount) : null;
    if (coniferMesh) coniferMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const broadMesh = broadCount > 0 ? new THREE.InstancedMesh(broadGeom, broadMat, broadCount) : null;
    if (broadMesh) broadMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const dummy = new THREE.Object3D();
    let coniferIdx = 0;
    let broadIdx = 0;

    for (let i = 0; i < totalTrees; i++) {
      const t = treePositions[i];
      // Accurate terrain elevation sampling: Tree foundation sits directly on ground surface (Task 30 Fix E)
      const groundElev = getTerrainElevation(t.x, -t.z, activeProfile ?? preset, seed);

      dummy.position.set(t.x, groundElev - 1, t.z);
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

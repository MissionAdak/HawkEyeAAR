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

/**
 * Constructs procedural 3D coconut palm tree geometries:
 * 1. Curved, organic leaning trunk with natural oceanward lean.
 * 2. Radiating drooping tropical palm fronds with crown arch.
 * 3. Dense coconut clusters beneath the frond crown.
 */
function createCoconutPalmGeometries(): {
  palmTrunkGeom: THREE.BufferGeometry;
  palmCrownGeom: THREE.BufferGeometry;
  palmCoconutsGeom: THREE.BufferGeometry;
} {
  const trunkHeight = 11.0;
  const palmTrunkGeom = new THREE.CylinderGeometry(0.24, 0.46, trunkHeight, 8, 8);
  // Base at y = -0.5 (securely anchored in sand dune), top at y = 10.5
  palmTrunkGeom.translate(0, trunkHeight / 2 - 0.5, 0);
  const pos = palmTrunkGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const frac = Math.max(0, Math.min(1, (y + 0.5) / trunkHeight));
    // Curvature: leans toward -X (oceanward lean) by ~2.2m at the top
    const leanX = -Math.pow(frac, 1.5) * 2.2;
    // Subtle lateral sway
    const swayZ = Math.sin(frac * Math.PI) * 0.4;
    pos.setX(i, pos.getX(i) + leanX);
    pos.setZ(i, pos.getZ(i) + swayZ);
  }
  palmTrunkGeom.computeVertexNormals();

  // Tropical palm fronds radiating from crown center (-2.2, 10.5, 0)
  const crownPositions: number[] = [];
  const crownNormals: number[] = [];
  const crownUvs: number[] = [];
  const crownIndices: number[] = [];

  const numFronds = 8;
  const crownCenterX = -2.2;
  const crownCenterY = 10.5;
  const crownCenterZ = 0;

  for (let f = 0; f < numFronds; f++) {
    const angle = (f / numFronds) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpZ = cosA;

    const frondLen = 4.2;
    const archY = f % 2 === 0 ? 0.7 : 0.45;
    const droopY = -1.9;

    // Section 0: base
    const bX = crownCenterX;
    const bY = crownCenterY;
    const bZ = crownCenterZ;
    const bHalfW = 0.12;

    // Section 1: mid-arch
    const mDist = frondLen * 0.48;
    const mX = crownCenterX + cosA * mDist;
    const mY = crownCenterY + archY;
    const mZ = crownCenterZ + sinA * mDist;
    const mHalfW = 0.55;

    // Section 2: drooping tip
    const tDist = frondLen;
    const tX = crownCenterX + cosA * tDist;
    const tY = crownCenterY + droopY;
    const tZ = crownCenterZ + sinA * tDist;
    const tHalfW = 0.08;

    const baseIdx = crownPositions.length / 3;

    crownPositions.push(bX - perpX * bHalfW, bY, bZ - perpZ * bHalfW);
    crownPositions.push(bX + perpX * bHalfW, bY, bZ + perpZ * bHalfW);
    crownPositions.push(mX - perpX * mHalfW, mY, mZ - perpZ * mHalfW);
    crownPositions.push(mX + perpX * mHalfW, mY, mZ + perpZ * mHalfW);
    crownPositions.push(tX - perpX * tHalfW, tY, tZ - perpZ * tHalfW);
    crownPositions.push(tX + perpX * tHalfW, tY, tZ + perpZ * tHalfW);

    for (let v = 0; v < 6; v++) {
      crownNormals.push(0, 1, 0);
      crownUvs.push(v % 2, Math.floor(v / 2) / 2);
    }

    // Quad 1: Base to Mid
    crownIndices.push(baseIdx, baseIdx + 2, baseIdx + 1);
    crownIndices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);

    // Quad 2: Mid to Tip
    crownIndices.push(baseIdx + 2, baseIdx + 4, baseIdx + 3);
    crownIndices.push(baseIdx + 3, baseIdx + 4, baseIdx + 5);
  }

  const palmCrownGeom = new THREE.BufferGeometry();
  palmCrownGeom.setAttribute('position', new THREE.Float32BufferAttribute(crownPositions, 3));
  palmCrownGeom.setAttribute('normal', new THREE.Float32BufferAttribute(crownNormals, 3));
  palmCrownGeom.setAttribute('uv', new THREE.Float32BufferAttribute(crownUvs, 2));
  palmCrownGeom.setIndex(crownIndices);
  palmCrownGeom.computeVertexNormals();

  // 4 coconuts grouped under the crown
  const coconutsPositions: number[] = [];
  const coconutsIndices: number[] = [];
  const coconutsNormals: number[] = [];

  const baseSphere = new THREE.SphereGeometry(0.32, 6, 4);
  const sPos = baseSphere.attributes.position;
  const sIdx = baseSphere.getIndex();

  const coconutOffsets = [
    { x: -2.2 + 0.28, y: 10.15, z: 0.18 },
    { x: -2.2 - 0.22, y: 10.12, z: 0.25 },
    { x: -2.2 - 0.2, y: 10.18, z: -0.22 },
    { x: -2.2 + 0.25, y: 10.1, z: -0.15 },
  ];

  for (let c = 0; c < coconutOffsets.length; c++) {
    const off = coconutOffsets[c];
    const vertStart = coconutsPositions.length / 3;

    for (let v = 0; v < sPos.count; v++) {
      coconutsPositions.push(sPos.getX(v) + off.x, sPos.getY(v) + off.y, sPos.getZ(v) + off.z);
      coconutsNormals.push(0, 1, 0);
    }
    if (sIdx) {
      for (let idx = 0; idx < sIdx.count; idx++) {
        coconutsIndices.push(vertStart + sIdx.getX(idx));
      }
    } else {
      for (let v = 0; v < sPos.count; v++) {
        coconutsIndices.push(vertStart + v);
      }
    }
  }
  baseSphere.dispose();

  const palmCoconutsGeom = new THREE.BufferGeometry();
  palmCoconutsGeom.setAttribute('position', new THREE.Float32BufferAttribute(coconutsPositions, 3));
  palmCoconutsGeom.setAttribute('normal', new THREE.Float32BufferAttribute(coconutsNormals, 3));
  palmCoconutsGeom.setIndex(coconutsIndices);
  palmCoconutsGeom.computeVertexNormals();

  return { palmTrunkGeom, palmCrownGeom, palmCoconutsGeom };
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
    // 1. Inland perimeter trees near airfield apron
    for (let t = 0; t < 25; t++) {
      treePositions.push({
        x: -900 + (lcg() - 0.5) * 400,
        z: 400 + (lcg() - 0.5) * 400,
        scale: 0.6 + lcg() * 0.3,
        isConifer: false,
      });
    }

    // 2. Procedural Coconut Palm Trees lining the yellow sand beach along the western coastline
    const { palmTrunkGeom, palmCrownGeom, palmCoconutsGeom } = createCoconutPalmGeometries();
    geometries.push(palmTrunkGeom, palmCrownGeom, palmCoconutsGeom);

    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
    const palmCrownMat = new THREE.MeshLambertMaterial({
      color: 0x16a34a, // Lush vibrant tropical palm green
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const palmCoconutMat = new THREE.MeshLambertMaterial({
      color: 0x451a03, // Rich deep coconut brown
      flatShading: true,
    });
    materials.push(palmTrunkMat, palmCrownMat, palmCoconutMat);

    const palmPositions: Array<{ x: number; z: number; scale: number; rotY: number }> = [];
    const numPalms = 75;
    for (let p = 0; p < numPalms; p++) {
      // Natural distribution along beach strip: Z spans -3800m to +3800m
      const zBase = -3750 + (p / numPalms) * 7500;
      const z = zBase + (lcg() - 0.5) * 110;
      // Positioned across the broad yellow sandy beach between -1540m and -1370m
      const x = -1455 + (lcg() - 0.5) * 140;
      const scale = 1.1 + lcg() * 0.45;
      // Natural slight rotation variations with general oceanward lean
      const rotY = (lcg() - 0.5) * 1.3;
      palmPositions.push({ x, z, scale, rotY });
    }

    const palmTrunkMesh = new THREE.InstancedMesh(palmTrunkGeom, palmTrunkMat, palmPositions.length);
    const palmCrownMesh = new THREE.InstancedMesh(palmCrownGeom, palmCrownMat, palmPositions.length);
    const palmCoconutMesh = new THREE.InstancedMesh(palmCoconutsGeom, palmCoconutMat, palmPositions.length);

    palmTrunkMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    palmCrownMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    palmCoconutMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const dummyPalm = new THREE.Object3D();
    for (let p = 0; p < palmPositions.length; p++) {
      const palm = palmPositions[p];
      // Accurate terrain elevation sampling: Palm tree foundation sits directly on ground surface
      const groundElev = getTerrainElevation(palm.x, -palm.z, activeProfile ?? preset, seed);
      dummyPalm.position.set(palm.x, groundElev - 1, palm.z);
      dummyPalm.rotation.y = palm.rotY;
      dummyPalm.scale.set(palm.scale, palm.scale, palm.scale);
      dummyPalm.updateMatrix();

      palmTrunkMesh.setMatrixAt(p, dummyPalm.matrix);
      palmCrownMesh.setMatrixAt(p, dummyPalm.matrix);
      palmCoconutMesh.setMatrixAt(p, dummyPalm.matrix);
    }

    palmTrunkMesh.instanceMatrix.needsUpdate = true;
    palmCrownMesh.instanceMatrix.needsUpdate = true;
    palmCoconutMesh.instanceMatrix.needsUpdate = true;

    group.add(palmTrunkMesh, palmCrownMesh, palmCoconutMesh);

    const palmInfo: EnvironmentObjectInfo = {
      id: 'VEGETATION-COASTAL-PALMS',
      name: 'Coastal Beach Coconut Palm Trees',
      category: 'VEGETATION',
      preset,
      position: { x: -1425, y: 0, z: 0 },
      heightM: 14,
      isObstructionEnvelope: false,
      description: 'Lush tropical coconut palm trees (Cocos nucifera) lining the intertidal yellow sandy beach and coastal dunes.',
    };
    palmTrunkMesh.userData = { isEnvironmentObject: true, envObjectId: palmInfo.id };
    objects.push(palmInfo);
    selectableMeshes.push(palmTrunkMesh);
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

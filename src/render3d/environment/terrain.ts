import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo, EnvironmentPreset } from './types';

// Tactical palette colors
const COLOR_CARBON_950 = 0x0D1117;
const COLOR_LINE = 0x262B33;
const COLOR_PHOSPHOR_DIM = 0x003B1A;
const COLOR_AMBER = 0xFF9900;

export interface TerrainBuildResult {
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  objects: EnvironmentObjectInfo[];
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

/**
 * Queries authoritative procedural ground surface elevation in metres at the given simulation coordinates (simX, simY).
 * Sim X -> Three.js X; Sim Y -> Three.js -Z.
 * Ensures building foundations and ground assets align with the actual terrain geometry (Task 23.1 Section 6 & 7).
 */
export function getTerrainElevation(simX: number, simY: number, preset: EnvironmentPreset): number {
  if (preset === 'MOUNTAIN_RIDGE') {
    const threeX = simX;
    const threeZ = -simY;
    const distFromCenter = Math.hypot(threeX, threeZ);
    if (distFromCenter > 1200) {
      const ridgeFactor = Math.sin(threeX * 0.0012) * Math.cos(threeZ * 0.0009);
      return Math.max(0, ridgeFactor * 180 + (distFromCenter - 1200) * 0.035);
    }
  } else if (preset === 'URBAN_DENSE') {
    const threeX = simX;
    const threeZ = -simY;
    const distFromCenter = Math.hypot(threeX, threeZ);
    if (distFromCenter > 2200) {
      const ridgeFactor = Math.sin(threeX * 0.0010 + 0.5) * Math.cos(threeZ * 0.0008 - 0.3);
      return Math.max(0, ridgeFactor * 140 + (distFromCenter - 2200) * 0.025);
    }
  }
  return 0;
}

/**
 * Builds procedural 3D terrain surface, roads, and landscape features.
 * Adheres strictly to native Three.js geometry with zero external texture dependencies.
 */
function buildMountainRidgeTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 32;
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distFromCenter = Math.hypot(x, z);

    if (distFromCenter > 1200) {
      const ridgeFactor = Math.sin(x * 0.0012) * Math.cos(z * 0.0009);
      const hillElevation = Math.max(0, ridgeFactor * 180 + (distFromCenter - 1200) * 0.035);
      pos.setY(i, hillElevation);
    } else {
      pos.setY(i, 0);
    }
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x1a211e,
    wireframe: false,
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  const contourMat = new THREE.LineBasicMaterial({
    color: COLOR_PHOSPHOR_DIM,
    transparent: true,
    opacity: 0.35,
  });
  materials.push(contourMat);
  const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
  contourLines.position.y = -0.5;
  group.add(contourLines);

  objects.push({
    id: 'TERRAIN-NORTH-RIDGE',
    name: 'Northern Alpine Ridge Sector',
    category: 'RIDGE',
    preset,
    position: { x: 0, y: 3200, z: 180 },
    heightM: 180,
    elevationM: 180,
    isObstructionEnvelope: false,
    description: 'Elevated low-poly ridge formation providing significant natural radar shadowing.',
  });

  return groundMesh;
}

function buildCoastalAirfieldTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const landWidth = terrainSize;
  const landHeight = terrainSize;

  const landGeom = new THREE.PlaneGeometry(landWidth, landHeight);
  landGeom.rotateX(-Math.PI / 2);
  geometries.push(landGeom);

  const landMat = new THREE.MeshLambertMaterial({ color: 0x161c22, flatShading: true });
  materials.push(landMat);
  const landMesh = new THREE.Mesh(landGeom, landMat);
  landMesh.position.y = -1;
  group.add(landMesh);

  const seaGeom = new THREE.PlaneGeometry(terrainSize * 0.5, terrainSize);
  seaGeom.rotateX(-Math.PI / 2);
  geometries.push(seaGeom);

  const seaMat = new THREE.MeshLambertMaterial({
    color: 0x091b29,
    transparent: true,
    opacity: 0.85,
  });
  materials.push(seaMat);

  const seaMesh = new THREE.Mesh(seaGeom, seaMat);
  seaMesh.position.set(-terrainSize * 0.35, -0.2, 0);
  group.add(seaMesh);

  const shoreGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-terrainSize * 0.1, 0, -terrainSize * 0.5),
    new THREE.Vector3(-terrainSize * 0.1, 0, terrainSize * 0.5),
  ]);
  geometries.push(shoreGeom);
  const shoreMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.4 });
  materials.push(shoreMat);
  group.add(new THREE.Line(shoreGeom, shoreMat));

  const runwayGeom = new THREE.PlaneGeometry(2400, 70);
  runwayGeom.rotateX(-Math.PI / 2);
  geometries.push(runwayGeom);

  const runwayMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
  materials.push(runwayMat);

  const runwayMesh = new THREE.Mesh(runwayGeom, runwayMat);
  runwayMesh.position.set(600, 0.2, 800);
  group.add(runwayMesh);

  const clPoints: THREE.Vector3[] = [];
  for (let rx = -1100; rx <= 1100; rx += 80) {
    clPoints.push(new THREE.Vector3(rx, 0.4, 0), new THREE.Vector3(rx + 40, 0.4, 0));
  }
  const clGeom = new THREE.BufferGeometry().setFromPoints(clPoints);
  geometries.push(clGeom);
  const clMat = new THREE.LineBasicMaterial({ color: 0xdde2ea });
  materials.push(clMat);
  const clLines = new THREE.LineSegments(clGeom, clMat);
  clLines.position.set(600, 0.2, 800);
  group.add(clLines);

  const threshGeom = new THREE.PlaneGeometry(40, 60);
  threshGeom.rotateX(-Math.PI / 2);
  geometries.push(threshGeom);
  const threshMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  materials.push(threshMat);

  const thresh1 = new THREE.Mesh(threshGeom, threshMat);
  thresh1.position.set(-560, 0.3, 800);
  group.add(thresh1);

  const thresh2 = new THREE.Mesh(threshGeom, threshMat);
  thresh2.position.set(1760, 0.3, 800);
  group.add(thresh2);

  objects.push({
    id: 'AIRFIELD-RWY-09',
    name: 'Primary Military Runway 09/27',
    category: 'AIRFIELD',
    preset,
    position: { x: 600, y: -800, z: 0 },
    heightM: 2,
    isObstructionEnvelope: false,
    description: '2,400m reinforced concrete runway with threshold lighting and taxiways.',
  });

  return landMesh;
}

function buildUrbanDenseTerrain(
  terrainSize: number,
  _mapRadiusM: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  // 1. Terrain Mesh with Outer Sector Rolling Hills
  const segments = 36;
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distFromCenter = Math.hypot(x, z);

    if (distFromCenter > 2200) {
      const ridgeFactor = Math.sin(x * 0.0010 + 0.5) * Math.cos(z * 0.0008 - 0.3);
      const hillElevation = Math.max(0, ridgeFactor * 140 + (distFromCenter - 2200) * 0.025);
      pos.setY(i, hillElevation);
    } else {
      pos.setY(i, 0);
    }
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x12171e,
    wireframe: false,
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  // Outer elevation contour lines
  const contourMat = new THREE.LineBasicMaterial({
    color: COLOR_PHOSPHOR_DIM,
    transparent: true,
    opacity: 0.35,
  });
  materials.push(contourMat);
  const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
  contourLines.position.y = -0.5;
  group.add(contourLines);

  // 2. Tactical Paved Highway & Road Network (Asphalt + Dashed Lines + Curbs)
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x1c232c, flatShading: true });
  const markingMat = new THREE.LineBasicMaterial({ color: 0xdde2ea, transparent: true, opacity: 0.9 });
  const markingAmberMat = new THREE.LineBasicMaterial({ color: 0xffb700, transparent: true, opacity: 0.85 });
  materials.push(asphaltMat, markingMat, markingAmberMat);

  // North-South Expressway (X = 350m, length 7600m, width 26m)
  const nsRoadGeom = new THREE.PlaneGeometry(26, 7600);
  nsRoadGeom.rotateX(-Math.PI / 2);
  geometries.push(nsRoadGeom);
  const nsRoadMesh = new THREE.Mesh(nsRoadGeom, asphaltMat);
  nsRoadMesh.position.set(350, 0.05, 0);
  group.add(nsRoadMesh);

  // NS Centerline dashed markings
  const nsMarkPoints: THREE.Vector3[] = [];
  for (let z = -3700; z <= 3700; z += 60) {
    nsMarkPoints.push(new THREE.Vector3(350, 0.15, z), new THREE.Vector3(350, 0.15, z + 30));
  }
  const nsMarkGeom = new THREE.BufferGeometry().setFromPoints(nsMarkPoints);
  geometries.push(nsMarkGeom);
  group.add(new THREE.LineSegments(nsMarkGeom, markingMat));

  // East-West Metropolitan Highway (Z = -300m, length 7600m, width 26m)
  const ewRoadGeom = new THREE.PlaneGeometry(7600, 26);
  ewRoadGeom.rotateX(-Math.PI / 2);
  geometries.push(ewRoadGeom);
  const ewRoadMesh = new THREE.Mesh(ewRoadGeom, asphaltMat);
  ewRoadMesh.position.set(0, 0.05, -300);
  group.add(ewRoadMesh);

  // EW Centerline dashed markings
  const ewMarkPoints: THREE.Vector3[] = [];
  for (let x = -3700; x <= 3700; x += 60) {
    ewMarkPoints.push(new THREE.Vector3(x, 0.15, -300), new THREE.Vector3(x + 30, 0.15, -300));
  }
  const ewMarkGeom = new THREE.BufferGeometry().setFromPoints(ewMarkPoints);
  geometries.push(ewMarkGeom);
  group.add(new THREE.LineSegments(ewMarkGeom, markingMat));

  // Diagonal Arterial Corridor to East Urban Zone (connecting center toward U1 district)
  const diagRoadGeom = new THREE.PlaneGeometry(22, 3400);
  diagRoadGeom.rotateX(-Math.PI / 2);
  geometries.push(diagRoadGeom);
  const diagRoadMesh = new THREE.Mesh(diagRoadGeom, asphaltMat);
  diagRoadMesh.rotation.y = Math.PI / 4;
  diagRoadMesh.position.set(1300, 0.04, -1300);
  group.add(diagRoadMesh);

  // Perimeter Ring Highway (Radius = 1400m, Width = 22m)
  const ringGeom = new THREE.RingGeometry(1389, 1411, 64);
  ringGeom.rotateX(-Math.PI / 2);
  geometries.push(ringGeom);
  const ringMesh = new THREE.Mesh(ringGeom, asphaltMat);
  ringMesh.position.set(0, 0.03, 0);
  group.add(ringMesh);

  // Ring Highway Amber Centerline
  const ringDashPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i += 2) {
    const th1 = (i / 64) * Math.PI * 2;
    const th2 = ((i + 1) / 64) * Math.PI * 2;
    ringDashPoints.push(
      new THREE.Vector3(Math.cos(th1) * 1400, 0.12, Math.sin(th1) * 1400),
      new THREE.Vector3(Math.cos(th2) * 1400, 0.12, Math.sin(th2) * 1400)
    );
  }
  const ringDashGeom = new THREE.BufferGeometry().setFromPoints(ringDashPoints);
  geometries.push(ringDashGeom);
  group.add(new THREE.LineSegments(ringDashGeom, markingAmberMat));

  objects.push(
    {
      id: 'TERRAIN-NORTH-RIDGE',
      name: 'Outer Sector Ridgelines & Hill Formations',
      category: 'RIDGE',
      preset,
      position: { x: 0, y: 3000, z: 140 },
      heightM: 140,
      elevationM: 140,
      isObstructionEnvelope: false,
      description: 'Peripheral rolling hill ridges providing elevated low-altitude topography.',
    },
    {
      id: 'HIGHWAY-METRO-NS',
      name: 'North-South Arterial Expressway',
      category: 'AIRFIELD',
      preset,
      position: { x: 350, y: 0, z: 0 },
      heightM: 1,
      isObstructionEnvelope: false,
      description: 'Dual-carriageway paved military transport corridor with lane markings.',
    },
    {
      id: 'HIGHWAY-RING-PERIMETER',
      name: 'Metropolitan Perimeter Ring Highway',
      category: 'AIRFIELD',
      preset,
      position: { x: 0, y: 1400, z: 0 },
      heightM: 1,
      isObstructionEnvelope: false,
      description: '1,400m perimeter beltway encircling inner defense zone.',
    }
  );

  return groundMesh;
}

function buildFlatTacticalTerrain(
  terrainSize: number,
  mapRadiusM: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Mesh {
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize);
  groundGeom.rotateX(-Math.PI / 2);
  geometries.push(groundGeom);

  let groundColor = COLOR_CARBON_950;
  if (preset === 'FOREST_VALLEY') {
    groundColor = 0x121b15;
  } else if (preset === 'OPEN_RURAL') {
    groundColor = 0x1a1e16;
  }

  const groundMat = new THREE.MeshLambertMaterial({ color: groundColor });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  if (preset === 'OPEN_RURAL' || preset === 'SUBURBAN') {
    const parcelGeom = new THREE.BufferGeometry();
    const parcelPoints: THREE.Vector3[] = [];
    const step = 800;
    for (let x = -mapRadiusM + 400; x <= mapRadiusM - 400; x += step) {
      for (let z = -mapRadiusM + 400; z <= mapRadiusM - 400; z += step) {
        if (Math.hypot(x, z) < 700) continue;
        parcelPoints.push(
          new THREE.Vector3(x - 300, 0.1, z - 300),
          new THREE.Vector3(x + 300, 0.1, z - 300),
          new THREE.Vector3(x + 300, 0.1, z - 300),
          new THREE.Vector3(x + 300, 0.1, z + 300),
          new THREE.Vector3(x + 300, 0.1, z + 300),
          new THREE.Vector3(x - 300, 0.1, z + 300),
          new THREE.Vector3(x - 300, 0.1, z + 300),
          new THREE.Vector3(x - 300, 0.1, z - 300)
        );
      }
    }
    parcelGeom.setFromPoints(parcelPoints);
    geometries.push(parcelGeom);
    const parcelMat = new THREE.LineBasicMaterial({
      color: COLOR_LINE,
      transparent: true,
      opacity: 0.4,
    });
    materials.push(parcelMat);
    group.add(new THREE.LineSegments(parcelGeom, parcelMat));
  }

  return groundMesh;
}

function buildTacticalRings(
  mapRadiusM: number,
  rMinM: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): void {
  for (let r = 1000; r <= mapRadiusM; r += 1000) {
    const ringPoints: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(Math.cos(theta) * r, 0.1, Math.sin(theta) * r));
    }
    const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPoints);
    geometries.push(ringGeom);
    const ringMat = new THREE.LineBasicMaterial({
      color: COLOR_PHOSPHOR_DIM,
      transparent: true,
      opacity: 0.45,
    });
    materials.push(ringMat);
    group.add(new THREE.LineLoop(ringGeom, ringMat));
  }

  const pnrPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const theta = (i / 64) * Math.PI * 2;
    pnrPoints.push(new THREE.Vector3(Math.cos(theta) * rMinM, 0.3, Math.sin(theta) * rMinM));
  }
  const pnrGeom = new THREE.BufferGeometry().setFromPoints(pnrPoints);
  geometries.push(pnrGeom);
  const pnrMat = new THREE.LineBasicMaterial({
    color: COLOR_AMBER,
    transparent: true,
    opacity: 0.85,
  });
  materials.push(pnrMat);
  group.add(new THREE.LineLoop(pnrGeom, pnrMat));

  objects.push({
    id: 'ZONE-PNR-CORE',
    name: 'Restricted Defense Bubble (PNR Perimeter)',
    category: 'PROTECTED_FACILITY',
    preset,
    position: { x: 0, y: 0, z: 0 },
    heightM: 500,
    isObstructionEnvelope: false,
    description: '500m radius Point of No Return. Unauthorized aerial crossing constitutes a terminal breach.',
  });
}

/**
 * Builds procedural 3D terrain surface, roads, and landscape features.
 * Adheres strictly to native Three.js geometry with zero external texture dependencies.
 */
export function buildProceduralTerrain(descriptor: EnvironmentDescriptor): TerrainBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralTerrain';
  const objects: EnvironmentObjectInfo[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  let primaryGroundMesh: THREE.Mesh | undefined;

  const { preset, mapRadiusM, rMinM } = descriptor;
  const terrainSize = mapRadiusM * 2.2;

  // 1. Base Ground Surface
  if (preset === 'MOUNTAIN_RIDGE') {
    primaryGroundMesh = buildMountainRidgeTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (preset === 'COASTAL_AIRFIELD') {
    primaryGroundMesh = buildCoastalAirfieldTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (preset === 'URBAN_DENSE') {
    primaryGroundMesh = buildUrbanDenseTerrain(terrainSize, mapRadiusM, preset, group, geometries, materials, objects);
  } else {
    primaryGroundMesh = buildFlatTacticalTerrain(terrainSize, mapRadiusM, preset, group, geometries, materials);
  }

  // 2. Tactical Concentric Ground Range Rings and PNR
  buildTacticalRings(mapRadiusM, rMinM, preset, group, geometries, materials, objects);

  if (!primaryGroundMesh) {
    throw new Error(
      `[TerrainBuild] Failed to construct primary ground mesh for environment preset '${preset}'. ` +
      `Every supported terrain preset must generate and return an authoritative ground mesh.`
    );
  }

  return { group, groundMesh: primaryGroundMesh, objects, disposables: { geometries, materials } };
}

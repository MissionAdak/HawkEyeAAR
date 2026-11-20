import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';

// Tactical palette colors
const COLOR_CARBON_950 = 0x0D1117;
const COLOR_LINE = 0x262B33;
const COLOR_PHOSPHOR_DIM = 0x003B1A;
const COLOR_AMBER = 0xFF9900;

export interface TerrainBuildResult {
  group: THREE.Group;
  objects: EnvironmentObjectInfo[];
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
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

  const { preset, mapRadiusM, rMinM } = descriptor;
  const terrainSize = mapRadiusM * 2.2;

  // 1. Base Ground Surface
  if (preset === 'MOUNTAIN_RIDGE') {
    // Low-poly sloped heightfield terrain
    const segments = 32;
    const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    groundGeom.rotateX(-Math.PI / 2);

    const pos = groundGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distFromCenter = Math.hypot(x, z);

      // Keep center defense asset zone relatively flat (within 1000m)
      if (distFromCenter > 1200) {
        // Deterministic ridge waves
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

    // Contour wireframe for tactical elevation clarity
    const contourMat = new THREE.LineBasicMaterial({
      color: COLOR_PHOSPHOR_DIM,
      transparent: true,
      opacity: 0.35,
    });
    materials.push(contourMat);
    const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
    contourLines.position.y = -0.5;
    group.add(contourLines);

    // Register Mountain Ridge as inspectable terrain feature
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
  } else if (preset === 'COASTAL_AIRFIELD') {
    // Split land and sea terrain
    const landWidth = terrainSize;
    const landHeight = terrainSize;

    // Land surface
    const landGeom = new THREE.PlaneGeometry(landWidth, landHeight);
    landGeom.rotateX(-Math.PI / 2);
    geometries.push(landGeom);

    const landMat = new THREE.MeshLambertMaterial({ color: 0x161c22, flatShading: true });
    materials.push(landMat);
    const landMesh = new THREE.Mesh(landGeom, landMat);
    landMesh.position.y = -1;
    group.add(landMesh);

    // Water Surface (Western maritime sector: X < -1800m)
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

    // Shoreline boundary strip
    const shoreGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-terrainSize * 0.1, 0, -terrainSize * 0.5),
      new THREE.Vector3(-terrainSize * 0.1, 0, terrainSize * 0.5),
    ]);
    geometries.push(shoreGeom);
    const shoreMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.4 });
    materials.push(shoreMat);
    group.add(new THREE.Line(shoreGeom, shoreMat));

    // Airfield Runway 09/27 (length 2400m, width 60m)
    const runwayGeom = new THREE.PlaneGeometry(2400, 70);
    runwayGeom.rotateX(-Math.PI / 2);
    geometries.push(runwayGeom);

    const runwayMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
    materials.push(runwayMat);

    const runwayMesh = new THREE.Mesh(runwayGeom, runwayMat);
    runwayMesh.position.set(600, 0.2, 800);
    group.add(runwayMesh);

    // Runway Centerline markings
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

    // Runway Threshold Stripes (both ends)
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
  } else {
    // Standard Flat Tactical Ground (URBAN_DENSE, SUBURBAN, FOREST_VALLEY, OPEN_RURAL)
    const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize);
    groundGeom.rotateX(-Math.PI / 2);
    geometries.push(groundGeom);

    const groundColor =
      preset === 'FOREST_VALLEY'
        ? 0x121b15
        : preset === 'OPEN_RURAL'
        ? 0x1a1e16
        : COLOR_CARBON_950;

    const groundMat = new THREE.MeshLambertMaterial({ color: groundColor });
    materials.push(groundMat);

    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.position.y = -1;
    group.add(groundMesh);

    // If Rural or Suburban: draw procedural agricultural / lot parcels
    if (preset === 'OPEN_RURAL' || preset === 'SUBURBAN') {
      const parcelGeom = new THREE.BufferGeometry();
      const parcelPoints: THREE.Vector3[] = [];
      const step = 800;
      for (let x = -mapRadiusM + 400; x <= mapRadiusM - 400; x += step) {
        for (let z = -mapRadiusM + 400; z <= mapRadiusM - 400; z += step) {
          if (Math.hypot(x, z) < 700) continue; // Skip core asset
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
  }

  // 2. Tactical Concentric Ground Range Rings (1km intervals)
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

  // 3. Point of No Return (PNR) Perimeter Ring (rMinM = 500m)
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

  // Register PNR Zone as inspectable
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

  return { group, objects, disposables: { geometries, materials } };
}

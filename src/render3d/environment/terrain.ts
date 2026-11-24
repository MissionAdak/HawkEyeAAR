import * as THREE from 'three';
import type {
  EnvironmentDescriptor,
  EnvironmentObjectInfo,
  EnvironmentPreset,
  ScenarioVisualProfile,
} from './types';
import { SPECTRUM_RIVER_POINTS } from './water';
import { resolveRandomBiome } from './descriptor';

// Tactical palette colors
const COLOR_CARBON_950 = 0x0D1117;
const COLOR_PHOSPHOR_DIM = 0x003B1A;
const COLOR_AMBER = 0xFF9900;

export interface TerrainBuildResult {
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  objects: EnvironmentObjectInfo[];
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

/**
 * Calculates perpendicular distance from a 2D point (px, py) to a 2D line segment (x1, y1) -> (x2, y2).
 */
function distToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Swarm battlefield terrain elevation with open multi-axis flight corridors (Task 30 Fix A).
 * Preserves rugged mountain ridges up to 240m elevation while ensuring flight corridors
 * have guaranteed visual clearance (>= 23m) along all swarm approach paths.
 */
export function getSwarmMountainElevation(simX: number, simY: number): number {
  const dist = Math.hypot(simX, simY);
  if (dist < 1200) return 0;

  // Swarm threat flight paths:
  // H-SWM-1: (2500, 1000) -> (0, 0)
  // H-SWM-2: (-2200, 1600) -> (0, 0)
  // H-SWM-3: (1400, -2300) -> (0, 0)
  const paths = [
    { x1: 2500, y1: 1000, x2: 0, y2: 0 },
    { x1: -2200, y1: 1600, x2: 0, y2: 0 },
    { x1: 1400, y1: -2300, x2: 0, y2: 0 },
  ];

  let minCorridorDist = Infinity;
  for (const p of paths) {
    const d = distToLineSegment(simX, simY, p.x1, p.y1, p.x2, p.y2);
    if (d < minCorridorDist) minCorridorDist = d;
  }

  // Smooth corridor attenuation:
  // Inside 350m: flat valley floor (0m).
  // 350m to 850m: smoothstep ascent up to the mountain ridges.
  const corridorFactor = Math.min(1, Math.max(0, (minCorridorDist - 350) / 500));
  const smoothCorridor = corridorFactor * corridorFactor * (3 - 2 * corridorFactor);

  // Central valley basin attenuation (smooth transition outward from 1200m to 1800m)
  const valleyFactor = Math.min(1, Math.max(0, (dist - 1200) / 600));
  const smoothValley = valleyFactor * valleyFactor * (3 - 2 * valleyFactor);

  if (smoothCorridor === 0 || smoothValley === 0) return 0;

  const threeX = simX;
  const threeZ = -simY;
  const primaryRidge = Math.sin(threeX * 0.0014 + 0.4) * Math.cos(threeZ * 0.0011 - 0.2);
  const detailNoise = Math.sin(threeX * 0.0028 - 0.5) * Math.cos(threeZ * 0.0025 + 0.8) * 0.35;
  const rawMountainHeight = Math.max(0, (primaryRidge + detailNoise) * 160 + (dist - 1200) * 0.025);

  return rawMountainHeight * smoothCorridor * smoothValley;
}

/**
 * Alpine pass terrain elevation featuring twin dominant massifs (Mount Apex & Mount Summit)
 * with a high-altitude mountain pass and excavated glacial tarn lake basin.
 */
export function getAlpinePassElevation(simX: number, simY: number): number {
  const threeX = simX;
  const threeZ = -simY;
  const dist = Math.hypot(threeX, threeZ);

  // Peak 1: Mount Apex (North-West massif)
  const d1 = Math.hypot(threeX - (-2800), threeZ - 2400);
  const peak1 = Math.max(0, 260 * Math.exp(-(d1 * d1) / (2 * 1100 * 1100)));

  // Peak 2: Mount Summit (North-East massif)
  const d2 = Math.hypot(threeX - 2600, threeZ - 2200);
  const peak2 = Math.max(0, 240 * Math.exp(-(d2 * d2) / (2 * 1050 * 1050)));

  // Flanking pass ridges
  let passRidge = 0;
  if (dist > 1000) {
    passRidge = Math.max(0, Math.sin(threeX * 0.0009) * Math.cos(threeZ * 0.0012) * 110 + (dist - 1000) * 0.02);
  }

  // Winding pass corridor attenuation along X = 0
  const passCorridorFactor = Math.min(1, Math.abs(threeX) / 800);
  const smoothPass = passCorridorFactor * passCorridorFactor;

  const mountainHeight = dist < 1000 ? 0 : Math.max(peak1, peak2, passRidge * smoothPass);

  // Glacial tarn lake basin at (-700, 2200)
  const dxLake = (threeX - (-700)) / 420;
  const dzLake = (threeZ - 2200) / 302;
  const dLakeNorm = Math.hypot(dxLake, dzLake);

  if (dLakeNorm <= 1.0) {
    // Inside lake water surface (water at 18m, world Y = 18m)
    // Floor elevation: 13m at center to 16.5m at edge (world Y = 12m to 15.5m)
    return 13 + 3.5 * dLakeNorm * dLakeNorm;
  } else if (dLakeNorm <= 1.25) {
    // Rocky moraine rim enclosing the lake: rises to 26m
    const t = (dLakeNorm - 1.0) / 0.25;
    const smoothT = t * t * (3 - 2 * t);
    return 16.5 + (26 - 16.5) * smoothT;
  } else if (dLakeNorm <= 1.7) {
    // Transition from moraine rim (26m) into surrounding mountain slope
    const t = (dLakeNorm - 1.25) / 0.45;
    const smoothT = t * t * (3 - 2 * t);
    return 26 + (mountainHeight - 26) * smoothT;
  }

  return mountainHeight;
}

let cachedRiverPoints: Array<{ x: number; z: number }> | null = null;
function getSampledRiverPoints(): Array<{ x: number; z: number }> {
  if (!cachedRiverPoints) {
    const vPoints = SPECTRUM_RIVER_POINTS.map((p) => new THREE.Vector2(p.x, p.z));
    const curve = new THREE.SplineCurve(vPoints);
    const pts = curve.getPoints(120);
    cachedRiverPoints = pts.map((p) => ({ x: p.x, z: p.y }));
  }
  return cachedRiverPoints;
}

export function getDistanceToRiverSpline(threeX: number, threeZ: number): number {
  const pts = getSampledRiverPoints();
  let minDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToLineSegment(threeX, threeZ, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function getForestRiverElevation(simX: number, simY: number): number {
  const threeX = simX;
  const threeZ = -simY;
  const distFromCenter = Math.hypot(threeX, threeZ);

  let baseElev = 0;
  if (distFromCenter > 1600) {
    const roll = Math.sin(threeX * 0.0008) * Math.cos(threeZ * 0.0007);
    baseElev = Math.max(0, roll * 45 + (distFromCenter - 1600) * 0.015);
  }

  const distRiver = getDistanceToRiverSpline(threeX, threeZ);
  const riverHalfWidth = 70;
  const bankTransition = 70;

  if (distRiver <= riverHalfWidth) {
    // River channel floor: -2.5m (rendered Y = -3.5m, water at -0.6m -> depth 2.9m)
    return -2.5;
  } else if (distRiver < riverHalfWidth + bankTransition) {
    const t = (distRiver - riverHalfWidth) / bankTransition;
    const smoothT = t * t * (3 - 2 * t);
    return -2.5 + (baseElev - (-2.5)) * smoothT;
  }

  return baseElev;
}

export function getCoastalAirfieldElevation(simX: number, _simY: number): number {
  if (simX >= -1350) return 0;
  if (simX <= -1650) return -4.0;
  const t = (-1350 - simX) / 300;
  const smoothT = t * t * (3 - 2 * t);
  return -4.0 * smoothT;
}

export function getSuburbanReservoirElevation(threeX: number, threeZ: number): number {
  const dx = Math.abs(threeX - 1600);
  const dz = Math.abs(threeZ - (-1400));
  const halfW = 170;
  const halfL = 130;

  if (dx <= halfW && dz <= halfL) {
    return -2.5;
  }
  const margin = 35;
  if (dx <= halfW + margin && dz <= halfL + margin) {
    const tx = Math.max(0, (dx - halfW) / margin);
    const tz = Math.max(0, (dz - halfL) / margin);
    const t = Math.max(tx, tz);
    const smoothT = t * t * (3 - 2 * t);
    return -2.5 + 2.5 * smoothT;
  }
  return 0;
}

export function getPopupCanalElevation(threeX: number, threeZ: number): number {
  const inLength = threeZ >= -2650 && threeZ <= 2650;
  if (inLength) {
    const distCanal = Math.abs(threeX - (-450));
    const canalHalfW = 23;
    if (distCanal <= canalHalfW) {
      return -3.5;
    }
    const margin = 12;
    if (distCanal <= canalHalfW + margin) {
      const t = (distCanal - canalHalfW) / margin;
      const smoothT = t * t * (3 - 2 * t);
      return -3.5 + 3.5 * smoothT;
    }
  }

  const dist = Math.hypot(threeX, threeZ);
  if (dist > 2600) {
    return Math.sin(threeX * 0.001) * Math.cos(threeZ * 0.001) * 35 + (dist - 2600) * 0.015;
  }
  return 0;
}

/**
 * Queries authoritative procedural ground surface elevation in metres at the given simulation coordinates (simX, simY).
 * Sim X -> Three.js X; Sim Y -> Three.js -Z.
 * Ensures building foundations and ground assets align with the actual terrain geometry (Task 23.1 Section 6 & 7).
 */
export function getTerrainElevation(
  simX: number,
  simY: number,
  presetOrProfile: EnvironmentPreset | ScenarioVisualProfile = 'URBAN_DENSE',
  seed?: number
): number {
  const threeX = simX;
  const threeZ = -simY;
  const distFromCenter = Math.hypot(threeX, threeZ);

  if (presetOrProfile === 'RANDOM_SEEDED_LANDSCAPE' && seed !== undefined) {
    const biome = resolveRandomBiome(seed);
    return getTerrainElevation(simX, simY, biome.visualProfile);
  }

  if (presetOrProfile === 'SWARM_MOUNTAIN_VALLEY') {
    return getSwarmMountainElevation(simX, simY);
  }
  if (presetOrProfile === 'MOUNTAIN_RIDGE') {
    if (distFromCenter > 1200) {
      const ridgeFactor = Math.sin(threeX * 0.0012) * Math.cos(threeZ * 0.0009);
      return Math.max(0, ridgeFactor * 180 + (distFromCenter - 1200) * 0.035);
    }
    return 0;
  }
  if (presetOrProfile === 'FORMATION_ALPINE_PASS') {
    return getAlpinePassElevation(simX, simY);
  }
  if (presetOrProfile === 'SPECTRUM_FOREST_RIVER' || presetOrProfile === 'FOREST_VALLEY') {
    return getForestRiverElevation(simX, simY);
  }
  if (presetOrProfile === 'PROCEDURAL_COASTAL_AIRFIELD' || presetOrProfile === 'COASTAL_AIRFIELD') {
    return getCoastalAirfieldElevation(simX, simY);
  }
  if (presetOrProfile === 'DEMO_2_SUBURBAN_LOGISTICS' || presetOrProfile === 'SUBURBAN') {
    return getSuburbanReservoirElevation(threeX, threeZ);
  }
  if (presetOrProfile === 'POPUP_URBAN_CORRIDOR') {
    return getPopupCanalElevation(threeX, threeZ);
  }
  if (presetOrProfile === 'URBAN_DENSE' || presetOrProfile === 'DEMO_1_URBAN_METRO') {
    if (distFromCenter > 2200) {
      const ridgeFactor = Math.sin(threeX * 0.0010 + 0.5) * Math.cos(threeZ * 0.0008 - 0.3);
      return Math.max(0, ridgeFactor * 140 + (distFromCenter - 2200) * 0.025);
    }
    return 0;
  }
  return 0;
}

/**
 * 1. SWARM-1: Rugged Mountain Swarm Battlefield with Flight Corridors.
 */
function buildSwarmMountainTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 48; // Higher mesh resolution for crisp, detailed mountain ridgelines
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Three.js X = simX, Three.js Z = -simY
    const simX = x;
    const simY = -z;
    const elevation = getSwarmMountainElevation(simX, simY);
    pos.setY(i, elevation);
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x1f2723, // Rugged dark basalt rock
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  // Phosphor contour lines for altitude visualization
  const contourMat = new THREE.LineBasicMaterial({
    color: COLOR_PHOSPHOR_DIM,
    transparent: true,
    opacity: 0.35,
  });
  materials.push(contourMat);
  const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
  contourLines.position.y = -0.5;
  group.add(contourLines);

  objects.push(
    {
      id: 'TERRAIN-NORTH-RIDGE',
      name: 'Northern Alpine Ridge Sector',
      category: 'RIDGE',
      preset,
      position: { x: 0, y: 3400, z: 180 },
      heightM: 180,
      elevationM: 180,
      isObstructionEnvelope: false,
      description: 'Elevated basalt mountain formation flanking the north corridor.',
    },
    {
      id: 'TERRAIN-WEST-ESCARPMENT',
      name: 'Western Escarpment Ridge',
      category: 'RIDGE',
      preset,
      position: { x: -3400, y: 0, z: 220 },
      heightM: 220,
      elevationM: 220,
      isObstructionEnvelope: false,
      description: 'Towering western rock face bounding multi-axis swarm ingress.',
    }
  );

  return groundMesh;
}

/**
 * 2. FORMATION-*: Alpine Pass Terrain with Twin Peaks (Mount Apex & Mount Summit).
 */
function buildAlpinePassTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 48;
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const simX = x;
    const simY = -z;
    const elevation = getAlpinePassElevation(simX, simY);
    pos.setY(i, elevation);
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x222a27, // Alpine rock and slate
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  const contourMat = new THREE.LineBasicMaterial({
    color: 0x34d399, // Crisp emerald alpine wireframe
    transparent: true,
    opacity: 0.38,
  });
  materials.push(contourMat);
  const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
  contourLines.position.y = -0.5;
  group.add(contourLines);

  objects.push(
    {
      id: 'TERRAIN-MOUNT-APEX',
      name: 'Mount Apex Alpine Massif',
      category: 'RIDGE',
      preset,
      position: { x: -2800, y: -2400, z: 260 },
      heightM: 260,
      elevationM: 260,
      isObstructionEnvelope: false,
      description: 'Highest alpine mountain peak (260m) towering over the western pass.',
    },
    {
      id: 'TERRAIN-MOUNT-SUMMIT',
      name: 'Mount Summit Eastern Peak',
      category: 'RIDGE',
      preset,
      position: { x: 2600, y: -2200, z: 240 },
      heightM: 240,
      elevationM: 240,
      isObstructionEnvelope: false,
      description: 'Major eastern alpine peak (240m) defining the formation pass boundary.',
    }
  );

  return groundMesh;
}

/**
 * 3. SPECTRUM-1: Forest Valley Rolling Terrain with River Basin.
 */
function buildForestRiverTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 44;
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getForestRiverElevation(x, -z));
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x15231c, // Lush dark coniferous woodland soil
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  const contourMat = new THREE.LineBasicMaterial({
    color: 0x059669,
    transparent: true,
    opacity: 0.32,
  });
  materials.push(contourMat);
  const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
  contourLines.position.y = -0.5;
  group.add(contourLines);

  objects.push({
    id: 'TERRAIN-FOREST-BASIN',
    name: 'Emerald River Valley Basin',
    category: 'TERRAIN_ZONE',
    preset,
    position: { x: -1400, y: 0, z: 0 },
    heightM: 45,
    elevationM: 0,
    isObstructionEnvelope: false,
    description: 'Undulating river basin offering low-altitude masking and heavy coniferous canopy.',
  });

  return groundMesh;
}

/**
 * 4. DEMO-1: High-Density Urban Metropolitan Center with Highways and Outer Hills.
 */
function buildUrbanDenseTerrain(
  terrainSize: number,
  _mapRadiusM: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 40;
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

  const contourMat = new THREE.LineBasicMaterial({
    color: COLOR_PHOSPHOR_DIM,
    transparent: true,
    opacity: 0.35,
  });
  materials.push(contourMat);
  const contourLines = new THREE.LineSegments(new THREE.WireframeGeometry(groundGeom), contourMat);
  contourLines.position.y = -0.5;
  group.add(contourLines);

  // Tactical Expressway Network: North-South & East-West highways with lane markings
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x1c232c });
  materials.push(roadMat);

  const roadGeomNS = new THREE.PlaneGeometry(26, 7600);
  roadGeomNS.rotateX(-Math.PI / 2);
  geometries.push(roadGeomNS);
  const roadMeshNS = new THREE.Mesh(roadGeomNS, roadMat);
  roadMeshNS.position.set(350, -0.9, 0);
  group.add(roadMeshNS);

  const roadGeomEW = new THREE.PlaneGeometry(7600, 26);
  roadGeomEW.rotateX(-Math.PI / 2);
  geometries.push(roadGeomEW);
  const roadMeshEW = new THREE.Mesh(roadGeomEW, roadMat);
  roadMeshEW.position.set(0, -0.9, -300);
  group.add(roadMeshEW);

  // Perimeter Ring Highway (1400m radius)
  const ringRoadGeom = new THREE.RingGeometry(1386, 1414, 64);
  ringRoadGeom.rotateX(-Math.PI / 2);
  geometries.push(ringRoadGeom);
  const ringRoadMesh = new THREE.Mesh(ringRoadGeom, roadMat);
  ringRoadMesh.position.set(0, -0.9, 0);
  group.add(ringRoadMesh);

  // Dashed lane stripes
  const stripeMat = new THREE.LineDashedMaterial({
    color: 0xdde2ea,
    dashSize: 20,
    gapSize: 15,
  });
  materials.push(stripeMat);

  const stripePtsNS = [new THREE.Vector3(350, -0.8, -3800), new THREE.Vector3(350, -0.8, 3800)];
  const stripeGeomNS = new THREE.BufferGeometry().setFromPoints(stripePtsNS);
  geometries.push(stripeGeomNS);
  const stripeLineNS = new THREE.Line(stripeGeomNS, stripeMat);
  stripeLineNS.computeLineDistances();
  group.add(stripeLineNS);

  objects.push({
    id: 'TERRAIN-NORTH-RIDGE',
    name: 'Metropolitan Outer Ridge Sector',
    category: 'RIDGE',
    preset,
    position: { x: 0, y: 3200, z: 140 },
    heightM: 140,
    elevationM: 140,
    isObstructionEnvelope: false,
    description: 'Elevated outer urban ridgeline framing the metropolitan perimeter.',
  });

  return groundMesh;
}

/**
 * 5. POPUP-*: Urban Ingress Defense Corridor with Canal and Mid-Rise Blocks.
 */
function buildPopupCorridorTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 48;
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getPopupCanalElevation(x, z));
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x141a22,
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  // Mid-rise urban street avenues
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x222a36 });
  materials.push(roadMat);

  const avenueGeom = new THREE.PlaneGeometry(22, 6400);
  avenueGeom.rotateX(-Math.PI / 2);
  geometries.push(avenueGeom);

  const aveEast = new THREE.Mesh(avenueGeom, roadMat);
  aveEast.position.set(400, -0.9, 0);
  const aveWest = new THREE.Mesh(avenueGeom, roadMat);
  aveWest.position.set(-850, -0.9, 0);
  group.add(aveEast, aveWest);

  objects.push({
    id: 'TERRAIN-POPUP-CORRIDOR',
    name: 'Pop-Up Low-Altitude Ingress Corridor',
    category: 'TERRAIN_ZONE',
    preset,
    position: { x: 0, y: 1500, z: 0 },
    heightM: 28,
    elevationM: 0,
    isObstructionEnvelope: false,
    description: 'Street canyon corridor channelizing sudden pop-up threats.',
  });

  return groundMesh;
}

/**
 * 6. DEMO-2: Suburban Logistics & Industrial Park Terrain.
 */
function buildSuburbanLogisticsTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 44;
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  groundGeom.rotateX(-Math.PI / 2);

  const pos = groundGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getSuburbanReservoirElevation(x, z));
  }
  groundGeom.computeVertexNormals();
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x181e22,
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

  // Wide industrial access roads and freight lanes
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x262f38 });
  materials.push(roadMat);

  const freightRoadGeom = new THREE.PlaneGeometry(32, 6000);
  freightRoadGeom.rotateX(-Math.PI / 2);
  geometries.push(freightRoadGeom);

  const freightRoad = new THREE.Mesh(freightRoadGeom, roadMat);
  freightRoad.position.set(-600, -0.9, 0);
  group.add(freightRoad);

  // Logistics compound perimeter ring
  const compoundGeom = new THREE.PlaneGeometry(2800, 24);
  compoundGeom.rotateX(-Math.PI / 2);
  geometries.push(compoundGeom);

  const crossRoad = new THREE.Mesh(compoundGeom, roadMat);
  crossRoad.position.set(400, -0.9, -600);
  group.add(crossRoad);

  objects.push({
    id: 'TERRAIN-LOGISTICS-PERIMETER',
    name: 'Suburban Logistics Industrial Perimeter',
    category: 'TERRAIN_ZONE',
    preset,
    position: { x: -600, y: 0, z: 0 },
    heightM: 18,
    elevationM: 0,
    isObstructionEnvelope: false,
    description: 'Flat industrial warehousing plain bounded by freight access roads.',
  });

  return groundMesh;
}

/**
 * 7. PROCEDURAL / COASTAL: Military Airfield with Runway & Taxiways.
 */
function buildCoastalAirfieldTerrain(
  terrainSize: number,
  preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const segments = 48;
  const landGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  landGeom.rotateX(-Math.PI / 2);

  const pos = landGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getCoastalAirfieldElevation(x, -z));
  }
  landGeom.computeVertexNormals();
  geometries.push(landGeom);

  const landMat = new THREE.MeshLambertMaterial({ color: 0x161c22, flatShading: true });
  materials.push(landMat);
  const landMesh = new THREE.Mesh(landGeom, landMat);
  landMesh.position.y = -1;
  group.add(landMesh);

  // Main 2.8km Concrete Runway: X: -800 to 1400 (length 2200m, width 64m)
  const runwayGeom = new THREE.PlaneGeometry(2200, 64);
  runwayGeom.rotateX(-Math.PI / 2);
  geometries.push(runwayGeom);

  const runwayMat = new THREE.MeshLambertMaterial({ color: 0x242a32 });
  materials.push(runwayMat);

  const runwayMesh = new THREE.Mesh(runwayGeom, runwayMat);
  runwayMesh.position.set(300, -0.85, 0);
  group.add(runwayMesh);

  // Runway White Centerline Stripe
  const stripePts = [new THREE.Vector3(-760, -0.75, 0), new THREE.Vector3(1360, -0.75, 0)];
  const stripeGeom = new THREE.BufferGeometry().setFromPoints(stripePts);
  geometries.push(stripeGeom);

  const stripeMat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 30,
    gapSize: 20,
  });
  materials.push(stripeMat);

  const stripeLine = new THREE.Line(stripeGeom, stripeMat);
  stripeLine.computeLineDistances();
  group.add(stripeLine);

  objects.push({
    id: 'TERRAIN-COASTAL-RUNWAY',
    name: 'Military Airfield Runway 09/27',
    category: 'AIRFIELD',
    preset,
    position: { x: 300, y: 0, z: 0 },
    heightM: 2,
    elevationM: 0,
    isObstructionEnvelope: false,
    description: 'Active 2,200m asphalt runway aligned with eastern maritime approach.',
  });

  return landMesh;
}

/**
 * 8. RANDOM: Deterministically Seeded Procedural Landscape.
 */
function buildSeededProceduralTerrain(
  terrainSize: number,
  _mapRadiusM: number,
  descriptor: EnvironmentDescriptor,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  objects: EnvironmentObjectInfo[]
): THREE.Mesh {
  const biome = resolveRandomBiome(descriptor.seed);
  if (biome.visualProfile === 'SPECTRUM_FOREST_RIVER') {
    return buildForestRiverTerrain(terrainSize, descriptor.preset, group, geometries, materials, objects);
  } else if (biome.visualProfile === 'SWARM_MOUNTAIN_VALLEY') {
    return buildSwarmMountainTerrain(terrainSize, descriptor.preset, group, geometries, materials, objects);
  } else if (biome.visualProfile === 'PROCEDURAL_COASTAL_AIRFIELD') {
    return buildCoastalAirfieldTerrain(terrainSize, descriptor.preset, group, geometries, materials, objects);
  } else if (biome.visualProfile === 'FORMATION_ALPINE_PASS') {
    return buildAlpinePassTerrain(terrainSize, descriptor.preset, group, geometries, materials, objects);
  } else if (biome.visualProfile === 'POPUP_URBAN_CORRIDOR') {
    return buildPopupCorridorTerrain(terrainSize, descriptor.preset, group, geometries, materials, objects);
  } else {
    return buildSuburbanLogisticsTerrain(terrainSize, descriptor.preset, group, geometries, materials, objects);
  }
}

function buildFlatTacticalTerrain(
  terrainSize: number,
  _mapRadiusM: number,
  _preset: EnvironmentPreset,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Mesh {
  const groundGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, 16, 16);
  groundGeom.rotateX(-Math.PI / 2);
  geometries.push(groundGeom);

  const groundMat = new THREE.MeshLambertMaterial({
    color: COLOR_CARBON_950,
    wireframe: false,
    flatShading: true,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -1;
  group.add(groundMesh);

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
    id: 'TERRAIN-PNR-CORE',
    name: 'Point of No Return (PNR) Defense Core',
    category: 'PROTECTED_FACILITY',
    preset,
    position: { x: 0, y: 0, z: 0 },
    heightM: 2,
    elevationM: 0,
    isObstructionEnvelope: false,
    description: `Defended base perimeter at rMin=${rMinM}m. Unclassified penetration is an automatic threat condition.`,
  });
}

/**
 * Procedural Terrain Entrypoint.
 * Selects and constructs the unique terrain morphology based on the scenario's visual profile.
 */
export function buildProceduralTerrain(descriptor: EnvironmentDescriptor): TerrainBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralTerrain';

  const objects: EnvironmentObjectInfo[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  let primaryGroundMesh: THREE.Mesh | undefined;

  const { preset, mapRadiusM, rMinM, visualProfile } = descriptor;
  const terrainSize = mapRadiusM * 2.2;

  // 1. Base Ground Surface matched to Scenario Visual Profile
  if (visualProfile === 'SWARM_MOUNTAIN_VALLEY') {
    primaryGroundMesh = buildSwarmMountainTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'FORMATION_ALPINE_PASS') {
    primaryGroundMesh = buildAlpinePassTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'SPECTRUM_FOREST_RIVER') {
    primaryGroundMesh = buildForestRiverTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'DEMO_1_URBAN_METRO') {
    primaryGroundMesh = buildUrbanDenseTerrain(terrainSize, mapRadiusM, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'POPUP_URBAN_CORRIDOR') {
    primaryGroundMesh = buildPopupCorridorTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'DEMO_2_SUBURBAN_LOGISTICS') {
    primaryGroundMesh = buildSuburbanLogisticsTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'PROCEDURAL_COASTAL_AIRFIELD') {
    primaryGroundMesh = buildCoastalAirfieldTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (visualProfile === 'RANDOM_SEEDED_LANDSCAPE') {
    primaryGroundMesh = buildSeededProceduralTerrain(terrainSize, mapRadiusM, descriptor, group, geometries, materials, objects);
  } else if (preset === 'MOUNTAIN_RIDGE') {
    primaryGroundMesh = buildSwarmMountainTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (preset === 'COASTAL_AIRFIELD') {
    primaryGroundMesh = buildCoastalAirfieldTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (preset === 'URBAN_DENSE') {
    primaryGroundMesh = buildUrbanDenseTerrain(terrainSize, mapRadiusM, preset, group, geometries, materials, objects);
  } else if (preset === 'FOREST_VALLEY') {
    primaryGroundMesh = buildForestRiverTerrain(terrainSize, preset, group, geometries, materials, objects);
  } else if (preset === 'SUBURBAN') {
    primaryGroundMesh = buildSuburbanLogisticsTerrain(terrainSize, preset, group, geometries, materials, objects);
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

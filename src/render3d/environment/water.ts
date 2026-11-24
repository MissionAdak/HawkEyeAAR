import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { resolveRandomBiome } from './descriptor';

export const SPECTRUM_RIVER_POINTS: Array<{ x: number; z: number }> = [
  { x: -800, z: 4600 },
  { x: -1200, z: 3200 },
  { x: -1600, z: 1800 },
  { x: -1400, z: 500 },
  { x: -1700, z: -900 },
  { x: -2300, z: -2200 },
  { x: -1800, z: -3500 },
  { x: 400, z: -4300 },
  { x: 2600, z: -4700 },
];

// Tactical military water palette
const COLOR_DEEP_OCEAN = 0x0c4a6e;
const COLOR_RIVER_WATER = 0x0284c7;
const COLOR_ALPINE_LAKE = 0x0ea5e9;
const COLOR_RESERVOIR_WATER = 0x1e3a5f;
const COLOR_CANAL_WATER = 0x164e63;
const COLOR_BEACH_SAND = 0xd4b886;
const COLOR_RIVERBANK = 0x57534e;
const COLOR_ROCKY_SHORE = 0x52525b;
const COLOR_CONCRETE_WALL = 0x475569;
const COLOR_BRIDGE_DECK = 0x1e293b;

export type WaterFeatureType =
  | 'OCEAN'
  | 'COASTLINE'
  | 'BEACH'
  | 'LAKE'
  | 'RIVER'
  | 'RESERVOIR'
  | 'DRAINAGE_CHANNEL';

export interface WaterFeatureSpec {
  id: string;
  name: string;
  type: WaterFeatureType;
  position?: { x: number; y: number; z: number };
  width?: number;
  length?: number;
  radiusX?: number;
  radiusZ?: number;
  elevationY?: number;
  points?: Array<{ x: number; z: number }>;
  description?: string;
}

export interface WaterBuildResult {
  group: THREE.Group;
  objects: EnvironmentObjectInfo[];
  selectableMeshes: THREE.Object3D[];
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
  };
}

/**
 * Builds continuous procedural river mesh along 2D centerline waypoints.
 * Conforms cleanly to terrain without seams, visible gaps, or z-fighting.
 */
function buildWindingRiver(
  points: Array<{ x: number; z: number }>,
  riverWidth: number,
  elevationY: number,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { waterMesh: THREE.Mesh; bankMesh: THREE.Mesh } {
  const n = points.length;
  const segments = (n - 1) * 8; // interpolate 8 sub-segments between waypoints

  // Catmull-Rom spline interpolation along centerline
  const vPoints = points.map((p) => new THREE.Vector2(p.x, p.z));
  const curve = new THREE.SplineCurve(vPoints);
  const samplePoints = curve.getPoints(segments);

  const waterPositions: number[] = [];
  const waterNormals: number[] = [];
  const waterUvs: number[] = [];
  const waterIndices: number[] = [];

  const bankPositions: number[] = [];
  const bankIndices: number[] = [];

  const halfW = riverWidth / 2;
  const bankW = riverWidth * 0.28; // sloping pebble bank on each side

  for (let i = 0; i <= segments; i++) {
    const pt = samplePoints[i];
    // Tangent direction
    const tNext = samplePoints[Math.min(segments, i + 1)];
    const tPrev = samplePoints[Math.max(0, i - 1)];
    const tangent = new THREE.Vector2().subVectors(tNext, tPrev).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x); // perpendicular normal

    // Water surface left and right vertices
    const leftX = pt.x + normal.x * halfW;
    const leftZ = pt.y + normal.y * halfW;
    const rightX = pt.x - normal.x * halfW;
    const rightZ = pt.y - normal.y * halfW;

    // Water quad vertices (elevationY)
    const idxWater = (waterPositions.length / 3);
    waterPositions.push(leftX, elevationY, leftZ);
    waterPositions.push(rightX, elevationY, rightZ);

    waterNormals.push(0, 1, 0, 0, 1, 0);
    const u = i / segments;
    waterUvs.push(0, u, 1, u);

    if (i < segments) {
      waterIndices.push(idxWater, idxWater + 1, idxWater + 2);
      waterIndices.push(idxWater + 1, idxWater + 3, idxWater + 2);
    }

    // Outer bank vertices (rise slightly to seamlessly merge into terrain)
    const outLeftX = pt.x + normal.x * (halfW + bankW);
    const outLeftZ = pt.y + normal.y * (halfW + bankW);
    const outRightX = pt.x - normal.x * (halfW + bankW);
    const outRightZ = pt.y - normal.y * (halfW + bankW);

    const idxBank = (bankPositions.length / 3);
    // Left bank: from water edge to outer bank
    bankPositions.push(leftX, elevationY, leftZ);
    bankPositions.push(outLeftX, elevationY + 0.8, outLeftZ);
    // Right bank: from water edge to outer bank
    bankPositions.push(rightX, elevationY, rightZ);
    bankPositions.push(outRightX, elevationY + 0.8, outRightZ);

    if (i < segments) {
      // Left bank quad
      bankIndices.push(idxBank, idxBank + 1, idxBank + 4);
      bankIndices.push(idxBank + 1, idxBank + 5, idxBank + 4);
      // Right bank quad
      bankIndices.push(idxBank + 2, idxBank + 6, idxBank + 3);
      bankIndices.push(idxBank + 3, idxBank + 6, idxBank + 7);
    }
  }

  // Water BufferGeometry
  const waterGeom = new THREE.BufferGeometry();
  waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
  waterGeom.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
  waterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
  waterGeom.setIndex(waterIndices);
  geometries.push(waterGeom);

  const waterMat = new THREE.MeshLambertMaterial({
    color: COLOR_RIVER_WATER,
    transparent: true,
    opacity: 0.85,
    flatShading: true,
  });
  materials.push(waterMat);
  const waterMesh = new THREE.Mesh(waterGeom, waterMat);
  group.add(waterMesh);

  // Bank BufferGeometry
  const bankGeom = new THREE.BufferGeometry();
  bankGeom.setAttribute('position', new THREE.Float32BufferAttribute(bankPositions, 3));
  bankGeom.computeVertexNormals();
  bankGeom.setIndex(bankIndices);
  geometries.push(bankGeom);

  const bankMat = new THREE.MeshLambertMaterial({
    color: COLOR_RIVERBANK,
    flatShading: true,
  });
  materials.push(bankMat);
  const bankMesh = new THREE.Mesh(bankGeom, bankMat);
  group.add(bankMesh);

  return { waterMesh, bankMesh };
}

/**
 * Builds tactical bridges spanning a river or canal.
 */
function buildTacticalBridge(
  x: number,
  z: number,
  spanM: number,
  widthM: number,
  headingRad: number,
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(x, 1.2, z);
  bridgeGroup.rotation.y = headingRad;

  // Bridge deck
  const deckGeom = new THREE.BoxGeometry(spanM, 1.2, widthM);
  geometries.push(deckGeom);
  const deckMat = new THREE.MeshLambertMaterial({ color: COLOR_BRIDGE_DECK });
  materials.push(deckMat);
  const deckMesh = new THREE.Mesh(deckGeom, deckMat);
  bridgeGroup.add(deckMesh);

  // Guardrails
  const railGeom = new THREE.BoxGeometry(spanM, 0.8, 0.4);
  geometries.push(railGeom);
  const railMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  materials.push(railMat);

  const leftRail = new THREE.Mesh(railGeom, railMat);
  leftRail.position.set(0, 0.8, -widthM / 2 + 0.2);
  const rightRail = new THREE.Mesh(railGeom, railMat);
  rightRail.position.set(0, 0.8, widthM / 2 - 0.2);
  bridgeGroup.add(leftRail, rightRail);

  // Concrete support piers
  const pierGeom = new THREE.CylinderGeometry(1.8, 2.2, 5, 8);
  geometries.push(pierGeom);
  const pierMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
  materials.push(pierMat);

  const pier1 = new THREE.Mesh(pierGeom, pierMat);
  pier1.position.set(-spanM * 0.25, -2.5, 0);
  const pier2 = new THREE.Mesh(pierGeom, pierMat);
  pier2.position.set(spanM * 0.25, -2.5, 0);
  bridgeGroup.add(pier1, pier2);

  group.add(bridgeGroup);
}

/**
 * Procedural water subsystem entrypoint.
 * Generates distinct realistic water features tailored to each scenario's visual profile.
 */
export function buildProceduralWater(descriptor: EnvironmentDescriptor): WaterBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralWaterSubsystem';

  const objects: EnvironmentObjectInfo[] = [];
  const selectableMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const { preset, visualProfile } = descriptor;
  let activeProfile = visualProfile;
  if (visualProfile === 'RANDOM_SEEDED_LANDSCAPE') {
    activeProfile = resolveRandomBiome(descriptor.seed).visualProfile;
  }

  // Helper to register an inspectable water feature
  function registerWaterFeature(
    id: string,
    name: string,
    _categoryType: WaterFeatureType,
    pos: { x: number; y: number; z: number },
    mesh: THREE.Object3D,
    description: string
  ) {
    const info: EnvironmentObjectInfo = {
      id,
      name,
      category: 'WATER_FEATURE',
      preset,
      position: pos,
      heightM: 2,
      elevationM: pos.z,
      isObstructionEnvelope: false,
      description,
    };
    mesh.userData = { envObjectId: id };
    objects.push(info);
    selectableMeshes.push(mesh);
  }

  // 1. SPECTRUM-1: Dense Forest Valley with Winding Blue River & Tactical Bridges
  if (activeProfile === 'SPECTRUM_FOREST_RIVER' || (!activeProfile && preset === 'FOREST_VALLEY')) {
    const { waterMesh } = buildWindingRiver(SPECTRUM_RIVER_POINTS, 140, -0.6, group, geometries, materials);
    registerWaterFeature(
      'WATER-RIVER-VALLEY',
      'Emerald Valley Meandering River',
      'RIVER',
      { x: -1400, y: -500, z: 0 },
      waterMesh,
      'Continuous winding tactical river corridor (140m width) cutting through dense woodland valley.'
    );

    // Tactical bridges crossing the river
    buildTacticalBridge(-1550, 1100, 160, 24, 0.4, group, geometries, materials);
    buildTacticalBridge(-1900, -1500, 160, 24, -0.6, group, geometries, materials);
  }

  // 2. PROCEDURAL / COASTAL_AIRFIELD: Ocean, Beach & Breakwater Jetty
  else if (activeProfile === 'PROCEDURAL_COASTAL_AIRFIELD' || (!activeProfile && preset === 'COASTAL_AIRFIELD')) {
    // 1. Ocean Water Plane on eastern flank: X from 1490m to 5200m (width 3710m, centered at X = 3345m)
    // Water surface at Y = -0.5m. Seafloor is at Y = -5.0m (elev -4.0m), so depth is 4.5m.
    const oceanWidth = 3710;
    const oceanLength = 10400;
    const oceanGeom = new THREE.PlaneGeometry(oceanWidth, oceanLength, 32, 32);
    oceanGeom.rotateX(-Math.PI / 2);
    geometries.push(oceanGeom);

    const oceanMat = new THREE.MeshLambertMaterial({
      color: COLOR_DEEP_OCEAN, // Deep oceanic marine blue
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    });
    materials.push(oceanMat);

    const oceanMesh = new THREE.Mesh(oceanGeom, oceanMat);
    oceanMesh.position.set(3345, -0.5, 0);
    group.add(oceanMesh);

    registerWaterFeature(
      'WATER-OCEAN-COAST',
      'Eastern Maritime Ocean & Horizon',
      'OCEAN',
      { x: 3345, y: 0, z: -0.5 },
      oceanMesh,
      'Active maritime sea lane and open ocean horizon bordering military coastal airfield.'
    );

    // 2. Sandy Beach: Sloping intertidal beach from X = 1350m to X = 1510m (width 160m, centered at X = 1430m)
    // Meets the flat airfield tarmac at X = 1350 (Y = -0.85m) and slopes down into the water at X = 1500 (Y = -0.95m).
    const beachWidth = 160;
    const beachGeom = new THREE.PlaneGeometry(beachWidth, 10400, 16, 32);
    beachGeom.rotateX(-Math.PI / 2);
    const beachPos = beachGeom.attributes.position;
    for (let i = 0; i < beachPos.count; i++) {
      const lx = beachPos.getX(i);
      const lz = beachPos.getZ(i);
      const t = (lx + beachWidth / 2) / beachWidth; // 0 at west, 1 at east
      // Subtle natural dune undulations along Z
      const undulation = Math.sin(lz * 0.005) * Math.cos(lz * 0.002) * 0.2;
      const vy = 0.15 - t * 0.55 + undulation * (1 - t * 0.7);
      beachPos.setY(i, vy);
    }
    beachGeom.computeVertexNormals();
    geometries.push(beachGeom);

    const beachMat = new THREE.MeshLambertMaterial({
      color: COLOR_BEACH_SAND, // Natural warm coastal beach sand
      flatShading: true,
    });
    materials.push(beachMat);

    const beachMesh = new THREE.Mesh(beachGeom, beachMat);
    beachMesh.position.set(1430, -0.9, 0);
    group.add(beachMesh);

    registerWaterFeature(
      'WATER-BEACH-SHORE',
      'Coastal Shoreline & Sandy Beach',
      'BEACH',
      { x: 1430, y: 0, z: -0.9 },
      beachMesh,
      'Intertidal sand bar and sloping coastal beach transitioning from military runway to deep water.'
    );

    // 3. Wet Sand Shoreline Margin (X: 1490m to 1540m, width 50m, centered at X = 1515m)
    // Darker, damp wet sand lapped by waves just at the waterline
    const wetSandWidth = 50;
    const wetSandGeom = new THREE.PlaneGeometry(wetSandWidth, 10400, 4, 32);
    wetSandGeom.rotateX(-Math.PI / 2);
    geometries.push(wetSandGeom);

    const wetSandMat = new THREE.MeshLambertMaterial({
      color: 0x9e875a, // Darker wet sand
      flatShading: true,
    });
    materials.push(wetSandMat);

    const wetSandMesh = new THREE.Mesh(wetSandGeom, wetSandMat);
    wetSandMesh.position.set(1515, -0.65, 0);
    group.add(wetSandMesh);

    // 4. Surf Foam / Breaking Wave Wash Ribbon (X: 1495m to 1515m, width 20m, centered at X = 1505m)
    // Translucent wave froth along the shoreline where water meets the beach
    const foamWidth = 20;
    const foamGeom = new THREE.PlaneGeometry(foamWidth, 10400, 2, 32);
    foamGeom.rotateX(-Math.PI / 2);
    geometries.push(foamGeom);

    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xf0fdfa,
      transparent: true,
      opacity: 0.65,
    });
    materials.push(foamMat);

    const foamMesh = new THREE.Mesh(foamGeom, foamMat);
    foamMesh.position.set(1505, -0.48, 0);
    group.add(foamMesh);

    // 5. Heavy Armored Breakwater Jetty extending into the sea at Z = -600 (X: 1460 to 1960, length 500m)
    const jettyLen = 500;
    const jettyGeom = new THREE.BoxGeometry(jettyLen, 4.5, 36);
    geometries.push(jettyGeom);
    const jettyMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Slate armored breakwater stone
    materials.push(jettyMat);

    const jettyMesh = new THREE.Mesh(jettyGeom, jettyMat);
    jettyMesh.position.set(1460 + jettyLen / 2, 1.2, -600);
    group.add(jettyMesh);

    // Upper concrete pier walkway on jetty
    const pierGeom = new THREE.BoxGeometry(jettyLen - 20, 1.2, 22);
    geometries.push(pierGeom);
    const pierMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
    materials.push(pierMat);
    const pierMesh = new THREE.Mesh(pierGeom, pierMat);
    pierMesh.position.set(1460 + jettyLen / 2, 3.6, -600);
    group.add(pierMesh);

    // Lighthouse / Navigation beacon tower on jetty tip
    const beaconGeom = new THREE.CylinderGeometry(2.0, 3.2, 16, 12);
    geometries.push(beaconGeom);
    const beaconMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    materials.push(beaconMat);
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(1940, 11, -600);
    group.add(beaconMesh);

    // Flashing lantern atop lighthouse
    const lanternGeom = new THREE.SphereGeometry(1.6, 8, 8);
    geometries.push(lanternGeom);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    materials.push(lanternMat);
    const lanternMesh = new THREE.Mesh(lanternGeom, lanternMat);
    lanternMesh.position.set(1940, 20, -600);
    group.add(lanternMesh);

    // 6. Offshore Navigational Channel Buoys
    const buoyGeom = new THREE.CylinderGeometry(1.2, 1.8, 4, 8);
    geometries.push(buoyGeom);
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    materials.push(greenMat, redMat);

    const buoyPort = new THREE.Mesh(buoyGeom, greenMat);
    buoyPort.position.set(2300, 1.0, -450);
    const buoyStbd = new THREE.Mesh(buoyGeom, redMat);
    buoyStbd.position.set(2300, 1.0, -750);
    group.add(buoyPort, buoyStbd);
  }

  // 3. FORMATION_ALPINE_PASS: Alpine Glacial Lake
  else if (activeProfile === 'FORMATION_ALPINE_PASS') {
    // Elliptical glacial lake nestled high in the alpine valley
    const lakeGeom = new THREE.RingGeometry(0, 420, 48, 1);
    lakeGeom.rotateX(-Math.PI / 2);
    lakeGeom.scale(1, 1, 0.72); // ellipse: 420m X, 302m Z
    geometries.push(lakeGeom);

    const lakeMat = new THREE.MeshLambertMaterial({
      color: COLOR_ALPINE_LAKE,
      transparent: true,
      opacity: 0.86,
      flatShading: true,
    });
    materials.push(lakeMat);

    const lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
    lakeMesh.position.set(-700, 18, 2200); // sits at 18m elevation in alpine pass
    group.add(lakeMesh);

    // Rocky glacial moraine shoreline ring
    const moraineGeom = new THREE.RingGeometry(410, 480, 48, 1);
    moraineGeom.rotateX(-Math.PI / 2);
    moraineGeom.scale(1, 1, 0.72);
    geometries.push(moraineGeom);

    const moraineMat = new THREE.MeshLambertMaterial({
      color: COLOR_ROCKY_SHORE,
      flatShading: true,
    });
    materials.push(moraineMat);

    const moraineMesh = new THREE.Mesh(moraineGeom, moraineMat);
    moraineMesh.position.set(-700, 17.5, 2200);
    group.add(moraineMesh);

    registerWaterFeature(
      'WATER-LAKE-ALPINE',
      'Glacial Alpine Lake Tarn',
      'LAKE',
      { x: -700, y: -2200, z: 18 },
      lakeMesh,
      'High-altitude natural glacial tarn nestled between alpine pass ridgelines.'
    );
  }

  // 4. DEMO-2: Suburban Logistics Industrial Retention Reservoir
  else if (activeProfile === 'DEMO_2_SUBURBAN_LOGISTICS' || (!activeProfile && preset === 'SUBURBAN')) {
    // Rectangular industrial retention basin with concrete embankments
    const resW = 340;
    const resL = 260;
    const resGeom = new THREE.PlaneGeometry(resW, resL, 8, 8);
    resGeom.rotateX(-Math.PI / 2);
    geometries.push(resGeom);

    const resMat = new THREE.MeshLambertMaterial({
      color: COLOR_RESERVOIR_WATER,
      transparent: true,
      opacity: 0.84,
      flatShading: true,
    });
    materials.push(resMat);

    const resMesh = new THREE.Mesh(resGeom, resMat);
    resMesh.position.set(1600, -1.2, -1400);
    group.add(resMesh);

    // Concrete perimeter bund / embankment walls
    const wallThick = 18;
    const wallH = 2.4;
    const wallGeom = new THREE.BoxGeometry(resW + wallThick * 2, wallH, resL + wallThick * 2);
    geometries.push(wallGeom);
    const wallMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
    materials.push(wallMat);

    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.set(1600, -0.6, -1400);
    group.add(wallMesh);

    registerWaterFeature(
      'WATER-RESERVOIR-LOGISTICS',
      'Industrial Perimeter Retention Reservoir',
      'RESERVOIR',
      { x: 1600, y: 1400, z: -1.2 },
      resMesh,
      'Concrete-bunded industrial stormwater retention basin protecting logistics facility perimeter.'
    );
  }

  // 5. POPUP-*: Urban Ingress Drainage Canal
  else if (activeProfile === 'POPUP_URBAN_CORRIDOR') {
    // Concrete-lined drainage canal along X = -450 from Z = -2600 to 2600
    const canalLen = 5200;
    const canalW = 46;
    const canalGeom = new THREE.PlaneGeometry(canalW, canalLen, 4, 32);
    canalGeom.rotateX(-Math.PI / 2);
    geometries.push(canalGeom);

    const canalMat = new THREE.MeshLambertMaterial({
      color: COLOR_CANAL_WATER,
      transparent: true,
      opacity: 0.85,
    });
    materials.push(canalMat);

    const canalMesh = new THREE.Mesh(canalGeom, canalMat);
    canalMesh.position.set(-450, -2.5, 0);
    group.add(canalMesh);

    // Concrete channel walls
    const leftWallGeom = new THREE.BoxGeometry(4, 3.6, canalLen);
    geometries.push(leftWallGeom);
    const concreteMat = new THREE.MeshLambertMaterial({ color: COLOR_CONCRETE_WALL });
    materials.push(concreteMat);

    const leftWall = new THREE.Mesh(leftWallGeom, concreteMat);
    leftWall.position.set(-450 - canalW / 2 - 2, -1.0, 0);
    const rightWall = new THREE.Mesh(leftWallGeom, concreteMat);
    rightWall.position.set(-450 + canalW / 2 + 2, -1.0, 0);
    group.add(leftWall, rightWall);

    // Street overpass bridges across the canal
    buildTacticalBridge(-450, -600, 64, 20, Math.PI / 2, group, geometries, materials);
    buildTacticalBridge(-450, 1200, 64, 20, Math.PI / 2, group, geometries, materials);

    registerWaterFeature(
      'WATER-CANAL-URBAN',
      'Metropolitan Stormwater Drainage Canal',
      'DRAINAGE_CHANNEL',
      { x: -450, y: 0, z: -2.5 },
      canalMesh,
      'Deep concrete urban drainage canal running through the center of the pop-up ingress corridor.'
    );
  }

  // 6. SWARM-1: Rocky Dry Riverbed / Arroyo Landmark in the Northern Valley
  else if (activeProfile === 'SWARM_MOUNTAIN_VALLEY') {
    const arroyoPoints = [
      { x: 750, z: 3400 },
      { x: 300, z: 2800 },
      { x: -100, z: 2200 },
      { x: -350, z: 1600 },
      { x: -200, z: 1200 },
    ];

    // Build gravel wash bed
    const arroyoGeom = new THREE.BufferGeometry();
    const posList: number[] = [];
    const indList: number[] = [];
    const w = 70;

    for (let i = 0; i < arroyoPoints.length; i++) {
      const p = arroyoPoints[i];
      const next = arroyoPoints[Math.min(arroyoPoints.length - 1, i + 1)];
      const prev = arroyoPoints[Math.max(0, i - 1)];
      const tangent = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize();
      const norm = new THREE.Vector2(-tangent.y, tangent.x);

      const idx = posList.length / 3;
      posList.push(p.x + norm.x * w, 0.2, p.z + norm.y * w);
      posList.push(p.x - norm.x * w, 0.2, p.z - norm.y * w);

      if (i < arroyoPoints.length - 1) {
        indList.push(idx, idx + 1, idx + 2);
        indList.push(idx + 1, idx + 3, idx + 2);
      }
    }

    arroyoGeom.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3));
    arroyoGeom.computeVertexNormals();
    arroyoGeom.setIndex(indList);
    geometries.push(arroyoGeom);

    const arroyoMat = new THREE.MeshLambertMaterial({
      color: 0x44403c, // Dark rocky gravel bed
      flatShading: true,
    });
    materials.push(arroyoMat);

    const arroyoMesh = new THREE.Mesh(arroyoGeom, arroyoMat);
    group.add(arroyoMesh);

    registerWaterFeature(
      'WATER-ARROYO-WASH',
      'Northern Mountain Basin Dry Arroyo',
      'DRAINAGE_CHANNEL',
      { x: 100, y: -2200, z: 0.2 },
      arroyoMesh,
      'Rocky seasonal arroyo wash cutting through the northern valley floor between elevated ridges.'
    );
  }

  // 7. RANDOM_SEEDED_LANDSCAPE: Deterministic water based on seed
  else if (visualProfile === 'RANDOM_SEEDED_LANDSCAPE') {
    const seedMod = Math.abs(descriptor.seed) % 3;
    if (seedMod === 0) {
      // Seeded River
      const riverPoints = [
        { x: -600, z: 4200 },
        { x: -900, z: 2400 },
        { x: -1200, z: 600 },
        { x: -1500, z: -1400 },
        { x: -1000, z: -3800 },
      ];
      const { waterMesh } = buildWindingRiver(riverPoints, 110, -0.6, group, geometries, materials);
      registerWaterFeature(
        'WATER-RIVER-SEEDED',
        'Procedural River Corridor',
        'RIVER',
        { x: -1000, y: 0, z: -0.6 },
        waterMesh,
        'Procedurally synthesized river corridor generated deterministically from seed.'
      );
    } else if (seedMod === 1) {
      // Seeded Lake
      const lakeGeom = new THREE.RingGeometry(0, 360, 32, 1);
      lakeGeom.rotateX(-Math.PI / 2);
      geometries.push(lakeGeom);
      const lakeMat = new THREE.MeshLambertMaterial({
        color: COLOR_ALPINE_LAKE,
        transparent: true,
        opacity: 0.85,
      });
      materials.push(lakeMat);
      const lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
      lakeMesh.position.set(-1200, -0.5, 1200);
      group.add(lakeMesh);
      registerWaterFeature(
        'WATER-LAKE-SEEDED',
        'Procedural Woodland Lake',
        'LAKE',
        { x: -1200, y: -1200, z: -0.5 },
        lakeMesh,
        'Procedurally synthesized woodland lake generated deterministically from seed.'
      );
    } else {
      // Seeded Reservoir
      const resGeom = new THREE.PlaneGeometry(300, 220);
      resGeom.rotateX(-Math.PI / 2);
      geometries.push(resGeom);
      const resMat = new THREE.MeshLambertMaterial({
        color: COLOR_RESERVOIR_WATER,
        transparent: true,
        opacity: 0.85,
      });
      materials.push(resMat);
      const resMesh = new THREE.Mesh(resGeom, resMat);
      resMesh.position.set(1200, -1.2, -1200);
      group.add(resMesh);
      registerWaterFeature(
        'WATER-RESERVOIR-SEEDED',
        'Procedural Reservoir Basin',
        'RESERVOIR',
        { x: 1200, y: 1200, z: -1.2 },
        resMesh,
        'Procedurally synthesized retention reservoir generated deterministically from seed.'
      );
    }
  }

  return {
    group,
    objects,
    selectableMeshes,
    disposables: { geometries, materials },
  };
}

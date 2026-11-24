import * as THREE from 'three';
import type { ZoneSpec } from '@/sim/types';
import type { EnvironmentDescriptor, EnvironmentObjectInfo, EnvironmentPreset } from './types';
import { toThree } from '../coords';
import { getTerrainElevation } from './terrain';

// Tactical colors
const COLOR_PHOSPHOR = 0x00ff66;

export interface BuildingsBuildResult {
  group: THREE.Group;
  objects: EnvironmentObjectInfo[];
  selectableMeshes: THREE.Object3D[];
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

/**
 * Tests whether a point (x, y) lies inside a 2D polygon using ray casting.
 */
export function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates the 4 rotated 2D footprint corners of a building in simulation coordinates.
 * Sim coordinates: +x = East, +y = North.
 * Three.js coordinate mapping: +X = East, -Z = North.
 * A Three.js Y-rotation yaw rotates a local point (dx, dz):
 *   ThreeX = dx * cos(yaw) + dz * sin(yaw)
 *   ThreeZ = -dx * sin(yaw) + dz * cos(yaw)
 * Since SimX = ThreeX and SimY = -ThreeZ:
 *   cornerX = cx + dx * cos(yaw) + dz * sin(yaw)
 *   cornerY = cy + dx * sin(yaw) - dz * cos(yaw)
 */
export function getRotatedFootprintCorners(
  cx: number,
  cy: number,
  sizeX: number,
  sizeZ: number,
  yawAngle: number
): [number, number][] {
  const hx = sizeX / 2;
  const hz = sizeZ / 2;
  const cosY = Math.cos(yawAngle);
  const sinY = Math.sin(yawAngle);

  // 4 corners: NW, NE, SE, SW in local box coordinates
  const localOffsets: [number, number][] = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ];

  return localOffsets.map(([dx, dz]) => [
    cx + dx * cosY + dz * sinY,
    cy + dx * sinY - dz * cosY,
  ]);
}

/**
 * Tests whether two 2D line segments (p1-p2 and p3-p4) intersect.
 */
// NOSONAR typescript:S107 - 2D line segment intersection requires 4 (x,y) vertex coordinates
export function segmentsIntersect( // NOSONAR typescript:S107
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cy - ay) * (bx - ax) - (by - ay) * (cx - ax);

  const d1 = ccw(x1, y1, x2, y2, x3, y3);
  const d2 = ccw(x1, y1, x2, y2, x4, y4);
  const d3 = ccw(x3, y3, x4, y4, x1, y1);
  const d4 = ccw(x3, y3, x4, y4, x2, y2);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  const onSegment = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    qx <= Math.max(px, rx) &&
    qx >= Math.min(px, rx) &&
    qy <= Math.max(py, ry) &&
    qy >= Math.min(py, ry);

  if (Math.abs(d1) < 1e-9 && onSegment(x1, y1, x3, y3, x2, y2)) return true;
  if (Math.abs(d2) < 1e-9 && onSegment(x1, y1, x4, y4, x2, y2)) return true;
  if (Math.abs(d3) < 1e-9 && onSegment(x3, y3, x1, y1, x4, y4)) return true;
  if (Math.abs(d4) < 1e-9 && onSegment(x3, y3, x2, y2, x4, y4)) return true;

  return false;
}

/**
 * Enforces complete building footprint containment inside an authorized zone polygon:
 * 1. Every rotated footprint corner lies inside the polygon.
 * 2. Complete footprint edges do not cross polygon boundaries.
 * 3. Footprint does not infringe on central protected installation bubble (rMinM).
 */
export function isFootprintFullyContained(
  cx: number,
  cy: number,
  sizeX: number,
  sizeZ: number,
  yawAngle: number,
  polygon: [number, number][],
  rMinM: number = 0
): boolean {
  const corners = getRotatedFootprintCorners(cx, cy, sizeX, sizeZ, yawAngle);

  // 1. All 4 rotated corners must lie strictly inside the polygon
  for (const [cornerX, cornerY] of corners) {
    if (!pointInPolygon(cornerX, cornerY, polygon)) {
      return false;
    }
    // Must not infringe on central protected asset bubble
    if (rMinM > 0 && Math.hypot(cornerX, cornerY) < rMinM) {
      return false;
    }
  }

  // 2. Building center must lie inside polygon and respect rMinM
  if (!pointInPolygon(cx, cy, polygon)) {
    return false;
  }
  const footRadius = Math.hypot(sizeX, sizeZ) / 2;
  if (rMinM > 0 && Math.hypot(cx, cy) - footRadius < rMinM) {
    return false;
  }

  // 3. None of the 4 building footprint edges can intersect any polygon boundary edge
  for (let i = 0; i < 4; i++) {
    const [bx1, by1] = corners[i];
    const [bx2, by2] = corners[(i + 1) % 4];

    for (let j = 0; j < polygon.length; j++) {
      const [px1, py1] = polygon[j];
      const [px2, py2] = polygon[(j + 1) % polygon.length];

      if (segmentsIntersect(bx1, by1, bx2, by2, px1, py1, px2, py2)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Builds 3D buildings, radar installations, command towers, and air defense infrastructure.
 * Uses shared geometries, instancing, and seeded deterministic layout.
 */
interface PlacedFootprint {
  x: number;
  y: number;
  radius: number;
}

interface BuildingMats {
  bldMatConcrete: THREE.Material;
  bldMatDark: THREE.Material;
  bldMatHangar: THREE.Material;
  radarMat: THREE.Material;
  beaconMat: THREE.Material;
  towerWireMat: THREE.LineBasicMaterial;
}

interface BuildingContext {
  preset: EnvironmentPreset;
  rMinM: number;
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  mats: BuildingMats;
  registerBuilding: (mesh: THREE.Object3D, info: EnvironmentObjectInfo, extraUserData?: Record<string, unknown>) => void;
  sampleGround: (simX: number, simY: number) => number;
  nextRng: () => number;
  placedFootprints: PlacedFootprint[];
  isOverlapping: (x: number, y: number, radius: number) => boolean;
}

function buildC2ComplexAndRadar(ctx: BuildingContext): void {
  const { group, geometries, mats, preset, registerBuilding } = ctx;
  const c2Group = new THREE.Group();
  c2Group.position.set(0, 0, 0);

  // Main Command Bunker Block (50m x 50m x 17m).
  // Ground mesh surface is at Y = -1; bunker base extends to Y = -1, roof at Y = 16.
  const bunkerGeom = new THREE.BoxGeometry(50, 17, 50);
  geometries.push(bunkerGeom);
  const bunkerMesh = new THREE.Mesh(bunkerGeom, mats.bldMatDark);
  bunkerMesh.position.y = 7.5; // [-1, 16]
  c2Group.add(bunkerMesh);

  // Upper Sensor Deck
  const deckGeom = new THREE.BoxGeometry(30, 8, 30);
  geometries.push(deckGeom);
  const deckMesh = new THREE.Mesh(deckGeom, mats.bldMatConcrete);
  deckMesh.position.y = 20;
  c2Group.add(deckMesh);

  // Primary S-Band Radar Mast Tower (Lattice Spire at Y = 24m -> 54m)
  const mastGeom = new THREE.CylinderGeometry(1.5, 4, 30, 8);
  geometries.push(mastGeom);
  const mastMesh = new THREE.Mesh(mastGeom, mats.radarMat);
  mastMesh.position.y = 39;
  c2Group.add(mastMesh);

  // Radar Dish Antenna
  const dishGeom = new THREE.CylinderGeometry(8, 2, 4, 16);
  dishGeom.rotateZ(Math.PI / 2);
  geometries.push(dishGeom);
  const dishMesh = new THREE.Mesh(dishGeom, mats.radarMat);
  dishMesh.position.set(0, 56, 0);
  c2Group.add(dishMesh);

  // Flashing Navigation Beacon on top of mast
  const beaconGeom = new THREE.SphereGeometry(1.2, 8, 8);
  geometries.push(beaconGeom);
  const beaconMesh = new THREE.Mesh(beaconGeom, mats.beaconMat);
  beaconMesh.position.set(0, 59, 0);
  c2Group.add(beaconMesh);

  // Perimeter Security Barrier Fence (120m x 120m)
  const fencePts = [
    new THREE.Vector3(-60, 0, -60),
    new THREE.Vector3(60, 0, -60),
    new THREE.Vector3(60, 0, 60),
    new THREE.Vector3(-60, 0, 60),
    new THREE.Vector3(-60, 0, -60),
  ];
  const fenceGeom = new THREE.BufferGeometry().setFromPoints(fencePts);
  geometries.push(fenceGeom);
  const fenceLine = new THREE.Line(fenceGeom, mats.towerWireMat);
  c2Group.add(fenceLine);

  group.add(c2Group);

  const c2Info: EnvironmentObjectInfo = {
    id: 'FACILITY-CORE-C2',
    name: 'Tactical Air Defense Command Center (C2)',
    category: 'PROTECTED_FACILITY',
    preset,
    position: { x: 0, y: 0, z: 0 },
    heightM: 60,
    elevationM: 0,
    isObstructionEnvelope: false,
    description: 'Primary protected command bunker with 3D S-band search radar mast and tactical operations center.',
  };
  registerBuilding(bunkerMesh, c2Info);
  registerBuilding(dishMesh, {
    id: 'RADAR-PRIMARY-SBAND',
    name: 'S-Band Primary Surveillance Radar Array',
    category: 'RADAR_INSTALLATION',
    preset,
    position: { x: 0, y: 0, z: 56 },
    heightM: 60,
    elevationM: 56,
    isObstructionEnvelope: false,
    description: 'Rotating S-band 30 RPM search radar providing 5,000m airspace coverage.',
  });

  // Secondary RF Direction-Finding Tower at (-400m, 300m)
  // Ground mesh is at Y = -1. Mast height = 36m (Y = -1 to 35). Center at Y = 17.
  const rfTowerGeom = new THREE.CylinderGeometry(1, 3, 36, 6);
  geometries.push(rfTowerGeom);
  const rfTowerMesh = new THREE.Mesh(rfTowerGeom, mats.radarMat);
  rfTowerMesh.position.set(-400, 17, -300);
  group.add(rfTowerMesh);

  registerBuilding(rfTowerMesh, {
    id: 'RF-TRIANGULATOR-NORTH',
    name: 'RF Direction-Finding Station Alpha',
    category: 'TOWER',
    preset,
    position: { x: -400, y: 300, z: 0 },
    heightM: 35,
    isObstructionEnvelope: false,
    description: 'High-sensitivity passive RF direction-finding antenna node.',
  });
}

interface BuildingArchetype {
  bldType: string;
  bldSizeX: number;
  bldSizeZ: number;
  bldHeight: number;
  bldMat: THREE.Material;
  bldName: string;
  rooftopEquipment: 'HVAC' | 'WATERTANK' | 'MAST' | 'NONE';
}

function resolveBuildingArchetype(
  archetypeRoll: number,
  zone: ZoneSpec,
  placedInZone: number,
  nextRng: () => number,
  mats: BuildingMats
): BuildingArchetype {
  if (archetypeRoll < 0.35) {
    const bldSizeX = 35 + nextRng() * 40;
    const bldSizeZ = 35 + nextRng() * 40;
    const bldHeight = Math.max(18, Math.min(zone.heightM, zone.heightM * 0.70 + nextRng() * (zone.heightM * 0.30)));
    return {
      bldType: 'COMMERCIAL',
      bldSizeX,
      bldSizeZ,
      bldHeight,
      bldMat: placedInZone % 2 === 0 ? mats.bldMatConcrete : mats.bldMatDark,
      bldName: `Commercial Complex ${zone.id}-${placedInZone + 1}`,
      rooftopEquipment: bldHeight > 22 ? 'HVAC' : 'NONE',
    };
  }
  if (archetypeRoll < 0.65) {
    const bldSizeX = 42 + nextRng() * 28;
    const bldSizeZ = 22 + nextRng() * 16;
    const bldHeight = Math.max(14, Math.min(zone.heightM * 0.85, zone.heightM * 0.50 + nextRng() * (zone.heightM * 0.32)));
    return {
      bldType: 'RESIDENTIAL_MID',
      bldSizeX,
      bldSizeZ,
      bldHeight,
      bldMat: mats.bldMatDark,
      bldName: `Residential Apartment Block ${zone.id}-${placedInZone + 1}`,
      rooftopEquipment: bldHeight > 16 ? 'WATERTANK' : 'NONE',
    };
  }
  if (archetypeRoll < 0.82) {
    const bldSizeX = 18 + nextRng() * 16;
    const bldSizeZ = 18 + nextRng() * 16;
    const bldHeight = Math.max(8, Math.min(zone.heightM * 0.45, 8 + nextRng() * 8));
    return {
      bldType: 'RESIDENTIAL_LOW',
      bldSizeX,
      bldSizeZ,
      bldHeight,
      bldMat: mats.bldMatConcrete,
      bldName: `Townhouse Cluster ${zone.id}-${placedInZone + 1}`,
      rooftopEquipment: 'NONE',
    };
  }
  if (archetypeRoll < 0.94) {
    const bldSizeX = 48 + nextRng() * 32;
    const bldSizeZ = 30 + nextRng() * 20;
    const bldHeight = Math.max(10, Math.min(zone.heightM * 0.40, 10 + nextRng() * 6));
    return {
      bldType: 'INDUSTRIAL',
      bldSizeX,
      bldSizeZ,
      bldHeight,
      bldMat: mats.bldMatHangar,
      bldName: `Logistics Warehouse ${zone.id}-${placedInZone + 1}`,
      rooftopEquipment: 'NONE',
    };
  }
  const bldHeight = Math.max(22, Math.min(zone.heightM, zone.heightM * 0.85 + nextRng() * (zone.heightM * 0.15)));
  return {
    bldType: 'TOWER',
    bldSizeX: 12,
    bldSizeZ: 12,
    bldHeight,
    bldMat: mats.radarMat,
    bldName: `Urban Communications Mast ${zone.id}-${placedInZone + 1}`,
    rooftopEquipment: 'MAST',
  };
}

function addRooftopEquipment(
  rooftopEquipment: 'HVAC' | 'WATERTANK' | 'MAST' | 'NONE',
  bldMesh: THREE.Mesh,
  bldThree: THREE.Vector3,
  roofTopY: number,
  bldSizeX: number,
  bldSizeZ: number,
  ctx: BuildingContext
): void {
  const { group, geometries, mats, nextRng } = ctx;
  if (rooftopEquipment === 'HVAC') {
    const hvacGeom = new THREE.BoxGeometry(bldSizeX * 0.28, 2.8, bldSizeZ * 0.28);
    geometries.push(hvacGeom);
    const hvacMesh = new THREE.Mesh(hvacGeom, mats.radarMat);
    hvacMesh.position.set(
      bldThree.x + (nextRng() - 0.5) * bldSizeX * 0.3,
      roofTopY + 1.4,
      bldThree.z + (nextRng() - 0.5) * bldSizeZ * 0.3
    );
    hvacMesh.rotation.copy(bldMesh.rotation);
    group.add(hvacMesh);
  } else if (rooftopEquipment === 'WATERTANK') {
    const tankGeom = new THREE.CylinderGeometry(2.5, 2.5, 4, 8);
    geometries.push(tankGeom);
    const tankMesh = new THREE.Mesh(tankGeom, mats.radarMat);
    tankMesh.position.set(
      bldThree.x + (nextRng() - 0.5) * bldSizeX * 0.25,
      roofTopY + 2,
      bldThree.z + (nextRng() - 0.5) * bldSizeZ * 0.25
    );
    group.add(tankMesh);
  } else if (rooftopEquipment === 'MAST') {
    const beaconGeom = new THREE.SphereGeometry(1.2, 6, 6);
    geometries.push(beaconGeom);
    const beaconMesh = new THREE.Mesh(beaconGeom, mats.beaconMat);
    beaconMesh.position.set(bldThree.x, roofTopY + 0.8, bldThree.z);
    group.add(beaconMesh);
  }
}

function placeUrbanBuilding(
  candidateX: number,
  candidateY: number,
  yawAngle: number,
  arch: BuildingArchetype,
  zone: ZoneSpec,
  placedInZone: number,
  ctx: BuildingContext
): void {
  const { group, geometries, mats, sampleGround, registerBuilding, preset, placedFootprints } = ctx;
  const { bldType, bldSizeX, bldSizeZ, bldHeight, bldMat, bldName, rooftopEquipment } = arch;

  const corners = getRotatedFootprintCorners(candidateX, candidateY, bldSizeX, bldSizeZ, yawAngle);
  const centerGroundY = sampleGround(candidateX, candidateY);
  const cornerGroundY = corners.map((c) => sampleGround(c[0], c[1]));
  const midGroundY = [
    sampleGround((corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2),
    sampleGround((corners[1][0] + corners[2][0]) / 2, (corners[1][1] + corners[2][1]) / 2),
    sampleGround((corners[2][0] + corners[3][0]) / 2, (corners[2][1] + corners[3][1]) / 2),
    sampleGround((corners[3][0] + corners[0][0]) / 2, (corners[3][1] + corners[0][1]) / 2),
  ];
  const minGroundY = Math.min(centerGroundY, ...cornerGroundY, ...midGroundY);
  const centerElev = centerGroundY + 1;
  const minGroundElev = minGroundY + 1;

  const foundationBaseY = minGroundY;
  const roofTopY = centerElev + bldHeight;
  const totalHeight = roofTopY - foundationBaseY;
  const meshCenterY = foundationBaseY + totalHeight / 2;

  const bldThree = toThree(candidateX, candidateY, 0);

  let bldMesh: THREE.Mesh;
  if (bldType === 'TOWER') {
    const spireGeom = new THREE.CylinderGeometry(1.2, 4.5, totalHeight, 6);
    geometries.push(spireGeom);
    bldMesh = new THREE.Mesh(spireGeom, bldMat);
    bldMesh.position.set(bldThree.x, meshCenterY, bldThree.z);
  } else {
    const bldGeom = new THREE.BoxGeometry(bldSizeX, totalHeight, bldSizeZ);
    geometries.push(bldGeom);
    bldMesh = new THREE.Mesh(bldGeom, bldMat);
    bldMesh.position.set(bldThree.x, meshCenterY, bldThree.z);
  }

  bldMesh.rotation.y = yawAngle;
  group.add(bldMesh);

  if (bldType !== 'TOWER') {
    const wireGeom = new THREE.EdgesGeometry(bldMesh.geometry);
    geometries.push(wireGeom);
    const wire = new THREE.LineSegments(wireGeom, mats.towerWireMat);
    wire.position.copy(bldMesh.position);
    wire.rotation.copy(bldMesh.rotation);
    group.add(wire);
  }

  addRooftopEquipment(rooftopEquipment, bldMesh, bldThree, roofTopY, bldSizeX, bldSizeZ, ctx);

  const footRadius = Math.hypot(bldSizeX, bldSizeZ) / 2 + 8;
  placedFootprints.push({ x: candidateX, y: candidateY, radius: footRadius });

  const bldId = `BLD-${zone.id}-${placedInZone + 1}`;
  registerBuilding(bldMesh, {
    id: bldId,
    name: bldName,
    category: bldType === 'TOWER' ? 'TOWER' : 'BUILDING',
    preset,
    zoneId: zone.id,
    position: { x: candidateX, y: candidateY, z: centerElev },
    heightM: bldHeight,
    elevationM: centerElev + bldHeight,
    maskingProperties: {
      heightM: zone.heightM,
      shadowM: zone.shadowM,
      rho: zone.rho,
      zoneType: zone.type,
    },
    isObstructionEnvelope: false,
    description: `Authoritative ${bldType.toLowerCase()} structure in ${zone.id}. Height ${Math.round(bldHeight)}m (zone envelope ${zone.heightM}m).`,
  }, {
    footprintSizeX: bldSizeX,
    footprintSizeZ: bldSizeZ,
    yawAngle,
    minGroundElev,
  });
}

interface DistrictCluster {
  cx: number;
  cy: number;
  spreadX: number;
  spreadY: number;
  angle: number;
}

function buildZoneClusters(
  zone: ZoneSpec,
  minX: number,
  minY: number,
  width: number,
  depth: number,
  clusterCount: number,
  nextRng: () => number
): DistrictCluster[] {
  const clusters: DistrictCluster[] = [];
  for (let c = 0; c < clusterCount; c++) {
    let cx = minX + 45 + nextRng() * Math.max(20, width - 90);
    let cy = minY + 45 + nextRng() * Math.max(20, depth - 90);
    for (let tries = 0; tries < 20; tries++) {
      if (pointInPolygon(cx, cy, zone.polygon)) break;
      cx = minX + 45 + nextRng() * Math.max(20, width - 90);
      cy = minY + 45 + nextRng() * Math.max(20, depth - 90);
    }
    clusters.push({
      cx,
      cy,
      spreadX: Math.max(50, width * 0.25),
      spreadY: Math.max(50, depth * 0.25),
      angle: (nextRng() - 0.5) * 0.8,
    });
  }
  return clusters;
}

function buildUrbanDistrictClusters(zones: ZoneSpec[], ctx: BuildingContext): void {
  const { nextRng, mats, rMinM, isOverlapping } = ctx;

  for (const zone of zones) {
    if (zone.type !== 'URBAN') continue;

    const minX = Math.min(...zone.polygon.map((p: [number, number]) => p[0]));
    const maxX = Math.max(...zone.polygon.map((p: [number, number]) => p[0]));
    const minY = Math.min(...zone.polygon.map((p: [number, number]) => p[1]));
    const maxY = Math.max(...zone.polygon.map((p: [number, number]) => p[1]));

    const width = maxX - minX;
    const depth = maxY - minY;
    const targetBldCount = Math.min(22, Math.max(6, Math.floor(Math.sqrt(width * depth) / 75)));
    const clusterCount = Math.min(4, Math.max(2, Math.floor(targetBldCount / 5)));

    const clusters = buildZoneClusters(zone, minX, minY, width, depth, clusterCount, nextRng);

    let placedInZone = 0;
    let attempts = 0;
    const maxAttempts = targetBldCount * 45;

    while (placedInZone < targetBldCount && attempts < maxAttempts) {
      attempts++;
      const cluster = clusters[placedInZone % clusterCount];
      const u = (nextRng() - 0.5) * 2 * cluster.spreadX;
      const v = (nextRng() - 0.5) * 2 * cluster.spreadY;
      const candidateX = cluster.cx + u * Math.cos(cluster.angle) - v * Math.sin(cluster.angle);
      const candidateY = cluster.cy + u * Math.sin(cluster.angle) + v * Math.cos(cluster.angle);

      const archetypeRoll = nextRng();
      const arch = resolveBuildingArchetype(archetypeRoll, zone, placedInZone, nextRng, mats);

      const yawAngle = cluster.angle + (nextRng() - 0.5) * 0.2;

      if (!isFootprintFullyContained(candidateX, candidateY, arch.bldSizeX, arch.bldSizeZ, yawAngle, zone.polygon, rMinM)) {
        continue;
      }

      const footRadius = Math.hypot(arch.bldSizeX, arch.bldSizeZ) / 2 + 8;
      if (isOverlapping(candidateX, candidateY, footRadius)) {
        continue;
      }

      placeUrbanBuilding(candidateX, candidateY, yawAngle, arch, zone, placedInZone, ctx);
      placedInZone++;
    }
  }
}

function buildAirfieldStructures(ctx: BuildingContext): void {
  const { group, geometries, materials, mats, preset, registerBuilding } = ctx;

  // Airfield Control Tower at (350m, 500m). Base anchored to terrain mesh at Y = -1.
  const towerGeom = new THREE.BoxGeometry(18, 49, 18);
  geometries.push(towerGeom);
  const towerMesh = new THREE.Mesh(towerGeom, mats.bldMatConcrete);
  const towerThree = toThree(350, 500, 0);
  towerMesh.position.set(towerThree.x, 23.5, towerThree.z);
  group.add(towerMesh);

  // Tower Glass Cab on top
  const cabGeom = new THREE.CylinderGeometry(14, 11, 8, 8);
  geometries.push(cabGeom);
  const cabMat = new THREE.MeshLambertMaterial({ color: 0x3a4b5d });
  materials.push(cabMat);
  const cabMesh = new THREE.Mesh(cabGeom, cabMat);
  cabMesh.position.set(towerThree.x, 52, towerThree.z);
  group.add(cabMesh);

  registerBuilding(towerMesh, {
    id: 'TOWER-AIRFIELD-ATC',
    name: 'Airfield Control Tower',
    category: 'TOWER',
    preset,
    position: { x: 350, y: 500, z: 0 },
    heightM: 56,
    elevationM: 56,
    isObstructionEnvelope: false,
    description: 'Air traffic control observation tower with 360° flightline visibility.',
  });

  // 2 Aircraft Hangars along taxiway. Base anchored to terrain mesh at Y = -1.
  for (let h = 0; h < 2; h++) {
    const hangarGeom = new THREE.BoxGeometry(120, 23, 70);
    geometries.push(hangarGeom);
    const hangarMesh = new THREE.Mesh(hangarGeom, mats.bldMatHangar);
    const hThree = toThree(100 + h * 180, 680, 0);
    hangarMesh.position.set(hThree.x, 10.5, hThree.z);
    group.add(hangarMesh);

    registerBuilding(hangarMesh, {
      id: `HANGAR-MAINT-${h + 1}`,
      name: `UAV Maintenance Hangar ${h + 1}`,
      category: 'AIRFIELD',
      preset,
      position: { x: 100 + h * 180, y: 680, z: 0 },
      heightM: 22,
      isObstructionEnvelope: false,
      description: 'Hardened composite maintenance hangar for reconnaissance and tactical aircraft.',
    });
  }
}

function buildPerimeterMasts(ctx: BuildingContext): void {
  const { group, geometries, mats, preset, registerBuilding } = ctx;
  const obsCoords = [
    { x: 1200, y: -900, name: 'Southeastern Relay Mast' },
    { x: -1100, y: 1400, name: 'Northwestern Forward Post' },
  ];
  for (let i = 0; i < obsCoords.length; i++) {
    const coord = obsCoords[i];
    const pTowerGeom = new THREE.CylinderGeometry(1, 2.5, 29, 6);
    geometries.push(pTowerGeom);
    const pMesh = new THREE.Mesh(pTowerGeom, mats.radarMat);
    const tPos = toThree(coord.x, coord.y, 0);
    pMesh.position.set(tPos.x, 13.5, tPos.z);
    group.add(pMesh);

    registerBuilding(pMesh, {
      id: `PERIMETER-OBS-${i + 1}`,
      name: coord.name,
      category: 'TOWER',
      preset,
      position: { x: coord.x, y: coord.y, z: 0 },
      heightM: 28,
      isObstructionEnvelope: false,
      description: 'Forward perimeter observation mast with electro-optical repeater.',
    });
  }
}

function buildUrbanInfrastructure(ctx: BuildingContext): void {
  const { group, geometries, mats, preset, registerBuilding, sampleGround } = ctx;

  // 1. West Sector Logistics Warehousing Complex
  const warehouses = [
    { x: -1300, y: 350, sizeX: 80, sizeZ: 40, height: 16, name: 'Western Logistics Depot A' },
    { x: -1300, y: 500, sizeX: 80, sizeZ: 40, height: 16, name: 'Western Logistics Depot B' },
    { x: -1450, y: 425, sizeX: 50, sizeZ: 70, height: 18, name: 'Air Defense Supply Warehouse' },
  ];

  for (let i = 0; i < warehouses.length; i++) {
    const w = warehouses[i];
    const wGeom = new THREE.BoxGeometry(w.sizeX, w.height, w.sizeZ);
    geometries.push(wGeom);
    const wMesh = new THREE.Mesh(wGeom, mats.bldMatHangar);
    const wThree = toThree(w.x, w.y, 0);
    wMesh.position.set(wThree.x, w.height / 2 - 1, wThree.z);
    group.add(wMesh);

    // Edge wireframe accent
    const edgeGeom = new THREE.EdgesGeometry(wGeom);
    geometries.push(edgeGeom);
    const edge = new THREE.LineSegments(edgeGeom, mats.towerWireMat);
    edge.position.copy(wMesh.position);
    group.add(edge);

    registerBuilding(wMesh, {
      id: `URBAN-WAREHOUSE-${i + 1}`,
      name: w.name,
      category: 'BUILDING',
      preset,
      position: { x: w.x, y: w.y, z: 0 },
      heightM: w.height,
      isObstructionEnvelope: false,
      description: 'Reinforced industrial logistics warehouse supporting municipal & defense logistics.',
    });
  }

  // 2. High-Altitude Ridge Communication Mast on Northern Hills
  const ridgeTowerGeom = new THREE.CylinderGeometry(1.2, 3.5, 48, 6);
  geometries.push(ridgeTowerGeom);
  const ridgeTowerMesh = new THREE.Mesh(ridgeTowerGeom, mats.radarMat);
  const rPos = toThree(-600, 2600, 0);
  const groundElev = sampleGround(-600, 2600);
  ridgeTowerMesh.position.set(rPos.x, groundElev + 24, rPos.z);
  group.add(ridgeTowerMesh);

  // Red beacon on top
  const beaconGeom = new THREE.SphereGeometry(1.4, 6, 6);
  geometries.push(beaconGeom);
  const ridgeBeacon = new THREE.Mesh(beaconGeom, mats.beaconMat);
  ridgeBeacon.position.set(rPos.x, groundElev + 48, rPos.z);
  group.add(ridgeBeacon);

  registerBuilding(ridgeTowerMesh, {
    id: 'TOWER-RIDGE-RELAY',
    name: 'Northern Ridge Microwave & Radar Relay Mast',
    category: 'TOWER',
    preset,
    position: { x: -600, y: 2600, z: groundElev },
    heightM: 48,
    elevationM: groundElev + 48,
    isObstructionEnvelope: false,
    description: 'High-elevation tactical microwave communications and radar data relay node.',
  });

  // 3. Highway Checkpoint & Surveillance Tower at Expressway Junction
  const cpTowerGeom = new THREE.BoxGeometry(14, 32, 14);
  geometries.push(cpTowerGeom);
  const cpTowerMesh = new THREE.Mesh(cpTowerGeom, mats.bldMatConcrete);
  const cpPos = toThree(350, 1400, 0);
  cpTowerMesh.position.set(cpPos.x, 15, cpPos.z);
  group.add(cpTowerMesh);

  const cpEdgeGeom = new THREE.EdgesGeometry(cpTowerGeom);
  geometries.push(cpEdgeGeom);
  const cpEdge = new THREE.LineSegments(cpEdgeGeom, mats.towerWireMat);
  cpEdge.position.copy(cpTowerMesh.position);
  group.add(cpEdge);

  registerBuilding(cpTowerMesh, {
    id: 'TOWER-HIGHWAY-JUNCTION',
    name: 'Expressway Perimeter Control Post',
    category: 'TOWER',
    preset,
    position: { x: 350, y: 1400, z: 0 },
    heightM: 32,
    isObstructionEnvelope: false,
    description: 'Perimeter arterial observation post and airspace surveillance node.',
  });
}

/**
 * Builds 3D buildings, radar installations, command towers, and air defense infrastructure.
 * Uses shared geometries, instancing, and seeded deterministic layout.
 */
export function buildProceduralBuildings(descriptor: EnvironmentDescriptor, groundMesh?: THREE.Mesh): BuildingsBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralBuildings';
  const objects: EnvironmentObjectInfo[] = [];
  const selectableMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const { preset, zones, rMinM } = descriptor;

  if (groundMesh) {
    groundMesh.updateMatrixWorld(true);
  }
  const groundRaycaster = groundMesh ? new THREE.Raycaster() : null;
  const downDir = new THREE.Vector3(0, -1, 0).normalize();

  function sampleGround(simX: number, simY: number): number {
    if (groundMesh) {
      if (!groundRaycaster) {
        throw new Error(
          `[TerrainSampling] Ground mesh supplied for preset '${preset}', but raycaster is not initialized.`
        );
      }
      groundRaycaster.set(new THREE.Vector3(simX, 1500, -simY), downDir);
      const hits = groundRaycaster.intersectObject(groundMesh, false);
      if (hits.length > 0) {
        return hits[0].point.y;
      }
      throw new Error(
        `[TerrainSampling] Ground mesh intersection failed for preset '${preset}' at simulation coordinates (${simX.toFixed(2)}, ${simY.toFixed(2)}). ` +
        `Supplied ground mesh did not produce any vertical ray intersections from Y=1500 downward.`
      );
    }
    // Case A: No ground mesh supplied -> preserve analytical fallback for direct-call compatibility
    return getTerrainElevation(simX, simY, preset) - 1;
  }

  // 1. Core Materials
  const bldMatConcrete = new THREE.MeshLambertMaterial({ color: 0x3d4756 });
  const bldMatDark = new THREE.MeshLambertMaterial({ color: 0x28303d });
  const bldMatHangar = new THREE.MeshLambertMaterial({ color: 0x364150 });
  const radarMat = new THREE.MeshLambertMaterial({ color: 0x4a5668 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: COLOR_PHOSPHOR });
  const towerWireMat = new THREE.LineBasicMaterial({ color: 0x5a687c, transparent: true, opacity: 0.85 });

  materials.push(bldMatConcrete, bldMatDark, bldMatHangar, radarMat, beaconMat, towerWireMat);

  const mats: BuildingMats = {
    bldMatConcrete,
    bldMatDark,
    bldMatHangar,
    radarMat,
    beaconMat,
    towerWireMat,
  };

  function registerBuilding(
    mesh: THREE.Object3D,
    info: EnvironmentObjectInfo,
    extraUserData?: Record<string, unknown>
  ): void {
    mesh.userData = {
      isEnvironmentObject: true,
      envObjectId: info.id,
      envObjectInfo: info,
      ...extraUserData,
    };
    objects.push(info);
    selectableMeshes.push(mesh);
  }

  // Dedicated renderer-only PRNG (mulberry32). Does not consume simulation RNG streams.
  let rngState = (descriptor.seed ^ 0x9e3779b9) >>> 0;
  function nextRng(): number {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const placedFootprints: PlacedFootprint[] = [
    { x: 0, y: 0, radius: 150 },
    { x: -400, y: 300, radius: 60 },
  ];

  if (preset === 'COASTAL_AIRFIELD') {
    placedFootprints.push(
      { x: -800, y: 0, radius: 250 },
      { x: 0, y: 0, radius: 250 },
      { x: 800, y: 0, radius: 250 },
      { x: 350, y: 500, radius: 80 }
    );
  }

  function isOverlapping(x: number, y: number, radius: number): boolean {
    for (const fp of placedFootprints) {
      const dist = Math.hypot(x - fp.x, y - fp.y);
      if (dist < fp.radius + radius) {
        return true;
      }
    }
    return false;
  }

  const ctx: BuildingContext = {
    preset,
    rMinM,
    group,
    geometries,
    materials,
    mats,
    registerBuilding,
    sampleGround,
    nextRng,
    placedFootprints,
    isOverlapping,
  };

  // A. Central Protected High-Value Asset: Command C2 Complex at (0, 0, 0)
  buildC2ComplexAndRadar(ctx);

  // B. Scenario Zones Integration: Deterministic Seeded Scatter Placement
  buildUrbanDistrictClusters(zones, ctx);

  // C. Metropolitan Secondary Logistics & Communications Infrastructure (for URBAN_DENSE)
  if (preset === 'URBAN_DENSE') {
    buildUrbanInfrastructure(ctx);
  }

  // D. Airfield Hangars & Control Tower (for COASTAL_AIRFIELD)
  if (preset === 'COASTAL_AIRFIELD') {
    buildAirfieldStructures(ctx);
  }

  // E. Perimeter Industrial & Observation Structures (SUBURBAN / OPEN_RURAL)
  if (preset === 'SUBURBAN' || preset === 'OPEN_RURAL') {
    buildPerimeterMasts(ctx);
  }

  return { group, objects, selectableMeshes, disposables: { geometries, materials } };
}

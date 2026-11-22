import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { toThree } from '../coords';
import { getTerrainElevation } from './terrain';

// Tactical colors
const COLOR_LINE = 0x262b33;
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
export function segmentsIntersect(
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
export function buildProceduralBuildings(descriptor: EnvironmentDescriptor): BuildingsBuildResult {
  const group = new THREE.Group();
  group.name = 'ProceduralBuildings';
  const objects: EnvironmentObjectInfo[] = [];
  const selectableMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const { preset, zones } = descriptor;

  // 1. Core Materials
  const bldMatConcrete = new THREE.MeshLambertMaterial({ color: 0x272e39 });
  const bldMatDark = new THREE.MeshLambertMaterial({ color: 0x1c222b });
  const bldMatHangar = new THREE.MeshLambertMaterial({ color: 0x2d3642 });
  const radarMat = new THREE.MeshLambertMaterial({ color: 0x3d4959 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: COLOR_PHOSPHOR });
  const towerWireMat = new THREE.LineBasicMaterial({ color: COLOR_LINE, transparent: true, opacity: 0.8 });

  materials.push(bldMatConcrete, bldMatDark, bldMatHangar, radarMat, beaconMat, towerWireMat);

  // Helper to register an inspectable building
  function registerBuilding(
    mesh: THREE.Object3D,
    info: EnvironmentObjectInfo,
    extraUserData?: Record<string, unknown>
  ): void {
    mesh.userData = {
      isEnvironmentObject: true,
      envObjectId: info.id,
      envObjectInfo: info,
      ...(extraUserData || {}),
    };
    objects.push(info);
    selectableMeshes.push(mesh);
  }

  // ---------------------------------------------------------
  // A. Central Protected High-Value Asset: Command C2 Complex at (0, 0, 0)
  // ---------------------------------------------------------
  const c2Group = new THREE.Group();
  c2Group.position.set(0, 0, 0);

  // Main Command Bunker Block (50m x 50m x 17m).
  // Ground mesh surface is at Y = -1; bunker base extends to Y = -1, roof at Y = 16.
  const bunkerGeom = new THREE.BoxGeometry(50, 17, 50);
  geometries.push(bunkerGeom);
  const bunkerMesh = new THREE.Mesh(bunkerGeom, bldMatDark);
  bunkerMesh.position.y = 7.5; // [-1, 16]
  c2Group.add(bunkerMesh);

  // Upper Sensor Deck
  const deckGeom = new THREE.BoxGeometry(30, 8, 30);
  geometries.push(deckGeom);
  const deckMesh = new THREE.Mesh(deckGeom, bldMatConcrete);
  deckMesh.position.y = 20;
  c2Group.add(deckMesh);

  // Primary S-Band Radar Mast Tower (Lattice Spire at Y = 24m -> 54m)
  const mastGeom = new THREE.CylinderGeometry(1.5, 4, 30, 8);
  geometries.push(mastGeom);
  const mastMesh = new THREE.Mesh(mastGeom, radarMat);
  mastMesh.position.y = 39;
  c2Group.add(mastMesh);

  // Radar Dish Antenna
  const dishGeom = new THREE.CylinderGeometry(8, 2, 4, 16);
  dishGeom.rotateZ(Math.PI / 2);
  geometries.push(dishGeom);
  const dishMesh = new THREE.Mesh(dishGeom, radarMat);
  dishMesh.position.set(0, 56, 0);
  c2Group.add(dishMesh);

  // Flashing Navigation Beacon on top of mast
  const beaconGeom = new THREE.SphereGeometry(1.2, 8, 8);
  geometries.push(beaconGeom);
  const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
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
  const fenceLine = new THREE.Line(fenceGeom, towerWireMat);
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
  const rfTowerMesh = new THREE.Mesh(rfTowerGeom, radarMat);
  // Sim coords: x = -400, y = 300 -> Three.js: X = -400, Z = -300
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

  // ---------------------------------------------------------
  // B. Scenario Zones Integration: Deterministic Seeded Scatter Placement (Task 17 Phase 4)
  // ---------------------------------------------------------
  // Dedicated renderer-only PRNG (mulberry32). Does not consume simulation RNG streams.
  let rngState = (descriptor.seed ^ 0x9e3779b9) >>> 0;
  function nextRng(): number {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Record placed footprint bounding circles to enforce non-overlap (minimum separation)
  interface PlacedFootprint {
    x: number;
    y: number;
    radius: number;
  }
  const placedFootprints: PlacedFootprint[] = [
    // Central C2 complex exclusion circle
    { x: 0, y: 0, radius: 150 },
    // Secondary RF tower exclusion circle
    { x: -400, y: 300, radius: 60 },
  ];

  if (preset === 'COASTAL_AIRFIELD') {
    // Airfield runway corridor exclusion [-1600, -100] to [1600, 100]
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

  for (const zone of zones) {
    if (zone.type === 'URBAN') {
      const minX = Math.min(...zone.polygon.map((p) => p[0]));
      const maxX = Math.max(...zone.polygon.map((p) => p[0]));
      const minY = Math.min(...zone.polygon.map((p) => p[1]));
      const maxY = Math.max(...zone.polygon.map((p) => p[1]));

      const width = maxX - minX;
      const depth = maxY - minY;
      // Target building count scales with area, supporting varied clusters in larger zones
      const targetBldCount = Math.min(22, Math.max(6, Math.floor(Math.sqrt(width * depth) / 75)));

      // Generate 2 to 4 irregular sub-district cluster nodes with varied street angles
      const clusterCount = Math.min(4, Math.max(2, Math.floor(targetBldCount / 5)));
      interface DistrictCluster {
        cx: number;
        cy: number;
        spreadX: number;
        spreadY: number;
        angle: number;
      }
      const clusters: DistrictCluster[] = [];
      for (let c = 0; c < clusterCount; c++) {
        let cx = minX + 45 + nextRng() * Math.max(20, width - 90);
        let cy = minY + 45 + nextRng() * Math.max(20, depth - 90);
        // Find cluster centers that lie inside the polygon
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

      let placedInZone = 0;
      let attempts = 0;
      const maxAttempts = targetBldCount * 45;

      while (placedInZone < targetBldCount && attempts < maxAttempts) {
        attempts++;
        const cluster = clusters[placedInZone % clusterCount];
        // Non-uniform spacing along irregular street vectors
        const u = (nextRng() - 0.5) * 2 * cluster.spreadX;
        const v = (nextRng() - 0.5) * 2 * cluster.spreadY;
        const candidateX = cluster.cx + u * Math.cos(cluster.angle) - v * Math.sin(cluster.angle);
        const candidateY = cluster.cy + u * Math.sin(cluster.angle) + v * Math.cos(cluster.angle);

        // Select building archetype deterministically
        // (Commercial Tower, Mid-Rise Apartment, Low-Rise Townhouse, Industrial Logistics Warehouse, Comms Tower)
        const archetypeRoll = nextRng();
        let bldType = 'COMMERCIAL';
        let bldSizeX = 40;
        let bldSizeZ = 40;
        let bldHeight = 25;
        let bldMat = bldMatConcrete;
        let bldName = `Urban Commercial Complex ${zone.id}-${placedInZone + 1}`;
        let rooftopEquipment: 'HVAC' | 'WATERTANK' | 'MAST' | 'NONE' = 'NONE';

        if (archetypeRoll < 0.35) {
          bldType = 'COMMERCIAL';
          bldSizeX = 35 + nextRng() * 40;
          bldSizeZ = 35 + nextRng() * 40;
          bldHeight = Math.max(18, Math.min(zone.heightM, zone.heightM * 0.70 + nextRng() * (zone.heightM * 0.30)));
          bldMat = placedInZone % 2 === 0 ? bldMatConcrete : bldMatDark;
          bldName = `Commercial Complex ${zone.id}-${placedInZone + 1}`;
          rooftopEquipment = bldHeight > 22 ? 'HVAC' : 'NONE';
        } else if (archetypeRoll < 0.65) {
          bldType = 'RESIDENTIAL_MID';
          bldSizeX = 42 + nextRng() * 28;
          bldSizeZ = 22 + nextRng() * 16;
          bldHeight = Math.max(14, Math.min(zone.heightM * 0.85, zone.heightM * 0.50 + nextRng() * (zone.heightM * 0.32)));
          bldMat = bldMatDark;
          bldName = `Residential Apartment Block ${zone.id}-${placedInZone + 1}`;
          rooftopEquipment = bldHeight > 16 ? 'WATERTANK' : 'NONE';
        } else if (archetypeRoll < 0.82) {
          bldType = 'RESIDENTIAL_LOW';
          bldSizeX = 18 + nextRng() * 16;
          bldSizeZ = 18 + nextRng() * 16;
          bldHeight = Math.max(8, Math.min(zone.heightM * 0.45, 8 + nextRng() * 8));
          bldMat = bldMatConcrete;
          bldName = `Townhouse Cluster ${zone.id}-${placedInZone + 1}`;
          rooftopEquipment = 'NONE';
        } else if (archetypeRoll < 0.94) {
          bldType = 'INDUSTRIAL';
          bldSizeX = 48 + nextRng() * 32;
          bldSizeZ = 30 + nextRng() * 20;
          bldHeight = Math.max(10, Math.min(zone.heightM * 0.40, 10 + nextRng() * 6));
          bldMat = bldMatHangar;
          bldName = `Logistics Warehouse ${zone.id}-${placedInZone + 1}`;
          rooftopEquipment = 'NONE';
        } else {
          bldType = 'TOWER';
          bldSizeX = 12;
          bldSizeZ = 12;
          bldHeight = Math.max(22, Math.min(zone.heightM, zone.heightM * 0.85 + nextRng() * (zone.heightM * 0.15)));
          bldMat = radarMat;
          bldName = `Urban Communications Mast ${zone.id}-${placedInZone + 1}`;
          rooftopEquipment = 'MAST';
        }

        // Street-aligned orientation with subtle natural jitter
        const yawAngle = cluster.angle + (nextRng() - 0.5) * 0.2;

        // Enforce full rotated footprint containment: all 4 corners, center, and edges inside zone polygon
        // and strictly outside protected installation radius (rMinM)
        if (!isFootprintFullyContained(candidateX, candidateY, bldSizeX, bldSizeZ, yawAngle, zone.polygon, descriptor.rMinM)) {
          continue;
        }

        const footRadius = Math.hypot(bldSizeX, bldSizeZ) / 2 + 8; // 8m non-overlap clearance margin
        if (isOverlapping(candidateX, candidateY, footRadius)) {
          continue;
        }

        // Exact terrain alignment:
        // Account for procedural terrain surface elevation and Three.js ground mesh offset (groundMesh.position.y = -1).
        // Evaluate ground elevation across footprint corners, center, and 4 edge midpoints to eliminate any floating foundation gap on slopes.
        const corners = getRotatedFootprintCorners(candidateX, candidateY, bldSizeX, bldSizeZ, yawAngle);
        const centerElev = getTerrainElevation(candidateX, candidateY, preset);
        const cornerElevs = corners.map((c) => getTerrainElevation(c[0], c[1], preset));
        const midElevs = [
          getTerrainElevation((corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2, preset),
          getTerrainElevation((corners[1][0] + corners[2][0]) / 2, (corners[1][1] + corners[2][1]) / 2, preset),
          getTerrainElevation((corners[2][0] + corners[3][0]) / 2, (corners[2][1] + corners[3][1]) / 2, preset),
          getTerrainElevation((corners[3][0] + corners[0][0]) / 2, (corners[3][0] + corners[0][1]) / 2, preset),
        ];
        const minGroundElev = Math.min(centerElev, ...cornerElevs, ...midElevs);

        // Ground mesh surface in Three.js world coordinates is at (getTerrainElevation - 1).
        // Foundation base extends down to (minGroundElev - 1) to coincide with or embed into terrain mesh surface.
        const foundationBaseY = minGroundElev - 1;
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

        // Add wireframe rooftop outline for tactical visual definition
        if (bldType !== 'TOWER') {
          const wireGeom = new THREE.EdgesGeometry(bldMesh.geometry);
          geometries.push(wireGeom);
          const wire = new THREE.LineSegments(wireGeom, towerWireMat);
          wire.position.copy(bldMesh.position);
          wire.rotation.copy(bldMesh.rotation);
          group.add(wire);
        }

        // Rooftop equipment additions anchored to roofTopY
        if (rooftopEquipment === 'HVAC') {
          const hvacGeom = new THREE.BoxGeometry(bldSizeX * 0.28, 2.8, bldSizeZ * 0.28);
          geometries.push(hvacGeom);
          const hvacMesh = new THREE.Mesh(hvacGeom, radarMat);
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
          const tankMesh = new THREE.Mesh(tankGeom, radarMat);
          tankMesh.position.set(
            bldThree.x + (nextRng() - 0.5) * bldSizeX * 0.25,
            roofTopY + 2,
            bldThree.z + (nextRng() - 0.5) * bldSizeZ * 0.25
          );
          group.add(tankMesh);
        } else if (rooftopEquipment === 'MAST') {
          const beaconGeom = new THREE.SphereGeometry(1.2, 6, 6);
          geometries.push(beaconGeom);
          const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
          beaconMesh.position.set(bldThree.x, roofTopY + 0.8, bldThree.z);
          group.add(beaconMesh);
        }

        placedFootprints.push({ x: candidateX, y: candidateY, radius: footRadius });
        placedInZone++;

        const bldId = `BLD-${zone.id}-${placedInZone}`;
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
    }
  }

  // ---------------------------------------------------------
  // C. Airfield Hangars & Control Tower (for COASTAL_AIRFIELD)
  // ---------------------------------------------------------
  if (preset === 'COASTAL_AIRFIELD') {
    // Airfield Control Tower at (350m, 500m). Base anchored to terrain mesh at Y = -1.
    const towerGeom = new THREE.BoxGeometry(18, 49, 18);
    geometries.push(towerGeom);
    const towerMesh = new THREE.Mesh(towerGeom, bldMatConcrete);
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
      const hangarMesh = new THREE.Mesh(hangarGeom, bldMatHangar);
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

  // ---------------------------------------------------------
  // D. Perimeter Industrial & Observation Structures (SUBURBAN / OPEN_RURAL)
  // ---------------------------------------------------------
  if (preset === 'SUBURBAN' || preset === 'OPEN_RURAL') {
    const obsCoords = [
      { x: 1200, y: -900, name: 'Southeastern Relay Mast' },
      { x: -1100, y: 1400, name: 'Northwestern Forward Post' },
    ];
    for (let i = 0; i < obsCoords.length; i++) {
      const coord = obsCoords[i];
      // Base anchored to terrain mesh at Y = -1.
      const pTowerGeom = new THREE.CylinderGeometry(1, 2.5, 29, 6);
      geometries.push(pTowerGeom);
      const pMesh = new THREE.Mesh(pTowerGeom, radarMat);
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

  return { group, objects, selectableMeshes, disposables: { geometries, materials } };
}

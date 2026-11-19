import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { toThree } from '../coords';

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
    info: EnvironmentObjectInfo
  ): void {
    mesh.userData = {
      isEnvironmentObject: true,
      envObjectId: info.id,
      envObjectInfo: info,
    };
    objects.push(info);
    selectableMeshes.push(mesh);
  }

  // ---------------------------------------------------------
  // A. Central Protected High-Value Asset: Command C2 Complex at (0, 0, 0)
  // ---------------------------------------------------------
  const c2Group = new THREE.Group();
  c2Group.position.set(0, 0, 0);

  // Main Command Bunker Block (40m x 40m x 15m)
  const bunkerGeom = new THREE.BoxGeometry(50, 16, 50);
  geometries.push(bunkerGeom);
  const bunkerMesh = new THREE.Mesh(bunkerGeom, bldMatDark);
  bunkerMesh.position.y = 8;
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
  const rfTowerGeom = new THREE.CylinderGeometry(1, 3, 35, 6);
  geometries.push(rfTowerGeom);
  const rfTowerMesh = new THREE.Mesh(rfTowerGeom, radarMat);
  // Sim coords: x = -400, y = 300 -> Three.js: X = -400, Z = -300
  rfTowerMesh.position.set(-400, 17.5, -300);
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
  // B. Scenario Zones Integration: Procedural Structures Inside Zones
  // ---------------------------------------------------------
  for (const zone of zones) {
    if (zone.type === 'URBAN') {
      // Build distinct high-rise and mid-rise structures within the zone polygon
      const minX = Math.min(...zone.polygon.map((p) => p[0]));
      const maxX = Math.max(...zone.polygon.map((p) => p[0]));
      const minY = Math.min(...zone.polygon.map((p) => p[1]));
      const maxY = Math.max(...zone.polygon.map((p) => p[1]));

      const width = maxX - minX;
      const depth = maxY - minY;
      const centerY = (minY + maxY) / 2;

      // Create a prominent building cluster representing the urban core
      const bldCount = Math.min(8, Math.max(3, Math.floor(width / 180)));
      const stepX = width / (bldCount + 1);

      for (let bi = 0; bi < bldCount; bi++) {
        const offsetSimX = minX + stepX * (bi + 1) + ((bi * 37) % 40) - 20;
        const offsetSimY = centerY + (((bi * 53) % depth) - depth / 2) * 0.7;
        const bldHeight = Math.max(20, Math.min(zone.heightM, zone.heightM * 0.75 + (bi % 3) * 8));
        const bldSizeX = Math.max(45, Math.min(85, stepX * 0.7));
        const bldSizeZ = Math.max(45, Math.min(85, depth * 0.25));

        const bldGeom = new THREE.BoxGeometry(bldSizeX, bldHeight, bldSizeZ);
        geometries.push(bldGeom);

        const bldMat = bi % 2 === 0 ? bldMatConcrete : bldMatDark;
        const bldMesh = new THREE.Mesh(bldGeom, bldMat);

        const bldThree = toThree(offsetSimX, offsetSimY, 0);
        bldMesh.position.set(bldThree.x, bldHeight / 2, bldThree.z);
        group.add(bldMesh);

        // Add wireframe rooftop outline for clarity
        const wireGeom = new THREE.EdgesGeometry(bldGeom);
        geometries.push(wireGeom);
        const wire = new THREE.LineSegments(wireGeom, towerWireMat);
        wire.position.copy(bldMesh.position);
        group.add(wire);

        const bldId = `BLD-${zone.id}-${bi + 1}`;
        registerBuilding(bldMesh, {
          id: bldId,
          name: `Urban Commercial Complex ${zone.id}-${bi + 1}`,
          category: 'BUILDING',
          preset,
          zoneId: zone.id,
          position: { x: offsetSimX, y: offsetSimY, z: 0 },
          heightM: bldHeight,
          elevationM: bldHeight,
          maskingProperties: {
            heightM: zone.heightM,
            shadowM: zone.shadowM,
            rho: zone.rho,
            zoneType: zone.type,
          },
          isObstructionEnvelope: false,
          description: `Reinforced multi-story concrete structure inside ${zone.id}. Casts authoritative ${zone.shadowM}m radar shadow.`,
        });
      }
    }
  }

  // ---------------------------------------------------------
  // C. Airfield Hangars & Control Tower (for COASTAL_AIRFIELD)
  // ---------------------------------------------------------
  if (preset === 'COASTAL_AIRFIELD') {
    // Airfield Control Tower at (350m, 500m)
    const towerGeom = new THREE.BoxGeometry(18, 48, 18);
    geometries.push(towerGeom);
    const towerMesh = new THREE.Mesh(towerGeom, bldMatConcrete);
    const towerThree = toThree(350, 500, 0);
    towerMesh.position.set(towerThree.x, 24, towerThree.z);
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

    // 2 Aircraft Hangars along taxiway
    for (let h = 0; h < 2; h++) {
      const hangarGeom = new THREE.BoxGeometry(120, 22, 70);
      geometries.push(hangarGeom);
      const hangarMesh = new THREE.Mesh(hangarGeom, bldMatHangar);
      const hThree = toThree(100 + h * 180, 680, 0);
      hangarMesh.position.set(hThree.x, 11, hThree.z);
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
      const pTowerGeom = new THREE.CylinderGeometry(1, 2.5, 28, 6);
      geometries.push(pTowerGeom);
      const pMesh = new THREE.Mesh(pTowerGeom, radarMat);
      const tPos = toThree(coord.x, coord.y, 0);
      pMesh.position.set(tPos.x, 14, tPos.z);
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

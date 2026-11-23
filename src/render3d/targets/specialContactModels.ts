import * as THREE from 'three';
import type { BuiltTargetModel, TargetModelPalette } from './targetModelTypes';
import { createBirdBodyGeometry, createUnknownContactGeometry } from './targetGeometry';
import { createAircraftBodyGeometry } from '../aircraftModel';

/**
 * 1. Friendly Tactical UAV (FRIENDLY).
 * Features:
 * - Recognizable twin-tail-boom pusher UAV silhouette.
 * - Central payload nacelle.
 * - Cyan / friendly NATO-inspired visual treatment.
 */
export function buildFriendlyUasModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Friendly_UAS';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Fuselage Pod (center nacelle)
  const podGeom = new THREE.CylinderGeometry(0.24, 0.28, 1.4, 8);
  podGeom.rotateX(Math.PI / 2);
  geometries.push(podGeom);
  const bodyMesh = new THREE.Mesh(podGeom, palette.body);
  group.add(bodyMesh);

  // Main High-Aspect Wings
  const wingGeom = new THREE.BoxGeometry(3.6, 0.08, 0.45);
  geometries.push(wingGeom);
  const wingMesh = new THREE.Mesh(wingGeom, palette.body);
  wingMesh.position.set(0, 0.12, -0.15);
  group.add(wingMesh);

  // Twin Tail Booms
  const boomPts = [
    // Left Boom
    -0.65, 0.12, -0.15,
    -0.65, 0.18,  1.30,
    // Right Boom
     0.65, 0.12, -0.15,
     0.65, 0.18,  1.30,
    // Inverted V-tail horizontal stabilizer connecting the booms
    -0.65, 0.18,  1.30,
     0.65, 0.18,  1.30,
    // Left vertical fin
    -0.65, 0.18,  1.30,
    -0.65, 0.58,  1.35,
    // Right vertical fin
     0.65, 0.18,  1.30,
     0.65, 0.58,  1.35,
  ];
  const boomGeom = new THREE.BufferGeometry();
  boomGeom.setAttribute('position', new THREE.Float32BufferAttribute(boomPts, 3));
  geometries.push(boomGeom);
  const boomLines = new THREE.LineSegments(boomGeom, palette.body);
  group.add(boomLines);

  // Forward Nose Sensor Turret & Wingtips (Accent)
  const turretGeom = new THREE.SphereGeometry(0.18, 8, 6);
  geometries.push(turretGeom);
  const accentMesh = new THREE.Mesh(turretGeom, palette.accent);
  accentMesh.position.set(0, -0.15, -0.65);
  group.add(accentMesh);

  // Pusher Propeller Disc
  const propGeom = new THREE.CircleGeometry(0.35, 12);
  geometries.push(propGeom);
  const propMesh = new THREE.Mesh(propGeom, palette.rotors ?? palette.accent);
  propMesh.position.set(0, 0, 0.75);
  group.add(propMesh);

  // Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.6, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'FRIENDLY',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 2. Avian Contact (BIRD).
 * Features:
 * - Natural aerodynamic bird silhouette (curved tapered wings, tail fan, beak).
 * - Distinctly non-mechanical organic appearance.
 */
export function buildBirdModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Bird';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const birdGeom = createBirdBodyGeometry();
  geometries.push(birdGeom);
  const bodyMesh = new THREE.Mesh(birdGeom, palette.body);
  group.add(bodyMesh);

  // Subtle eye / head crest accent
  const headGeom = new THREE.SphereGeometry(0.12, 6, 6);
  geometries.push(headGeom);
  const accentMesh = new THREE.Mesh(headGeom, palette.accent);
  accentMesh.position.set(0, 0.15, -0.4);
  group.add(accentMesh);

  // Hit Proxy (forgiving 2.2m sphere for reliable selection)
  const hitGeom = new THREE.SphereGeometry(2.2, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'BIRD',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 3. Unknown / Unclassified Contact (UNKNOWN).
 * Features:
 * - Neutral geometric tactical rhomboid / beacon.
 * - Inset facet lines with radar interrogation marker.
 * - Strictly does NOT disclose whether the contact is a multirotor, fixed-wing, bird, or decoy.
 */
export function buildUnknownContactModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Unknown_Contact';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const beaconGeom = createUnknownContactGeometry(1.6);
  geometries.push(beaconGeom);
  const bodyMesh = new THREE.Mesh(beaconGeom, palette.body);
  group.add(bodyMesh);

  // Wireframe interrogation facet outline
  const edgesGeom = new THREE.EdgesGeometry(beaconGeom);
  geometries.push(edgesGeom);
  const wireLines = new THREE.LineSegments(edgesGeom, palette.accent);
  group.add(wireLines);

  // Center interrogation beacon pulse core
  const coreGeom = new THREE.OctahedronGeometry(0.35, 0);
  geometries.push(coreGeom);
  const accentMesh = new THREE.Mesh(coreGeom, palette.accent);
  group.add(accentMesh);

  // Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.4, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'UNKNOWN',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 4. Tactical Radar Contact Symbol (RADAR_SYMBOL).
 * Features:
 * - High-contrast tactical radar diamond reticle with central echo pip.
 * - Altitude drop stem anchor.
 * - Clear screen-space hit target.
 * - Used when RADAR is active and no visual observation supports an optical model.
 */
export function buildRadarContactSymbolModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Radar_Symbol';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Outer diamond reticle
  const diamondPts = [
     0.0, 0.0, -1.5,
     1.5, 0.0,  0.0,
     1.5, 0.0,  0.0,
     0.0, 0.0,  1.5,
     0.0, 0.0,  1.5,
    -1.5, 0.0,  0.0,
    -1.5, 0.0,  0.0,
     0.0, 0.0, -1.5,
  ];
  const diamondGeom = new THREE.BufferGeometry();
  diamondGeom.setAttribute('position', new THREE.Float32BufferAttribute(diamondPts, 3));
  geometries.push(diamondGeom);
  const bodyMesh = new THREE.LineSegments(diamondGeom, palette.accent);
  group.add(bodyMesh);

  // Realistic 3D tactical aircraft airframe in center of radar reticle (real object instead of pure yellow blip)
  const airframeMat = new THREE.MeshLambertMaterial({
    color: 0x22272e,
  });
  materials.push(airframeMat);
  const airframeGeom = createAircraftBodyGeometry();
  geometries.push(airframeGeom);
  const airframeMesh = new THREE.Mesh(airframeGeom, airframeMat);
  airframeMesh.scale.set(0.65, 0.65, 0.65);
  group.add(airframeMesh);

  // Center radar return blip / pip
  const pipGeom = new THREE.SphereGeometry(0.35, 8, 6);
  geometries.push(pipGeom);
  const accentMesh = new THREE.Mesh(pipGeom, palette.accent);
  group.add(accentMesh);

  // Outer radar range / velocity heading tick
  const tickPts = [0.0, 0.0, -1.5, 0.0, 0.0, -2.6];
  const tickGeom = new THREE.BufferGeometry();
  tickGeom.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
  geometries.push(tickGeom);
  const tickLine = new THREE.Line(tickGeom, palette.accent);
  group.add(tickLine);

  // Generous hit proxy (3.2m radius) for effortless raycast picking
  const hitGeom = new THREE.SphereGeometry(3.2, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'RADAR_SYMBOL',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 5. Generic Unresolved Air-Contact Silhouette (UNKNOWN_AIRFRAME).
 * Features:
 * - Sleek generic aerodynamic lifting body with stubby delta wings.
 * - Used during partial visual observation (e.g. distant EO/IR or degraded fog)
 *   where an airborne craft is visually confirmed but subtype remains unresolved.
 */
export function buildUnresolvedAirframeModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Unresolved_Airframe';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Fuselage pod
  const podGeom = new THREE.ConeGeometry(0.35, 1.8, 6);
  podGeom.rotateX(-Math.PI / 2);
  geometries.push(podGeom);
  const bodyMesh = new THREE.Mesh(podGeom, palette.body);
  group.add(bodyMesh);

  // Stubby wings
  const wingGeom = new THREE.BoxGeometry(2.2, 0.06, 0.5);
  geometries.push(wingGeom);
  const wingMesh = new THREE.Mesh(wingGeom, palette.body);
  wingMesh.position.set(0, 0.02, 0.1);
  group.add(wingMesh);

  // Nose optical sensor bubble (accent)
  const noseGeom = new THREE.SphereGeometry(0.18, 6, 6);
  geometries.push(noseGeom);
  const accentMesh = new THREE.Mesh(noseGeom, palette.accent);
  accentMesh.position.set(0, 0, -0.92);
  group.add(accentMesh);

  // Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.8, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'UNKNOWN_AIRFRAME',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

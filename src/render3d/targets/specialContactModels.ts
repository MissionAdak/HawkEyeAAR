import * as THREE from 'three';
import type { BuiltTargetModel, TargetModelPalette } from './targetModelTypes';
import {
  createBirdBodyGeometry,
  createUnknownContactGeometry,
  createQuadcopterFrameGeometry,
  createRotorDiscsGeometry,
} from './targetGeometry';
import {
  createAircraftBodyGeometry,
  createAircraftAccentGeometry,
} from '../aircraftModel';

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
 * - Real, authentic 3D military aircraft airframes (fighter jet, twin-boom UAV, quadcopter, delta interceptor)
 *   rendered in visible tactical metallic titanium and slate materials.
 * - Varied morphology per track to present distinct, recognizable aircraft types.
 * - Framed by fine tactical HUD radar reticle corner brackets.
 * - Used in RADAR mode and unclassified radar tracking.
 */
export function buildRadarContactSymbolModel(palette: TargetModelPalette, trackNo?: string): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Radar_Symbol';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 1. Fine tactical corner brackets framing target at distance 1.6m
  const b = 1.6;
  const l = 0.45;
  const bracketPts = [
    // Top-left corner
    -b, 0, -(b - l),  -b, 0, -b,
    -b, 0, -b,        -(b - l), 0, -b,
    // Top-right corner
     b, 0, -(b - l),   b, 0, -b,
     b, 0, -b,         (b - l), 0, -b,
    // Bottom-right corner
     b, 0,  (b - l),   b, 0,  b,
     b, 0,  b,         (b - l), 0,  b,
    // Bottom-left corner
    -b, 0,  (b - l),  -b, 0,  b,
    -b, 0,  b,        -(b - l), 0,  b,
  ];
  const bracketGeom = new THREE.BufferGeometry();
  bracketGeom.setAttribute('position', new THREE.Float32BufferAttribute(bracketPts, 3));
  geometries.push(bracketGeom);
  // palette.body preserves test compatibility (expect(radarMat.color.getHex()).toBe(0xffb700))
  const bodyMesh = new THREE.LineSegments(bracketGeom, palette.body);
  group.add(bodyMesh);

  // 2. Realistic 3D tactical aircraft materials (high contrast, authentic military slate & titanium)
  const airframeMat = new THREE.MeshLambertMaterial({ color: 0x475569 }); // Tactical slate gray
  const accentMat = new THREE.MeshBasicMaterial({ color: 0x94A3B8 });     // Titanium highlight
  materials.push(airframeMat, accentMat);

  // 3. Select distinct airframe morphology based on track identifier
  const trackNum = trackNo ? (parseInt(trackNo.replace(/\D/g, ''), 10) || 1) : 1;
  const variant = trackNum % 4;

  let accentMesh: THREE.Mesh;

  if (variant === 0) {
    // --- Variant 0: Fixed-Wing Jet / Fast Attack Interceptor ---
    const airframeGeom = createAircraftBodyGeometry();
    geometries.push(airframeGeom);
    const airframeMesh = new THREE.Mesh(airframeGeom, airframeMat);
    airframeMesh.scale.set(0.95, 0.95, 0.95);
    group.add(airframeMesh);

    const canopyGeom = createAircraftAccentGeometry();
    geometries.push(canopyGeom);
    accentMesh = new THREE.Mesh(canopyGeom, accentMat);
    accentMesh.scale.set(0.95, 0.95, 0.95);
    group.add(accentMesh);
  } else if (variant === 1) {
    // --- Variant 1: Tactical Twin-Boom Pusher UAV ---
    const podGeom = new THREE.CylinderGeometry(0.26, 0.30, 1.6, 8);
    podGeom.rotateX(Math.PI / 2);
    geometries.push(podGeom);
    const podMesh = new THREE.Mesh(podGeom, airframeMat);
    group.add(podMesh);

    const wingGeom = new THREE.BoxGeometry(3.6, 0.08, 0.45);
    geometries.push(wingGeom);
    const wingMesh = new THREE.Mesh(wingGeom, airframeMat);
    wingMesh.position.set(0, 0.12, -0.15);
    group.add(wingMesh);

    const boomPts = [
      -0.65, 0.12, -0.15, -0.65, 0.18, 1.30,
       0.65, 0.12, -0.15,  0.65, 0.18, 1.30,
      -0.65, 0.18,  1.30,  0.65, 0.18, 1.30,
      -0.65, 0.18,  1.30, -0.65, 0.58, 1.35,
       0.65, 0.18,  1.30,  0.65, 0.58, 1.35,
    ];
    const boomGeom = new THREE.BufferGeometry();
    boomGeom.setAttribute('position', new THREE.Float32BufferAttribute(boomPts, 3));
    geometries.push(boomGeom);
    const boomLines = new THREE.LineSegments(boomGeom, accentMat);
    group.add(boomLines);

    const sensorTurretGeom = new THREE.SphereGeometry(0.18, 8, 6);
    geometries.push(sensorTurretGeom);
    accentMesh = new THREE.Mesh(sensorTurretGeom, accentMat);
    accentMesh.position.set(0, -0.16, -0.75);
    group.add(accentMesh);
  } else if (variant === 2) {
    // --- Variant 2: Tactical Multirotor Quadcopter Drone ---
    const podGeom = new THREE.BoxGeometry(0.48, 0.22, 0.72);
    geometries.push(podGeom);
    const podMesh = new THREE.Mesh(podGeom, airframeMat);
    group.add(podMesh);

    const frameGeom = createQuadcopterFrameGeometry(1.9, 0.04);
    geometries.push(frameGeom);
    const frameMesh = new THREE.LineSegments(frameGeom, airframeMat);
    group.add(frameMesh);

    const rotorsGeom = createRotorDiscsGeometry(1.9, 0.38);
    geometries.push(rotorsGeom);
    const rotorsMesh = new THREE.Mesh(rotorsGeom, accentMat);
    group.add(rotorsMesh);

    const cameraGeom = new THREE.SphereGeometry(0.14, 8, 6);
    geometries.push(cameraGeom);
    accentMesh = new THREE.Mesh(cameraGeom, accentMat);
    accentMesh.position.set(0, -0.12, -0.42);
    group.add(accentMesh);
  } else {
    // --- Variant 3: Delta-Wing Loitering Munition / Fast UAS ---
    const bodyGeom = new THREE.ConeGeometry(0.38, 2.0, 6);
    bodyGeom.rotateX(-Math.PI / 2);
    geometries.push(bodyGeom);
    const bodyCone = new THREE.Mesh(bodyGeom, airframeMat);
    group.add(bodyCone);

    const deltaWingGeom = new THREE.BoxGeometry(2.8, 0.06, 0.65);
    geometries.push(deltaWingGeom);
    const deltaWings = new THREE.Mesh(deltaWingGeom, airframeMat);
    deltaWings.position.set(0, 0.02, 0.15);
    group.add(deltaWings);

    // Twin vertical winglet fins
    const finGeom = new THREE.BoxGeometry(0.04, 0.45, 0.35);
    geometries.push(finGeom);
    const leftFin = new THREE.Mesh(finGeom, accentMat);
    leftFin.position.set(-1.38, 0.22, 0.18);
    const rightFin = new THREE.Mesh(finGeom, accentMat);
    rightFin.position.set(1.38, 0.22, 0.18);
    group.add(leftFin, rightFin);

    const noseGeom = new THREE.SphereGeometry(0.16, 6, 6);
    geometries.push(noseGeom);
    accentMesh = new THREE.Mesh(noseGeom, accentMat);
    accentMesh.position.set(0, 0, -1.02);
    group.add(accentMesh);
  }

  // 4. Subtle radar heading tick indicator
  const tickPts = [0.0, 0.0, -1.6, 0.0, 0.0, -2.4];
  const tickGeom = new THREE.BufferGeometry();
  tickGeom.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
  geometries.push(tickGeom);
  const tickLine = new THREE.Line(tickGeom, accentMat);
  group.add(tickLine);

  // 5. Generous hit proxy (3.2m radius) for effortless raycast picking
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

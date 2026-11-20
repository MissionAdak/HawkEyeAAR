import * as THREE from 'three';
import type { BuiltTargetModel, TargetModelPalette } from './targetModelTypes';
import {
  createQuadcopterFrameGeometry,
  createRotorDiscsGeometry,
  createRotorGuardsGeometry,
} from './targetGeometry';

/**
 * 1. Compact multirotor / FPV-style Attack UAV (HOSTILE_ATTACK).
 * Features:
 * - 4-arm carbon X-frame.
 * - Distinctive front-canted camera mount / warhead housing.
 * - Rotor guards and high-RPM rotor discs.
 * - Aggressive silhouette.
 */
export function buildFpvAttackModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_FPV_Attack';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Carbon X-Frame
  const armSpan = 1.4;
  const frameGeom = createQuadcopterFrameGeometry(armSpan);
  geometries.push(frameGeom);
  const frameLines = new THREE.LineSegments(frameGeom, palette.body);
  group.add(frameLines);

  // Central Avionics & Battery Body
  const bodyGeom = new THREE.BoxGeometry(0.35, 0.22, 0.7);
  geometries.push(bodyGeom);
  const bodyMesh = new THREE.Mesh(bodyGeom, palette.body);
  bodyMesh.position.set(0, 0.05, 0);
  group.add(bodyMesh);

  // Forward FPV Camera Snout (canted forward/up)
  const cameraGeom = new THREE.ConeGeometry(0.12, 0.25, 6);
  cameraGeom.rotateX(-Math.PI / 2.6);
  geometries.push(cameraGeom);
  const accentMesh = new THREE.Mesh(cameraGeom, palette.accent);
  accentMesh.position.set(0, 0.12, -0.4);
  group.add(accentMesh);

  // Rotor guards
  const guardsGeom = createRotorGuardsGeometry(armSpan, 0.35);
  geometries.push(guardsGeom);
  const guardsLines = new THREE.LineSegments(guardsGeom, palette.body);
  group.add(guardsLines);

  // High-RPM Rotor Discs
  const discsGeom = createRotorDiscsGeometry(armSpan, 0.3);
  geometries.push(discsGeom);
  const discsMesh = new THREE.Mesh(discsGeom, palette.rotors ?? palette.accent);
  group.add(discsMesh);

  // Forgiving 3D Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.4, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'HOSTILE_ATTACK',
    group,
    bodyMesh,
    accentMesh,
    animatedComponents: [discsMesh],
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 2. Reconnaissance UAV (HOSTILE_ISR).
 * Features:
 * - Wide surveillance quadcopter frame.
 * - Prominent 3-axis ventral sensor turret pod (EO/IR gimbal).
 * - Upper telemetry dome / antenna mast.
 */
export function buildReconQuadModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Recon_Quad';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const armSpan = 2.0;
  const frameGeom = createQuadcopterFrameGeometry(armSpan, 0.07);
  geometries.push(frameGeom);
  const frameLines = new THREE.LineSegments(frameGeom, palette.body);
  group.add(frameLines);

  // Aerodynamic Fuselage Pod
  const bodyGeom = new THREE.CylinderGeometry(0.28, 0.32, 0.9, 8);
  bodyGeom.rotateX(Math.PI / 2);
  geometries.push(bodyGeom);
  const bodyMesh = new THREE.Mesh(bodyGeom, palette.body);
  group.add(bodyMesh);

  // Ventral Sensor Turret Sphere (prominent gimbal pod)
  const turretGeom = new THREE.SphereGeometry(0.24, 12, 10);
  geometries.push(turretGeom);
  const accentMesh = new THREE.Mesh(turretGeom, palette.accent);
  accentMesh.position.set(0, -0.28, -0.32);
  group.add(accentMesh);

  // Upper GPS / Satellite Dome
  const domeGeom = new THREE.SphereGeometry(0.14, 8, 6);
  domeGeom.scale(1, 0.6, 1);
  geometries.push(domeGeom);
  const domeMesh = new THREE.Mesh(domeGeom, palette.accent);
  domeMesh.position.set(0, 0.22, 0.1);
  group.add(domeMesh);

  // Rotor Discs
  const discsGeom = createRotorDiscsGeometry(armSpan, 0.45);
  geometries.push(discsGeom);
  const discsMesh = new THREE.Mesh(discsGeom, palette.rotors ?? palette.accent);
  group.add(discsMesh);

  // Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.6, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'HOSTILE_ISR',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 3. Swarm Element (SWARM_ELEMENT).
 * Features:
 * - Ultra-compact micro-multirotor geometry.
 * - Distinct small proportion when multiple swarm contacts are active.
 * - High-contrast directional fins.
 */
export function buildSwarmElementModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Swarm_Element';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const armSpan = 0.9;
  const frameGeom = createQuadcopterFrameGeometry(armSpan, 0.035);
  geometries.push(frameGeom);
  const frameLines = new THREE.LineSegments(frameGeom, palette.body);
  group.add(frameLines);

  // Minimal Central Core Block
  const bodyGeom = new THREE.BoxGeometry(0.22, 0.14, 0.35);
  geometries.push(bodyGeom);
  const bodyMesh = new THREE.Mesh(bodyGeom, palette.body);
  group.add(bodyMesh);

  // High-contrast Swarm Directional Arrow Fin
  const finGeom = new THREE.ConeGeometry(0.12, 0.28, 4);
  finGeom.rotateX(-Math.PI / 2);
  geometries.push(finGeom);
  const accentMesh = new THREE.Mesh(finGeom, palette.accent);
  accentMesh.position.set(0, 0.12, -0.22);
  group.add(accentMesh);

  // Small High-Speed Rotors
  const discsGeom = createRotorDiscsGeometry(armSpan, 0.22);
  geometries.push(discsGeom);
  const discsMesh = new THREE.Mesh(discsGeom, palette.rotors ?? palette.accent);
  group.add(discsMesh);

  // Hit Proxy (keeps 2.2m radius so operator can pick swarm targets without difficulty)
  const hitGeom = new THREE.SphereGeometry(2.2, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'SWARM_ELEMENT',
    group,
    bodyMesh,
    accentMesh,
    animatedComponents: [discsMesh],
    hitProxy,
    disposables: { geometries, materials },
  };
}

/**
 * 4. Civilian UAS (CIVIL_UAS).
 * Features:
 * - Consumer quadcopter silhouette (smooth shell, landing skids).
 * - Neutral / civilian visual treatment.
 */
export function buildCivilUasModel(palette: TargetModelPalette): BuiltTargetModel {
  const group = new THREE.Group();
  group.name = 'Target_Civil_UAS';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const armSpan = 1.3;
  const frameGeom = createQuadcopterFrameGeometry(armSpan, 0.05);
  geometries.push(frameGeom);
  const frameLines = new THREE.LineSegments(frameGeom, palette.body);
  group.add(frameLines);

  // Sleek Aerodynamic Upper Shell
  const bodyGeom = new THREE.SphereGeometry(0.32, 10, 8);
  bodyGeom.scale(0.9, 0.5, 1.4);
  geometries.push(bodyGeom);
  const bodyMesh = new THREE.Mesh(bodyGeom, palette.body);
  bodyMesh.position.set(0, 0.08, 0);
  group.add(bodyMesh);

  // Forward Status Light / Camera Lens Accent
  const lensGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8);
  lensGeom.rotateX(Math.PI / 2);
  geometries.push(lensGeom);
  const accentMesh = new THREE.Mesh(lensGeom, palette.accent);
  accentMesh.position.set(0, 0.02, -0.42);
  group.add(accentMesh);

  // Twin Landing Skids
  const skidPts = [
    // Left skid
    -0.3, -0.22, -0.45,
    -0.3, -0.22,  0.45,
    // Right skid
     0.3, -0.22, -0.45,
     0.3, -0.22,  0.45,
    // Left struts
    -0.2, 0, -0.15,
    -0.3, -0.22, -0.15,
    -0.2, 0,  0.15,
    -0.3, -0.22,  0.15,
    // Right struts
     0.2, 0, -0.15,
     0.3, -0.22, -0.15,
     0.2, 0,  0.15,
     0.3, -0.22,  0.15,
  ];
  const skidGeom = new THREE.BufferGeometry();
  skidGeom.setAttribute('position', new THREE.Float32BufferAttribute(skidPts, 3));
  geometries.push(skidGeom);
  const skidLines = new THREE.LineSegments(skidGeom, palette.body);
  group.add(skidLines);

  // Rotor Discs
  const discsGeom = createRotorDiscsGeometry(armSpan, 0.28);
  geometries.push(discsGeom);
  const discsMesh = new THREE.Mesh(discsGeom, palette.rotors ?? palette.accent);
  group.add(discsMesh);

  // Hit Proxy
  const hitGeom = new THREE.SphereGeometry(2.4, 8, 6);
  geometries.push(hitGeom);
  const hitProxy = new THREE.Mesh(hitGeom, palette.hitProxy);
  group.add(hitProxy);

  return {
    category: 'CIVIL_UAS',
    group,
    bodyMesh,
    accentMesh,
    hitProxy,
    disposables: { geometries, materials },
  };
}

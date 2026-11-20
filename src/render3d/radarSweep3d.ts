import * as THREE from 'three';
import { calculateRadarSweepAngle } from '@/sim/radarMath';
import type { SensorMode } from '@/sim/types';

export interface RadarSweep3DOptions {
  radiusM?: number;
  heightM?: number;
  sweepPeriodMs?: number;
}

/**
 * 3D Tactical Radar Sweep Visualization (Task 17 Phase 5).
 * - Rotates antenna assembly atop the primary surveillance radar mast.
 * - Displays a thin, translucent rotating radar scan beam / ground sweep sector.
 * - Synchronized 100% with the 2D tactical console radar sweep (30 RPM).
 * - Responsive to radar health: nominal (green), degraded (amber), dropout (hidden/standby).
 * - STRICTLY zero revelation of hidden contacts.
 */
export class RadarSweep3D {
  public readonly group: THREE.Group;
  public readonly antennaPivot: THREE.Group;
  private readonly beamGroup: THREE.Group;
  private readonly sweepWedgeMesh: THREE.Mesh;
  private readonly sweepLine: THREE.Line;
  private readonly pulseRing: THREE.Mesh;
  private readonly wedgeMaterial: THREE.MeshBasicMaterial;
  private readonly lineMaterial: THREE.LineBasicMaterial;
  private readonly pulseMaterial: THREE.MeshBasicMaterial;
  private readonly disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
    geometries: [],
    materials: [],
  };

  private currentHealth: 'NOMINAL' | 'DEGRADED' | 'OUT' = 'NOMINAL';
  private readonly radiusM: number;

  constructor(options: RadarSweep3DOptions = {}) {
    this.radiusM = options.radiusM ?? 5000;
    this.group = new THREE.Group();
    this.group.name = 'RadarSweep3D';

    // 1. Antenna Pivot (mounted at top of radar mast Y=56m)
    this.antennaPivot = new THREE.Group();
    this.antennaPivot.name = 'RadarAntennaPivot';
    this.antennaPivot.position.set(0, 56, 0);

    // Modern Curved S-Band Phased Array Antenna Reflector
    const dishGeom = new THREE.CylinderGeometry(8, 2, 4, 16);
    dishGeom.rotateZ(Math.PI / 2);
    this.disposables.geometries.push(dishGeom);
    const dishMat = new THREE.MeshLambertMaterial({ color: 0x48586c });
    this.disposables.materials.push(dishMat);
    const dishMesh = new THREE.Mesh(dishGeom, dishMat);
    this.antennaPivot.add(dishMesh);

    // Antenna Feed Horn Arm
    const feedGeom = new THREE.BoxGeometry(0.5, 0.5, 6);
    this.disposables.geometries.push(feedGeom);
    const feedMesh = new THREE.Mesh(feedGeom, dishMat);
    feedMesh.position.set(0, 0, -4);
    this.antennaPivot.add(feedMesh);

    this.group.add(this.antennaPivot);

    // 2. Rotating Scan Beam Group
    this.beamGroup = new THREE.Group();
    this.beamGroup.name = 'RadarScanBeam';
    this.beamGroup.position.set(0, 1.5, 0); // Positioned slightly above terrain ground plane

    // Ground Sweep Sector Wedge (spanning 8 degrees = ~0.14 rad trailing phosphor wedge)
    const wedgeAngleRad = (8 * Math.PI) / 180;
    const wedgeSegments = 16;
    const wedgeGeom = new THREE.RingGeometry(150, this.radiusM, wedgeSegments, 1, -wedgeAngleRad, wedgeAngleRad);
    wedgeGeom.rotateX(Math.PI / 2);
    this.disposables.geometries.push(wedgeGeom);

    this.wedgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.disposables.materials.push(this.wedgeMaterial);
    this.sweepWedgeMesh = new THREE.Mesh(wedgeGeom, this.wedgeMaterial);
    this.beamGroup.add(this.sweepWedgeMesh);

    // Leading Phosphor Sweep Line
    const linePts = [new THREE.Vector3(150, 0, 0), new THREE.Vector3(this.radiusM, 0, 0)];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
    this.disposables.geometries.push(lineGeom);
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.disposables.materials.push(this.lineMaterial);
    this.sweepLine = new THREE.Line(lineGeom, this.lineMaterial);
    this.beamGroup.add(this.sweepLine);

    this.group.add(this.beamGroup);

    // 3. Subtle Concentric Pulse Ring (near emitter)
    const pulseGeom = new THREE.RingGeometry(120, 130, 32);
    pulseGeom.rotateX(Math.PI / 2);
    this.disposables.geometries.push(pulseGeom);
    this.pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.disposables.materials.push(this.pulseMaterial);
    this.pulseRing = new THREE.Mesh(pulseGeom, this.pulseMaterial);
    this.pulseRing.position.set(0, 2, 0);
    this.group.add(this.pulseRing);
  }

  /**
   * Updates the radar sensor condition.
   */
  public setSensorHealth(health: 'NOMINAL' | 'DEGRADED' | 'OUT', activeSensor: SensorMode | 'ALL' = 'RADAR'): void {
    this.currentHealth = health;

    if (activeSensor !== 'RADAR' && activeSensor !== 'ALL') {
      this.beamGroup.visible = false;
      this.pulseRing.visible = false;
      return;
    }

    if (health === 'OUT') {
      // RADAR_DROPOUT or Jamming: completely disable scan beam
      this.beamGroup.visible = false;
      this.pulseRing.visible = false;
    } else if (health === 'DEGRADED') {
      this.beamGroup.visible = true;
      this.pulseRing.visible = true;
      this.wedgeMaterial.color.setHex(0xffaa00);
      this.lineMaterial.color.setHex(0xffaa00);
      this.pulseMaterial.color.setHex(0xffaa00);
      this.wedgeMaterial.opacity = 0.08;
      this.lineMaterial.opacity = 0.35;
    } else {
      this.beamGroup.visible = true;
      this.pulseRing.visible = true;
      this.wedgeMaterial.color.setHex(0x00ff66);
      this.lineMaterial.color.setHex(0x00ff66);
      this.pulseMaterial.color.setHex(0x00ff66);
      this.wedgeMaterial.opacity = 0.12;
      this.lineMaterial.opacity = 0.55;
    }
  }

  /**
   * Per-frame animation tick driven strictly by simulation clock simMs.
   */
  public update(simMs: number): void {
    // If radar is knocked out, dish stops and beam is hidden
    if (this.currentHealth === 'OUT') {
      return;
    }

    const { rotationYRad, progress } = calculateRadarSweepAngle(simMs);

    // 1. Rotate antenna dish atop C2 mast
    this.antennaPivot.rotation.y = rotationYRad;

    // 2. Rotate 3D scan beam on ground plane
    // In Three.js, East is +X (angle 0 in linePts).
    // rotationYRad is measured from North (-Z). Since line starts at +X, we offset by -PI/2.
    this.beamGroup.rotation.y = rotationYRad - Math.PI / 2;

    // 3. Subtle pulse ring expansion
    const pulseScale = 1 + (progress % 0.5) * 2;
    this.pulseRing.scale.set(pulseScale, pulseScale, pulseScale);
    this.pulseMaterial.opacity = Math.max(0, 0.3 - (progress % 0.5) * 0.6);
  }

  public dispose(): void {
    for (const g of this.disposables.geometries) g.dispose();
    for (const m of this.disposables.materials) m.dispose();
    this.disposables.geometries.length = 0;
    this.disposables.materials.length = 0;
    this.group.clear();
  }
}

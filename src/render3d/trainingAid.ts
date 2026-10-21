import * as THREE from 'three';
import { toThree } from './coords';
import type { ZoneSpec } from '@/sim/types';
import { CONFIG } from '@/config';
import { calculateRadarRcsShells, type RadarRcsShell } from './trainingAidMath';

export interface TrainingAid3DOptions {
  zones?: ZoneSpec[];
  maxRangeM?: number;
  antennaHeightM?: number;
}

/**
 * 3D Training Aid overlay showing canonical modelled radar shadows and reference RCS shells.
 * Strictly disabled and locked out in EVAL mode.
 * Clearly marked as an approximation of the canonical horizontal-ray model (Not DEM-accurate).
 */
export class TrainingAid3D {
  public readonly group: THREE.Group;
  private readonly zones: ZoneSpec[];
  private readonly maxRangeM: number;
  private readonly antennaHeightM: number;

  private shadowMeshes: THREE.Mesh[] = [];
  private shadowLineSegments: THREE.LineSegments[] = [];
  private rcsRings: THREE.Line[] = [];
  private sprites: THREE.Sprite[] = [];
  private texturesToDispose: THREE.Texture[] = [];
  private materialsToDispose: THREE.Material[] = [];
  private geometriesToDispose: THREE.BufferGeometry[] = [];

  constructor(options: TrainingAid3DOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'TrainingAid3DGroup';
    this.group.visible = false; // Off by default

    this.zones = options.zones ?? [];
    this.maxRangeM = options.maxRangeM ?? (CONFIG.thresholds.radarMaxRangeM || 5000);
    this.antennaHeightM = options.antennaHeightM ?? (CONFIG.thresholds.antennaHeightM || 15);

    this.buildShadowVolumes();
    this.buildRcsShells();
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public get visible(): boolean {
    return this.group.visible;
  }

  /**
   * Constructs modelled shadow volumes for each scenario zone based on the canonical masking rule.
   */
  private buildShadowVolumes(): void {
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber / training warning color
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.materialsToDispose.push(shadowMaterial);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.4,
    });
    this.materialsToDispose.push(edgeMaterial);

    for (const zone of this.zones) {
      if (zone.polygon.length < 3) continue;

      // Calculate centroid of zone
      let cx = 0;
      let cy = 0;
      for (const pt of zone.polygon) {
        cx += pt[0];
        cy += pt[1];
      }
      cx /= zone.polygon.length;
      cy /= zone.polygon.length;

      const rCentroid = Math.hypot(cx, cy);
      if (rCentroid < 1) continue;

      // Build shadow prism for each segment of the polygon facing the radar
      for (let i = 0; i < zone.polygon.length; i++) {
        const p1 = zone.polygon[i];
        const p2 = zone.polygon[(i + 1) % zone.polygon.length];
        this.buildEdgeShadowPrism(p1, p2, zone, shadowMaterial, edgeMaterial);
      }

      // Add tactical label at zone shadow midpoint
      const midDist = rCentroid + zone.shadowM / 2;
      const midX = (cx / rCentroid) * midDist;
      const midY = (cy / rCentroid) * midDist;
      const labelText = `ZONE ${zone.id} SHADOW · H:${zone.heightM}m · REACH:${zone.shadowM}m (APPROX)`;
      const sprite = this.createTacticalSprite(labelText, midX, midY, zone.heightM + 15);
      if (sprite) {
        this.sprites.push(sprite);
        this.group.add(sprite);
      }
    }
  }

  private buildEdgeShadowPrism(
    p1: [number, number],
    p2: [number, number],
    zone: ZoneSpec,
    shadowMaterial: THREE.Material,
    edgeMaterial: THREE.Material
  ): void {
    const r1 = Math.hypot(p1[0], p1[1]);
    const r2 = Math.hypot(p2[0], p2[1]);
    if (r1 < 1 || r2 < 1) return;

    // Normal check: check if edge faces radar origin (0, 0)
    const edx = p2[0] - p1[0];
    const edy = p2[1] - p1[1];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const dot = mx * edy - my * edx;
    if (dot < 0) {
      // Faces away from origin -> skip backface
      return;
    }

    const scale1 = (r1 + zone.shadowM) / r1;
    const scale2 = (r2 + zone.shadowM) / r2;

    const p1Far = [p1[0] * scale1, p1[1] * scale1];
    const p2Far = [p2[0] * scale2, p2[1] * scale2];

    const zNear = zone.heightM;
    const zFar1 = Math.min(180, this.antennaHeightM + scale1 * (zone.heightM - this.antennaHeightM));
    const zFar2 = Math.min(180, this.antennaHeightM + scale2 * (zone.heightM - this.antennaHeightM));

    const v0 = toThree(p1[0], p1[1], 0);
    const v1 = toThree(p2[0], p2[1], 0);
    const v2 = toThree(p2[0], p2[1], zNear);
    const v3 = toThree(p1[0], p1[1], zNear);
    const v4 = toThree(p1Far[0], p1Far[1], 0);
    const v5 = toThree(p2Far[0], p2Far[1], 0);
    const v6 = toThree(p2Far[0], p2Far[1], zFar2);
    const v7 = toThree(p1Far[0], p1Far[1], zFar1);

    const positions: number[] = [
      // Near face
      v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z,
      v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
      // Far face
      v4.x, v4.y, v4.z, v6.x, v6.y, v6.z, v5.x, v5.y, v5.z,
      v4.x, v4.y, v4.z, v7.x, v7.y, v7.z, v6.x, v6.y, v6.z,
      // Top slope face
      v3.x, v3.y, v3.z, v2.x, v2.y, v2.z, v6.x, v6.y, v6.z,
      v3.x, v3.y, v3.z, v6.x, v6.y, v6.z, v7.x, v7.y, v7.z,
      // Bottom face
      v0.x, v0.y, v0.z, v5.x, v5.y, v5.z, v1.x, v1.y, v1.z,
      v0.x, v0.y, v0.z, v4.x, v4.y, v4.z, v5.x, v5.y, v5.z,
      // Side 1
      v0.x, v0.y, v0.z, v3.x, v3.y, v3.z, v7.x, v7.y, v7.z,
      v0.x, v0.y, v0.z, v7.x, v7.y, v7.z, v4.x, v4.y, v4.z,
      // Side 2
      v1.x, v1.y, v1.z, v6.x, v6.y, v6.z, v2.x, v2.y, v2.z,
      v1.x, v1.y, v1.z, v5.x, v5.y, v5.z, v6.x, v6.y, v6.z,
    ];

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    this.geometriesToDispose.push(geom);

    const mesh = new THREE.Mesh(geom, shadowMaterial);
    mesh.renderOrder = 2;
    this.shadowMeshes.push(mesh);
    this.group.add(mesh);

    const edgesGeom = new THREE.EdgesGeometry(geom);
    this.geometriesToDispose.push(edgesGeom);
    const lines = new THREE.LineSegments(edgesGeom, edgeMaterial);
    lines.renderOrder = 3;
    this.shadowLineSegments.push(lines);
    this.group.add(lines);
  }

  /**
   * Constructs horizontal radar reference-RCS shells.
   * Distinct horizontal shells matching the radar equation, avoiding contradictory slant-range domes.
   */
  private buildRcsShells(): void {
    const shells: RadarRcsShell[] = calculateRadarRcsShells(this.maxRangeM);

    for (const shell of shells) {
      const segments = 64;
      const positions: number[] = [];

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = shell.radiusM * Math.cos(theta);
        const y = shell.radiusM * Math.sin(theta);
        const v = toThree(x, y, 1.5);
        positions.push(v.x, v.y, v.z);
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      this.geometriesToDispose.push(geom);

      const color = shell.isGuaranteedLimit ? 0x06b6d4 : 0x38bdf8;
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: shell.isGuaranteedLimit ? 0.45 : 0.25,
      });
      this.materialsToDispose.push(mat);

      const line = new THREE.Line(geom, mat);
      line.renderOrder = 2;
      this.rcsRings.push(line);
      this.group.add(line);

      // Label at North position of ring
      const sprite = this.createTacticalSprite(shell.label, 0, shell.radiusM, 20);
      if (sprite) {
        this.sprites.push(sprite);
        this.group.add(sprite);
      }
    }
  }

  /**
   * Creates a tactical billboard sprite with high-contrast text and SSR safety.
   */
  private createTacticalSprite(text: string, x: number, y: number, z: number): THREE.Sprite | null {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'rgba(10, 15, 20, 0.85)';
    ctx.fillRect(0, 0, 512, 64);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 510, 62);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const texture = new THREE.CanvasTexture(canvas);
    this.texturesToDispose.push(texture);

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    this.materialsToDispose.push(mat);

    const sprite = new THREE.Sprite(mat);
    const pos = toThree(x, y, z);
    sprite.position.copy(pos);
    sprite.scale.set(160, 20, 1);
    sprite.renderOrder = 4;

    return sprite;
  }

  /**
   * Cleanly disposes all Three.js geometries, materials, and textures to avoid memory leaks.
   */
  public dispose(): void {
    for (const mesh of this.shadowMeshes) {
      this.group.remove(mesh);
    }
    for (const seg of this.shadowLineSegments) {
      this.group.remove(seg);
    }
    for (const ring of this.rcsRings) {
      this.group.remove(ring);
    }
    for (const sprite of this.sprites) {
      this.group.remove(sprite);
    }

    for (const geom of this.geometriesToDispose) {
      geom.dispose();
    }
    for (const mat of this.materialsToDispose) {
      mat.dispose();
    }
    for (const tex of this.texturesToDispose) {
      tex.dispose();
    }

    this.shadowMeshes = [];
    this.shadowLineSegments = [];
    this.rcsRings = [];
    this.sprites = [];
    this.geometriesToDispose = [];
    this.materialsToDispose = [];
    this.texturesToDispose = [];
  }
}

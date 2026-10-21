import * as THREE from 'three';
import { toThree } from './coords';
import type { SafeTrackView } from './types';
import {
  detectTrackClusters,
  type ClusterMetrics,
  type ClusterOptions,
} from './clusterMath';

const COLOR_AMBER = 0xFF9900;

interface ClusterMeshRecord {
  group: THREE.Group;
  fillMesh: THREE.Mesh;
  edgeLines: THREE.LineSegments;
  labelSprite: THREE.Sprite;
}

export class ClusterOverlay3D {
  public readonly group: THREE.Group;
  private readonly clusterMeshMap: Map<string, ClusterMeshRecord> = new Map();
  private readonly sharedFillMaterial: THREE.MeshBasicMaterial;
  private readonly sharedEdgeMaterial: THREE.LineBasicMaterial;
  public options: ClusterOptions;

  constructor(options: ClusterOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'ClusterOverlay3D';
    this.options = options;

    // Subordinate transparent fill (alpha <= 0.08, depthWrite: false per Rule R10.13)
    this.sharedFillMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_AMBER,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Subordinate wireframe edge lines
    this.sharedEdgeMaterial = new THREE.LineBasicMaterial({
      color: COLOR_AMBER,
      transparent: true,
      opacity: 0.45,
      linewidth: 1,
    });
  }

  private createLabelTexture(label: string): THREE.Texture {
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.fillRect(0, 0, 384, 48);

      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, 382, 46);

      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FF9900';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 192, 24);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private buildExtrudedPrism(
    hull2D: { x: number; y: number }[],
    zMinM: number,
    zMaxM: number
  ): { fillGeo: THREE.BufferGeometry; edgeGeo: THREE.BufferGeometry } {
    const shape = new THREE.Shape();
    const first = toThree(hull2D[0].x, hull2D[0].y, 0);
    shape.moveTo(first.x, -first.z);

    for (let i = 1; i < hull2D.length; i++) {
      const pt = toThree(hull2D[i].x, hull2D[i].y, 0);
      shape.lineTo(pt.x, -pt.z);
    }
    shape.closePath();

    const depth = Math.max(10, zMaxM - zMinM);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth,
      bevelEnabled: false,
    };

    const fillGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    fillGeo.rotateX(Math.PI / 2);
    fillGeo.translate(0, zMinM, 0);

    // Build edge wireframe outline: bottom loop, top loop, and vertical pillars
    const edgePoints: THREE.Vector3[] = [];
    const n = hull2D.length;

    // Bottom loop (at zMinM) and top loop (at zMaxM)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const p1Bottom = toThree(hull2D[i].x, hull2D[i].y, zMinM);
      const p2Bottom = toThree(hull2D[j].x, hull2D[j].y, zMinM);
      const p1Top = toThree(hull2D[i].x, hull2D[i].y, zMaxM);
      const p2Top = toThree(hull2D[j].x, hull2D[j].y, zMaxM);

      edgePoints.push(
        new THREE.Vector3(p1Bottom.x, p1Bottom.y, p1Bottom.z),
        new THREE.Vector3(p2Bottom.x, p2Bottom.y, p2Bottom.z),
        new THREE.Vector3(p1Top.x, p1Top.y, p1Top.z),
        new THREE.Vector3(p2Top.x, p2Top.y, p2Top.z),
        new THREE.Vector3(p1Bottom.x, p1Bottom.y, p1Bottom.z),
        new THREE.Vector3(p1Top.x, p1Top.y, p1Top.z)
      );
    }

    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);

    return { fillGeo, edgeGeo };
  }

  public update(tracks: SafeTrackView[], visible: boolean): ClusterMetrics[] {
    if (!visible) {
      this.group.visible = false;
      return [];
    }

    this.group.visible = true;
    const clusters = detectTrackClusters(tracks, this.options);
    const presentClusterIds = new Set<string>();

    for (const cluster of clusters) {
      const key = cluster.clusterId;
      presentClusterIds.add(key);

      const { fillGeo, edgeGeo } = this.buildExtrudedPrism(
        cluster.hull2D,
        cluster.zMinM,
        cluster.zMaxM
      );

      let record = this.clusterMeshMap.get(key);

      if (!record) {
        const group = new THREE.Group();
        const fillMesh = new THREE.Mesh(fillGeo, this.sharedFillMaterial);
        fillMesh.renderOrder = 1;

        const edgeLines = new THREE.LineSegments(edgeGeo, this.sharedEdgeMaterial);

        const spriteMat = new THREE.SpriteMaterial({
          map: this.createLabelTexture(cluster.label),
          transparent: true,
          depthTest: false,
        });
        const labelSprite = new THREE.Sprite(spriteMat);
        labelSprite.scale.set(180, 24, 1);

        group.add(fillMesh);
        group.add(edgeLines);
        group.add(labelSprite);

        this.group.add(group);

        record = {
          group,
          fillMesh,
          edgeLines,
          labelSprite,
        };
        this.clusterMeshMap.set(key, record);
      } else {
        record.fillMesh.geometry.dispose();
        record.fillMesh.geometry = fillGeo;

        record.edgeLines.geometry.dispose();
        record.edgeLines.geometry = edgeGeo;

        record.labelSprite.material.map?.dispose();
        record.labelSprite.material.map = this.createLabelTexture(cluster.label);
      }

      // Position label sprite at centroid above the envelope
      const centroidPos = toThree(cluster.centroid.x, cluster.centroid.y, cluster.zMaxM + 25);
      record.labelSprite.position.set(centroidPos.x, centroidPos.y, centroidPos.z);
    }

    // Clean up clusters that no longer exist
    for (const [id, record] of this.clusterMeshMap) {
      if (!presentClusterIds.has(id)) {
        record.fillMesh.geometry.dispose();
        record.edgeLines.geometry.dispose();
        record.labelSprite.material.map?.dispose();
        record.labelSprite.material.dispose();
        this.group.remove(record.group);
        this.clusterMeshMap.delete(id);
      }
    }

    return clusters;
  }

  public dispose(): void {
    for (const [, record] of this.clusterMeshMap) {
      record.fillMesh.geometry.dispose();
      record.edgeLines.geometry.dispose();
      record.labelSprite.material.map?.dispose();
      record.labelSprite.material.dispose();
      this.group.remove(record.group);
    }
    this.clusterMeshMap.clear();

    this.sharedFillMaterial.dispose();
    this.sharedEdgeMaterial.dispose();
  }
}

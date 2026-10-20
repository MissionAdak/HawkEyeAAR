import * as THREE from 'three';
import { toThree } from './coords';
import { Coverage3D, type SensorCoverageState } from './coverage';
import { EffectorEnvelopes3D, type EffectorVisualOptions } from './effectorEnvelopes';
import { LosVisualizer3D } from './losVisualizer';
import { ClusterOverlay3D } from './clusters';
import { TrainingAid3D } from './trainingAid';
import type { SafeTrackView, Scene3DOptions } from './types';
import type { TrackClass, ZoneSpec, SensorMode } from '@/sim/types';

// Tactical Color Tokens adhering to DESIGN.md §1 & PALETTE
const COLOR_CARBON_950 = 0x0D1117;
const COLOR_CARBON_900 = 0x161B22;
const COLOR_LINE = 0x262B33;
const COLOR_PHOSPHOR = 0x00FF66;
const COLOR_PHOSPHOR_DIM = 0x003B1A;
const COLOR_AMBER = 0xFF9900;
const COLOR_THREAT = 0xFF3333;
const COLOR_FRIEND = 0x00CCFF;
const COLOR_UNKNOWN = 0xFFCC00;

interface TrackMeshRecord {
  group: THREE.Group;
  marker: THREE.Mesh;
  stem: THREE.Line;
  ghostRing: THREE.LineLoop | null;
  labelSprite: THREE.Sprite;
  selectionBox: THREE.LineSegments | null;
}

export class Scene3D {
  public readonly scene: THREE.Scene;
  private readonly staticGroup: THREE.Group;
  private readonly zonesGroup: THREE.Group;
  private readonly tracksGroup: THREE.Group;
  public readonly coverage3d: Coverage3D;
  public readonly effectorEnvelopes3d: EffectorEnvelopes3D;
  public readonly losVisualizer3d: LosVisualizer3D;
  public readonly clusterOverlay3d: ClusterOverlay3D;
  public readonly trainingAid3d: TrainingAid3D;
  private readonly zones: ZoneSpec[];

  // Track marker pool & meshes
  private readonly trackMeshMap: Map<string, TrackMeshRecord> = new Map();

  // Shared reusable geometries and materials
  private readonly sharedGeometries: {
    diamond: THREE.BufferGeometry;
    cube: THREE.BufferGeometry;
    cylinder: THREE.BufferGeometry;
    stem: THREE.BufferGeometry;
    selection: THREE.BufferGeometry;
  };

  private readonly sharedMaterials: {
    threat: THREE.MeshBasicMaterial;
    friend: THREE.MeshBasicMaterial;
    civil: THREE.MeshBasicMaterial;
    unknown: THREE.MeshBasicMaterial;
    stem: THREE.LineBasicMaterial;
    stemSelected: THREE.LineBasicMaterial;
    selection: THREE.LineBasicMaterial;
    ghostCoasting: THREE.LineBasicMaterial;
  };

  constructor(options: Scene3DOptions) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLOR_CARBON_950);

    this.zones = options.zones || [];
    this.staticGroup = new THREE.Group();
    this.zonesGroup = new THREE.Group();
    this.tracksGroup = new THREE.Group();
    this.coverage3d = new Coverage3D();
    this.effectorEnvelopes3d = new EffectorEnvelopes3D();
    this.losVisualizer3d = new LosVisualizer3D();
    this.clusterOverlay3d = new ClusterOverlay3D();
    this.trainingAid3d = new TrainingAid3D({ zones: this.zones, maxRangeM: options.maxRangeM });

    this.scene.add(this.staticGroup);
    this.scene.add(this.zonesGroup);
    this.scene.add(this.tracksGroup);
    this.scene.add(this.coverage3d.group);
    this.scene.add(this.effectorEnvelopes3d.group);
    this.scene.add(this.losVisualizer3d.group);
    this.scene.add(this.clusterOverlay3d.group);
    this.scene.add(this.trainingAid3d.group);

    if (options.showTrainingAid && options.mode !== 'EVAL') {
      this.trainingAid3d.setVisible(true);
    }

    // Initialize shared geometries
    this.sharedGeometries = {
      diamond: new THREE.OctahedronGeometry(25, 0),
      cube: new THREE.BoxGeometry(30, 30, 30),
      cylinder: new THREE.CylinderGeometry(20, 20, 15, 8),
      stem: new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 0),
      ]),
      selection: this.createSelectionBracketGeometry(40),
    };

    // Initialize shared materials
    this.sharedMaterials = {
      threat: new THREE.MeshBasicMaterial({ color: COLOR_THREAT, wireframe: true }),
      friend: new THREE.MeshBasicMaterial({ color: COLOR_FRIEND, wireframe: true }),
      civil: new THREE.MeshBasicMaterial({ color: COLOR_PHOSPHOR, wireframe: true }),
      unknown: new THREE.MeshBasicMaterial({ color: COLOR_UNKNOWN, wireframe: true }),
      stem: new THREE.LineBasicMaterial({ color: COLOR_PHOSPHOR_DIM, transparent: true, opacity: 0.6 }),
      stemSelected: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, transparent: true, opacity: 0.9 }),
      selection: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, depthTest: false }),
      ghostCoasting: new THREE.LineBasicMaterial({ color: COLOR_AMBER, transparent: true, opacity: 0.8 }),
    };

    this.buildStaticGround(options.maxRangeM, options.rMinM);
    if (options.zones && options.zones.length > 0) {
      this.buildZones(options.zones);
    }
  }

  private createSelectionBracketGeometry(size: number): THREE.BufferGeometry {
    const s = size / 2;
    const l = s * 0.4;
    const points: THREE.Vector3[] = [
      // Top-Left corner
      new THREE.Vector3(-s, 0, -s + l),
      new THREE.Vector3(-s, 0, -s),
      new THREE.Vector3(-s, 0, -s),
      new THREE.Vector3(-s + l, 0, -s),
      // Top-Right corner
      new THREE.Vector3(s - l, 0, -s),
      new THREE.Vector3(s, 0, -s),
      new THREE.Vector3(s, 0, -s),
      new THREE.Vector3(s, 0, -s + l),
      // Bottom-Left corner
      new THREE.Vector3(-s, 0, s - l),
      new THREE.Vector3(-s, 0, s),
      new THREE.Vector3(-s, 0, s),
      new THREE.Vector3(-s + l, 0, s),
      // Bottom-Right corner
      new THREE.Vector3(s - l, 0, s),
      new THREE.Vector3(s, 0, s),
      new THREE.Vector3(s, 0, s),
      new THREE.Vector3(s, 0, s - l),
    ];

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  /**
   * Builds the tactical ground plane, concentric range rings, and cardinal axes.
   */
  private buildStaticGround(maxRangeM: number, rMinM: number): void {
    // 1. Tactical Grid
    const gridSize = maxRangeM * 2;
    const divisions = 20; // 500m per grid square
    const grid = new THREE.GridHelper(gridSize, divisions, COLOR_LINE, COLOR_CARBON_900);
    grid.position.y = -0.5;
    this.staticGroup.add(grid);

    // 2. Concentric Ground Range Rings (every 1 km)
    for (let r = 1000; r <= maxRangeM; r += 1000) {
      const ringGeom = this.createCircleGeometry(r, 64);
      const ringMat = new THREE.LineBasicMaterial({
        color: COLOR_PHOSPHOR_DIM,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.LineLoop(ringGeom, ringMat);
      ring.position.y = 0;
      this.staticGroup.add(ring);
    }

    // 3. Point of No Return (PNR) Perimeter Ring (rMinM = 500m)
    const pnrGeom = this.createCircleGeometry(rMinM, 64);
    const pnrMat = new THREE.LineBasicMaterial({
      color: COLOR_AMBER,
      transparent: true,
      opacity: 0.8,
    });
    const pnrRing = new THREE.LineLoop(pnrGeom, pnrMat);
    pnrRing.position.y = 0.5;
    this.staticGroup.add(pnrRing);

    // 4. Center Protected Asset Marker at (0, 0, 0)
    const crosshairSize = 100;
    const crossPoints = [
      new THREE.Vector3(-crosshairSize, 0, 0),
      new THREE.Vector3(crosshairSize, 0, 0),
      new THREE.Vector3(0, 0, -crosshairSize),
      new THREE.Vector3(0, 0, crosshairSize),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 150, 0),
    ];
    const crossGeom = new THREE.BufferGeometry().setFromPoints(crossPoints);
    const crossMat = new THREE.LineBasicMaterial({ color: COLOR_PHOSPHOR });
    const crosshair = new THREE.LineSegments(crossGeom, crossMat);
    this.staticGroup.add(crosshair);

    // 5. Cardinal Reference Marks (North: -Z, South: +Z, East: +X, West: -X)
    const axisLen = maxRangeM;
    const axisPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -axisLen), // North (000)
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLen, 0, 0),  // East (090)
    ];
    const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisMat = new THREE.LineBasicMaterial({
      color: COLOR_LINE,
      transparent: true,
      opacity: 0.7,
    });
    this.staticGroup.add(new THREE.LineSegments(axisGeom, axisMat));
  }

  private createCircleGeometry(radius: number, segments: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private clearZones(): void {
    while (this.zonesGroup.children.length > 0) {
      const obj = this.zonesGroup.children[0];
      this.zonesGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }

  private createZoneMesh(zone: ZoneSpec): void {
    if (zone.polygon.length < 3) return;

    // Map sim coordinates (x, y) to Three.js ground (X, -Z)
    const shape = new THREE.Shape();
    const firstPt = toThree(zone.polygon[0][0], zone.polygon[0][1], 0);
    shape.moveTo(firstPt.x, -firstPt.z);

    for (let i = 1; i < zone.polygon.length; i++) {
      const pt = toThree(zone.polygon[i][0], zone.polygon[i][1], 0);
      shape.lineTo(pt.x, -pt.z);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: zone.heightM,
      bevelEnabled: false,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Three.js extrudes along +Z by default; rotate so extrusion goes along +Y (altitude)
    geom.rotateX(Math.PI / 2);

    const isUrban = zone.type === 'URBAN';
    const edgeColor = isUrban ? COLOR_AMBER : COLOR_PHOSPHOR_DIM;

    // Semi-transparent solid body
    const mat = new THREE.MeshBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: isUrban ? 0.15 : 0.08,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geom, mat);
    this.zonesGroup.add(mesh);

    // Wireframe contour outline
    const wireGeom = new THREE.EdgesGeometry(geom);
    const wireMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.6,
    });
    const wire = new THREE.LineSegments(wireGeom, wireMat);
    this.zonesGroup.add(wire);
  }

  /**
   * Procedural terrain zone extrusion derived from actual scenario zone polygons and heights.
   */
  public buildZones(zones: ZoneSpec[]): void {
    this.clearZones();
    for (const zone of zones) {
      this.createZoneMesh(zone);
    }
  }

  /**
   * Generates a procedural canvas text sprite (zero network, zero external fonts).
   */
  private createTextSprite(text: string, colorHex: string): THREE.Sprite {
    if (typeof document === 'undefined') {
      const spriteMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(100, 25, 1);
      return sprite;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
      ctx.fillRect(0, 0, 128, 32);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 126, 30);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = colorHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(100, 25, 1);
    return sprite;
  }

  private getOrCreateTrackRecord(trackNo: string): TrackMeshRecord {
    let record = this.trackMeshMap.get(trackNo);
    if (record) return record;

    // Create new track group
    const group = new THREE.Group();

    // 1. Low-poly marker
    const marker = new THREE.Mesh(this.sharedGeometries.diamond, this.sharedMaterials.threat);
    group.add(marker);

    // 2. Altitude drop stem (connecting marker to ground at Y=0)
    const stem = new THREE.Line(this.sharedGeometries.stem, this.sharedMaterials.stem);
    group.add(stem);

    // 3. Procedural text sprite
    const sprite = this.createTextSprite(trackNo, '#00FF66');
    sprite.position.set(0, 35, 0);
    group.add(sprite);

    // 4. Selection box
    const selectionBox = new THREE.LineSegments(
      this.sharedGeometries.selection,
      this.sharedMaterials.selection
    );
    selectionBox.visible = false;
    group.add(selectionBox);

    record = {
      group,
      marker,
      stem,
      ghostRing: null,
      labelSprite: sprite,
      selectionBox,
    };

    this.trackMeshMap.set(trackNo, record);
    this.tracksGroup.add(group);
    return record;
  }

  private applyTrackSymbology(marker: THREE.Mesh, traineeLabel: TrackClass | null): void {
    if (traineeLabel === 'FRIENDLY') {
      marker.geometry = this.sharedGeometries.cylinder;
      marker.material = this.sharedMaterials.friend;
    } else if (traineeLabel === 'CIVIL_UAS') {
      marker.geometry = this.sharedGeometries.cube;
      marker.material = this.sharedMaterials.civil;
    } else if (
      traineeLabel === 'HOSTILE_ATTACK' ||
      traineeLabel === 'HOSTILE_ISR' ||
      traineeLabel === 'SWARM_ELEMENT'
    ) {
      marker.geometry = this.sharedGeometries.diamond;
      marker.material = this.sharedMaterials.threat;
    } else {
      marker.geometry = this.sharedGeometries.diamond;
      marker.material = this.sharedMaterials.unknown;
    }
  }

  private updateGhostRing(record: TrackMeshRecord, track: SafeTrackView): void {
    if (track.masked && track.ghostSigmaM > 0) {
      if (!record.ghostRing) {
        const ringGeom = this.createCircleGeometry(1, 32);
        record.ghostRing = new THREE.LineLoop(ringGeom, this.sharedMaterials.ghostCoasting);
        record.group.add(record.ghostRing);
      }
      record.ghostRing.visible = true;
      record.ghostRing.scale.set(track.ghostSigmaM, 1, track.ghostSigmaM);
    } else if (record.ghostRing) {
      record.ghostRing.visible = false;
    }
  }

  private pruneInactiveTracks(activeTrackNos: Set<string>): void {
    for (const [trackNo, record] of this.trackMeshMap.entries()) {
      if (!activeTrackNos.has(trackNo)) {
        this.tracksGroup.remove(record.group);
        if (record.labelSprite.material.map) {
          record.labelSprite.material.map.dispose();
        }
        record.labelSprite.material.dispose();
        if (record.ghostRing) {
          record.ghostRing.geometry.dispose();
        }
        this.trackMeshMap.delete(trackNo);
      }
    }
  }

  /**
   * Updates track markers in the 3D scene from safe operator-facing views.
   * Excludes any tracks that are not visible or undetected.
   */
  public updateTracks(tracks: SafeTrackView[], selectedTrackNo: string | null): void {
    const activeTrackNos = new Set<string>();

    for (const track of tracks) {
      activeTrackNos.add(track.trackNo);
      const record = this.getOrCreateTrackRecord(track.trackNo);

      // Compute Three.js position from estimated coordinates
      const threePos = toThree(track.pos.x, track.pos.y, track.pos.z);
      record.group.position.set(threePos.x, 0, threePos.z);
      record.marker.position.set(0, threePos.y, 0);
      record.stem.scale.set(1, Math.max(1, threePos.y), 1);

      this.applyTrackSymbology(record.marker, track.traineeLabel);

      const isSelected = track.trackNo === selectedTrackNo || track.isSelected;
      if (record.selectionBox) {
        record.selectionBox.visible = isSelected;
        record.selectionBox.position.set(0, threePos.y, 0);
      }
      record.stem.material = isSelected
        ? this.sharedMaterials.stemSelected
        : this.sharedMaterials.stem;

      this.updateGhostRing(record, track);
    }

    this.pruneInactiveTracks(activeTrackNos);
  }

  /**
   * Updates model-faithful sensor coverage visualization.
   */
  public updateCoverage(coverageState: SensorCoverageState): void {
    this.coverage3d.update(coverageState);
  }

  /**
   * Filter active sensor coverage volume or show all.
   */
  public setSensorFilter(activeSensor: SensorMode | 'ALL'): void {
    this.coverage3d.setSensorFilter(activeSensor);
  }

  /**
   * Updates model-faithful effector reach, plateau, and target engagement cue.
   */
  public updateEffectorEnvelopes(options: EffectorVisualOptions): void {
    this.effectorEnvelopes3d.update(options);
  }

  /**
   * Updates model-faithful Line-of-Sight (LOS) explanation ray for the selected track.
   */
  public updateLos(selectedTrack: SafeTrackView | null, showLos: boolean = true): void {
    this.losVisualizer3d.update(selectedTrack, this.zones, undefined, showLos);
  }

  /**
   * Updates operator-visible spatial clustering overlay (Task F4).
   */
  public updateClusters(tracks: SafeTrackView[], showClusters: boolean = true): void {
    this.clusterOverlay3d.update(tracks, showClusters);
  }

  /**
   * Updates F5 Training Aid overlay visibility (strictly disabled in EVAL).
   */
  public updateTrainingAid(show: boolean): void {
    this.trainingAid3d.setVisible(show);
  }

  /**
   * Complete scene teardown and memory cleanup.
   */
  public dispose(): void {
    // 1. Dispose sensor coverage, effector resources, LOS visualizer, clusters, and training aid
    this.coverage3d.dispose();
    this.effectorEnvelopes3d.dispose();
    this.losVisualizer3d.dispose();
    this.clusterOverlay3d.dispose();
    this.trainingAid3d.dispose();

    // 2. Dispose track resources
    for (const record of this.trackMeshMap.values()) {
      if (record.labelSprite.material.map) {
        record.labelSprite.material.map.dispose();
      }
      record.labelSprite.material.dispose();
      if (record.ghostRing) {
        record.ghostRing.geometry.dispose();
      }
    }
    this.trackMeshMap.clear();

    // 3. Dispose shared resources
    Object.values(this.sharedGeometries).forEach((g) => g.dispose());
    Object.values(this.sharedMaterials).forEach((m) => m.dispose());

    // 4. Clear scene groups
    this.scene.clear();
  }
}

import * as THREE from 'three';
import { toThree } from './coords';
import type { ZoneSpec, TrueClass } from '@/sim/types';
import type { AarReplayState, AarReplayTruthTrack } from '@/ui/aar/aarReplayTypes';

// Tactical colors matching tokens in DESIGN.md §1 & PALETTE
const COLOR_CARBON_950 = 0x0D1117;
const COLOR_LINE = 0x262B33;
const COLOR_PHOSPHOR = 0x00FF66;
const COLOR_PHOSPHOR_DIM = 0x003B1A;
const COLOR_AMBER = 0xFF9900;
const COLOR_THREAT = 0xFF3333;
const COLOR_FRIEND = 0x00CCFF;
const COLOR_TEXT_DIM = 0x8B949E;

interface AarTrackMeshRecord {
  group: THREE.Group;
  droneMesh: THREE.Mesh;
  altitudeStem: THREE.Line;
  trailLine: THREE.Line;
  labelSprite: THREE.Sprite;
  selectionBox: THREE.LineSegments | null;
  labelKey: string;
}

function getTrackLabelKey(track: AarReplayTruthTrack): string {
  return `${track.trackNo ?? 'TRK'}|${track.trueClass}|${track.traineeLabel ?? ''}|${track.q}|${track.isMasked}`;
}

export class AarScene3D {
  public readonly scene: THREE.Scene;
  private readonly staticGroup: THREE.Group;
  private readonly zonesGroup: THREE.Group;
  private readonly tracksGroup: THREE.Group;
  private readonly eventMarkersGroup: THREE.Group;

  private readonly trackMeshMap: Map<string, AarTrackMeshRecord> = new Map();

  // Reusable materials
  private readonly materials: {
    threat: THREE.MeshBasicMaterial;
    civil: THREE.MeshBasicMaterial;
    friend: THREE.MeshBasicMaterial;
    bird: THREE.MeshBasicMaterial;
    stemClear: THREE.LineBasicMaterial;
    stemMasked: THREE.LineBasicMaterial;
    stemSelected: THREE.LineBasicMaterial;
    trailThreat: THREE.LineBasicMaterial;
    trailCivil: THREE.LineBasicMaterial;
    trailFriend: THREE.LineBasicMaterial;
    trailBird: THREE.LineBasicMaterial;
    selectionBox: THREE.LineBasicMaterial;
    maskingRing: THREE.LineBasicMaterial;
    engagementReticle: THREE.LineBasicMaterial;
  };

  // Reusable geometries
  private readonly geometries: {
    octahedron: THREE.BufferGeometry;
    box: THREE.BufferGeometry;
    cylinder: THREE.BufferGeometry;
    selection: THREE.BufferGeometry;
    reticle: THREE.BufferGeometry;
  };

  constructor(zones: ZoneSpec[] = [], maxRangeM: number = 5000, rMinM: number = 500) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLOR_CARBON_950);

    this.staticGroup = new THREE.Group();
    this.zonesGroup = new THREE.Group();
    this.tracksGroup = new THREE.Group();
    this.eventMarkersGroup = new THREE.Group();

    this.scene.add(this.staticGroup);
    this.scene.add(this.zonesGroup);
    this.scene.add(this.tracksGroup);
    this.scene.add(this.eventMarkersGroup);

    this.geometries = {
      octahedron: new THREE.OctahedronGeometry(22, 0),
      box: new THREE.BoxGeometry(26, 26, 26),
      cylinder: new THREE.CylinderGeometry(18, 18, 14, 8),
      selection: this.createSelectionGeometry(38),
      reticle: this.createReticleGeometry(45),
    };

    this.materials = {
      threat: new THREE.MeshBasicMaterial({ color: COLOR_THREAT, wireframe: true }),
      civil: new THREE.MeshBasicMaterial({ color: COLOR_AMBER, wireframe: true }),
      friend: new THREE.MeshBasicMaterial({ color: COLOR_FRIEND, wireframe: true }),
      bird: new THREE.MeshBasicMaterial({ color: COLOR_TEXT_DIM, wireframe: true }),
      stemClear: new THREE.LineBasicMaterial({ color: COLOR_PHOSPHOR_DIM, transparent: true, opacity: 0.6 }),
      stemMasked: new THREE.LineBasicMaterial({ color: COLOR_AMBER, transparent: true, opacity: 0.9 }),
      stemSelected: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, transparent: true, opacity: 0.9 }),
      trailThreat: new THREE.LineBasicMaterial({ color: COLOR_THREAT, transparent: true, opacity: 0.75 }),
      trailCivil: new THREE.LineBasicMaterial({ color: COLOR_AMBER, transparent: true, opacity: 0.75 }),
      trailFriend: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, transparent: true, opacity: 0.75 }),
      trailBird: new THREE.LineBasicMaterial({ color: COLOR_TEXT_DIM, transparent: true, opacity: 0.5 }),
      selectionBox: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, linewidth: 2 }),
      maskingRing: new THREE.LineBasicMaterial({ color: COLOR_AMBER, linewidth: 2 }),
      engagementReticle: new THREE.LineBasicMaterial({ color: COLOR_THREAT, linewidth: 2 }),
    };

    this.buildStaticScene(maxRangeM, rMinM);
    this.buildZones(zones);
  }

  private createSelectionGeometry(size: number): THREE.BufferGeometry {
    const s = size / 2;
    const vertices = new Float32Array([
      -s, -s, -s,  s, -s, -s,   s, -s, -s,  s,  s, -s,   s,  s, -s, -s,  s, -s,  -s,  s, -s, -s, -s, -s,
      -s, -s,  s,  s, -s,  s,   s, -s,  s,  s,  s,  s,   s,  s,  s, -s,  s,  s,  -s,  s,  s, -s, -s,  s,
      -s, -s, -s, -s, -s,  s,   s, -s, -s,  s, -s,  s,   s,  s, -s,  s,  s,  s,  -s,  s, -s, -s,  s,  s,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }

  private createReticleGeometry(size: number): THREE.BufferGeometry {
    const s = size / 2;
    const vertices = new Float32Array([
      -s, 0, 0,  s, 0, 0,
      0, 0, -s,  0, 0, s,
      -s, 0, -s, s, 0, -s,
      s, 0, -s,  s, 0, s,
      s, 0, s,   -s, 0, s,
      -s, 0, s,  -s, 0, -s,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }

  private buildStaticScene(maxRangeM: number, rMinM: number): void {
    // 1. Concentric Range Rings (1km, 2km, ..., maxRange)
    for (let r = 1000; r <= maxRangeM; r += 1000) {
      const ringGeo = new THREE.RingGeometry(r - 1.5, r + 1.5, 96);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: COLOR_PHOSPHOR_DIM,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      this.staticGroup.add(ringMesh);
    }

    // 2. Protected Asset PNR Ring (rMinM)
    const pnrGeo = new THREE.RingGeometry(rMinM - 2, rMinM + 2, 64);
    pnrGeo.rotateX(-Math.PI / 2);
    const pnrMat = new THREE.MeshBasicMaterial({
      color: COLOR_AMBER,
      side: THREE.DoubleSide,
    });
    this.staticGroup.add(new THREE.Mesh(pnrGeo, pnrMat));

    // 3. Center FOB Mast (15m height)
    const mastGeo = new THREE.CylinderGeometry(2, 4, 15, 8);
    mastGeo.translate(0, 7.5, 0);
    const mastMat = new THREE.MeshBasicMaterial({ color: COLOR_PHOSPHOR, wireframe: true });
    this.staticGroup.add(new THREE.Mesh(mastGeo, mastMat));
  }

  private buildZones(zones: ZoneSpec[]): void {
    for (const zone of zones) {
      if (zone.polygon.length < 3) continue;

      const shape = new THREE.Shape();
      const first = toThree(zone.polygon[0][0], zone.polygon[0][1], 0);
      shape.moveTo(first.x, -first.z);

      for (let i = 1; i < zone.polygon.length; i++) {
        const pt = toThree(zone.polygon[i][0], zone.polygon[i][1], 0);
        shape.lineTo(pt.x, -pt.z);
      }
      shape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: zone.heightM,
        bevelEnabled: false,
      };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.rotateX(Math.PI / 2);

      const color = zone.type === 'URBAN' ? COLOR_AMBER : COLOR_LINE;
      const wireframeMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      });

      const mesh = new THREE.Mesh(geo, wireframeMat);
      this.zonesGroup.add(mesh);
    }
  }

  private createLabelTexture(
    trackNo: string,
    trueClass: string,
    traineeLabel: string | null,
    q: number,
    isMasked: boolean
  ): THREE.Texture {
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(13, 17, 23, 0.88)';
      ctx.fillRect(0, 0, 256, 72);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isMasked ? '#FF9900' : '#00FF66';
      ctx.strokeRect(0, 0, 256, 72);

      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`TRK ${trackNo}`, 8, 20);

      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00CCFF';
      ctx.fillText(`TRUE: ${trueClass}`, 8, 38);

      // Trainee Operator Classification Comparison
      const isMismatch = Boolean(traineeLabel && traineeLabel !== 'UNKNOWN_EVIDENCE_INSUFFICIENT' && traineeLabel !== trueClass);
      ctx.fillStyle = this.getOperatorLabelColor(isMismatch, Boolean(traineeLabel));
      ctx.fillText(`OP: ${traineeLabel ?? 'NONE'} (q=${q.toFixed(2)})`, 8, 56);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private getOperatorLabelColor(isMismatch: boolean, hasTraineeLabel: boolean): string {
    if (isMismatch) return '#FF3333';
    if (hasTraineeLabel) return '#00FF66';
    return '#8B949E';
  }

  private getTrailMaterial(trueClass: TrueClass): THREE.LineBasicMaterial {
    switch (trueClass) {
      case 'CIVIL_UAS':
        return this.materials.trailCivil;
      case 'FRIENDLY':
        return this.materials.trailFriend;
      case 'BIRD':
        return this.materials.trailBird;
      default:
        return this.materials.trailThreat;
    }
  }

  private getStemMaterial(isSelected: boolean, isMasked: boolean): THREE.LineBasicMaterial {
    if (isSelected) return this.materials.stemSelected;
    if (isMasked) return this.materials.stemMasked;
    return this.materials.stemClear;
  }

  private createTrackRecord(track: AarReplayTruthTrack): AarTrackMeshRecord {
    const group = new THREE.Group();

    // Geometry & Material by truth class
    let droneGeo = this.geometries.octahedron;
    let droneMat = this.materials.threat;

    if (track.trueClass === 'CIVIL_UAS') {
      droneGeo = this.geometries.box;
      droneMat = this.materials.civil;
    } else if (track.trueClass === 'FRIENDLY') {
      droneGeo = this.geometries.cylinder;
      droneMat = this.materials.friend;
    } else if (track.trueClass === 'BIRD') {
      droneGeo = this.geometries.octahedron;
      droneMat = this.materials.bird;
    }

    const droneMesh = new THREE.Mesh(droneGeo, droneMat);

    // Altitude ground drop stem
    const stemGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -track.truthPos.z, 0),
    ]);
    const altitudeStem = new THREE.Line(stemGeo, this.materials.stemClear);

    // 10s Trajectory trail line
    const trailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
    const trailMat = this.getTrailMaterial(track.trueClass);
    const trailLine = new THREE.Line(trailGeo, trailMat);

    const labelKey = getTrackLabelKey(track);
    // Operator estimate & truth label sprite
    const spriteMat = new THREE.SpriteMaterial({
      map: this.createLabelTexture(
        track.trackNo ?? 'TRK',
        track.trueClass,
        track.traineeLabel,
        track.q,
        track.isMasked
      ),
      transparent: true,
    });
    const labelSprite = new THREE.Sprite(spriteMat);
    labelSprite.scale.set(120, 36, 1);
    labelSprite.position.set(0, 35, 0);

    group.add(droneMesh);
    group.add(altitudeStem);
    group.add(trailLine);
    group.add(labelSprite);

    this.tracksGroup.add(group);

    const record: AarTrackMeshRecord = {
      group,
      droneMesh,
      altitudeStem,
      trailLine,
      labelSprite,
      selectionBox: null,
      labelKey,
    };
    this.trackMeshMap.set(track.id, record);
    return record;
  }

  private updateTrackRecord(
    record: AarTrackMeshRecord,
    track: AarReplayTruthTrack,
    isSelected: boolean,
    tPos: THREE.Vector3
  ): void {
    // Update positions
    record.group.position.copy(tPos);

    // Update drop stem from drone to ground
    record.altitudeStem.geometry.dispose();
    record.altitudeStem.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -tPos.y, 0),
    ]);
    record.altitudeStem.material = this.getStemMaterial(isSelected, track.isMasked);

    // Update historical trail (relative to current position)
    if (track.trail.length > 1) {
      const trailPoints = track.trail.map((p: { x: number; y: number; z: number }) => {
        const pt = toThree(p.x, p.y, p.z);
        return new THREE.Vector3(pt.x - tPos.x, pt.y - tPos.y, pt.z - tPos.z);
      });
      record.trailLine.geometry.dispose();
      record.trailLine.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
      record.trailLine.visible = true;
    } else {
      record.trailLine.visible = false;
    }

    // Refresh label texture if state changed
    const labelKey = getTrackLabelKey(track);
    if (record.labelKey !== labelKey) {
      record.labelSprite.material.map?.dispose();
      record.labelSprite.material.map = this.createLabelTexture(
        track.trackNo ?? 'TRK',
        track.trueClass,
        track.traineeLabel,
        track.q,
        track.isMasked
      );
      record.labelSprite.material.needsUpdate = true;
      record.labelKey = labelKey;
    }

    // Selection bracket
    if (isSelected && !record.selectionBox) {
      record.selectionBox = new THREE.LineSegments(this.geometries.selection, this.materials.selectionBox);
      record.group.add(record.selectionBox);
    } else if (!isSelected && record.selectionBox) {
      record.group.remove(record.selectionBox);
      record.selectionBox = null;
    }
  }

  private pruneAbsentTracks(presentTrackIds: Set<string>): void {
    for (const [id, record] of this.trackMeshMap) {
      if (!presentTrackIds.has(id)) {
        record.altitudeStem.geometry.dispose();
        record.trailLine.geometry.dispose();
        record.labelSprite.material.map?.dispose();
        record.labelSprite.material.dispose();
        this.tracksGroup.remove(record.group);
        this.trackMeshMap.delete(id);
      }
    }
  }

  /**
   * Updates dynamic 3D elements for the scrubbed AAR replay state.
   */
  public update(state: AarReplayState, selectedTrackNo?: string | null): void {
    const presentTrackIds = new Set<string>();

    // 1. Render Truth Tracks & Historic Trails
    for (const track of state.tracks) {
      presentTrackIds.add(track.id);
      const isSelected = Boolean(selectedTrackNo && track.trackNo === selectedTrackNo);
      const tPos = toThree(track.truthPos.x, track.truthPos.y, track.truthPos.z);

      const record = this.trackMeshMap.get(track.id) ?? this.createTrackRecord(track);
      this.updateTrackRecord(record, track, isSelected, tPos);
    }

    // Remove absent tracks
    this.pruneAbsentTracks(presentTrackIds);

    // 2. Render Active Masking Marker & Engagement Reticle
    this.updateEventMarkers(state);
  }

  private updateEventMarkers(state: AarReplayState): void {
    // Clear dynamic event markers group
    while (this.eventMarkersGroup.children.length > 0) {
      const child = this.eventMarkersGroup.children[0];
      this.eventMarkersGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
      }
    }

    // Active Engagement Marker
    if (state.activeEngagement?.pos) {
      const pos = toThree(state.activeEngagement.pos.x, state.activeEngagement.pos.y, state.activeEngagement.pos.z);
      const reticleMesh = new THREE.LineSegments(this.geometries.reticle, this.materials.engagementReticle);
      reticleMesh.position.copy(pos);
      this.eventMarkersGroup.add(reticleMesh);
    }
  }

  public dispose(): void {
    // Clean track meshes
    for (const [, record] of this.trackMeshMap) {
      record.altitudeStem.geometry.dispose();
      record.trailLine.geometry.dispose();
      record.labelSprite.material.map?.dispose();
      record.labelSprite.material.dispose();
      this.tracksGroup.remove(record.group);
    }
    this.trackMeshMap.clear();

    // Clean static group
    while (this.staticGroup.children.length > 0) {
      const child = this.staticGroup.children[0];
      this.staticGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    // Clean zones
    while (this.zonesGroup.children.length > 0) {
      const child = this.zonesGroup.children[0];
      this.zonesGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    // Clean materials and geometries
    Object.values(this.materials).forEach((m) => m.dispose());
    Object.values(this.geometries).forEach((g) => g.dispose());
  }
}

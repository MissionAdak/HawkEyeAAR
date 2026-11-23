import * as THREE from 'three';
import { toThree } from './coords';
import { Coverage3D, type SensorCoverageState } from './coverage';
import { EffectorEnvelopes3D, type EffectorVisualOptions } from './effectorEnvelopes';
import { LosVisualizer3D } from './losVisualizer';
import { ClusterOverlay3D } from './clusters';
import { TrainingAid3D } from './trainingAid';
import {
  createAircraftBodyGeometry,
  createAircraftAccentGeometry,
  createAircraftHitProxyGeometry,
} from './aircraftModel';
import type { SafeTrackView, Scene3DOptions } from './types';
import type { TrackClass, ZoneSpec, SensorMode, ChaosSpec, SimEvent, OperatorEventView } from '@/sim/types';
import { EnvironmentManager, getScenarioEnvironmentDescriptor } from './environment';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './environment/types';
import { TargetModelFactory, resolveTargetModelCategory } from './targets';
import type { TargetModelCategory, BuiltTargetModel, SensorObservationContext } from './targets';
import { EngagementEffectManager } from './effects';
import type { EngagementEffectContext } from './effects';
import { RadarSweep3D } from './radarSweep3d';
import { RenderTrackMotionFilter } from './motion/RenderTrackMotionFilter';

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

export interface TrackMeshRecord {
  trackNo: string;
  group: THREE.Group;
  modelAnchor: THREE.Group;
  aircraftGroup: THREE.Group;
  bodyMesh: THREE.Mesh | THREE.LineSegments;
  accentMesh: THREE.Mesh;
  hitProxy: THREE.Mesh;
  marker: THREE.Mesh | THREE.LineSegments;
  stem: THREE.Line;
  ghostRing: THREE.LineLoop | null;
  labelSprite: THREE.Sprite;
  selectionBox: THREE.LineSegments | null;
  lastHeadingRad: number;
  lastPitchRad?: number;
  isInitialized?: boolean;
  currentCategory?: TargetModelCategory;
  currentSignature?: string;
  targetModelInstance?: BuiltTargetModel;
  currentLabelText?: string;
}

export function formatTrackLabelText(track: SafeTrackView): {
  text: string;
  labelTag: string;
  colorHex: string;
  altM: number;
} {
  const label = track.traineeLabel;
  let labelTag = 'NON';
  let colorHex = '#FFCC00';

  if (label === 'FRIENDLY') {
    labelTag = 'FRIEND';
    colorHex = '#00CCFF';
  } else if (label === 'CIVIL_UAS') {
    labelTag = 'CIVIL';
    colorHex = '#00FF66';
  } else if (label === 'BIRD') {
    labelTag = 'BIRD';
    colorHex = '#8A99A8';
  } else if (
    label === 'HOSTILE_ATTACK' ||
    label === 'HOSTILE_ISR' ||
    label === 'SWARM_ELEMENT'
  ) {
    if (label === 'HOSTILE_ATTACK') {
      labelTag = 'H-ATK';
    } else if (label === 'HOSTILE_ISR') {
      labelTag = 'H-ISR';
    } else {
      labelTag = 'SWARM';
    }
    colorHex = '#FF3333';
  }

  const altM = Math.round(track.pos.z);
  const text = `${track.trackNo} [${labelTag}] ${altM}m`;
  return { text, labelTag, colorHex, altM };
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
  public readonly targetModelFactory: TargetModelFactory;
  public readonly engagementEffectManager: EngagementEffectManager;
  public readonly radarSweep3d: RadarSweep3D;
  public environmentManager: EnvironmentManager;
  private readonly zones: ZoneSpec[];

  // Track marker pool & meshes
  private readonly trackMeshMap: Map<string, TrackMeshRecord> = new Map();
  private readonly motionFilter = new RenderTrackMotionFilter();

  // Shared reusable geometries and materials
  private readonly sharedGeometries: {
    diamond: THREE.BufferGeometry;
    cube: THREE.BufferGeometry;
    cylinder: THREE.BufferGeometry;
    aircraftBody: THREE.BufferGeometry;
    aircraftAccent: THREE.BufferGeometry;
    aircraftHitProxy: THREE.BufferGeometry;
    stem: THREE.BufferGeometry;
    selection: THREE.BufferGeometry;
  };

  private readonly sharedMaterials: {
    threat: THREE.Material;
    friend: THREE.Material;
    civil: THREE.Material;
    unknown: THREE.Material;
    aircraftBody: THREE.Material;
    hitProxy: THREE.Material;
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

    // Initialize Target Model Factory, Engagement Effects, and Radar Sweep
    this.targetModelFactory = new TargetModelFactory();
    this.engagementEffectManager = new EngagementEffectManager();
    this.radarSweep3d = new RadarSweep3D({ radiusM: options.maxRangeM });

    this.staticGroup.add(this.radarSweep3d.group);
    this.tracksGroup.add(this.engagementEffectManager.group);

    if (options.showTrainingAid && options.mode !== 'EVAL') {
      this.trainingAid3d.setVisible(true);
    }

    // Initialize shared geometries
    this.sharedGeometries = {
      diamond: new THREE.OctahedronGeometry(25, 0),
      cube: new THREE.BoxGeometry(30, 30, 30),
      cylinder: new THREE.CylinderGeometry(20, 20, 15, 8),
      aircraftBody: createAircraftBodyGeometry(),
      aircraftAccent: createAircraftAccentGeometry(),
      aircraftHitProxy: createAircraftHitProxyGeometry(),
      stem: new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 0),
      ]),
      selection: this.createSelectionBracketGeometry(5.0),
    };

    // Initialize shared materials
    this.sharedMaterials = {
      threat: new THREE.MeshLambertMaterial({ color: COLOR_THREAT, side: THREE.DoubleSide }),
      friend: new THREE.MeshLambertMaterial({ color: COLOR_FRIEND, side: THREE.DoubleSide }),
      civil: new THREE.MeshLambertMaterial({ color: COLOR_PHOSPHOR, side: THREE.DoubleSide }),
      unknown: new THREE.MeshLambertMaterial({ color: COLOR_UNKNOWN, side: THREE.DoubleSide }),
      aircraftBody: new THREE.MeshLambertMaterial({ color: 0x2A313C, side: THREE.DoubleSide }),
      hitProxy: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      stem: new THREE.LineBasicMaterial({ color: COLOR_PHOSPHOR_DIM, transparent: true, opacity: 0.6 }),
      stemSelected: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, transparent: true, opacity: 0.9 }),
      selection: new THREE.LineBasicMaterial({ color: COLOR_FRIEND, depthTest: false }),
      ghostCoasting: new THREE.LineBasicMaterial({ color: COLOR_AMBER, transparent: true, opacity: 0.8 }),
    };

    this.buildStaticGround(options.maxRangeM, options.rMinM);
    if (options.zones && options.zones.length > 0) {
      this.buildZones(options.zones);
    }

    const envDescriptor =
      options.environment ??
      getScenarioEnvironmentDescriptor('DEMO-1', {
        id: 'DEMO-1',
        schemaVersion: 1,
        simVersion: '1.1.0',
        configHash: '',
        mode: options.mode ?? 'TRAIN',
        seed: 2026,
        difficulty: 0.5,
        dayNight: 'DAY',
        durationMs: 120000,
        asset: { x: 0, y: 0, rMinM: options.rMinM },
        zones: this.zones,
        threats: [],
        decoys: [],
        chaos: [],
        triggers: [],
        roeText: '',
        levers: [],
        features: [],
      });

    this.environmentManager = new EnvironmentManager(this.staticGroup, envDescriptor, this.scene);
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
    // 0. Tactical Illumination (Ambient & Dual Directional inside staticGroup for shader depth and airframe visibility)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.staticGroup.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(2000, 5000, 3000);
    this.staticGroup.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xa0c4ff, 0.4);
    fillLight.position.set(-2000, 3000, -3000);
    this.staticGroup.add(fillLight);

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
    canvas.width = 160;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
      ctx.fillRect(0, 0, 160, 32);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 158, 30);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = colorHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 80, 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(125, 25, 1);
    return sprite;
  }

  private getOrCreateTrackRecord(
    trackNo: string,
    initialCategory: TargetModelCategory = 'UNKNOWN',
    initialSignature?: string
  ): TrackMeshRecord {
    let record = this.trackMeshMap.get(trackNo);
    if (record) return record;

    // Root group positioned at ground projection (threePos.x, 0, threePos.z)
    const group = new THREE.Group();

    // Model anchor positioned at altitude (0, threePos.y, 0)
    const modelAnchor = new THREE.Group();
    group.add(modelAnchor);

    // Aircraft group containing vehicle body, accents, and hit proxy with dynamic orientation and scaling
    const aircraftGroup = new THREE.Group();

    // Build procedural 3D target model matching initial category
    const builtModel = this.targetModelFactory.createModel(initialCategory, trackNo, initialSignature);
    aircraftGroup.add(builtModel.group);

    modelAnchor.add(aircraftGroup);

    // 4. Altitude drop stem (connecting marker to ground at Y=0)
    const stem = new THREE.Line(this.sharedGeometries.stem, this.sharedMaterials.stem);
    group.add(stem);

    // 5. Procedural text sprite
    const sprite = this.createTextSprite(trackNo, '#00FF66');
    sprite.position.set(0, 35, 0);
    group.add(sprite);

    // 6. Selection bracket (in modelAnchor so it scales and tracks altitude with the aircraft)
    const selectionBox = new THREE.LineSegments(
      this.sharedGeometries.selection,
      this.sharedMaterials.selection
    );
    selectionBox.visible = false;
    modelAnchor.add(selectionBox);

    record = {
      trackNo,
      group,
      modelAnchor,
      aircraftGroup,
      bodyMesh: builtModel.bodyMesh,
      accentMesh: builtModel.accentMesh,
      hitProxy: builtModel.hitProxy,
      marker: builtModel.bodyMesh,
      stem,
      ghostRing: null,
      labelSprite: sprite,
      selectionBox,
      lastHeadingRad: 0,
      currentCategory: initialCategory,
      currentSignature: initialSignature,
      targetModelInstance: builtModel,
    };

    this.trackMeshMap.set(trackNo, record);
    this.tracksGroup.add(group);
    return record;
  }

  private applyTrackSymbology(record: TrackMeshRecord, traineeLabel: TrackClass | null): void {
    // Airframe models preserve authentic physical geometry and neutral materials (Task 17.3 §5)
    // Operator classification is conveyed via text label badge and selection bracket.
    if (record.currentCategory !== 'RADAR_SYMBOL') {
      return;
    }

    if (traineeLabel === 'FRIENDLY') {
      record.accentMesh.material = this.sharedMaterials.friend;
    } else if (traineeLabel === 'CIVIL_UAS') {
      record.accentMesh.material = this.sharedMaterials.civil;
    } else if (
      traineeLabel === 'HOSTILE_ATTACK' ||
      traineeLabel === 'HOSTILE_ISR' ||
      traineeLabel === 'SWARM_ELEMENT'
    ) {
      record.accentMesh.material = this.sharedMaterials.threat;
    } else {
      record.accentMesh.material = this.sharedMaterials.unknown;
    }
  }

  private updateLabelSprite(record: TrackMeshRecord, track: SafeTrackView): void {
    const { text, colorHex } = formatTrackLabelText(track);
    if (record.currentLabelText === text) {
      return;
    }
    record.currentLabelText = text;

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
        ctx.fillRect(0, 0, 160, 32);
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 158, 30);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 80, 16);
      }
      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.minFilter = THREE.LinearFilter;
      if (record.labelSprite.material.map) {
        record.labelSprite.material.map.dispose();
      }
      record.labelSprite.material.map = newTexture;
      record.labelSprite.material.needsUpdate = true;
      record.labelSprite.scale.set(125, 25, 1);
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
    this.motionFilter.prune(activeTrackNos);
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
   * Updates track models in the 3D scene from safe operator-facing views.
   * Excludes any tracks that are not visible or undetected.
   */
  public updateTracks(
    tracks: SafeTrackView[],
    selectedTrackNo: string | null,
    camera?: THREE.Camera,
    viewportHeight: number = 520,
    observationContext?: SensorObservationContext
  ): void {
    const activeTrackNos = new Set<string>();

    for (const track of tracks) {
      activeTrackNos.add(track.trackNo);
      const targetCategory = resolveTargetModelCategory(track, {
        context: observationContext,
      });
      let record = this.trackMeshMap.get(track.trackNo);
      const obsSignature = track.sensorObservation?.signature ?? track.sensorObservation?.observedSignature;

      if (!record) {
        record = this.getOrCreateTrackRecord(track.trackNo, targetCategory, obsSignature);
      } else if (record.currentCategory !== targetCategory || record.currentSignature !== obsSignature) {
        // Observation / classification state changed -> swap procedural model
        if (record.targetModelInstance) {
          record.aircraftGroup.remove(record.targetModelInstance.group);
        }
        const newModel = this.targetModelFactory.createModel(targetCategory, track.trackNo, obsSignature);
        record.aircraftGroup.add(newModel.group);
        record.bodyMesh = newModel.bodyMesh;
        record.accentMesh = newModel.accentMesh;
        record.hitProxy = newModel.hitProxy;
        record.marker = newModel.bodyMesh;
        record.currentCategory = targetCategory;
        record.currentSignature = obsSignature;
        record.targetModelInstance = newModel;
      }

      // Distinct readable scale: 34px for radar contact symbols, 48px for resolved optical airframes
      const targetPixelSize = targetCategory === 'RADAR_SYMBOL' ? 34 : 48;

      // Update dedicated time-normalized motion filter (Task 29)
      const xform = this.motionFilter.updateTrack(track, camera, viewportHeight, targetPixelSize);

      record.group.position.set(xform.position.x, 0, xform.position.z);
      record.modelAnchor.position.set(0, xform.altitudeM, 0);
      record.stem.scale.set(1, Math.max(1, xform.altitudeM), 1);

      record.lastHeadingRad = xform.headingRad;
      record.lastPitchRad = xform.pitchRad;
      record.aircraftGroup.rotation.set(xform.pitchRad, -xform.headingRad, 0, 'YXZ');
      record.aircraftGroup.scale.set(xform.scale, xform.scale, xform.scale);

      // Symbology on accent mesh & separate label badge
      this.applyTrackSymbology(record, track.traineeLabel);
      this.updateLabelSprite(record, track);

      const isSelected = track.trackNo === selectedTrackNo || track.isSelected;
      if (record.selectionBox) {
        record.selectionBox.visible = isSelected;
        record.selectionBox.scale.set(xform.scale, xform.scale, xform.scale);
      }
      record.stem.material = isSelected
        ? this.sharedMaterials.stemSelected
        : this.sharedMaterials.stem;

      // Position label sprite above the aircraft
      record.labelSprite.position.set(0, xform.altitudeM + Math.max(35, xform.scale * 1.5), 0);

      this.updateGhostRing(record, track);
    }

    this.pruneInactiveTracks(activeTrackNos);
  }

  /**
   * Returns list of selectable objects (hit proxies & aircraft meshes) for 3D raycast picking.
   * Only includes operator-visible active tracks.
   */
  public getSelectableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    for (const record of this.trackMeshMap.values()) {
      objects.push(record.hitProxy, record.bodyMesh, record.accentMesh);
    }
    return objects;
  }

  public getTrackRecord(trackNo: string): TrackMeshRecord | undefined {
    return this.trackMeshMap.get(trackNo);
  }

  public getAllTrackRecords(): TrackMeshRecord[] {
    return Array.from(this.trackMeshMap.values());
  }

  /**
   * Looks up the current world position of a track in Three.js coordinates.
   */
  public getTrackWorldPosition(trackNo: string): THREE.Vector3 | null {
    const record = this.trackMeshMap.get(trackNo);
    if (!record) return null;
    const worldPos = new THREE.Vector3();
    record.aircraftGroup.getWorldPosition(worldPos);
    return worldPos;
  }

  /**
   * Updates model-faithful sensor coverage visualization and 3D radar sweep health.
   */
  public updateCoverage(coverageState: SensorCoverageState): void {
    this.coverage3d.update(coverageState);
    const health = coverageState.radar.status === 'DROPOUT' ? 'OUT' : coverageState.radar.status;
    this.radarSweep3d.setSensorHealth(
      health,
      coverageState.activeSensor
    );
  }

  /**
   * Synchronizes active engagement animations with the authoritative simulation event log.
   */
  public syncEngagementEvents(events: (SimEvent | OperatorEventView)[], simMs: number): void {
    this.engagementEffectManager.syncEvents(events, simMs, (trackNo) => this.getTrackWorldPosition(trackNo));
  }

  /**
   * Updates engagement animations (muzzle flash, tracer burst, beam, wavefront, missile flight, impact).
   */
  public updateEngagementEffects(ctx: EngagementEffectContext): void {
    this.engagementEffectManager.update(ctx);
  }

  /**
   * Updates rotating 3D radar dish and translucent ground sweep beam.
   */
  public updateRadarSweep(simMs: number): void {
    this.radarSweep3d.update(simMs);
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
   * Updates or replaces the procedural environment with a new descriptor.
   */
  public setEnvironment(descriptor: EnvironmentDescriptor): void {
    this.environmentManager.dispose();
    this.environmentManager = new EnvironmentManager(this.staticGroup, descriptor, this.scene);
  }

  public getEnvironmentManager(): EnvironmentManager {
    return this.environmentManager;
  }

  /**
   * Raycasts against selectable environmental structures (buildings, installations, vegetation, zones).
   */
  public pickEnvironmentObject(raycaster: THREE.Raycaster): EnvironmentObjectInfo | null {
    return this.environmentManager.pickEnvironmentObject(raycaster);
  }

  /**
   * Updates dynamic weather effects according to simulation time and chaos schedule.
   */
  public updateEnvironment(simMs: number, chaosList?: ChaosSpec[]): void {
    this.environmentManager.update(simMs, chaosList);
  }

  public setLowFidelity(lowFi: boolean): void {
    this.environmentManager.setLowFidelity(lowFi);
  }

  public getMotionFilter(): RenderTrackMotionFilter {
    return this.motionFilter;
  }

  /**
   * Complete scene teardown and memory cleanup.
   */
  public dispose(): void {
    // 0. Dispose environment manager
    this.environmentManager.dispose();

    // 1. Dispose sensor coverage, effector resources, LOS visualizer, clusters, and training aid
    this.coverage3d.dispose();
    this.effectorEnvelopes3d.dispose();
    this.losVisualizer3d.dispose();
    this.clusterOverlay3d.dispose();
    this.trainingAid3d.dispose();
    this.radarSweep3d.dispose();
    this.engagementEffectManager.dispose();
    this.targetModelFactory.dispose();

    // 2. Dispose track resources & motion filter
    this.motionFilter.reset();
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

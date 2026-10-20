import * as THREE from 'three';
import { RCS_REF, R_REF } from '@/sim/sensors';
import { CONFIG } from '@/config';
import type { ChaosSpec, SensorMode } from '@/sim/types';

export type RadarCoverageStatus = 'NOMINAL' | 'DEGRADED' | 'DROPOUT';
export type EoirCoverageStatus = 'DAY_NOMINAL' | 'NIGHT_NOMINAL' | 'FOG_DEGRADED';
export type RfCoverageStatus = 'NOMINAL' | 'JAMMED';

export interface RadarCoverageModel {
  maxRangeM: number;
  r90RadiusM: number;
  rcsRefM2: number;
  pdThreshold: number;
  aEnv: number;
  status: RadarCoverageStatus;
  isAltitudeIndependentProjection: boolean;
  label: string;
}

export interface EoirCoverageModel {
  boresightAzimuthDeg: number;
  fovDeg: number;
  effectiveRangeM: number;
  status: EoirCoverageStatus;
  elevationModelled: false;
  label: string;
}

export interface RfCoverageModel {
  maxRangeM: number;
  status: RfCoverageStatus;
  isFunctional: boolean;
  label: string;
}

export interface SensorCoverageState {
  radar: RadarCoverageModel;
  eoir: EoirCoverageModel;
  rf: RfCoverageModel;
  activeSensor: SensorMode;
  visible: boolean;
}

/**
 * Checks whether a specific chaos event is currently active.
 */
export function isChaosActive(
  chaosList?: ChaosSpec[],
  tMs?: number,
  type?: ChaosSpec['type']
): boolean {
  if (!chaosList || tMs === undefined || !type) return false;
  return chaosList.some((c) => c.type === type && tMs >= c.tStartMs && tMs < c.tEndMs);
}

/**
 * Radar Constant-SNR Radius (R90) derived from radar equation Pd function (PRD 3.2 & sensors.ts):
 * Pd = 1 - exp(-2.303 * SNR)
 * For Pd = 0.90: SNR_req = 1.0
 * SNR = (RCS / RCS_REF) * (R_REF / R)^4 * A_env
 * R_const = R_REF * ((RCS / RCS_REF) * A_env / SNR_req)^(1/4)
 *
 * Invariant:
 * Larger RCS never produces a smaller constant-SNR radius (monotonic increase).
 */
export function calculateRadarR90Radius(
  rcsM2: number = RCS_REF,
  aEnv: number = 1.0,
  pdThreshold: number = 0.90,
  maxRangeM: number = CONFIG.thresholds.radarMaxRangeM
): number {
  if (rcsM2 <= 0 || aEnv <= 0 || pdThreshold <= 0 || pdThreshold >= 1) {
    return 0;
  }

  // Required SNR for the requested Pd threshold: Pd = 1 - exp(-2.303 * SNR)
  // For nominal Pd = 0.90, SNR_req is exactly 1.0 (1 - exp(-2.303) = 0.900041...)
  const snrReq = pdThreshold === 0.90 ? 1.0 : -Math.log(1 - pdThreshold) / 2.303;
  if (snrReq <= 0) return 0;

  const rcsRatio = rcsM2 / RCS_REF;
  const radius = R_REF * Math.pow((rcsRatio * aEnv) / snrReq, 0.25);

  return Math.max(0, Math.min(radius, maxRangeM));
}

/**
 * Calculates current radar coverage state based on actual sensor health and active chaos.
 */
export function calculateRadarCoverage(params: {
  sensorHealth?: 'OK' | 'DEG' | 'OUT';
  chaosList?: ChaosSpec[];
  tMs?: number;
  rcsRefM2?: number;
  maxRangeM?: number;
}): RadarCoverageModel {
  const maxRangeM = params.maxRangeM ?? CONFIG.thresholds.radarMaxRangeM;
  const rcsRefM2 = params.rcsRefM2 ?? RCS_REF;
  const pdThreshold = 0.90;

  let aEnv = 1.0;
  let status: RadarCoverageStatus = 'NOMINAL';

  const isDropout =
    params.sensorHealth === 'OUT' ||
    isChaosActive(params.chaosList, params.tMs, 'RADAR_DROPOUT');
  const isDegraded =
    params.sensorHealth === 'DEG' ||
    isChaosActive(params.chaosList, params.tMs, 'RAIN');

  if (isDropout) {
    aEnv = 0.0;
    status = 'DROPOUT';
  } else if (isDegraded) {
    aEnv = 0.7; // Aligned with engine.ts & director/validate.ts
    status = 'DEGRADED';
  }

  const r90RadiusM = calculateRadarR90Radius(rcsRefM2, aEnv, pdThreshold, maxRangeM);
  const label = `RADAR [HORIZONTAL-RANGE MODEL] R90: ${Math.round(r90RadiusM)}m (RCS: ${rcsRefM2}m² | Pd: 90%) | MAX: ${maxRangeM}m | ${status}`;

  return {
    maxRangeM,
    r90RadiusM,
    rcsRefM2,
    pdThreshold,
    aEnv,
    status,
    isAltitudeIndependentProjection: true,
    label,
  };
}

/**
 * Calculates EO/IR coverage reach, FOV, and active atmospheric attenuation.
 */
export function calculateEoirCoverage(params: {
  azimuthDeg: number;
  isNight: boolean;
  sensorHealth?: 'OK' | 'DEG' | 'OUT';
  chaosList?: ChaosSpec[];
  tMs?: number;
}): EoirCoverageModel {
  const baseRangeM = params.isNight
    ? CONFIG.thresholds.eoirMaxRangeNightM
    : CONFIG.thresholds.eoirMaxRangeDayM;

  const isFog =
    params.sensorHealth === 'DEG' ||
    isChaosActive(params.chaosList, params.tMs, 'FOG');

  const multiplier = isFog ? CONFIG.chaos.FOG.eoirRangeMultiplier : 1.0;
  const effectiveRangeM = baseRangeM * multiplier;
  const status: EoirCoverageStatus = isFog
    ? 'FOG_DEGRADED'
    : params.isNight
    ? 'NIGHT_NOMINAL'
    : 'DAY_NOMINAL';

  const label = `EO/IR 30° FOV [RENDER ONLY VERTICAL CAP] | ${Math.round(effectiveRangeM)}m | ${status}`;

  return {
    boresightAzimuthDeg: ((params.azimuthDeg % 360) + 360) % 360,
    fovDeg: 30, // 30° Bounding cone (±15°) in eoirLayer.ts
    effectiveRangeM,
    status,
    elevationModelled: false,
    label,
  };
}

/**
 * Calculates RF passive sensor coverage and electronic warfare jamming state.
 */
export function calculateRfCoverage(params: {
  sensorHealth?: 'OK' | 'DEG' | 'OUT';
  chaosList?: ChaosSpec[];
  tMs?: number;
}): RfCoverageModel {
  const maxRangeM = CONFIG.thresholds.rfMaxRangeM;
  const isJammed =
    params.sensorHealth === 'OUT' ||
    isChaosActive(params.chaosList, params.tMs, 'JAMMING');

  const status: RfCoverageStatus = isJammed ? 'JAMMED' : 'NOMINAL';
  const label = isJammed
    ? `RF PASSIVE DETECTION | ${maxRangeM}m | JAMMED [DENIED]`
    : `RF PASSIVE DETECTION | ${maxRangeM}m | NOMINAL`;

  return {
    maxRangeM,
    status,
    isFunctional: !isJammed,
    label,
  };
}

/**
 * Procedural Unit Circle LineLoop Geometry (Radius = 1, centered at origin).
 */
function createUnitCircleGeometry(segments: number = 64): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * Procedural Normalized 30° Wedge Geometry (Apex at 0,0,0, Radius 1, Height 1, opening ±15° from North -Z).
 */
function createUnitWedgeGeometry(segments: number = 16): {
  meshGeom: THREE.BufferGeometry;
  wireGeom: THREE.BufferGeometry;
} {
  const fovRad = THREE.MathUtils.degToRad(30);
  const halfFov = fovRad / 2; // 15° = 0.2618 rad

  const positions: number[] = [];
  const wirePoints: THREE.Vector3[] = [];

  // Bottom arc points (Y = 0) and Top arc points (Y = 1)
  const arcBottom: THREE.Vector3[] = [];
  const arcTop: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = -halfFov + (i / segments) * fovRad;
    const x = Math.sin(angle);
    const z = -Math.cos(angle);
    arcBottom.push(new THREE.Vector3(x, 0, z));
    arcTop.push(new THREE.Vector3(x, 1, z));
  }

  const apexBottom = new THREE.Vector3(0, 0, 0);
  const apexTop = new THREE.Vector3(0, 1, 0);

  // 1. Bottom sector fan
  for (let i = 0; i < segments; i++) {
    positions.push(
      apexBottom.x, apexBottom.y, apexBottom.z,
      arcBottom[i].x, arcBottom[i].y, arcBottom[i].z,
      arcBottom[i + 1].x, arcBottom[i + 1].y, arcBottom[i + 1].z
    );
  }

  // 2. Top sector fan
  for (let i = 0; i < segments; i++) {
    positions.push(
      apexTop.x, apexTop.y, apexTop.z,
      arcTop[i + 1].x, arcTop[i + 1].y, arcTop[i + 1].z,
      arcTop[i].x, arcTop[i].y, arcTop[i].z
    );
  }

  // 3. Left side wall
  positions.push(
    apexBottom.x, apexBottom.y, apexBottom.z,
    arcBottom[0].x, arcBottom[0].y, arcBottom[0].z,
    arcTop[0].x, arcTop[0].y, arcTop[0].z,

    apexBottom.x, apexBottom.y, apexBottom.z,
    arcTop[0].x, arcTop[0].y, arcTop[0].z,
    apexTop.x, apexTop.y, apexTop.z
  );

  // 4. Right side wall
  positions.push(
    apexBottom.x, apexBottom.y, apexBottom.z,
    arcTop[segments].x, arcTop[segments].y, arcTop[segments].z,
    arcBottom[segments].x, arcBottom[segments].y, arcBottom[segments].z,

    apexBottom.x, apexBottom.y, apexBottom.z,
    apexTop.x, apexTop.y, apexTop.z,
    arcTop[segments].x, arcTop[segments].y, arcTop[segments].z
  );

  // 5. Far curved arc wall
  for (let i = 0; i < segments; i++) {
    positions.push(
      arcBottom[i].x, arcBottom[i].y, arcBottom[i].z,
      arcBottom[i + 1].x, arcBottom[i + 1].y, arcBottom[i + 1].z,
      arcTop[i].x, arcTop[i].y, arcTop[i].z,

      arcBottom[i + 1].x, arcBottom[i + 1].y, arcBottom[i + 1].z,
      arcTop[i + 1].x, arcTop[i + 1].y, arcTop[i + 1].z,
      arcTop[i].x, arcTop[i].y, arcTop[i].z
    );
  }

  const meshGeom = new THREE.BufferGeometry();
  meshGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  meshGeom.computeVertexNormals();

  // Wireframe outline
  wirePoints.push(
    apexBottom, arcBottom[0],
    apexBottom, arcBottom[segments],
    apexTop, arcTop[0],
    apexTop, arcTop[segments],
    apexBottom, apexTop,
    arcBottom[0], arcTop[0],
    arcBottom[segments], arcTop[segments]
  );
  for (let i = 0; i < segments; i++) {
    wirePoints.push(arcBottom[i], arcBottom[i + 1]);
    wirePoints.push(arcTop[i], arcTop[i + 1]);
  }

  const wireGeom = new THREE.BufferGeometry().setFromPoints(wirePoints);

  return { meshGeom, wireGeom };
}

/**
 * Creates or updates procedural billboard text sprite.
 */
function createTextSprite(initialText: string, initialColorHex: string): THREE.Sprite {
  if (typeof document === 'undefined') {
    const spriteMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(160, 24, 1);
    return sprite;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
    ctx.fillRect(0, 0, 256, 36);
    ctx.strokeStyle = initialColorHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 254, 34);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = initialColorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initialText, 128, 18);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(160, 24, 1);
  return sprite;
}

function updateSpriteCanvas(sprite: THREE.Sprite, text: string, colorHex: string): void {
  if (typeof document === 'undefined') return;
  const texture = sprite.material.map;
  if (!texture || !texture.image) return;

  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  texture.needsUpdate = true;
}

/**
 * Three.js 3D Sensor Coverage Visualizer.
 *
 * Implements F1 model-faithful sensor volume rendering with zero per-frame object allocations.
 */
export class Coverage3D {
  public readonly group: THREE.Group;

  // Radar Meshes & Objects
  private readonly radarGroup: THREE.Group;
  private readonly radarOuterCylinder: THREE.LineSegments;
  private readonly radarOuterSurface: THREE.Mesh;
  private readonly radarR90Group: THREE.Group;
  private readonly radarR90Cylinder: THREE.LineSegments;
  private readonly radarR90Surface: THREE.Mesh;
  private readonly radarLabelSprite: THREE.Sprite;
  private lastRadarLabel: string = '';

  // EO/IR Meshes & Objects
  private readonly eoirGroup: THREE.Group;
  private readonly eoirWedgeMesh: THREE.Mesh;
  private readonly eoirWedgeWire: THREE.LineSegments;
  private readonly eoirBoresightRay: THREE.Line;
  private readonly eoirLabelSprite: THREE.Sprite;
  private lastEoirLabel: string = '';

  // RF Meshes & Objects
  private readonly rfGroup: THREE.Group;
  private readonly rfCylinderWire: THREE.LineSegments;
  private readonly rfSurface: THREE.Mesh;
  private readonly rfLabelSprite: THREE.Sprite;
  private lastRfLabel: string = '';

  // Shared Geometries & Materials (Reusable)
  private readonly unitCircleGeom: THREE.BufferGeometry;
  private readonly unitCylinderGeom: THREE.CylinderGeometry;
  private readonly unitCylinderEdges: THREE.EdgesGeometry;
  private readonly wedgeGeom: { meshGeom: THREE.BufferGeometry; wireGeom: THREE.BufferGeometry };

  private readonly matPhosphorDim: THREE.LineBasicMaterial;
  private readonly matPhosphorWire: THREE.LineBasicMaterial;
  private readonly matPhosphorSurface: THREE.MeshBasicMaterial;
  private readonly matAmberWire: THREE.LineBasicMaterial;
  private readonly matAmberSurface: THREE.MeshBasicMaterial;
  private readonly matRedWire: THREE.LineBasicMaterial;
  private readonly matCyanSurface: THREE.MeshBasicMaterial;
  private readonly matCyanWire: THREE.LineBasicMaterial;
  private readonly matYellowWire: THREE.LineBasicMaterial;
  private readonly matYellowSurface: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();

    // 1. Initialize Reusable Geometries
    this.unitCircleGeom = createUnitCircleGeometry(64);
    this.unitCylinderGeom = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true);
    this.unitCylinderEdges = new THREE.EdgesGeometry(this.unitCylinderGeom);
    this.wedgeGeom = createUnitWedgeGeometry(16);

    // 2. Initialize Reusable Materials
    this.matPhosphorDim = new THREE.LineBasicMaterial({
      color: 0x00FF66,
      transparent: true,
      opacity: 0.25,
    });
    this.matPhosphorWire = new THREE.LineBasicMaterial({
      color: 0x00FF66,
      transparent: true,
      opacity: 0.6,
    });
    this.matPhosphorSurface = new THREE.MeshBasicMaterial({
      color: 0x00FF66,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.matAmberWire = new THREE.LineBasicMaterial({
      color: 0xFF9900,
      transparent: true,
      opacity: 0.7,
    });
    this.matAmberSurface = new THREE.MeshBasicMaterial({
      color: 0xFF9900,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.matRedWire = new THREE.LineBasicMaterial({
      color: 0xFF3333,
      transparent: true,
      opacity: 0.8,
    });
    this.matCyanSurface = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.matCyanWire = new THREE.LineBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.6,
    });
    this.matYellowWire = new THREE.LineBasicMaterial({
      color: 0xFFCC00,
      transparent: true,
      opacity: 0.4,
    });
    this.matYellowSurface = new THREE.MeshBasicMaterial({
      color: 0xFFCC00,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // 3. Build Radar 3D Column Meshes
    this.radarGroup = new THREE.Group();
    const radarMaxM = CONFIG.thresholds.radarMaxRangeM;
    const radarCeilingM = 500; // Schematic altitude layer

    this.radarOuterCylinder = new THREE.LineSegments(this.unitCylinderEdges, this.matPhosphorDim);
    this.radarOuterCylinder.scale.set(radarMaxM, radarCeilingM, radarMaxM);
    this.radarOuterCylinder.position.set(0, radarCeilingM / 2, 0);
    this.radarGroup.add(this.radarOuterCylinder);

    this.radarOuterSurface = new THREE.Mesh(this.unitCylinderGeom, this.matPhosphorSurface);
    this.radarOuterSurface.scale.set(radarMaxM, radarCeilingM, radarMaxM);
    this.radarOuterSurface.position.set(0, radarCeilingM / 2, 0);
    this.radarGroup.add(this.radarOuterSurface);

    this.radarR90Group = new THREE.Group();
    this.radarR90Cylinder = new THREE.LineSegments(this.unitCylinderEdges, this.matPhosphorWire);
    this.radarR90Surface = new THREE.Mesh(this.unitCylinderGeom, this.matPhosphorSurface);
    this.radarR90Group.add(this.radarR90Cylinder);
    this.radarR90Group.add(this.radarR90Surface);
    this.radarGroup.add(this.radarR90Group);

    this.radarLabelSprite = createTextSprite('RADAR [HORIZONTAL-RANGE MODEL]', '#00FF66');
    this.radarLabelSprite.position.set(0, radarCeilingM + 30, -radarMaxM * 0.7);
    this.radarGroup.add(this.radarLabelSprite);

    this.group.add(this.radarGroup);

    // 4. Build EO/IR 3D Frustum Wedge Meshes
    this.eoirGroup = new THREE.Group();
    this.eoirWedgeMesh = new THREE.Mesh(this.wedgeGeom.meshGeom, this.matCyanSurface);
    this.eoirWedgeWire = new THREE.LineSegments(this.wedgeGeom.wireGeom, this.matCyanWire);

    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    this.eoirBoresightRay = new THREE.Line(rayGeom, this.matCyanWire);

    this.eoirGroup.add(this.eoirWedgeMesh);
    this.eoirGroup.add(this.eoirWedgeWire);
    this.eoirGroup.add(this.eoirBoresightRay);

    this.eoirLabelSprite = createTextSprite('EO/IR 30° FOV [RENDER ONLY VERTICAL CAP]', '#00E5FF');
    this.eoirLabelSprite.position.set(0, 260, -1500);
    this.eoirGroup.add(this.eoirLabelSprite);

    this.group.add(this.eoirGroup);

    // 5. Build RF 3D Cylinder Meshes
    this.rfGroup = new THREE.Group();
    const rfMaxM = CONFIG.thresholds.rfMaxRangeM;
    const rfCeilingM = 400;

    this.rfCylinderWire = new THREE.LineSegments(this.unitCylinderEdges, this.matYellowWire);
    this.rfCylinderWire.scale.set(rfMaxM, rfCeilingM, rfMaxM);
    this.rfCylinderWire.position.set(0, rfCeilingM / 2, 0);
    this.rfGroup.add(this.rfCylinderWire);

    this.rfSurface = new THREE.Mesh(this.unitCylinderGeom, this.matYellowSurface);
    this.rfSurface.scale.set(rfMaxM, rfCeilingM, rfMaxM);
    this.rfSurface.position.set(0, rfCeilingM / 2, 0);
    this.rfGroup.add(this.rfSurface);

    this.rfLabelSprite = createTextSprite('RF PASSIVE DETECTION | 4000m', '#FFCC00');
    this.rfLabelSprite.position.set(0, rfCeilingM + 30, rfMaxM * 0.7);
    this.rfGroup.add(this.rfLabelSprite);

    this.group.add(this.rfGroup);
  }

  /**
   * Updates 3D sensor coverage geometries and materials without allocating new objects.
   */
  public update(coverageState: SensorCoverageState): void {
    if (!coverageState.visible) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const { radar, eoir, rf, activeSensor } = coverageState;

    // --- 1. Update Radar Volume ---
    const radarCeilingM = 500;
    if (radar.r90RadiusM > 0) {
      this.radarR90Group.visible = true;
      this.radarR90Group.scale.set(radar.r90RadiusM, radarCeilingM, radar.r90RadiusM);
      this.radarR90Group.position.set(0, radarCeilingM / 2, 0);

      if (radar.status === 'DEGRADED') {
        this.radarR90Cylinder.material = this.matAmberWire;
        this.radarR90Surface.material = this.matAmberSurface;
      } else {
        this.radarR90Cylinder.material = this.matPhosphorWire;
        this.radarR90Surface.material = this.matPhosphorSurface;
      }
    } else {
      this.radarR90Group.visible = false;
    }

    if (radar.status === 'DROPOUT') {
      this.radarOuterCylinder.material = this.matRedWire;
    } else {
      this.radarOuterCylinder.material = this.matPhosphorDim;
    }

    if (radar.label !== this.lastRadarLabel) {
      this.lastRadarLabel = radar.label;
      const color = radar.status === 'DROPOUT' ? '#FF3333' : radar.status === 'DEGRADED' ? '#FF9900' : '#00FF66';
      updateSpriteCanvas(this.radarLabelSprite, radar.label, color);
    }

    // --- 2. Update EO/IR Frustum Wedge ---
    const eoirHeightM = 250;
    this.eoirGroup.rotation.y = -THREE.MathUtils.degToRad(eoir.boresightAzimuthDeg);
    this.eoirWedgeMesh.scale.set(eoir.effectiveRangeM, eoirHeightM, eoir.effectiveRangeM);
    this.eoirWedgeWire.scale.set(eoir.effectiveRangeM, eoirHeightM, eoir.effectiveRangeM);
    this.eoirBoresightRay.scale.set(1, 1, eoir.effectiveRangeM);

    this.eoirLabelSprite.position.set(0, eoirHeightM + 25, -Math.min(eoir.effectiveRangeM * 0.8, 2000));

    if (eoir.status === 'FOG_DEGRADED') {
      this.eoirWedgeWire.material = this.matAmberWire;
      this.eoirWedgeMesh.material = this.matAmberSurface;
    } else {
      this.eoirWedgeWire.material = this.matCyanWire;
      this.eoirWedgeMesh.material = this.matCyanSurface;
    }

    if (eoir.label !== this.lastEoirLabel) {
      this.lastEoirLabel = eoir.label;
      const color = eoir.status === 'FOG_DEGRADED' ? '#FF9900' : '#00E5FF';
      updateSpriteCanvas(this.eoirLabelSprite, eoir.label, color);
    }

    // --- 3. Update RF Cylinder ---
    if (!rf.isFunctional) {
      this.rfCylinderWire.material = this.matRedWire;
      this.rfSurface.material = this.matAmberSurface;
    } else {
      this.rfCylinderWire.material = this.matYellowWire;
      this.rfSurface.material = this.matYellowSurface;
    }

    if (rf.label !== this.lastRfLabel) {
      this.lastRfLabel = rf.label;
      const color = rf.isFunctional ? '#FFCC00' : '#FF3333';
      updateSpriteCanvas(this.rfLabelSprite, rf.label, color);
    }

    // --- 4. Modulate Opacity by Active Sensor Mode ---
    // The active sensor has full contrast; inactive sensors are rendered subtler
    this.radarGroup.visible = activeSensor === 'RADAR' || activeSensor === undefined;
    this.eoirGroup.visible = activeSensor === 'EOIR' || activeSensor === undefined;
    this.rfGroup.visible = activeSensor === 'RF' || activeSensor === undefined;
  }

  /**
   * Set explicit sensor mode visibility filter (or null to show all simultaneously).
   */
  public setSensorFilter(activeSensor: SensorMode | 'ALL'): void {
    if (activeSensor === 'ALL') {
      this.radarGroup.visible = true;
      this.eoirGroup.visible = true;
      this.rfGroup.visible = true;
    } else {
      this.radarGroup.visible = activeSensor === 'RADAR';
      this.eoirGroup.visible = activeSensor === 'EOIR';
      this.rfGroup.visible = activeSensor === 'RF';
    }
  }

  /**
   * Complete memory cleanup and buffer disposal.
   */
  public dispose(): void {
    this.unitCircleGeom.dispose();
    this.unitCylinderGeom.dispose();
    this.unitCylinderEdges.dispose();
    this.wedgeGeom.meshGeom.dispose();
    this.wedgeGeom.wireGeom.dispose();

    this.matPhosphorDim.dispose();
    this.matPhosphorWire.dispose();
    this.matPhosphorSurface.dispose();
    this.matAmberWire.dispose();
    this.matAmberSurface.dispose();
    this.matRedWire.dispose();
    this.matCyanSurface.dispose();
    this.matCyanWire.dispose();
    this.matYellowWire.dispose();
    this.matYellowSurface.dispose();

    if (this.radarLabelSprite.material.map) this.radarLabelSprite.material.map.dispose();
    this.radarLabelSprite.material.dispose();

    if (this.eoirLabelSprite.material.map) this.eoirLabelSprite.material.map.dispose();
    this.eoirLabelSprite.material.dispose();

    if (this.rfLabelSprite.material.map) this.rfLabelSprite.material.map.dispose();
    this.rfLabelSprite.material.dispose();

    this.group.clear();
  }
}

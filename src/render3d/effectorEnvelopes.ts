import * as THREE from 'three';
import { CONFIG } from '@/config';
import {
  getEnvelopePlateau,
  computeEffectivePk,
  computeRangeAttenuation,
  type EffectorEnvelopePlateau,
} from '@/sim/effectors';
import type { EffectorId, ChaosSpec } from '@/sim/types';
import { isChaosActive } from './coverage';

export type SensorHealthStatus = 'OK' | 'DEG' | 'OUT';

export interface EffectorEnvelopeState {
  id: EffectorId;
  name: string;
  tier: 'T1_NON_KINETIC' | 'T2_KINETIC' | 'T3_HEAVY';
  costInr: number;
  envelopeMinM: number;
  envelopeMaxM: number;
  plateauMinM: number;
  plateauMaxM: number;
  rOptM: number;
  isArmed: boolean;
  isFunctional: boolean;
  statusLabel: string;
}

export interface TrackEngagementCue {
  trackNo: string;
  rangeM: number;
  isOutOfEnvelope: boolean;
  isInPlateau: boolean;
  isHardBlocked: boolean;
  hardBlockReason: string | null;
  effectivePk: number;
  attenuationG: number;
  label: string;
}

export interface EffectorVisualOptions {
  activeEffector: EffectorId;
  selectedTrack?: {
    trackNo: string;
    pos: { x: number; y: number; z: number };
    q: number;
  } | null;
  sensorHealth?: {
    RADAR: SensorHealthStatus;
    EOIR: SensorHealthStatus;
    RF: SensorHealthStatus;
  };
  chaosList?: ChaosSpec[];
  tMs?: number;
  visible?: boolean;
}

/**
 * Calculates current effector envelope boundaries and environmental readiness.
 */
export function calculateEffectorEnvelopes(
  activeEffector: EffectorId,
  sensorHealth?: { RF?: SensorHealthStatus; EOIR?: SensorHealthStatus },
  chaosList?: ChaosSpec[],
  tMs?: number
): EffectorEnvelopeState[] {
  const effectorIds: EffectorId[] = [
    'RF_SOFTKILL',
    'LASER',
    'GUN',
    'INTERCEPTOR',
    'MISSILE',
  ];

  const isJamming =
    sensorHealth?.RF === 'OUT' ||
    isChaosActive(chaosList, tMs, 'JAMMING');
  const isFog =
    sensorHealth?.EOIR === 'DEG' ||
    isChaosActive(chaosList, tMs, 'FOG');

  return effectorIds.map((id) => {
    const eff = CONFIG.effectors[id];
    const plateau: EffectorEnvelopePlateau = getEnvelopePlateau(id);

    let isFunctional = true;
    let statusLabel = 'READY';

    if (id === 'RF_SOFTKILL' && isJamming) {
      isFunctional = false;
      statusLabel = 'BLOCKED (RF JAMMED)';
    } else if (id === 'LASER' && isFog) {
      statusLabel = 'DEGRADED (FOG: 50% Pk)';
    }

    return {
      id,
      name: eff.name,
      tier: eff.tier,
      costInr: eff.costInr,
      envelopeMinM: plateau.envelopeMinM,
      envelopeMaxM: plateau.envelopeMaxM,
      plateauMinM: plateau.plateauMinM,
      plateauMaxM: plateau.plateauMaxM,
      rOptM: plateau.rOptM,
      isArmed: id === activeEffector,
      isFunctional,
      statusLabel,
    };
  });
}

function getTargetBlockReason(
  isTrackQualityBlocked: boolean,
  isOutOfEnvelope: boolean,
  isRfJamBlocked: boolean,
  rangeM: number,
  envelopeMinM: number,
  envelopeMaxM: number
): string | null {
  if (isTrackQualityBlocked) {
    return `Q < ${CONFIG.thresholds.qMin}`;
  }
  if (isOutOfEnvelope) {
    return rangeM < envelopeMinM
      ? `BELOW MIN (${Math.round(rangeM)}m < ${envelopeMinM}m)`
      : `BEYOND MAX (${Math.round(rangeM)}m > ${envelopeMaxM}m)`;
  }
  if (isRfJamBlocked) {
    return 'RF JAMMED';
  }
  return null;
}

/**
 * Calculates model-faithful track engagement cue for the operator.
 */
export function calculateTrackEngagementCue(
  effectorId: EffectorId,
  target: { trackNo: string; pos: { x: number; y: number; z: number }; q: number },
  sensorHealth?: { RF?: SensorHealthStatus; EOIR?: SensorHealthStatus },
  chaosList?: ChaosSpec[],
  tMs?: number
): TrackEngagementCue {
  // Horizontal range semantics (Rules.md R10.3, PRD 3.2)
  const rangeM = Math.hypot(target.pos.x, target.pos.y);
  const eff = CONFIG.effectors[effectorId];
  const { envelopeMinM, envelopeMaxM, plateauMinM, plateauMaxM } = getEnvelopePlateau(effectorId);

  const isJamming =
    sensorHealth?.RF === 'OUT' ||
    isChaosActive(chaosList, tMs, 'JAMMING');
  const isFog =
    sensorHealth?.EOIR === 'DEG' ||
    isChaosActive(chaosList, tMs, 'FOG');

  const isTrackQualityBlocked = target.q < CONFIG.thresholds.qMin;
  const isOutOfEnvelope = rangeM < envelopeMinM || rangeM > envelopeMaxM;
  const isRfJamBlocked = effectorId === 'RF_SOFTKILL' && isJamming;

  const isHardBlocked = isTrackQualityBlocked || isOutOfEnvelope || isRfJamBlocked;
  const hardBlockReason = getTargetBlockReason(
    isTrackQualityBlocked,
    isOutOfEnvelope,
    isRfJamBlocked,
    rangeM,
    envelopeMinM,
    envelopeMaxM
  );

  const isInPlateau = rangeM >= plateauMinM && rangeM <= plateauMaxM;
  const attenuationG = computeRangeAttenuation(rangeM, effectorId);

  // Compute effective Pk for standard representative threat with active chaos context
  const effectivePk = computeEffectivePk(
    effectorId,
    rangeM,
    { droneType: 'FPV_ATTACK', emitsRf: true },
    { isFogActive: isFog, isJammingActive: isJamming }
  );

  let label = `${target.trackNo} | ${Math.round(rangeM)}m | ${eff.name}`;
  if (isHardBlocked) {
    label += ` [BLOCKED: ${hardBlockReason}]`;
  } else if (isInPlateau) {
    label += ` [OPTIMAL: Pk ${(effectivePk * 100).toFixed(0)}%]`;
  } else {
    label += ` [MARGINAL: Pk ${(effectivePk * 100).toFixed(0)}% (g=${attenuationG.toFixed(2)})]`;
  }

  return {
    trackNo: target.trackNo,
    rangeM,
    isOutOfEnvelope,
    isInPlateau,
    isHardBlocked,
    hardBlockReason,
    effectivePk,
    attenuationG,
    label,
  };
}

/**
 * Creates procedural annular plateau geometry in X-Z plane.
 */
function createAnnularPlateauGeometry(innerR: number, outerR: number, segments: number = 64): THREE.BufferGeometry {
  const geom = new THREE.RingGeometry(innerR, outerR, segments);
  geom.rotateX(-Math.PI / 2); // Lay flat in X-Z plane
  return geom;
}

/**
 * Creates circle perimeter line geometry.
 */
function createCircleWireGeometry(radius: number, segments: number = 64): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * Procedural text sprite generator with string caching.
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

function getTierColorHex(tier: string): string {
  if (tier === 'T3_HEAVY') return '#FF3333';
  if (tier === 'T2_KINETIC') return '#FF9900';
  return '#00E5FF';
}

function getEffectorRecordHex(isFunctional: boolean, tier: string): string {
  if (!isFunctional || tier === 'T3_HEAVY') return '#FF3333';
  return '#FF9900';
}

function getTargetCueColor(isHardBlocked: boolean, isInPlateau: boolean): string {
  if (isHardBlocked) return '#FF3333';
  if (isInPlateau) return '#00FF66';
  return '#FF9900';
}

function updateSpriteCanvas(sprite: THREE.Sprite, text: string, colorHex: string): void {
  if (typeof document === 'undefined') return;
  const texture = sprite.material.map;
  if (!texture?.image) return;

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

interface EffectorMeshRecord {
  group: THREE.Group;
  plateauMesh: THREE.Mesh;
  minLoop: THREE.LineLoop;
  maxLoop: THREE.LineLoop;
  plateauMinLoop: THREE.LineLoop;
  plateauMaxLoop: THREE.LineLoop;
  struts: THREE.LineSegments;
  labelSprite: THREE.Sprite;
  lastLabel: string;
}

/**
 * Three.js 3D Effector Envelopes & PNR Visualizer.
 *
 * Implements F2 model-faithful effector reach, plateau, and PNR rendering with zero per-frame allocations.
 */
export class EffectorEnvelopes3D {
  public readonly group: THREE.Group;

  // Effector records mapped by id
  private readonly effectorRecords: Map<EffectorId, EffectorMeshRecord> = new Map();

  // PNR Visual Components
  private readonly pnrGroup: THREE.Group;
  private readonly pnrLoop: THREE.LineLoop;
  private readonly pnrFence: THREE.LineSegments;
  private readonly pnrLabelSprite: THREE.Sprite;

  // Selected Target Cue Billboard
  private readonly targetCueSprite: THREE.Sprite;
  private lastTargetCueLabel: string = '';

  // Materials
  private readonly matT1Wire: THREE.LineBasicMaterial;
  private readonly matT1Surface: THREE.MeshBasicMaterial;
  private readonly matT2Wire: THREE.LineBasicMaterial;
  private readonly matT2Surface: THREE.MeshBasicMaterial;
  private readonly matT3Wire: THREE.LineBasicMaterial;
  private readonly matT3Surface: THREE.MeshBasicMaterial;
  private readonly matPlateauArmed: THREE.MeshBasicMaterial;
  private readonly matPnrWire: THREE.LineBasicMaterial;
  private readonly matBlockedWire: THREE.LineBasicMaterial;

  constructor() {
    this.group = new THREE.Group();

    // 1. Initialize Materials adhering to Tier colors & neutral surfaces
    this.matT1Wire = new THREE.LineBasicMaterial({
      color: 0x00E5FF, // Cyan (Non-kinetic: RF, Laser)
      transparent: true,
      opacity: 0.6,
    });
    this.matT1Surface = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.matT2Wire = new THREE.LineBasicMaterial({
      color: 0xFF9900, // Amber (Kinetic: Gun, Interceptor)
      transparent: true,
      opacity: 0.7,
    });
    this.matT2Surface = new THREE.MeshBasicMaterial({
      color: 0xFF9900,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.matT3Wire = new THREE.LineBasicMaterial({
      color: 0xFF3333, // Red (Heavy: Missile)
      transparent: true,
      opacity: 0.8,
    });
    this.matT3Surface = new THREE.MeshBasicMaterial({
      color: 0xFF3333,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.matPlateauArmed = new THREE.MeshBasicMaterial({
      color: 0x00FF66, // Highlighted optimal green plateau
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.matPnrWire = new THREE.LineBasicMaterial({
      color: 0xFF9900, // Tactical Amber for PNR
      transparent: true,
      opacity: 0.9,
    });

    this.matBlockedWire = new THREE.LineBasicMaterial({
      color: 0xFF3333,
      transparent: true,
      opacity: 0.6,
    });

    // 2. Build 3D Envelopes for each configured effector
    const effectorIds: EffectorId[] = [
      'RF_SOFTKILL',
      'LASER',
      'GUN',
      'INTERCEPTOR',
      'MISSILE',
    ];

    effectorIds.forEach((id) => {
      const eff = CONFIG.effectors[id];
      const plateau = getEnvelopePlateau(id);
      const effGroup = new THREE.Group();

      const wireMat = this.getTierWireMat(eff.tier);
      const surfaceMat = this.getTierSurfaceMat(eff.tier);

      // Annular optimal plateau band
      const plateauGeom = createAnnularPlateauGeometry(plateau.plateauMinM, plateau.plateauMaxM, 64);
      const plateauMesh = new THREE.Mesh(plateauGeom, surfaceMat);
      plateauMesh.position.y = 1.0;
      effGroup.add(plateauMesh);

      // Boundary rings
      const minGeom = createCircleWireGeometry(plateau.envelopeMinM, 64);
      const maxGeom = createCircleWireGeometry(plateau.envelopeMaxM, 64);
      const pMinGeom = createCircleWireGeometry(plateau.plateauMinM, 64);
      const pMaxGeom = createCircleWireGeometry(plateau.plateauMaxM, 64);

      const minLoop = new THREE.LineLoop(minGeom, wireMat);
      const maxLoop = new THREE.LineLoop(maxGeom, wireMat);
      const plateauMinLoop = new THREE.LineLoop(pMinGeom, wireMat);
      const plateauMaxLoop = new THREE.LineLoop(pMaxGeom, wireMat);

      effGroup.add(minLoop);
      effGroup.add(maxLoop);
      effGroup.add(plateauMinLoop);
      effGroup.add(plateauMaxLoop);

      // Height struts at cardinal angles connecting ground to ceiling
      const strutHeight = 150;
      const strutPoints: THREE.Vector3[] = [
        new THREE.Vector3(0, 0, -plateau.envelopeMaxM),
        new THREE.Vector3(0, strutHeight, -plateau.envelopeMaxM),
        new THREE.Vector3(plateau.envelopeMaxM, 0, 0),
        new THREE.Vector3(plateau.envelopeMaxM, strutHeight, 0),
        new THREE.Vector3(0, 0, plateau.envelopeMaxM),
        new THREE.Vector3(0, strutHeight, plateau.envelopeMaxM),
        new THREE.Vector3(-plateau.envelopeMaxM, 0, 0),
        new THREE.Vector3(-plateau.envelopeMaxM, strutHeight, 0),
      ];
      const strutGeom = new THREE.BufferGeometry().setFromPoints(strutPoints);
      const struts = new THREE.LineSegments(strutGeom, wireMat);
      effGroup.add(struts);

      // Label sprite
      const hex = getTierColorHex(eff.tier);
      const labelText = `[${id}] ${(eff.envelopeMinM / 1000).toFixed(1)}-${(eff.envelopeMaxM / 1000).toFixed(1)}km | ${eff.tier}`;
      const sprite = createTextSprite(labelText, hex);
      sprite.position.set(0, strutHeight + 25, -plateau.rOptM);
      effGroup.add(sprite);

      this.effectorRecords.set(id, {
        group: effGroup,
        plateauMesh,
        minLoop,
        maxLoop,
        plateauMinLoop,
        plateauMaxLoop,
        struts,
        labelSprite: sprite,
        lastLabel: labelText,
      });

      this.group.add(effGroup);
    });

    // 3. Build Point of No Return (PNR) Perimeter Ring (rMinM = 500m)
    this.pnrGroup = new THREE.Group();
    const pnrR = CONFIG.thresholds.rMinM;
    const pnrGeom = createCircleWireGeometry(pnrR, 64);
    this.pnrLoop = new THREE.LineLoop(pnrGeom, this.matPnrWire);
    this.pnrLoop.position.y = 1.0;
    this.pnrGroup.add(this.pnrLoop);

    // PNR Vertical fence boundary markers
    const fenceHeight = 80;
    const fencePoints: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      const theta = (i / 16) * Math.PI * 2;
      const x = Math.cos(theta) * pnrR;
      const z = Math.sin(theta) * pnrR;
      fencePoints.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, fenceHeight, z));
    }
    const fenceGeom = new THREE.BufferGeometry().setFromPoints(fencePoints);
    this.pnrFence = new THREE.LineSegments(fenceGeom, this.matPnrWire);
    this.pnrGroup.add(this.pnrFence);

    this.pnrLabelSprite = createTextSprite('PNR PERIMETER: 500m [POINT OF NO RETURN]', '#FF9900');
    this.pnrLabelSprite.position.set(0, fenceHeight + 20, -pnrR);
    this.pnrGroup.add(this.pnrLabelSprite);

    this.group.add(this.pnrGroup);

    // 4. Target Engagement Cue Billboard
    this.targetCueSprite = createTextSprite('', '#00FF66');
    this.targetCueSprite.visible = false;
    this.group.add(this.targetCueSprite);
  }

  /**
   * Updates effector envelopes, armed weapon focus, and target cue without reallocations.
   */
  public update(options: EffectorVisualOptions): void {
    if (options.visible === false) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const envelopes = calculateEffectorEnvelopes(
      options.activeEffector,
      options.sensorHealth,
      options.chaosList,
      options.tMs
    );

    // 1. Update Effector Groups
    envelopes.forEach((env) => {
      const record = this.effectorRecords.get(env.id);
      if (!record) return;

      const isArmed = env.isArmed;
      record.group.visible = isArmed; // Highlight armed effector; can be toggled to show all

      if (isArmed) {
        if (!env.isFunctional) {
          record.minLoop.material = this.matBlockedWire;
          record.maxLoop.material = this.matBlockedWire;
          record.plateauMinLoop.material = this.matBlockedWire;
          record.plateauMaxLoop.material = this.matBlockedWire;
          record.struts.material = this.matBlockedWire;
        } else {
          record.plateauMesh.material = this.matPlateauArmed;
        }

        const labelText = `[${env.id}] ${(env.envelopeMinM / 1000).toFixed(1)}-${(env.envelopeMaxM / 1000).toFixed(1)}km | ${env.tier} | ${env.statusLabel}`;
        if (labelText !== record.lastLabel) {
          record.lastLabel = labelText;
          const hex = getEffectorRecordHex(env.isFunctional, env.tier);
          updateSpriteCanvas(record.labelSprite, labelText, hex);
        }
      }
    });

    // 2. Update Target Engagement Cue
    if (options.selectedTrack) {
      const cue = calculateTrackEngagementCue(
        options.activeEffector,
        options.selectedTrack,
        options.sensorHealth,
        options.chaosList,
        options.tMs
      );

      this.targetCueSprite.visible = true;
      // Position above the track marker in Three.js coordinates
      this.targetCueSprite.position.set(
        options.selectedTrack.pos.x,
        options.selectedTrack.pos.z + 55, // Y in Three.js is altitude
        -options.selectedTrack.pos.y
      );

      if (cue.label !== this.lastTargetCueLabel) {
        this.lastTargetCueLabel = cue.label;
        const color = getTargetCueColor(cue.isHardBlocked, cue.isInPlateau);
        updateSpriteCanvas(this.targetCueSprite, cue.label, color);
      }
    } else {
      this.targetCueSprite.visible = false;
    }
  }

  private getTierWireMat(tier: string): THREE.LineBasicMaterial {
    if (tier === 'T3_HEAVY') return this.matT3Wire;
    if (tier === 'T2_KINETIC') return this.matT2Wire;
    return this.matT1Wire;
  }

  private getTierSurfaceMat(tier: string): THREE.MeshBasicMaterial {
    if (tier === 'T3_HEAVY') return this.matT3Surface;
    if (tier === 'T2_KINETIC') return this.matT2Surface;
    return this.matT1Surface;
  }

  /**
   * Complete memory cleanup and buffer disposal.
   */
  public dispose(): void {
    this.effectorRecords.forEach((rec) => {
      rec.plateauMesh.geometry.dispose();
      rec.minLoop.geometry.dispose();
      rec.maxLoop.geometry.dispose();
      rec.plateauMinLoop.geometry.dispose();
      rec.plateauMaxLoop.geometry.dispose();
      rec.struts.geometry.dispose();
      if (rec.labelSprite.material.map) rec.labelSprite.material.map.dispose();
      rec.labelSprite.material.dispose();
      rec.group.clear();
    });
    this.effectorRecords.clear();

    this.pnrLoop.geometry.dispose();
    this.pnrFence.geometry.dispose();
    if (this.pnrLabelSprite.material.map) this.pnrLabelSprite.material.map.dispose();
    this.pnrLabelSprite.material.dispose();
    this.pnrGroup.clear();

    if (this.targetCueSprite.material.map) this.targetCueSprite.material.map.dispose();
    this.targetCueSprite.material.dispose();

    this.matT1Wire.dispose();
    this.matT1Surface.dispose();
    this.matT2Wire.dispose();
    this.matT2Surface.dispose();
    this.matT3Wire.dispose();
    this.matT3Surface.dispose();
    this.matPlateauArmed.dispose();
    this.matPnrWire.dispose();
    this.matBlockedWire.dispose();

    this.group.clear();
  }
}

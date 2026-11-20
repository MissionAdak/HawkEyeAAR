import * as THREE from 'three';
import type { BuiltTargetModel, TargetModelCategory, TargetModelPalette } from './targetModelTypes';
import {
  buildFpvAttackModel,
  buildReconQuadModel,
  buildSwarmElementModel,
  buildCivilUasModel,
} from './multirotorModels';
import { buildFriendlyUasModel, buildBirdModel, buildUnknownContactModel } from './specialContactModels';

// Tactical NATO-inspired colors (Rule R3.4)
const COLOR_THREAT = 0xff3b30;    // Hostile crimson
const COLOR_FRIEND = 0x00f0ff;    // Friendly cyan
const COLOR_CIVIL = 0x00ff66;     // Civilian green
const COLOR_UNKNOWN = 0xffb700;   // Amber unclassified
const COLOR_BODY_DARK = 0x22272e; // Tactical dark carbon
const COLOR_BODY_LIGHT = 0x8a99a8;// Natural matte gray

export class TargetModelFactory {
  private readonly sharedMaterials: Map<string, THREE.Material> = new Map();
  private readonly hitProxyMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.hitProxyMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  }

  private getMaterial(key: string, createFn: () => THREE.Material): THREE.Material {
    let mat = this.sharedMaterials.get(key);
    if (!mat) {
      mat = createFn();
      this.sharedMaterials.set(key, mat);
    }
    return mat;
  }

  public getPaletteForCategory(category: TargetModelCategory): TargetModelPalette {
    switch (category) {
      case 'HOSTILE_ATTACK': {
        const body = this.getMaterial('body_threat', () => new THREE.MeshLambertMaterial({ color: 0x1d2127 }));
        const accent = this.getMaterial('accent_threat', () => new THREE.MeshBasicMaterial({ color: COLOR_THREAT }));
        const rotors = this.getMaterial('rotors_threat', () => new THREE.MeshBasicMaterial({ color: COLOR_THREAT, transparent: true, opacity: 0.35 }));
        return { body, accent, rotors, hitProxy: this.hitProxyMaterial };
      }
      case 'HOSTILE_ISR': {
        const body = this.getMaterial('body_isr', () => new THREE.MeshLambertMaterial({ color: 0x242a33 }));
        const accent = this.getMaterial('accent_isr', () => new THREE.MeshBasicMaterial({ color: COLOR_THREAT }));
        const rotors = this.getMaterial('rotors_isr', () => new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 }));
        return { body, accent, rotors, hitProxy: this.hitProxyMaterial };
      }
      case 'SWARM_ELEMENT': {
        const body = this.getMaterial('body_swarm', () => new THREE.MeshLambertMaterial({ color: 0x181a1e }));
        const accent = this.getMaterial('accent_swarm', () => new THREE.MeshBasicMaterial({ color: COLOR_THREAT }));
        const rotors = this.getMaterial('rotors_swarm', () => new THREE.MeshBasicMaterial({ color: COLOR_THREAT, transparent: true, opacity: 0.4 }));
        return { body, accent, rotors, hitProxy: this.hitProxyMaterial };
      }
      case 'CIVIL_UAS': {
        const body = this.getMaterial('body_civil', () => new THREE.MeshLambertMaterial({ color: 0xd0d7de }));
        const accent = this.getMaterial('accent_civil', () => new THREE.MeshBasicMaterial({ color: COLOR_CIVIL }));
        const rotors = this.getMaterial('rotors_civil', () => new THREE.MeshBasicMaterial({ color: COLOR_CIVIL, transparent: true, opacity: 0.25 }));
        return { body, accent, rotors, hitProxy: this.hitProxyMaterial };
      }
      case 'FRIENDLY': {
        const body = this.getMaterial('body_friend', () => new THREE.MeshLambertMaterial({ color: 0x2b3b48 }));
        const accent = this.getMaterial('accent_friend', () => new THREE.MeshBasicMaterial({ color: COLOR_FRIEND }));
        const rotors = this.getMaterial('rotors_friend', () => new THREE.MeshBasicMaterial({ color: COLOR_FRIEND, transparent: true, opacity: 0.3 }));
        return { body, accent, rotors, hitProxy: this.hitProxyMaterial };
      }
      case 'BIRD': {
        const body = this.getMaterial('body_bird', () => new THREE.MeshLambertMaterial({ color: COLOR_BODY_LIGHT }));
        const accent = this.getMaterial('accent_bird', () => new THREE.MeshBasicMaterial({ color: 0x48525e }));
        return { body, accent, hitProxy: this.hitProxyMaterial };
      }
      case 'UNKNOWN':
      default: {
        const body = this.getMaterial('body_unknown', () => new THREE.MeshLambertMaterial({ color: COLOR_BODY_DARK }));
        const accent = this.getMaterial('accent_unknown', () => new THREE.MeshBasicMaterial({ color: COLOR_UNKNOWN }));
        return { body, accent, hitProxy: this.hitProxyMaterial };
      }
    }
  }

  /**
   * Instantiates a specialized procedural 3D model for the given target category.
   * Tags all pickable sub-meshes with userData.trackNo for seamless 3D raycast designation.
   */
  public createModel(category: TargetModelCategory, trackNo: string): BuiltTargetModel {
    const palette = this.getPaletteForCategory(category);
    let model: BuiltTargetModel;

    switch (category) {
      case 'HOSTILE_ATTACK':
        model = buildFpvAttackModel(palette);
        break;
      case 'HOSTILE_ISR':
        model = buildReconQuadModel(palette);
        break;
      case 'SWARM_ELEMENT':
        model = buildSwarmElementModel(palette);
        break;
      case 'CIVIL_UAS':
        model = buildCivilUasModel(palette);
        break;
      case 'FRIENDLY':
        model = buildFriendlyUasModel(palette);
        break;
      case 'BIRD':
        model = buildBirdModel(palette);
        break;
      case 'UNKNOWN':
      default:
        model = buildUnknownContactModel(palette);
        break;
    }

    // Tag pickable meshes with trackNo for raycaster hit-testing
    model.bodyMesh.userData = { trackNo, targetCategory: category };
    model.accentMesh.userData = { trackNo, targetCategory: category };
    model.hitProxy.userData = { trackNo, targetCategory: category };
    model.rootGroup = model.group;

    return model;
  }

  public dispose(): void {
    for (const mat of this.sharedMaterials.values()) {
      mat.dispose();
    }
    this.sharedMaterials.clear();
    this.hitProxyMaterial.dispose();
  }
}

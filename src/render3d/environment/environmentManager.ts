import * as THREE from 'three';
import type { EnvironmentDescriptor, EnvironmentObjectInfo } from './types';
import { buildProceduralTerrain } from './terrain';
import { buildProceduralBuildings } from './buildings';
import { buildProceduralVegetation } from './vegetation';
import { WeatherManager } from './weather';
import type { ChaosSpec, ZoneSpec } from '@/sim/types';
import { toThree } from '../coords';

// Tactical colors
const COLOR_AMBER = 0xff9900;
const COLOR_PHOSPHOR_DIM = 0x003b1a;

export class EnvironmentManager {
  public readonly group: THREE.Group;
  private readonly descriptor: EnvironmentDescriptor;
  private readonly weather: WeatherManager;

  private readonly objectsMap: Map<string, EnvironmentObjectInfo> = new Map();
  private readonly selectableMeshes: THREE.Object3D[] = [];
  private readonly disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }[] = [];

  constructor(parent: THREE.Group, descriptor: EnvironmentDescriptor, scene?: THREE.Scene) {
    this.descriptor = descriptor;
    this.group = new THREE.Group();
    this.group.name = 'EnvironmentManager';
    parent.add(this.group);

    // 1. Build Weather & Atmospheric Lighting
    this.weather = new WeatherManager(this.group, descriptor, scene);

    // 2. Build Terrain Surface & Infrastructure
    const terrainRes = buildProceduralTerrain(descriptor);
    this.group.add(terrainRes.group);
    terrainRes.objects.forEach((obj) => this.objectsMap.set(obj.id, obj));
    this.disposables.push(terrainRes.disposables);

    // 3. Build Buildings, Towers & Installations
    const bldRes = buildProceduralBuildings(descriptor);
    this.group.add(bldRes.group);
    bldRes.objects.forEach((obj) => this.objectsMap.set(obj.id, obj));
    this.selectableMeshes.push(...bldRes.selectableMeshes);
    this.disposables.push(bldRes.disposables);

    // 4. Build Procedural Vegetation (Instanced)
    const vegRes = buildProceduralVegetation(descriptor);
    this.group.add(vegRes.group);
    vegRes.objects.forEach((obj) => this.objectsMap.set(obj.id, obj));
    this.selectableMeshes.push(...vegRes.selectableMeshes);
    this.disposables.push(vegRes.disposables);

    // 5. Build Zone Envelopes and Masking Hulls
    this.buildZoneOcclusionHulls(descriptor.zones);
  }

  /**
   * Renders the simplified obstacle/occlusion envelope for scenario zones.
   * INVARIANT (Rules R10.12):
   * This envelope visually matches the authoritative polygon and height used by evaluateMasking().
   */
  private buildZoneOcclusionHulls(zones: ZoneSpec[]): void {
    const hullGroup = new THREE.Group();
    hullGroup.name = 'ZoneOcclusionHulls';

    for (const zone of zones) {
      if (zone.polygon.length < 3) continue;

      const shape = new THREE.Shape();
      const firstPt = toThree(zone.polygon[0][0], zone.polygon[0][1], 0);
      shape.moveTo(firstPt.x, -firstPt.z);

      for (let i = 1; i < zone.polygon.length; i++) {
        const pt = toThree(zone.polygon[i][0], zone.polygon[i][1], 0);
        shape.lineTo(pt.x, -pt.z);
      }
      shape.closePath();

      const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
        depth: zone.heightM,
        bevelEnabled: false,
      });
      extrudeGeom.rotateX(Math.PI / 2);

      const isUrban = zone.type === 'URBAN';
      const hullColor = isUrban ? COLOR_AMBER : COLOR_PHOSPHOR_DIM;

      // Transparent obstruction boundary
      const hullMat = new THREE.MeshBasicMaterial({
        color: hullColor,
        transparent: true,
        opacity: isUrban ? 0.08 : 0.04,
        depthWrite: false,
      });

      const hullMesh = new THREE.Mesh(extrudeGeom, hullMat);

      // Distinct wireframe boundary lines
      const edgesGeom = new THREE.EdgesGeometry(extrudeGeom);
      const wireMat = new THREE.LineBasicMaterial({
        color: hullColor,
        transparent: true,
        opacity: 0.5,
      });
      const wire = new THREE.LineSegments(edgesGeom, wireMat);

      hullGroup.add(hullMesh);
      hullGroup.add(wire);

      // Register zone as inspectable obstruction envelope
      const minX = Math.min(...zone.polygon.map((p) => p[0]));
      const maxX = Math.max(...zone.polygon.map((p) => p[0]));
      const minY = Math.min(...zone.polygon.map((p) => p[1]));
      const maxY = Math.max(...zone.polygon.map((p) => p[1]));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const zoneInfo: EnvironmentObjectInfo = {
        id: `ZONE-ENVELOPE-${zone.id}`,
        name: `Zone ${zone.id} Occlusion Envelope (${zone.type})`,
        category: 'TERRAIN_ZONE',
        preset: this.descriptor.preset,
        zoneId: zone.id,
        position: { x: centerX, y: centerY, z: 0 },
        heightM: zone.heightM,
        maskingProperties: {
          heightM: zone.heightM,
          shadowM: zone.shadowM,
          rho: zone.rho,
          zoneType: zone.type,
        },
        isObstructionEnvelope: true,
        description: `Authoritative ${zone.type} masking zone. Casts ${zone.shadowM}m radar shadow with attenuation factor rho=${zone.rho}.`,
      };

      hullMesh.userData = {
        isEnvironmentObject: true,
        envObjectId: zoneInfo.id,
        envObjectInfo: zoneInfo,
      };
      this.objectsMap.set(zoneInfo.id, zoneInfo);
      this.selectableMeshes.push(hullMesh);

      this.disposables.push({
        geometries: [extrudeGeom, edgesGeom],
        materials: [hullMat, wireMat],
      });
    }

    this.group.add(hullGroup);
  }

  /**
   * Raycasts against selectable environmental objects.
   * Returns EnvironmentObjectInfo if intersected, or null.
   */
  public pickEnvironmentObject(raycaster: THREE.Raycaster): EnvironmentObjectInfo | null {
    if (this.selectableMeshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(this.selectableMeshes, true);
    if (intersects.length === 0) return null;

    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr) {
        if (curr.userData && curr.userData.envObjectInfo) {
          return curr.userData.envObjectInfo as EnvironmentObjectInfo;
        }
        curr = curr.parent;
      }
    }

    return null;
  }

  public getObjectById(id: string): EnvironmentObjectInfo | undefined {
    return this.objectsMap.get(id);
  }

  public getAllObjects(): EnvironmentObjectInfo[] {
    return Array.from(this.objectsMap.values());
  }

  public getDescriptor(): EnvironmentDescriptor {
    return this.descriptor;
  }

  public isFogActive(): boolean {
    return this.descriptor.weather === 'FOG';
  }

  public isNightTime(): boolean {
    return this.descriptor.dayNight === 'NIGHT';
  }

  /**
   * Updates dynamic weather simulation.
   */
  public update(simMs: number, chaosList?: ChaosSpec[]): void {
    this.weather.update(simMs, chaosList);
  }

  public setLowFidelity(lowFi: boolean): void {
    this.weather.setLowFidelity(lowFi);
  }

  public dispose(): void {
    this.weather.dispose();

    for (const d of this.disposables) {
      d.geometries.forEach((g) => g.dispose());
      d.materials.forEach((m) => m.dispose());
    }
    this.disposables.length = 0;
    this.selectableMeshes.length = 0;
    this.objectsMap.clear();

    this.group.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

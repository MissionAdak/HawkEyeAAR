import * as THREE from 'three';
import type { ChaosSpec } from '@/sim/types';
import type { EnvironmentDescriptor, WeatherType } from './types';

const DEFAULT_FOG_SEVERITY = 0.5;

function computeFogParameters(
  isFog: boolean,
  isNight: boolean,
  severity: number = DEFAULT_FOG_SEVERITY
): { color: number; near: number; far: number } {
  if (isFog) {
    const near = 7000 - severity * 2000;
    const far = 26000 - severity * 6000;
    const color = isNight ? 0x101a24 : 0x222c38;
    return { color, near, far };
  }
  const color = isNight ? 0x070c12 : 0x0d1117;
  return { color, near: 12000, far: 35000 };
}

export class WeatherManager {
  private readonly parent: THREE.Group;
  private readonly scene?: THREE.Scene;
  private readonly descriptor: EnvironmentDescriptor;
  public readonly weatherGroup: THREE.Group;

  // Lighting
  private readonly ambientLight: THREE.AmbientLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly moonLight: THREE.DirectionalLight;

  // Rain Particles
  private rainLines: THREE.LineSegments | null = null;
  private rainGeom: THREE.BufferGeometry | null = null;
  private rainMat: THREE.LineBasicMaterial | null = null;
  private readonly rainInitialOffsets: { x: number; y: number; z: number; speed: number }[] = [];
  private isLowFi: boolean = false;

  // Cloud Layer
  private cloudMesh: THREE.Mesh | null = null;

  constructor(parent: THREE.Group, descriptor: EnvironmentDescriptor, scene?: THREE.Scene) {
    this.parent = parent;
    this.scene = scene;
    this.descriptor = descriptor;
    this.weatherGroup = new THREE.Group();
    this.weatherGroup.name = 'WeatherManager';
    this.parent.add(this.weatherGroup);

    const isNight = descriptor.dayNight === 'NIGHT';

    // 1. Lighting Setup
    const ambientColor = isNight ? 0x223344 : 0xffffff;
    const ambientIntensity = isNight ? 0.6 : 0.95;
    this.ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    this.weatherGroup.add(this.ambientLight);

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xffffff, isNight ? 0.2 : 0.95);
    this.sunLight.position.set(2500, 5000, 3000);
    this.weatherGroup.add(this.sunLight);

    // Moonlight (subtle cyan/blue in Night mode)
    this.moonLight = new THREE.DirectionalLight(0x4488cc, isNight ? 0.45 : 0);
    this.moonLight.position.set(-2000, 4500, -2500);
    this.weatherGroup.add(this.moonLight);

    // 2. Sky Background & Tactical Distance Fog
    this.setupAtmosphere(descriptor.weather, isNight, descriptor.fogSeverity);

    // 3. Setup Rain Particle System if configured
    this.setupRain(descriptor.seed);

    // 4. Overcast / Cloud Layer
    this.setupClouds(isNight);
  }

  private setupAtmosphere(
    weather: WeatherType,
    isNight: boolean,
    fogSeverity: number = DEFAULT_FOG_SEVERITY
  ): void {
    if (!this.scene) return;
    const bgColor = isNight ? 0x070c12 : 0x0d1117;
    this.scene.background = new THREE.Color(bgColor);

    const isFog = weather === 'FOG';
    const { color, near, far } = computeFogParameters(isFog, isNight, fogSeverity);
    this.scene.fog = new THREE.Fog(color, near, far);
  }

  private setupClouds(_isNight: boolean): void {
    // Keep cloud layer non-occluding so tactical assets are never obscured
    this.cloudMesh = null;
  }

  private setupRain(seed: number): void {
    const count = this.isLowFi ? 300 : 900;
    this.rainInitialOffsets.length = 0;

    let localSeed = Math.abs(seed + 443);
    function lcg(): number {
      localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
      return localSeed / 4294967296;
    }

    const positions: number[] = [];
    const boxRadius = 3500;
    const boxHeight = 1200;
    const streakLength = 25;

    for (let i = 0; i < count; i++) {
      const x = (lcg() - 0.5) * 2 * boxRadius;
      const y = lcg() * boxHeight;
      const z = (lcg() - 0.5) * 2 * boxRadius;
      const speed = 0.8 + lcg() * 0.5;

      this.rainInitialOffsets.push({ x, y, z, speed });

      // Each streak is a line segment (top and bottom points)
      positions.push(x, y, z, x - 2, y - streakLength, z + 2);
    }

    this.rainGeom = new THREE.BufferGeometry();
    this.rainGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    this.rainMat = new THREE.LineBasicMaterial({
      color: 0x7799bb,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    this.rainLines = new THREE.LineSegments(this.rainGeom, this.rainMat);
    this.rainLines.visible = false;
    this.weatherGroup.add(this.rainLines);
  }

  /**
   * Updates weather and atmospheric effects deterministically based on simulation time.
   * INVARIANT (Rules R2.2 & R2.4):
   * This animation uses simMs (engine ticks * 50) ONLY. Never reads Date.now() or Math.random().
   */
  private resolveActiveChaos(
    simMs: number,
    chaosList?: ChaosSpec[]
  ): { activeFogSeverity: number | null; isRaining: boolean } {
    let activeFogSeverity: number | null = null;
    let isRaining = this.descriptor.weather === 'RAIN';

    if (chaosList) {
      for (const chaos of chaosList) {
        if (simMs >= chaos.tStartMs && simMs <= chaos.tEndMs) {
          if (chaos.type === 'FOG') {
            activeFogSeverity = chaos.severity;
          } else if (chaos.type === 'RAIN') {
            isRaining = true;
          }
        }
      }
    }

    return { activeFogSeverity, isRaining };
  }

  private updateDynamicFog(activeFogSeverity: number | null, isNight: boolean): void {
    if (!this.scene) return;
    const isFog = activeFogSeverity !== null || this.descriptor.weather === 'FOG';
    const sev = activeFogSeverity ?? this.descriptor.fogSeverity ?? DEFAULT_FOG_SEVERITY;
    const { color, near, far } = computeFogParameters(isFog, isNight, sev);

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = near;
      this.scene.fog.far = far;
      this.scene.fog.color.setHex(color);
    } else {
      this.scene.fog = new THREE.Fog(color, near, far);
    }
  }

  private updateRainParticles(simMs: number, isRaining: boolean): void {
    if (!this.rainLines || !this.rainGeom) return;
    if (!isRaining) {
      this.rainLines.visible = false;
      return;
    }

    this.rainLines.visible = true;
    const posAttr = this.rainGeom.attributes.position as THREE.BufferAttribute;
    const streakLen = 25;
    const boxHeight = 1200;

    for (let i = 0; i < this.rainInitialOffsets.length; i++) {
      const init = this.rainInitialOffsets[i];
      const fallDist = (simMs * init.speed) % boxHeight;
      let currentY = init.y - fallDist;
      if (currentY < 0) currentY += boxHeight;

      posAttr.setXYZ(i * 2, init.x, currentY, init.z);
      posAttr.setXYZ(i * 2 + 1, init.x - 2, currentY - streakLen, init.z + 2);
    }
    posAttr.needsUpdate = true;
  }

  public update(simMs: number, chaosList?: ChaosSpec[]): void {
    const isNight = this.descriptor.dayNight === 'NIGHT';
    const { activeFogSeverity, isRaining } = this.resolveActiveChaos(simMs, chaosList);
    this.updateDynamicFog(activeFogSeverity, isNight);
    this.updateRainParticles(simMs, isRaining);
  }

  public setLowFidelity(lowFi: boolean): void {
    if (this.isLowFi === lowFi) return;
    this.isLowFi = lowFi;

    // Reconfigure particle count for low-fidelity mode
    if (this.rainLines) {
      this.weatherGroup.remove(this.rainLines);
      if (this.rainGeom) this.rainGeom.dispose();
      if (this.rainMat) this.rainMat.dispose();
      this.setupRain(this.descriptor.seed);
    }
  }

  public dispose(): void {
    if (this.rainGeom) this.rainGeom.dispose();
    if (this.rainMat) this.rainMat.dispose();
    if (this.cloudMesh) {
      this.cloudMesh.geometry.dispose();
      (this.cloudMesh.material as THREE.Material).dispose();
    }
    this.weatherGroup.clear();
    this.parent.remove(this.weatherGroup);
    if (this.scene) {
      this.scene.fog = null;
    }
  }
}

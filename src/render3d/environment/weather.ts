import * as THREE from 'three';
import type { ChaosSpec } from '@/sim/types';
import type { EnvironmentDescriptor, WeatherType } from './types';

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
    const ambientColor = isNight ? 0x152230 : 0xdde6f0;
    const ambientIntensity = isNight ? 0.45 : 0.75;
    this.ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    this.weatherGroup.add(this.ambientLight);

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xffffff, isNight ? 0.05 : 0.85);
    this.sunLight.position.set(2500, 5000, 3000);
    this.weatherGroup.add(this.sunLight);

    // Moonlight (subtle cyan/blue in Night mode)
    this.moonLight = new THREE.DirectionalLight(0x4488cc, isNight ? 0.35 : 0);
    this.moonLight.position.set(-2000, 4500, -2500);
    this.weatherGroup.add(this.moonLight);

    // 2. Sky Background & Baseline Fog
    this.setupAtmosphere(descriptor.weather, descriptor.fogSeverity, isNight);

    // 3. Setup Rain Particle System if configured
    this.setupRain(descriptor.seed);

    // 4. Overcast / Cloud Layer
    this.setupClouds(isNight);
  }

  private setupAtmosphere(weather: WeatherType, fogSeverity: number = 0.5, isNight: boolean): void {
    if (!this.scene) return;
    const bgColor = isNight ? 0x070c12 : 0x0d1117;
    this.scene.background = new THREE.Color(bgColor);

    if (weather === 'FOG') {
      const fogDensity = 0.00015 + fogSeverity * 0.00025;
      const fogColor = isNight ? 0x101a24 : 0x222c38;
      this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    } else {
      // Subtle tactical distance fog for horizon depth
      const defaultFogColor = isNight ? 0x070c12 : 0x0d1117;
      this.scene.fog = new THREE.FogExp2(defaultFogColor, 0.000035);
    }
  }

  private setupClouds(isNight: boolean): void {
    const cloudGeom = new THREE.PlaneGeometry(16000, 16000, 4, 4);
    cloudGeom.rotateX(Math.PI / 2);

    const cloudColor = isNight ? 0x0d1520 : 0x202b38;
    const cloudMat = new THREE.MeshBasicMaterial({
      color: cloudColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    this.cloudMesh.position.y = 2200;
    this.weatherGroup.add(this.cloudMesh);
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
      positions.push(x, y, z);
      positions.push(x - 2, y - streakLength, z + 2);
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
  public update(simMs: number, chaosList?: ChaosSpec[]): void {
    const isNight = this.descriptor.dayNight === 'NIGHT';

    // 1. Check dynamic chaos events in simulation schedule
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

    // 2. Dynamic Fog Adjustment
    if (this.scene) {
      if (activeFogSeverity !== null || this.descriptor.weather === 'FOG') {
        const sev = activeFogSeverity ?? this.descriptor.fogSeverity ?? 0.6;
        const density = 0.00015 + sev * 0.00025;
        const fogColor = isNight ? 0x101a24 : 0x222c38;
        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.density = density;
          this.scene.fog.color.setHex(fogColor);
        } else {
          this.scene.fog = new THREE.FogExp2(fogColor, density);
        }
      } else {
        const defaultFogColor = isNight ? 0x070c12 : 0x0d1117;
        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.density = 0.000035;
          this.scene.fog.color.setHex(defaultFogColor);
        }
      }
    }

    // 3. Rain Particles Simulation
    if (this.rainLines && this.rainGeom) {
      if (isRaining) {
        this.rainLines.visible = true;
        const posAttr = this.rainGeom.attributes.position as THREE.BufferAttribute;
        const streakLen = 25;
        const boxHeight = 1200;

        for (let i = 0; i < this.rainInitialOffsets.length; i++) {
          const init = this.rainInitialOffsets[i];
          // Pure deterministic displacement from simMs
          const fallDist = (simMs * init.speed) % boxHeight;
          let currentY = init.y - fallDist;
          if (currentY < 0) currentY += boxHeight;

          // Top vertex
          posAttr.setXYZ(i * 2, init.x, currentY, init.z);
          // Bottom vertex
          posAttr.setXYZ(i * 2 + 1, init.x - 2, currentY - streakLen, init.z + 2);
        }
        posAttr.needsUpdate = true;
      } else {
        this.rainLines.visible = false;
      }
    }
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

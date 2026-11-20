import type { Vec3, Profile, ZoneSpec } from './types';
import { mulberry32, streamSeed } from './rng';
import { CONFIG } from '@/config';

export interface BehaviourContext {
  tick: number;
  dtSec: number;
  speedMps: number;
  profile: Profile;
  waypoints: Vec3[];
  zones: ZoneSpec[];
  entityIndex: number;
  scenarioSeed: number;
}

/**
 * Updates entity velocity and vertical rate based on assigned tactical profile.
 */
export class BehaviourController {
  private readonly erraticRng: (() => number) | null = null;
  private popupPhase: 'APPROACH' | 'CLIMB' | 'DIVE' = 'APPROACH';
  private reachedPeak: boolean = false;

  constructor(context: BehaviourContext) {
    if (context.profile === 'ERRATIC') {
      const trajSeed = streamSeed(context.scenarioSeed, 'traj', context.entityIndex);
      this.erraticRng = mulberry32(trajSeed);
    }
  }

  public getPopupPhase(): 'APPROACH' | 'CLIMB' | 'DIVE' {
    return this.popupPhase;
  }

  private stepDirect(pos: Vec3, vel: Vec3, waypoints: Vec3[], speedMps: number): void {
    const target = waypoints.at(-1) ?? { x: 0, y: 0, z: 0 };
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.1) {
      vel.x = (dx / dist) * speedMps;
      vel.y = (dy / dist) * speedMps;
    } else {
      vel.x = 0;
      vel.y = 0;
    }
    vel.z = 0;
  }

  private stepTerrainHug(pos: Vec3, vel: Vec3, zones: ZoneSpec[], speedMps: number): void {
    const target = { x: 0, y: 0, z: 0 };
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const distToAsset = Math.hypot(dx, dy);

    if (distToAsset > 0.1) {
      vel.x = (dx / distToAsset) * speedMps;
      vel.y = (dy / distToAsset) * speedMps;
    }

    const zCruise = 120;
    const zHug = 20;
    const descentRate = 8; // m/s
    const dTrig = (speedMps * (zCruise - zHug)) / descentRate; // 500m

    let nearZoneDist = Infinity;
    for (const zone of zones) {
      for (const [zx, zy] of zone.polygon) {
        const d = Math.hypot(pos.x - zx, pos.y - zy);
        if (d < nearZoneDist) nearZoneDist = d;
      }
    }

    if (nearZoneDist <= dTrig || distToAsset <= 3000) {
      if (pos.z > zHug) {
        vel.z = -descentRate;
      } else {
        vel.z = 0;
        pos.z = zHug;
      }
    }

    if (distToAsset < 1800) {
      if (pos.z < zCruise) {
        vel.z = descentRate;
      } else {
        vel.z = 0;
        pos.z = zCruise;
      }
    }
  }

  private stepLoiter(pos: Vec3, vel: Vec3, waypoints: Vec3[], context: BehaviourContext): { pos: Vec3; vel: Vec3 } {
    const orbitRadiusM = 300;
    const center = waypoints.length > 0 ? waypoints[0] : { x: pos.x, y: pos.y, z: pos.z };
    const angle = (context.tick * context.dtSec * context.speedMps) / orbitRadiusM;

    pos.x = center.x + orbitRadiusM * Math.cos(angle);
    pos.y = center.y + orbitRadiusM * Math.sin(angle);
    vel.x = -context.speedMps * Math.sin(angle);
    vel.y = context.speedMps * Math.cos(angle);
    vel.z = 0;
    return { pos, vel };
  }

  private stepErratic(vel: Vec3, speedMps: number): void {
    if (this.erraticRng) {
      const jitterAngle = this.erraticRng() * Math.PI * 2;
      const jitterSpeed = speedMps * (0.8 + 0.4 * this.erraticRng());
      vel.x = jitterSpeed * Math.cos(jitterAngle);
      vel.y = jitterSpeed * Math.sin(jitterAngle);
      vel.z = (this.erraticRng() - 0.5) * 2;
    }
  }

  private stepPopUpApproach(pos: Vec3, vel: Vec3, distToAsset: number, speedMps: number): void {
    this.popupPhase = 'APPROACH';
    const dx = -pos.x;
    const dy = -pos.y;
    if (distToAsset > 0.1) {
      vel.x = (dx / distToAsset) * speedMps;
      vel.y = (dy / distToAsset) * speedMps;
    }
    if (pos.z > 20) {
      vel.z = -8;
    } else {
      vel.z = 0;
      pos.z = 20;
    }
  }

  private stepPopUpClimb(
    pos: Vec3,
    vel: Vec3,
    distToAsset: number,
    speedMps: number,
    climbRateMps: number,
    peakZ: number
  ): void {
    this.popupPhase = 'CLIMB';
    const dx = -pos.x;
    const dy = -pos.y;
    if (distToAsset > 0.1) {
      vel.x = (dx / distToAsset) * speedMps;
      vel.y = (dy / distToAsset) * speedMps;
    }
    if (pos.z < peakZ) {
      vel.z = climbRateMps;
    } else {
      vel.z = 0;
      pos.z = peakZ;
      this.reachedPeak = true;
      this.popupPhase = 'DIVE';
    }
  }

  private stepPopUpTerminalDive(
    pos: Vec3,
    vel: Vec3,
    speedMps: number,
    terminalTargetZ: number
  ): void {
    this.popupPhase = 'DIVE';
    const dX = -pos.x;
    const dY = -pos.y;
    const dZ = terminalTargetZ - pos.z;
    const dist3D = Math.hypot(dX, dY, dZ);

    if (dist3D > 0.1) {
      vel.x = (dX / dist3D) * speedMps;
      vel.y = (dY / dist3D) * speedMps;
      vel.z = (dZ / dist3D) * speedMps;
    } else {
      vel.x = 0;
      vel.y = 0;
      vel.z = 0;
    }
  }

  private stepPopUpDive(pos: Vec3, vel: Vec3, speedMps: number): void {
    const distToAsset = Math.hypot(pos.x, pos.y);
    const popupDistM = CONFIG.terrain?.popUp?.popupDistM ?? 900;
    const climbRateMps = CONFIG.terrain?.popUp?.climbRateMps ?? 15;
    const peakZ = CONFIG.terrain?.popUp?.peakZM ?? 150;
    const terminalTargetZ = CONFIG.terrain?.popUp?.terminalTargetZM ?? 20;

    if (!this.reachedPeak) {
      if (distToAsset > popupDistM) {
        this.stepPopUpApproach(pos, vel, distToAsset, speedMps);
      } else {
        this.stepPopUpClimb(pos, vel, distToAsset, speedMps, climbRateMps, peakZ);
      }
    } else {
      this.stepPopUpTerminalDive(pos, vel, speedMps, terminalTargetZ);
    }
  }

  private stepDefault(pos: Vec3, vel: Vec3, waypoints: Vec3[], speedMps: number): void {
    const target = waypoints.at(-1) ?? { x: 0, y: 0, z: 0 };
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.1) {
      vel.x = (dx / dist) * speedMps;
      vel.y = (dy / dist) * speedMps;
    }
    vel.z = 0;
  }

  public step(pos: Vec3, vel: Vec3, context: BehaviourContext): { pos: Vec3; vel: Vec3 } {
    const { speedMps, profile, waypoints, zones, dtSec } = context;

    switch (profile) {
      case 'DIRECT':
        this.stepDirect(pos, vel, waypoints, speedMps);
        break;

      case 'TERRAIN_HUG':
        this.stepTerrainHug(pos, vel, zones, speedMps);
        break;

      case 'LOITER':
        return this.stepLoiter(pos, vel, waypoints, context);

      case 'ERRATIC':
        this.stepErratic(vel, speedMps);
        break;

      case 'POP_UP_DIVE':
        this.stepPopUpDive(pos, vel, speedMps);
        break;

      case 'ORBIT_FEINT':
      case 'SWARM_SATURATE':
      default:
        this.stepDefault(pos, vel, waypoints, speedMps);
        break;
    }

    pos.x += vel.x * dtSec;
    pos.y += vel.y * dtSec;
    pos.z += vel.z * dtSec;

    return { pos, vel };
  }
}

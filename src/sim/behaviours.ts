import type { Vec3, Profile, ZoneSpec } from './types';
import { mulberry32, streamSeed } from './rng';

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
  private erraticRng: (() => number) | null = null;

  constructor(context: BehaviourContext) {
    if (context.profile === 'ERRATIC') {
      const trajSeed = streamSeed(context.scenarioSeed, 'traj', context.entityIndex);
      this.erraticRng = mulberry32(trajSeed);
    }
  }

  public step(pos: Vec3, vel: Vec3, context: BehaviourContext): { pos: Vec3; vel: Vec3 } {
    const { speedMps, profile, waypoints, zones, dtSec } = context;

    switch (profile) {
      case 'DIRECT': {
        // Direct flight path to asset at (0, 0, 0) or target waypoint
        const target = waypoints.length > 0 ? waypoints[waypoints.length - 1] : { x: 0, y: 0, z: 0 };
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
        break;
      }

      case 'TERRAIN_HUG': {
        // Direct flight towards asset with terrain hug descent triggered 500m before zone
        const target = { x: 0, y: 0, z: 0 };
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const distToAsset = Math.hypot(dx, dy);

        if (distToAsset > 0.1) {
          vel.x = (dx / distToAsset) * speedMps;
          vel.y = (dy / distToAsset) * speedMps;
        }

        // Check distance to nearest zone (e.g. U1 outer edge at range 3000m)
        // For DEMO-1, U1 is around range 1800m to 3000m
        const zCruise = 120;
        const zHug = 20;
        const descentRate = 8; // m/s
        const dTrig = (speedMps * (zCruise - zHug)) / descentRate; // 500m

        // Check if approaching zone within dTrig
        let nearZoneDist = Infinity;
        for (const zone of zones) {
          for (const [zx, zy] of zone.polygon) {
            const d = Math.hypot(pos.x - zx, pos.y - zy);
            if (d < nearZoneDist) nearZoneDist = d;
          }
        }

        // If within trigger range or inside zone shadow
        if (nearZoneDist <= dTrig || distToAsset <= 3000) {
          if (pos.z > zHug) {
            vel.z = -descentRate;
          } else {
            vel.z = 0;
            pos.z = zHug;
          }
        }

        // After passing zone (e.g. range < 1800m in DEMO-1), climb back
        if (distToAsset < 1800) {
          if (pos.z < zCruise) {
            vel.z = descentRate;
          } else {
            vel.z = 0;
            pos.z = zCruise;
          }
        }
        break;
      }

      case 'LOITER': {
        // Circular orbit pattern around initial spawn point
        const orbitRadiusM = 300;
        const center = waypoints.length > 0 ? waypoints[0] : { x: pos.x, y: pos.y, z: pos.z };
        const angle = (context.tick * dtSec * speedMps) / orbitRadiusM;

        pos.x = center.x + orbitRadiusM * Math.cos(angle);
        pos.y = center.y + orbitRadiusM * Math.sin(angle);
        vel.x = -speedMps * Math.sin(angle);
        vel.y = speedMps * Math.cos(angle);
        vel.z = 0;
        return { pos, vel };
      }

      case 'ERRATIC': {
        // Avian Brownian jitter velocity
        if (this.erraticRng) {
          const jitterAngle = this.erraticRng() * Math.PI * 2;
          const jitterSpeed = speedMps * (0.8 + 0.4 * this.erraticRng());
          vel.x = jitterSpeed * Math.cos(jitterAngle);
          vel.y = jitterSpeed * Math.sin(jitterAngle);
          vel.z = (this.erraticRng() - 0.5) * 2;
        }
        break;
      }

      case 'ORBIT_FEINT':
      case 'SWARM_SATURATE':
      default: {
        const target = waypoints.length > 0 ? waypoints[waypoints.length - 1] : { x: 0, y: 0, z: 0 };
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.1) {
          vel.x = (dx / dist) * speedMps;
          vel.y = (dy / dist) * speedMps;
        }
        vel.z = 0;
        break;
      }
    }

    pos.x += vel.x * dtSec;
    pos.y += vel.y * dtSec;
    pos.z += vel.z * dtSec;

    return { pos, vel };
  }
}

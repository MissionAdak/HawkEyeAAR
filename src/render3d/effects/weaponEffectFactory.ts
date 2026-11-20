import * as THREE from 'three';
import type { EffectorId } from '@/sim/types';
import type { EngagementEffect } from './engagementEffectTypes';
import { GunEngagementEffect } from './gunEffect';
import { LaserEngagementEffect } from './laserEffect';
import { SoftKillEngagementEffect } from './softKillEffect';
import { InterceptorEngagementEffect } from './interceptorEffect';
import { MissileEngagementEffect } from './missileEffect';

export function createEngagementEffect(params: {
  id: string;
  seq: number;
  effectorId: EffectorId;
  trackNo: string;
  startTMs: number;
  originPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  killed?: boolean | null;
}): EngagementEffect {
  switch (params.effectorId) {
    case 'GUN':
      return new GunEngagementEffect(params);
    case 'LASER':
      return new LaserEngagementEffect(params);
    case 'RF_SOFTKILL':
      return new SoftKillEngagementEffect(params);
    case 'INTERCEPTOR':
      return new InterceptorEngagementEffect(params);
    case 'MISSILE':
      return new MissileEngagementEffect(params);
    default:
      return new GunEngagementEffect(params);
  }
}

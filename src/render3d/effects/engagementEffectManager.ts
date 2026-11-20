import * as THREE from 'three';
import type { SimEvent, EffectorId } from '@/sim/types';
import type { EngagementEffect, EngagementEffectContext } from './engagementEffectTypes';
import { createEngagementEffect } from './weaponEffectFactory';
import { toThree } from '../coords';

export class EngagementEffectManager {
  public readonly group: THREE.Group;
  private readonly activeEffects: Map<string, EngagementEffect> = new Map();
  private readonly processedEventSeqs: Set<number> = new Set();
  private lastSimMs: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'EngagementEffectsGroup';
  }

  /**
   * Authoritative battery / C2 weapon release origin in Three.js coordinates.
   */
  public getDefaultWeaponOrigin(): THREE.Vector3 {
    return new THREE.Vector3(0, 10, 0);
  }

  /**
   * Synchronizes active engagement animations from simulation event stream.
   * Compatible with both live 20Hz stepping and post-session AAR timeline scrubbing.
   */
  public syncEvents(
    events: SimEvent[],
    currentSimMs: number,
    getTrackPosition?: (trackNo: string) => THREE.Vector3 | null
  ): void {
    // 1. Handle backward scrubbing in AAR replay:
    // If user scrubbed back in time, prune all effects started after currentSimMs
    if (currentSimMs < this.lastSimMs) {
      for (const [id, effect] of this.activeEffects.entries()) {
        if (effect.startTMs > currentSimMs) {
          this.group.remove(effect.group);
          effect.dispose();
          this.activeEffects.delete(id);
          this.processedEventSeqs.delete(effect.seq);
        }
      }
      // Also unmark future processed events
      for (const event of events) {
        if (event.tMs > currentSimMs) {
          this.processedEventSeqs.delete(event.seq);
        }
      }
    }
    this.lastSimMs = currentSimMs;

    // 2. Process incoming events
    for (const event of events) {
      if (event.tMs > currentSimMs) continue;

      if (event.type === 'ENGAGE') {
        if (this.processedEventSeqs.has(event.seq)) continue;
        this.processedEventSeqs.add(event.seq);

        const effectorId = event.payload.effector as EffectorId;
        const trackNo = event.trackNo ?? 'UNKNOWN_TRACK';

        // Authoritative target position from event payload or track provider
        let targetPos: THREE.Vector3;
        if (
          event.payload.targetPos &&
          typeof event.payload.targetPos === 'object' &&
          'x' in (event.payload.targetPos as Record<string, unknown>)
        ) {
          const tp = event.payload.targetPos as { x: number; y: number; z?: number };
          targetPos = toThree(tp.x, tp.y, tp.z ?? 30);
        } else {
          const livePos = getTrackPosition?.(trackNo);
          targetPos = livePos ? livePos.clone() : new THREE.Vector3(0, 50, -500);
        }

        const effectId = `eng_${event.seq}_${trackNo}`;
        const effect = createEngagementEffect({
          id: effectId,
          seq: event.seq,
          effectorId,
          trackNo,
          startTMs: event.tMs,
          originPos: this.getDefaultWeaponOrigin(),
          targetPos,
          killed: typeof event.payload.killed === 'boolean' ? event.payload.killed : null,
        });

        this.activeEffects.set(effectId, effect);
        this.group.add(effect.group);
      } else if (event.type === 'ENGAGE_RESULT') {
        const trackNo = event.trackNo;
        if (!trackNo) continue;
        const killed = Boolean(event.payload.killed);

        // Find matching active effect for this track and resolve outcome
        for (const effect of this.activeEffects.values()) {
          if (effect.trackNo === trackNo && effect.killed === null) {
            effect.resolveOutcome(killed);
          }
        }
      }
    }
  }

  /**
   * Per-frame animation tick driven strictly by simulation clock simMs.
   */
  public update(
    ctx: EngagementEffectContext,
    getTrackPosition?: (trackNo: string) => THREE.Vector3 | null
  ): void {
    const toRemove: string[] = [];

    for (const [id, effect] of this.activeEffects.entries()) {
      const currentTrackPos = getTrackPosition ? getTrackPosition(effect.trackNo) : undefined;
      const isAlive = effect.update(ctx, currentTrackPos ?? undefined);
      if (!isAlive) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      const effect = this.activeEffects.get(id);
      if (effect) {
        this.group.remove(effect.group);
        effect.dispose();
        this.activeEffects.delete(id);
      }
    }
  }

  public getActiveEffectsCount(): number {
    return this.activeEffects.size;
  }

  public reset(): void {
    for (const effect of this.activeEffects.values()) {
      this.group.remove(effect.group);
      effect.dispose();
    }
    this.activeEffects.clear();
    this.processedEventSeqs.clear();
    this.lastSimMs = 0;
  }

  public dispose(): void {
    this.reset();
  }
}

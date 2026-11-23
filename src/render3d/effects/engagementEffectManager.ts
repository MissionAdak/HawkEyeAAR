import * as THREE from 'three';
import type { SimEvent, OperatorEventView, EffectorId } from '@/sim/types';
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
    events: (SimEvent | OperatorEventView)[],
    currentSimMs: number,
    getTrackPosition?: (trackNo: string) => THREE.Vector3 | null
  ): void {
    if (currentSimMs < this.lastSimMs) {
      this.pruneFutureEffects(events, currentSimMs);
    }
    this.lastSimMs = currentSimMs;

    for (const event of events) {
      if (event.tMs > currentSimMs) continue;
      const payload = (event.payload ?? {}) as Record<string, unknown>;

      if (event.type === 'ENGAGE') {
        this.handleEngageEvent(event, payload, getTrackPosition);
      } else if (event.type === 'ENGAGE_RESULT') {
        this.handleEngageResultEvent(event, payload);
      }
    }
  }

  private pruneFutureEffects(
    events: (SimEvent | OperatorEventView)[],
    currentSimMs: number
  ): void {
    for (const [id, effect] of this.activeEffects.entries()) {
      if (effect.startTMs > currentSimMs) {
        this.group.remove(effect.group);
        effect.dispose();
        this.activeEffects.delete(id);
        this.processedEventSeqs.delete(effect.seq);
      }
    }
    for (const event of events) {
      if (event.tMs > currentSimMs) {
        this.processedEventSeqs.delete(event.seq);
      }
    }
  }

  private resolveTargetPosition(
    payload: Record<string, unknown>,
    trackNo: string,
    getTrackPosition?: (trackNo: string) => THREE.Vector3 | null
  ): THREE.Vector3 {
    if (
      payload.targetPos &&
      typeof payload.targetPos === 'object' &&
      'x' in (payload.targetPos as Record<string, unknown>)
    ) {
      const tp = payload.targetPos as { x: number; y: number; z?: number };
      return toThree(tp.x, tp.y, tp.z ?? 30);
    }
    const livePos = getTrackPosition?.(trackNo);
    return livePos ? livePos.clone() : new THREE.Vector3(0, 50, -500);
  }

  private handleEngageEvent(
    event: SimEvent | OperatorEventView,
    payload: Record<string, unknown>,
    getTrackPosition?: (trackNo: string) => THREE.Vector3 | null
  ): void {
    if (this.processedEventSeqs.has(event.seq)) return;
    this.processedEventSeqs.add(event.seq);

    const effectorId = (payload.effector as EffectorId) ?? 'GUN';
    const trackNo = event.trackNo ?? 'UNKNOWN_TRACK';
    const targetPos = this.resolveTargetPosition(payload, trackNo, getTrackPosition);
    const effectId = `eng_${event.seq}_${trackNo}`;

    const effect = createEngagementEffect({
      id: effectId,
      seq: event.seq,
      effectorId,
      trackNo,
      startTMs: event.tMs,
      originPos: this.getDefaultWeaponOrigin(),
      targetPos,
      killed: typeof payload.killed === 'boolean' ? payload.killed : null,
    });

    this.activeEffects.set(effectId, effect);
    this.group.add(effect.group);
  }

  private handleEngageResultEvent(
    event: SimEvent | OperatorEventView,
    payload: Record<string, unknown>
  ): void {
    const trackNo = event.trackNo;
    if (!trackNo) return;
    const killed = Boolean(payload.killed);

    for (const effect of this.activeEffects.values()) {
      if (effect.trackNo === trackNo && effect.killed === null) {
        effect.resolveOutcome(killed);
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

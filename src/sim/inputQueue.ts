/**
 * DRISHTI-CUAS Trainee Input Queue & Quantisation
 *
 * Rule DT-4: Every trainee input is stamped with event.timeStamp, converted to sim time,
 * and quantised to the next tick:
 * applyTick = Math.max(Math.ceil(tRawMs / 50), currentTick + 1)
 * Scored time is tMs = applyTick * 50; tRawMs is stored beside it.
 */

import type { TrackClass } from './taxonomy';
import type { EffectorId, SensorMode } from './types';
import { SimClock } from './clock';

export type TraineeAction =
  | { type: 'DESIGNATE'; trackNo: string; via: 'KEY' | 'CLICK' }
  | { type: 'CLASSIFY'; trackNo: string; label: TrackClass }
  | { type: 'SELECT_EFFECTOR'; effector: EffectorId | null }
  | { type: 'ENGAGE'; trackNo: string; effector: EffectorId }
  | { type: 'ASSESS'; trackNo: string; result: 'KILL' | 'NO_KILL' | 'UNKNOWN' }
  | { type: 'SENSOR_SWITCH'; mode: SensorMode }
  | { type: 'PAUSE' }
  | { type: 'RESUME' };

export interface QueuedInput {
  id: number;
  tRawMs: number;
  applyTick: number;
  action: TraineeAction;
}

export class InputQueue {
  private queue: QueuedInput[] = [];
  private nextId = 1;

  /**
   * Pushes a new action onto the queue.
   * Quantises the action to the next available simulation tick.
   */
  public push(action: TraineeAction, tRawMs: number, currentTick: number): QueuedInput {
    const { applyTick } = SimClock.quantiseInput(tRawMs, currentTick);
    const item: QueuedInput = {
      id: this.nextId++,
      tRawMs,
      applyTick,
      action,
    };
    this.queue.push(item);
    return item;
  }

  /**
   * Drains and returns all inputs scheduled to execute on or before the given tick.
   */
  public drainForTick(tickIndex: number): QueuedInput[] {
    const ready: QueuedInput[] = [];
    const remaining: QueuedInput[] = [];

    for (const item of this.queue) {
      if (item.applyTick <= tickIndex) {
        ready.push(item);
      } else {
        remaining.push(item);
      }
    }

    this.queue = remaining;
    // Sort ready inputs deterministically by applyTick, then insertion order
    ready.sort((a, b) => (a.applyTick === b.applyTick ? a.id - b.id : a.applyTick - b.applyTick));
    return ready;
  }

  public size(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
    this.nextId = 1;
  }
}

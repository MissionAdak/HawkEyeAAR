import type { UserAction } from './types';

/**
 * Quantises an input timestamp in simMs to the appropriate tick.
 * Guarantees:
 * 1. An input arriving before tick n has executed maps to tick n.
 * 2. If tick n has already executed (currentTick >= n), maps to currentTick + 1.
 * 3. Never applies an input retroactively to an already-processed tick.
 */
export function applyTickFor(simMs: number, lastProcessedTick: number, tickMs: number = 50): number {
  const targetTick = Math.ceil(simMs / tickMs);
  return Math.max(lastProcessedTick + 1, targetTick);
}

export class InputQueue {
  private queue: UserAction[] = [];

  public push(action: UserAction): void {
    if (action.action.type === 'FIRE') {
      const trackNo = action.action.trackNo;
      if (this.hasPendingFire(trackNo)) {
        return;
      }
    }
    this.queue.push(action);
  }

  public hasPendingFire(trackNo: string): boolean {
    return this.queue.some(
      (item) => item.action.type === 'FIRE' && item.action.trackNo === trackNo
    );
  }

  public drainForTick(currentTick: number): UserAction[] {
    const ready: UserAction[] = [];
    const remaining: UserAction[] = [];

    for (const item of this.queue) {
      if (item.applyTick <= currentTick) {
        ready.push(item);
      } else {
        remaining.push(item);
      }
    }

    this.queue = remaining;
    return ready;
  }

  public clear(): void {
    this.queue = [];
  }

  public getPendingCount(): number {
    return this.queue.length;
  }
}

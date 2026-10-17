import type { UserAction } from './types';

export class InputQueue {
  private queue: UserAction[] = [];

  public push(action: UserAction): void {
    this.queue.push(action);
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

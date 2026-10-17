import { db, type StoredSimEvent } from './dexie';
import type { SimEvent } from '@/sim/types';

export class EventRecorder {
  private sessionUid: string;
  private buffer: StoredSimEvent[] = [];
  private flushIntervalId: number | null = null;
  private isFlushing: boolean = false;

  constructor(sessionUid: string) {
    this.sessionUid = sessionUid;
  }

  public start(): void {
    if (this.flushIntervalId === null && typeof window !== 'undefined') {
      this.flushIntervalId = window.setInterval(() => {
        this.flush();
      }, 1000);
    }
  }

  public record(event: SimEvent): void {
    this.buffer.push({
      ...event,
      sessionUid: this.sessionUid,
    });

    if (this.buffer.length >= 200 || event.type === 'SESSION_END') {
      this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.isFlushing = true;
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await db.transaction('rw', db.events, async () => {
        await db.events.bulkAdd(batch);
      });
    } catch (err) {
      console.error('[Recorder Error] Failed to bulkAdd events:', err);
      // Re-queue items that failed to persist
      this.buffer.unshift(...batch);
    } finally {
      this.isFlushing = false;
    }
  }

  public async stop(): Promise<void> {
    if (this.flushIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    await this.flush();
  }
}

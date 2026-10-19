
import { db, type StoredSimEvent } from './dexie';
import type { SimEvent } from '@/sim/types';

export function createSessionUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `session-${Date.now()}`;
}

export class EventRecorder {
  private readonly sessionUid: string;
  private buffer: StoredSimEvent[] = [];
  private flushIntervalId: number | null = null;
  private flushPromise: Promise<void> | null = null;

  constructor(sessionUid: string = createSessionUid()) {
    this.sessionUid = sessionUid;
  }

  public start(): void {
    if (this.flushIntervalId !== null || typeof window === 'undefined') {
      return;
    }

    this.flushIntervalId = window.setInterval(() => {
      void this.flush().catch(() => {
        // The failed batch remains buffered for a later retry.
      });
    }, 1000);
  }

  public record(event: SimEvent): void {
    this.buffer.push({
      ...event,
      sessionUid: this.sessionUid,
    });

    if (this.buffer.length >= 200 || event.type === 'SESSION_END') {
      void this.flush().catch(() => {
        // Keep failed events buffered; retry on the next flush.
      });
    }
  }

  public async flush(): Promise<void> {
    // Reuse an in-progress flush instead of starting a competing write.
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.flushPendingEvents();

    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  private async flushPendingEvents(): Promise<void> {
    while (this.buffer.length > 0) {
      const batch = this.buffer.splice(0, this.buffer.length);

      try {
        await db.transaction('rw', db.events, async () => {
          await db.events.bulkAdd(batch);
        });
      } catch (error) {
        // Restore the failed batch before events recorded during the write.
        this.buffer = [...batch, ...this.buffer];

        console.error(
          '[Recorder Error] Failed to persist events; batch retained:',
          error
        );

        throw error;
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.flushIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }

    // Wait for any existing write and drain all remaining buffered events.
    await this.flush();
  }
}

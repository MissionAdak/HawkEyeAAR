
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

// Fallback in-memory storage for test/Node environments where indexedDB is not available
const inMemoryFallbackEvents: StoredSimEvent[] = [];

export type MockPersistenceFailureMode = 'NONE' | 'EVENTS' | 'SESSION' | 'BOTH';
let mockPersistenceFailureMode: MockPersistenceFailureMode = 'NONE';

export function setMockPersistenceFailureMode(mode: MockPersistenceFailureMode): void {
  mockPersistenceFailureMode = mode;
}

export function getMockPersistenceFailureMode(): MockPersistenceFailureMode {
  return mockPersistenceFailureMode;
}

export class EventRecorder {
  private readonly sessionUid: string;
  private readonly startedAt: number;
  private buffer: StoredSimEvent[] = [];
  private flushIntervalId: number | null = null;
  private flushPromise: Promise<void> | null = null;

  constructor(sessionUid: string = createSessionUid(), startedAt?: number) {
    this.sessionUid = sessionUid;
    this.startedAt = startedAt ?? Date.now();
  }

  public getSessionUid(): string {
    return this.sessionUid;
  }

  public getStartedAt(): number {
    return this.startedAt;
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
        if (
          mockPersistenceFailureMode === 'EVENTS' ||
          mockPersistenceFailureMode === 'BOTH'
        ) {
          throw new Error('Simulated EventRecorder persistence failure');
        }

        if (typeof indexedDB === 'undefined') {
          for (const item of batch) {
            if (
              !inMemoryFallbackEvents.some(
                (e) => e.sessionUid === item.sessionUid && e.seq === item.seq
              )
            ) {
              inMemoryFallbackEvents.push(item);
            }
          }
        } else {
          // eslint-disable-next-line no-await-in-loop
          await db.transaction('rw', db.events, async () => {
            const existingSeqs = new Set(
              (
                await db.events
                  .where('sessionUid')
                  .equals(this.sessionUid)
                  .toArray()
              ).map((e) => e.seq)
            );
            const toAdd = batch.filter((e) => !existingSeqs.has(e.seq));
            if (toAdd.length > 0) {
              await db.events.bulkAdd(toAdd);
            }
          });
        }
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

export async function getRecordedEventsForSession(sessionUid: string): Promise<StoredSimEvent[]> {
  if (typeof indexedDB === 'undefined') {
    return inMemoryFallbackEvents
      .filter((e) => e.sessionUid === sessionUid)
      .sort((a, b) => a.seq - b.seq);
  }
  return await db.events.where('sessionUid').equals(sessionUid).sortBy('seq');
}

export function clearFallbackEventsForTest(): void {
  inMemoryFallbackEvents.length = 0;
}

export function addFallbackEventsForTest(events: StoredSimEvent[]): void {
  inMemoryFallbackEvents.push(...events);
}

export function setMockPersistenceFailureForTest(fail: boolean): void {
  mockPersistenceFailureMode = fail ? 'BOTH' : 'NONE';
}


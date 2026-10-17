/**
 * DRISHTI-CUAS Batched IndexedDB Event Recorder
 *
 * Rules: DT-7, DT-8, ZS-1
 * Buffers SimEvents and writes in transactions of up to 200 via bulkAdd.
 * Flushes periodically (every 1 s) and on session completion.
 */

import { db, type EventRecord } from './dexie';
import type { SimEvent } from '../sim/types';

export class EventRecorder {
  private sessionUid: string;
  private buffer: EventRecord[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private flushIntervalMs = 1000;
  private maxBatchSize = 200;

  constructor(sessionUid: string, flushIntervalMs = 1000) {
    this.sessionUid = sessionUid;
    this.flushIntervalMs = flushIntervalMs;
  }

  /**
   * Starts periodic background flushing.
   */
  public start(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Buffers a simulation event.
   */
  public record(event: SimEvent): void {
    const record: EventRecord = {
      sessionUid: this.sessionUid,
      seq: event.seq,
      tMs: event.tMs,
      tRawMs: event.tRawMs,
      type: event.type,
      trackNo: event.trackNo,
      entityId: event.entityId,
      payload: event.payload,
    };
    this.buffer.push(record);

    if (this.buffer.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  /**
   * Flushes all buffered events to Dexie in transactional batches of at most 200.
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushing) return;
    this.isFlushing = true;

    const toWrite = this.buffer.splice(0, this.buffer.length);
    try {
      for (let i = 0; i < toWrite.length; i += this.maxBatchSize) {
        const chunk = toWrite.slice(i, i + this.maxBatchSize);
        await db.transaction('rw', db.events, async () => {
          await db.events.bulkAdd(chunk);
        });
      }
    } catch (err) {
      // Re-insert unsaved events at the front of buffer
      this.buffer.unshift(...toWrite);
      console.error('[EventRecorder] Error persisting events to IndexedDB:', err);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Stops the background timer and performs a final synchronous flush.
   */
  public async stop(): Promise<void> {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  public getBufferedCount(): number {
    return this.buffer.length;
  }
}

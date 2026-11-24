
import { db, type StoredSimEvent } from './dexie';
import { getRecordedEventsForSession, addFallbackEventsForTest } from './recorder';
import type { SimEvent, SimEventType } from '@/sim/types';
import {
  AAR_FORMAT as FORMAT,
  AAR_VERSION as VERSION,
  AAR_EVENT_TYPES as EVENT_TYPES,
  type AARTransferPayload,
  stableJson,
  sha256,
  csvCell,
} from '@/sim/serialization';

export { stableJson, sha256, type AARTransferPayload };

const IMPORT_BATCH_SIZE = 500;

export interface AARImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
}


function eventKey(event: SimEvent): string {
  return String(event.seq);
}


function sameEvent(a: SimEvent, b: SimEvent): boolean {
  const canonical = (event: SimEvent) => ({
    seq: event.seq,
    tMs: event.tMs,
    ...(event.tRawMs === undefined ? {} : { tRawMs: event.tRawMs }),
    type: event.type,
    ...(event.trackNo === undefined ? {} : { trackNo: event.trackNo }),
    ...(event.entityId === undefined ? {} : { entityId: event.entityId }),
    payload: event.payload,
  });

  return stableJson(canonical(a)) === stableJson(canonical(b));
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidEvent(value: unknown): value is SimEvent {
  if (!isRecord(value)) return false;

  return (
    Number.isSafeInteger(value.seq) &&
    (value.seq as number) >= 0 &&
    Number.isFinite(value.tMs) &&
    (value.tMs as number) >= 0 &&
    (value.tRawMs === undefined || (
      typeof value.tRawMs === 'number' && Number.isFinite(value.tRawMs)
    )) &&
    typeof value.type === 'string' &&
    EVENT_TYPES.has(value.type as SimEventType) &&
    (value.trackNo === undefined || typeof value.trackNo === 'string') &&
    (value.entityId === undefined || typeof value.entityId === 'string') &&
    isRecord(value.payload)
  );
}

function downloadFile(
  contents: string,
  filename: string,
  mimeType: string,
): void {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return;
  }
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function createSessionJsonPayload(
  sessionUid: string,
): Promise<AARTransferPayload> {
  const stored = await getRecordedEventsForSession(sessionUid);

  const events: SimEvent[] = stored.map((event) => ({
    seq: event.seq,
    tMs: event.tMs,
    ...(event.tRawMs === undefined ? {} : { tRawMs: event.tRawMs }),
    type: event.type,
    ...(event.trackNo === undefined ? {} : { trackNo: event.trackNo }),
    ...(event.entityId === undefined ? {} : { entityId: event.entityId }),
    payload: event.payload,
  }));

  const checksum = await sha256(stableJson({ sessionUid, events }));

  return {
    format: FORMAT,
    version: VERSION,
    sessionUid,
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    events,
    sha256: checksum,
  };
}

export async function exportSessionJson(
  sessionUid: string,
): Promise<void> {
  const transfer = await createSessionJsonPayload(sessionUid);

  downloadFile(
    JSON.stringify(transfer, null, 2),
    `aar-${sessionUid}.json`,
    'application/json;charset=utf-8',
  );
}

export async function createSessionCsvString(
  sessionUid: string,
): Promise<string> {
  const events = await getRecordedEventsForSession(sessionUid);

  const headers = [
    'sessionUid', 'seq', 'tMs', 'tRawMs', 'type',
    'trackNo', 'entityId', 'payload',
  ];

  const rows = events.map((event) => [
    event.sessionUid,
    event.seq,
    event.tMs,
    event.tRawMs,
    event.type,
    event.trackNo,
    event.entityId,
    stableJson(event.payload),
  ]);

  return [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\r\n');
}

export async function exportSessionCsv(
  sessionUid: string,
): Promise<void> {
  const csv = await createSessionCsvString(sessionUid);

  downloadFile(
    `\uFEFF${csv}`,
    `aar-${sessionUid}.csv`,
    'text/csv;charset=utf-8',
  );
}

interface ValidatedAarEnvelope {
  format: string;
  version: number;
  events: unknown[];
  eventCount: number;
  sha256: string;
  sessionUid: string;
}

function validateAarEnvelope(raw: unknown): ValidatedAarEnvelope {
  if (!isRecord(raw)) {
    throw new Error('Invalid AAR export format or metadata.');
  }
  if (raw.format !== FORMAT || raw.version !== VERSION) {
    throw new Error('Invalid AAR export format or metadata.');
  }
  if (!Array.isArray(raw.events)) {
    throw new TypeError('Invalid AAR export format or metadata.');
  }
  if (!Number.isSafeInteger(raw.eventCount) || raw.eventCount !== raw.events.length) {
    throw new Error('Invalid AAR export format or metadata.');
  }
  if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) {
    throw new Error('Invalid AAR export format or metadata.');
  }
  if (typeof raw.sessionUid !== 'string' || raw.sessionUid.length === 0) {
    throw new Error('Missing sessionUid in export metadata.');
  }
  return raw as unknown as ValidatedAarEnvelope;
}

function assertNoDuplicateSequenceNumbers(importedEvents: SimEvent[]): void {
  const uniqueKeys = new Set<string>();
  for (const event of importedEvents) {
    const key = eventKey(event);
    if (uniqueKeys.has(key)) {
      throw new Error('The export contains duplicate event sequence numbers.');
    }
    uniqueKeys.add(key);
  }
}

function mergeImportedEvents(
  importedEvents: SimEvent[],
  existingBySeq: Map<string, StoredSimEvent>,
  sessionUid: string
): { pending: StoredSimEvent[]; duplicates: number } {
  const pending: StoredSimEvent[] = [];
  let duplicates = 0;

  for (const event of importedEvents) {
    const key = eventKey(event);
    const existingEvent = existingBySeq.get(key);

    if (existingEvent) {
      if (!sameEvent(existingEvent, event)) {
        throw new Error(
          `Conflicting data for event sequence ${event.seq}. Nothing was imported.`,
        );
      }
      duplicates++;
      continue;
    }

    const stored: StoredSimEvent = {
      ...event,
      sessionUid,
    };
    existingBySeq.set(key, stored);
    pending.push(stored);
  }

  return { pending, duplicates };
}

export async function importSessionJson(
  file: File,
): Promise<AARImportResult> {
  const raw = JSON.parse(await file.text()) as unknown;
  const envelope = validateAarEnvelope(raw);
  const events = envelope.events;

  // Verify the checksum before writing anything.
  const actualChecksum = await sha256(
    stableJson({ sessionUid: envelope.sessionUid, events }),
  );

  if (actualChecksum !== envelope.sha256) {
    throw new Error('SHA-256 verification failed. The file may be corrupted or modified.');
  }

  if (events.some((event) => !isValidEvent(event))) {
    throw new Error('The file contains invalid simulation events. Nothing was imported.');
  }

  const importedEvents = events as SimEvent[];
  assertNoDuplicateSequenceNumbers(importedEvents);

  const existing = typeof indexedDB === 'undefined'
    ? await getRecordedEventsForSession(envelope.sessionUid)
    : await db.events
        .where('sessionUid')
        .equals(envelope.sessionUid)
        .toArray();

  const existingBySeq = new Map(
    existing.map((event) => [eventKey(event), event]),
  );

  const { pending, duplicates } = mergeImportedEvents(
    importedEvents,
    existingBySeq,
    envelope.sessionUid
  );

  // Validate conflicts before writing. Use a transaction so the import
  // is atomic if a database write fails.
  if (typeof indexedDB === 'undefined') {
    addFallbackEventsForTest(pending);
  } else {
    const batches: StoredSimEvent[][] = [];
    for (
      let index = 0;
      index < pending.length;
      index += IMPORT_BATCH_SIZE
    ) {
      batches.push(pending.slice(index, index + IMPORT_BATCH_SIZE));
    }
    await db.transaction('rw', db.events, async () => {
      await Promise.all(batches.map((batch) => db.events.bulkAdd(batch)));
    });
  }
return {
  imported: pending.length,
  duplicates,
  invalid: 0,
};
}

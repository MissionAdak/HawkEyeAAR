
import { db, type StoredSimEvent } from './dexie';
import type { SimEvent, SimEventType } from '@/sim/types';

const FORMAT = 'drishti-aar-events';
const VERSION = 1;
const IMPORT_BATCH_SIZE = 500;

const EVENT_TYPES = new Set<SimEventType>([
  'SIM_START', 'SPAWN', 'DETECT', 'TRACK_INIT', 'MASKED',
  'REACQUIRE', 'DESIGNATE', 'SENSOR_SWITCH', 'CLASSIFY',
  'ENGAGE', 'ENGAGE_RESULT', 'ASSESS', 'CHAOS_ON', 'CHAOS_OFF',
  'TRIGGER', 'ROE_VIOLATION', 'FLAG', 'LEAK', 'SNAPSHOT',
  'SESSION_PAUSE', 'SESSION_RESUME', 'SESSION_END',
]);

export interface AARTransferPayload {
  format: typeof FORMAT;
  version: typeof VERSION;
  sessionUid: string;
  exportedAt: string;
  eventCount: number;
  events: SimEvent[];
  sha256: string;
}

export interface AARImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();

  return `{${keys.map(
    (key) => `${JSON.stringify(key)}:${stableJson(object[key])}`,
  ).join(',')}}`;
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'SHA-256 requires Web Crypto. Use HTTPS or localhost in a supported browser.',
    );
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSessionJson(
  sessionUid: string,
): Promise<void> {
  const stored = await db.events
    .where('sessionUid')
    .equals(sessionUid)
    .sortBy('seq');

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

  const transfer: AARTransferPayload = {
    format: FORMAT,
    version: VERSION,
    sessionUid,
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    events,
    sha256: checksum,
  };

  downloadFile(
    JSON.stringify(transfer, null, 2),
    `aar-${sessionUid}.json`,
    'application/json;charset=utf-8',
  );
}

function csvCell(value: unknown): string {
  let text = value == null ? '' :
    typeof value === 'string' ? value : JSON.stringify(value);

  // Prevent spreadsheet formula execution for untrusted imported strings.
  if (/^[\t\r ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportSessionCsv(
  sessionUid: string,
): Promise<void> {
  const events = await db.events
    .where('sessionUid')
    .equals(sessionUid)
    .sortBy('seq');

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

  const csv = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\r\n');

  downloadFile(
    `\uFEFF${csv}`,
    `aar-${sessionUid}.csv`,
    'text/csv;charset=utf-8',
  );
}

export async function importSessionJson(
  file: File,
): Promise<AARImportResult> {
  const raw = JSON.parse(await file.text()) as unknown;

  if (!isRecord(raw) ||
      raw.format !== FORMAT ||
      raw.version !== VERSION ||
      !Array.isArray(raw.events) ||
      !Number.isSafeInteger(raw.eventCount) ||
      raw.eventCount !== raw.events.length ||
      typeof raw.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(raw.sha256)) {
    throw new Error('Invalid AAR export format or metadata.');
  }

  const events = raw.events;

  // Verify the checksum before writing anything.
  const actualChecksum = await sha256(
  stableJson({ sessionUid: raw.sessionUid, events }),
);

  if (actualChecksum !== raw.sha256) {
    throw new Error('SHA-256 verification failed. The file may be corrupted or modified.');
  }

  if (events.some((event) => !isValidEvent(event))) {
    throw new Error('The file contains invalid simulation events. Nothing was imported.');
  }



  // Session identity is stored in the envelope in newer exports.
  // Older or empty exports cannot safely be imported without it.
  if (typeof raw.sessionUid !== 'string' || raw.sessionUid.length === 0) {
    throw new Error('Missing sessionUid in export metadata.');
  }

  const importedEvents = events as SimEvent[];

  
  const uniqueKeys = new Set<string>();

  for (const event of importedEvents) {
    const key = eventKey(event);

    if (uniqueKeys.has(key)) {
      throw new Error(
        'The export contains duplicate event sequence numbers.',
      );
    }

    uniqueKeys.add(key);
  }

  const existing = await db.events
    .where('sessionUid')
    .equals(raw.sessionUid)
    .toArray();

  const existingBySeq = new Map(
    existing.map((event) => [eventKey(event), event]),
  );

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

    existingBySeq.set(key, {
      ...event,
      sessionUid: raw.sessionUid,
    });

    pending.push({
      ...event,
      sessionUid: raw.sessionUid,
    });
  }

  // Validate conflicts before writing. Use a transaction so the import
  // is atomic if a database write fails.
  await db.transaction('rw', db.events, async () => {
    for (
      let index = 0;
      index < pending.length;
      index += IMPORT_BATCH_SIZE
    ) {
      await db.events.bulkAdd(
        pending.slice(index, index + IMPORT_BATCH_SIZE),
      );
    }
  });
return {
  imported: pending.length,
  duplicates,
  invalid: 0,
};
}

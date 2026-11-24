import type { SimEvent, SimEventType } from '@/sim/types';

export const AAR_FORMAT = 'drishti-aar-events';
export const AAR_VERSION = 1;

export const AAR_EVENT_TYPES = new Set<SimEventType>([
  'SIM_START', 'SPAWN', 'DETECT', 'TRACK_INIT', 'MASKED',
  'REACQUIRE', 'DESIGNATE', 'SENSOR_SWITCH', 'CLASSIFY',
  'ENGAGE', 'ENGAGE_RESULT', 'ASSESS', 'CHAOS_ON', 'CHAOS_OFF',
  'TRIGGER', 'ROE_VIOLATION', 'FLAG', 'LEAK', 'SNAPSHOT',
  'SESSION_PAUSE', 'SESSION_RESUME', 'SESSION_END',
]);

export interface AARTransferPayload {
  format: typeof AAR_FORMAT;
  version: typeof AAR_VERSION;
  sessionUid: string;
  exportedAt: string;
  eventCount: number;
  events: SimEvent[];
  sha256: string;
}

/**
 * Deterministically serializes any JavaScript value to JSON with recursively
 * sorted object keys. This guarantees bit-for-bit identical JSON across runs.
 */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort((a, b) => a.localeCompare(b));

  return `{${keys.map(
    (key) => `${JSON.stringify(key)}:${stableJson(object[key])}`,
  ).join(',')}}`;
}

/**
 * Asynchronously computes a SHA-256 hex digest using Web Crypto.
 */
export async function sha256(value: string): Promise<string> {
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

/**
 * Escapes a cell for CSV formatting, escaping inner quotes and mitigating CSV injection.
 */
export function csvCell(value: unknown): string {
  let text = '';
  if (value != null) {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  }

  // Prevent spreadsheet formula execution for untrusted imported strings.
  if (/^[\t\r ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

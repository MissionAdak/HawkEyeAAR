/**
 * Air-gapped I/O for AAR sessions.
 * Implements client-side JSON/CSV export and import with Web Crypto SHA-256 checksums.
 * (Rules.md ZS-1, ARCHITECTURE.md 4.1).
 */
export {
  exportSessionJson,
  exportSessionCsv,
  importSessionJson,
  type AARTransferPayload,
  type AARImportResult,
} from './aarTransfer';

import { parseProjectText, type ProjectSnapshot, serializeProject } from './project';

export type SessionExport = {
  available: boolean;
  captionLabel: string;
  createdAt: number;
  durationLabel: string;
  filename: string;
  id: string;
  presetLabel: string;
  profileLabel: string;
  projectKey: string;
  projectSnapshot: ProjectSnapshot | null;
  size: number;
  sourceName: string | null;
  url: string | null;
};

export const exportReceiptStorageKey = 'freecut.exportReceipts.v1';
export const maxExportReceipts = 5;

type StoredExportReceipt = Omit<SessionExport, 'available' | 'url'>;

export function readStoredExportReceipts(): SessionExport[] {
  try {
    const raw = window.localStorage.getItem(exportReceiptStorageKey);
    return raw ? sanitizeExportReceipts(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeStoredExportReceipts(exports: SessionExport[]) {
  try {
    const receipts = exports.slice(0, maxExportReceipts).map(toStoredReceipt);
    window.localStorage.setItem(exportReceiptStorageKey, JSON.stringify({ version: 1, items: receipts }));
  } catch {
    // Export receipts are a convenience layer; rendering must not depend on localStorage.
  }
}

export function clearStoredExportReceipts() {
  try {
    window.localStorage.removeItem(exportReceiptStorageKey);
  } catch {
    // localStorage may be unavailable in hardened browser contexts.
  }
}

export function sanitizeExportReceipts(input: unknown): SessionExport[] {
  const candidates = Array.isArray(input)
    ? input
    : typeof input === 'object' && input && Array.isArray((input as { items?: unknown }).items)
      ? (input as { items: unknown[] }).items
      : [];

  const seen = new Set<string>();
  const receipts: SessionExport[] = [];

  for (const candidate of candidates) {
    const receipt = sanitizeExportReceipt(candidate);
    if (!receipt || seen.has(receipt.id)) continue;
    seen.add(receipt.id);
    receipts.push(receipt);
    if (receipts.length >= maxExportReceipts) break;
  }

  return receipts;
}

function sanitizeExportReceipt(input: unknown): SessionExport | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<StoredExportReceipt>;
  const id = readString(candidate.id);
  const filename = readString(candidate.filename);
  if (!id || !filename) return null;

  return {
    available: false,
    captionLabel: readString(candidate.captionLabel) || 'Clean',
    createdAt: readNumber(candidate.createdAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    durationLabel: readString(candidate.durationLabel) || '0:00',
    filename,
    id,
    presetLabel: readString(candidate.presetLabel) || 'Frame',
    profileLabel: readString(candidate.profileLabel) || 'Balanced',
    projectKey: readString(candidate.projectKey) || '',
    projectSnapshot: sanitizeProjectSnapshot(candidate.projectSnapshot),
    size: readNumber(candidate.size, 0, 0, Number.MAX_SAFE_INTEGER),
    sourceName: readString(candidate.sourceName) || null,
    url: null
  };
}

function toStoredReceipt(item: SessionExport): StoredExportReceipt {
  return {
    captionLabel: item.captionLabel,
    createdAt: item.createdAt,
    durationLabel: item.durationLabel,
    filename: item.filename,
    id: item.id,
    presetLabel: item.presetLabel,
    profileLabel: item.profileLabel,
    projectKey: item.projectKey,
    projectSnapshot: item.projectSnapshot ? parseProjectText(serializeProject(item.projectSnapshot)) : null,
    size: item.size,
    sourceName: item.sourceName
  };
}

function sanitizeProjectSnapshot(value: unknown): ProjectSnapshot | null {
  if (!value) return null;

  try {
    return parseProjectText(JSON.stringify(value));
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

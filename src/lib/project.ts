import { CaptionCue, normalizeCaptions } from './captions';
import { defaultExportProfile, exportProfileFromId, ExportProfileId } from './exportProfiles';
import { AspectPreset, aspectPresets } from './presets';

export const projectStorageKey = 'freecut.project.v1';

export type ProjectSnapshot = {
  version: 1;
  savedAt: string;
  mediaName: string | null;
  presetId: string;
  exportProfileId: ExportProfileId;
  trimStart: number;
  trimEnd: number;
  overlayText: string;
  overlayX: number;
  overlayY: number;
  overlaySize: number;
  cropX: number;
  cropY: number;
  captions: CaptionCue[];
};

export type ProjectDraft = Omit<ProjectSnapshot, 'version' | 'savedAt'>;

export function createProjectSnapshot(draft: ProjectDraft): ProjectSnapshot {
  return sanitizeProjectSnapshot({
    ...draft,
    version: 1,
    savedAt: new Date().toISOString()
  });
}

export function serializeProject(snapshot: ProjectSnapshot) {
  return JSON.stringify(snapshot, null, 2);
}

export function parseProjectText(source: string): ProjectSnapshot {
  return sanitizeProjectSnapshot(JSON.parse(source) as Partial<ProjectSnapshot>);
}

export function readStoredProject(): ProjectSnapshot | null {
  const raw = window.localStorage.getItem(projectStorageKey);
  if (!raw) return null;

  try {
    return parseProjectText(raw);
  } catch {
    window.localStorage.removeItem(projectStorageKey);
    return null;
  }
}

export function writeStoredProject(snapshot: ProjectSnapshot) {
  window.localStorage.setItem(projectStorageKey, serializeProject(snapshot));
}

export function clearStoredProject() {
  window.localStorage.removeItem(projectStorageKey);
}

export function presetFromProject(snapshot: ProjectSnapshot): AspectPreset {
  return aspectPresets.find((item) => item.id === snapshot.presetId) ?? aspectPresets[0];
}

function sanitizeProjectSnapshot(input: Partial<ProjectSnapshot>): ProjectSnapshot {
  const fallbackPresetId = aspectPresets[0]?.id ?? 'wide';
  const presetId = typeof input.presetId === 'string' && aspectPresets.some((preset) => preset.id === input.presetId)
    ? input.presetId
    : fallbackPresetId;
  const trimStart = readNumber(input.trimStart, 0, 0, Number.MAX_SAFE_INTEGER);
  const trimEnd = Math.max(trimStart, readNumber(input.trimEnd, trimStart, trimStart, Number.MAX_SAFE_INTEGER));

  return {
    version: 1,
    savedAt: typeof input.savedAt === 'string' ? input.savedAt : new Date().toISOString(),
    mediaName: typeof input.mediaName === 'string' && input.mediaName.trim() ? input.mediaName.trim() : null,
    presetId,
    exportProfileId: exportProfileFromId(input.exportProfileId ?? defaultExportProfile.id).id,
    trimStart,
    trimEnd,
    overlayText: typeof input.overlayText === 'string' ? input.overlayText : '',
    overlayX: readNumber(input.overlayX, 50, 0, 100),
    overlayY: readNumber(input.overlayY, 72, 0, 100),
    overlaySize: readNumber(input.overlaySize, 4.5, 1, 12),
    cropX: readNumber(input.cropX, 50, 0, 100),
    cropY: readNumber(input.cropY, 50, 0, 100),
    captions: normalizeCaptions(Array.isArray(input.captions) ? input.captions : [], trimEnd || 0)
  };
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

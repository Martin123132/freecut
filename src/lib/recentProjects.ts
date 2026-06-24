import { formatTime } from './format';
import { parseProjectText, type ProjectSnapshot, serializeProject } from './project';

export const recentProjectsStorageKey = 'freecut.recentProjects.v1';
export const maxRecentProjects = 5;

export type RecentProjectEntry = {
  id: string;
  snapshot: ProjectSnapshot;
  updatedAt: string;
};

export function projectRecentId(snapshot: ProjectSnapshot) {
  const mediaName = snapshot.mediaName?.trim().toLowerCase() || 'untitled';
  return `${mediaName}:${snapshot.presetId}`;
}

export function createRecentProjectEntry(snapshot: ProjectSnapshot): RecentProjectEntry {
  const safeSnapshot = parseProjectText(serializeProject(snapshot));
  return {
    id: projectRecentId(safeSnapshot),
    snapshot: safeSnapshot,
    updatedAt: safeSnapshot.savedAt
  };
}

export function readRecentProjects(): RecentProjectEntry[] {
  try {
    const raw = window.localStorage.getItem(recentProjectsStorageKey);
    return raw ? sanitizeRecentProjects(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeRecentProject(snapshot: ProjectSnapshot) {
  const entry = createRecentProjectEntry(snapshot);
  const next = [entry, ...readRecentProjects().filter((item) => item.id !== entry.id)].slice(0, maxRecentProjects);

  try {
    window.localStorage.setItem(recentProjectsStorageKey, JSON.stringify({ version: 1, items: next }));
  } catch {
    // Recent projects are optional browser convenience state.
  }

  return next;
}

export function clearRecentProjects() {
  try {
    window.localStorage.removeItem(recentProjectsStorageKey);
  } catch {
    // localStorage may be unavailable in hardened browser contexts.
  }
}

export function sanitizeRecentProjects(input: unknown): RecentProjectEntry[] {
  const candidates = Array.isArray(input)
    ? input
    : typeof input === 'object' && input && Array.isArray((input as { items?: unknown }).items)
      ? (input as { items: unknown[] }).items
      : [];

  const seen = new Set<string>();
  const projects: RecentProjectEntry[] = [];

  for (const candidate of candidates) {
    const entry = sanitizeRecentProject(candidate);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    projects.push(entry);
    if (projects.length >= maxRecentProjects) break;
  }

  return projects;
}

export function recentProjectDurationLabel(snapshot: ProjectSnapshot) {
  return formatTime(Math.max(0, snapshot.trimEnd - snapshot.trimStart));
}

function sanitizeRecentProject(input: unknown): RecentProjectEntry | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as { id?: unknown; snapshot?: unknown; updatedAt?: unknown };

  try {
    const snapshot = parseProjectText(JSON.stringify(candidate.snapshot ?? candidate));
    const id = projectRecentId(snapshot);
    const updatedAt = typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim() ? candidate.updatedAt.trim() : snapshot.savedAt;
    return { id, snapshot, updatedAt };
  } catch {
    return null;
  }
}

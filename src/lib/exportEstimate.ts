import { CaptionStyle } from './captionStyles';
import { ExportProfile, ExportProfileId } from './exportProfiles';
import { bytesToSize, formatTime } from './format';
import { AspectPreset } from './presets';

export type ExportReadinessWarning = {
  id: string;
  label: string;
  tone: 'blocked' | 'info' | 'warn';
};

export type ExportReadinessSummary = {
  captionLabel: string;
  cropFocusLabel: string;
  durationLabel: string;
  estimatedSizeLabel: string;
  frameLabel: string;
  qualityLabel: string;
  warnings: ExportReadinessWarning[];
};

const referencePixels = 1920 * 1080;
const profileMegabitsPerSecond: Record<ExportProfileId, number> = {
  quick: 5.5,
  balanced: 8.5,
  master: 14
};

type BuildExportReadinessOptions = {
  captionCount: number;
  captionStyle: CaptionStyle;
  cropX: number;
  cropY: number;
  durationSeconds: number;
  hasOverlayText: boolean;
  preset: AspectPreset;
  profile: ExportProfile;
  sourceLoaded: boolean;
};

export function buildExportReadiness({
  captionCount,
  captionStyle,
  cropX,
  cropY,
  durationSeconds,
  hasOverlayText,
  preset,
  profile,
  sourceLoaded
}: BuildExportReadinessOptions): ExportReadinessSummary {
  const estimatedBytes = estimateExportBytes({ durationSeconds, preset, profile });
  const warnings: ExportReadinessWarning[] = [];

  if (!sourceLoaded) {
    warnings.push({ id: 'source', label: 'Import a source clip before rendering.', tone: 'blocked' });
  }

  if (sourceLoaded && durationSeconds <= 0) {
    warnings.push({ id: 'range', label: 'Set a non-empty trim range.', tone: 'blocked' });
  }

  if (durationSeconds > 90) {
    warnings.push({ id: 'long-render', label: 'Long export, expect a slower render.', tone: 'warn' });
  }

  if (estimatedBytes > 300 * 1024 * 1024) {
    warnings.push({ id: 'large-file', label: 'Estimated file is large for quick sharing.', tone: 'warn' });
  }

  if (cropX <= 8 || cropX >= 92 || cropY <= 8 || cropY >= 92) {
    warnings.push({ id: 'edge-crop', label: 'Crop focus is near the frame edge.', tone: 'info' });
  }

  return {
    captionLabel: captionCount ? `${captionCount} cue${captionCount === 1 ? '' : 's'} - ${captionStyle.label}` : hasOverlayText ? `Text - ${captionStyle.label}` : `Clean - ${captionStyle.label}`,
    cropFocusLabel: `${Math.round(cropX)}% / ${Math.round(cropY)}%`,
    durationLabel: durationSeconds > 0 ? formatTime(durationSeconds) : 'No range',
    estimatedSizeLabel: estimatedBytes ? `~${bytesToSize(estimatedBytes)}` : 'Waiting',
    frameLabel: `${preset.width} x ${preset.height}`,
    qualityLabel: profile.label,
    warnings
  };
}

export function estimateExportBytes({
  durationSeconds,
  preset,
  profile
}: {
  durationSeconds: number;
  preset: AspectPreset;
  profile: ExportProfile;
}) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;

  const pixelScale = Math.min(1.7, Math.max(0.45, (preset.width * preset.height) / referencePixels));
  const megabitsPerSecond = profileMegabitsPerSecond[profile.id] * pixelScale;
  return Math.round((durationSeconds * megabitsPerSecond * 1_000_000) / 8);
}

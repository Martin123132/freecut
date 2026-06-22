export type CaptionCue = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export function createCaptionCue(start = 0, end = 2, text = 'New caption'): CaptionCue {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    start,
    end,
    text
  };
}

export function normalizeCaptions(captions: CaptionCue[], duration: number) {
  return captions
    .map((caption) => ({
      ...caption,
      start: clampCaptionTime(caption.start, duration),
      end: clampCaptionTime(caption.end, duration),
      text: caption.text.trim()
    }))
    .filter((caption) => caption.text && caption.end > caption.start)
    .sort((a, b) => a.start - b.start);
}

export function parseCaptionFile(source: string): CaptionCue[] {
  const cleaned = source.replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
  if (!cleaned) return [];

  return cleaned
    .split(/\n{2,}/)
    .flatMap((block, index) => parseCaptionBlock(block, index))
    .sort((a, b) => a.start - b.start);
}

function parseCaptionBlock(block: string, index: number): CaptionCue[] {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length || /^WEBVTT$/i.test(lines[0]) || /^(NOTE|STYLE|REGION)\b/i.test(lines[0])) {
    return [];
  }

  const timingIndex = lines.findIndex((line) => line.includes('-->'));
  if (timingIndex === -1) return [];

  const [startRaw, endRaw] = lines[timingIndex].split('-->').map((part) => part.trim().split(/\s+/)[0]);
  const start = parseCaptionTime(startRaw);
  const end = parseCaptionTime(endRaw);
  const text = lines
    .slice(timingIndex + 1)
    .join('\n')
    .replace(/<\/?[^>]+>/g, '')
    .trim();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
    return [];
  }

  return [
    {
      id: `import-${index}-${startRaw}-${endRaw}`,
      start,
      end,
      text
    }
  ];
}

function parseCaptionTime(value: string) {
  const normalized = value.replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length < 2 || parts.length > 3) return Number.NaN;

  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length ? Number(parts.pop()) : 0;
  if (![hours, minutes, seconds].every(Number.isFinite)) return Number.NaN;

  return hours * 3600 + minutes * 60 + seconds;
}

function clampCaptionTime(value: number, duration: number) {
  if (!Number.isFinite(value)) return 0;
  if (!duration) return Math.max(0, value);
  return Math.min(Math.max(0, value), duration);
}

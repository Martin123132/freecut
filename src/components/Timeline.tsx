import { Scissors } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { clamp, formatTime } from '../lib/format';

type TimelineFrame = {
  image: string;
  time: number;
};

type TimelineProps = {
  currentTime: number;
  duration: number;
  previewUrl: string | null;
  trimStart: number;
  trimEnd: number;
  onSeek: (value: number) => void;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
};

export function Timeline({
  currentTime,
  duration,
  previewUrl,
  trimStart,
  trimEnd,
  onSeek,
  onTrimStartChange,
  onTrimEndChange
}: TimelineProps) {
  const [frames, setFrames] = useState<TimelineFrame[]>([]);
  const [frameStatus, setFrameStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const max = Math.max(duration, 0.1);
  const startPercent = (trimStart / max) * 100;
  const endPercent = (trimEnd / max) * 100;
  const currentPercent = clamp((currentTime / max) * 100, 0, 100);
  const canSeek = Boolean(previewUrl && duration > 0);

  useEffect(() => {
    if (!previewUrl || duration <= 0) {
      setFrames([]);
      setFrameStatus('idle');
      return;
    }

    let cancelled = false;
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const waitForMedia = (eventName: keyof HTMLMediaElementEventMap, timeout = 8000) =>
      new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error(`Timed out waiting for ${eventName}`));
        }, timeout);
        const cleanup = () => {
          window.clearTimeout(timeoutId);
          video.removeEventListener(eventName, handleEvent);
          video.removeEventListener('error', handleError);
        };
        const handleEvent = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error('Video frame unavailable'));
        };

        video.addEventListener(eventName, handleEvent, { once: true });
        video.addEventListener('error', handleError, { once: true });
      });

    const captureFrames = async () => {
      if (!context) throw new Error('Canvas unavailable');

      setFrameStatus('loading');
      video.muted = true;
      video.preload = 'metadata';
      video.playsInline = true;
      video.src = previewUrl;

      await waitForMedia('loadedmetadata');
      await waitForMedia('loadeddata', 4000).catch(() => undefined);

      const captureWidth = 144;
      const captureHeight = 82;
      const frameCount = duration > 90 ? 10 : duration > 35 ? 8 : 6;
      const safeDuration = Math.max(duration, 0.1);
      const timelineFrames: TimelineFrame[] = [];

      canvas.width = captureWidth;
      canvas.height = captureHeight;

      for (let index = 0; index < frameCount; index += 1) {
        if (cancelled) return;

        const sampleTime = clamp(((index + 0.5) / frameCount) * safeDuration, 0, Math.max(safeDuration - 0.05, 0));
        if (Math.abs(video.currentTime - sampleTime) > 0.03) {
          video.currentTime = sampleTime;
          await waitForMedia('seeked');
        }

        context.drawImage(video, 0, 0, captureWidth, captureHeight);
        timelineFrames.push({
          image: canvas.toDataURL('image/jpeg', 0.72),
          time: sampleTime
        });
      }

      if (!cancelled) {
        setFrames(timelineFrames);
        setFrameStatus(timelineFrames.length ? 'ready' : 'error');
      }
    };

    captureFrames().catch(() => {
      if (!cancelled) {
        setFrames([]);
        setFrameStatus('error');
      }
    });

    return () => {
      cancelled = true;
      video.removeAttribute('src');
      video.load();
    };
  }, [duration, previewUrl]);

  const seekFromRail = (clientX: number, rail: HTMLDivElement) => {
    if (!canSeek) return;
    const rect = rail.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onSeek(ratio * max);
  };

  const handleRailClick = (event: MouseEvent<HTMLDivElement>) => {
    seekFromRail(event.clientX, event.currentTarget);
  };

  const handleRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      onSeek(clamp(currentTime + direction, 0, max));
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onSeek(event.key === 'Home' ? 0 : max);
    }
  };

  return (
    <section className="timeline-panel">
      <div className="timeline-heading">
        <div className="control-title">
          <Scissors size={16} />
          <span>Trim</span>
        </div>
        <div className="timeline-duration">
          {formatTime(currentTime)} / {formatTime(trimEnd - trimStart)}
        </div>
      </div>
      <div
        className={`timeline-rail ${previewUrl ? 'has-media' : ''}`}
        data-testid="timeline-rail"
        role={canSeek ? 'slider' : undefined}
        tabIndex={canSeek ? 0 : undefined}
        aria-label={canSeek ? 'Timeline seek' : undefined}
        aria-valuemin={canSeek ? 0 : undefined}
        aria-valuemax={canSeek ? Math.round(max) : undefined}
        aria-valuenow={canSeek ? Math.round(currentTime) : undefined}
        onClick={handleRailClick}
        onKeyDown={handleRailKeyDown}
      >
        <div className="timeline-thumbnails" aria-hidden="true">
          {frames.length ? (
            frames.map((frame) => (
              <div className="timeline-frame" data-testid="timeline-frame" key={`${frame.time}-${frame.image.slice(-12)}`}>
                <img src={frame.image} alt="" />
              </div>
            ))
          ) : (
            <div className="timeline-empty-strip">
              {previewUrl ? (frameStatus === 'error' ? 'Frame preview unavailable' : 'Reading frames') : 'Load media for frames'}
            </div>
          )}
        </div>
        <div
          className="timeline-selection"
          style={{
            left: `${startPercent}%`,
            right: `${100 - endPercent}%`
          }}
        />
        <div className="timeline-playhead" style={{ left: `${currentPercent}%` }} />
      </div>
      <div className="timeline-ranges">
        <label>
          <span>In</span>
          <input
            type="range"
            min={0}
            max={max}
            step={0.05}
            value={trimStart}
            onChange={(event) => onTrimStartChange(clamp(Number(event.target.value), 0, trimEnd - 0.1))}
          />
          <strong>{formatTime(trimStart)}</strong>
        </label>
        <label>
          <span>Out</span>
          <input
            type="range"
            min={0}
            max={max}
            step={0.05}
            value={trimEnd}
            onChange={(event) => onTrimEndChange(clamp(Number(event.target.value), trimStart + 0.1, max))}
          />
          <strong>{formatTime(trimEnd)}</strong>
        </label>
      </div>
    </section>
  );
}

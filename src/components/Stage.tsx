import { FolderOpen, Pause, Play, RotateCcw, UploadCloud } from 'lucide-react';
import { RefObject } from 'react';
import { CaptionCue } from '../lib/captions';
import { CaptionStyle } from '../lib/captionStyles';
import { AspectPreset } from '../lib/presets';
import { formatTime } from '../lib/format';

type StageProps = {
  preset: AspectPreset;
  previewUrl: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  activeCaptions: CaptionCue[];
  captionStyle: CaptionStyle;
  missingMediaName: string | null;
  overlayText: string;
  overlayX: number;
  overlayY: number;
  overlaySize: number;
  cropX: number;
  cropY: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
  onRequestMedia: () => void;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
};

export function Stage({
  preset,
  previewUrl,
  videoRef,
  isPlaying,
  currentTime,
  duration,
  trimStart,
  trimEnd,
  activeCaptions,
  captionStyle,
  missingMediaName,
  overlayText,
  overlayX,
  overlayY,
  overlaySize,
  cropX,
  cropY,
  onPlayPause,
  onSeek,
  onRestart,
  onRequestMedia,
  onLoadedMetadata,
  onTimeUpdate
}: StageProps) {
  return (
    <main className="stage-wrap">
      <div className="stage-toolbar">
        <div className="stage-title">
          <span>Canvas</span>
          <strong>{preset.label}</strong>
        </div>
        <div className="stage-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <section className="stage-shell">
        <div className="stage-canvas" style={{ aspectRatio: preset.ratio }}>
          {previewUrl ? (
            <>
              <video
                ref={videoRef}
                src={previewUrl}
                style={{ objectPosition: `${cropX}% ${cropY}%` }}
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onPause={onTimeUpdate}
                playsInline
              />
              {overlayText.trim() ? (
                <div
                  className="stage-overlay-text"
                  style={{
                    left: `${overlayX}%`,
                    top: `${overlayY}%`,
                    fontSize: `clamp(18px, ${overlaySize}vw, 74px)`
                  }}
                >
                  {overlayText}
                </div>
              ) : null}
              {activeCaptions.length ? (
                <div className="stage-caption-stack">
                  {activeCaptions.map((caption) => (
                    <div className={`stage-caption-text ${captionStyle.className}`} key={caption.id}>
                      {caption.text}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className={`stage-empty ${missingMediaName ? 'restore-needed' : ''}`} data-testid="stage-empty">
              <span>{missingMediaName ? 'Source needed' : 'Ready for local video'}</span>
              {missingMediaName ? (
                <>
                  <strong>{missingMediaName}</strong>
                  <button className="stage-empty-action" type="button" data-testid="stage-relink-action" onClick={onRequestMedia}>
                    <FolderOpen size={14} />
                    Relink clip
                  </button>
                </>
              ) : (
                <>
                  <strong>No clip loaded</strong>
                  <button className="stage-empty-action" type="button" data-testid="stage-import-action" onClick={onRequestMedia}>
                    <UploadCloud size={14} />
                    Import source
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="transport">
        <button className="icon-button" type="button" onClick={onRestart} disabled={!previewUrl} aria-label="Restart" title="Restart">
          <RotateCcw size={18} />
        </button>
        <button className="transport-play" type="button" onClick={onPlayPause} disabled={!previewUrl} aria-label="Play or pause">
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <input
          className="seek"
          type="range"
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.05}
          value={currentTime}
          disabled={!previewUrl}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <div className="trim-window">
          {formatTime(trimStart)} - {formatTime(trimEnd)}
        </div>
      </div>
    </main>
  );
}

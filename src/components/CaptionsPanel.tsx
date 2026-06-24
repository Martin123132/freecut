import { Captions, Copy, FileUp, Plus, Scissors, Trash2 } from 'lucide-react';
import { CaptionCue, createCaptionCue, parseCaptionFile } from '../lib/captions';
import { CaptionStyle, captionStyles } from '../lib/captionStyles';
import { clamp, formatTime } from '../lib/format';

type CaptionsPanelProps = {
  captions: CaptionCue[];
  captionStyle: CaptionStyle;
  currentTime: number;
  duration: number;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  onCaptionsChange: (captions: CaptionCue[]) => void;
  onSeek: (time: number) => void;
};

export function CaptionsPanel({
  captions,
  captionStyle,
  currentTime,
  duration,
  onCaptionStyleChange,
  onCaptionsChange,
  onSeek
}: CaptionsPanelProps) {
  const addCaption = () => {
    const start = clamp(currentTime, 0, duration || currentTime);
    const end = duration ? Math.min(duration, start + 2) : start + 2;
    onCaptionsChange([...captions, createCaptionCue(start, Math.max(start + 0.1, end))]);
  };

  const updateCaption = (id: string, patch: Partial<CaptionCue>) => {
    onCaptionsChange(
      captions.map((caption) => {
        if (caption.id !== id) return caption;
        const next = { ...caption, ...patch };
        if (next.end <= next.start) next.end = next.start + 0.1;
        return next;
      })
    );
  };

  const removeCaption = (id: string) => {
    onCaptionsChange(captions.filter((caption) => caption.id !== id));
  };

  const duplicateCaption = (caption: CaptionCue, index: number) => {
    const length = Math.max(0.1, caption.end - caption.start);
    const start = duration
      ? clamp(caption.end + 0.05, 0, Math.max(0, duration - 0.1))
      : caption.end + 0.05;
    const end = duration ? Math.min(duration, start + length) : start + length;
    const nextCaptions = [...captions];
    nextCaptions.splice(index + 1, 0, createCaptionCue(start, Math.max(start + 0.1, end), caption.text));
    onCaptionsChange(nextCaptions);
  };

  const splitCaption = (caption: CaptionCue, index: number) => {
    const canUsePlayhead = currentTime > caption.start + 0.1 && currentTime < caption.end - 0.1;
    const splitAt = canUsePlayhead ? currentTime : caption.start + (caption.end - caption.start) / 2;
    const nextCaptions = [...captions];
    nextCaptions.splice(
      index,
      1,
      { ...caption, end: splitAt },
      createCaptionCue(splitAt, caption.end, caption.text)
    );
    onCaptionsChange(nextCaptions);
  };

  const importCaptions = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const imported = parseCaptionFile(text);
    if (imported.length) {
      onCaptionsChange(imported);
    }
  };

  return (
    <section className="control-group captions-group">
      <div className="control-title captions-title">
        <span>
          <Captions size={16} />
          <span>Captions</span>
        </span>
        <div className="caption-actions">
          <label className="tiny-icon-button" aria-label="Import captions" title="Import SRT/VTT">
            <FileUp size={14} />
            <input
              type="file"
              accept=".srt,.vtt,text/vtt"
              onChange={(event) => {
                void importCaptions(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <button className="tiny-icon-button" type="button" onClick={addCaption} aria-label="Add caption" title="Add caption">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="caption-style-grid" role="radiogroup" aria-label="Caption style">
        {captionStyles.map((style) => (
          <button
            className={style.id === captionStyle.id ? 'caption-style active' : 'caption-style'}
            type="button"
            role="radio"
            aria-checked={style.id === captionStyle.id}
            key={style.id}
            onClick={() => onCaptionStyleChange(style)}
          >
            <strong>{style.label}</strong>
            <span>{style.detail}</span>
          </button>
        ))}
      </div>

      <div className="caption-list">
        {captions.length ? (
          captions.map((caption, index) => (
            <article className="caption-card" key={caption.id}>
              <button className="caption-time" type="button" onClick={() => onSeek(caption.start)}>
                {formatTime(caption.start)}
              </button>
              <div className="caption-fields">
                <div className="caption-times">
                  <label>
                    <span>In</span>
                    <input
                      type="number"
                      min={0}
                      max={duration || undefined}
                      step={0.1}
                      value={caption.start}
                      onChange={(event) =>
                        updateCaption(caption.id, {
                          start: clamp(Number(event.target.value), 0, duration || Number.MAX_SAFE_INTEGER)
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Out</span>
                    <input
                      type="number"
                      min={0}
                      max={duration || undefined}
                      step={0.1}
                      value={caption.end}
                      onChange={(event) =>
                        updateCaption(caption.id, {
                          end: clamp(Number(event.target.value), 0.1, duration || Number.MAX_SAFE_INTEGER)
                        })
                      }
                    />
                  </label>
                </div>
                <textarea
                  className="caption-textarea"
                  rows={2}
                  value={caption.text}
                  aria-label={`Caption ${index + 1}`}
                  onChange={(event) => updateCaption(caption.id, { text: event.target.value })}
                />
              </div>
              <div className="caption-card-actions">
                <button
                  className="caption-tool"
                  type="button"
                  aria-label={`Duplicate caption ${index + 1}`}
                  title="Duplicate caption"
                  onClick={() => duplicateCaption(caption, index)}
                >
                  <Copy size={13} />
                </button>
                <button
                  className="caption-tool"
                  type="button"
                  aria-label={`Split caption ${index + 1}`}
                  title="Split caption"
                  disabled={caption.end - caption.start <= 0.2}
                  onClick={() => splitCaption(caption, index)}
                >
                  <Scissors size={13} />
                </button>
                <button
                  className="caption-delete"
                  type="button"
                  aria-label={`Delete caption ${index + 1}`}
                  title="Delete caption"
                  onClick={() => removeCaption(caption.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-panel">No captions</div>
        )}
      </div>
    </section>
  );
}

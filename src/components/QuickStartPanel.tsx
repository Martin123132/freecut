import { ArrowRight, ScissorsLineDashed, Sparkles, Video } from 'lucide-react';

type QuickStartPanelProps = {
  fileNeedsImport: boolean;
  isFormatReady: boolean;
  canAddCaptions: boolean;
  canExport: boolean;
  hasCaptionWork: boolean;
  progress: number;
  progressTotal: number;
  projectMediaName: string | null;
  onDismiss: () => void;
  onImport: () => void;
  onChooseFormat: () => void;
  onAddCaption: () => void;
  onExport: () => void;
};

export function QuickStartPanel({
  fileNeedsImport,
  isFormatReady,
  canAddCaptions,
  canExport,
  hasCaptionWork,
  progress,
  progressTotal,
  projectMediaName,
  onDismiss,
  onImport,
  onChooseFormat,
  onAddCaption,
  onExport
}: QuickStartPanelProps) {
  const stepsDone = progress ?? [!fileNeedsImport, isFormatReady, hasCaptionWork, canExport].filter(Boolean).length;

  return (
    <section className="quick-start" aria-label="Quick start map" data-testid="quick-start">
      <div className="quick-start-heading">
        <div>
          <span>Guided path</span>
          <strong>
            Mission map {stepsDone}
            <span>/{progressTotal}</span>
          </strong>
        </div>
        <button className="quick-start-dismiss" type="button" onClick={onDismiss} title="Hide this guide">
          Hide map
        </button>
      </div>
      <div
        className="quick-start-progress"
        role="progressbar"
        aria-label="Mission progress"
        aria-valuemin={0}
        aria-valuemax={progressTotal}
        aria-valuenow={stepsDone}
      >
        <span>Progress</span>
        <div className="quick-start-progress-track">
          <i style={{ width: `${Math.round((stepsDone / progressTotal) * 100)}%` }} />
        </div>
        <small>{Math.round((stepsDone / progressTotal) * 100)}%</small>
      </div>

      <ol className="quick-start-steps">
        <li className={`quick-start-step ${!fileNeedsImport ? 'done' : 'active'}`}>
          <span className="quick-start-badge">1</span>
          <div className="quick-start-copy">
            <strong>Start with one source</strong>
            <span>{projectMediaName ? `Relink ${projectMediaName} to continue.` : 'Drop or import a local clip.'}</span>
          </div>
          <button className="tiny-icon-button" type="button" onClick={onImport}>
            <Video size={12} />
            {fileNeedsImport ? (projectMediaName ? 'Relink' : 'Import clip') : 'Loaded'}
          </button>
        </li>

        <li className={`quick-start-step ${isFormatReady ? 'done' : fileNeedsImport ? 'locked' : 'active'}`}>
          <span className="quick-start-badge">2</span>
          <div className="quick-start-copy">
            <strong>Choose your output frame</strong>
            <span>{isFormatReady ? 'Frame preset set for short-form output.' : '9:16 is the social default for Shorts/TikTok style.'}</span>
          </div>
          <button className="tiny-icon-button" type="button" disabled={isFormatReady} onClick={onChooseFormat}>
            <ScissorsLineDashed size={12} />
            {isFormatReady ? 'Ready' : 'Set 9:16'}
          </button>
        </li>

        <li className={`quick-start-step ${hasCaptionWork ? 'done' : canAddCaptions ? 'active' : 'locked'}`}>
          <span className="quick-start-badge">3</span>
          <div className="quick-start-copy">
            <strong>Make captions readable (optional)</strong>
            <span>
              {hasCaptionWork
                ? 'Captions are active and tuned for muted social playback.'
                : canAddCaptions
                  ? 'Add subtitle cues and pick a style for muted viewing.'
                  : 'Load source first to add cues.'}
            </span>
          </div>
          <button className="tiny-icon-button" type="button" onClick={onAddCaption} disabled={!canAddCaptions}>
            <Sparkles size={12} />
            Add cue
          </button>
        </li>

        <li className={`quick-start-step ${canExport ? 'done' : canAddCaptions ? 'active' : 'locked'}`}>
          <span className="quick-start-badge">4</span>
          <div className="quick-start-copy">
            <strong>Export locally</strong>
            <span>{canExport ? 'Ready to ship your local MP4.' : 'Unlock after source and trim range are set.'}</span>
          </div>
          <button className="tiny-icon-button" type="button" disabled={!canExport} onClick={onExport}>
            <ArrowRight size={12} />
            Export
          </button>
        </li>
      </ol>
    </section>
  );
}

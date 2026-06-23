import { ArrowRight, ScissorsLineDashed, Sparkles, Video } from 'lucide-react';

type QuickStartPanelProps = {
  fileNeedsImport: boolean;
  isFormatReady: boolean;
  canAddCaptions: boolean;
  canExport: boolean;
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
  projectMediaName,
  onDismiss,
  onImport,
  onChooseFormat,
  onAddCaption,
  onExport
}: QuickStartPanelProps) {
  return (
    <section className="quick-start" aria-label="Quick start map">
      <div className="quick-start-heading">
        <div>
          <span>Guided path</span>
          <strong>First clip, fast</strong>
        </div>
        <button className="quick-start-dismiss" type="button" onClick={onDismiss} title="Dismiss this guide">
          Got it
        </button>
      </div>

      <ol className="quick-start-steps">
        <li>
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

        <li>
          <span className="quick-start-badge">2</span>
          <div className="quick-start-copy">
            <strong>Choose your output frame</strong>
            <span>{isFormatReady ? 'Frame preset set for short-form output.' : '9:16 gives a clean social cut.'}</span>
          </div>
          <button className="tiny-icon-button" type="button" disabled={isFormatReady} onClick={onChooseFormat}>
            <ScissorsLineDashed size={12} />
            {isFormatReady ? 'Ready' : 'Set 9:16'}
          </button>
        </li>

        <li>
          <span className="quick-start-badge">3</span>
          <div className="quick-start-copy">
            <strong>Make captions readable</strong>
            <span>{canAddCaptions ? 'Add subtitle cues and pick a style for muted viewing.' : 'Load source first to add cues.'}</span>
          </div>
          <button className="tiny-icon-button" type="button" onClick={onAddCaption} disabled={!canAddCaptions}>
            <Sparkles size={12} />
            Add cue
          </button>
        </li>

        <li>
          <span className="quick-start-badge">4</span>
          <div className="quick-start-copy">
            <strong>Export locally</strong>
            <span>{canExport ? 'Ready to ship' : 'Unlock after source and range'}</span>
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

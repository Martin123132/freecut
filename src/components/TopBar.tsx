import { Download, Redo2, ScissorsLineDashed, Settings, Undo2, X } from 'lucide-react';
import { type RefObject } from 'react';

type TopBarProps = {
  canExport: boolean;
  canRedo: boolean;
  canUndo: boolean;
  exporting: boolean;
  onCancelExport: () => void;
  onExport: () => void;
  onRedo: () => void;
  onSettings: () => void;
  onUndo: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
};

export function TopBar({ canExport, canRedo, canUndo, exporting, onCancelExport, onExport, onRedo, onSettings, onUndo, settingsButtonRef }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <ScissorsLineDashed size={19} strokeWidth={2.5} />
        </div>
        <div>
          <div className="brand-name">FreeCut</div>
          <div className="brand-subtitle">Local video editor</div>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="history-actions" aria-label="Edit history">
          <button
            className="icon-button"
            type="button"
            aria-label="Undo edit"
            title="Undo edit (Ctrl+Z)"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Redo edit"
            title="Redo edit (Ctrl+Y)"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <button
          ref={settingsButtonRef}
          className="icon-button"
          type="button"
          aria-label="Project settings"
          title="Project settings (S)"
          onClick={onSettings}
        >
          <Settings size={18} />
        </button>
        <button
          className={exporting ? 'primary-button danger' : 'primary-button'}
          type="button"
          disabled={!canExport && !exporting}
          title={exporting ? 'Cancel export (E)' : 'Export (E)'}
          onClick={exporting ? onCancelExport : onExport}
        >
          {exporting ? <X size={17} /> : <Download size={17} />}
          <span className="primary-button-label">{exporting ? 'Cancel' : 'Export'}</span>
        </button>
      </div>
    </header>
  );
}

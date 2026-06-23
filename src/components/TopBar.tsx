import { Download, ScissorsLineDashed, Settings, X } from 'lucide-react';
import { type RefObject } from 'react';

type TopBarProps = {
  canExport: boolean;
  exporting: boolean;
  onCancelExport: () => void;
  onExport: () => void;
  onSettings: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
};

export function TopBar({ canExport, exporting, onCancelExport, onExport, onSettings, settingsButtonRef }: TopBarProps) {
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
          {exporting ? 'Cancel' : 'Export'}
        </button>
      </div>
    </header>
  );
}

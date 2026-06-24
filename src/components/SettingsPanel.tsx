import { Download, HardDrive, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef } from 'react';
import type { SessionExport } from '../lib/exportHistory';
import { bytesToSize } from '../lib/format';

type SettingsPanelProps = {
  apiDataRoot: string;
  exportLabel: string;
  exportHistory: SessionExport[];
  mediaName: string | null;
  presetLabel: string;
  projectStatus: string;
  onClose: () => void;
  onDownloadExport: (id: string) => void;
  onResetProject: () => void;
  onSaveProject: () => void;
};

const exportTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short'
});

export function SettingsPanel({
  apiDataRoot,
  exportLabel,
  exportHistory,
  mediaName,
  presetLabel,
  projectStatus,
  onClose,
  onDownloadExport,
  onResetProject,
  onSaveProject
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

    if (!focusable.length) return;

    event.preventDefault();
    const activeIndex = focusable.findIndex((element) => element === document.activeElement);
    const fallbackIndex = event.shiftKey ? focusable.length : -1;
    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + focusable.length) % focusable.length
      : (currentIndex + 1) % focusable.length;

    focusable[nextIndex].focus();
  };

  return (
    <div className="settings-scrim" role="presentation" onClick={onClose}>
      <aside
        ref={panelRef}
        className="settings-panel"
        aria-label="Project settings"
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="settings-heading">
          <div>
            <span>Settings</span>
            <strong>FreeCut</strong>
          </div>
          <button ref={closeButtonRef} className="tiny-icon-button" type="button" aria-label="Close settings" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="settings-stack">
          <section className="settings-section">
            <div className="settings-section-title">
              <ShieldCheck size={15} />
              <span>Local first</span>
            </div>
            <div className="settings-facts">
              <div>
                <span>Project</span>
                <strong>{projectStatus}</strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{mediaName || 'Not loaded'}</strong>
              </div>
              <div>
                <span>Frame</span>
                <strong>{presetLabel}</strong>
              </div>
              <div>
                <span>Quality</span>
                <strong>{exportLabel}</strong>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <HardDrive size={15} />
              <span>Storage</span>
            </div>
            <p className="settings-path">{apiDataRoot || 'Local FreeCut API'}</p>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <Download size={15} />
              <span>Export history</span>
            </div>
            {exportHistory.length ? (
              <div className="export-history-list" data-testid="export-history-list">
                {exportHistory.map((item) => (
                  <div className="export-history-item" key={item.id}>
                    <div className="export-history-copy">
                      <strong>{item.filename}</strong>
                      <span>
                        {bytesToSize(item.size)} - {item.profileLabel} - {item.presetLabel} - {item.durationLabel} - {item.captionLabel}
                      </span>
                      <small>{exportTimeFormatter.format(item.createdAt)}</small>
                    </div>
                    <button
                      type="button"
                      aria-label={item.available ? `Download ${item.filename}` : `${item.filename} download needs re-export`}
                      title={item.available ? `Download ${item.filename}` : 'Re-export this cut to download again'}
                      disabled={!item.available}
                      onClick={() => onDownloadExport(item.id)}
                    >
                      {item.available ? <Download size={14} /> : 'Re-export'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings-empty">No exports yet</p>
            )}
          </section>

          <div className="settings-actions">
            <button type="button" onClick={onSaveProject}>
              <Save size={14} />
              Save project
            </button>
            <button type="button" onClick={onResetProject}>
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

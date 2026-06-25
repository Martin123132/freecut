import { HardDrive, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef } from 'react';

type SettingsPanelProps = {
  apiDataRoot: string;
  exportLabel: string;
  mediaName: string | null;
  presetLabel: string;
  projectStatus: string;
  onClose: () => void;
  onResetProject: () => void;
  onSaveProject: () => void;
};

export function SettingsPanel({
  apiDataRoot,
  exportLabel,
  mediaName,
  presetLabel,
  projectStatus,
  onClose,
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

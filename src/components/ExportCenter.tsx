import { Activity, Download, HardDrive, Play, RotateCcw, Route, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef } from 'react';
import type { SessionExport } from '../lib/exportHistory';
import { bytesToSize, clamp } from '../lib/format';

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

type ExportCenterProps = {
  apiDataRoot: string;
  canExport: boolean;
  currentProjectKey: string;
  exportHistory: SessionExport[];
  exportMessage: string;
  exportProgress: number;
  exportState: ExportState;
  renderPlanLabel: string;
  renderPlanStatus: string;
  onCancelExport: () => void;
  onClose: () => void;
  onDownloadExport: (id: string) => void;
  onRenderExport: (id: string) => void;
  onRestoreExportRoute: (id: string) => void;
  onRetryExport: () => void;
  onStartExport: () => void;
};

const exportTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short'
});

export function ExportCenter({
  apiDataRoot,
  canExport,
  currentProjectKey,
  exportHistory,
  exportMessage,
  exportProgress,
  exportState,
  renderPlanLabel,
  renderPlanStatus,
  onCancelExport,
  onClose,
  onDownloadExport,
  onRenderExport,
  onRestoreExportRoute,
  onRetryExport,
  onStartExport
}: ExportCenterProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const latestExport = exportHistory[0] ?? null;
  const latestMatchesCurrent = Boolean(latestExport && latestExport.projectKey === currentProjectKey);
  const latestCanRenderAgain = Boolean(latestExport && latestMatchesCurrent && canExport);
  const latestCanRestore = Boolean(latestExport?.projectSnapshot && (!latestMatchesCurrent || !latestExport.available));
  const currentStateLabel = getCurrentStateLabel(exportState, exportProgress, latestExport, latestMatchesCurrent, canExport);
  const currentDetail = getCurrentDetail(exportState, exportMessage, latestExport, latestMatchesCurrent, canExport);

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
        className="export-center-panel"
        aria-label="Export Center"
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="settings-heading">
          <div>
            <span>Export</span>
            <strong>Center</strong>
          </div>
          <button ref={closeButtonRef} className="tiny-icon-button" type="button" aria-label="Close Export Center" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="export-center-stack" data-testid="export-center">
          <section className="settings-section">
            <div className="settings-section-title">
              <Activity size={15} />
              <span>Current render</span>
            </div>
            <div className={`export-center-current ${exportState}`}>
              <div className="export-center-current-copy">
                <span>{currentStateLabel}</span>
                <strong>{currentDetail}</strong>
                <em>{renderPlanStatus}</em>
              </div>
              {exportState === 'exporting' ? (
                <div
                  className="export-progress"
                  aria-label="Export Center progress"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(exportProgress)}
                  role="progressbar"
                >
                  <span style={{ width: `${clamp(exportProgress, 0, 100)}%` }} />
                </div>
              ) : null}
              <div className="export-center-actions">
                {exportState === 'exporting' ? (
                  <button type="button" onClick={onCancelExport}>
                    <X size={13} />
                    Cancel
                  </button>
                ) : exportState === 'error' && canExport ? (
                  <button type="button" onClick={onRetryExport}>
                    <RotateCcw size={13} />
                    Retry
                  </button>
                ) : latestExport?.available ? (
                  <button type="button" aria-label={`Download ${latestExport.filename}`} title={`Download ${latestExport.filename}`} onClick={() => onDownloadExport(latestExport.id)}>
                    <Download size={13} />
                    Download
                  </button>
                ) : canExport ? (
                  <button type="button" onClick={onStartExport}>
                    <Play size={13} />
                    Render
                  </button>
                ) : null}
                {latestExport && latestCanRenderAgain ? (
                  <button type="button" aria-label={`Render ${latestExport.filename} again`} title="Render this edit again" onClick={() => onRenderExport(latestExport.id)}>
                    <Play size={13} />
                    Render again
                  </button>
                ) : latestExport && latestCanRestore ? (
                  <button type="button" aria-label={`Restore route for ${latestExport.filename}`} title="Restore this render route" onClick={() => onRestoreExportRoute(latestExport.id)}>
                    <Route size={13} />
                    Restore route
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <Play size={15} />
              <span>Render plan</span>
            </div>
            <p className="export-center-plan">{renderPlanLabel}</p>
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
                {exportHistory.map((item) => {
                  const matchesCurrentEdit = item.projectKey === currentProjectKey;
                  const canRenderAgain = matchesCurrentEdit && canExport;
                  const statusLabel = item.available ? 'Ready now' : item.projectSnapshot ? 'Restore route' : 'Receipt';

                  return (
                    <div className="export-history-item" key={item.id}>
                      <div className="export-history-copy">
                        <span className={item.available ? 'export-history-state available' : item.projectSnapshot ? 'export-history-state route' : 'export-history-state receipt'}>
                          {statusLabel}
                        </span>
                        <strong>{item.filename}</strong>
                        <span>
                          {bytesToSize(item.size)} - {item.profileLabel} - {item.presetLabel} - {item.durationLabel} - {item.captionLabel}
                        </span>
                        <small>{item.sourceName ? `${item.sourceName} - ` : ''}{exportTimeFormatter.format(item.createdAt)}</small>
                      </div>
                      <div className="export-history-actions">
                        {item.available ? (
                          <button type="button" aria-label={`Download ${item.filename}`} title={`Download ${item.filename}`} onClick={() => onDownloadExport(item.id)}>
                            <Download size={14} />
                          </button>
                        ) : null}
                        {canRenderAgain ? (
                          <button type="button" aria-label={`Render ${item.filename} again`} title="Render this edit again" onClick={() => onRenderExport(item.id)}>
                            <Play size={13} />
                            Render
                          </button>
                        ) : item.projectSnapshot ? (
                          <button type="button" aria-label={`Restore route for ${item.filename}`} title="Restore this render route" onClick={() => onRestoreExportRoute(item.id)}>
                            <Route size={13} />
                            Restore
                          </button>
                        ) : (
                          <button type="button" aria-label={`${item.filename} receipt needs a saved route`} title="This older receipt needs the project to be opened again" disabled>
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="settings-empty">No exports yet</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function getCurrentStateLabel(
  exportState: ExportState,
  exportProgress: number,
  latestExport: SessionExport | null,
  latestMatchesCurrent: boolean,
  canExport: boolean
) {
  if (exportState === 'exporting') return `Rendering ${Math.round(exportProgress)}%`;
  if (exportState === 'error') return 'Needs retry';
  if (latestExport?.available && latestMatchesCurrent) return 'Ready now';
  if (latestExport?.projectSnapshot && (!latestMatchesCurrent || !latestExport.available)) return 'Route saved';
  if (canExport) return 'Ready';
  return 'Waiting';
}

function getCurrentDetail(
  exportState: ExportState,
  exportMessage: string,
  latestExport: SessionExport | null,
  latestMatchesCurrent: boolean,
  canExport: boolean
) {
  if (exportState === 'exporting') return exportMessage || 'Rendering MP4';
  if (exportState === 'error') return exportMessage || 'Export failed';
  if (exportMessage) return exportMessage;
  if (latestExport) {
    const status = latestMatchesCurrent ? 'Latest export' : 'Previous export';
    return `${status} - ${latestExport.filename}`;
  }
  return canExport ? 'Ready for local FFmpeg export' : 'Import media and set a valid range';
}

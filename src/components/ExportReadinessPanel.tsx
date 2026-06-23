import { AlertTriangle, Gauge } from 'lucide-react';
import { ExportReadinessSummary } from '../lib/exportEstimate';

type ExportReadinessPanelProps = {
  summary: ExportReadinessSummary;
};

export function ExportReadinessPanel({ summary }: ExportReadinessPanelProps) {
  return (
    <section className="control-group export-readiness-group" data-testid="export-readiness" aria-label="Export readiness">
      <div className="control-title">
        <Gauge size={16} />
        <span>Render summary</span>
      </div>
      <div className="render-summary-grid">
        <div>
          <span>Duration</span>
          <strong>{summary.durationLabel}</strong>
        </div>
        <div>
          <span>Frame</span>
          <strong>{summary.frameLabel}</strong>
        </div>
        <div>
          <span>Estimate</span>
          <strong>{summary.estimatedSizeLabel}</strong>
        </div>
        <div>
          <span>Quality</span>
          <strong>{summary.qualityLabel}</strong>
        </div>
        <div>
          <span>Captions</span>
          <strong>{summary.captionLabel}</strong>
        </div>
        <div>
          <span>Focus</span>
          <strong>{summary.cropFocusLabel}</strong>
        </div>
      </div>
      {summary.warnings.length ? (
        <div className="render-warning-list">
          {summary.warnings.map((warning) => (
            <div className={`render-warning ${warning.tone}`} key={warning.id}>
              <AlertTriangle size={13} />
              <span>{warning.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

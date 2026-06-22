import { Check, Circle, CircleAlert, Play, Rocket, X } from 'lucide-react';

export type PreflightItem = {
  id: string;
  label: string;
  value: string;
  state: 'ready' | 'active' | 'blocked';
  actionLabel?: string;
  onAction?: () => void;
};

type ExportPreflightProps = {
  items: PreflightItem[];
  isExporting?: boolean;
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimaryAction: () => void;
};

export function ExportPreflight({ items = [], isExporting = false, primaryLabel, primaryDisabled, onPrimaryAction }: ExportPreflightProps) {
  const readyCount = items.filter((item) => item.state === 'ready').length;

  return (
    <section className="preflight-panel" aria-label="Ship readiness">
      <div className="preflight-heading">
        <div>
          <span>Ship</span>
          <strong>
            {readyCount}/{items.length}
          </strong>
        </div>
        <button className={isExporting ? 'preflight-primary danger' : 'preflight-primary'} type="button" disabled={primaryDisabled} onClick={onPrimaryAction}>
          {isExporting ? <X size={14} /> : <Rocket size={14} />}
          {primaryLabel}
        </button>
      </div>

      <div className="preflight-list">
        {items.map((item) => (
          <div className={`preflight-row ${item.state}`} data-testid={`preflight-row-${item.id}`} key={item.id}>
            <div className="preflight-icon" aria-hidden="true">
              {item.state === 'ready' ? <Check size={13} /> : item.state === 'blocked' ? <CircleAlert size={13} /> : <Circle size={13} />}
            </div>
            <div className="preflight-copy">
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
            {item.actionLabel && item.onAction ? (
              <button className="preflight-action" type="button" onClick={item.onAction}>
                <Play size={11} fill="currentColor" />
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

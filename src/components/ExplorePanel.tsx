import { Captions, Crosshair, type LucideIcon, SlidersHorizontal, Square } from 'lucide-react';

export type ExploreActionIcon = 'caption' | 'focus' | 'quality' | 'square';

export type ExploreAction = {
  actionLabel: string;
  detail: string;
  disabled?: boolean;
  disabledReason?: string;
  icon: ExploreActionIcon;
  id: string;
  label: string;
  onAction: () => void;
  status: 'done' | 'locked' | 'ready';
};

type ExplorePanelProps = {
  actions: ExploreAction[];
};

const iconByAction: Record<ExploreActionIcon, LucideIcon> = {
  caption: Captions,
  focus: Crosshair,
  quality: SlidersHorizontal,
  square: Square
};

export function ExplorePanel({ actions }: ExplorePanelProps) {
  return (
    <section className="explore-panel" aria-label="Explore actions" data-testid="explore-panel">
      <header className="explore-heading">
        <span>Free roam</span>
        <strong>Explore safely</strong>
      </header>
      <div className="explore-action-list">
        {actions.map((action) => {
          const Icon = iconByAction[action.icon];
          const title = action.disabled ? action.disabledReason : `${action.label}: ${action.detail}`;

          return (
            <button
              className={`explore-action ${action.status}`}
              data-testid={`explore-${action.id}`}
              disabled={action.disabled}
              key={action.id}
              onClick={action.onAction}
              title={title}
              type="button"
            >
              <span className="explore-action-icon" aria-hidden="true">
                <Icon size={14} />
              </span>
              <span className="explore-action-copy">
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
              </span>
              <b>{action.actionLabel}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}

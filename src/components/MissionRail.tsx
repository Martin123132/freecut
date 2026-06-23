import { ArrowRight, CheckCircle2, CircleDashed, Lock } from 'lucide-react';
import { type ReactNode } from 'react';

export type MissionRailStep = {
  description: string;
  id: string;
  label: string;
  onAction: () => void;
  status: 'active' | 'done' | 'locked' | 'ready';
  actionLabel: string;
  disabled?: boolean;
};

type MissionRailProps = {
  hint: string;
  onOpenMap: () => void;
  steps: MissionRailStep[];
};

const iconByStatus: Record<string, ReactNode> = {
  done: <CheckCircle2 size={14} />,
  active: <CircleDashed size={14} />,
  ready: <CircleDashed size={14} />,
  locked: <Lock size={14} />
};

export function MissionRail({ hint, onOpenMap, steps }: MissionRailProps) {
  return (
    <section className="quick-start-mini" aria-label="Mission path rail" data-testid="quick-start-mini">
      <div className="mission-rail-header">
        <div className="mission-rail-copy">
          <span className="mission-rail-copy-kicker">Mission path</span>
          <strong>{hint}</strong>
        </div>
        <button className="quick-start-mini-action" type="button" onClick={onOpenMap}>
          <ArrowRight size={12} />
          Open map
        </button>
      </div>

      <ol className="mission-rail-steps">
        {steps.map((step, index) => (
          <li className={`mission-rail-step ${step.status}`} key={step.id} data-testid={`mission-step-${step.id}`}>
            <span className="mission-rail-index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="mission-rail-status-icon" aria-hidden="true">
              {iconByStatus[step.status]}
            </span>
            <div className="mission-rail-text">
              <strong>{step.label}</strong>
              <small>{step.description}</small>
            </div>
            <button
              data-testid={`mission-step-${step.id}-action`}
              className="mission-rail-action"
              type="button"
              disabled={step.disabled || step.status === 'locked'}
              onClick={step.onAction}
              title={step.disabled || step.status === 'locked' ? 'Complete the previous step first' : step.actionLabel}
            >
              {step.actionLabel}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

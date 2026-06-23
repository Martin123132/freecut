import { Check, Circle, Lock, Play, WandSparkles } from 'lucide-react';

export type WorkflowStep = {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  actionDisabled?: boolean;
  optional?: boolean;
  status: 'active' | 'done' | 'ready' | 'locked';
  onAction: () => void;
};

type WorkflowGuideProps = {
  steps: WorkflowStep[];
};

export function WorkflowGuide({ steps }: WorkflowGuideProps) {
  const activeStep = steps.find((step) => step.status === 'active' || step.status === 'ready') ?? steps[0];

  return (
    <section className="workflow-guide" aria-label="Guided workflow">
      <div className="workflow-heading">
        <div>
          <span className="workflow-kicker">Path</span>
          <h2>{activeStep.title}</h2>
        </div>
        <WandSparkles size={17} />
      </div>
      <p className="workflow-summary">{activeStep.detail}</p>

      <div className="workflow-steps">
        {steps.map((step) => (
          <article className={`workflow-step ${step.status}`} key={step.id}>
            <div className="workflow-icon" aria-hidden="true">
              {step.status === 'done' ? <Check size={13} /> : step.status === 'locked' ? <Lock size={13} /> : <Circle size={13} />}
            </div>
            <div className="workflow-copy">
              <strong>{step.title}</strong>
              <div className="workflow-step-meta">
                {step.status === 'active' ? <span className="step-pill step-pill-next">Next</span> : null}
                {step.status === 'ready' && !step.optional ? <span className="step-pill step-pill-ready">Ready</span> : null}
                {step.optional ? <span className="step-pill step-pill-optional">Optional</span> : null}
                {step.status === 'locked' ? <span className="step-pill step-pill-locked">Locked</span> : null}
              </div>
              <span>{step.detail}</span>
            </div>
            <button
              className="workflow-action"
              type="button"
              disabled={step.status === 'locked' || step.actionDisabled}
              onClick={step.onAction}
            >
              <Play size={12} fill="currentColor" />
              {step.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

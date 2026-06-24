import { RotateCcw, X } from 'lucide-react';

export type SessionCheckpoint = {
  detail: string;
  id: number;
  label: string;
};

type CheckpointPanelProps = {
  checkpoint: SessionCheckpoint | null;
  onDismiss: () => void;
  onRestore: () => void;
};

export function CheckpointPanel({ checkpoint, onDismiss, onRestore }: CheckpointPanelProps) {
  if (!checkpoint) return null;

  return (
    <section className="checkpoint-panel" data-testid="checkpoint-panel" aria-label="Session checkpoint" aria-live="polite">
      <header className="checkpoint-heading">
        <span>Safety net</span>
        <button className="checkpoint-dismiss" type="button" aria-label="Keep change" title="Keep change" onClick={onDismiss}>
          <X size={13} />
        </button>
      </header>
      <div className="checkpoint-copy">
        <strong>{checkpoint.label}</strong>
        <span>{checkpoint.detail}</span>
      </div>
      <button className="checkpoint-restore" data-testid="checkpoint-restore" type="button" onClick={onRestore}>
        <RotateCcw size={13} />
        Restore
      </button>
    </section>
  );
}

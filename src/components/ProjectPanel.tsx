import { FileDown, FolderOpen, RotateCcw } from 'lucide-react';
import { RefObject } from 'react';

type ProjectPanelProps = {
  mediaName: string | null;
  status: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSaveProject: () => void;
  onOpenProject: (file: File) => void;
  onResetProject: () => void;
};

export function ProjectPanel({
  mediaName,
  status,
  inputRef,
  onSaveProject,
  onOpenProject,
  onResetProject
}: ProjectPanelProps) {
  return (
    <section className="project-panel" aria-label="Project controls">
      <div className="project-heading">
        <div>
          <span>Project</span>
          <strong>{mediaName ?? 'Untitled cut'}</strong>
        </div>
        <small>{status}</small>
      </div>

      <div className="project-actions">
        <button type="button" onClick={onSaveProject}>
          <FileDown size={14} />
          Save
        </button>
        <label>
          <FolderOpen size={14} />
          Open
          <input
            ref={inputRef}
            type="file"
            accept=".freecut.json,application/json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void onOpenProject(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <button type="button" onClick={onResetProject}>
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
    </section>
  );
}

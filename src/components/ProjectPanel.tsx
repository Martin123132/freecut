import { Clock3, FileDown, FolderOpen, RotateCcw } from 'lucide-react';
import { RefObject } from 'react';

export type RecentProjectCard = {
  detail: string;
  id: string;
  isActive: boolean;
  savedLabel: string;
  title: string;
};

type ProjectPanelProps = {
  mediaName: string | null;
  recentProjects: RecentProjectCard[];
  status: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSaveProject: () => void;
  onOpenProject: (file: File) => void;
  onRestoreRecentProject: (id: string) => void;
  onResetProject: () => void;
};

export function ProjectPanel({
  mediaName,
  recentProjects = [],
  status,
  inputRef,
  onSaveProject,
  onOpenProject,
  onRestoreRecentProject,
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

      {recentProjects.length ? (
        <div className="recent-projects" data-testid="recent-projects">
          <div className="recent-projects-heading">
            <Clock3 size={13} />
            <span>Recent routes</span>
          </div>
          <div className="recent-project-list">
            {recentProjects.map((project) => (
              <button
                className={project.isActive ? 'recent-project active' : 'recent-project'}
                data-testid={`recent-project-${project.id}`}
                type="button"
                key={project.id}
                onClick={() => onRestoreRecentProject(project.id)}
              >
                <span className="recent-project-copy">
                  <strong>{project.title}</strong>
                  <small>{project.detail}</small>
                  <em>{project.savedLabel}</em>
                </span>
                <b>{project.isActive ? 'Open' : 'Resume'}</b>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

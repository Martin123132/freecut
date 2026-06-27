import { FileVideo, Link2, UploadCloud } from 'lucide-react';
import { ReactNode, RefObject } from 'react';
import { bytesToSize } from '../lib/format';

type MediaPanelProps = {
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  projectMediaName: string | null;
  children?: ReactNode;
  onRejectFile: (file: File) => void;
  onSelectFile: (file: File) => void;
  onRequestMedia: () => void;
};

export function MediaPanel({ file, inputRef, projectMediaName, children, onRejectFile, onSelectFile, onRequestMedia }: MediaPanelProps) {
  const acceptFile = (candidate: File | undefined) => {
    if (candidate && candidate.type.startsWith('video/')) {
      onSelectFile(candidate);
    } else if (candidate) {
      onRejectFile(candidate);
    }
  };

  return (
    <aside className="panel media-panel">
      <div className="panel-heading">
        <span>Media</span>
      </div>
      <label
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          acceptFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          aria-label="Import source video"
          data-testid="media-import-input"
          type="file"
          accept="video/*"
          onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <UploadCloud size={24} />
        <span>Drop video</span>
      </label>
      {file ? (
        <div className="media-item active">
          <div className="media-thumb" aria-hidden="true">
            <FileVideo size={18} />
          </div>
          <div className="media-copy">
            <div className="media-name" data-testid="media-clip-name">
              {file.name}
            </div>
            <div className="media-meta">{bytesToSize(file.size)}</div>
          </div>
        </div>
      ) : projectMediaName ? (
        <button className="media-relink-card" type="button" onClick={onRequestMedia}>
          <div className="media-thumb media-thumb-restore" aria-hidden="true">
            <Link2 size={18} />
          </div>
          <div className="media-copy">
            <div className="media-name">Source needed</div>
            <div className="media-meta">{projectMediaName}</div>
          </div>
          <span>Relink</span>
        </button>
      ) : (
        <div className="empty-panel">No clip loaded</div>
      )}
      {children}
    </aside>
  );
}

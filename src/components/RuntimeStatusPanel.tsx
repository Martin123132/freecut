import { Check, Circle, CircleAlert, Cpu } from 'lucide-react';

export type RuntimeHealth = {
  checks?: {
    api?: boolean;
    ffmpeg?: boolean;
    storage?: boolean;
    web?: boolean;
  };
  dataRoot?: string;
  ffmpeg?: string;
  ok?: boolean;
  webRoot?: string | null;
};

type RuntimeStatus = {
  detail: string;
  id: string;
  label: string;
  state: 'ready' | 'active' | 'blocked';
};

type RuntimeStatusPanelProps = {
  health: RuntimeHealth | null;
};

export function RuntimeStatusPanel({ health }: RuntimeStatusPanelProps) {
  const statuses = buildRuntimeStatuses(health);
  const readyCount = statuses.filter((item) => item.state === 'ready').length;

  return (
    <section className="runtime-panel" aria-label="Local runtime preflight" data-testid="runtime-preflight">
      <div className="runtime-heading">
        <div>
          <Cpu size={15} />
          <span>Runtime</span>
        </div>
        <strong>
          {readyCount}/{statuses.length}
        </strong>
      </div>
      <div className="runtime-list">
        {statuses.map((item) => (
          <div className={`runtime-row ${item.state}`} data-testid={`runtime-row-${item.id}`} key={item.id}>
            <span className="runtime-icon" aria-hidden="true">
              {item.state === 'ready' ? <Check size={12} /> : item.state === 'blocked' ? <CircleAlert size={12} /> : <Circle size={12} />}
            </span>
            <span className="runtime-copy">
              <strong>{item.label}</strong>
              <em>{item.detail}</em>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildRuntimeStatuses(health: RuntimeHealth | null): RuntimeStatus[] {
  if (health === null) {
    return [
      { detail: 'Checking local API', id: 'api', label: 'Local API', state: 'active' },
      { detail: 'Waiting for API health', id: 'ffmpeg', label: 'FFmpeg', state: 'active' },
      { detail: 'Waiting for data root', id: 'storage', label: 'Storage', state: 'active' },
      { detail: 'Checking build server', id: 'web', label: 'Web app', state: 'active' }
    ];
  }

  if (!health.ok) {
    return [
      { detail: 'Start FreeCut locally to enable export', id: 'api', label: 'Local API', state: 'blocked' },
      { detail: 'Unavailable until API responds', id: 'ffmpeg', label: 'FFmpeg', state: 'blocked' },
      { detail: 'Unavailable until API responds', id: 'storage', label: 'Storage', state: 'blocked' },
      { detail: 'Current page is running without API health', id: 'web', label: 'Web app', state: 'active' }
    ];
  }

  const checks = health.checks ?? {};
  const apiReady = checks.api ?? health.ok;
  const ffmpegReady = checks.ffmpeg ?? Boolean(health.ffmpeg);
  const storageReady = checks.storage ?? Boolean(health.dataRoot);
  const webReady = checks.web ?? Boolean(health.webRoot);

  return [
    {
      detail: apiReady ? 'Local worker connected' : 'API did not report ready',
      id: 'api',
      label: 'Local API',
      state: apiReady ? 'ready' : 'blocked'
    },
    {
      detail: ffmpegReady ? formatPath(health.ffmpeg) : 'Renderer path missing',
      id: 'ffmpeg',
      label: 'FFmpeg',
      state: ffmpegReady ? 'ready' : 'blocked'
    },
    {
      detail: storageReady ? formatPath(health.dataRoot) : 'D-drive data root missing',
      id: 'storage',
      label: 'Storage',
      state: storageReady ? 'ready' : 'blocked'
    },
    {
      detail: webReady ? 'Production UI served by FreeCut' : 'Dev server or Pages preview',
      id: 'web',
      label: 'Web app',
      state: 'ready'
    }
  ];
}

function formatPath(value?: string | null) {
  if (!value) return 'Ready';
  const normalized = value.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 3) return value;
  return `${parts[0]}/.../${parts[parts.length - 1]}`;
}

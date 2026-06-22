import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Inspector } from './components/Inspector';
import { MediaPanel } from './components/MediaPanel';
import { Stage } from './components/Stage';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import { WorkflowGuide, WorkflowStep } from './components/WorkflowGuide';
import { ProjectPanel } from './components/ProjectPanel';
import { PreflightItem } from './components/ExportPreflight';
import { SettingsPanel } from './components/SettingsPanel';
import { CaptionCue, createCaptionCue, normalizeCaptions } from './lib/captions';
import { ExportProfile, defaultExportProfile, exportProfileFromId } from './lib/exportProfiles';
import { bytesToSize, clamp, formatTime } from './lib/format';
import {
  clearStoredProject,
  createProjectSnapshot,
  parseProjectText,
  presetFromProject,
  ProjectSnapshot,
  readStoredProject,
  serializeProject,
  writeStoredProject
} from './lib/project';
import { AspectPreset, aspectPresets } from './lib/presets';

type ExportState = 'idle' | 'exporting' | 'done' | 'error';
type LatestExport = {
  filename: string;
  projectKey: string;
  size: number;
  url: string;
};
type ExportJobStatus = {
  error?: string;
  id: string;
  message?: string;
  progress: number;
  status: 'queued' | 'running' | 'complete' | 'error' | 'canceled';
  updatedAt?: number;
};
type ApiHealth = {
  dataRoot?: string;
  ok?: boolean;
};
type NextMove = {
  action: () => void;
  disabled?: boolean;
  eyebrow: string;
  label: string;
  reason: string;
  title: string;
};
const defaultOverlayText = 'MAKE IT FREE';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [preset, setPreset] = useState<AspectPreset>(aspectPresets[0]);
  const [exportProfile, setExportProfile] = useState<ExportProfile>(defaultExportProfile);
  const [captions, setCaptions] = useState<CaptionCue[]>([]);
  const [overlayText, setOverlayText] = useState(defaultOverlayText);
  const [overlayX, setOverlayX] = useState(50);
  const [overlayY, setOverlayY] = useState(72);
  const [overlaySize, setOverlaySize] = useState(4.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [latestExport, setLatestExport] = useState<LatestExport | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectStatus, setProjectStatus] = useState('Autosave ready');
  const [projectMediaName, setProjectMediaName] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const projectHydratedRef = useRef(false);
  const skipInitialAutosaveRef = useRef(true);
  const skipNextAutosaveRef = useRef(false);
  const autosaveArmedRef = useRef(false);
  const pendingProjectRangeRef = useRef<{ trimStart: number; trimEnd: number } | null>(null);
  const exportInFlightRef = useRef(false);
  const exportAbortRef = useRef<AbortController | null>(null);
  const exportJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (latestExport) URL.revokeObjectURL(latestExport.url);
    };
  }, [latestExport]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 981px)');
    const resetDesktopScroll = () => {
      if (desktopQuery.matches) window.scrollTo({ top: 0, left: 0 });
    };

    resetDesktopScroll();
    desktopQuery.addEventListener('change', resetDesktopScroll);
    window.addEventListener('resize', resetDesktopScroll);

    return () => {
      desktopQuery.removeEventListener('change', resetDesktopScroll);
      window.removeEventListener('resize', resetDesktopScroll);
    };
  }, []);

  useEffect(() => {
    const savedProject = readStoredProject();
    if (savedProject) {
      applyProject(savedProject);
      setProjectStatus('Restored');
    }

    projectHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!settingsOpen || apiHealth) return;

    let canceled = false;
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : null))
      .then((health: ApiHealth | null) => {
        if (!canceled) setApiHealth(health);
      })
      .catch(() => {
        if (!canceled) setApiHealth({});
      });

    return () => {
      canceled = true;
    };
  }, [apiHealth, settingsOpen]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    window.setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }, []);

  const canExport = useMemo(() => Boolean(file && trimEnd > trimStart), [file, trimEnd, trimStart]);
  const activeCaptions = useMemo(
    () => captions.filter((caption) => currentTime >= caption.start && currentTime <= caption.end),
    [captions, currentTime]
  );
  const hasCaptionWork = captions.length > 0 || (Boolean(overlayText.trim()) && overlayText.trim() !== defaultOverlayText);
  const needsMediaRelink = Boolean(projectMediaName && !file);
  const exportProjectKey = useMemo(
    () =>
      JSON.stringify({
        captions: normalizeCaptions(captions, duration),
        exportProfileId: exportProfile.id,
        fileName: file?.name ?? projectMediaName,
        overlaySize,
        overlayText,
        overlayX,
        overlayY,
        presetId: preset.id,
        trimEnd,
        trimStart
      }),
    [captions, duration, exportProfile.id, file, overlaySize, overlayText, overlayX, overlayY, preset.id, projectMediaName, trimEnd, trimStart]
  );
  const latestExportIsCurrent = Boolean(latestExport && latestExport.projectKey === exportProjectKey);
  useEffect(() => {
    if (!projectHydratedRef.current) return;
    if (skipInitialAutosaveRef.current) {
      skipInitialAutosaveRef.current = false;
      return;
    }
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    if (!autosaveArmedRef.current) return;

    const snapshot = buildProjectSnapshot();
    writeStoredProject(snapshot);
    setProjectStatus('Autosaved');
  }, [captions, exportProfile, file, overlaySize, overlayText, overlayX, overlayY, preset, projectMediaName, trimEnd, trimStart]);

  const handleSelectFile = (nextFile: File) => {
    const expectedMediaName = projectMediaName;
    const pendingRange = pendingProjectRangeRef.current;

    autosaveArmedRef.current = true;
    clearLatestExport();
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(nextFile);
    setProjectMediaName(nextFile.name);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setDuration(0);
    setCurrentTime(pendingRange?.trimStart ?? 0);
    setTrimStart(pendingRange?.trimStart ?? 0);
    setTrimEnd(pendingRange?.trimEnd ?? 0);
    setIsPlaying(false);
    setExportState('idle');
    if (expectedMediaName) {
      const isExpectedSource = expectedMediaName === nextFile.name;
      setProjectStatus(isExpectedSource ? 'Relinked' : 'Media changed');
      setExportMessage(isExpectedSource ? 'Media relinked' : `Loaded ${nextFile.name}`);
    } else {
      setProjectStatus('Media loaded');
      setExportMessage('');
    }
  };

  const handleLoadedMetadata = () => {
    const nextDuration = videoRef.current?.duration ?? 0;
    const pendingRange = pendingProjectRangeRef.current;
    const nextTrimStart = pendingRange ? clamp(pendingRange.trimStart, 0, nextDuration) : 0;
    const nextTrimEnd = pendingRange
      ? clamp(pendingRange.trimEnd, Math.min(nextTrimStart + 0.1, nextDuration), nextDuration)
      : nextDuration;

    pendingProjectRangeRef.current = null;
    setDuration(nextDuration);
    setTrimStart(nextTrimStart);
    setTrimEnd(nextTrimEnd);
    setCurrentTime(nextTrimStart);
    if (videoRef.current) videoRef.current.currentTime = nextTrimStart;
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (trimEnd && video.currentTime >= trimEnd) {
      video.pause();
      setIsPlaying(false);
      video.currentTime = trimEnd;
    } else {
      setIsPlaying(!video.paused);
    }
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    const nextTime = clamp(time, 0, duration || 0);

    if (video) video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const restart = () => {
    seek(trimStart);
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const playPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const updateTrimStart = (value: number) => {
    autosaveArmedRef.current = true;
    setTrimStart(value);
    if (currentTime < value) seek(value);
  };

  const updateTrimEnd = (value: number) => {
    autosaveArmedRef.current = true;
    setTrimEnd(value);
    if (currentTime > value) seek(value);
  };

  const updatePreset = (nextPreset: AspectPreset) => {
    autosaveArmedRef.current = true;
    setPreset(nextPreset);
  };

  const updateExportProfile = (nextProfile: ExportProfile) => {
    autosaveArmedRef.current = true;
    setExportProfile(nextProfile);
  };

  const updateCaptions = (nextCaptions: CaptionCue[]) => {
    autosaveArmedRef.current = true;
    setCaptions(nextCaptions);
  };

  const updateOverlayText = (value: string) => {
    autosaveArmedRef.current = true;
    setOverlayText(value);
  };

  const updateOverlayX = (value: number) => {
    autosaveArmedRef.current = true;
    setOverlayX(value);
  };

  const updateOverlayY = (value: number) => {
    autosaveArmedRef.current = true;
    setOverlayY(value);
  };

  const updateOverlaySize = (value: number) => {
    autosaveArmedRef.current = true;
    setOverlaySize(value);
  };

  const resetTrimToFull = () => {
    if (!duration) return;

    autosaveArmedRef.current = true;
    setTrimStart(0);
    setTrimEnd(duration);
    seek(0);
  };

  const chooseVerticalFormat = () => {
    const verticalPreset = aspectPresets.find((item) => item.id === 'vertical') ?? aspectPresets[0];
    updatePreset(verticalPreset);
  };

  const addGuidedCaption = () => {
    autosaveArmedRef.current = true;
    const start = clamp(currentTime || trimStart, 0, duration || currentTime || 0);
    const end = duration ? Math.min(duration, Math.max(start + 0.1, start + 2)) : start + 2;
    setCaptions((items) => [...items, createCaptionCue(start, end, 'Say it clearly')]);
  };

  const buildProjectSnapshot = () =>
    createProjectSnapshot({
      mediaName: file?.name ?? projectMediaName,
      presetId: preset.id,
      exportProfileId: exportProfile.id,
      trimStart,
      trimEnd,
      overlayText,
      overlayX,
      overlayY,
      overlaySize,
      captions
    });

  const applyProject = (snapshot: ProjectSnapshot) => {
    const mediaMatchesLoadedFile = Boolean(file && snapshot.mediaName && file.name === snapshot.mediaName);
    const mediaConflictsLoadedFile = Boolean(file && snapshot.mediaName && file.name !== snapshot.mediaName);
    const shouldWaitForMedia = Boolean(snapshot.mediaName && !mediaMatchesLoadedFile);

    autosaveArmedRef.current = false;
    clearLatestExport();
    if (mediaConflictsLoadedFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      setDuration(0);
      setIsPlaying(false);
    }
    setProjectMediaName(snapshot.mediaName);
    setPreset(presetFromProject(snapshot));
    setExportProfile(exportProfileFromId(snapshot.exportProfileId));
    setTrimStart(snapshot.trimStart);
    setTrimEnd(snapshot.trimEnd);
    setCurrentTime(snapshot.trimStart);
    setOverlayText(snapshot.overlayText || defaultOverlayText);
    setOverlayX(snapshot.overlayX);
    setOverlayY(snapshot.overlayY);
    setOverlaySize(snapshot.overlaySize);
    setCaptions(snapshot.captions);
    pendingProjectRangeRef.current = shouldWaitForMedia
      ? { trimStart: snapshot.trimStart, trimEnd: snapshot.trimEnd }
      : null;
    setExportMessage(
      snapshot.mediaName
        ? mediaMatchesLoadedFile
          ? 'Project restored with media'
          : `Reload media: ${snapshot.mediaName}`
        : 'Project restored'
    );
  };

  const saveProjectFile = () => {
    const snapshot = buildProjectSnapshot();
    writeStoredProject(snapshot);
    setProjectStatus('Saved');

    const blob = new Blob([serializeProject(snapshot)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (file?.name ?? projectMediaName ?? 'freecut-project')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9-]+/gi, '-')
      .toLowerCase();
    link.href = downloadUrl;
    link.download = `${safeName || 'freecut-project'}.freecut.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const openProjectFile = async (projectFile: File) => {
    try {
      const snapshot = parseProjectText(await projectFile.text());
      applyProject(snapshot);
      writeStoredProject(snapshot);
      setProjectStatus('Opened');
    } catch {
      setProjectStatus('Open failed');
      setExportState('error');
      setExportMessage('Project file could not be opened');
    }
  };

  const resetProject = () => {
    autosaveArmedRef.current = false;
    skipNextAutosaveRef.current = true;
    clearStoredProject();
    pendingProjectRangeRef.current = null;
    setProjectMediaName(file?.name ?? null);
    setPreset(aspectPresets[0]);
    setExportProfile(defaultExportProfile);
    setCaptions([]);
    setOverlayText(defaultOverlayText);
    setOverlayX(50);
    setOverlayY(72);
    setOverlaySize(4.5);
    setTrimStart(0);
    setTrimEnd(duration || 0);
    setCurrentTime(0);
    setExportState('idle');
    setExportProgress(0);
    setExportMessage('Project reset');
    clearLatestExport();
    setProjectStatus('Reset');
  };

  const clearLatestExport = () => {
    setLatestExport((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const downloadUrl = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportClip = async () => {
    if (!file || !canExport || exportInFlightRef.current) return;

    const abortController = new AbortController();
    clearLatestExport();
    exportInFlightRef.current = true;
    exportAbortRef.current = abortController;
    exportJobIdRef.current = null;
    setExportState('exporting');
    setExportProgress(1);
    setExportMessage('Uploading source clip');

    const payload = new FormData();
    payload.append('video', file);
    payload.append('trimStart', String(trimStart));
    payload.append('trimEnd', String(trimEnd));
    payload.append('width', String(preset.width));
    payload.append('height', String(preset.height));
    payload.append('exportProfileId', exportProfile.id);
    payload.append('overlayText', overlayText);
    payload.append('overlayX', String(overlayX));
    payload.append('overlayY', String(overlayY));
    payload.append('overlaySize', String(overlaySize));
    payload.append('captions', JSON.stringify(normalizeCaptions(captions, duration)));

    try {
      const response = await fetch('/api/export/jobs', {
        method: 'POST',
        body: payload,
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Export failed');
      }

      const startedJob = (await response.json()) as ExportJobStatus;
      exportJobIdRef.current = startedJob.id;
      setExportProgress(clamp(startedJob.progress || 1, 1, 100));
      setExportMessage(startedJob.message || 'Queued export');
      const finishedJob = await waitForExportJob(startedJob.id, abortController.signal);
      if (finishedJob.status !== 'complete') throw new Error(finishedJob.error || 'Export failed');

      setExportMessage('Preparing download');
      const downloadResponse = await fetch(`/api/export/jobs/${startedJob.id}/download`, {
        signal: abortController.signal
      });
      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        throw new Error(errorText || 'Export download failed');
      }

      const blob = await downloadResponse.blob();
      const filename = `freecut-${Date.now()}.mp4`;
      const url = URL.createObjectURL(blob);
      downloadUrl(url, filename);
      setLatestExport({
        filename,
        projectKey: exportProjectKey,
        size: blob.size,
        url
      });
      setExportState('done');
      setExportProgress(100);
      setExportMessage('Export ready');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExportState('idle');
        setExportProgress(0);
        setExportMessage('Export canceled');
      } else {
        const message = error instanceof Error ? error.message : 'Export failed';
        setExportState('error');
        setExportMessage(message.startsWith('Export') ? message : `Export failed - ${message}`);
      }
    } finally {
      exportInFlightRef.current = false;
      exportAbortRef.current = null;
      exportJobIdRef.current = null;
    }
  };

  const waitForExportJob = async (jobId: string, signal: AbortSignal): Promise<ExportJobStatus> => {
    while (true) {
      if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');

      const response = await fetch(`/api/export/jobs/${jobId}`, { signal });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Export status failed');
      }

      const job = (await response.json()) as ExportJobStatus;
      setExportProgress(clamp(job.progress, 0, 100));
      setExportMessage(job.message || exportMessageForJob(job));
      if (job.status === 'complete' || job.status === 'error' || job.status === 'canceled') return job;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  };

  const exportMessageForJob = (job: ExportJobStatus) => {
    if (job.status === 'queued') return 'Queued export';
    if (job.status === 'running') return 'Rendering MP4';
    if (job.status === 'complete') return 'Export ready';
    if (job.status === 'canceled') return 'Export canceled';
    return job.error ? `Export failed - ${job.error}` : 'Export failed';
  };

  const cancelExport = () => {
    if (!exportInFlightRef.current) return;

    exportAbortRef.current?.abort();
    const jobId = exportJobIdRef.current;
    if (jobId) void fetch(`/api/export/jobs/${jobId}`, { method: 'DELETE' }).catch(() => undefined);
    setExportMessage('Canceling export');
  };

  const downloadLatestExport = () => {
    if (!latestExport) return;
    downloadUrl(latestExport.url, latestExport.filename);
    setExportMessage(latestExportIsCurrent ? 'Export downloaded' : 'Previous export downloaded');
  };

  const requestMedia = () => mediaInputRef.current?.click();
  const hasCustomOverlayText = Boolean(overlayText.trim()) && overlayText.trim() !== defaultOverlayText;
  const preflightItems: PreflightItem[] = [
    {
      id: 'source',
      label: 'Source',
      value: file ? 'Loaded' : needsMediaRelink ? 'Relink source' : 'Needed',
      state: file ? 'ready' : 'blocked',
      actionLabel: file ? undefined : needsMediaRelink ? 'Relink' : 'Import',
      onAction: file ? undefined : requestMedia
    },
    {
      id: 'range',
      label: 'Range',
      value: canExport ? formatTime(trimEnd - trimStart) : file ? 'Waiting' : 'No media',
      state: canExport ? 'ready' : file ? 'active' : 'blocked',
      actionLabel: file && duration && !canExport ? 'Full' : undefined,
      onAction: file && duration && !canExport ? resetTrimToFull : undefined
    },
    {
      id: 'frame',
      label: 'Frame',
      value: preset.label,
      state: 'ready',
      actionLabel: preset.id === 'vertical' ? undefined : '9:16',
      onAction: preset.id === 'vertical' ? undefined : chooseVerticalFormat
    },
    {
      id: 'quality',
      label: 'Quality',
      value: exportProfile.label,
      state: 'ready'
    },
    {
      id: 'read',
      label: 'Read',
      value: captions.length ? `${captions.length} cue${captions.length === 1 ? '' : 's'}` : hasCustomOverlayText ? 'Text active' : 'Clean',
      state: hasCaptionWork ? 'ready' : 'active',
      actionLabel: hasCaptionWork ? undefined : 'Add cue',
      onAction: hasCaptionWork ? undefined : addGuidedCaption
    }
  ];
  const readyItemCount = preflightItems.filter((item) => item.state === 'ready').length;
  const readinessLabel = `${readyItemCount}/${preflightItems.length} ready`;
  const preflightPrimaryLabel = canExport
    ? exportState === 'exporting'
      ? 'Cancel'
      : 'Export'
    : file && duration
      ? 'Full range'
      : file
        ? 'Finish'
        : needsMediaRelink
          ? 'Relink'
          : 'Import';
  const preflightPrimaryDisabled = canExport ? false : file ? !duration : false;
  const handlePreflightPrimaryAction = () => {
    if (exportState === 'exporting') {
      cancelExport();
      return;
    }

    if (canExport) {
      void exportClip();
      return;
    }

    if (!file) requestMedia();
    if (file && duration) resetTrimToFull();
  };

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'import',
      title: needsMediaRelink ? 'Reload source clip' : 'Bring in a clip',
      detail: file
        ? 'Clip loaded. You are on the board.'
        : projectMediaName
          ? `Waiting for ${projectMediaName}.`
          : 'Start with one video file from this machine.',
      actionLabel: file ? 'Loaded' : needsMediaRelink ? 'Relink' : 'Import',
      status: file ? 'done' : 'active',
      onAction: requestMedia
    },
    {
      id: 'shape',
      title: 'Choose the frame',
      detail: preset.id === 'vertical' ? 'Vertical export is armed for short-form.' : 'Pick the canvas that matches the final post.',
      actionLabel: preset.id === 'vertical' ? 'Set' : '9:16',
      status: preset.id === 'vertical' ? 'done' : 'ready',
      onAction: chooseVerticalFormat
    },
    {
      id: 'captions',
      title: 'Make it readable',
      detail: captions.length ? `${captions.length} caption cue${captions.length === 1 ? '' : 's'} ready.` : 'Draft captions before or after loading a clip.',
      actionLabel: captions.length ? 'Add more' : 'Add cue',
      status: hasCaptionWork ? 'done' : 'ready',
      onAction: addGuidedCaption
    },
    {
      id: 'export',
      title: 'Ship the cut',
      detail: exportState === 'exporting' ? `Rendering ${exportProfile.label} MP4 at ${Math.round(exportProgress)}%.` : canExport ? 'Everything needed for an MP4 export is ready.' : 'Load a clip and keep a valid trim range.',
      actionLabel: exportState === 'exporting' ? 'Working' : 'Export',
      actionDisabled: exportState === 'exporting',
      status: canExport ? 'ready' : 'locked',
      onAction: exportClip
    }
  ];
  const nextMove: NextMove = needsMediaRelink
    ? {
        action: requestMedia,
        eyebrow: 'Next',
        label: 'Relink',
        reason: 'FreeCut can restore the timeline after the original file is chosen.',
        title: `Reload ${projectMediaName}`
      }
    : !file
      ? {
          action: requestMedia,
          eyebrow: 'Next',
          label: 'Import',
          reason: 'A source clip unlocks trimming, captions, and export.',
          title: 'Bring in a clip'
        }
      : file && !duration
        ? {
            action: requestMedia,
            disabled: true,
            eyebrow: 'Reading',
            label: 'Loading',
            reason: 'FreeCut is checking the clip length before it opens the export route.',
            title: 'Reading clip'
          }
      : file && duration && !canExport
        ? {
            action: resetTrimToFull,
            eyebrow: 'Next',
            label: 'Full range',
            reason: 'The export needs a non-empty trim range before it can ship.',
            title: 'Set a valid range'
          }
        : canExport
            ? {
                action: exportState === 'exporting' ? cancelExport : exportClip,
                disabled: exportState === 'exporting' && !exportInFlightRef.current,
                eyebrow: exportState === 'exporting' ? 'Rendering' : 'Ready',
                label: exportState === 'exporting' ? 'Cancel' : 'Export',
                reason: exportState === 'exporting' ? 'Stop this render and keep editing.' : 'All required checks are ready for a local MP4.',
                title: exportState === 'exporting' ? `${Math.round(exportProgress)}% complete` : 'Ship the cut'
              }
            : !hasCaptionWork
              ? {
                  action: addGuidedCaption,
                  eyebrow: 'Optional',
                  label: 'Add cue',
                  reason: 'Captions make short clips easier to watch muted.',
                  title: 'Make it readable'
                }
            : {
                action: requestMedia,
                eyebrow: 'Next',
                label: 'Import',
                reason: 'A source clip unlocks trimming, captions, and export.',
                title: 'Bring in a clip'
              };

  return (
    <div className="app-shell">
      <TopBar
        canExport={canExport}
        exporting={exportState === 'exporting'}
        onCancelExport={cancelExport}
        onExport={exportClip}
        onSettings={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButtonRef}
      />
      <div className="workspace">
        <MediaPanel
          file={file}
          inputRef={mediaInputRef}
          projectMediaName={projectMediaName}
          onSelectFile={handleSelectFile}
          onRequestMedia={requestMedia}
        >
          <ProjectPanel
            mediaName={file?.name ?? projectMediaName}
            status={projectStatus}
            inputRef={projectInputRef}
            onSaveProject={saveProjectFile}
            onOpenProject={openProjectFile}
            onResetProject={resetProject}
          />
          <WorkflowGuide steps={workflowSteps} />
        </MediaPanel>
        <Stage
          preset={preset}
          previewUrl={previewUrl}
          videoRef={videoRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          trimStart={trimStart}
          trimEnd={trimEnd}
          activeCaptions={activeCaptions}
          missingMediaName={needsMediaRelink ? projectMediaName : null}
          overlayText={overlayText}
          overlayX={overlayX}
          overlayY={overlayY}
          overlaySize={overlaySize}
          onPlayPause={playPause}
          onSeek={seek}
          onRestart={restart}
          onRequestMedia={requestMedia}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
        />
        <Inspector
          preset={preset}
          exportProfile={exportProfile}
          captions={captions}
          currentTime={currentTime}
          duration={duration}
          isExporting={exportState === 'exporting'}
          preflightItems={preflightItems}
          preflightPrimaryLabel={preflightPrimaryLabel}
          preflightPrimaryDisabled={preflightPrimaryDisabled}
          overlayText={overlayText}
          overlayX={overlayX}
          overlayY={overlayY}
          overlaySize={overlaySize}
          onCaptionsChange={updateCaptions}
          onExportProfileChange={updateExportProfile}
          onPresetChange={updatePreset}
          onOverlayTextChange={updateOverlayText}
          onOverlayXChange={updateOverlayX}
          onOverlayYChange={updateOverlayY}
          onOverlaySizeChange={updateOverlaySize}
          onPreflightPrimaryAction={handlePreflightPrimaryAction}
          onSeek={seek}
        />
      </div>
      <footer className="bottom-dock">
        <Timeline
          currentTime={currentTime}
          duration={duration}
          previewUrl={previewUrl}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onSeek={seek}
          onTrimStartChange={updateTrimStart}
          onTrimEndChange={updateTrimEnd}
        />
        <div className="dock-command-panel">
          <button
            className="next-move"
            type="button"
            data-testid="next-move"
            aria-label={`${nextMove.eyebrow}: ${nextMove.title}. ${nextMove.reason} ${nextMove.label}`}
            disabled={nextMove.disabled}
            onClick={nextMove.action}
          >
            <span>
              <small>{nextMove.eyebrow}</small>
              <strong>{nextMove.title}</strong>
              <em>{nextMove.reason}</em>
            </span>
            <b>{nextMove.label}</b>
          </button>
          <div className="dock-readiness" data-testid="dock-readiness" aria-label={`Project readiness: ${readinessLabel}`}>
            <span>{readinessLabel}</span>
            <div className="readiness-pips">
              {preflightItems.map((item) => (
                <button
                  className={item.state}
                  type="button"
                  aria-label={`${item.label}: ${item.value}${item.actionLabel ? `. ${item.actionLabel}` : ''}`}
                  disabled={!item.onAction}
                  key={item.id}
                  onClick={item.onAction}
                  title={`${item.label}: ${item.value}`}
                />
              ))}
            </div>
          </div>
          <div className={`export-status ${exportState}`} data-testid="export-status">
            <span>
              {exportState === 'exporting'
                ? `${exportMessage || `Rendering ${exportProfile.label} MP4`} - ${Math.round(exportProgress)}%`
                : exportState === 'done' && latestExport
                  ? `${latestExportIsCurrent ? 'Export ready' : 'Previous export'} - ${bytesToSize(latestExport.size)}`
                  : exportMessage || 'Idle'}
            </span>
            {exportState === 'exporting' ? (
              <div className="export-progress" aria-label="Export progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(exportProgress)} role="progressbar">
                <span style={{ width: `${clamp(exportProgress, 0, 100)}%` }} />
              </div>
            ) : null}
            {exportState === 'exporting' ? (
              <button className="status-cancel" type="button" onClick={cancelExport}>
                Cancel
              </button>
            ) : exportState === 'error' && canExport ? (
              <button className="status-retry" type="button" onClick={() => void exportClip()}>
                Retry
              </button>
            ) : latestExport ? (
              <button className="status-download" type="button" onClick={downloadLatestExport}>
                Download again
              </button>
            ) : null}
          </div>
        </div>
      </footer>
      {settingsOpen ? (
        <SettingsPanel
          apiDataRoot={apiHealth?.dataRoot ?? ''}
          exportLabel={exportProfile.label}
          latestExportSize={latestExport?.size ?? null}
          mediaName={file?.name ?? projectMediaName}
          presetLabel={preset.label}
          projectStatus={projectStatus}
          onClose={closeSettings}
          onDownloadLatest={downloadLatestExport}
          onResetProject={resetProject}
          onSaveProject={saveProjectFile}
        />
      ) : null}
    </div>
  );
}

export default App;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Inspector } from './components/Inspector';
import { MediaPanel } from './components/MediaPanel';
import { Stage } from './components/Stage';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import { WorkflowGuide, WorkflowStep } from './components/WorkflowGuide';
import { MissionRail, MissionRailStep } from './components/MissionRail';
import { ProjectPanel } from './components/ProjectPanel';
import { PreflightItem } from './components/ExportPreflight';
import { SettingsPanel } from './components/SettingsPanel';
import { QuickStartPanel } from './components/QuickStartPanel';
import { ShortcutHintStrip } from './components/ShortcutHintStrip';
import { CommandAction, CommandPalette } from './components/CommandPalette';
import { CaptionCue, createCaptionCue, normalizeCaptions } from './lib/captions';
import { CaptionStyle, captionStyleFromId, defaultCaptionStyle } from './lib/captionStyles';
import { buildExportReadiness } from './lib/exportEstimate';
import { SessionExport } from './lib/exportHistory';
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
const QUICKSTART_KEY = 'freecut.quickstart.v1';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [preset, setPreset] = useState<AspectPreset>(aspectPresets[0]);
  const [exportProfile, setExportProfile] = useState<ExportProfile>(defaultExportProfile);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(defaultCaptionStyle);
  const [captions, setCaptions] = useState<CaptionCue[]>([]);
  const [overlayText, setOverlayText] = useState(defaultOverlayText);
  const [overlayX, setOverlayX] = useState(50);
  const [overlayY, setOverlayY] = useState(72);
  const [overlaySize, setOverlaySize] = useState(4.5);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportHistory, setExportHistory] = useState<SessionExport[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
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
  const exportHistoryRef = useRef<SessionExport[]>([]);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(QUICKSTART_KEY);
      if (!dismissed) setShowQuickStart(true);
    } catch {
      // Best effort: keep guide visible if localStorage is unavailable.
      setShowQuickStart(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    exportHistoryRef.current = exportHistory;
  }, [exportHistory]);

  useEffect(() => {
    return () => {
      exportHistoryRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

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
  const hasCustomOverlayText = Boolean(overlayText.trim()) && overlayText.trim() !== defaultOverlayText;
  const hasCaptionWork = captions.length > 0 || hasCustomOverlayText;
  const quickStartProgress = [Boolean(file), preset.id === 'vertical', hasCaptionWork, canExport].filter(Boolean).length;
  const needsMediaRelink = Boolean(projectMediaName && !file);
  const exportDuration = canExport ? Math.max(0, trimEnd - trimStart) : 0;
  const quickStartHint = useMemo(() => {
    if (needsMediaRelink) {
      return `Relink ${projectMediaName} to reopen this path.`;
    }
    if (!file) {
      return 'Next: import a local clip.';
    }
    if (preset.id !== 'vertical') {
      return 'Next: set the 9:16 frame for short-form export.';
    }
    if (!hasCaptionWork) {
      return 'Optional: add captions for muted viewing.';
    }
    if (!canExport) {
      return 'Next: set a valid trim range, then ship.';
    }

    return 'Mission ready — export is local.';
  }, [canExport, file, hasCaptionWork, needsMediaRelink, preset.id, projectMediaName]);

  const exportReadiness = useMemo(
    () =>
      buildExportReadiness({
        captionCount: captions.length,
        captionStyle,
        cropX,
        cropY,
        durationSeconds: exportDuration,
        hasOverlayText: hasCustomOverlayText,
        preset,
        profile: exportProfile,
        sourceLoaded: Boolean(file)
      }),
    [captions.length, captionStyle, cropX, cropY, exportDuration, exportProfile, file, hasCustomOverlayText, preset]
  );
  const exportProjectKey = useMemo(
    () =>
      JSON.stringify({
        captions: normalizeCaptions(captions, duration),
        captionStyleId: captionStyle.id,
        exportProfileId: exportProfile.id,
        fileName: file?.name ?? projectMediaName,
        cropX,
        cropY,
        overlaySize,
        overlayText,
        overlayX,
        overlayY,
        presetId: preset.id,
        trimEnd,
        trimStart
      }),
    [captions, captionStyle.id, cropX, cropY, duration, exportProfile.id, file, overlaySize, overlayText, overlayX, overlayY, preset.id, projectMediaName, trimEnd, trimStart]
  );
  const latestExport = exportHistory[0] ?? null;
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
  }, [captions, captionStyle, cropX, cropY, exportProfile, file, overlaySize, overlayText, overlayX, overlayY, preset, projectMediaName, trimEnd, trimStart]);

  const handleSelectFile = (nextFile: File) => {
    const expectedMediaName = projectMediaName;
    const pendingRange = pendingProjectRangeRef.current;

    autosaveArmedRef.current = true;
    clearExportHistory();
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

  const updateCaptionStyle = (nextStyle: CaptionStyle) => {
    autosaveArmedRef.current = true;
    setCaptionStyle(nextStyle);
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

  const updateCropX = (value: number) => {
    autosaveArmedRef.current = true;
    setCropX(value);
  };

  const updateCropY = (value: number) => {
    autosaveArmedRef.current = true;
    setCropY(value);
  };

  const centerCrop = () => {
    autosaveArmedRef.current = true;
    setCropX(50);
    setCropY(50);
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
      captionStyleId: captionStyle.id,
      trimStart,
      trimEnd,
      overlayText,
      overlayX,
      overlayY,
      overlaySize,
      cropX,
      cropY,
      captions
    });

  const applyProject = (snapshot: ProjectSnapshot) => {
    const mediaMatchesLoadedFile = Boolean(file && snapshot.mediaName && file.name === snapshot.mediaName);
    const mediaConflictsLoadedFile = Boolean(file && snapshot.mediaName && file.name !== snapshot.mediaName);
    const shouldWaitForMedia = Boolean(snapshot.mediaName && !mediaMatchesLoadedFile);

    autosaveArmedRef.current = false;
    clearExportHistory();
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
    setCaptionStyle(captionStyleFromId(snapshot.captionStyleId));
    setTrimStart(snapshot.trimStart);
    setTrimEnd(snapshot.trimEnd);
    setCurrentTime(snapshot.trimStart);
    setOverlayText(snapshot.overlayText || defaultOverlayText);
    setOverlayX(snapshot.overlayX);
    setOverlayY(snapshot.overlayY);
    setOverlaySize(snapshot.overlaySize);
    setCropX(snapshot.cropX);
    setCropY(snapshot.cropY);
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
    setCaptionStyle(defaultCaptionStyle);
    setCaptions([]);
    setOverlayText(defaultOverlayText);
    setOverlayX(50);
    setOverlayY(72);
    setOverlaySize(4.5);
    setCropX(50);
    setCropY(50);
    setTrimStart(0);
    setTrimEnd(duration || 0);
    setCurrentTime(0);
    setExportState('idle');
    setExportProgress(0);
    setExportMessage('Project reset');
    clearExportHistory();
    setProjectStatus('Reset');
  };

  const clearExportHistory = () => {
    setExportHistory((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
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
    const startedDurationLabel = formatTime(trimEnd - trimStart);
    const startedPresetLabel = preset.label;
    const startedProfileLabel = exportProfile.label;
    const startedProjectKey = exportProjectKey;
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
    payload.append('captionStyleId', captionStyle.id);
    payload.append('overlayText', overlayText);
    payload.append('overlayX', String(overlayX));
    payload.append('overlayY', String(overlayY));
    payload.append('overlaySize', String(overlaySize));
    payload.append('cropX', String(cropX));
    payload.append('cropY', String(cropY));
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
      const createdAt = Date.now();
      const filename = `freecut-${createdAt}.mp4`;
      const url = URL.createObjectURL(blob);
      downloadUrl(url, filename);
      setExportHistory((current) => {
        const nextExport: SessionExport = {
          createdAt,
          durationLabel: startedDurationLabel,
          filename,
          id: startedJob.id,
          presetLabel: startedPresetLabel,
          profileLabel: startedProfileLabel,
          projectKey: startedProjectKey,
          size: blob.size,
          url
        };
        const next = [nextExport, ...current].slice(0, 5);
        const retainedUrls = new Set(next.map((item) => item.url));
        current.forEach((item) => {
          if (!retainedUrls.has(item.url)) URL.revokeObjectURL(item.url);
        });
        return next;
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

  const dismissQuickStart = () => {
    setShowQuickStart(false);
    try {
      window.localStorage.setItem(QUICKSTART_KEY, '1');
    } catch {
      // localStorage is optional for this preference on this platform.
    }
  };

  const openQuickStart = () => {
    setShowQuickStart(true);
    try {
      window.localStorage.removeItem(QUICKSTART_KEY);
    } catch {
      // localStorage is optional for this preference on this platform.
    }
  };

  const downloadExportFromHistory = (id: string) => {
    const item = exportHistory.find((exportItem) => exportItem.id === id);
    if (!item) return;

    downloadUrl(item.url, item.filename);
    setExportMessage(item.projectKey === exportProjectKey ? 'Export downloaded' : 'Previous export downloaded');
  };

  const downloadLatestExport = () => {
    if (!latestExport) return;
    downloadExportFromHistory(latestExport.id);
  };

  const requestMedia = () => mediaInputRef.current?.click();

  const missionRailSteps = useMemo<MissionRailStep[]>(() => {
    return [
      {
        id: 'source',
        label: 'Source',
        status: needsMediaRelink || !file ? 'active' : 'done',
        description: needsMediaRelink
          ? `Relink ${projectMediaName}`
          : file
            ? 'Local source loaded'
            : 'Import a local clip',
        actionLabel: needsMediaRelink ? 'Relink' : file ? 'Replace' : 'Import',
        onAction: requestMedia
      },
      {
        id: 'frame',
        label: 'Frame',
        status:
          preset.id === 'vertical'
            ? 'done'
            : file
              ? 'ready'
              : needsMediaRelink
                ? 'locked'
                : 'locked',
        description: preset.id === 'vertical' ? '9:16 set for short-form' : 'Choose social canvas width',
        actionLabel: preset.id === 'vertical' ? 'Set' : 'Set 9:16',
        onAction: chooseVerticalFormat,
        disabled: !file || needsMediaRelink
      },
      {
        id: 'captions',
        label: 'Captions',
        status: hasCaptionWork ? 'done' : file ? 'ready' : needsMediaRelink ? 'locked' : 'locked',
        description: hasCaptionWork
          ? `${captions.length} cue${captions.length === 1 ? '' : 's'} ready`
          : file
            ? 'Optional: add captions + style'
            : 'Add subtitles for muted playback',
        actionLabel: hasCaptionWork ? 'Tweak' : 'Add cue',
        onAction: file ? addGuidedCaption : requestMedia,
        disabled: !file || needsMediaRelink
      },
      {
        id: 'export',
        label: 'Export',
        status: canExport ? 'done' : file ? 'active' : 'locked',
        description: canExport
          ? `${Math.round(exportDuration)}s export path ready`
          : file
            ? 'Set a valid trim range to ship'
            : 'Unlock after loading source',
        actionLabel: canExport ? 'Export MP4' : file ? 'Full range' : 'Import',
        onAction: canExport ? exportClip : file && duration ? resetTrimToFull : requestMedia
      }
    ];
  }, [
    addGuidedCaption,
    canExport,
    captions.length,
    chooseVerticalFormat,
    duration,
    exportClip,
    file,
    hasCaptionWork,
    needsMediaRelink,
    preset.id,
    projectMediaName,
    requestMedia,
    resetTrimToFull,
    exportDuration
  ]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const normalized = event.key.toLowerCase();
      const isSpace = normalized === ' ' || normalized === 'spacebar' || event.code === 'Space';
      const isQuestionCommand = normalized === '?' || (normalized === '/' && event.shiftKey);
      if (isQuestionCommand) {
        event.preventDefault();
        setShowCommandPalette((current) => !current);
        return;
      }

      if (event.shiftKey && normalized === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (isSpace && file && duration) {
        event.preventDefault();
        void playPause();
        return;
      }

      if (normalized === 'i') {
        event.preventDefault();
        requestMedia();
        return;
      }

      if (normalized === 'q') {
        event.preventDefault();
        openQuickStart();
        return;
      }

      if (normalized === 'c' && file) {
        event.preventDefault();
        addGuidedCaption();
        return;
      }

      if (normalized === 'e' && file) {
        event.preventDefault();
        if (exportState === 'exporting') {
          cancelExport();
        } else if (canExport) {
          void exportClip();
        }
        return;
      }

      if (normalized === 's') {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }

      if (normalized === 'f' && preset.id !== 'vertical') {
        event.preventDefault();
        chooseVerticalFormat();
        return;
      }

      if (normalized === 'r' && file && duration && !canExport) {
        event.preventDefault();
        resetTrimToFull();
        return;
      }

      if (file && duration && (normalized === 'arrowleft' || normalized === 'arrowright')) {
        const delta = normalized === 'arrowleft' ? -1 : 1;
        const nextTime = clamp(currentTime + delta, 0, duration);
        event.preventDefault();
        seek(nextTime);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    addGuidedCaption,
    canExport,
    chooseVerticalFormat,
    cancelExport,
    currentTime,
    duration,
    exportClip,
    exportState,
    file,
    openQuickStart,
    playPause,
    preset.id,
    requestMedia,
    resetTrimToFull,
    seek
  ]);

  useEffect(() => {
    if (!showCommandPalette) return;
    const handleClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleClose);
    return () => window.removeEventListener('keydown', handleClose);
  }, [showCommandPalette]);

  const closeCommandPalette = () => {
    setShowCommandPalette(false);
  };

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

  const shortcutHints = [
    { keyHint: 'I', label: 'Import your source', enabled: true },
    {
      keyHint: 'Space',
      label: file ? (isPlaying ? 'Pause preview' : 'Play preview') : 'Play preview (load clip first)',
      enabled: Boolean(file && duration),
      disabledReason: file ? undefined : 'Load a clip first'
    },
    {
      keyHint: 'C',
      label: 'Add caption cue',
      enabled: Boolean(file),
      disabledReason: file ? undefined : 'Load a clip first'
    },
    {
      keyHint: 'F',
      label: 'Set 9:16 frame',
      enabled: preset.id !== 'vertical',
      disabledReason: 'Vertical frame already set'
    },
    {
      keyHint: 'R',
      label: 'Fill timeline',
      enabled: Boolean(file && duration && !canExport),
      disabledReason: canExport ? 'Range already full/ready' : file ? 'Range trims loaded' : 'Load a clip first'
    },
    {
      keyHint: 'E',
      label: exportState === 'exporting' ? 'Cancel render' : 'Export MP4',
      enabled: exportState === 'exporting' || canExport
    },
    {
      keyHint: 'S',
      label: 'Settings',
      enabled: true
    },
    {
      keyHint: 'Left/Right',
      label: 'Nudge playhead',
      enabled: Boolean(file && duration)
    },
    {
      keyHint: 'Q',
      label: 'Open mission map',
      enabled: true
    }
  ];

  const commandActions = useMemo<CommandAction[]>(() => {
    const canPlayPause = Boolean(file && duration);
    const canAddCaption = Boolean(file);
    const canExportAction = canExport || exportState === 'exporting';
    const canFrame = preset.id !== 'vertical';
    const canResetTrim = Boolean(file && duration && !canExport);

    return [
      {
        id: 'import',
        label: 'Import clip',
        description: projectMediaName ? `Relink ${projectMediaName} to continue` : 'Start your route with a local source',
        keyHint: 'I',
        onActivate: requestMedia,
        disabled: false
      },
      {
        id: 'frame',
        label: 'Set 9:16 frame',
        description: canFrame ? 'Choose this first for short-form output' : 'Already tuned for short-form',
        keyHint: 'F',
        onActivate: chooseVerticalFormat,
        disabled: !canFrame
      },
      {
        id: 'caption',
        label: 'Add a caption cue',
        description: canAddCaption
          ? 'Optional: add a subtitle cue and style for muted playback'
          : 'Load a clip to enable captioning',
        keyHint: 'C',
        onActivate: addGuidedCaption,
        disabled: !canAddCaption
      },
      {
        id: 'trim',
        label: 'Reset trim',
        description: canResetTrim
          ? 'Set a safe export range baseline'
          : file
            ? canExport
              ? 'Export is ready'
              : 'Trim already spans full range'
            : 'Load a clip before trimming',
        keyHint: 'R',
        onActivate: resetTrimToFull,
        disabled: !canResetTrim,
        disabledReason: canExport ? 'Range ready' : file ? undefined : 'Load a clip first'
      },
      {
        id: 'export',
        label: exportState === 'exporting' ? 'Cancel render' : 'Export MP4',
        description: canExportAction ? 'Run local render to MP4, or stop it if needed' : 'Need a source and valid trim range',
        keyHint: 'E',
        onActivate: () => {
          if (exportState === 'exporting') {
            cancelExport();
            return;
          }

          if (canExport) void exportClip();
        },
        disabled: !canExportAction
      },
      {
        id: 'playpause',
        label: isPlaying ? 'Pause playback' : 'Play playback',
        description: canPlayPause ? 'Review current scene timing' : 'Load a clip first',
        keyHint: 'Space',
        onActivate: playPause,
        disabled: !canPlayPause
      },
      {
        id: 'settings',
        label: 'Open settings',
        description: 'Review export history and project state',
        keyHint: 'S',
        onActivate: () => setSettingsOpen(true),
        disabled: false
      },
      {
        id: 'start',
        label: 'Open mission map',
        description: 'Review the mission map and lock onto your next move.',
        keyHint: 'Q',
        onActivate: openQuickStart,
        disabled: false
      }
    ];
  }, [
    addGuidedCaption,
    canExport,
    cancelExport,
    chooseVerticalFormat,
    exportClip,
    exportState,
    file,
    isPlaying,
    playPause,
    preset.id,
    projectMediaName,
    requestMedia,
    resetTrimToFull,
    openQuickStart,
    duration
  ]);

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'import',
      title: needsMediaRelink ? 'Reload source clip' : 'Bring in a clip',
      detail: file
        ? `Source "${file?.name}" loaded. Start refining your route.`
        : projectMediaName
          ? `Waiting for ${projectMediaName}.`
          : 'Load one local clip to start your first run.',
      actionLabel: file ? 'Loaded' : needsMediaRelink ? 'Relink' : 'Import',
      status: file ? 'done' : 'active',
      onAction: requestMedia
    },
    {
      id: 'shape',
      title: 'Choose the frame',
      detail: preset.id === 'vertical' ? 'Vertical export is armed and tuned for short-form.' : 'Pick the final canvas shape before moving forward.',
      actionLabel: preset.id === 'vertical' ? 'Set' : '9:16',
      status: preset.id === 'vertical' ? 'done' : 'ready',
      onAction: chooseVerticalFormat
    },
    {
      id: 'captions',
      title: 'Make it readable',
      detail: hasCaptionWork
        ? `${captions.length} caption cue${captions.length === 1 ? '' : 's'} ready to improve muted viewing.`
        : file
          ? 'Optional: add cues and choose a style for muted playback.'
          : 'Import a clip to enable captioning.',
      actionLabel: hasCaptionWork ? 'Add more' : 'Add cue',
      optional: true,
      status: hasCaptionWork ? 'done' : file ? 'ready' : 'locked',
      actionDisabled: !file,
      onAction: file ? addGuidedCaption : requestMedia
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
          <ShortcutHintStrip items={shortcutHints} />
          {showQuickStart ? (
            <QuickStartPanel
              canAddCaptions={Boolean(file)}
              hasCaptionWork={hasCaptionWork}
              canExport={canExport}
              fileNeedsImport={Boolean(!file)}
              isFormatReady={preset.id === 'vertical'}
              onAddCaption={addGuidedCaption}
              onChooseFormat={chooseVerticalFormat}
              onDismiss={dismissQuickStart}
              onExport={exportClip}
              onImport={requestMedia}
              projectMediaName={projectMediaName}
              progress={quickStartProgress}
              progressTotal={4}
            />
          ) : (
            <MissionRail steps={missionRailSteps} hint={`Mission map ${quickStartHint}`} onOpenMap={openQuickStart} />
          )}
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
          captionStyle={captionStyle}
          missingMediaName={needsMediaRelink ? projectMediaName : null}
          overlayText={overlayText}
          overlayX={overlayX}
          overlayY={overlayY}
          overlaySize={overlaySize}
          cropX={cropX}
          cropY={cropY}
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
          exportReadiness={exportReadiness}
          captionStyle={captionStyle}
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
          cropX={cropX}
          cropY={cropY}
          onCaptionsChange={updateCaptions}
          onCaptionStyleChange={updateCaptionStyle}
          onExportProfileChange={updateExportProfile}
          onPresetChange={updatePreset}
          onOverlayTextChange={updateOverlayText}
          onOverlayXChange={updateOverlayX}
          onOverlayYChange={updateOverlayY}
          onOverlaySizeChange={updateOverlaySize}
          onCropXChange={updateCropX}
          onCropYChange={updateCropY}
          onCropCenter={centerCrop}
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
          exportHistory={exportHistory}
          mediaName={file?.name ?? projectMediaName}
          presetLabel={preset.label}
          projectStatus={projectStatus}
          onClose={closeSettings}
          onDownloadExport={downloadExportFromHistory}
          onResetProject={resetProject}
          onSaveProject={saveProjectFile}
        />
      ) : null}
      <CommandPalette actions={commandActions} open={showCommandPalette} onClose={closeCommandPalette} />
    </div>
  );
}

export default App;

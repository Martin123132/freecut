import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import ffmpegStaticPath from 'ffmpeg-static';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataRoot = process.env.FREECUT_DATA_DIR || path.join(projectRoot, 'data');
const uploadDir = path.join(dataRoot, 'uploads');
const exportDir = path.join(dataRoot, 'exports');
const webRoot = process.env.FREECUT_WEB_ROOT ? path.resolve(process.env.FREECUT_WEB_ROOT) : path.join(projectRoot, 'dist');
const webIndexPath = path.join(webRoot, 'index.html');
const port = Number(process.env.PORT || 5174);
const ffmpegPath = process.env.FREECUT_FFMPEG_PATH || ffmpegStaticPath;
const exportJobs = new Map();
const exportProfiles = {
  quick: {
    ffmpegPreset: 'veryfast',
    crf: '24',
    audioBitrate: '128k'
  },
  balanced: {
    ffmpegPreset: 'veryfast',
    crf: '20',
    audioBitrate: '160k'
  },
  master: {
    ffmpegPreset: 'slow',
    crf: '17',
    audioBitrate: '192k'
  }
};
const captionStyles = {
  clean: {
    id: 'clean',
    fontColor: 'white',
    box: true,
    boxColor: 'black@0.72',
    boxBorderFactor: 0.36,
    borderFactor: 0,
    fontsizeFactor: 0.038,
    uppercase: false
  },
  'bold-box': {
    id: 'bold-box',
    fontColor: 'black',
    box: true,
    boxColor: 'white@0.94',
    boxBorderFactor: 0.42,
    borderFactor: 0.05,
    borderColor: 'black@0.84',
    fontsizeFactor: 0.04,
    uppercase: false
  },
  'shorts-pop': {
    id: 'shorts-pop',
    fontColor: '0xFFE94A',
    box: false,
    borderFactor: 0.14,
    borderColor: 'black@0.95',
    shadow: true,
    fontsizeFactor: 0.046,
    uppercase: true
  }
};

function assertDDrive(targetPath) {
  if (process.platform !== 'win32') return;

  const root = path.parse(path.resolve(targetPath)).root.toUpperCase();
  if (root !== 'D:\\') {
    throw new Error(`FreeCut refuses to write outside D: (${targetPath})`);
  }
}

assertDDrive(projectRoot);
assertDDrive(dataRoot);
assertDDrive(webRoot);
await fsp.mkdir(uploadDir, { recursive: true });
await fsp.mkdir(exportDir, { recursive: true });

if (!ffmpegPath) {
  throw new Error('ffmpeg-static did not resolve a binary for this platform.');
}

const app = express();
app.use(cors({ origin: true }));

const storage = multer.diskStorage({
  destination: (_request, _file, done) => {
    done(null, uploadDir);
  },
  filename: (_request, file, done) => {
    const extension = path.extname(file.originalname) || '.mp4';
    done(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 900
  }
});

app.get('/api/health', (_request, response) => {
  const webAvailable = fs.existsSync(webIndexPath);

  response.json({
    checks: {
      api: true,
      ffmpeg: Boolean(ffmpegPath),
      storage: true,
      web: webAvailable
    },
    ok: true,
    ffmpeg: ffmpegPath,
    dataRoot,
    webRoot: webAvailable ? webRoot : null
  });
});

app.post('/api/export', upload.single('video'), async (request, response) => {
  const inputPath = request.file?.path;
  const outputPath = path.join(exportDir, `${crypto.randomUUID()}.mp4`);
  const abortController = new AbortController();

  if (!inputPath) {
    response.status(400).send('Missing video file.');
    return;
  }

  if (request.aborted) abortController.abort();
  request.on('aborted', () => abortController.abort());
  response.on('close', () => {
    if (!response.writableEnded) {
      abortController.abort();
      void cleanup(inputPath, outputPath);
    }
  });

  try {
    const trimStart = readNumber(request.body.trimStart, 0, 0, Number.MAX_SAFE_INTEGER);
    const trimEnd = readNumber(request.body.trimEnd, trimStart + 0.1, trimStart + 0.1, Number.MAX_SAFE_INTEGER);
    const width = readNumber(request.body.width, 1920, 360, 3840);
    const height = readNumber(request.body.height, 1080, 360, 3840);
    const overlayX = readNumber(request.body.overlayX, 50, 0, 100);
    const overlayY = readNumber(request.body.overlayY, 72, 0, 100);
    const overlaySize = readNumber(request.body.overlaySize, 4.5, 1, 12);
    const cropX = readNumber(request.body.cropX, 50, 0, 100);
    const cropY = readNumber(request.body.cropY, 50, 0, 100);
    const overlayText = String(request.body.overlayText || '').trim();
    const exportProfile = readExportProfile(request.body.exportProfileId);
    const captionStyle = readCaptionStyle(request.body.captionStyleId);
    const duration = Math.max(0.1, trimEnd - trimStart);
    const captions = parseCaptions(request.body.captions, trimStart, duration);
    const filter = buildVideoFilter({
      width: Math.round(width),
      height: Math.round(height),
      overlayText,
      overlayX,
      overlayY,
      overlaySize,
      cropX,
      cropY,
      captionStyle,
      captions
    });

    await runFfmpeg([
      '-y',
      '-ss',
      trimStart.toFixed(3),
      '-i',
      inputPath,
      '-t',
      duration.toFixed(3),
      '-vf',
      filter,
      '-c:v',
      'libx264',
      '-preset',
      exportProfile.ffmpegPreset,
      '-crf',
      exportProfile.crf,
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      exportProfile.audioBitrate,
      '-movflags',
      '+faststart',
      outputPath
    ], abortController.signal);

    response.download(outputPath, 'freecut-export.mp4', async () => {
      await cleanup(inputPath, outputPath);
    });
  } catch (error) {
    await cleanup(inputPath, outputPath);
    response.status(500).send(error instanceof Error ? error.message : 'Export failed.');
  }
});

app.post('/api/export/jobs', upload.single('video'), async (request, response) => {
  const inputPath = request.file?.path;

  if (!inputPath) {
    response.status(400).send('Missing video file.');
    return;
  }

  try {
    const exportPlan = createExportPlan(request.body, inputPath);
    const id = crypto.randomUUID();
    const abortController = new AbortController();
    const job = {
      id,
      abortController,
      createdAt: Date.now(),
      error: '',
      filename: 'freecut-export.mp4',
      inputPath,
      message: 'Queued export',
      outputPath: exportPlan.outputPath,
      progress: 0,
      status: 'queued',
      updatedAt: Date.now()
    };

    exportJobs.set(id, job);
    response.status(202).json(toJobStatus(job));
    void runExportJob(job, exportPlan.args);
  } catch (error) {
    await cleanup(inputPath);
    response.status(500).send(error instanceof Error ? error.message : 'Export failed.');
  }
});

app.get('/api/export/jobs/:id', (request, response) => {
  const job = exportJobs.get(request.params.id);

  if (!job) {
    response.status(404).send('Export job was not found.');
    return;
  }

  response.json(toJobStatus(job));
});

app.delete('/api/export/jobs/:id', async (request, response) => {
  const job = exportJobs.get(request.params.id);

  if (!job) {
    response.status(404).send('Export job was not found.');
    return;
  }

  if (job.status === 'queued' || job.status === 'running') {
    job.status = 'canceled';
    job.error = 'Export canceled.';
    job.message = 'Export canceled';
    job.updatedAt = Date.now();
    job.abortController.abort();
  }

  await cleanup(job.inputPath, job.outputPath);
  exportJobs.delete(job.id);
  response.status(204).end();
});

app.get('/api/export/jobs/:id/download', (request, response) => {
  const job = exportJobs.get(request.params.id);

  if (!job) {
    response.status(404).send('Export job was not found.');
    return;
  }

  if (job.status !== 'complete') {
    response.status(409).send('Export is not ready.');
    return;
  }

  response.download(job.outputPath, job.filename, async () => {
    await cleanup(job.inputPath, job.outputPath);
    exportJobs.delete(job.id);
  });
});

if (fs.existsSync(webIndexPath)) {
  app.use(express.static(webRoot));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/')) {
      next();
      return;
    }

    response.sendFile(webIndexPath);
  });
}

app.listen(port, '127.0.0.1', () => {
  console.log(`FreeCut API listening at http://127.0.0.1:${port}`);
  console.log(`Data root: ${dataRoot}`);
  if (fs.existsSync(webIndexPath)) {
    console.log(`FreeCut web listening at http://127.0.0.1:${port}`);
  } else {
    console.log('FreeCut web build not found. Run npm run build to serve the production UI from this server.');
  }
});

function createExportPlan(body, inputPath) {
  const outputPath = path.join(exportDir, `${crypto.randomUUID()}.mp4`);
  const trimStart = readNumber(body.trimStart, 0, 0, Number.MAX_SAFE_INTEGER);
  const trimEnd = readNumber(body.trimEnd, trimStart + 0.1, trimStart + 0.1, Number.MAX_SAFE_INTEGER);
  const width = readNumber(body.width, 1920, 360, 3840);
  const height = readNumber(body.height, 1080, 360, 3840);
  const overlayX = readNumber(body.overlayX, 50, 0, 100);
  const overlayY = readNumber(body.overlayY, 72, 0, 100);
  const overlaySize = readNumber(body.overlaySize, 4.5, 1, 12);
  const cropX = readNumber(body.cropX, 50, 0, 100);
  const cropY = readNumber(body.cropY, 50, 0, 100);
  const overlayText = String(body.overlayText || '').trim();
  const exportProfile = readExportProfile(body.exportProfileId);
  const captionStyle = readCaptionStyle(body.captionStyleId);
  const duration = Math.max(0.1, trimEnd - trimStart);
  const captions = parseCaptions(body.captions, trimStart, duration);
  const filter = buildVideoFilter({
    width: Math.round(width),
    height: Math.round(height),
    overlayText,
    overlayX,
    overlayY,
    overlaySize,
    cropX,
    cropY,
    captionStyle,
    captions
  });

  return {
    duration,
    outputPath,
    args: [
      '-y',
      '-ss',
      trimStart.toFixed(3),
      '-i',
      inputPath,
      '-t',
      duration.toFixed(3),
      '-vf',
      filter,
      '-c:v',
      'libx264',
      '-preset',
      exportProfile.ffmpegPreset,
      '-crf',
      exportProfile.crf,
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      exportProfile.audioBitrate,
      '-movflags',
      '+faststart',
      outputPath
    ]
  };
}

async function runExportJob(job, args) {
  job.status = 'running';
  job.message = 'Rendering MP4';
  job.updatedAt = Date.now();

  try {
    await runFfmpeg(args, job.abortController.signal, (progress) => {
      job.progress = Math.max(job.progress, Math.min(99, progress));
      job.message = job.progress >= 98 ? 'Finalizing MP4' : 'Rendering MP4';
      job.updatedAt = Date.now();
    });
    job.status = 'complete';
    job.progress = 100;
    job.message = 'Export ready';
    job.updatedAt = Date.now();
  } catch (error) {
    if (job.status !== 'canceled') {
      job.status = job.abortController.signal.aborted ? 'canceled' : 'error';
      job.error = error instanceof Error ? error.message : 'Export failed.';
      job.message = job.status === 'canceled' ? 'Export canceled' : 'Export failed';
      job.updatedAt = Date.now();
    }
    await cleanup(job.inputPath, job.outputPath);
    if (job.status === 'canceled') exportJobs.delete(job.id);
  }
}

function toJobStatus(job) {
  return {
    id: job.id,
    error: job.error,
    message: job.message,
    progress: job.progress,
    status: job.status,
    updatedAt: job.updatedAt
  };
}

function buildVideoFilter({ width, height, overlayText, overlayX, overlayY, overlaySize, cropX, cropY, captionStyle, captions }) {
  const filters = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}:(in_w-out_w)*${cropX / 100}:(in_h-out_h)*${cropY / 100}`,
    'setsar=1'
  ];
  const defaultFont = resolveDefaultFont();
  const fontOption = fs.existsSync(defaultFont) ? `:fontfile='${escapeFilterPath(defaultFont)}'` : '';

  if (overlayText) {
    const fontsize = Math.round((height * overlaySize) / 100);
    filters.push(
      `drawtext=text='${escapeDrawText(overlayText)}'${fontOption}:fontcolor=white:fontsize=${fontsize}:borderw=${Math.max(2, Math.round(fontsize * 0.08))}:bordercolor=black@0.9:x=(w-text_w)*${overlayX / 100}:y=(h-text_h)*${overlayY / 100}`
    );
  }

  captions.forEach((caption) => {
    filters.push(buildCaptionFilter({ caption, captionStyle, fontOption, height }));
  });

  return filters.join(',');
}

function buildCaptionFilter({ caption, captionStyle, fontOption, height }) {
  const fontsize = Math.max(26, Math.round(height * captionStyle.fontsizeFactor));
  const text = captionStyle.uppercase ? caption.text.toUpperCase() : caption.text;
  const options = [
    `text='${escapeDrawText(text)}'`,
    fontOption.replace(/^:/, ''),
    `fontcolor=${captionStyle.fontColor}`,
    `fontsize=${fontsize}`,
    `x=(w-text_w)/2`,
    `y=h-(text_h*2.4)`,
    `enable='between(t,${caption.start.toFixed(3)},${caption.end.toFixed(3)})'`
  ].filter(Boolean);

  if (captionStyle.box) {
    options.push('box=1');
    options.push(`boxcolor=${captionStyle.boxColor}`);
    options.push(`boxborderw=${Math.round(fontsize * captionStyle.boxBorderFactor)}`);
  }

  if (captionStyle.borderFactor) {
    options.push(`borderw=${Math.max(2, Math.round(fontsize * captionStyle.borderFactor))}`);
    options.push(`bordercolor=${captionStyle.borderColor}`);
  }

  if (captionStyle.shadow) {
    options.push('shadowx=2');
    options.push('shadowy=3');
    options.push('shadowcolor=black@0.72');
  }

  return `drawtext=${options.join(':')}`;
}

function resolveDefaultFont() {
  const systemRoot = process.env.WINDIR || process.env.SystemRoot;
  return systemRoot ? path.join(systemRoot, 'Fonts', 'arial.ttf') : '';
}

function parseCaptions(value, trimStart, duration) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((caption) => {
        const sourceStart = readNumber(caption?.start, 0, 0, Number.MAX_SAFE_INTEGER);
        const sourceEnd = readNumber(caption?.end, 0, 0, Number.MAX_SAFE_INTEGER);
        const start = Math.max(0, sourceStart - trimStart);
        const end = Math.min(duration, sourceEnd - trimStart);
        return {
          start,
          end,
          text: String(caption?.text || '').trim().slice(0, 280)
        };
      })
      .filter((caption) => caption.text && caption.end > caption.start)
      .slice(0, 100);
  } catch {
    return [];
  }
}

function readNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function readExportProfile(value) {
  const key = String(value || 'balanced');
  return exportProfiles[key] || exportProfiles.balanced;
}

function readCaptionStyle(value) {
  const key = String(value || 'clean');
  return captionStyles[key] || captionStyles.clean;
}

function escapeDrawText(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, ' ');
}

function escapeFilterPath(value) {
  return value.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function runFfmpeg(args, signal, onProgress) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const duration = readProgressDuration(args);
    const ffmpegArgs = onProgress ? [...args.slice(0, -1), '-progress', 'pipe:3', '-nostats', args.at(-1)] : args;
    const child = spawn(ffmpegPath, ffmpegArgs, {
      stdio: onProgress ? ['ignore', 'ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
      env: {
        ...process.env,
        TMP: process.env.TMP || 'D:\\codex-tmp',
        TEMP: process.env.TEMP || 'D:\\codex-tmp'
      }
    });
    const abort = () => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error('Export canceled.'));
    };

    let stderr = '';
    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener('abort', abort, { once: true });
    if (onProgress && child.stdio[3]) {
      child.stdio[3].setEncoding('utf8');
      child.stdio[3].on('data', (chunk) => {
        parseProgressChunk(chunk, duration, onProgress);
      });
    }
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      signal?.removeEventListener('abort', abort);
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort);
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.split(/\r?\n/).filter(Boolean).slice(-8).join('\n') || `FFmpeg exited with ${code}`));
    });
  });
}

function readProgressDuration(args) {
  const index = args.indexOf('-t');
  if (index === -1) return 0;

  const duration = Number(args[index + 1]);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function parseProgressChunk(chunk, duration, onProgress) {
  if (!duration) return;

  String(chunk)
    .split(/\r?\n/)
    .forEach((line) => {
      const [key, value] = line.split('=');
      if (key !== 'out_time_ms') return;

      const micros = Number(value);
      if (!Number.isFinite(micros)) return;
      onProgress(Math.round((micros / 1_000_000 / duration) * 100));
    });
}

async function cleanup(...files) {
  const targets = files.filter(Boolean);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const remaining = [];
    await Promise.all(
      targets.map(async (file) => {
        try {
          await fsp.unlink(file);
        } catch (error) {
          if (error?.code !== 'ENOENT') remaining.push(file);
        }
      })
    );

    if (!remaining.length) return;
    targets.length = 0;
    targets.push(...remaining);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await Promise.all(
    targets.map(async (file) => {
      try {
        await fsp.unlink(file);
      } catch {
        // Best-effort cleanup only.
      }
    })
  );
}

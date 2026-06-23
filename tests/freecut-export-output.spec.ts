import { expect, test } from '@playwright/test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { createSmokeVideo } from './support/createSmokeVideo';

type ApiServer = {
  child: ChildProcessWithoutNullStreams;
  logs: () => string;
};

type ExportJobStatus = {
  error?: string;
  id: string;
  message?: string;
  progress: number;
  status: 'queued' | 'running' | 'complete' | 'error' | 'canceled';
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('API export creates a real MP4 with the requested frame and trim', async ({}, testInfo) => {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static did not resolve a local binary.');
  }

  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const sourcePath = testInfo.outputPath('freecut-real-export-source.webm');
  const outputPath = testInfo.outputPath('freecut-real-export-output.mp4');
  const dataDir = testInfo.outputPath('api-data');
  const tempDir = testInfo.outputPath('api-temp');

  await mkdir(dataDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  await createSmokeVideo(sourcePath);

  const api = startApiServer({ dataDir, port, tempDir });

  try {
    await waitForApi(baseUrl, api);

    const formData = new FormData();
    formData.append('video', new Blob([new Uint8Array(await readFile(sourcePath))], { type: 'video/webm' }), 'freecut-source.webm');
    formData.append('trimStart', '0.200');
    formData.append('trimEnd', '1.200');
    formData.append('width', '1080');
    formData.append('height', '1920');
    formData.append('exportProfileId', 'balanced');
    formData.append('captionStyleId', 'shorts-pop');
    formData.append('overlayText', '');
    formData.append('cropX', '80');
    formData.append('cropY', '35');
    formData.append('captions', JSON.stringify([{ start: 0.3, end: 0.9, text: 'Real output' }]));

    const startResponse = await fetch(`${baseUrl}/api/export/jobs`, {
      body: formData,
      method: 'POST'
    });
    expect(startResponse.status).toBe(202);

    const startedJob = (await startResponse.json()) as ExportJobStatus;
    const finishedJob = await waitForExportComplete(baseUrl, startedJob.id);
    expect(finishedJob.status).toBe('complete');
    expect(finishedJob.progress).toBe(100);

    const downloadResponse = await fetch(`${baseUrl}/api/export/jobs/${startedJob.id}/download`);
    expect(downloadResponse.status).toBe(200);
    await writeFile(outputPath, new Uint8Array(await downloadResponse.arrayBuffer()));

    const outputStat = await stat(outputPath);
    expect(outputStat.size).toBeGreaterThan(10_000);

    const media = await inspectMedia(outputPath);
    expect(media.width).toBe(1080);
    expect(media.height).toBe(1920);
    expect(media.duration).toBeGreaterThan(0.85);
    expect(media.duration).toBeLessThan(1.25);
  } finally {
    await stopApiServer(api);
  }
});

function startApiServer({ dataDir, port, tempDir }: { dataDir: string; port: number; tempDir: string }): ApiServer {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      FREECUT_DATA_DIR: dataDir,
      PORT: String(port),
      TEMP: tempDir,
      TMP: tempDir
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';

  child.stdout.on('data', (chunk) => {
    logs += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    logs += String(chunk);
  });

  return {
    child,
    logs: () => logs
  };
}

async function waitForApi(baseUrl: string, api: ApiServer) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (api.child.exitCode !== null) {
      throw new Error(`FreeCut API exited before it became ready.\n${api.logs()}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The API may still be binding its local port.
    }

    await delay(250);
  }

  throw new Error(`FreeCut API did not become ready.\n${api.logs()}`);
}

async function waitForExportComplete(baseUrl: string, jobId: string) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/export/jobs/${jobId}`);
    expect(response.status).toBe(200);
    const job = (await response.json()) as ExportJobStatus;

    if (job.status === 'complete') return job;
    if (job.status === 'error' || job.status === 'canceled') {
      throw new Error(job.error || job.message || `Export finished with ${job.status}.`);
    }

    await delay(500);
  }

  throw new Error('Timed out waiting for FreeCut export to complete.');
}

async function inspectMedia(filePath: string) {
  const stderr = await runFfmpegInspect(filePath);
  const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const dimensionMatch = stderr.match(/Video:[^\n\r]+?(\d{2,5})x(\d{2,5})(?:\s|\[|,)/);

  if (!durationMatch || !dimensionMatch) {
    throw new Error(`Could not inspect exported media.\n${stderr}`);
  }

  return {
    duration: Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]),
    height: Number(dimensionMatch[2]),
    width: Number(dimensionMatch[1])
  };
}

async function runFfmpegInspect(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(ffmpegPath as string, ['-hide_banner', '-i', filePath], {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', () => {
      resolve(stderr);
    });
  });
}

async function getOpenPort() {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  if (!address || typeof address === 'string') {
    throw new Error('Could not reserve a local API port.');
  }

  return address.port;
}

async function stopApiServer(api: ApiServer) {
  if (api.child.exitCode !== null || api.child.signalCode !== null) return;

  const closed = once(api.child, 'close');
  api.child.kill();
  await Promise.race([closed, delay(3000)]);

  if (api.child.exitCode === null && api.child.signalCode === null) {
    api.child.kill('SIGKILL');
    await Promise.race([closed, delay(1000)]);
  }
}

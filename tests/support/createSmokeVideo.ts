import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export async function createSmokeVideo(outputPath: string) {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static did not resolve a local binary.');
  }

  await mkdir(dirname(outputPath), { recursive: true });

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=320x180:rate=24',
    '-t',
    '1.4',
    '-an',
    '-c:v',
    'libvpx',
    '-pix_fmt',
    'yuv420p',
    '-b:v',
    '256k',
    '-deadline',
    'realtime',
    '-cpu-used',
    '8',
    outputPath
  ];

  await new Promise<void>((resolve, reject) => {
    const process = spawn(ffmpegPath, args);
    let stderr = '';

    process.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Failed to create smoke video with ffmpeg-static: ${stderr || `exit ${code}`}`));
    });
  });
}

import { expect, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';

test('runtime preflight reports the local worker, FFmpeg, storage, and production web status', async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        checks: {
          api: true,
          ffmpeg: true,
          storage: true,
          web: true
        },
        dataRoot: 'D:\\codex-projects\\open-video-editor\\data',
        ffmpeg: 'D:\\codex-projects\\open-video-editor\\node_modules\\ffmpeg-static\\ffmpeg.exe',
        ok: true,
        webRoot: 'D:\\codex-projects\\open-video-editor\\dist'
      })
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('runtime-preflight')).toContainText('Runtime');
  await expect(page.getByTestId('runtime-row-api')).toContainText('Local worker connected');
  await expect(page.getByTestId('runtime-row-ffmpeg')).toContainText('ffmpeg.exe');
  await expect(page.getByTestId('runtime-row-storage')).toContainText('data');
  await expect(page.getByTestId('runtime-row-web')).toContainText('Production UI served by FreeCut');
});

test('runtime preflight explains when the local API is missing', async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 503,
      body: JSON.stringify({ ok: false })
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('runtime-row-api')).toContainText('Start FreeCut locally to enable export');
  await expect(page.getByTestId('runtime-row-ffmpeg')).toContainText('Unavailable until API responds');
  await expect(page.getByTestId('runtime-row-storage')).toContainText('Unavailable until API responds');
  await expect(page.getByTestId('runtime-row-web')).toContainText('Current page is running without API health');
});

test('runtime preflight blocks export when the local worker is unavailable', async ({ page }, testInfo) => {
  const smokeVideoPath = testInfo.outputPath('freecut-runtime-blocked.webm');
  await createSmokeVideo(smokeVideoPath);

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 503,
      body: JSON.stringify({ ok: false })
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });

  await expect(page.getByTestId('preflight-row-source')).toContainText('Loaded');
  await expect(page.getByTestId('preflight-row-range')).not.toContainText('Waiting');
  await expect(page.getByTestId('preflight-row-runtime')).toContainText('Start FreeCut');
  await expect(page.getByTestId('dock-export-plan')).toContainText('Local worker unavailable - no cloud fallback');
  await expect(page.getByTestId('next-move')).toContainText('Start local worker');

  await page.getByTestId('next-move').click();
  await expect(page.getByTestId('export-status')).toContainText('Export blocked - local API or FFmpeg worker is unavailable');
  await expect(page.getByTestId('export-center')).toContainText('Local worker unavailable - no cloud fallback');
});

import { expect, test } from '@playwright/test';

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

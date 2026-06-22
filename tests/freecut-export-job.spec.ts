import { expect, Page, test, TestInfo } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';

async function importSmokeClip(page: Page, testInfo: TestInfo) {
  const smokeVideoPath = testInfo.outputPath('freecut-export-smoke.webm');
  await createSmokeVideo(smokeVideoPath);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });
}

test('export job progress reaches ready state', async ({ page }, testInfo) => {
  let statusPolls = 0;

  await page.route('**/api/export/jobs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      status: 202,
      body: JSON.stringify({
        id: 'export-smoke-job',
        message: 'Queued export',
        progress: 1,
        status: 'queued',
        updatedAt: Date.now()
      })
    });
  });

  await page.route('**/api/export/jobs/export-smoke-job', async (route) => {
    statusPolls += 1;
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify(
        statusPolls < 2
          ? {
              id: 'export-smoke-job',
              message: 'Rendering MP4',
              progress: 48,
              status: 'running',
              updatedAt: Date.now()
            }
          : {
              id: 'export-smoke-job',
              message: 'Export ready',
              progress: 100,
              status: 'complete',
              updatedAt: Date.now()
            }
      )
    });
  });

  await page.route('**/api/export/jobs/export-smoke-job/download', async (route) => {
    await route.fulfill({
      body: Buffer.from('freecut smoke mp4'),
      contentType: 'video/mp4',
      headers: {
        'content-disposition': 'attachment; filename="freecut-export.mp4"'
      },
      status: 200
    });
  });

  await importSmokeClip(page, testInfo);

  await page.getByTestId('next-move').click();
  await expect(page.getByTestId('export-status')).toContainText('Queued export');
  await expect(page.getByTestId('export-status')).toContainText('Export ready');
  await expect(page.getByRole('button', { name: 'Download again' })).toBeVisible();
});

test('export failures offer retry without losing the clip', async ({ page }, testInfo) => {
  await page.route('**/api/export/jobs', async (route) => {
    await route.fulfill({
      body: 'FFmpeg could not render this clip',
      status: 500
    });
  });

  await importSmokeClip(page, testInfo);

  await page.getByTestId('next-move').click();
  await expect(page.getByTestId('export-status')).toContainText('Export failed - FFmpeg could not render this clip');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByTestId('media-clip-name')).toHaveText('freecut-export-smoke.webm');
});

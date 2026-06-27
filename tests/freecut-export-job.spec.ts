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

async function setRangeValue(page: Page, label: string, value: string) {
  await page.getByLabel(label).evaluate(
    (element, nextValue) => {
      const input = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(input, nextValue);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    value
  );
}

test('export job progress reaches ready state', async ({ page }, testInfo) => {
  let exportBody = '';
  let statusPolls = 0;

  await page.route('**/api/export/jobs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    exportBody = route.request().postData() ?? '';
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

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        dataRoot: 'FreeCut smoke API',
        ok: true
      })
    });
  });

  await importSmokeClip(page, testInfo);
  await page.locator('.preset', { hasText: '9:16' }).click();
  await page.getByRole('button', { name: 'Add caption' }).click();
  await page.getByRole('radio', { name: /Shorts Pop/ }).click();
  await setRangeValue(page, 'Focus X', '80');
  await setRangeValue(page, 'Focus Y', '35');
  await expect(page.locator('video')).toHaveCSS('object-position', '80% 35%');
  await expect(page.locator('.stage-caption-text')).toHaveClass(/caption-style-shorts-pop/);
  await expect(page.getByTestId('export-readiness')).toContainText('1080 x 1920');
  await expect(page.getByTestId('export-readiness')).toContainText('Shorts Pop');
  await expect(page.getByTestId('export-readiness')).toContainText(/~\d/);
  await expect(page.getByTestId('dock-export-plan')).toContainText('Balanced MP4');
  await expect(page.getByTestId('dock-export-plan')).toContainText('Shorts Pop');
  await expect(page.getByTestId('dock-export-plan')).toContainText('Local FFmpeg worker - no cloud upload');

  await page.getByTestId('next-move').click();
  await expect(page.getByTestId('export-status')).toContainText(/Queued export|Rendering MP4|Preparing local render/);
  await expect(page.getByTestId('export-status')).toContainText('Export ready');
  await expect(page.getByTestId('export-status').getByRole('button', { name: /Download freecut-/ })).toBeVisible();
  await expect(page.getByTestId('export-status').getByRole('button', { name: /Download freecut-/ })).toContainText('Download MP4');
  await page.getByRole('button', { name: 'Open Export Center' }).click();
  await expect(page.getByTestId('export-center')).toContainText('Current render');
  await expect(page.getByTestId('export-center')).toContainText('Source clip');
  await expect(page.getByTestId('export-center')).toContainText('Export history');
  await expect(page.getByTestId('export-center-source')).toContainText('Linked');
  await expect(page.getByTestId('export-center-source')).toContainText('freecut-export-smoke.webm');
  await expect(page.getByTestId('export-history-list')).toContainText('Balanced');
  await expect(page.getByTestId('export-history-list')).toContainText('9:16');
  await expect(page.getByTestId('export-history-list')).toContainText('Shorts Pop');
  await expect(page.getByTestId('export-history-list')).toContainText('17 B');
  await expect(page.getByTestId('export-history-list')).toContainText('Ready now');
  await expect(page.getByTestId('export-history-list').getByRole('button', { name: /Download freecut-/ })).toBeVisible();
  await expect(page.getByTestId('export-history-list').getByRole('button', { name: /Render freecut-/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close Export Center' }).click();
  await page.reload();
  await expect(page.getByTestId('recent-projects')).toContainText('freecut-export-smoke.webm');
  await expect(page.getByTestId('export-status')).toContainText('Reload media: freecut-export-smoke.webm');
  await page.getByRole('button', { name: 'Open Export Center' }).click();
  await expect(page.getByTestId('export-center')).toContainText('Source needed');
  await expect(page.getByTestId('export-center-source')).toContainText('Relink needed');
  await expect(page.getByTestId('export-center-source')).toContainText('FreeCut does not store or upload the video');
  await expect(page.getByTestId('export-center-source').getByRole('button', { name: 'Relink source' })).toBeVisible();
  await expect(page.getByTestId('export-history-list')).toContainText('freecut-');
  await expect(page.getByTestId('export-history-list')).toContainText('Restore route');
  await page.getByTestId('export-history-list').getByRole('button', { name: /Restore route/ }).click();
  await expect(page.getByTestId('next-move')).toContainText('Relink');
  await expect(page.getByTestId('export-status')).toContainText('Route restored');
  expect(exportBody).toMatch(/name="cropX"[\s\S]*80/);
  expect(exportBody).toMatch(/name="cropY"[\s\S]*35/);
  expect(exportBody).toMatch(/name="captionStyleId"[\s\S]*shorts-pop/);
  expect(exportBody).toMatch(/name="captions"[\s\S]*New caption/);
  expect(exportBody).toMatch(/name="width"[\s\S]*1080/);
  expect(exportBody).toMatch(/name="height"[\s\S]*1920/);
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

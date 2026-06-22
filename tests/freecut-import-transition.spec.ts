import { expect, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';

test('imported clip metadata unlocks FreeCut dock readiness', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const smokeVideoPath = testInfo.outputPath('freecut-import-smoke.webm');

  await createSmokeVideo(smokeVideoPath);

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle('FreeCut');
  await expect(page.getByText('Load a video')).toBeVisible();
  await expect(page.getByTestId('dock-readiness')).toHaveAttribute('aria-label', 'Project readiness: 2/5 ready');
  await expect(page.getByTestId('next-move')).toContainText('Bring in a clip');

  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);

  await expect(page.getByTestId('media-clip-name')).toHaveText('freecut-import-smoke.webm');
  await expect(page.locator('video')).toHaveAttribute('src', /blob:/);

  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });

  await expect(page.getByTestId('preflight-row-source')).toContainText('Loaded');
  await expect(page.getByTestId('preflight-row-range')).not.toContainText('Waiting');
  await expect(page.getByTestId('dock-readiness')).toHaveAttribute('aria-label', 'Project readiness: 4/5 ready');
  await expect(page.getByTestId('next-move')).toContainText('Ship the cut');
  await expect(page.getByTestId('next-move')).toContainText('Export');
  await expect(page.getByTestId('next-move')).toBeEnabled();
  await expect(page.getByTestId('timeline-rail')).toHaveAttribute('role', 'slider');
  await expect(page.getByTestId('export-status')).toContainText('Idle');

  const screenshotPath = testInfo.outputPath('import-ready.png');
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('import-ready', { path: screenshotPath, contentType: 'image/png' });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

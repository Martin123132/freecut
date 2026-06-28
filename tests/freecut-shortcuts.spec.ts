import { expect, Page, TestInfo, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';
import { mockHealthyRuntime } from './support/mockRuntimeHealth';

test.beforeEach(async ({ page }) => {
  await mockHealthyRuntime(page);
});

async function importSmokeClip(page: Page, testInfo: TestInfo) {
  const smokeVideoPath = testInfo.outputPath('freecut-shortcuts-smoke.webm');
  await createSmokeVideo(smokeVideoPath);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });
}

test('keyboard shortcuts speed through the core path', async ({ page }, testInfo) => {
  await importSmokeClip(page, testInfo);

  await expect(page.getByText('Quick controls')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo edit' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Redo edit' })).toBeDisabled();

  await page.keyboard.press('c');
  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Undo edit' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Redo edit' })).toBeDisabled();

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
  await expect(page.locator('.caption-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo edit' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Redo edit' })).toBeEnabled();

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y');
  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Undo edit' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Redo edit' })).toBeDisabled();

  await page.keyboard.press('f');
  await expect(page.getByTestId('preflight-row-frame')).toContainText('9:16');
  await page.getByRole('button', { name: 'Undo edit' }).click();
  await expect(page.getByTestId('preflight-row-frame')).toContainText('16:9');
  await page.getByRole('button', { name: 'Redo edit' }).click();
  await expect(page.getByTestId('preflight-row-frame')).toContainText('9:16');

  const timeBefore = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video ? video.currentTime : 0;
  });
  await page.keyboard.press('ArrowRight');
  const timeAfter = await page.evaluate(() => {
    const video = document.querySelector('video');
    return video ? video.currentTime : 0;
  });
  expect(timeAfter).toBeGreaterThan(timeBefore);

  await page.keyboard.press('s');
  await expect(page.getByRole('dialog', { name: 'Project settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
});

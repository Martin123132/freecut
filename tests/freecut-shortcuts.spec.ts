import { expect, Page, TestInfo, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';

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
  await page.keyboard.press('c');
  await expect(page.locator('.caption-card')).toHaveCount(1);

  await page.keyboard.press('f');
  await expect(page.locator('.preset', { hasText: '9:16' })).toHaveClass(/active/);

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

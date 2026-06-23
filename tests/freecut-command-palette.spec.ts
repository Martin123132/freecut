import { expect, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';

test('command palette opens from keyboard and adds a caption', async ({ page }, testInfo) => {
  const smokeVideoPath = testInfo.outputPath('freecut-command-palette-smoke.webm');
  await createSmokeVideo(smokeVideoPath);

  await page.goto('/');
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });
  await page.locator('.stage-wrap').click();

  await page.keyboard.press('?');
  const palette = page.getByTestId('mission-control');
  const paletteSearch = page.locator('#command-search-input');
  await expect(palette).toBeVisible();
  await expect(paletteSearch).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(palette).not.toBeVisible();

  await page.keyboard.press('?');
  await expect(palette).toBeVisible();
  await paletteSearch.fill('Add a caption cue');
  await paletteSearch.press('Enter');

  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect(palette).not.toBeVisible();
});

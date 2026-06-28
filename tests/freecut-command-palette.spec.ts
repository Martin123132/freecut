import { expect, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';
import { mockHealthyRuntime } from './support/mockRuntimeHealth';

test.beforeEach(async ({ page }) => {
  await mockHealthyRuntime(page);
});

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

test('mission control preserves guided action order', async ({ page }, testInfo) => {
  const smokeVideoPath = testInfo.outputPath('freecut-command-palette-order.webm');
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
  await expect(palette).toBeVisible();

  const commands = palette.locator('.command-item-action');
  await expect(commands).toHaveCount(9);
  await expect(commands.nth(0)).toContainText('Import clip');
  await expect(commands.nth(1)).toContainText('Set 9:16 frame');
  await expect(commands.nth(2)).toContainText('Add a caption cue');
  await expect(commands.nth(3)).toContainText('Reset trim');
  await expect(commands.nth(4)).toContainText('Export MP4');
  await expect(commands.nth(5)).toContainText('Play playback');
  await expect(commands.nth(6)).toContainText('Open Export Center');
  await expect(commands.nth(7)).toContainText('Open settings');
  await expect(commands.nth(8)).toContainText('Open mission map');

  await expect(commands.nth(0)).toContainText(/Relink .*to continue|Start your route with a local source/);
  await expect(commands.nth(1)).toContainText('Choose this first for short-form output');
  await expect(commands.nth(4)).toContainText(/Need a source and valid trim range|Run local render/);
  await expect(commands.nth(6)).toContainText('Review render progress and receipts');
});

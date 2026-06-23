import { expect, test } from '@playwright/test';
import { createSmokeVideo } from './support/createSmokeVideo';

test('mission path updates as workflow unlocks', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.removeItem('freecut.project.v1');
    window.localStorage.removeItem('freecut.quickstart.v1');
  });
  await page.reload();

  const missionMap = page.getByTestId('quick-start');
  const pathProgress = async () => {
    const value = await missionMap.getByRole('progressbar').getAttribute('aria-valuenow');
    return Number(value);
  };

  await expect(missionMap).toBeVisible();
  await expect.poll(() => pathProgress()).toBe(0);

  await page.evaluate(() => {
    window.localStorage.setItem('freecut.quickstart.v1', '1');
  });
  await page.reload();
  await expect(page.getByTestId('quick-start')).not.toBeVisible();
  const miniMap = page.getByTestId('quick-start-mini');
  await expect(miniMap).toBeVisible();
  await expect(miniMap.getByRole('button', { name: 'Open map' })).toBeVisible();
  await expect(miniMap.getByText('Next: import a local clip.')).toBeVisible();

  await page.keyboard.press('q');
  await expect(page.getByTestId('quick-start')).toBeVisible();

  const smokeVideoPath = testInfo.outputPath('freecut-guided-smoke.webm');
  await createSmokeVideo(smokeVideoPath);
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });

  await expect.poll(() => pathProgress()).toBeGreaterThan(0);

  await page.keyboard.press('f');
  await expect.poll(() => pathProgress()).toBeGreaterThan(1);

  await page.keyboard.press('c');
  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect.poll(() => pathProgress()).toBeGreaterThan(2);
  await expect(page.getByTestId('quick-start')).toContainText('Captions are active and tuned for muted social playback.');

  await page.evaluate(() => {
    window.localStorage.setItem('freecut.quickstart.v1', '1');
  });
  await page.reload();
  await expect(page.getByTestId('quick-start-mini')).toBeVisible();
  await expect(page.getByTestId('quick-start-mini')).toContainText('Relink freecut-guided-smoke.webm to reopen this path.');
});  

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
  await expect(miniMap.getByTestId('mission-discovery')).toContainText('Suggestion: start with one local clip');

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

test('mission rail stays visible and ready when map is minimized', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.setItem('freecut.quickstart.v1', '1');
    window.localStorage.removeItem('freecut.project.v1');
  });
  await page.reload();

  const miniRail = page.getByTestId('quick-start-mini');
  await expect(miniRail).toBeVisible();
  await expect(miniRail.locator('.mission-rail-action')).toHaveCount(4);
  await expect(miniRail.getByTestId('mission-step-source-action')).toHaveText('Import');
  await expect(miniRail.getByTestId('mission-step-frame-action')).toBeDisabled();
  await expect(miniRail.getByTestId('mission-step-captions-action')).toBeDisabled();
  await expect(miniRail.getByTestId('mission-discovery')).toContainText('Suggestion: start with one local clip');

  const smokeVideoPath = testInfo.outputPath('freecut-guided-rail.webm');
  await createSmokeVideo(smokeVideoPath);
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });

  await expect(miniRail.getByTestId('mission-step-source-action')).toHaveText('Replace');
  await expect(miniRail.getByTestId('mission-step-frame-action')).toBeEnabled();
  await expect(miniRail.getByTestId('mission-step-captions-action')).toBeEnabled();
  await expect(miniRail.getByTestId('mission-step-export-action')).toContainText('Export MP4');
  await expect(miniRail.getByTestId('mission-discovery')).toContainText('Suggestion: lock framing now');

  await miniRail.getByTestId('mission-discovery').getByRole('button', { name: 'Set 9:16' }).click();
  await expect(page.getByTestId('mission-step-frame')).toHaveClass(/done/);
});

test('explore panel exposes optional moves without breaking the guided path', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.setItem('freecut.quickstart.v1', '1');
    window.localStorage.removeItem('freecut.project.v1');
  });
  await page.reload();

  const explorePanel = page.getByTestId('explore-panel');
  await expect(explorePanel).toBeVisible();
  await expect(explorePanel.getByTestId('explore-square')).toBeDisabled();
  await expect(explorePanel.getByTestId('explore-shorts-pop')).toBeDisabled();

  await explorePanel.getByTestId('explore-master').click();
  await expect(page.locator('.output-profile.active')).toContainText('Master');

  const smokeVideoPath = testInfo.outputPath('freecut-explore-panel.webm');
  await createSmokeVideo(smokeVideoPath);
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });

  await expect(explorePanel.getByTestId('explore-square')).toBeEnabled();
  await explorePanel.getByTestId('explore-square').click();
  await expect(page.locator('.preset.active')).toContainText('1:1');
  await expect(page.getByTestId('mission-step-frame')).toHaveClass(/ready/);

  await expect(explorePanel.getByTestId('explore-shorts-pop')).toBeEnabled();
  await explorePanel.getByTestId('explore-shorts-pop').click();
  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect(page.locator('.caption-style.active')).toContainText('Shorts Pop');
  await expect(page.getByTestId('mission-step-captions')).toHaveClass(/done/);
});

test('session checkpoint restores exploratory changes', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.setItem('freecut.quickstart.v1', '1');
    window.localStorage.removeItem('freecut.project.v1');
  });
  await page.reload();

  const explorePanel = page.getByTestId('explore-panel');
  const checkpointPanel = page.getByTestId('checkpoint-panel');

  await explorePanel.getByTestId('explore-master').click();
  await expect(checkpointPanel).toContainText('Quality changed');
  await expect(page.locator('.output-profile.active')).toContainText('Master');
  await checkpointPanel.getByTestId('checkpoint-restore').click();
  await expect(page.locator('.output-profile.active')).toContainText('Balanced');
  await expect(checkpointPanel).not.toBeVisible();

  const smokeVideoPath = testInfo.outputPath('freecut-checkpoint.webm');
  await createSmokeVideo(smokeVideoPath);
  await page.getByTestId('media-import-input').setInputFiles(smokeVideoPath);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1);
  });

  await explorePanel.getByTestId('explore-square').click();
  await expect(checkpointPanel).toContainText('Frame changed');
  await expect(page.locator('.preset.active')).toContainText('1:1');
  await page.locator('.stage-wrap').click();
  await page.keyboard.press('u');
  await expect(page.locator('.preset.active')).toContainText('16:9');
  await expect(checkpointPanel).not.toBeVisible();

  await explorePanel.getByTestId('explore-shorts-pop').click();
  await expect(checkpointPanel).toContainText('Pop captions changed');
  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect(page.locator('.caption-style.active')).toContainText('Shorts Pop');
  await checkpointPanel.getByTestId('checkpoint-restore').click();
  await expect(page.locator('.caption-card')).toHaveCount(0);
  await expect(page.locator('.caption-style.active')).toContainText('Clean');
});

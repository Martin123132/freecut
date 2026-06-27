import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
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
  await expect(page.getByTestId('stage-empty')).toContainText('Ready for local video');
  await expect(page.getByTestId('stage-import-action')).toBeVisible();
  await expect(page.getByTestId('media-empty-state')).toContainText('Local video stays on this machine');
  await expect(page.getByTestId('dock-readiness')).toHaveAttribute('aria-label', 'Project readiness: 2/5 ready');
  await expect(page.getByTestId('next-move')).toContainText('Bring in a clip');
  await expect(page.getByTestId('timeline-clip-block')).toContainText('No source');

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
  await expect(page.getByTestId('timeline-clip-block')).toContainText('Source clip');
  await expect(page.getByTestId('timeline-trim-start-handle')).toBeVisible();
  await expect(page.getByTestId('timeline-trim-end-handle')).toBeVisible();

  const outInput = page.locator('.timeline-ranges label').nth(1).locator('input');
  const initialOut = Number(await outInput.inputValue());
  const rail = page.getByTestId('timeline-rail');
  const outHandle = page.getByTestId('timeline-trim-end-handle');
  const railBox = await rail.boundingBox();
  const outHandleBox = await outHandle.boundingBox();
  expect(railBox).not.toBeNull();
  expect(outHandleBox).not.toBeNull();
  if (!railBox || !outHandleBox) throw new Error('Timeline rail or trim handle was not measurable.');

  await outHandle.dragTo(rail, {
    force: true,
    sourcePosition: { x: outHandleBox.width / 2, y: outHandleBox.height / 2 },
    targetPosition: { x: railBox.width * 0.7, y: outHandleBox.y - railBox.y + outHandleBox.height / 2 }
  });
  expect(Number(await outInput.inputValue())).toBeLessThan(initialOut);

  await page.locator('.stage-wrap').click();
  await page.keyboard.press('c');
  await expect(page.locator('.caption-card')).toHaveCount(1);
  await expect(page.getByTestId('timeline-caption-marker')).toHaveCount(1);

  await page.getByRole('button', { name: 'Duplicate caption 1' }).click();
  await expect(page.locator('.caption-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Split caption 1' }).click();
  await expect(page.locator('.caption-card')).toHaveCount(3);
  await expect(page.getByTestId('timeline-caption-marker')).toHaveCount(3);
  await page.getByTestId('timeline-caption-marker').nth(1).click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.currentTime : 0;
      })
    )
    .toBeGreaterThan(0.4);
  await expect(page.getByTestId('export-status')).toContainText('Idle');

  const screenshotPath = testInfo.outputPath('import-ready.png');
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('import-ready', { path: screenshotPath, contentType: 'image/png' });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('unsupported media import explains the recovery path', async ({ page }, testInfo) => {
  const textFilePath = testInfo.outputPath('not-a-video.txt');
  await writeFile(textFilePath, 'This is not a video file.');

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('media-import-input').setInputFiles(textFilePath);

  await expect(page.getByTestId('export-status')).toContainText('Unsupported file - choose a video file to import');
  await expect(page.getByTestId('export-status')).toContainText('not-a-video.txt was not loaded');
  await expect(page.getByTestId('media-empty-state')).toContainText('No clip loaded');
  await expect(page.getByTestId('stage-empty')).toContainText('No clip loaded');
});

test('first-run mobile view leads with canvas import path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('stage-empty')).toContainText('Ready for local video');
  await expect(page.getByTestId('stage-import-action')).toBeVisible();
  await expect(page.getByTestId('media-empty-state')).toContainText('Browser storage keeps the edit route');

  const stageBox = await page.locator('.stage-wrap').boundingBox();
  const mediaBox = await page.locator('.media-panel').boundingBox();
  expect(stageBox).not.toBeNull();
  expect(mediaBox).not.toBeNull();
  if (!stageBox || !mediaBox) throw new Error('Stage or media panel was not measurable.');
  expect(stageBox.y).toBeLessThan(mediaBox.y);
});

import type { Page } from '@playwright/test';

export async function mockHealthyRuntime(page: Page) {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        checks: {
          api: true,
          ffmpeg: true,
          storage: true,
          web: true
        },
        dataRoot: 'FreeCut smoke API',
        ffmpeg: 'FreeCut smoke FFmpeg',
        ok: true,
        webRoot: 'FreeCut smoke web'
      })
    });
  });
}

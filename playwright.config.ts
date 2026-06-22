import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.FREECUT_QA_WEB_PORT || process.env.FREECUT_WEB_PORT || 51713);
const baseURL = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  webServer: {
    command: `npm run preview -- --port ${webPort} --strictPort`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL
  },
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome']
    }
  ]
});

import { defineConfig, devices } from '@playwright/test';
import { origin } from './site.config.mjs';

export default defineConfig({
  testDir: './checks',
  timeout: 90_000,
  globalTimeout: 12 * 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  workers: 1,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  use: {
    baseURL: origin,
    navigationTimeout: 35_000,
    actionTimeout: 10_000,
    screenshot: 'on',
    trace: 'retain-on-failure',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});

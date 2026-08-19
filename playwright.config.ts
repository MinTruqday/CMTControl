import { defineConfig, devices } from '@playwright/test';
import { config } from './config/qa.config.js';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: config.BASE_URL,
    headless: config.HEADLESS,
    screenshot: config.SCREENSHOT_ON_FAILURE ? 'only-on-failure' : 'off',
    video: config.VIDEO_ON_FAILURE ? 'retain-on-failure' : 'off',
    trace: config.TRACE_ON_FAILURE ? 'retain-on-failure' : 'off'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', testIgnore: /visual\//, use: { ...devices['iPhone 13'], browserName: 'chromium' } }
  ]
});

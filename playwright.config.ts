import { defineConfig, devices } from '@playwright/test';
import { config } from './config/qa.config.js';

const artifactScope = [process.env.QA_RUN_ID, process.env.QA_GROUP]
  .filter(Boolean)
  .map((value) => value?.replace(/[^a-zA-Z0-9_-]/g, '-'))
  .join('/');
const artifactPath = (root: string): string => artifactScope ? `${root}/${artifactScope}` : root;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 1,
  outputDir: artifactPath('test-results'),
  reporter: [['html', { outputFolder: artifactPath('playwright-report'), open: 'never' }], ['list']],
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

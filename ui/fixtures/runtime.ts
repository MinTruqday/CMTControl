import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test as base } from '@playwright/test';
import sharp from 'sharp';
import { config } from '../../config/qa.config.js';
import { requireBaseUrl } from '../../config/qa.config.js';
import { annotateScreenshot } from '../../evidence/annotate.js';

export const test = base.extend<{ appUrl: string }>({
  appUrl: async ({}, use) => use(requireBaseUrl()),
  page: async ({ page }, use, testInfo) => {
    const consoleEvents: Array<Record<string, string>> = [];
    const failedRequests: Array<Record<string, string>> = [];
    page.on('console', (message) => consoleEvents.push({ type: message.type(), text: message.text(), location: message.location().url }));
    page.on('requestfailed', (request) => failedRequests.push({ method: request.method(), url: request.url(), failure: request.failure()?.errorText ?? 'unknown' }));
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus) {
      const testId = testInfo.title.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
      const directory = resolve(config.EVIDENCE_OUTPUT_DIR, process.env.QA_RUN_ID ?? 'manual', testId);
      mkdirSync(directory, { recursive: true });
      try {
        writeFileSync(resolve(directory, 'console.json'), JSON.stringify(consoleEvents, null, 2));
        writeFileSync(resolve(directory, 'network.json'), JSON.stringify(failedRequests, null, 2));
        writeFileSync(resolve(directory, 'dom.html'), await page.content());
        writeFileSync(resolve(directory, 'result.json'), JSON.stringify({ id: testInfo.title, status: testInfo.status, expectedStatus: testInfo.expectedStatus, errors: testInfo.errors.map((error) => error.message) }, null, 2));
        const screenshot = resolve(directory, 'screenshot.png');
        await page.screenshot({ path: screenshot, fullPage: true });
        await annotateScreenshot(screenshot, resolve(directory, 'annotated.png'), [{ x: 0, y: 0, width: Math.min(600, page.viewportSize()?.width ?? 600), height: 48, label: `FAIL: ${testInfo.title}` }]);
        if (testInfo.title.includes('E2E-CONTACT')) {
          const form = page.locator('form').filter({ has: page.locator('[name="full_name"]') }).first();
          const email = form.locator('[name="email"]');
          const formBox = await form.boundingBox();
          const emailBox = await email.boundingBox();
          if (formBox && emailBox) {
            const focus = resolve(directory, 'focus.png');
            const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
            const image = sharp(screenshot);
            const metadata = await image.metadata();
            const left = Math.max(0, Math.floor(scroll.x + emailBox.x - 20));
            const top = Math.max(0, Math.floor(scroll.y + emailBox.y - 40));
            const width = Math.min((metadata.width ?? 1) - left, Math.ceil(emailBox.width) + 40);
            const height = Math.min((metadata.height ?? 1) - top, Math.ceil(emailBox.height) + 80);
            await image.extract({ left, top, width, height }).png().toFile(focus);
            await annotateScreenshot(focus, resolve(directory, 'focus.annotated.png'), [{ x: Math.round(scroll.x + emailBox.x - left), y: Math.round(scroll.y + emailBox.y - top), width: Math.round(emailBox.width), height: Math.round(emailBox.height), label: 'Invalid email validation is bypassed' }]);
            writeFileSync(resolve(directory, 'focus.json'), JSON.stringify({ target: '[name=email]', reason: 'The contact form opts out of browser validation.', screenshot: focus, sourceScreenshot: screenshot }, null, 2));
          }
        }
      } catch (error) {
        writeFileSync(resolve(directory, 'evidence-error.json'), JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
      }
    }
  }
});

export { expect };

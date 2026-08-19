import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
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
      const directory = resolve(config.EVIDENCE_OUTPUT_DIR, process.env.QA_RUN_ID ?? 'manual', testInfo.project.name, testId);
      mkdirSync(directory, { recursive: true });
      const previousEvidenceError = resolve(directory, 'evidence-error.json');
      if (existsSync(previousEvidenceError)) unlinkSync(previousEvidenceError);
      try {
        writeFileSync(resolve(directory, 'console.json'), JSON.stringify(consoleEvents, null, 2));
        writeFileSync(resolve(directory, 'network.json'), JSON.stringify(failedRequests, null, 2));
        writeFileSync(resolve(directory, 'dom.html'), await page.content());
        writeFileSync(resolve(directory, 'result.json'), JSON.stringify({ id: testInfo.title, status: testInfo.status, expectedStatus: testInfo.expectedStatus, errors: testInfo.errors.map((error) => error.message) }, null, 2));
        const screenshot = resolve(directory, 'screenshot.png');
        await page.screenshot({ path: screenshot, fullPage: false });
        await annotateScreenshot(screenshot, resolve(directory, 'annotated.png'), [{ x: 0, y: 0, width: Math.min(600, page.viewportSize()?.width ?? 600), height: 48, label: `FAIL: ${testInfo.title}` }]);
        if (testInfo.title.includes('E2E-CONTACT')) {
          const form = page.locator('form').filter({ has: page.locator('[name="full_name"]') }).first();
          const email = form.locator('[name="email"]');
          const formBox = await form.boundingBox();
          const emailBox = await email.boundingBox();
          if (formBox && emailBox) {
            const focus = resolve(directory, 'focus.png');
            const image = sharp(screenshot);
            const metadata = await image.metadata();
            // The failure screenshot is viewport-only, and boundingBox is also
            // viewport-relative. Do not add document scroll offsets here.
            const imageWidth = metadata.width ?? 1;
            const imageHeight = metadata.height ?? 1;
            const left = Math.min(imageWidth - 1, Math.max(0, Math.floor(emailBox.x - 20)));
            const top = Math.min(imageHeight - 1, Math.max(0, Math.floor(emailBox.y - 40)));
            const width = Math.max(1, Math.min(imageWidth - left, Math.ceil(emailBox.width) + 40));
            const height = Math.max(1, Math.min(imageHeight - top, Math.ceil(emailBox.height) + 80));
            await image.extract({ left, top, width, height }).png().toFile(focus);
            await annotateScreenshot(focus, resolve(directory, 'focus.annotated.png'), [{ x: Math.round(emailBox.x - left), y: Math.round(emailBox.y - top), width: Math.round(emailBox.width), height: Math.round(emailBox.height), label: 'Invalid email validation is bypassed' }]);
            writeFileSync(resolve(directory, 'focus.json'), JSON.stringify({ target: '[name=email]', reason: 'The contact form opts out of browser validation and attempts submit after invalid input.', screenshot: focus, sourceScreenshot: screenshot }, null, 2));
          }
        }
      } catch (error) {
        writeFileSync(resolve(directory, 'evidence-error.json'), JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
      }
    }
  }
});

export { expect };

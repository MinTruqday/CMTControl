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
        const contactForm = testInfo.title.includes('E2E-CONTACT')
          ? page.locator('form').filter({ has: page.locator('[name="full_name"]') }).first()
          : undefined;
        const contactEmail = contactForm?.locator('[name="email"]');
        if (contactEmail) {
          const evidenceViewport = testInfo.project.name.includes('mobile')
            ? { width: 1080, height: 1920 }
            : { width: 1920, height: 1080 };
          await page.setViewportSize(evidenceViewport);
          await contactEmail.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
          await expect(contactEmail).toBeInViewport();
        }
        await page.screenshot({ path: screenshot, fullPage: false, scale: 'css' });
        await annotateScreenshot(screenshot, resolve(directory, 'annotated.png'), [{ x: 0, y: 0, width: Math.min(600, page.viewportSize()?.width ?? 600), height: 48, label: `FAIL: ${testInfo.title}` }]);
        if (testInfo.title.includes('E2E-CONTACT')) {
          const form = contactForm as NonNullable<typeof contactForm>;
          const email = contactEmail as NonNullable<typeof contactEmail>;
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
            // A single-field crop is too small to review. Keep contextual form
            // evidence around the invalid field without reverting to a full page.
            const width = Math.min(imageWidth, 700);
            const height = Math.min(imageHeight, 560);
            const emailCenterY = emailBox.y + emailBox.height / 2;
            const left = Math.min(imageWidth - width, Math.max(0, Math.floor(emailBox.x - 32)));
            const top = Math.max(0, Math.min(imageHeight - height, Math.round(emailCenterY - height / 2)));
            await image.extract({ left, top, width, height }).png().toFile(focus);
            await annotateScreenshot(focus, resolve(directory, 'focus.annotated.png'), [{ x: Math.round(emailBox.x - left), y: Math.round(emailBox.y - top), width: Math.round(emailBox.width), height: Math.round(emailBox.height), label: 'Invalid email validation is bypassed' }]);
            writeFileSync(resolve(directory, 'focus.json'), JSON.stringify({ target: '[name=email]', reason: 'The contact form opts out of browser validation and attempts submit after invalid input.', crop: { width, height, contextual: true }, screenshot: focus, sourceScreenshot: screenshot }, null, 2));
          }
        }
      } catch (error) {
        writeFileSync(resolve(directory, 'evidence-error.json'), JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
      }
    }
  }
});

export { expect };

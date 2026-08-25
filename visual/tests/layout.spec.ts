import { expect, test } from '../../ui/fixtures/runtime.js';

for (const locale of ['vi', 'en', 'ja']) {
  test(`VISUAL-HOME-${locale} @locale`, async ({ page, appUrl }) => {
    test.setTimeout(90_000);

    // A marketing page may keep analytics or third-party requests alive, so
    // networkidle is not a reliable readiness signal. Retry the document load
    // instead, then let the image stabilization below decide screenshot readiness.
    let navigationError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await page.goto(`${appUrl}/${locale}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000
        });
        navigationError = undefined;
        break;
      } catch (error) {
        navigationError = error;
        if (attempt < 3) await page.waitForTimeout(1_000 * attempt);
      }
    }
    if (navigationError) throw navigationError;

    // Trigger lazy assets before comparison. Do not await every image.decode():
    // one stalled third-party image would otherwise block the entire test.
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1_000);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`home-${locale}.png`, {
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      timeout: 15_000
    });
  });
}

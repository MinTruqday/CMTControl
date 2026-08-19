import { expect, test } from '../fixtures/runtime.js';

for (const locale of ['vi', 'en', 'ja']) {
  test(`UI-RESPONSIVE-${locale}-001 @smoke @locale`, async ({ page, appUrl }) => {
    await page.goto(`${appUrl}/${locale}`, { waitUntil: 'domcontentloaded' });
    const geometry = await page.evaluate(() => ({ viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
    expect(Math.max(geometry.documentWidth, geometry.bodyWidth), `${locale} homepage must not cause horizontal viewport overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
  });
}

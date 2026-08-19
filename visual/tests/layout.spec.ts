import { expect, test } from '../../ui/fixtures/runtime.js';

for (const locale of ['vi', 'en', 'ja']) {
  test(`VISUAL-HOME-${locale} @locale`, async ({ page, appUrl }) => {
    await page.goto(`${appUrl}/${locale}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot(`home-${locale}.png`, { fullPage: true, maxDiffPixelRatio: 0.02 });
  });
}

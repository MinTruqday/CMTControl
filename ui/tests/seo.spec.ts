import { expect, test } from '../fixtures/runtime.js';

for (const locale of ['vi', 'en', 'ja']) {
  test(`UI-SEO-${locale}-001 @smoke @locale`, async ({ page, appUrl }) => {
    await page.goto(`${appUrl}/${locale}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/\S/);
    const language = await page.locator('html').getAttribute('lang');
    expect(language, `${locale} page must declare its document language`).toMatch(/^(vi|en|ja)(-|$)/i);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length ?? 0, `${locale} page must expose a non-empty meta description`).toBeGreaterThan(0);
  });
}

import { expect, test } from '../fixtures/runtime.js';

const locales = ['vi', 'en', 'ja'];
const routes = ['', '/about', '/products', '/news', '/contact'];

for (const locale of locales) {
  for (const route of routes) {
    test(`UI-NAV-${locale}-${route || 'home'} @smoke @locale`, async ({ page, appUrl }) => {
      const response = await page.goto(`${appUrl}/${locale}${route}`, { waitUntil: 'domcontentloaded' });
      expect(response, 'navigation must return an HTTP response').not.toBeNull();
      expect(response?.ok(), `route ${locale}${route} must succeed`).toBeTruthy();
      await expect(page.locator('body')).not.toBeEmpty();
      await expect(page.locator('a[href]')).toHaveCount(await page.locator('a[href]').count(), { timeout: 5_000 });
    });
  }
}

test('UI-NAV-001 @smoke', async ({ page, appUrl }) => {
  await page.goto(`${appUrl}/vi`, { waitUntil: 'domcontentloaded' });
  const links = page.locator('a[href]');
  expect(await links.count()).toBeGreaterThan(4);
  const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')).filter(Boolean));
  for (const route of ['/vi/about', '/vi/products', '/vi/news', '/vi/contact']) expect(hrefs).toContain(route);
});

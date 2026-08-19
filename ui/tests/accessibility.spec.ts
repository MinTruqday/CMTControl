import { expect, test } from '../fixtures/runtime.js';

test('UI-A11Y-001 @smoke @accessibility', async ({ page, appUrl }) => {
  await page.goto(`${appUrl}/vi`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', /vi|en|ja/);
  await expect(page.locator('h1')).toHaveCount(1);
  const missingAlt = await page.locator('img:not([alt])').count();
  expect(missingAlt, 'all meaningful images must declare an alt attribute').toBe(0);
  await page.keyboard.press('Tab');
  expect(await page.locator(':focus').count(), 'keyboard focus must be available').toBeGreaterThan(0);
});

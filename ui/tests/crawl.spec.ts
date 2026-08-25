import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '../fixtures/runtime.js';

function isLocalizedPath(url: URL): boolean {
  return /^\/(vi|en|ja)(\/|$)/.test(url.pathname);
}

async function getWithNetworkRetry(request: APIRequestContext, url: string, attempts = 3): Promise<APIResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await request.get(url);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}

for (const locale of ['vi', 'en', 'ja']) {
  test(`UI-CRAWL-${locale}-001 @smoke @locale`, async ({ page, appUrl }) => {
    await page.goto(`${appUrl}/${locale}`, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')).filter((href): href is string => Boolean(href)));
    const routes = [...new Set(hrefs.map((href) => new URL(href, appUrl)).filter((url) => url.origin === new URL(appUrl).origin && isLocalizedPath(url)).map((url) => `${url.pathname}${url.search}`))];
    expect(routes.length, `${locale} homepage must expose localized internal navigation`).toBeGreaterThan(4);
    for (const route of routes) {
      const response = await getWithNetworkRetry(page.request, new URL(route, appUrl).toString());
      expect(response.status(), `internal route ${route} must not return an error`).toBeLessThan(400);
      expect(response.headers()['content-type'] ?? '', `internal route ${route} must return HTML`).toMatch(/text\/html/i);
    }
  });
}

test('UI-IMAGE-001 @smoke', async ({ page, appUrl }) => {
  await page.goto(`${appUrl}/vi`, { waitUntil: 'domcontentloaded' });
  const imageData = await page.locator('img').evaluateAll((images) => images.map((element) => {
    const image = element as HTMLImageElement;
    return { src: image.currentSrc || image.getAttribute('src'), complete: image.complete, width: image.naturalWidth };
  }));
  expect(imageData.length, 'homepage must contain image content').toBeGreaterThan(0);
  expect(imageData.filter((image) => image.src && image.complete && image.width === 0), 'loaded homepage images must have a natural width').toEqual([]);
});

import { expect, test } from '../fixtures/runtime.js';

test('UI-PERF-001 @smoke @performance', async ({ page, appUrl }) => {
  const response = await page.goto(`${appUrl}/vi`, { waitUntil: 'load' });
  expect(response).not.toBeNull();
  expect(response?.ok(), 'page must load successfully').toBeTruthy();
  const timing = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return { duration: entry.duration, domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd };
  });
  expect(timing.duration, 'navigation must finish below 15 seconds').toBeLessThan(15_000);
  expect(timing.domContentLoaded, 'DOM content must become available').toBeGreaterThan(0);
  expect(timing.load, 'load event must complete').toBeGreaterThan(0);
});

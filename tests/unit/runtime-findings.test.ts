import { describe, expect, it } from 'vitest';
import { classifyRuntimeFindings, type RuntimeFinding } from '../../engine/classifiers/runtime-findings.js';
import type { SiteDiscovery } from '../../engine/discovery/site.js';

const discovery: SiteDiscovery = {
  baseUrl: 'https://example.test',
  discoveredAt: '2026-08-19T00:00:00.000Z',
  routes: [],
  images: [],
  brokenImages: [],
  consoleErrors: [],
  assetFailures: [
    { page: 'https://example.test/vi/product', url: 'https://example.test/assets/broken.webp', status: 404, resourceType: 'image', screenshot: 'evidence/a.png' },
    { page: 'https://example.test/vi/product', url: 'https://example.test/assets/broken.webp', status: 404, resourceType: 'image', screenshot: 'evidence/a.png' },
    { page: 'https://example.test/vi/product', url: 'https://example.test/assets/app.js', status: 500, resourceType: 'script' }
  ]
};

describe('runtime finding classifier', () => {
  it('keeps one deterministic product finding per broken image/status pair', () => {
    const findings: RuntimeFinding[] = classifyRuntimeFindings(discovery);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      testId: 'UI-IMAGE-ROUTE-001',
      classification: 'PRODUCT_BUG',
      assetUrl: 'https://example.test/assets/broken.webp',
      observedStatus: 404
    });
    expect(findings[0].id).toMatch(/^RUNTIME-ASSET-[a-f0-9]{12}$/);
  });
});

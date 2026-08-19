import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { config, requireBaseUrl } from '../../config/qa.config.js';
import { annotateScreenshot } from '../../evidence/annotate.js';

export interface SiteRoute {
  url: string;
  status: number;
  contentType: string | null;
}

export interface SiteDiscovery {
  baseUrl: string;
  discoveredAt: string;
  routes: SiteRoute[];
  images: string[];
  brokenImages: string[];
  consoleErrors: Array<{ text: string; url: string }>;
  assetFailures: Array<{ page: string; url: string; status: number; resourceType: string; visible?: boolean; screenshot?: string; annotatedScreenshot?: string }>;
}

function normalizeRoute(href: string, baseUrl: string): string | undefined {
  const url = new URL(href, baseUrl);
  if (url.origin !== new URL(baseUrl).origin || !/^\/(vi|en|ja)(\/|$)/.test(url.pathname)) return undefined;
  url.hash = '';
  url.search = '';
  return url.toString();
}

async function collectRoutes(page: Page, baseUrl: string): Promise<string[]> {
  const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')).filter((href): href is string => Boolean(href)));
  return hrefs.map((href) => normalizeRoute(href, baseUrl)).filter((href): href is string => Boolean(href));
}

export async function discoverSite(): Promise<SiteDiscovery> {
  const baseUrl = requireBaseUrl();
  const browser: Browser = await chromium.launch({ headless: config.HEADLESS });
  const page = await browser.newPage();
  const consoleErrors: Array<{ text: string; url: string }> = [];
  const assetFailures: Array<{ page: string; url: string; status: number; resourceType: string; visible?: boolean; screenshot?: string; annotatedScreenshot?: string }> = [];
  let currentPage = '';
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  page.on('response', (response) => {
    const request = response.request();
    if (response.status() >= 400 && ['image', 'stylesheet', 'script', 'font'].includes(request.resourceType())) {
      assetFailures.push({ page: currentPage, url: response.url(), status: response.status(), resourceType: request.resourceType() });
    }
  });
  const entryRoutes = ['/vi', '/en', '/ja'].map((path) => new URL(path, baseUrl).toString());
  const discoveredRoutes = new Set(entryRoutes);
  for (const entryRoute of entryRoutes) {
    currentPage = entryRoute;
    await page.goto(entryRoute, { waitUntil: 'domcontentloaded' });
    for (const route of await collectRoutes(page, baseUrl)) discoveredRoutes.add(route);
  }
  const routes: SiteRoute[] = [];
  const images = new Set<string>();
  const brokenImages = new Set<string>();
  for (const url of [...discoveredRoutes].sort()) {
    currentPage = url;
    const failureStart = assetFailures.length;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    routes.push({ url, status: response?.status() ?? 0, contentType: response?.headers()['content-type'] ?? null });
    const imageData = await page.locator('img').evaluateAll((elements) => elements.map((element) => {
      const image = element as HTMLImageElement;
      return { src: image.currentSrc || image.getAttribute('src') || '', complete: image.complete, width: image.naturalWidth };
    }));
    for (const image of imageData) {
      if (!image.src) continue;
      images.add(image.src);
      if (image.complete && image.width === 0) brokenImages.add(image.src);
    }
    const pageFailures = assetFailures.slice(failureStart).filter((failure) => failure.resourceType === 'image');
    if (pageFailures.length > 0) {
      const fingerprint = createHash('sha256').update(url).digest('hex').slice(0, 12);
      const evidenceDirectory = resolve(config.EVIDENCE_OUTPUT_DIR, 'discovery');
      const screenshot = resolve(evidenceDirectory, `${fingerprint}.png`);
      const annotatedScreenshot = resolve(evidenceDirectory, `${fingerprint}.annotated.png`);
      const failedUrls = pageFailures.map((failure) => failure.url);
      const boxes = await page.locator('img').evaluateAll((elements, urls) => elements.map((element) => {
        const image = element as HTMLImageElement;
        const rect = image.getBoundingClientRect();
        return { url: image.currentSrc || image.src, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }).filter((image) => urls.includes(image.url) && image.width > 0 && image.height > 0), failedUrls);
      for (const failure of pageFailures) failure.visible = boxes.some((box) => box.url === failure.url);
      const visibleFailures = pageFailures.filter((failure) => failure.visible);
      if (visibleFailures.length === 0) continue;
      if (boxes.length > 0) {
        await page.evaluate(({ y, height }) => window.scrollTo({ top: Math.max(0, window.scrollY + y - Math.max(80, (window.innerHeight - height) / 2)), behavior: 'instant' }), boxes[0]);
      }
      const viewportBoxes = await page.locator('img').evaluateAll((elements, urls) => elements.map((element) => {
        const image = element as HTMLImageElement;
        const rect = image.getBoundingClientRect();
        return { url: image.currentSrc || image.src, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }).filter((image) => urls.includes(image.url) && image.width > 0 && image.height > 0), failedUrls);
      const annotations = viewportBoxes.map((box) => ({ x: Math.max(0, Math.round(box.x)), y: Math.max(0, Math.round(box.y)), width: Math.round(box.width), height: Math.round(box.height), label: `Image failed to render: HTTP ${visibleFailures.find((failure) => failure.url === box.url)?.status ?? 0}` }));
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: screenshot, fullPage: false });
      await annotateScreenshot(screenshot, annotatedScreenshot, annotations);
      for (const failure of visibleFailures) {
        failure.screenshot = screenshot;
        failure.annotatedScreenshot = annotatedScreenshot;
      }
    }
  }
  await browser.close();
  const result: SiteDiscovery = { baseUrl, discoveredAt: new Date().toISOString(), routes, images: [...images].sort(), brokenImages: [...brokenImages].sort(), consoleErrors, assetFailures };
  mkdirSync(resolve(config.REPORT_OUTPUT_DIR), { recursive: true });
  writeFileSync(resolve(config.REPORT_OUTPUT_DIR, 'site-discovery.json'), JSON.stringify(result, null, 2));
  return result;
}

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../../config/qa.config.js';
import type { SiteDiscovery } from '../discovery/site.js';

export interface RuntimeFinding {
  id: string;
  fingerprint: string;
  testId: string;
  classification: 'PRODUCT_BUG';
  priority: 'Trung bình';
  page: string;
  assetUrl: string;
  observedStatus: number;
  expected: string;
  detectedAt: string;
  evidence: string[];
}

export function classifyRuntimeFindings(discovery: SiteDiscovery): RuntimeFinding[] {
  // A failed responsive/mobile/background request is not automatically a
  // user-visible defect. Only promote an asset when the crawler linked it to a
  // visible <img> element with failed rendering evidence.
  const uniqueFailures = new Map(discovery.assetFailures.filter((failure) => failure.resourceType === 'image' && failure.visible === true).map((failure) => [`${failure.url}:${failure.status}`, failure]));
  return [...uniqueFailures.values()].map((failure) => {
    const fingerprint = createHash('sha256').update(`${failure.url}\n${failure.status}`).digest('hex');
    return {
      id: `RUNTIME-ASSET-${fingerprint.slice(0, 12)}`,
      fingerprint,
      testId: 'UI-IMAGE-ROUTE-001',
      classification: 'PRODUCT_BUG',
      priority: 'Trung bình',
      page: failure.page,
      assetUrl: failure.url,
      observedStatus: failure.status,
      expected: 'Every image referenced by a public page must return a successful response and render with a non-zero natural width.',
      detectedAt: discovery.discoveredAt,
      evidence: [resolve(config.REPORT_OUTPUT_DIR, 'site-discovery.json'), failure.screenshot, failure.annotatedScreenshot].filter((path): path is string => Boolean(path))
    };
  });
}

export function writeRuntimeFindings(discovery: SiteDiscovery): RuntimeFinding[] {
  const findings = classifyRuntimeFindings(discovery);
  mkdirSync(resolve('bugs'), { recursive: true });
  writeFileSync(resolve('bugs', 'runtime-findings.json'), JSON.stringify(findings, null, 2));
  return findings;
}

export function readDiscovery(): SiteDiscovery {
  return JSON.parse(readFileSync(resolve(config.REPORT_OUTPUT_DIR, 'site-discovery.json'), 'utf8')) as SiteDiscovery;
}

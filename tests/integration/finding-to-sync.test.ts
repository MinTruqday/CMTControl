import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalBug, type LocalBug } from '../../bugs/store.js';
import { classifyRuntimeFindings, writeRuntimeFindings, type RuntimeFinding } from '../../engine/classifiers/runtime-findings.js';
import { canonicalFindingKey } from '../../integrations/google-sheets/sync.js';
import type { SiteDiscovery } from '../../engine/discovery/site.js';

const originalCwd = process.cwd();
let sandbox = '';

afterEach(() => {
  process.chdir(originalCwd);
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
  sandbox = '';
});

describe.sequential('finding-to-sync integration', () => {
  it('turns a discovered image failure into one deduplicated local Sheet-sync record', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cmt-qa-integration-'));
    process.chdir(sandbox);
    const discovery: SiteDiscovery = {
      baseUrl: 'https://example.test', discoveredAt: '2026-08-19T00:00:00.000Z', routes: [], images: [], brokenImages: [], consoleErrors: [],
      assetFailures: [{ page: 'https://example.test/vi/product', url: 'https://example.test/assets/broken.webp', status: 500, resourceType: 'image', visible: true, screenshot: 'evidence/failure.png' }]
    };

    const [finding]: RuntimeFinding[] = writeRuntimeFindings(discovery);
    expect(classifyRuntimeFindings(discovery)).toHaveLength(1);
    const draft = {
      testId: finding.testId,
      category: 'Runtime',
      feature: finding.id,
      description: `${finding.page}: asset ${finding.assetUrl} trả HTTP ${finding.observedStatus}.`,
      expected: finding.expected,
      priority: finding.priority,
      evidence: finding.evidence
    } as const;
    const first: LocalBug = createLocalBug(draft);
    const second: LocalBug = createLocalBug(draft);
    const queue = JSON.parse(readFileSync('bugs/pending-sync.json', 'utf8')) as LocalBug[];

    expect(second.id).toBe(first.id);
    expect(queue).toHaveLength(1);
    expect(canonicalFindingKey(first)).toBe(`${finding.testId}:${finding.assetUrl}`);
  });
});

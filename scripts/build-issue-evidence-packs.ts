import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

interface EvidencePack {
  id: string;
  testId: string;
  priority: string;
  classification: string;
  description: string;
  expected: string;
  existingIssueNo?: number;
  evidence: string[];
}

function load(): EvidencePack[] {
  const runtimePath = resolve('bugs/runtime-findings.json');
  const testPath = resolve('bugs/test-findings.json');
  const runtime = existsSync(runtimePath) ? JSON.parse(readFileSync(runtimePath, 'utf8')) as Array<{ id: string; testId: string; priority: string; classification: string; page: string; assetUrl: string; observedStatus: number; expected: string; evidence: string[] }> : [];
  const test = existsSync(testPath) ? JSON.parse(readFileSync(testPath, 'utf8')) as EvidencePack[] : [];
  return [...runtime.map((item) => ({ id: item.id, testId: item.testId, priority: item.priority, classification: item.classification, description: `${item.page}: asset ${item.assetUrl} returned HTTP ${item.observedStatus}.`, expected: item.expected, evidence: item.evidence })), ...test];
}

function markdown(pack: EvidencePack): string {
  const evidence = pack.evidence.map((file) => `- [${relative(resolve('reports/current'), file)}](${file})`).join('\n') || '- No local evidence path was recorded.';
  return [`# ${pack.id}`, '', `- Test: ${pack.testId}`, `- Classification: ${pack.classification}`, `- Priority: ${pack.priority}`, `- Existing Sheet issue: ${pack.existingIssueNo ?? 'None'}`, '', '## Actual', '', pack.description, '', '## Expected', '', pack.expected, '', '## Evidence', '', evidence, '', '## Sync status', '', 'This pack is local evidence only. It has not created or modified any Google Sheet record.', ''].join('\n');
}

function main(): void {
  const root = resolve('reports/current/issue-evidence-packs');
  const packs = load();
  for (const pack of packs) {
    const directory = resolve(root, pack.id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, 'README.md'), markdown(pack));
    writeFileSync(resolve(directory, 'manifest.json'), JSON.stringify({ ...pack, generatedAt: new Date().toISOString(), remoteSync: 'NOT_REQUESTED' }, null, 2));
  }
  process.stdout.write(`${JSON.stringify({ packCount: packs.length, output: 'reports/current/issue-evidence-packs' })}\n`);
}

main();

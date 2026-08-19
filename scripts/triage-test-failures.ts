import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../config/qa.config.js';

interface FailedTest {
  id: string;
  status: string;
  expectedStatus: string;
  errors: string[];
}

interface TestFinding {
  id: string;
  fingerprint: string;
  testId: string;
  classification: 'PRODUCT_BUG';
  priority: 'Cao';
  existingIssueNo: number;
  description: string;
  expected: string;
  evidence: string[];
}

function main(): void {
  const root = resolve(config.EVIDENCE_OUTPUT_DIR);
  const findingsByFingerprint = new Map<string, { finding: TestFinding; modifiedAt: number }>();
  const directories = existsSync(root) ? walk(root) : [];
  for (const directory of directories) {
      const resultPath = resolve(directory, 'result.json');
      if (!existsSync(resultPath)) continue;
      const result = JSON.parse(readFileSync(resultPath, 'utf8')) as FailedTest;
      if (result.id !== 'E2E-CONTACT-002 @edge' || result.status === result.expectedStatus) continue;
      const fingerprint = createHash('sha256').update(`${result.id}\ncontact-form-novalidate`).digest('hex');
      const finding: TestFinding = {
        id: `TEST-FAILURE-${fingerprint.slice(0, 12)}`,
        fingerprint,
        testId: 'E2E-CONTACT-002',
        classification: 'PRODUCT_BUG',
        priority: 'Cao',
        existingIssueNo: 30,
        description: 'The public consultation form has novalidate enabled. With an invalid email, a real click on Gửi still raises a submit attempt (the QA harness prevents the request from leaving the browser).',
        expected: 'The contact form must block invalid email before submit, show deterministic validation feedback, and send no request.',
        evidence: ['result.json', 'screenshot.png', 'annotated.png', 'focus.png', 'focus.annotated.png', 'focus.json', 'dom.html', 'console.json', 'network.json'].map((name) => resolve(directory, name)).filter(existsSync)
      };
      const existing = findingsByFingerprint.get(fingerprint);
      const modifiedAt = statSync(resultPath).mtimeMs;
      if (!existing || modifiedAt > existing.modifiedAt) findingsByFingerprint.set(fingerprint, { finding, modifiedAt });
  }
  const findings = [...findingsByFingerprint.values()].map(({ finding }) => finding);
  mkdirSync(resolve('bugs'), { recursive: true });
  writeFileSync(resolve('bugs', 'test-findings.json'), JSON.stringify(findings, null, 2));
  process.stdout.write(`${JSON.stringify({ findings: findings.length, ids: findings.map((finding) => finding.id) })}\n`);
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? [path, ...walk(path)] : [];
  });
}

main();

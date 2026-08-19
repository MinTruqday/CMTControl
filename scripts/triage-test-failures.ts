import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  const root = resolve(config.EVIDENCE_OUTPUT_DIR, 'manual');
  const findings: TestFinding[] = [];
  if (existsSync(root)) {
    for (const entry of readdirSync(root)) {
      const directory = resolve(root, entry);
      const resultPath = resolve(directory, 'result.json');
      if (!existsSync(resultPath)) continue;
      const result = JSON.parse(readFileSync(resultPath, 'utf8')) as FailedTest;
      if (result.id !== 'E2E-CONTACT-002 @edge' || result.status === result.expectedStatus) continue;
      const fingerprint = createHash('sha256').update(`${result.id}\ncontact-form-novalidate`).digest('hex');
      findings.push({
        id: `TEST-FAILURE-${fingerprint.slice(0, 12)}`,
        fingerprint,
        testId: 'E2E-CONTACT-002',
        classification: 'PRODUCT_BUG',
        priority: 'Cao',
        existingIssueNo: 30,
        description: 'The public consultation form has novalidate enabled. An invalid email leaves the form invalid but does not enable browser submission blocking.',
        expected: 'The contact form must reject invalid email input before submission and preserve deterministic validation behavior.',
        evidence: ['result.json', 'screenshot.png', 'annotated.png', 'focus.png', 'focus.annotated.png', 'focus.json', 'dom.html', 'console.json', 'network.json'].map((name) => resolve(directory, name)).filter(existsSync)
      });
    }
  }
  mkdirSync(resolve('bugs'), { recursive: true });
  writeFileSync(resolve('bugs', 'test-findings.json'), JSON.stringify(findings, null, 2));
  process.stdout.write(`${JSON.stringify({ findings: findings.length, ids: findings.map((finding) => finding.id) })}\n`);
}

main();

import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const testCase = z.object({ id: z.string().regex(/^AI-GEN-[A-Z0-9-]+$/), title: z.string().min(1), type: z.enum(['UI', 'E2E', 'API']), preconditions: z.array(z.string()), steps: z.array(z.string()).min(1), expected: z.string().min(1), safeToRun: z.literal(false) });
const output = z.object({ generatedAt: z.string(), model: z.string(), advisoryOnly: z.literal(true), testCases: z.array(testCase).min(1).max(5) });

async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL;
  const base = process.env.OLLAMA_BASE_URL?.startsWith('http') ? process.env.OLLAMA_BASE_URL : 'http://127.0.0.1:11434';
  if (!model) throw new Error('OLLAMA_MODEL_REQUIRED');
  const findings = ['runtime-findings.json', 'test-findings.json'].flatMap((name) => { const path = resolve('bugs', name); return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as unknown[] : []; });
  if (!findings.length) throw new Error('NO_FINDINGS_AVAILABLE');
  const prompt = ['Return JSON only: {"testCases":[{"id":"AI-GEN-001","title":"","type":"UI","preconditions":[],"steps":[""],"expected":"","safeToRun":false}]}', 'Generate one advisory test case from this deterministic finding. safeToRun must be false.', JSON.stringify(findings[0])].join('\n');
  const response = await fetch(`${base.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, format: 'json', options: { temperature: 0, num_predict: 400 } }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const value = await response.json() as { response?: string };
  const parsed = JSON.parse(value.response ?? '');
  const result = output.parse({ generatedAt: new Date().toISOString(), model, advisoryOnly: true, testCases: parsed.testCases });
  mkdirSync(resolve('reports/current'), { recursive: true });
  writeFileSync(resolve('reports/current/ai-test-case-drafts.json'), JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify({ count: result.testCases.length, output: 'reports/current/ai-test-case-drafts.json' }));
}
main().catch(error => { process.stderr.write(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

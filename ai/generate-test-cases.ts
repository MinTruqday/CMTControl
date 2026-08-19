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
  const prompt = [
    'You are a senior Vietnamese QA engineer reviewing a real public website. Write test cases the way an experienced human tester would: concrete user intent, observable steps, realistic data, and unambiguous expected behavior.',
    'Return JSON only with this shape: {"testCases":[{"id":"AI-GEN-001","title":"","type":"UI","preconditions":[],"steps":[""],"expected":"","safeToRun":false}]}.',
    'Create 1 to 3 advisory cases. safeToRun must always be false. Do not invent APIs, credentials, database state, source files, or product behavior not supported by the finding.',
    'For each case: use Vietnamese; state the actor and page in preconditions; include valid and invalid/boundary behavior when relevant; keep steps reproducible; expected must describe what the user can actually see or verify.',
    'Consider applicable risks: validation, error message clarity, duplicate submission, loading state, mobile layout, keyboard focus, Vietnamese/English/Japanese localization, broken asset fallback, and HTTP response behavior. Do not force irrelevant risks.',
    'Deterministic finding (source of truth):',
    JSON.stringify(findings[0])
  ].join('\n');
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

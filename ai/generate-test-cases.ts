import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { parseJsonResponse, qaPrompt } from './qa-prompt.js';

const testCase = z.object({ id: z.string().regex(/^AI-GEN-[A-Z0-9-]+$/), title: z.string().min(1), type: z.enum(['UI', 'E2E', 'API']), preconditions: z.array(z.string().min(1)).min(2), steps: z.array(z.string().min(1)).min(2).max(8), expected: z.string().min(1), safeToRun: z.literal(false) });
const output = z.object({ generatedAt: z.string(), model: z.string(), advisoryOnly: z.literal(true), testCases: z.array(testCase).min(1).max(5) });
const generatedCases = z.object({ testCases: z.array(testCase).min(1).max(3) });

async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL;
  const base = process.env.OLLAMA_BASE_URL?.startsWith('http') ? process.env.OLLAMA_BASE_URL : 'http://127.0.0.1:11434';
  if (!model) throw new Error('OLLAMA_MODEL_REQUIRED');
  const findings = ['runtime-findings.json', 'test-findings.json'].flatMap((name) => { const path = resolve('bugs', name); return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as unknown[] : []; });
  if (!findings.length) throw new Error('NO_FINDINGS_AVAILABLE');
  const prompt = qaPrompt({
    task: 'Tạo 1 đến 3 test case tư vấn từ finding QA thực tế.',
    outputShape: '{"testCases":[{"id":"AI-GEN-001","title":"","type":"UI|E2E|API","preconditions":["Vai trò: ...","Trang/phạm vi: ..."],"steps":["...","..."],"expected":"...","safeToRun":false}]}',
    rules: ['Mỗi case phải có vai trò người dùng và trang/phạm vi trong preconditions.', 'safeToRun luôn false; đây là bản nháp để người vận hành duyệt.', 'Chỉ dùng UI, E2E hoặc API khi finding chứng minh phạm vi đó.', 'Chỉ khi phù hợp mới xét validation, boundary, tải chậm, di động, bàn phím, đa ngôn ngữ, fallback asset hoặc HTTP.', 'Không tạo case trùng ý; expected phải là điều nhìn thấy hoặc đo được.'],
    evidence: findings.slice(0, 3)
  });
  const response = await fetch(`${base.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, format: 'json', options: { temperature: 0.25, num_predict: 500 } }), signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const value = await response.json() as { response?: string };
  const parsed = generatedCases.parse(parseJsonResponse(value.response ?? ''));
  const result = output.parse({ generatedAt: new Date().toISOString(), model, advisoryOnly: true, testCases: parsed.testCases });
  mkdirSync(resolve('reports/current'), { recursive: true });
  writeFileSync(resolve('reports/current/ai-test-case-drafts.json'), JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify({ count: result.testCases.length, output: 'reports/current/ai-test-case-drafts.json' }));
}
main().catch(error => { process.stderr.write(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

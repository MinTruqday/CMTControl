import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { parseJsonResponse, qaPrompt } from './qa-prompt.js';

const schema = z.object({ executiveSummary: z.string().min(1).max(1600), actionItems: z.array(z.string().min(1)).max(8), confidence: z.number().min(0).max(1) });
async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL;
  const base = process.env.OLLAMA_BASE_URL?.startsWith('http') ? process.env.OLLAMA_BASE_URL : 'http://127.0.0.1:11434';
  if (!model) throw new Error('OLLAMA_MODEL_REQUIRED');
  const report = resolve('reports/current/index.html');
  if (!existsSync(report)) throw new Error('REPORT_NOT_FOUND');
  const prompt = qaPrompt({
    task: 'Tóm tắt báo cáo QA xác định cho người ra quyết định.',
    outputShape: '{"executiveSummary":"","actionItems":[""],"confidence":0.0}',
    rules: ['Không thay đổi PASS/FAIL hay bịa số liệu. actionItems phải bắt nguồn từ finding trong báo cáo.'],
    evidence: { report: readFileSync(report, 'utf8').replace(/<[^>]+>/g, ' ').slice(0, 12000) }
  });
  const response = await fetch(`${base.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, format: 'json', options: { temperature: 0.1, num_predict: 700 } }), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const value = await response.json() as { response?: string };
  const summary = schema.parse(parseJsonResponse(value.response ?? ''));
  const result = { generatedAt: new Date().toISOString(), model, advisoryOnly: true, ...summary };
  mkdirSync(resolve('reports/current'), { recursive: true }); writeFileSync(resolve('reports/current/ai-report-summary.json'), JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify({ output: 'reports/current/ai-report-summary.json', confidence: result.confidence }));
}
main().catch(error => { process.stderr.write(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

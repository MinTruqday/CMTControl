import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { parseJsonResponse, qaPrompt } from './qa-prompt.js';

interface Finding {
  id: string;
  testId: string;
  priority: string;
  classification: string;
  description: string;
  expected: string;
}

const analysisSchema = z.object({
  items: z.array(z.object({
    findingId: z.string().min(1),
    possibleCause: z.string().min(1).max(1200),
    investigation: z.string().min(1).max(1200)
  })).max(100)
});

function load(): Finding[] {
  const runtimePath = resolve('bugs/runtime-findings.json');
  const testPath = resolve('bugs/test-findings.json');
  const runtime = existsSync(runtimePath) ? JSON.parse(readFileSync(runtimePath, 'utf8')) as Array<{ id: string; testId: string; priority: string; classification: string; page: string; assetUrl: string; observedStatus: number; expected: string }> : [];
  const test = existsSync(testPath) ? JSON.parse(readFileSync(testPath, 'utf8')) as Array<Finding> : [];
  return [...runtime.map((item) => ({ id: item.id, testId: item.testId, priority: item.priority, classification: item.classification, description: `${item.page}: ${item.assetUrl} returned HTTP ${item.observedStatus}.`, expected: item.expected })), ...test];
}

async function main(): Promise<void> {
  const rawBase = process.env.OLLAMA_BASE_URL?.startsWith('http') ? process.env.OLLAMA_BASE_URL : 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL;
  if (!model) throw new Error('OLLAMA_MODEL_REQUIRED');
  const findings = load();
  if (!findings.length) throw new Error('NO_FINDINGS_AVAILABLE');
  const prompt = qaPrompt({
    task: 'Tóm tắt các finding QA cho developer điều tra, không thay thế kết quả kiểm thử xác định.',
    outputShape: '{"items":[{"findingId":"","possibleCause":"","investigation":""}]}',
    rules: ['Mỗi finding có tối đa một mục; possibleCause là giả thuyết, không khẳng định chắc chắn.', 'Không thay đổi severity/priority và không đề xuất ghi hoặc sửa hệ thống bên ngoài.'],
    evidence: findings
  });
  const response = await fetch(`${rawBase.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, options: { temperature: 0.1, num_predict: 180 } }), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const value = await response.json() as { response?: string; eval_count?: number; total_duration?: number };
  if (!value.response) throw new Error('OLLAMA_EMPTY_RESPONSE');
  const analysis = analysisSchema.parse(parseJsonResponse(value.response));
  const result = { generatedAt: new Date().toISOString(), model, findingIds: findings.map((item) => item.id), advisoryOnly: true, analysis, evaluationTokenCount: value.eval_count ?? null, totalDurationNs: value.total_duration ?? null };
  mkdirSync(resolve('reports/current'), { recursive: true });
  writeFileSync(resolve('reports/current/ollama-findings-analysis.json'), JSON.stringify(result, null, 2));
  process.stdout.write(`${JSON.stringify({ model, findingCount: findings.length, advisoryOnly: true, output: 'reports/current/ollama-findings-analysis.json' })}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });

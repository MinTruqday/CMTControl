import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Finding {
  id: string;
  testId: string;
  priority: string;
  classification: string;
  description: string;
  expected: string;
}

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
  const prompt = ['You are a QA analysis assistant.', 'Use only the deterministic facts below.', 'For each finding, provide a concise likely cause and a suggested developer investigation step.', 'Do not decide severity, do not claim certainty, do not propose writing to external systems.', JSON.stringify(findings)].join('\n');
  const response = await fetch(`${rawBase.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, options: { temperature: 0.1, num_predict: 180 } }), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const value = await response.json() as { response?: string; eval_count?: number; total_duration?: number };
  if (!value.response) throw new Error('OLLAMA_EMPTY_RESPONSE');
  const result = { generatedAt: new Date().toISOString(), model, findingIds: findings.map((item) => item.id), advisoryOnly: true, analysis: value.response.trim(), evaluationTokenCount: value.eval_count ?? null, totalDurationNs: value.total_duration ?? null };
  mkdirSync(resolve('reports/current'), { recursive: true });
  writeFileSync(resolve('reports/current/ollama-findings-analysis.json'), JSON.stringify(result, null, 2));
  process.stdout.write(`${JSON.stringify({ model, findingCount: findings.length, advisoryOnly: true, output: 'reports/current/ollama-findings-analysis.json' })}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });

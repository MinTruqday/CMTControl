import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { z } from 'zod';
import { parseJsonResponse, qaPrompt } from './qa-prompt.js';

export interface FindingInput {
  id: string;
  testId: string;
  priority: string;
  classification: string;
  description: string;
  expected: string;
  evidence: string[];
}

const schema = z.object({
  confidence: z.number().min(0).max(1),
  possibleCause: z.string().min(1).max(1200),
  screenshotAssessment: z.string().min(1).max(1200),
  suspectedFiles: z.array(z.string().max(300)).max(8),
  recommendation: z.string().min(1).max(1200),
  issueDraft: z.object({ title: z.string().min(1).max(240), actual: z.string().min(1).max(1400), expected: z.string().min(1).max(1400), reproduction: z.array(z.string().min(1).max(500)).min(1).max(8) })
});

export type AiFindingAnalysis = z.infer<typeof schema> & { findingId: string; model: string; generatedAt: string; visionUsed: boolean; advisoryOnly: true };

function imageEvidence(paths: string[]): string | undefined {
  return paths.find((path) => existsSync(path) && ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(path).toLowerCase()));
}

function parse(value: string): z.infer<typeof schema> {
  return schema.parse(parseJsonResponse(value));
}

export async function analyzeFinding(finding: FindingInput, baseUrl = process.env.OLLAMA_BASE_URL, model = process.env.OLLAMA_MODEL): Promise<AiFindingAnalysis> {
  if (!model) throw new Error('OLLAMA_CONFIGURATION_REQUIRED');
  const endpoint = baseUrl?.startsWith('http') ? baseUrl : 'http://127.0.0.1:11434';
  const image = imageEvidence(finding.evidence);
  const prompt = qaPrompt({ task: 'Phân tích một finding QA và soạn nháp issue để developer điều tra.', outputShape: '{"confidence":0.0,"possibleCause":"","screenshotAssessment":"","suspectedFiles":[],"recommendation":"","issueDraft":{"title":"","actual":"","expected":"","reproduction":[""]}}', rules: ['Không quyết định PASS/FAIL hoặc tự thay đổi severity/priority.', 'Ảnh chỉ chứng minh nội dung nhìn thấy; không dùng ảnh để khẳng định nguyên nhân phía server.', 'Không có source code được cung cấp thì suspectedFiles phải là [].', 'possibleCause là giả thuyết có điều kiện; recommendation là bước điều tra cụ thể.', 'Viết toàn bộ bằng tiếng Việt tự nhiên. title phải mô tả ảnh hưởng người dùng và không được bắt đầu bằng “Kiểm tra”, “Test”, “Bug”, hoặc mã finding. actual/expected phải cụ thể, không dùng câu mẫu “hoạt động đúng”.'] , evidence: { id: finding.id, testId: finding.testId, deterministicPriority: finding.priority, deterministicClassification: finding.classification, description: finding.description, expected: finding.expected, screenshotProvided: Boolean(image) } });
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, images: image ? [readFileSync(image).toString('base64')] : undefined, stream: false, think: false, format: 'json', options: { temperature: 0.1, num_predict: 900 } }), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const payload = await response.json() as { response?: string };
  if (!payload.response) throw new Error('OLLAMA_EMPTY_RESPONSE');
  const analysis: AiFindingAnalysis = { ...parse(payload.response), findingId: finding.id, model, generatedAt: new Date().toISOString(), visionUsed: Boolean(image), advisoryOnly: true };
  mkdirSync(resolve('reports/current/ai-findings'), { recursive: true });
  writeFileSync(resolve('reports/current/ai-findings', `${finding.id}.json`), JSON.stringify(analysis, null, 2));
  return analysis;
}

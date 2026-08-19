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
  const images = paths.filter((path) => existsSync(path) && ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(path).toLowerCase()));
  return images.sort((left, right) => evidenceRank(left) - evidenceRank(right))[0];
}

function evidenceRank(path: string): number {
  const name = path.split('/').at(-1)?.toLowerCase() ?? '';
  if (name.startsWith('focus.')) return 0;
  if (name.includes('annotated')) return 1;
  if (name.includes('screenshot')) return 2;
  return 3;
}

function parse(value: string): z.infer<typeof schema> {
  return schema.parse(parseJsonResponse(value));
}

function qualityIssues(analysis: z.infer<typeof schema>): string[] {
  return [
    ...(analysis.screenshotAssessment.trim().length < 40 ? ['screenshotAssessment quá ngắn'] : [])
  ];
}

export async function analyzeFinding(finding: FindingInput, baseUrl = process.env.OLLAMA_BASE_URL, model = process.env.OLLAMA_MODEL): Promise<AiFindingAnalysis> {
  if (!model) throw new Error('OLLAMA_CONFIGURATION_REQUIRED');
  const endpoint = baseUrl?.startsWith('http') ? baseUrl : 'http://127.0.0.1:11434';
  const image = imageEvidence(finding.evidence);
  const prompt = qaPrompt({ task: 'Phân tích một finding QA và soạn nháp issue để developer điều tra.', outputShape: '{"confidence":0.0,"possibleCause":"","screenshotAssessment":"","suspectedFiles":[],"recommendation":"","issueDraft":{"title":"","actual":"","expected":"","reproduction":[""]}}', rules: ['Không quyết định PASS/FAIL hoặc tự thay đổi severity/priority.', 'Ảnh chỉ chứng minh nội dung nhìn thấy; không dùng ảnh để khẳng định nguyên nhân phía server.', 'screenshotAssessment phải có ít nhất 40 ký tự và nêu cụ thể các chi tiết nhìn thấy. Trước khi mô tả ảnh, đối chiếu ảnh với description. Nếu ảnh không trực tiếp cho thấy cùng lỗi hoặc không thấy lỗi, screenshotAssessment phải bắt đầu bằng “Ảnh không xác nhận trực tiếp”, confidence không quá 0.4, và không được dùng ảnh làm bằng chứng cho actual.', 'Không được gọi một HTTP asset error là lỗi giao diện, trừ khi ảnh thật sự cho thấy phần tử đó không hiển thị.', 'Không có source code được cung cấp thì suspectedFiles phải là [].', 'possibleCause là giả thuyết có điều kiện; recommendation là bước điều tra cụ thể.', 'Mọi chuỗi đầu ra phải bằng tiếng Việt tự nhiên, không để sót câu tiếng Anh. title phải mô tả ảnh hưởng người dùng và không được bắt đầu bằng “Kiểm tra”, “Test”, “Bug”, hoặc mã finding. actual/expected phải cụ thể, không dùng câu mẫu “hoạt động đúng”.'] , evidence: { id: finding.id, testId: finding.testId, deterministicPriority: finding.priority, deterministicClassification: finding.classification, description: finding.description, expected: finding.expected, screenshotProvided: Boolean(image), screenshotFile: image ? image.split('/').at(-1) : null } });
  const generate = async (retry: string | undefined): Promise<z.infer<typeof schema>> => {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt: retry ? `${prompt}\nLần trả lời trước không đạt chất lượng: ${retry}. Hãy trả lại toàn bộ JSON mới, không giải thích.` : prompt, images: image ? [readFileSync(image).toString('base64')] : undefined, stream: false, think: false, format: 'json', options: { temperature: 0.1, num_predict: 420 } }), signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
    const payload = await response.json() as { response?: string };
    if (!payload.response) throw new Error('OLLAMA_EMPTY_RESPONSE');
    return parse(payload.response);
  };
  let reviewed = await generate(undefined);
  let issues = qualityIssues(reviewed);
  if (issues.length > 0) {
    reviewed = await generate(issues.join('; '));
    issues = qualityIssues(reviewed);
  }
  if (issues.length > 0) throw new Error(`AI_OUTPUT_QUALITY_REJECTED:${issues.join(',')}`);
  const analysis: AiFindingAnalysis = { ...reviewed, findingId: finding.id, model, generatedAt: new Date().toISOString(), visionUsed: Boolean(image), advisoryOnly: true };
  mkdirSync(resolve('reports/current/ai-findings'), { recursive: true });
  writeFileSync(resolve('reports/current/ai-findings', `${finding.id}.json`), JSON.stringify(analysis, null, 2));
  return analysis;
}

function loadFinding(id: string): FindingInput | undefined {
  const files = [resolve('bugs/runtime-findings.json'), resolve('bugs/test-findings.json')];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const item = (JSON.parse(readFileSync(file, 'utf8')) as Array<Record<string, unknown>>).find((candidate) => candidate.id === id);
    if (!item) continue;
    const description = typeof item.description === 'string' ? item.description : `${item.page}: asset ${item.assetUrl} trả HTTP ${item.observedStatus}.`;
    if (typeof item.testId !== 'string' || typeof item.priority !== 'string' || typeof item.classification !== 'string' || typeof item.expected !== 'string' || !Array.isArray(item.evidence)) throw new Error('FINDING_SHAPE_INVALID');
    return { id, testId: item.testId, priority: item.priority, classification: item.classification, description, expected: item.expected, evidence: item.evidence.filter((value): value is string => typeof value === 'string') };
  }
  return undefined;
}

async function cli(): Promise<void> {
  const id = process.argv.find((argument) => argument.startsWith('--id='))?.slice('--id='.length);
  if (!id) throw new Error('FINDING_ID_REQUIRED: npm run qa:ai:finding -- --id=FINDING_ID');
  const finding = loadFinding(id);
  if (!finding) throw new Error(`FINDING_NOT_FOUND:${id}`);
  const analysis = await analyzeFinding(finding);
  process.stdout.write(`${JSON.stringify({ findingId: analysis.findingId, model: analysis.model, visionUsed: analysis.visionUsed, output: `reports/current/ai-findings/${analysis.findingId}.json` })}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  cli().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}

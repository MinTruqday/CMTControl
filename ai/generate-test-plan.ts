import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { discoverSite, type SiteDiscovery } from '../engine/discovery/site.js';
import { parseJsonResponse, qaPrompt } from './qa-prompt.js';

const testCase = z.object({
  id: z.string().regex(/^AI-PLAN-\d{3}$/),
  title: z.string().min(12).max(100),
  scopeUrl: z.string().url(),
  steps: z.array(z.string().min(8).max(120)).min(2).max(3),
  expected: z.string().min(12).max(280)
});
const generated = z.object({ testCases: z.array(testCase).min(1).max(1) });
const result = z.object({ generatedAt: z.string(), model: z.string(), advisoryOnly: z.literal(true), context: z.object({ routes: z.number(), pagesSampled: z.number(), findings: z.number() }), testCases: z.array(testCase).min(1).max(1) });
const naturalTitle = z.object({ title: z.string().min(12).max(100).refine((title) => /^(Khi|Người dùng|Một khách)/u.test(title), 'TITLE_MUST_START_WITH_A_USER_JOURNEY') });

function text(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function values(html: string, pattern: RegExp, limit: number): string[] {
  return [...html.matchAll(pattern)].map((match) => text(match[1])).filter(Boolean).slice(0, limit);
}
function pickRoutes(discovery: SiteDiscovery): string[] {
  const score = (route: SiteDiscovery['routes'][number]): number => {
    const path = new URL(route.url).pathname;
    const locale = path.startsWith('/vi') ? 0 : path.startsWith('/en') ? 20 : 40;
    const section = /\/contact(\/|$)/i.test(path) ? 0 : /\/products?(\/|$)/i.test(path) ? 2 : /\/news(\/|$)/i.test(path) ? 4 : /\/about(\/|$)/i.test(path) ? 6 : /\/product\//i.test(path) ? 8 : 12;
    return locale + section + path.length / 1000;
  };
  return discovery.routes.filter((route) => route.status >= 200 && route.status < 400).sort((a, b) => score(a) - score(b)).slice(0, 5).map((route) => route.url);
}
async function pageContext(url: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { 'user-agent': 'CMT-QA-Control/1.0' } });
    const html = await response.text();
    return {
      url,
      status: response.status,
      title: values(html, /<title[^>]*>([\s\S]*?)<\/title>/gi, 1)[0] ?? '',
      headings: values(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, 5),
      forms: [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)].slice(0, 1).map((form) => ({ inputs: [...form[0].matchAll(/<(?:input|textarea|select)\b[^>]*(?:name|type|placeholder)=["']?([^"'\s>]+)/gi)].map((input) => input[1]).slice(0, 5), buttons: values(form[0], /<button[^>]*>([\s\S]*?)<\/button>/gi, 3) }))
    };
  } catch (error) {
    return { url, unavailable: error instanceof Error ? error.message : 'PAGE_CONTEXT_UNAVAILABLE' };
  }
}
function findings(): unknown[] {
  return ['runtime-findings.json', 'test-findings.json'].flatMap((name) => {
    const file = resolve('bugs', name);
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as unknown[] : [];
  }).slice(0, 12);
}

async function humanizeTitle(base: string, model: string, endpoint: string): Promise<string> {
  if (/^(Khi|Người dùng|Một khách)/u.test(base)) return base;
  const prompt = qaPrompt({
    task: 'Viết lại duy nhất title test case theo giọng người dùng tự nhiên.',
    outputShape: '{"title":"Khi ..."}',
    rules: ['Title bắt buộc bắt đầu bằng “Khi”, “Người dùng” hoặc “Một khách”.', 'Không dùng từ “Kiểm tra”, “Đảm bảo”, “Xác minh”, “Test”, hoặc thuật ngữ kỹ thuật. Không thêm chi tiết ngoài title gốc.'],
    evidence: { originalTitle: base }
  });
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, format: 'json', options: { temperature: 0.2, num_predict: 120 } }), signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`OLLAMA_TITLE_HTTP_${response.status}`);
  const payload = await response.json() as { response?: string };
  return naturalTitle.parse(parseJsonResponse(payload.response ?? '')).title;
}

async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL;
  const base = process.env.OLLAMA_BASE_URL?.startsWith('http') ? process.env.OLLAMA_BASE_URL : 'http://127.0.0.1:11434';
  if (!model) throw new Error('OLLAMA_MODEL_REQUIRED');
  const outputFile = resolve('reports/current/ai-test-plan.json');
  if (process.env.AI_TEST_PLAN_REWRITE_ONLY === 'true' && existsSync(outputFile)) {
    const existing = result.parse(JSON.parse(readFileSync(outputFile, 'utf8')));
    const title = await humanizeTitle(existing.testCases[0].title, model, base);
    const rewritten = { ...existing, generatedAt: new Date().toISOString(), model, testCases: [{ ...existing.testCases[0], title }] };
    writeFileSync(outputFile, JSON.stringify(rewritten, null, 2));
    process.stdout.write(JSON.stringify({ output: 'reports/current/ai-test-plan.json', rewritten: true }));
    return;
  }
  const discoveryFile = resolve('reports/current/site-discovery.json');
  const discovery = existsSync(discoveryFile)
    ? JSON.parse(readFileSync(discoveryFile, 'utf8')) as SiteDiscovery
    : await discoverSite();
  const pages = await Promise.all(pickRoutes(discovery).map(pageContext));
  const knownFindings = findings();
  const prompt = qaPrompt({
    task: 'Viết đúng một test case ngắn do QA senior viết cho website thực tế, dùng ngữ cảnh trang hiện tại và finding đã xác nhận.',
    outputShape: '{"testCases":[{"id":"AI-PLAN-001","title":"...","scopeUrl":"https://...","steps":["...","..."],"expected":"..."}]}',
    rules: [
      'Viết như QA có kinh nghiệm, không như checklist. Title phải mô tả mong muốn hoặc hành trình của người dùng và không được bắt đầu bằng “Kiểm tra”.',
      'Mỗi scopeUrl phải có trong page context; chỉ tham chiếu form, field, nút hoặc nội dung thực sự xuất hiện trong context. Không bịa dữ liệu.',
      'Không bắt đầu mọi title bằng “Kiểm tra”. Không dùng câu mẫu chung chung như “hoạt động đúng”, “hiển thị đúng” hoặc “đảm bảo”.',
      'Chỉ có 2 hoặc 3 bước, mỗi bước là một hành động rõ ràng. expected là điều người dùng nhìn thấy hoặc đo được.'
    ],
    evidence: { site: { baseUrl: discovery.baseUrl, routes: discovery.routes.length, brokenImages: discovery.brokenImages.slice(0, 4), assetFailures: discovery.assetFailures.slice(0, 3).map((item) => ({ page: item.page, url: item.url, status: item.status })) }, pages, confirmedFindings: knownFindings.slice(0, 4) }
  });
  const response = await fetch(`${base.replace(/\/$/, '')}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, think: false, format: 'json', options: { temperature: 0.35, num_predict: 420 } }), signal: AbortSignal.timeout(300_000) });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  const payload = await response.json() as { response?: string };
  mkdirSync(resolve('reports/current'), { recursive: true });
  writeFileSync(resolve('reports/current/ai-test-plan.last-response.txt'), payload.response ?? '');
  const plan = generated.parse(parseJsonResponse(payload.response ?? ''));
  const title = await humanizeTitle(plan.testCases[0].title, model, base);
  const output = result.parse({ generatedAt: new Date().toISOString(), model, advisoryOnly: true, context: { routes: discovery.routes.length, pagesSampled: pages.length, findings: knownFindings.length }, testCases: [{ ...plan.testCases[0], title }] });
  writeFileSync(outputFile, JSON.stringify(output, null, 2));
  process.stdout.write(JSON.stringify({ output: 'reports/current/ai-test-plan.json', testCases: output.testCases.length, context: output.context }));
}
main().catch((error) => { process.stderr.write(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

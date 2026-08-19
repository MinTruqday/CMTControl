import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../config/qa.config.js';

interface RunData {
  runId: string;
  mode: string;
  statuses: number[];
  completedAt: string;
}

interface SiteData {
  routes: Array<{ status: number }>;
  images: string[];
  brokenImages: string[];
  consoleErrors: unknown[];
  assetFailures: unknown[];
}

interface SheetData {
  issueCount: number;
  missingRequiredHeaders: string[];
  statusCounts: Record<string, number>;
  unclassifiedIssueNumbers: number[];
  issuesWithoutStatus: number[];
}

function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as T : undefined;
}

function latestRun(): RunData | undefined {
  const root = resolve(config.REPORT_OUTPUT_DIR);
  if (!existsSync(root)) return undefined;
  const entry = readdirSync(root).sort().reverse().find((name) => existsSync(resolve(root, name, 'run.json')));
  return entry ? readJson<RunData>(resolve(root, entry, 'run.json')) : undefined;
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function list(values: string[]): string {
  return values.length === 0 ? '<p>None</p>' : `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
}

function main(): void {
  const output = resolve(config.REPORT_OUTPUT_DIR);
  mkdirSync(output, { recursive: true });
  const run = latestRun();
  const site = readJson<SiteData>(resolve(output, 'site-discovery.json'));
  const sheet = readJson<SheetData>(resolve(output, 'workbook-profile.json'));
  const findings = readJson<Array<{ id: string; page: string; assetUrl: string; observedStatus: number }>>(resolve('bugs', 'runtime-findings.json')) ?? [];
  const testFindings = readJson<Array<{ id: string; testId: string; description: string; existingIssueNo: number }>>(resolve('bugs', 'test-findings.json')) ?? [];
  const healthyRoutes = site?.routes.filter((route) => route.status >= 200 && route.status < 400).length ?? 0;
  const report = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>QA Report</title><style>body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;line-height:1.5}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.5rem;text-align:left}th{background:#f3f4f6}.pass{color:#067647}.fail{color:#b42318}footer{margin-top:3rem;text-align:center;color:#667085;font-size:.8rem}</style></head><body><h1>QA Runtime Report</h1><h2>Run</h2><table><tr><th>Run ID</th><td>${escapeHtml(run?.runId ?? 'No completed orchestrated run')}</td></tr><tr><th>Completed</th><td>${escapeHtml(run?.completedAt ?? 'N/A')}</td></tr><tr><th>Group exit codes</th><td>${escapeHtml(run?.statuses.join(', ') ?? 'N/A')}</td></tr></table><h2>Public site discovery</h2><table><tr><th>Routes healthy</th><td class="${site && healthyRoutes === site.routes.length ? 'pass' : 'fail'}">${healthyRoutes}/${site?.routes.length ?? 0}</td></tr><tr><th>Images discovered</th><td>${site?.images.length ?? 0}</td></tr><tr><th>Broken images</th><td class="${(site?.brokenImages.length ?? 0) === 0 ? 'pass' : 'fail'}">${site?.brokenImages.length ?? 0}</td></tr><tr><th>Failed asset responses</th><td class="${(site?.assetFailures.length ?? 0) === 0 ? 'pass' : 'fail'}">${site?.assetFailures.length ?? 0}</td></tr><tr><th>Console errors</th><td class="${(site?.consoleErrors.length ?? 0) === 0 ? 'pass' : 'fail'}">${site?.consoleErrors.length ?? 0}</td></tr></table><h2>Confirmed runtime asset findings</h2><table><tr><th>ID</th><th>Page</th><th>Asset</th><th>Status</th></tr>${findings.map((finding) => `<tr><td>${escapeHtml(finding.id)}</td><td>${escapeHtml(finding.page)}</td><td>${escapeHtml(finding.assetUrl)}</td><td>${escapeHtml(finding.observedStatus)}</td></tr>`).join('')}</table><h2>Regression findings from executable tests</h2><table><tr><th>ID</th><th>Test</th><th>Existing Sheet issue</th><th>Finding</th></tr>${testFindings.map((finding) => `<tr><td>${escapeHtml(finding.id)}</td><td>${escapeHtml(finding.testId)}</td><td>${escapeHtml(finding.existingIssueNo)}</td><td>${escapeHtml(finding.description)}</td></tr>`).join('')}</table><h2>Workbook compatibility</h2><table><tr><th>Issues read</th><td>${sheet?.issueCount ?? 0}</td></tr><tr><th>Required headers missing</th><td>${escapeHtml(sheet?.missingRequiredHeaders.length ?? 0)}</td></tr><tr><th>Issues without classification</th><td class="${(sheet?.unclassifiedIssueNumbers.length ?? 0) === 0 ? 'pass' : 'fail'}">${escapeHtml(sheet?.unclassifiedIssueNumbers.join(', ') ?? '')}</td></tr><tr><th>Issues without status</th><td class="${(sheet?.issuesWithoutStatus.length ?? 0) === 0 ? 'pass' : 'fail'}">${escapeHtml(sheet?.issuesWithoutStatus.join(', ') ?? '')}</td></tr><tr><th>Status distribution</th><td>${escapeHtml(JSON.stringify(sheet?.statusCounts ?? {}))}</td></tr></table><h2>Broken image URLs</h2>${list(site?.brokenImages ?? [])}<footer>Copyright by Cao Minh Trung</footer></body></html>`;
  writeFileSync(resolve(output, 'index.html'), report);
}

main();

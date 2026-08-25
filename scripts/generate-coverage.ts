import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../config/qa.config.js';
import { buildCoverage, extractTestIds, type CoverageReport } from '../engine/coverage/model.js';
import { discoverWorkbook, type WorkbookProfile } from '../integrations/google-sheets/discovery.js';

function files(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function executableTestIds(): string[] {
  const executableRoots = ['api', 'engine/api', 'ui', 'e2e', 'visual'];
  return [...new Set(executableRoots.flatMap(files).filter((file) => /\.(ts|json)$/.test(file)).flatMap((file) => extractTestIds(readFileSync(file, 'utf8'))))].sort();
}

function json<T>(path: string): T | undefined {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as T : undefined;
}

async function main(): Promise<void> {
  let profile: WorkbookProfile | undefined;
  let workbookStatus: CoverageReport['workbookStatus'] = config.GOOGLE_SPREADSHEET_ID ? 'UNAVAILABLE' : 'NOT_CONFIGURED';
  let workbookMessage = config.GOOGLE_SPREADSHEET_ID ? 'Workbook could not be read; discovery fallback remains active.' : 'GOOGLE_SPREADSHEET_ID is not configured.';
  if (config.GOOGLE_SPREADSHEET_ID) {
    try {
      profile = await discoverWorkbook();
      workbookStatus = 'AVAILABLE';
      workbookMessage = profile.coverageItems.length > 0 ? 'Requirement/test-case rows were loaded from the workbook.' : 'Workbook is readable but contains no recognized requirement/test-case tab.';
    } catch (error) {
      workbookMessage = error instanceof Error ? error.message : String(error);
    }
  }
  const discovery = json<{ discoveredAt: string; routes: unknown[] }>(resolve(config.REPORT_OUTPUT_DIR, 'site-discovery.json'));
  const aiPlan = json<{ generatedAt: string; testCases: Array<{ id: string; title: string; expected: string }> }>(resolve(config.REPORT_OUTPUT_DIR, 'ai-test-plan.json'));
  const freshAiDrafts = aiPlan && discovery && Date.parse(aiPlan.generatedAt) >= Date.parse(discovery.discoveredAt) ? aiPlan.testCases : [];
  const report = buildCoverage({
    sheetItems: profile?.coverageItems ?? [],
    sheetNames: profile?.sheetNames ?? [],
    executableTestIds: executableTestIds(),
    discoveredRoutes: discovery?.routes.length ?? 0,
    aiDraftItems: freshAiDrafts,
    workbookStatus,
    workbookMessage
  });
  mkdirSync(resolve(config.REPORT_OUTPUT_DIR), { recursive: true });
  writeFileSync(resolve(config.REPORT_OUTPUT_DIR, 'coverage.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ mode: report.mode, mapped: report.mapped, unmapped: report.unmapped, executableTests: report.executableTestIds.length, discoveredRoutes: report.discoveredRoutes, aiDrafts: report.aiDrafts })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

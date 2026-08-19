import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, requireBaseUrl } from '../../config/qa.config.js';

export interface EnvironmentCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  detail: string;
}

export async function checkEnvironment(): Promise<EnvironmentCheck[]> {
  const checks: EnvironmentCheck[] = [];
  if (config.SOURCE_WRITE_ENABLED) checks.push({ name: 'source-write-safety', status: 'FAIL', detail: 'SOURCE_WRITE_ENABLED must be false.' });
  else checks.push({ name: 'source-write-safety', status: 'PASS', detail: 'Source project writes are disabled.' });
  try {
    const response = await fetch(requireBaseUrl(), { redirect: 'follow' });
    checks.push({ name: 'target-availability', status: response.ok ? 'PASS' : 'FAIL', detail: `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ name: 'target-availability', status: 'FAIL', detail: error instanceof Error ? error.message : String(error) });
  }
  if (!config.AI_ANALYSIS_ENABLED) checks.push({ name: 'ollama', status: 'SKIPPED', detail: 'AI_ANALYSIS_ENABLED is false.' });
  else if (!config.OLLAMA_BASE_URL || !config.OLLAMA_MODEL) checks.push({ name: 'ollama', status: 'FAIL', detail: 'Ollama configuration is incomplete.' });
  else {
    try {
      const response = await fetch(new URL('/api/tags', config.OLLAMA_BASE_URL));
      checks.push({ name: 'ollama', status: response.ok ? 'PASS' : 'FAIL', detail: `HTTP ${response.status}` });
    } catch (error) {
      checks.push({ name: 'ollama', status: 'FAIL', detail: error instanceof Error ? error.message : String(error) });
    }
  }
  if (!config.SHEET_SYNC_ENABLED) checks.push({ name: 'sheet-sync', status: 'SKIPPED', detail: 'SHEET_SYNC_ENABLED is false.' });
  else if (!config.GOOGLE_SPREADSHEET_ID || !config.GOOGLE_SERVICE_ACCOUNT_FILE) checks.push({ name: 'sheet-sync', status: 'FAIL', detail: 'Google Sheets write configuration is incomplete.' });
  else checks.push({ name: 'sheet-sync', status: 'PASS', detail: 'Write configuration is present; remote write remains gated by the adapter.' });
  return checks;
}

export async function writeEnvironmentCheck(): Promise<EnvironmentCheck[]> {
  const checks = await checkEnvironment();
  mkdirSync(resolve(config.REPORT_OUTPUT_DIR), { recursive: true });
  writeFileSync(resolve(config.REPORT_OUTPUT_DIR, 'environment-check.json'), JSON.stringify(checks, null, 2));
  return checks;
}

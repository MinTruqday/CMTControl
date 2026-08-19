import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, requireBaseUrl } from '../../config/qa.config.js';
import { createRunId } from '../run/run-id.js';
import { log } from '../logging/logger.js';

async function main(): Promise<void> {
  const apiConfigured = Boolean(config.API_BASE_URL);
  const baseUrl = config.API_BASE_URL ?? requireBaseUrl();
  const runId = process.env.QA_RUN_ID ?? createRunId();
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(baseUrl, { redirect: 'follow', headers: { accept: apiConfigured ? 'application/json' : 'text/html' } });
  } catch (error) {
    throw new Error(`Target environment is unreachable: ${error instanceof Error ? error.message : String(error)}`);
  }
  const durationMs = Math.round(performance.now() - started);
  const body = await response.text();
  const artifact = {
    id: apiConfigured ? 'API-HEALTH-001' : 'HTTP-PAGE-HEALTH-001',
    method: 'GET',
    url: baseUrl,
    status: response.status,
    contentType: response.headers.get('content-type'),
    durationMs,
    bodyLength: body.length,
    passed: response.ok && (apiConfigured ? /json/i.test(response.headers.get('content-type') ?? '') : /text\/html/i.test(response.headers.get('content-type') ?? '')) && body.length > 0
  };
  const output = resolve(config.EVIDENCE_OUTPUT_DIR, runId, artifact.id);
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(artifact, null, 2));
  log('api_result', artifact);
  if (!artifact.passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  log('api_environment_error', { message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 2;
});

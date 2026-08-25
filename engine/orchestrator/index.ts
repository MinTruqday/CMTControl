import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config, requireBaseUrl } from '../../config/qa.config.js';
import { createRunId } from '../run/run-id.js';
import { log } from '../logging/logger.js';

const mode = process.argv.find((item) => item.startsWith('--mode='))?.split('=')[1] ?? 'all';
const runId = createRunId();
const reportDir = resolve(config.REPORT_OUTPUT_DIR, runId);

function execute(label: string, command: string, args: string[]): number {
  log('group_started', { runId, label, command, args });
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, QA_RUN_ID: runId, QA_GROUP: label } });
  const code = result.status ?? 1;
  log('group_finished', { runId, label, code });
  return code;
}

function main(): void {
  if (config.SOURCE_WRITE_ENABLED) throw new Error('SOURCE_WRITE_ENABLED must remain false in version 1');
  requireBaseUrl();
  mkdirSync(reportDir, { recursive: true });
  const duplicateStatus = execute('duplicate-gate', 'npm', ['run', 'qa:duplicate-gate']);
  if (duplicateStatus !== 0) { process.exitCode = duplicateStatus; return; }
  const groups = (mode === 'all' ? ['unit', 'integration', 'security', 'environment', 'api', 'ui', 'e2e', 'visual', 'discovery', 'coverage'] : [mode]).filter((group) => group !== 'visual' || config.VISUAL_TEST_ENABLED);
  const groupResults = groups.map((group) => {
    let status: number;
    if (group === 'unit') status = execute(group, 'npm', ['run', 'test:unit']);
    else if (group === 'integration') status = execute(group, 'npm', ['run', 'test:integration']);
    else if (group === 'security') status = execute(group, 'npm', ['run', 'audit:prod']);
    else if (group === 'environment') status = execute(group, 'npm', ['run', 'qa:check-env']);
    else if (group === 'api') {
      const publicStatus = execute('api-public', 'npm', ['run', 'qa:api:live']);
      const backendStatus = config.API_BASE_URL ? execute('api-backend-health', 'npm', ['run', 'qa:api:direct']) : 0;
      status = publicStatus !== 0 ? publicStatus : backendStatus;
    }
    else if (group === 'discovery') {
      status = execute(group, 'npm', ['run', 'qa:discover-site']);
      execute('triage', 'npm', ['run', 'qa:triage']);
    }
    else if (group === 'coverage') {
      if (config.AI_ANALYSIS_ENABLED) execute('ai-test-plan-advisory', 'npm', ['run', 'qa:ai:test-plan']);
      status = execute(group, 'npm', ['run', 'qa:coverage']);
    }
    else status = execute(group, 'npx', ['playwright', 'test', group === 'ui' ? 'ui/tests' : group === 'e2e' ? 'e2e/tests' : 'visual/tests']);
    return { group, status };
  });
  const statuses = groupResults.map((result) => result.status);
  writeFileSync(resolve(reportDir, 'run.json'), JSON.stringify({ runId, mode, statuses, groupResults, completedAt: new Date().toISOString() }, null, 2));
  if (!existsSync(resolve('reports/current'))) mkdirSync(resolve('reports/current'), { recursive: true });
  execute('report', 'npm', ['run', 'qa:report']);
  process.exitCode = statuses.some((status) => status !== 0) ? 1 : 0;
}

main();

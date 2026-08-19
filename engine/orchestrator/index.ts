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
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, QA_RUN_ID: runId } });
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
  const groups = (mode === 'all' ? ['unit', 'integration', 'environment', 'api', 'ui', 'e2e', 'visual', 'discovery'] : [mode]).filter((group) => group !== 'visual' || config.VISUAL_TEST_ENABLED);
  const statuses = groups.map((group) => {
    if (group === 'unit') return execute(group, 'npm', ['run', 'test:unit']);
    if (group === 'integration') return execute(group, 'npm', ['run', 'test:integration']);
    if (group === 'environment') return execute(group, 'npm', ['run', 'qa:check-env']);
    if (group === 'api') return execute(group, 'npm', ['run', 'qa:api:live']);
    if (group === 'discovery') {
      const status = execute(group, 'npm', ['run', 'qa:discover-site']);
      execute('triage', 'npm', ['run', 'qa:triage']);
      return status;
    }
    return execute(group, 'npx', ['playwright', 'test', group === 'ui' ? 'ui/tests' : group === 'e2e' ? 'e2e/tests' : 'visual/tests']);
  });
  writeFileSync(resolve(reportDir, 'run.json'), JSON.stringify({ runId, mode, statuses, completedAt: new Date().toISOString() }, null, 2));
  if (!existsSync(resolve('reports/current'))) mkdirSync(resolve('reports/current'), { recursive: true });
  execute('report', 'npm', ['run', 'qa:report']);
  process.exitCode = statuses.some((status) => status !== 0) ? 1 : 0;
}

main();

import { writeEnvironmentCheck } from '../engine/environment/check.js';

writeEnvironmentCheck().then((checks) => {
  process.stdout.write(`${JSON.stringify(checks)}\n`);
  if (checks.some((check) => check.status === 'FAIL')) process.exitCode = 1;
});

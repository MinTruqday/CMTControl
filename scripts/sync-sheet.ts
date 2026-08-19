import { syncPendingBugs } from '../integrations/google-sheets/sync.js';

syncPendingBugs().then((audits) => {
  process.stdout.write(`${JSON.stringify(audits)}\n`);
  if (audits.some((audit) => audit.state === 'FAILED')) process.exitCode = 1;
});

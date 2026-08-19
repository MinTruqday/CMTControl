import { discoverWorkbook } from '../integrations/google-sheets/discovery.js';

discoverWorkbook().then((profile) => process.stdout.write(`${JSON.stringify(profile)}\n`));

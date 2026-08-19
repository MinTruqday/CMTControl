import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => { const file = resolve(dir, name); return statSync(file).isDirectory() ? files(file) : [file]; });
}

const roots = ['api', 'ui', 'e2e', 'visual'].filter(dir => { try { return statSync(dir).isDirectory(); } catch { return false; } });
const found = new Map<string, string[]>();
for (const root of roots) for (const file of files(root).filter(file => /\.(ts|json)$/.test(file))) {
  const text = readFileSync(file, 'utf8');
  for (const id of text.matchAll(/\b(?:API|UI|E2E|VISUAL|AUTH)-[A-Z0-9-]+\b/g)) found.set(id[0], [...(found.get(id[0]) ?? []), file]);
}
const duplicates = [...found.entries()].filter(([, paths]) => new Set(paths).size > 1).map(([id, paths]) => ({ id, paths: [...new Set(paths)] }));
mkdirSync(resolve('reports/current'), { recursive: true });
writeFileSync(resolve('reports/current/test-duplicate-report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), testCount: found.size, duplicates }, null, 2));
if (duplicates.length) { process.stderr.write(JSON.stringify(duplicates)); process.exitCode = 1; }
else process.stdout.write(JSON.stringify({ testCount: found.size, duplicates: 0 }));

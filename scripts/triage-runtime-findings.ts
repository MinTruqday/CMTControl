import { readDiscovery, writeRuntimeFindings } from '../engine/classifiers/runtime-findings.js';

const findings = writeRuntimeFindings(readDiscovery());
process.stdout.write(`${JSON.stringify({ findings: findings.length, ids: findings.map((finding) => finding.id) })}\n`);

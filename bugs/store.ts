import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../config/qa.config.js';

export interface BugDraft {
  testId: string;
  category: string;
  feature: string;
  description: string;
  expected: string;
  priority: 'Cao' | 'Trung bình' | 'Thấp';
  evidence: string[];
}

export interface LocalBug extends BugDraft {
  id: string;
  fingerprint: string;
  reporter: string;
  createdDate: string;
  detectedAt: string;
  status: string;
  syncStatus: 'PENDING' | 'COMPLETE' | 'PARTIAL';
  sheetIssueNo?: number;
}

function timestamp(now: Date): { createdDate: string; detectedAt: string } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: config.QA_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { createdDate: `${get('day')}/${get('month')}/${get('year')}`, detectedAt: now.toISOString() };
}

function queuePath(): string {
  return resolve('bugs', 'pending-sync.json');
}

function load(): LocalBug[] {
  const path = queuePath();
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as LocalBug[] : [];
}

export function createLocalBug(draft: BugDraft): LocalBug {
  if (!config.TESTER_NAME) throw new Error('TESTER_NAME is required before creating a bug record');
  const fingerprint = createHash('sha256').update([draft.testId, draft.feature, draft.description, draft.expected].join('\n')).digest('hex');
  const existing = load().find((bug) => bug.fingerprint === fingerprint);
  if (existing) return existing;
  const time = timestamp(new Date());
  const bug: LocalBug = {
    ...draft,
    id: `LOCAL-${crypto.randomUUID()}`,
    fingerprint,
    reporter: config.TESTER_NAME,
    createdDate: time.createdDate,
    detectedAt: time.detectedAt,
    status: config.BUG_INITIAL_STATUS,
    syncStatus: 'PENDING'
  };
  const queue = [...load(), bug];
  mkdirSync(resolve('bugs'), { recursive: true });
  writeFileSync(queuePath(), JSON.stringify(queue, null, 2));
  return bug;
}

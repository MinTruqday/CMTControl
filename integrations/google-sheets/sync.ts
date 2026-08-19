import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { google } from 'googleapis';
import { config } from '../../config/qa.config.js';
import type { LocalBug } from '../../bugs/store.js';

interface SyncAudit {
  bugId: string;
  timestamp: string;
  state: 'PENDING_CONFIGURATION' | 'PENDING_CREDENTIALS' | 'COMPLETE' | 'FAILED';
  reason: string;
}

interface WorksheetHeaders {
  title: string;
  headerRow: number;
  headers: string[];
}

const requiredHeaders = ['No', 'Người tạo', 'Ngày tạo', 'Danh mục', 'Chức năng', 'Nội dung', 'Expected', 'Phân loại', 'Độ ưu tiên', 'Trạng thái', 'Người đối ứng', 'Ngày đối ứng', 'Nguyên nhân', 'Biện pháp đối ứng', 'Ghi chú'];

function queuePath(): string {
  return resolve('bugs', 'pending-sync.json');
}

function appendAudit(audit: SyncAudit): SyncAudit {
  const path = resolve('bugs', 'sheet-sync-audit.json');
  const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as SyncAudit[] : [];
  mkdirSync(resolve('bugs'), { recursive: true });
  writeFileSync(path, JSON.stringify([...current, audit], null, 2));
  return audit;
}

function getClient() {
  if (!config.GOOGLE_SPREADSHEET_ID || !config.GOOGLE_SERVICE_ACCOUNT_FILE) throw new Error('GOOGLE_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_FILE are required for Sheet sync');
  const auth = new google.auth.GoogleAuth({ keyFile: config.GOOGLE_SERVICE_ACCOUNT_FILE, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

async function resolveWorksheet(): Promise<WorksheetHeaders> {
  const sheets = getClient();
  const spreadsheetId = config.GOOGLE_SPREADSHEET_ID as string;
  const response = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
  const titles = response.data.sheets?.map((sheet) => sheet.properties?.title).filter((title): title is string => Boolean(title)) ?? [];
  const candidates = titles.filter((title) => /^(List of bugs|Danh sách lỗi)$/i.test(title)).concat(titles.filter((title) => !/^(List of bugs|Danh sách lỗi)$/i.test(title)));
  for (const title of candidates) {
    const values = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title.replace(/'/g, "''")}'!A:O` });
    const rows = values.data.values ?? [];
    const headerIndex = rows.findIndex((row) => requiredHeaders.every((header) => row.includes(header)));
    if (headerIndex >= 0) return { title, headerRow: headerIndex + 1, headers: rows[headerIndex] };
  }
  throw new Error('No worksheet contains the compatible List of bugs header');
}

function valueForHeader(bug: LocalBug, header: string, issueNo: number): string | number {
  const values: Record<string, string | number> = {
    No: issueNo,
    'Người tạo': bug.reporter,
    'Ngày tạo': bug.createdDate,
    'Danh mục': bug.category,
    'Chức năng': bug.feature,
    'Nội dung': bug.description,
    Expected: bug.expected,
    'Phân loại': 'Bug',
    'Độ ưu tiên': bug.priority,
    'Trạng thái': bug.status,
    'Người đối ứng': '',
    'Ngày đối ứng': '',
    'Nguyên nhân': '',
    'Biện pháp đối ứng': '',
    'Ghi chú': `QA fingerprint: ${bug.fingerprint}`
  };
  return values[header] ?? '';
}

async function appendBug(bug: LocalBug): Promise<number> {
  const sheets = getClient();
  const spreadsheetId = config.GOOGLE_SPREADSHEET_ID as string;
  const worksheet = await resolveWorksheet();
  const current = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${worksheet.title.replace(/'/g, "''")}'!A${worksheet.headerRow + 1}:O` });
  const rows = current.data.values ?? [];
  const fingerprintColumn = worksheet.headers.indexOf('Ghi chú');
  const duplicate = rows.find((row) => row[fingerprintColumn] === `QA fingerprint: ${bug.fingerprint}`);
  if (duplicate) return Number(duplicate[worksheet.headers.indexOf('No')]);
  const noColumn = worksheet.headers.indexOf('No');
  const nextNo = Math.max(0, ...rows.map((row) => Number(row[noColumn])).filter(Number.isFinite)) + 1;
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `'${worksheet.title.replace(/'/g, "''")}'!A${worksheet.headerRow + 1}:O`, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS', requestBody: { values: [worksheet.headers.map((header) => valueForHeader(bug, header, nextNo))] } });
  return nextNo;
}

export function queueSheetSync(bug: LocalBug): SyncAudit {
  const state = config.SHEET_SYNC_ENABLED ? 'PENDING_CREDENTIALS' : 'PENDING_CONFIGURATION';
  const reason = config.SHEET_SYNC_ENABLED
    ? 'Google Sheets write adapter requires a configured service-account credential and explicit workbook access.'
    : 'SHEET_SYNC_ENABLED is false; no remote workbook write was attempted.';
  const audit: SyncAudit = { bugId: bug.id, timestamp: new Date().toISOString(), state, reason };
  return appendAudit(audit);
}

export async function syncPendingBugs(): Promise<SyncAudit[]> {
  if (!config.SHEET_SYNC_ENABLED) return [];
  if (!config.GOOGLE_SPREADSHEET_ID || !config.GOOGLE_SERVICE_ACCOUNT_FILE) throw new Error('Google Sheets sync is enabled but its configuration is incomplete');
  const path = queuePath();
  const bugs = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as LocalBug[] : [];
  const audits: SyncAudit[] = [];
  for (const bug of bugs) {
    if (bug.syncStatus === 'COMPLETE') continue;
    try {
      const issueNo = await appendBug(bug);
      bug.syncStatus = 'COMPLETE';
      bug.sheetIssueNo = issueNo;
      audits.push(appendAudit({ bugId: bug.id, timestamp: new Date().toISOString(), state: 'COMPLETE', reason: `Appended or resolved Issue_no.${issueNo}.` }));
    } catch (error) {
      bug.syncStatus = 'PARTIAL';
      audits.push(appendAudit({ bugId: bug.id, timestamp: new Date().toISOString(), state: 'FAILED', reason: error instanceof Error ? error.message : String(error) }));
    }
  }
  mkdirSync(resolve('bugs'), { recursive: true });
  writeFileSync(path, JSON.stringify(bugs, null, 2));
  return audits;
}

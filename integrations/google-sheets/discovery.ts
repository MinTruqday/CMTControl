import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../../config/qa.config.js';

export interface WorkbookProfile {
  spreadsheetId: string;
  headers: string[];
  issueCount: number;
  issueNumbers: number[];
  classificationCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  missingRequiredHeaders: string[];
  unclassifiedIssueNumbers: number[];
  issuesWithoutStatus: number[];
  source: 'google-export';
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        current += char;
        index += 1;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else current += char;
  }
  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function count(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    if (value) result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

export async function discoverWorkbook(spreadsheetId = config.GOOGLE_SPREADSHEET_ID): Promise<WorkbookProfile> {
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is required for workbook discovery');
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=0`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Workbook export failed with status ${response.status}`);
  const rows = parseCsv(await response.text());
  const headerIndex = rows.findIndex((row) => row.includes('No') && row.includes('Nội dung') && row.includes('Expected'));
  if (headerIndex < 0) throw new Error('Workbook does not contain a compatible List of bugs header');
  const headers = rows[headerIndex];
  const records = rows.slice(headerIndex + 1).filter((row) => /^\d+$/.test(row[0] ?? ''));
  const indexOf = (header: string) => headers.indexOf(header);
  const requiredHeaders = ['No', 'Người tạo', 'Ngày tạo', 'Danh mục', 'Chức năng', 'Nội dung', 'Expected', 'Phân loại', 'Độ ưu tiên', 'Trạng thái'];
  const profile: WorkbookProfile = {
    spreadsheetId,
    headers,
    issueCount: records.length,
    issueNumbers: records.map((row) => Number(row[0])).sort((left, right) => left - right),
    classificationCounts: count(records.map((row) => row[indexOf('Phân loại')] ?? '')),
    statusCounts: count(records.map((row) => row[indexOf('Trạng thái')] ?? '')),
    missingRequiredHeaders: requiredHeaders.filter((header) => !headers.includes(header)),
    unclassifiedIssueNumbers: records.filter((row) => !(row[indexOf('Phân loại')] ?? '')).map((row) => Number(row[0])),
    issuesWithoutStatus: records.filter((row) => !(row[indexOf('Trạng thái')] ?? '')).map((row) => Number(row[0])),
    source: 'google-export'
  };
  mkdirSync(resolve('reports/current'), { recursive: true });
  writeFileSync(resolve('reports/current', 'workbook-profile.json'), JSON.stringify(profile, null, 2));
  return profile;
}

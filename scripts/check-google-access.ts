import { google } from 'googleapis';
import { config } from '../config/qa.config.js';

async function main(): Promise<void> {
  try {
    if (!config.GOOGLE_SPREADSHEET_ID || !config.GOOGLE_SERVICE_ACCOUNT_FILE) throw new Error('CONFIGURATION_INCOMPLETE');
    const auth = new google.auth.GoogleAuth({ keyFile: config.GOOGLE_SERVICE_ACCOUNT_FILE, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId: config.GOOGLE_SPREADSHEET_ID, fields: 'spreadsheetId,sheets.properties.title' });
    const sheetNames = response.data.sheets?.map((sheet) => sheet.properties?.title).filter((title): title is string => Boolean(title)) ?? [];
    process.stdout.write(`${JSON.stringify({ authenticated: true, sheetCount: sheetNames.length, hasMasterSheet: sheetNames.some((title) => /^(List of bugs|Danh sách lỗi)$/i.test(title)) })}\n`);
  } catch (error) {
    const candidate = error as { code?: number; response?: { data?: { error?: { status?: string; errors?: Array<{ reason?: string }>; details?: Array<{ reason?: string }> } } } };
    const reason = candidate.response?.data?.error?.details?.[0]?.reason ?? candidate.response?.data?.error?.errors?.[0]?.reason ?? candidate.response?.data?.error?.status ?? (error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    process.stdout.write(`${JSON.stringify({ authenticated: false, code: candidate.code ?? null, reason })}\n`);
    process.exitCode = 1;
  }
}

main();

import { google } from 'googleapis';
import { config } from '../config/qa.config.js';

async function main(): Promise<void> {
  try {
    if (!config.GOOGLE_SERVICE_ACCOUNT_FILE) throw new Error('CONFIGURATION_INCOMPLETE');
    const auth = new google.auth.GoogleAuth({ keyFile: config.GOOGLE_SERVICE_ACCOUNT_FILE, scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] });
    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.files.list({ pageSize: 1, fields: 'files(id)' });
    process.stdout.write(`${JSON.stringify({ authenticated: true, visibleFileCount: response.data.files?.length ?? 0 })}\n`);
  } catch (error) {
    const candidate = error as { code?: number; response?: { data?: { error?: { status?: string; errors?: Array<{ reason?: string }>; details?: Array<{ reason?: string }> } } } };
    const reason = candidate.response?.data?.error?.details?.[0]?.reason ?? candidate.response?.data?.error?.errors?.[0]?.reason ?? candidate.response?.data?.error?.status ?? (error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    process.stdout.write(`${JSON.stringify({ authenticated: false, code: candidate.code ?? null, reason })}\n`);
    process.exitCode = 1;
  }
}

main();

import 'dotenv/config';
import { z } from 'zod';

const booleanValue = z.enum(['true', 'false']).transform((value) => value === 'true');
const optionalUrl = z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional());
const optionalText = z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional());

const schema = z.object({
  QA_ENV: z.string().default('local'),
  BASE_URL: optionalUrl,
  API_BASE_URL: optionalUrl,
  OLLAMA_BASE_URL: optionalUrl,
  OLLAMA_MODEL: optionalText,
  GOOGLE_SPREADSHEET_ID: optionalText,
  GOOGLE_SERVICE_ACCOUNT_FILE: optionalText,
  GOOGLE_APPS_SCRIPT_URL: optionalUrl,
  REPORT_OUTPUT_DIR: z.string().default('reports/current'),
  EVIDENCE_OUTPUT_DIR: z.string().default('evidence'),
  EVIDENCE_STORAGE_URL: optionalText,
  EVIDENCE_STORAGE_TYPE: z.enum(['local', 'google-drive']).default('local'),
  EVIDENCE_CREATE_RUN_FOLDER: booleanValue.default('true'),
  HEADLESS: booleanValue.default('true'),
  SCREENSHOT_ON_FAILURE: booleanValue.default('true'),
  VIDEO_ON_FAILURE: booleanValue.default('true'),
  TRACE_ON_FAILURE: booleanValue.default('true'),
  VISUAL_TEST_ENABLED: booleanValue.default('true'),
  AI_ANALYSIS_ENABLED: booleanValue.default('false'),
  SHEET_SYNC_ENABLED: booleanValue.default('false'),
  SOURCE_ANALYSIS_ENABLED: booleanValue.default('true'),
  SOURCE_WRITE_ENABLED: booleanValue.default('false'),
  TESTER_NAME: optionalText,
  QA_TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
  BUG_INITIAL_STATUS: z.string().default('Chờ đối ứng')
});

export type QaConfig = z.infer<typeof schema>;
export const config = schema.parse(process.env);

export function requireBaseUrl(): string {
  if (!config.BASE_URL) throw new Error('BASE_URL must be configured for runtime UI tests');
  return config.BASE_URL.replace(/\/$/, '');
}

export type TestStatus = 'PASS' | 'FAIL' | 'FLAKY' | 'SKIPPED' | 'BROKEN_TEST' | 'ENVIRONMENT_ERROR' | 'BLOCKED';
export type FailureClass = 'PRODUCT_BUG' | 'AUTOMATION_ERROR' | 'ENVIRONMENT_ERROR' | 'SHEET_SYNC_ERROR' | 'COVERAGE_GAP';

export interface TestResult {
  id: string;
  title: string;
  type: 'api' | 'ui' | 'e2e' | 'visual';
  status: TestStatus;
  durationMs: number;
  failureClass?: FailureClass;
  message?: string;
  evidence: string[];
}

export interface RunResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  results: TestResult[];
}

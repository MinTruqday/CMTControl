export type CoverageMode = 'SHEET_DRIVEN' | 'DISCOVERY_FALLBACK';
export type CoverageStatus = 'MAPPED' | 'UNMAPPED' | 'DISCOVERED_EXECUTABLE' | 'AI_DRAFT_REVIEW';

export interface SheetCoverageItem {
  id: string;
  title: string;
  expected: string;
  kind: 'requirement' | 'test_case';
  sheetName: string;
  rowNumber: number;
  linkedTestIds: string[];
}

export interface CoverageItem extends SheetCoverageItem {
  status: CoverageStatus;
  matchedTestIds: string[];
}

export interface CoverageReport {
  generatedAt: string;
  mode: CoverageMode;
  workbookStatus: 'AVAILABLE' | 'NOT_CONFIGURED' | 'UNAVAILABLE';
  workbookMessage: string;
  sheetNames: string[];
  executableTestIds: string[];
  discoveredRoutes: number;
  aiDrafts: number;
  mapped: number;
  unmapped: number;
  items: CoverageItem[];
  message: string;
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function indexMatching(headers: string[], patterns: RegExp[]): number {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(normalized(header))));
}

export function extractTestIds(value: string): string[] {
  return [...new Set([...value.matchAll(/\b(?:API|UI|E2E|VISUAL|AUTH)-[A-Z0-9-]+\b/g)].map((match) => match[0]))];
}

export function extractSheetCoverage(sheetName: string, rows: string[][]): SheetCoverageItem[] {
  const name = normalized(sheetName);
  if (/^(list of bugs|danh sach loi)$/.test(name)) return [];
  const namedForCoverage = /(requirement|requirements|test case|test cases|testcase|yeu cau|kich ban)/.test(name);
  const headerIndex = rows.slice(0, 20).findIndex((row) => {
    const headers = row.map(normalized);
    const hasId = headers.some((header) => /^(id|test id|test case id|ma test|ma yeu cau|requirement id)$/.test(header));
    const hasContent = headers.some((header) => /^(title|test case|requirement|yeu cau|noi dung|scenario|kich ban)$/.test(header));
    return hasId || (namedForCoverage && hasContent);
  });
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex];
  const idIndex = indexMatching(headers, [/^(id|test id|test case id|ma test|ma yeu cau|requirement id)$/]);
  const titleIndex = indexMatching(headers, [/^(title|test case|requirement|yeu cau|noi dung|scenario|kich ban)$/]);
  const expectedIndex = indexMatching(headers, [/^(expected|expected result|ket qua mong doi|mong doi)$/]);
  const kind: SheetCoverageItem['kind'] = /(test case|testcase|kich ban)/.test(name) ? 'test_case' : 'requirement';
  return rows.slice(headerIndex + 1).flatMap((row, offset) => {
    const rowNumber = headerIndex + offset + 2;
    const title = (titleIndex >= 0 ? row[titleIndex] : '')?.trim() ?? '';
    const explicitId = (idIndex >= 0 ? row[idIndex] : '')?.trim() ?? '';
    if (!title && !explicitId) return [];
    const linkedTestIds = extractTestIds(row.join(' '));
    return [{
      id: explicitId || `${sheetName}-${rowNumber}`,
      title: title || explicitId,
      expected: (expectedIndex >= 0 ? row[expectedIndex] : '')?.trim() ?? '',
      kind,
      sheetName,
      rowNumber,
      linkedTestIds
    }];
  });
}

export function buildCoverage(input: {
  sheetItems: SheetCoverageItem[];
  sheetNames?: string[];
  executableTestIds: string[];
  discoveredRoutes: number;
  aiDraftItems?: Array<{ id: string; title: string; expected: string }>;
  workbookStatus: CoverageReport['workbookStatus'];
  workbookMessage: string;
}): CoverageReport {
  const executableTestIds = [...new Set(input.executableTestIds)].sort();
  const executable = new Set(executableTestIds);
  const mode: CoverageMode = input.sheetItems.length > 0 ? 'SHEET_DRIVEN' : 'DISCOVERY_FALLBACK';
  const items: CoverageItem[] = mode === 'SHEET_DRIVEN'
    ? input.sheetItems.map((item) => {
      const matchedTestIds = item.linkedTestIds.filter((id) => executable.has(id));
      return { ...item, matchedTestIds, status: matchedTestIds.length > 0 ? 'MAPPED' : 'UNMAPPED' };
    })
    : [
      ...executableTestIds.map((id): CoverageItem => ({ id, title: id, expected: '', kind: 'test_case', sheetName: '', rowNumber: 0, linkedTestIds: [id], matchedTestIds: [id], status: 'DISCOVERED_EXECUTABLE' })),
      ...(input.aiDraftItems ?? []).map((draft): CoverageItem => ({ ...draft, kind: 'test_case', sheetName: '', rowNumber: 0, linkedTestIds: [], matchedTestIds: [], status: 'AI_DRAFT_REVIEW' }))
    ];
  const mapped = items.filter((item) => item.status === 'MAPPED').length;
  const unmapped = items.filter((item) => item.status === 'UNMAPPED').length;
  return {
    generatedAt: new Date().toISOString(),
    mode,
    workbookStatus: input.workbookStatus,
    workbookMessage: input.workbookMessage,
    sheetNames: input.sheetNames ?? [],
    executableTestIds,
    discoveredRoutes: input.discoveredRoutes,
    aiDrafts: items.filter((item) => item.status === 'AI_DRAFT_REVIEW').length,
    mapped,
    unmapped,
    items,
    message: mode === 'SHEET_DRIVEN'
      ? `${mapped}/${input.sheetItems.length} requirement hoặc test case trong Sheet đã map tới test chạy được.`
      : `Không tìm thấy tab requirement/test case; vẫn chạy ${executableTestIds.length} test logic, discovery ${input.discoveredRoutes} route và giữ AI draft để review.`
  };
}

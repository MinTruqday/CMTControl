import { describe, expect, it } from 'vitest';
import { buildCoverage, extractSheetCoverage } from '../../engine/coverage/model.js';

describe('coverage model', () => {
  it('maps recognized Sheet test IDs and exposes coverage gaps', () => {
    const sheetItems = extractSheetCoverage('Test Cases', [
      ['Test ID', 'Test case', 'Expected'],
      ['UI-NAV-001', 'Người dùng mở điều hướng chính', 'Các liên kết chính xuất hiện'],
      ['REQ-002', 'Quản trị viên phân quyền', 'Quyền bị giới hạn đúng']
    ]);
    const report = buildCoverage({ sheetItems, executableTestIds: ['UI-NAV-001'], discoveredRoutes: 12, workbookStatus: 'AVAILABLE', workbookMessage: 'ok' });

    expect(report.mode).toBe('SHEET_DRIVEN');
    expect(report.mapped).toBe(1);
    expect(report.unmapped).toBe(1);
  });

  it('continues with deterministic discovery and AI drafts when Sheet has no requirements', () => {
    const report = buildCoverage({
      sheetItems: [],
      executableTestIds: ['UI-NAV-001', 'E2E-CONTACT-001'],
      discoveredRoutes: 51,
      aiDraftItems: [{ id: 'AI-PLAN-001', title: 'Người dùng gửi biểu mẫu', expected: 'Validation xuất hiện' }],
      workbookStatus: 'AVAILABLE',
      workbookMessage: 'bug list only'
    });

    expect(report.mode).toBe('DISCOVERY_FALLBACK');
    expect(report.executableTestIds).toHaveLength(2);
    expect(report.aiDrafts).toBe(1);
    expect(report.message).toContain('vẫn chạy');
  });
});

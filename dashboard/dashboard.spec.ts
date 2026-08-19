import { expect, test } from '@playwright/test';

test('DASHBOARD-CONTROL-001 @smoke', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'QA Control' })).toBeVisible();
  await expect(page.getByLabel('Website cần kiểm thử')).toBeVisible();
  await expect(page.getByLabel('Người tạo / Tester')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chạy kiểm thử đầy đủ' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Dừng khẩn cấp' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Chụp màn hình ngay' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Test AI local' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review lỗi' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Screenshot & Evidence' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lịch sử kiểm thử' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
});

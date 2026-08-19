import { expect, test } from '@playwright/test';

test('DASHBOARD-CONTROL-001 @smoke', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Kiểm thử website' })).toBeVisible();
  await expect(page.getByLabel('Website cần kiểm thử')).toBeVisible();
  await expect(page.getByLabel('Người vận hành')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chạy kiểm thử' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Dừng khẩn cấp' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Chụp màn hình' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Kiểm tra AI local' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Phát hiện cần review' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bằng chứng' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Xuất báo cáo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải CSV' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tải PDF' })).toBeVisible();
  await expect(page.locator('#clock')).toContainText('GMT+7');
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
});

import { expect, test } from '@playwright/test';

test('DASHBOARD-CONTROL-001 @smoke', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Kiểm thử website' })).toBeVisible();
  await expect(page.getByLabel('Website cần kiểm thử')).toBeVisible();
  await expect(page.getByLabel('Người vận hành')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chạy kiểm thử' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Dừng lượt chạy' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Chụp màn hình' })).toBeEnabled();
  await page.getByRole('button', { name: 'Google Sheet' }).click();
  await expect(page.getByRole('heading', { name: 'Dữ liệu Google Sheet' })).toBeVisible();
  await page.getByRole('button', { name: 'Công cụ' }).click();
  await expect(page.getByText('Bằng chứng ảnh')).toBeVisible();
  await expect(page.getByText('Báo cáo và nhật ký')).toBeVisible();
  await expect(page.locator('#clock')).toContainText('GMT+7');
  await expect(page.getByText('Copyright by Cao Minh Trung')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
});

import { expect, test } from '@playwright/test';

test('DASHBOARD-CONTROL-001 @smoke', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Chạy kiểm thử' })).toBeVisible();
  await expect(page.getByLabel('Website cần kiểm thử')).toBeVisible();
  await expect(page.getByLabel('Người thực hiện')).toBeVisible();
  await expect(page.getByLabel('URL kiểm tra backend API')).toBeVisible();
  await expect(page.locator('#go')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeEnabled();
  await page.getByRole('button', { name: 'Kết quả' }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả kiểm thử' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chụp website' })).toBeEnabled();
  await page.getByRole('button', { name: 'Yêu cầu & test case' }).click();
  await expect(page.getByRole('heading', { name: 'Yêu cầu và test case' })).toBeVisible();
  await expect(page.getByText('Cho biết nội dung nào trong Google Sheet đã có test chạy thật')).toBeVisible();
  await expect(page.getByText('Copyright by Cao Minh Trung')).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
});

import { expect, test } from '@playwright/test';

test('DASHBOARD-CONTROL-001 @smoke', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Chạy test, nhận kết quả rõ ràng.' })).toBeVisible();
  await expect(page.getByLabel('Website')).toBeVisible();
  await expect(page.getByLabel('Người vận hành')).toBeVisible();
  await expect(page.locator('#go')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Dừng' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Chụp màn hình' })).toBeEnabled();
  await page.getByRole('button', { name: 'Google Sheet' }).click();
  await expect(page.getByRole('heading', { name: 'Danh sách lỗi thực tế.' })).toBeVisible();
  await page.getByRole('button', { name: 'Issue & bằng chứng' }).click();
  await expect(page.getByRole('heading', { name: 'Issue có bằng chứng.' })).toBeVisible();
  await expect(page.locator('#clock')).toContainText('GMT+7');
  await expect(page.getByText('Copyright by Cao Minh Trung')).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
});

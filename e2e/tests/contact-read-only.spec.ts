import { expect, test } from '../../ui/fixtures/runtime.js';

test('E2E-CONTACT-001 @smoke @edge', async ({ page, appUrl }) => {
  await page.goto(`${appUrl}/vi/contact`, { waitUntil: 'domcontentloaded' });
  const forms = page.locator('form');
  await expect(forms).toHaveCount(await forms.count());
  expect(await forms.count(), 'contact page must expose a form when consultation intake is enabled').toBeGreaterThanOrEqual(1);
  const requiredFields = page.locator('input[required], textarea[required], select[required]');
  expect(await requiredFields.count(), 'form must declare at least one deterministic required constraint').toBeGreaterThan(0);
});

test('E2E-CONTACT-002 @edge', async ({ page, appUrl }) => {
  await page.goto(`${appUrl}/vi/contact`, { waitUntil: 'domcontentloaded' });
  const form = page.locator('form').filter({ has: page.locator('[name="full_name"]') }).first();
  const email = form.locator('[name="email"]');
  await form.locator('[name="full_name"]').fill('QA Runtime Validation');
  await email.fill('not-an-email');
  await form.locator('[name="phone"]').fill('0900000000');
  await form.locator('[name="company"]').fill('QA Runtime Company');
  await form.locator('[name="industry"]').selectOption({ index: 1 });
  await form.locator('[name="message"]').fill('Validation-only test.');
  expect(await email.evaluate((input) => (input as HTMLInputElement).validity.valid), 'invalid email format must be rejected by native validation').toBeFalsy();
  expect(await form.evaluate((element) => (element as HTMLFormElement).noValidate), 'form must not opt out of browser validation').toBeFalsy();
  expect(await form.evaluate((element) => (element as HTMLFormElement).checkValidity()), 'invalid client-side input must make the form invalid before any submission attempt').toBeFalsy();
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '../../ui/fixtures/runtime.js';
import { config } from '../../config/qa.config.js';

interface RoleSpec {
  loginPath: string;
  selectors: { username: string; password: string; submit: string };
  roles: Array<{
    name: string;
    usernameEnv: string;
    passwordEnv: string;
    expectations: Array<{ path: string; allowed: boolean }>;
  }>;
}

test('AUTH-ROLE-001 @role', async ({ page, appUrl }, testInfo) => {
  testInfo.skip(!config.ROLE_TEST_ENABLED, 'ROLE_TEST_ENABLED is false; role credentials and permission expectations are optional.');
  expect(config.ROLE_TEST_SPEC_FILE, 'ROLE_TEST_SPEC_FILE must be configured').toBeTruthy();
  const specPath = resolve(config.ROLE_TEST_SPEC_FILE as string);
  expect(existsSync(specPath), `role test spec does not exist: ${specPath}`).toBeTruthy();
  const spec = JSON.parse(readFileSync(specPath, 'utf8')) as RoleSpec;
  expect(spec.roles.length, 'role spec must contain at least one role').toBeGreaterThan(0);

  for (const role of spec.roles) {
    const username = process.env[role.usernameEnv];
    const password = process.env[role.passwordEnv];
    expect(username, `${role.usernameEnv} must be configured for ${role.name}`).toBeTruthy();
    expect(password, `${role.passwordEnv} must be configured for ${role.name}`).toBeTruthy();

    await page.context().clearCookies();
    await page.goto(new URL(spec.loginPath, appUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator(spec.selectors.username).fill(username as string);
    await page.locator(spec.selectors.password).fill(password as string);
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.locator(spec.selectors.submit).click()
    ]);

    for (const expectation of role.expectations) {
      const response = await page.goto(new URL(expectation.path, appUrl).toString(), { waitUntil: 'domcontentloaded' });
      expect(response, `${role.name}: ${expectation.path} must return an HTTP response`).not.toBeNull();
      const status = response?.status() ?? 0;
      if (expectation.allowed) expect(status, `${role.name} should access ${expectation.path}`).toBeLessThan(400);
      else expect([401, 403], `${role.name} should be denied at ${expectation.path}`).toContain(status);
    }
  }
});

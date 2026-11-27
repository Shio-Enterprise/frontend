import { test, expect } from '@playwright/test';
import { loginViaForm, setupPageGuards } from './helpers';

test('user registers, persists session across reload, logs out, and logs back in', async ({ page }) => {
  const guards = await setupPageGuards(page);
  const uniqueEmail = `e2e-auth-${Date.now()}@shio.test`;
  const password = 'ShioAuthE2E!2026';

  await page.goto('/signup');
  await page.getByLabel('Nome completo', { exact: true }).fill('Cliente Novo E2E');
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Criar Conta', exact: true }).click();

  await page.waitForURL((url) => url.pathname === '/my-account');
  await expect(page.getByLabel('Nome completo')).toHaveValue('Cliente Novo E2E');

  await page.reload();
  await expect(page).toHaveURL(/\/my-account$/);
  await expect(page.getByLabel('Nome completo')).toHaveValue('Cliente Novo E2E');

  await page.getByRole('button', { name: 'Sair', exact: true }).first().click();
  await page.waitForURL((url) => url.pathname === '/');
  const tokenAfterLogout = await page.evaluate(() => window.localStorage.getItem('accessToken'));
  expect(tokenAfterLogout).toBeNull();

  await page.goto('/login');
  await loginViaForm(page, uniqueEmail, password);
  await page.waitForURL((url) => url.pathname === '/my-account');
  await expect(page.getByLabel('Nome completo')).toHaveValue('Cliente Novo E2E');

  guards.assertNoErrors();
});

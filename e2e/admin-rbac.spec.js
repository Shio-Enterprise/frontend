import { test, expect } from '@playwright/test';
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_USER_EMAIL,
  E2E_USER_PASSWORD,
  loginViaForm,
  setupPageGuards,
} from './helpers';

test('non-admin customer is blocked from /admin and seeded admin can manage products', async ({ page }) => {
  const guards = await setupPageGuards(page);

  await page.goto('/login');
  await loginViaForm(page, E2E_USER_EMAIL, E2E_USER_PASSWORD);
  await page.waitForURL((url) => url.pathname === '/my-account');

  await page.goto('/admin/products');
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByTestId('admin-panel-link')).toHaveCount(0);

  await page.getByRole('link', { name: 'Minha conta', exact: true }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).first().click();
  await page.waitForURL((url) => url.pathname === '/');

  await page.goto('/login');
  await loginViaForm(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await page.waitForURL((url) => url.pathname === '/my-account');

  await expect(page.getByTestId('admin-panel-link')).toBeVisible();
  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await expect(page.getByRole('table').getByText('Camiseta Shio E2E Tee')).toBeVisible();

  guards.assertNoErrors();
});

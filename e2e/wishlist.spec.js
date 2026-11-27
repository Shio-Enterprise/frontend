import { test, expect } from '@playwright/test';
import { E2E_API_URL, SEEDED_IDS, loginViaForm, setupPageGuards } from './helpers';

test('wishlist redirects anonymous login back, persists in PostgreSQL, flags out-of-stock, and fits mobile', async ({ page, request }) => {
  const guards = await setupPageGuards(page);
  const email = `e2e-wishlist-${Date.now()}@shio.test`;
  const password = 'ShioWishlist!2026';

  const registerRes = await request.post(`${E2E_API_URL}/api/auth/register/`, {
    data: { email, name: 'Wishlist E2E User', password },
  });
  expect(registerRes.status()).toBe(201);
  const { access } = await registerRes.json();
  const authHeaders = { Authorization: `Bearer ${access}` };

  await page.goto('/category/all?search=Camiseta%20Shio%20E2E');
  await page.getByRole('button', { name: 'Adicionar Camiseta Shio E2E Tee aos favoritos', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/login');

  await loginViaForm(page, email, password);
  await page.waitForURL((url) => url.pathname === '/category/all' && url.searchParams.get('search') === 'Camiseta Shio E2E');

  await page.getByRole('button', { name: 'Adicionar Camiseta Shio E2E Tee aos favoritos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remover Camiseta Shio E2E Tee dos favoritos', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Remover Camiseta Shio E2E Tee dos favoritos', exact: true })).toBeVisible();

  const outOfStockWish = await request.post(`${E2E_API_URL}/api/catalog/wishlist/`, {
    headers: authHeaders,
    data: { product: SEEDED_IDS.outOfStock },
  });
  expect(outOfStockWish.status()).toBe(201);

  await page.getByRole('link', { name: 'Minha conta', exact: true }).click();
  await page.getByRole('link', { name: 'Favoritos', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Meus favoritos', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remover Jaqueta Shio E2E Esgotada dos favoritos', exact: true })).toBeVisible();
  await expect(page.getByText('Indisponível', { exact: true }).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  guards.assertNoErrors();
});

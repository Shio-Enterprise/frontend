import { test, expect } from '@playwright/test';
import { SEEDED_IDS, setupPageGuards } from './helpers';

test('cart adds item, updates quantity on server, persists on reload, and removes item', async ({ page }) => {
  const guards = await setupPageGuards(page);

  await page.goto(`/product/${SEEDED_IDS.tee}`);
  await expect(page.getByRole('heading', { name: 'Camiseta Shio E2E Tee' })).toBeVisible();

  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar ao Carrinho', exact: true }).click();
  await expect(page.getByText('Adicionado ao carrinho!')).toBeVisible();

  await page.getByTestId('cart-link').click();
  await page.waitForURL((url) => url.pathname === '/cart');

  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Camiseta Shio E2E Tee' })).toBeVisible();

  const increaseBtn = page.getByRole('button', { name: 'Aumentar quantidade de Camiseta Shio E2E Tee', exact: true });
  await increaseBtn.click();

  await expect(page.getByTestId('cart-live')).toContainText('Quantidade de Camiseta Shio E2E Tee: 2.');
  await expect(page.locator('aside').getByText('R$ 299.80').first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Camiseta Shio E2E Tee' })).toBeVisible();
  await expect(page.locator('aside').getByText('R$ 299.80').first()).toBeVisible();

  await page.getByRole('button', { name: 'Remover Camiseta Shio E2E Tee', exact: true }).click();
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible();

  guards.assertNoErrors();
});

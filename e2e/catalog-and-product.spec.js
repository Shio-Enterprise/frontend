import { test, expect } from '@playwright/test';
import { SEEDED_IDS, setupPageGuards } from './helpers';

test('home loads seeded catalog, filters via search, and opens product details', async ({ page }) => {
  const guards = await setupPageGuards(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lançamentos' })).toBeVisible();
  await expect(page.getByText('Camiseta Shio E2E Tee').first()).toBeVisible();

  const searchInput = page.getByPlaceholder('O que você está buscando?');
  await searchInput.fill('Moletom Shio E2E');
  await searchInput.press('Enter');

  await page.waitForURL((url) => url.pathname === '/category/all' && url.searchParams.get('search') === 'Moletom Shio E2E');
  await expect(page.getByText('Moletom Shio E2E Oversized').first()).toBeVisible();

  await page.getByRole('link', { name: 'Moletom Shio E2E Oversized', exact: true }).first().click();
  await page.waitForURL((url) => url.pathname === `/product/${SEEDED_IDS.hoodie}`);

  await expect(page.getByRole('heading', { name: 'Moletom Shio E2E Oversized' })).toBeVisible();
  await expect(page.getByText('R$ 299.90')).toBeVisible();

  const sizeG = page.getByRole('button', { name: 'G', exact: true });
  await sizeG.click();
  await expect(sizeG).toHaveAttribute('aria-pressed', 'true');

  guards.assertNoErrors();
});

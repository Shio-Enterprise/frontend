import { expect } from '@playwright/test';

export const E2E_API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:8000';
export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin-e2e@shio.test';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'ShioE2EAdmin!2026';
export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || 'cliente-e2e@shio.test';
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'ShioE2EUser!2026';

export const SEEDED_IDS = {
  tee: '00000000-0000-4000-8000-000000000001',
  hoodie: '00000000-0000-4000-8000-000000000002',
  outOfStock: '00000000-0000-4000-8000-000000000003',
};

export async function setupPageGuards(page) {
  const pageErrors = [];
  const serverErrors = [];

  await page.addInitScript(() => {
    window.localStorage.setItem('analyticsConsent', 'denied');
  });

  await page.addLocatorHandler(
    page.getByRole('button', { name: 'Continuar navegando', exact: true }),
    async (button) => {
      await button.click();
    },
  );

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', (res) => {
    if (res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  return {
    assertNoErrors() {
      expect(pageErrors, 'Uncaught page errors').toEqual([]);
      expect(serverErrors, 'HTTP 5xx responses').toEqual([]);
    },
  };
}

export async function loginViaForm(page, email, password) {
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

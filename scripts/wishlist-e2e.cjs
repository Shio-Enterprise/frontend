/* Real browser -> Django -> PostgreSQL smoke test. Requires isolated E2E fixtures. */
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium, request } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const site = process.env.WISHLIST_E2E_SITE || 'http://127.0.0.1:5137';
const api = process.env.WISHLIST_E2E_API || 'http://127.0.0.1:8037/api';
const output = process.env.WISHLIST_E2E_OUTPUT || '/tmp/wishlist-e2e-evidence';
for (const url of [site, api]) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'E2E must use localhost');
}

const id = (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

(async () => {
  await mkdir(output, { recursive: true });
  const client = await request.newContext();
  const email = `wishlist-${Date.now()}@example.test`;
  const password = 'Wishlist-Only-Local-37!';
  const registration = await client.post(`${api}/auth/register/`, { data: { email, name: 'Wishlist validation', password } });
  assert.equal(registration.status(), 201, await registration.text());
  const credentials = await registration.json();
  const headers = { Authorization: `Bearer ${credentials.access}` };
  const savedIds = async () => {
    const response = await client.get(`${api}/catalog/wishlist/ids/`, { headers });
    assert.equal(response.status(), 200);
    return (await response.json()).product_ids;
  };
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const login = async () => {
      await page.getByPlaceholder('E-mail', { exact: true }).fill(email);
      await page.getByPlaceholder('Senha', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    };
    const openFavorites = async () => {
      await page.getByRole('link', { name: 'Minha conta', exact: true }).click();
      await page.getByRole('link', { name: 'Favoritos', exact: true }).last().click();
      await page.getByRole('heading', { name: 'Meus favoritos', exact: true }).waitFor();
    };

    await page.goto(`${site}/category/all?search=Wishlist%20E2E%2001`);
    await page.getByRole('button', { name: 'Adicionar Wishlist E2E 01 aos favoritos', exact: true }).click();
    await login();
    await page.waitForURL((url) => url.pathname === '/category/all' && url.searchParams.get('search') === 'Wishlist E2E 01');
    const add = page.getByRole('button', { name: 'Adicionar Wishlist E2E 01 aos favoritos', exact: true });
    await add.click();
    await page.getByRole('button', { name: 'Remover Wishlist E2E 01 dos favoritos', exact: true }).waitFor();
    assert.deepEqual(await savedIds(), [id(1)]);

    await page.reload();
    await page.getByRole('button', { name: 'Remover Wishlist E2E 01 dos favoritos', exact: true }).waitFor();
    // Add in a different API session while the browser's ID cache still knows only product 01.
    assert.equal((await client.post(`${api}/catalog/wishlist/`, { headers, data: { product: id(14) } })).status(), 201);
    await openFavorites();
    await page.getByRole('button', { name: 'Remover Wishlist E2E 14 dos favoritos', exact: true }).waitFor();
    await page.getByText('Indisponível', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    // Real second page, deletion of its last row, and fallback from API's page 404.
    for (let index = 2; index <= 12; index += 1) {
      assert.equal((await client.post(`${api}/catalog/wishlist/`, { headers, data: { product: id(index) } })).status(), 201);
    }
    await page.reload();
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await page.getByText('Página 2', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Remover Wishlist E2E 01 dos favoritos', exact: true }).click();
    await page.getByText('Página 1', { exact: true }).waitFor();
    assert.equal((await savedIds()).length, 12);
    assert.equal((await savedIds()).includes(id(1)), false);

    await page.getByRole('button', { name: 'Sair', exact: true }).first().click();
    await page.waitForURL((url) => url.pathname === '/');
    assert.equal(await page.evaluate(() => localStorage.getItem('accessToken')), null);
    await page.getByRole('link', { name: 'Minha conta', exact: true }).click();
    await login();
    await page.getByRole('link', { name: 'Favoritos', exact: true }).first().click();
    await page.getByRole('button', { name: 'Remover Wishlist E2E 14 dos favoritos', exact: true }).waitFor();
    assert.equal((await savedIds()).length, 12);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, cases: ['anonymous login return with query', 'add persisted in PostgreSQL', 'reload', 'cross-session reconciliation', 'out of stock', 'mobile', 'last-page deletion', 'logout', 'login persistence'], artifacts: output }));
  } finally {
    await browser.close();
    await client.dispose();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import NavigationDashboardPage from './index';

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => 'admin-token'),
  clearAuthTokens: vi.fn(),
}));

const overview = {
  period: 'mensal',
  group_by: 'day',
  visitors: { registered: 4, anonymous: 9 },
  events_by_type: {
    PAGE_VIEW: 20,
    PRODUCT_VIEW: 8,
    ADD_TO_CART: 3,
    REMOVE_FROM_CART: 1,
    CHECKOUT_STARTED: 2,
  },
  series: [
    { date: '2026-10-05', total: 2 },
    { date: '2026-10-06', total: 6 },
  ],
  top_products: [{ product_id: 3, name: 'Camiseta Preta', views: 5 }],
};

const emptyOverview = {
  ...overview,
  visitors: { registered: 0, anonymous: 0 },
  events_by_type: {
    PAGE_VIEW: 0,
    PRODUCT_VIEW: 0,
    ADD_TO_CART: 0,
    REMOVE_FROM_CART: 0,
    CHECKOUT_STARTED: 0,
  },
  series: [{ date: '2026-10-06', total: 0 }],
  top_products: [],
};

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const interest = {
  products: [{
    product_id: 3,
    name: 'Camiseta Preta',
    accounts: 2,
    anonymous: 1,
    users: [
      { id: 7, email: 'joao@shio.com', interest: 'ADD_TO_CART' },
      { id: 8, email: 'maria@shio.com', interest: 'PRODUCT_VIEW' },
    ],
  }],
};

function mockApi({
  overviewBody = overview,
  interestBody = interest,
  searchBody = [],
  productSearchBody = [],
  accessBody = { count: 0, totals: {}, accesses: [] },
  userProductsBody = { products: [] },
  status,
} = {}) {
  const fetchMock = vi.fn(async (url) => {
    if (status) return jsonResponse({}, status);
    const href = String(url);
    if (href.includes('/products/search/')) return jsonResponse(productSearchBody);
    if (href.includes('/products/interest/')) return jsonResponse(interestBody);
    if (href.includes('/accesses/')) return jsonResponse(accessBody);
    if (href.includes('/overview/')) return jsonResponse(overviewBody);
    if (href.includes('/users/search/')) return jsonResponse(searchBody);
    if (href.includes('/products/')) return jsonResponse(userProductsBody);
    throw new Error(href);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('NavigationDashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra visitantes, eventos, série e produtos no recorte mensal', async () => {
    const fetchMock = mockApi();
    render(<MemoryRouter><NavigationDashboardPage /></MemoryRouter>);

    expect(await screen.findByText('Visitantes cadastrados')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Visitantes anônimos')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Visualização de página')).toBeInTheDocument();
    expect(screen.getByText('20 eventos')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Período em destaque' })).toHaveTextContent('06/10/2026');
    expect(screen.getByRole('group', { name: 'Período em destaque' })).toHaveTextContent('6 eventos');
    expect(screen.getByRole('heading', { name: 'Interesse por produto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Camiseta Preta' })).toHaveAttribute('href', '/admin/products/3');
    expect(screen.getByText('2 contas')).toBeInTheDocument();
    expect(screen.getByText('joao@shio.com')).toBeInTheDocument();
    expect(screen.getByText('Colocou no carrinho')).toBeInTheDocument();
    expect(screen.getByText('maria@shio.com')).toBeInTheDocument();
    expect(screen.getByText('Viu o produto')).toBeInTheDocument();
    expect(screen.getByText('1 visitante sem conta')).toBeInTheDocument();
    expect(screen.queryByText('Produtos mais vistos')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/analytics/overview/?period=mensal'))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/analytics/products/interest/?period=mensal'))).toBe(true);
  });

  it('alterna a série para lista e o período para anual', async () => {
    const fetchMock = mockApi();
    render(<MemoryRouter><NavigationDashboardPage /></MemoryRouter>);

    const controls = await screen.findByRole('group', { name: 'Visualização de Série do período' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('columnheader', { name: 'Eventos' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Intervalo de tempo' }), { target: { value: 'anual' } });
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/analytics/overview/?period=anual'))).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/analytics/products/interest/?period=anual'))).toBe(true);
    });
  });

  it('mostra o estado vazio quando o período não tem eventos', async () => {
    mockApi({ overviewBody: emptyOverview, interestBody: { products: [] } });
    render(<MemoryRouter><NavigationDashboardPage /></MemoryRouter>);

    expect(await screen.findByText('Nenhum produto reuniu acessos nesse período.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum evento no período.')).toBeInTheDocument();
    expect(screen.queryByText('Visualização de página')).not.toBeInTheDocument();
  });

  it('permite tentar de novo depois de uma falha no resumo', async () => {
    const fetchMock = vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('/products/interest/')) return jsonResponse(interest);
      if (href.includes('/overview/') && fetchMock.mock.calls.filter(([called]) => String(called).includes('/overview/')).length === 1) {
        return jsonResponse({}, 500);
      }
      return jsonResponse(overview);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><NavigationDashboardPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a navegação.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Visitantes cadastrados')).toBeInTheDocument();
  });

  it('busca pelo e-mail, esconde o nome e mostra os produtos da conta', async () => {
    mockApi({
      searchBody: [
        { id: 7, name: 'João Silva', email: 'joao@shio.com' },
        { id: 8, name: 'Maria Souza', email: 'maria@outra.com' },
      ],
      userProductsBody: {
        products: [{
          product_id: 'p-3',
          name: 'Camiseta Preta',
          views: 2,
          added_to_cart: 1,
          removed_from_cart: 0,
          checkouts: 0,
          purchases: 1,
          last_access: '2026-10-06T15:04:00Z',
        }],
      },
    });
    render(<MemoryRouter><NavigationDashboardPage /></MemoryRouter>);
    await screen.findByText('Visitantes cadastrados');

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar por e-mail...' }), { target: { value: 'joao@' } });
    const account = await screen.findByRole('button', { name: 'joao@shio.com' });
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('maria@outra.com')).not.toBeInTheDocument();

    fireEvent.click(account);
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('button', { name: 'Camiseta Preta' })).toBeInTheDocument();
    expect(within(table).getByText('2')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Comprou' })).toBeInTheDocument();
    expect(within(table).getByText(/06\/10\/2026/)).toBeInTheDocument();
    expect(within(table).getByText(/12:04/)).toBeInTheDocument();
  });

  it('filtra um produto e mostra os acessos registrados', async () => {
    mockApi({
      productSearchBody: [
        { id: 'p-3', name: 'Camiseta Preta' },
        { id: 'p-9', name: 'Boné' },
      ],
      accessBody: {
        product_id: 'p-3',
        name: 'Camiseta Preta',
        count: 1,
        totals: {
          PRODUCT_VIEW: 1,
          ADD_TO_CART: 0,
          REMOVE_FROM_CART: 0,
          CHECKOUT_STARTED: 0,
        },
        accesses: [{
          id: 'a-1',
          event_type: 'PRODUCT_VIEW',
          occurred_at: '2026-10-06T15:04:00Z',
          path: '/produto/camiseta',
          email: 'ana@shio.com',
          variation: 'M / Preto',
        }],
      },
    });
    render(<MemoryRouter><NavigationDashboardPage /></MemoryRouter>);
    await screen.findByText('Visitantes cadastrados');

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar produto...' }), { target: { value: 'ca' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Camiseta Preta' }));

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Visualização de produto')).toBeInTheDocument();
    expect(within(table).getByText('ana@shio.com')).toBeInTheDocument();
    expect(within(table).getByText('M / Preto')).toBeInTheDocument();
    expect(within(table).getByText('/produto/camiseta')).toBeInTheDocument();
    expect(within(table).getByText(/12:04/)).toBeInTheDocument();
    expect(screen.getByText('1 acesso')).toBeInTheDocument();
  });

  it('bloqueia quem não é admin', async () => {
    mockApi({ status: 403 });
    const router = createMemoryRouter(
      [
        { path: '/admin/navigation', element: <NavigationDashboardPage /> },
        { path: '/', element: <div>Loja</div> },
      ],
      { initialEntries: ['/admin/navigation'] },
    );
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });
});

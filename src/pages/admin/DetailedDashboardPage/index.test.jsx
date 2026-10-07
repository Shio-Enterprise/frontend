import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DetailedDashboardPage from './index';

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => 'admin-token'),
  clearAuthTokens: vi.fn(),
}));

const detail = {
  period: { start_date: '2026-09-07', end_date: '2026-10-06', granularity: 'day', timezone: 'America/Sao_Paulo' },
  financial: { gross_revenue: '125.50', refunds: '25.50', net_revenue: '100.00', average_ticket: '100.00', valid_sales: 1 },
  sales_series: [{ period: '2026-10-06', gross_revenue: '125.50', refunds: '25.50', net_revenue: '100.00', valid_sales: 1 }],
  product_rankings: {
    by_units: [{ product_id: 'product-1', product_name: 'Camiseta', units: 2, revenue: '120.00' }],
    by_revenue: [{ product_id: 'product-1', product_name: 'Camiseta', units: 2, revenue: '120.00' }],
    unclassified: { units: 0, revenue: '0.00' },
  },
  item_revenue: {
    by_drop: [
      { drop_id: 'drop-1', name: 'Drop Aurora', units: 2, revenue: '120.00' },
      { drop_id: 'drop-2', name: 'Drop Eclipse', units: 1, revenue: '80.00' },
    ],
    by_category: [{ category_id: 'category-1', name: 'Roupas', units: 2, revenue: '120.00' }],
    basis: 'order_item_quantity_times_unit_price',
  },
  orders_by_status: { date_basis: 'order_created_at', rows: [{ status: 'DELIVERED', orders: 1 }] },
  sales_by_payment_method: [{ method: 'PIX', valid_sales: 1, gross_revenue: '125.50' }],
  customers: { total_registered: 3, new_in_period: 1, recurring_customers: 0 },
  stock: { low_count: 1, out_count: 0, attention: [{ variation_id: 'variation-1', product_id: 'product-1', product_name: 'Camiseta', size: 'M', color: 'Preta', sku: 'CAM-M', stock_quantity: 2, admin_path: '/admin/stock/product-1' }] },
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="dashboard-location">{location.search}</output>;
}

const catalogResponse = (results, next = null) => ({ ok: true, status: 200, json: async () => ({ results, next }) });

describe('DetailedDashboardPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta a API protegida e apresenta as seções administrativas', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => detail }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><DetailedDashboardPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Dashboard detalhado' })).toBeInTheDocument();
    expect(screen.getByText('Receita bruta')).toBeInTheDocument();
    expect(screen.getByText('Produtos por unidades vendidas')).toBeInTheDocument();
    expect(screen.getByText('Drop Aurora')).toBeInTheDocument();
    expect(screen.getByText('Pedidos por status')).toBeInTheDocument();
    expect(screen.getByText('Vendas por método de pagamento')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estoque atual' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao resumo' })).toHaveAttribute('href', '/admin/dashboard');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/orders/dashboard/detail/'), expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }));
  });

  it('troca entre lista, barras e rosca usando os mesmos dados', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => detail }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><DetailedDashboardPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Dashboard detalhado' });

    expect(screen.getByRole('button', { name: /Ver pedidos de receita líquida de 06\/10\/2026/ })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Visualização de Receita e vendas ao longo do tempo' })).getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('columnheader', { name: 'Reembolsos' })).toBeInTheDocument();

    const dropSection = screen.getByRole('heading', { name: 'Receita de itens por drop' }).closest('section');
    const donutButton = within(dropSection).getByRole('button', { name: 'Rosca' });
    expect(donutButton.querySelector('svg')).not.toBeNull();
    expect(donutButton).toHaveAttribute('title', 'Rosca');
    expect(donutButton.textContent).toBe('');
    fireEvent.click(donutButton);
    expect(donutButton).toHaveAttribute('aria-pressed', 'true');
    expect(within(dropSection).getByRole('img', { name: 'Gráfico de rosca: receita de itens por drop' })).toBeInTheDocument();
    expect(within(dropSection).getByText('R$ 120,00')).toBeInTheDocument();
    expect(within(dropSection).getByText('(60%)')).toBeInTheDocument();
    expect(within(dropSection).getByText('(40%)')).toBeInTheDocument();
    fireEvent.click(within(dropSection).getByRole('button', { name: 'Lista' }));
    expect(within(dropSection).getByText('2 un.')).toBeInTheDocument();

    const rankingSection = screen.getByRole('heading', { name: 'Produtos por unidades vendidas' }).closest('section');
    fireEvent.click(within(rankingSection).getByRole('button', { name: 'Barras' }));
    expect(within(rankingSection).getByRole('link', { name: 'Camiseta' })).toHaveAttribute('href', '/admin/products/product-1');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/dashboard/detail/'))).toHaveLength(1);
  });

  it('mantém as barras, apresenta períodos brasileiros e permite ordenar as duas visões', async () => {
    const annual = {
      ...detail,
      period: { ...detail.period, start_date: '2025-12-01', end_date: '2026-02-28', granularity: 'month' },
      sales_series: [
        { period: '2025-12-01', gross_revenue: '20.00', refunds: '0.00', net_revenue: '20.00', valid_sales: 1 },
        { period: '2026-01-01', gross_revenue: '0.00', refunds: '10.00', net_revenue: '-10.00', valid_sales: 0 },
        { period: '2026-02-01', gross_revenue: '200.00', refunds: '0.00', net_revenue: '200.00', valid_sales: 2 },
      ],
    };
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/catalog/')) return catalogResponse([]);
      if (String(url).includes('/dashboard/orders/')) return { ok: true, status: 200, json: async () => ({ count: 0, next: null, previous: null, results: [], metric: 'valid_sales', date_basis: 'payment.paid_at' }) };
      return { ok: true, status: 200, json: async () => annual };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><DetailedDashboardPage /></MemoryRouter>);
    await screen.findByText('Receita bruta');

    const section = screen.getByRole('heading', { name: 'Receita e vendas ao longo do tempo' }).closest('section');
    const chartButtons = () => within(section).getByRole('group', { name: 'Série de receita líquida e vendas válidas por período' }).querySelectorAll('button');
    expect(chartButtons()[0]).toHaveTextContent('02/2026');
    expect(chartButtons()[1]).toHaveTextContent('01/2026');
    expect(chartButtons()[1]).toHaveTextContent('0 vendas válidas');
    expect(chartButtons()[2]).toHaveTextContent('12/2025');
    expect(section).not.toHaveTextContent('2026-01');

    fireEvent.click(within(section).getByRole('button', { name: 'Vendas válidas' }));
    expect(chartButtons()[0]).toHaveTextContent('2 vendas válidas');
    expect(chartButtons()[0]).toHaveTextContent('R$ 200,00');
    expect(chartButtons()[0]).toHaveAttribute('aria-label', expect.stringContaining('Ver pedidos de vendas válidas'));

    fireEvent.change(within(section).getByRole('combobox', { name: 'Ordenar períodos' }), { target: { value: 'oldest' } });
    expect(chartButtons()[0]).toHaveTextContent('12/2025');
    fireEvent.click(within(section).getByRole('button', { name: 'Lista' }));
    expect(within(section).getAllByRole('row')[1]).toHaveTextContent('12/2025');
    expect(within(section).getByRole('columnheader', { name: 'Vendas válidas' })).toBeInTheDocument();
    fireEvent.change(within(section).getByRole('combobox', { name: 'Ordenar períodos' }), { target: { value: 'newest' } });
    expect(within(section).getAllByRole('row')[1]).toHaveTextContent('02/2026');
    fireEvent.click(within(section).getByRole('button', { name: 'Barras' }));
    fireEvent.click(within(section).getByRole('button', { name: /Ver pedidos de vendas válidas de 02\/2026/ }));
    await screen.findByRole('dialog');
    const ordersUrl = fetchMock.mock.calls.find(([url]) => String(url).includes('/dashboard/orders/'))[0];
    expect(Object.fromEntries(new URL(String(ordersUrl), 'http://localhost').searchParams)).toMatchObject({ metric: 'valid_sales', start_date: '2026-02-01', end_date: '2026-02-28' });
  });

  it('combina filtros e datas na URL, carregando todas as opções paginadas', async () => {
    const fetchMock = vi.fn(async (url) => {
      const address = String(url);
      if (address.includes('/catalog/drops/')) return address.includes('page=2')
        ? catalogResponse([{ id: 'drop-2', name: 'Drop Eclipse' }])
        : catalogResponse([{ id: 'drop-1', name: 'Drop Aurora' }], '/api/catalog/drops/?page=2');
      if (address.includes('/catalog/categories/')) return catalogResponse([
        { id: 'category-1', name: 'Roupas' }, { id: 'category-2', name: 'Acessórios' },
      ]);
      return { ok: true, status: 200, json: async () => detail };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/admin/dashboard/detail?period=annual&drop=drop-1&category=category-1&search=shio']}>
      <DetailedDashboardPage /><LocationProbe />
    </MemoryRouter>);
    await screen.findByRole('option', { name: 'Drop Eclipse' });
    expect(screen.getByRole('combobox', { name: 'Drop' })).toHaveValue('drop-1');

    fireEvent.change(screen.getByRole('combobox', { name: 'Drop' }), { target: { value: 'drop-2' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Categoria' }), { target: { value: 'category-2' } });
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar datas' }));

    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId('dashboard-location').textContent);
      expect(Object.fromEntries(params)).toMatchObject({ period: 'annual', drop: 'drop-2', category: 'category-2', start_date: '2026-09-01', end_date: '2026-09-30', search: 'shio' });
    });
    await waitFor(() => expect(String(fetchMock.mock.calls.filter(([url]) => String(url).includes('/dashboard/detail/')).at(-1)?.[0])).toContain('end_date=2026-09-30'));
    expect(screen.getByRole('link', { name: 'Voltar ao resumo' }).getAttribute('href')).toContain('drop=drop-2');
  });

  it('abre os pedidos da métrica com filtros, paginação e competência correta', async () => {
    const order = (id) => ({ id, customer_name: 'Amanda', total_amount: '125.50', status: 'DELIVERED', payment_status: 'PAID', paid_at: '2026-10-06T12:00:00Z', created_at: '2026-10-05T12:00:00Z', revenue_value: '125.50', metric_units: null, metric_item_revenue: null, admin_path: `/admin/orders/${id}` });
    const fetchMock = vi.fn(async (url) => {
      const address = String(url);
      if (address.includes('/catalog/')) return catalogResponse([]);
      if (address.includes('/dashboard/orders/')) {
        const parsed = new URL(address, 'http://localhost');
        if (parsed.searchParams.get('page') === '2') return { ok: true, status: 200, json: async () => ({ count: 21, next: null, previous: address.replace('&page=2', ''), results: [order('order-2')], metric: parsed.searchParams.get('metric'), date_basis: 'payment.paid_at' }) };
        parsed.searchParams.set('page', '2');
        return { ok: true, status: 200, json: async () => ({ count: 21, next: parsed.toString(), previous: null, results: [order('order-1')], metric: parsed.searchParams.get('metric'), date_basis: 'payment.paid_at' }) };
      }
      return { ok: true, status: 200, json: async () => detail };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/admin/dashboard/detail?period=monthly&drop=drop-1&category=category-1']}><DetailedDashboardPage /></MemoryRouter>);
    await screen.findByText('Receita bruta');
    fireEvent.click(screen.getByRole('button', { name: /Receita líquida R\$/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Pedidos da receita líquida' });
    expect(await within(dialog).findByRole('link', { name: 'SH-ORDER' })).toHaveAttribute('href', '/admin/orders/order-1');
    const firstOrderUrl = fetchMock.mock.calls.find(([url]) => String(url).includes('/dashboard/orders/'))[0];
    expect(Object.fromEntries(new URL(String(firstOrderUrl), 'http://localhost').searchParams)).toMatchObject({ metric: 'net_revenue', drop: 'drop-1', category: 'category-1', period: 'monthly' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(within(dialog).getByText('21 pedido(s) · página 2')).toBeInTheDocument());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar detalhamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver pedidos de Entregue' }));
    await screen.findByRole('dialog', { name: 'Pedidos · Entregue' });
    const statusCall = fetchMock.mock.calls.filter(([url]) => String(url).includes('/dashboard/orders/')).at(-1)[0];
    expect(Object.fromEntries(new URL(String(statusCall), 'http://localhost').searchParams)).toMatchObject({ metric: 'status', status: 'DELIVERED', drop: 'drop-1', category: 'category-1' });
  });

  it('limita buckets mensais à janela efetiva e detalha itens sem classificação', async () => {
    const annual = {
      ...detail,
      period: { ...detail.period, start_date: '2026-01-15', end_date: '2026-12-31', granularity: 'month' },
      sales_series: [{ ...detail.sales_series[0], period: '2026-01-01' }],
      item_revenue: { ...detail.item_revenue, by_drop: [{ drop_id: null, name: 'Sem classificação', units: 1, revenue: '12.00' }] },
    };
    const fetchMock = vi.fn(async (url) => String(url).includes('/dashboard/orders/')
      ? { ok: true, status: 200, json: async () => ({ count: 0, next: null, previous: null, results: [], metric: 'net_revenue', date_basis: 'payment.paid_at' }) }
      : String(url).includes('/catalog/') ? catalogResponse([])
        : { ok: true, status: 200, json: async () => annual });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/admin/dashboard/detail?period=annual&category=category-1&start_date=2026-01-15&end_date=2026-12-31']}><DetailedDashboardPage /></MemoryRouter>);
    await screen.findByText('Receita bruta');
    fireEvent.click(screen.getByRole('button', { name: /Ver pedidos de receita líquida de 01\/2026/ }));
    await screen.findByRole('dialog');
    const seriesUrl = fetchMock.mock.calls.filter(([url]) => String(url).includes('/dashboard/orders/')).at(-1)[0];
    expect(Object.fromEntries(new URL(String(seriesUrl), 'http://localhost').searchParams)).toMatchObject({ metric: 'net_revenue', start_date: '2026-01-15', end_date: '2026-01-31', category: 'category-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Fechar detalhamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver pedidos de Sem classificação' }));
    await screen.findByRole('dialog');
    const unclassified = new URL(String(fetchMock.mock.calls.filter(([url]) => String(url).includes('/dashboard/orders/')).at(-1)[0]), 'http://localhost').searchParams;
    expect(Object.fromEntries(unclassified)).toMatchObject({ metric: 'drop_item_revenue', unclassified: 'true', category: 'category-1' });
    expect(unclassified.has('drop')).toBe(false);
  });

  it('mostra erro com nova tentativa e um estado vazio após recuperar a consulta', async () => {
    let attempts = 0;
    const empty = { ...detail, financial: { ...detail.financial, gross_revenue: '0.00', refunds: '0.00', net_revenue: '0.00', average_ticket: '0.00', valid_sales: 0 }, sales_series: [], product_rankings: { by_units: [], by_revenue: [], unclassified: { units: 0, revenue: '0.00' } }, item_revenue: { ...detail.item_revenue, by_drop: [], by_category: [] }, orders_by_status: { date_basis: 'order_created_at', rows: [] }, sales_by_payment_method: [], stock: { low_count: 0, out_count: 0, attention: [] } };
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/catalog/')) return catalogResponse([]);
      attempts += 1;
      return attempts === 1 ? { ok: false, status: 500, json: async () => ({}) } : { ok: true, status: 200, json: async () => empty };
    }));

    render(<MemoryRouter><DetailedDashboardPage /></MemoryRouter>);
    expect(screen.getByText('Carregando análise detalhada...')).toBeInTheDocument();
    expect(await screen.findByText('Não foi possível carregar a análise detalhada.')).toHaveAttribute('role', 'alert');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText(/Nenhuma venda válida ou reembolso neste período/)).toBeInTheDocument();
    expect(screen.getByText('Nenhuma venda ou receita líquida no período.')).toBeInTheDocument();
  });
});

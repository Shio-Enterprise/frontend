import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './index';

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => 'admin-token'),
  clearAuthTokens: vi.fn(),
}));

const summary = {
  period: { start_date: '2026-09-07', end_date: '2026-10-06', granularity: 'day' },
  sales_summary: { total_revenue: '0.00', total_orders: 0 },
  customers_summary: { total_registered: 3, new_in_period: 1, recurring_customers: 0 },
  series: [],
  recent_orders: [],
  low_stock_alerts: [
    { id: 'variation-1', product_name: 'Camiseta', size: 'M', stock_quantity: 2 },
  ],
};

describe('DashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exibe os contratos corretos e não contabiliza pedido pendente no gráfico', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => summary,
    })));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText('Clientes cadastrados')).toBeInTheDocument();
    expect(screen.getByText('Camiseta — M')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma venda no período.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Análise detalhada' })).toHaveAttribute('href', '/admin/dashboard/detail');
  });

  it('alterna a série de vendas para lista', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...summary, series: [{ period: '2026-10-06', total_revenue: '100.00', total_orders: 1 }] }),
    })));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const controls = await screen.findByRole('group', { name: 'Visualização de vendas' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('columnheader', { name: 'Receita líquida' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver pedidos' })).toBeInTheDocument();
  });

  it('mostra receita e pedidos do período destacado sem recortar o hover do gráfico', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ...summary,
        series: [
          { period: '2026-10-05', total_revenue: '75.00', total_orders: 1 },
          { period: '2026-10-06', total_revenue: '200.00', total_orders: 2 },
        ],
      }),
    })));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const highlighted = await screen.findByRole('group', { name: 'Período em destaque' });
    expect(highlighted).toHaveTextContent('06/10/2026');
    expect(highlighted).toHaveTextContent('2 pedidos');

    const firstBar = screen.getByRole('button', { name: /Ver pedidos de 05\/10\/2026/ });
    fireEvent.mouseEnter(firstBar);
    expect(highlighted).toHaveTextContent('05/10/2026');
    expect(highlighted).toHaveTextContent('R$ 75,00 · 1 pedido');
    fireEvent.mouseLeave(firstBar.parentElement);
    expect(highlighted).toHaveTextContent('06/10/2026');
  });

  it('preserva os filtros da URL ao abrir o detalhe e voltar ao resumo', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => summary }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/admin/dashboard?period=annual&drop=drop-1&category=category-1&search=camiseta']}><DashboardPage /></MemoryRouter>);

    const detailLink = await screen.findByRole('link', { name: 'Análise detalhada' });
    expect(detailLink.getAttribute('href')).toContain('drop=drop-1');
    expect(detailLink.getAttribute('href')).toContain('category=category-1');
    expect(detailLink.getAttribute('href')).toContain('search=camiseta');
    expect(screen.getByRole('combobox', { name: 'Período' })).toHaveValue('annual');
    expect(screen.getByText('Filtros adicionais ativos:')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar dashboard' }), { target: { value: 'camiseta preta' } });
    expect(screen.getByRole('textbox', { name: 'Pesquisar dashboard' })).toHaveValue('camiseta preta');
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('search=camiseta+preta'))).toBe(true));
  });

  it('abre vendas válidas com os filtros do resumo e estado vazio do detalhamento', async () => {
    const fetchMock = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => String(url).includes('/dashboard/orders/')
        ? { count: 0, next: null, previous: null, results: [] }
        : summary,
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/admin/dashboard?period=annual&drop=drop-1&search=camiseta']}><DashboardPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Pedidos \(30d\)/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Vendas válidas' });
    expect(await within(dialog).findByText('Nenhum pedido compõe esta métrica.')).toBeInTheDocument();
    const drillUrl = fetchMock.mock.calls.find(([url]) => String(url).includes('/dashboard/orders/'))[0];
    expect(Object.fromEntries(new URL(String(drillUrl), 'http://localhost').searchParams)).toMatchObject({
      period: 'annual', drop: 'drop-1', search: 'camiseta', metric: 'valid_sales',
    });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

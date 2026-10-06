import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
    by_drop: [{ drop_id: 'drop-1', name: 'Drop Aurora', units: 2, revenue: '120.00' }],
    by_category: [{ category_id: 'category-1', name: 'Roupas', units: 2, revenue: '120.00' }],
    basis: 'order_item_quantity_times_unit_price',
  },
  orders_by_status: { date_basis: 'order_created_at', rows: [{ status: 'DELIVERED', orders: 1 }] },
  sales_by_payment_method: [{ method: 'PIX', valid_sales: 1, gross_revenue: '125.50' }],
  customers: { total_registered: 3, new_in_period: 1, recurring_customers: 0 },
  stock: { low_count: 1, out_count: 0, attention: [{ variation_id: 'variation-1', product_id: 'product-1', product_name: 'Camiseta', size: 'M', color: 'Preta', sku: 'CAM-M', stock_quantity: 2, admin_path: '/admin/stock/product-1' }] },
};

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
});

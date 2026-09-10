import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './index';

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => 'admin-token'),
  clearAuthTokens: vi.fn(),
}));

const summary = {
  sales_summary: { total_revenue: '0.00', total_orders: 0 },
  customers_summary: { total_registered: 3, new_in_period: 1 },
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
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => url.includes('/dashboard/summary/')
        ? summary
        : [{ status: 'AWAITING_PAYMENT', total_amount: '99.00', created_at: new Date().toISOString() }],
    })));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText('Clientes ativos')).toBeInTheDocument();
    expect(screen.getByText('Camiseta — M')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma venda no período.')).toBeInTheDocument();
  });
});

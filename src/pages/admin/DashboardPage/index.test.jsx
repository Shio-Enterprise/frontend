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
  });
});

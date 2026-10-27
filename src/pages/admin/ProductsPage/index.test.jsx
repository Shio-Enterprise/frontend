import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from './index';

const { useApiMock } = vi.hoisted(() => ({
  useApiMock: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProductsPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>);
    expect(screen.getByText(/ProductsPage/i)).toBeInTheDocument();
  });

  it('mostra os motivos da troca no histórico de estoque', async () => {
    const product = {
      id: 'p1',
      name: 'Camiseta',
      is_active: true,
      images: [],
      variations: [{ id: 'g', size: 'G', color: 'Preto', sku: 'CAM-G', stock_quantity: 3 }],
    };
    useApiMock.mockImplementation((url) => ({
      data: url === '/api/catalog/products/p1/' ? product : [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    }));
    const movement = (id, kind, reason, note) => ({
      id, kind, reason, note, quantity: 1, balance_after: 3, is_legacy: false,
      origin_type: 'EXCHANGE', origin_id: 'ei1', created_at: '2026-10-26T10:00:00Z',
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => [
        movement('m1', 'SAIDA', 'TROCA', 'Reserva da reposição da troca'),
        movement('m2', 'ENTRADA', 'DEVOLUCAO', 'Peça devolvida na troca'),
      ],
    })));

    render(<MemoryRouter initialEntries={['/admin/stock/p1']}><ProductsPage /></MemoryRouter>);

    const reservation = (await screen.findByText('Reserva da reposição da troca')).parentElement;
    expect(within(reservation).getByText('Troca')).toBeInTheDocument();
    expect(within(reservation).queryByText('TROCA')).not.toBeInTheDocument();
    const returned = screen.getByText('Peça devolvida na troca').parentElement;
    expect(within(returned).getByText('Devolução')).toBeInTheDocument();
  });
});

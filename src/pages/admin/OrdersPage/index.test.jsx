import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './index';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

describe('OrdersPage', () => {
  beforeEach(() => {
    useApiMock.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renderiza o título e o botão de exportar', () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('mostra o selo do reembolso e filtra pelo status dele', () => {
    useApiMock.mockReturnValue({
      data: [{
        id: 'abcdef12-0000-0000-0000-000000000000',
        customer_name: 'Ana',
        created_at: '2026-10-20T10:00:00Z',
        total_amount: '200.00',
        status: 'PREPARING',
        refund_status: 'REQUESTED',
      }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Reembolso solicitado')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por reembolso'), { target: { value: 'REQUESTED' } });
    expect(useApiMock).toHaveBeenLastCalledWith('/api/orders/admin/?refund_status=REQUESTED');
  });
});

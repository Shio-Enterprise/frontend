import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import CustomersPage from './index';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useApiMock.mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('envia a busca por nome ou e-mail para o endpoint do CRM', () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>);

    const search = screen.getByPlaceholderText('Buscar por nome ou e-mail...');
    fireEvent.change(search, { target: { value: 'Maria Silva' } });
    act(() => vi.advanceTimersByTime(300));

    expect(useApiMock).toHaveBeenLastCalledWith(
      '/api/auth/crm/customers/?search=Maria%20Silva',
    );
  });

  it('tabela rola por dentro pelo teclado, busca tem nome e sem violações (#64)', async () => {
    vi.useRealTimers();
    useApiMock.mockReturnValue({
      data: [{ id: 'c1', name: 'Maria Silva', email: 'maria@exemplo.com', total_orders: 2, total_spent: '100', created_at: '2026-10-01T10:00:00Z' }],
      loading: false, error: null, refetch: vi.fn(),
    });
    const { container } = render(<MemoryRouter><CustomersPage /></MemoryRouter>);
    expect(screen.getByRole('searchbox', { name: 'Buscar clientes por nome ou e-mail' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tabela de clientes' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('table', { name: 'Clientes' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('perfil do cliente fecha com Esc e não tem violações (#64)', async () => {
    vi.useRealTimers();
    useApiMock.mockImplementation((url) => ({
      data: url === '/api/auth/crm/customers/c1/'
        ? { id: 'c1', name: 'Maria Silva', email: 'maria@exemplo.com', total_orders: 1, total_spent: '50', created_at: '2026-10-01T10:00:00Z',
          order_history: [{ id: 'o1abcdef', created_at: '2026-10-02T10:00:00Z', status: 'PAID', total_amount: '50' }] }
        : [],
      loading: false, error: null, refetch: vi.fn(),
    }));
    const { container } = render(<MemoryRouter initialEntries={['/admin/customers/c1']}><CustomersPage /></MemoryRouter>);
    const panel = screen.getByRole('dialog', { name: 'Perfil do Cliente' });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.keyDown(panel, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

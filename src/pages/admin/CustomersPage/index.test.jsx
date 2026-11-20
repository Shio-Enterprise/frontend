import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import CustomersPage from './index';

const { useApiMock, permissions } = vi.hoisted(() => ({ useApiMock: vi.fn(), permissions: { list: null } }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    hasAdminPermission: (code) => permissions.list === null || permissions.list.includes(code),
  }),
}));

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useApiMock.mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    permissions.list = null;
  });

  describe('"Ver pedidos" e permissão de Pedidos (#88)', () => {
    const maria = { id: 7, name: 'Maria Silva', email: 'maria@exemplo.com', total_orders: 2, total_spent: '100', created_at: '2026-10-01T10:00:00Z' };

    const openMenu = () => {
      useApiMock.mockReturnValue({ data: [maria], loading: false, error: null, refetch: vi.fn() });
      render(<MemoryRouter><CustomersPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'Ações para Maria Silva' }));
    };

    it('com acesso a Pedidos, o menu leva aos pedidos do cliente', () => {
      permissions.list = ['manage_customers', 'manage_orders'];
      openMenu();
      expect(screen.getByRole('menuitem', { name: 'Ver pedidos' })).toHaveAttribute('href', '/admin/orders?customer=7');
    });

    it('com acesso ao Dashboard, o menu leva ao comportamento do cliente', () => {
      permissions.list = ['manage_customers', 'access_admin_dashboard'];
      openMenu();
      expect(screen.getByRole('menuitem', { name: 'Ver comportamento' })).toHaveAttribute('href', '/admin/dashboard?usuario=7');
    });

    it('sem acesso ao Dashboard, o menu não oferece "Ver comportamento"', () => {
      permissions.list = ['manage_customers', 'manage_orders'];
      openMenu();
      expect(screen.getByRole('menuitem', { name: 'Ver pedidos' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Ver comportamento' })).not.toBeInTheDocument();
    });

    it('sem acesso a Pedidos, o menu não oferece "Ver pedidos"', () => {
      permissions.list = ['manage_customers'];
      openMenu();
      expect(screen.getByRole('menuitem', { name: 'Ver perfil' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Ver pedidos' })).not.toBeInTheDocument();
    });
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

  describe('aceite de e-mails (#103)', () => {
    const renderProfile = (extra) => {
      vi.useRealTimers();
      useApiMock.mockImplementation((url) => ({
        data: url === '/api/auth/crm/customers/c1/'
          ? { id: 'c1', name: 'Maria Silva', email: 'maria@exemplo.com', total_orders: 0, total_spent: '0', created_at: '2026-10-01T12:00:00Z', ...extra }
          : [],
        loading: false, error: null, refetch: vi.fn(),
      }));
      render(<MemoryRouter initialEntries={['/admin/customers/c1']}><CustomersPage /></MemoryRouter>);
      return screen.getByText('Aceita receber e-mails (newsletter e cupons)').nextElementSibling;
    };

    it('quem aceitou aparece como Sim com a data do aceite', () => {
      const value = renderProfile({ accepts_emails: true, email_consent_at: '2026-11-05T12:00:00Z', email_unsubscribed_at: null });
      expect(value).toHaveTextContent('Sim');
      expect(value).toHaveTextContent('desde 05/11/2026');
    });

    it('quem se descadastrou aparece como Não com a data do descadastro', () => {
      const value = renderProfile({ accepts_emails: false, email_consent_at: null, email_unsubscribed_at: '2026-11-10T12:00:00Z' });
      expect(value).toHaveTextContent('Não');
      expect(value).toHaveTextContent('descadastrou em 10/11/2026');
    });

    it('quem nunca aceitou aparece só como Não', () => {
      const value = renderProfile({ accepts_emails: false, email_consent_at: null, email_unsubscribed_at: null });
      expect(value).toHaveTextContent(/^Não$/);
    });

    it('filtro manda accepts_emails para a lista, junto com a busca', () => {
      render(<MemoryRouter><CustomersPage /></MemoryRouter>);
      fireEvent.change(screen.getByLabelText('Filtrar por aceite de e-mails'), { target: { value: 'true' } });
      expect(useApiMock).toHaveBeenLastCalledWith('/api/auth/crm/customers/?accepts_emails=true');

      fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou e-mail...'), { target: { value: 'Maria' } });
      act(() => vi.advanceTimersByTime(300));
      expect(useApiMock).toHaveBeenLastCalledWith('/api/auth/crm/customers/?search=Maria&accepts_emails=true');

      fireEvent.change(screen.getByLabelText('Filtrar por aceite de e-mails'), { target: { value: '' } });
      expect(useApiMock).toHaveBeenLastCalledWith('/api/auth/crm/customers/?search=Maria');
    });
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminNavbar from './AdminNavbar';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AdminNavbar', () => {
  const logoutMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    logoutMock.mockResolvedValue(undefined);
    useAuth.mockReturnValue({
      user: {
        name: 'Administrador Shio',
        email: 'admin@shio.com',
        is_admin: true,
      },
      logout: logoutMock,
    });
  });

  function renderNavbar(initialPath = '/admin/dashboard') {
    const router = createMemoryRouter(
      [
        { path: '/admin/*', element: <AdminNavbar /> },
        { path: '/login', element: <div>Página de login</div> },
        { path: '/', element: <div>Loja</div> },
      ],
      { initialEntries: [initialPath] },
    );

    render(<RouterProvider router={router} />);
    return router;
  }

  it('exibe a identidade da conta administrativa autenticada', () => {
    renderNavbar();

    expect(screen.getByTestId('admin-user-name')).toHaveTextContent('Administrador Shio');
    expect(screen.getByTestId('admin-user-email')).toHaveTextContent('admin@shio.com');
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
  });

  it.each([
    ['/admin/dashboard', 'Dashboard'],
    ['/admin/new-product', 'Produtos'],
    ['/admin/edit-product/12', 'Produtos'],
    ['/admin/stock/12', 'Produtos'],
    ['/admin/new-drop', 'Drops'],
    ['/admin/edit-drop/9', 'Drops'],
    ['/admin/orders/42', 'Pedidos'],
    ['/admin/customers/7', 'Clientes'],
  ])('mantém a seção correta ativa em %s', (path, section) => {
    renderNavbar(path);

    expect(screen.getByTestId('admin-current-section')).toHaveTextContent(section);
    expect(screen.getAllByRole('link', { name: section })[0]).toHaveAttribute('aria-current', 'page');
  });

  it('permite voltar para a loja mantendo a sessão', () => {
    const router = renderNavbar();

    fireEvent.click(screen.getByRole('link', { name: /voltar para loja/i }));

    expect(router.state.location.pathname).toBe('/');
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it('usa o logout único da aplicação e redireciona para o login', async () => {
    const router = renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  it('mostra identidade, retorno para loja e logout no menu mobile', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Menu administrativo' }));

    expect(screen.getAllByText('Administrador Shio').length).toBeGreaterThan(1);
    expect(screen.getAllByText('admin@shio.com').length).toBeGreaterThan(1);
    expect(screen.getAllByRole('link', { name: /voltar para loja/i }).length).toBeGreaterThan(1);
    expect(screen.getAllByRole('button', { name: 'Sair' }).length).toBeGreaterThan(1);
  });
  it('exibe apenas as seções permitidas para o administrador', () => {
    useAuth.mockReturnValue({
      user: {
        name: 'Admin Pedidos',
        email: 'pedidos@shio.com',
        is_admin: true,
      },
      logout: logoutMock,
      hasAdminPermission: (permission) =>
        ['manage_orders', 'manage_admin_permissions'].includes(permission),
    });

    renderNavbar('/admin/orders');

    expect(screen.getAllByRole('link', { name: 'Pedidos' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Permissões' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Produtos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Drops' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument();
  });

});

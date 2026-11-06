import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import AdminPermissionsPage from './index';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: () => 'access-token',
}));

const permissionOptions = [
  {
    code: 'manage_catalog',
    label: 'Produtos e estoque',
    description: 'Gerenciar catálogo.',
  },
  {
    code: 'manage_orders',
    label: 'Pedidos',
    description: 'Gerenciar pedidos.',
  },
  {
    code: 'manage_admin_permissions',
    label: 'Permissões',
    description: 'Gerenciar administradores.',
  },
];

const admins = [
  {
    id: 1,
    name: 'Admin Principal',
    email: 'admin@shio.com',
    is_superuser: false,
    admin_permissions: ['manage_catalog', 'manage_admin_permissions'],
  },
  {
    id: 2,
    name: 'Admin Pedidos',
    email: 'pedidos@shio.com',
    is_superuser: false,
    admin_permissions: ['manage_orders'],
  },
];

function jsonResponse(payload, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(payload),
  });
}

describe('AdminPermissionsPage', () => {
  const refreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1 },
      refreshUser,
    });
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ results: admins }))
      .mockImplementationOnce(() => jsonResponse({ results: permissionOptions }));
  });

  it('lista administradores e permissões configuráveis', async () => {
    render(<AdminPermissionsPage />);

    expect(
      await screen.findByRole('button', { name: /Admin Principal/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Admin Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Produtos e estoque')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Permissões')).toBeInTheDocument();
  });

  it('salva as permissões selecionadas do administrador', async () => {
    globalThis.fetch.mockImplementationOnce(() =>
      jsonResponse({
        ...admins[1],
        admin_permissions: ['manage_orders', 'manage_catalog'],
      }),
    );

    render(<AdminPermissionsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Admin Pedidos/i }));

    const catalogCheckbox = screen.getByRole('checkbox', { name: /Produtos e estoque/i });
    fireEvent.click(catalogCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /Salvar permissões/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/admins/2/'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            admin_permissions: ['manage_orders', 'manage_catalog'],
          }),
        }),
      );
    });
    expect(await screen.findByText('Permissões atualizadas com sucesso.')).toBeInTheDocument();
  });

  it('não permite remover de si mesmo o acesso à gestão de permissões', async () => {
    render(<AdminPermissionsPage />);

    await screen.findByRole('button', { name: /Admin Principal/i });
    const ownPermission = screen.getByRole('checkbox', { name: /Permissões/i });
    expect(ownPermission).toBeChecked();
    expect(ownPermission).toBeDisabled();
  });

  it('conta selecionada é anunciada e o bloqueio da própria permissão é explicado (#64)', async () => {
    render(<AdminPermissionsPage />);
    const principal = await screen.findByRole('button', { name: /Admin Principal/i });
    expect(principal).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Admin Pedidos/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('searchbox', { name: 'Buscar administrador' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Permissões/i })).toHaveAccessibleDescription(
      'A permissão de gerenciar administradores não pode ser removida da própria conta nesta tela.',
    );
  });

  it('sucesso ao salvar fica numa região de status (#64)', async () => {
    globalThis.fetch.mockImplementationOnce(() => jsonResponse({ ...admins[1], admin_permissions: ['manage_orders', 'manage_catalog'] }));
    render(<AdminPermissionsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Admin Pedidos/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Produtos e estoque/i }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar permissões/i }));
    await waitFor(() => expect(screen.getAllByRole('status').some((el) => el.textContent === 'Permissões atualizadas com sucesso.')).toBe(true));
    // O botão fica inativo com aria-disabled (não disabled), para o foco não sair dele.
    expect(screen.getByRole('button', { name: /Salvar permissões/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('não tem violações de acessibilidade (#64)', async () => {
    const { container } = render(<AdminPermissionsPage />);
    await screen.findByRole('button', { name: /Admin Principal/i });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('busca anuncia quantos administradores achou (#64)', async () => {
    render(<AdminPermissionsPage />);
    await screen.findByRole('button', { name: /Admin Principal/i });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar administrador' }), { target: { value: 'zzz' } });
    expect(screen.getAllByRole('status').some((el) => el.textContent === 'Nenhum administrador encontrado.')).toBe(true);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar administrador' }), { target: { value: 'pedidos' } });
    expect(screen.getAllByRole('status').some((el) => el.textContent === '1 administrador encontrado.')).toBe(true);
  });

  it('erro ao carregar aparece como alerta (#64)', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({}, false));
    render(<AdminPermissionsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as permissões administrativas.');
  });
});

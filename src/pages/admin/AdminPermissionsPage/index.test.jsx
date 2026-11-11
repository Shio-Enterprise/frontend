import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  describe('novo administrador (#81)', () => {
    it('botão abre o diálogo de novo administrador', async () => {
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Novo administrador/i }));
      expect(screen.getByRole('dialog', { name: 'Novo administrador' })).toBeInTheDocument();
    });

    it('botão não aparece se a tela não carregou', async () => {
      globalThis.fetch = vi.fn(() => jsonResponse({}, false));
      render(<AdminPermissionsPage />);
      await screen.findByRole('alert');
      expect(screen.queryByRole('button', { name: /Novo administrador/i })).not.toBeInTheDocument();
    });

    it('conta criada entra na lista, fica selecionada e avisa do e-mail', async () => {
      globalThis.fetch
        .mockImplementationOnce(() => jsonResponse({ exists: false, email: 'nova@shio.com' }))
        .mockImplementationOnce(() =>
          jsonResponse({
            id: 3,
            name: 'Ana Nova',
            email: 'nova@shio.com',
            is_superuser: false,
            admin_permissions: ['manage_orders'],
            action: 'created',
            invite_sent: true,
          }),
        );
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Novo administrador/i }));
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@shio.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Ana Nova' } });
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Pedidos' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e enviar convite' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: /Ana Nova/i })).toHaveAttribute('aria-pressed', 'true');
      expect(
        screen.getAllByRole('status').some((el) =>
          el.textContent === 'Conta de Ana Nova criada. Enviamos para nova@shio.com o e-mail para criar a senha.',
        ),
      ).toBe(true);
      expect(screen.getByRole('checkbox', { name: /Pedidos/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /Produtos e estoque/i })).not.toBeChecked();
    });

    it('cliente promovido avisa que virou administrador', async () => {
      globalThis.fetch
        .mockImplementationOnce(() =>
          jsonResponse({ exists: true, id: 4, email: 'cli@shio.com', name: 'Cli', is_active: true, is_admin: false, is_superuser: false }),
        )
        .mockImplementationOnce(() =>
          jsonResponse({ id: 4, name: 'Cli', email: 'cli@shio.com', is_superuser: false, admin_permissions: ['manage_catalog'], action: 'promoted' }),
        );
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Novo administrador/i }));
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'cli@shio.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      await screen.findByText(/Conta de cliente encontrada/);
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Produtos e estoque' }));
      fireEvent.click(screen.getByRole('button', { name: 'Promover a administrador' }));

      await waitFor(() =>
        expect(screen.getAllByRole('status').some((el) => el.textContent === 'Cli agora é administrador.')).toBe(true),
      );
    });

    it('avisa quando a conta foi criada mas o e-mail falhou', async () => {
      globalThis.fetch
        .mockImplementationOnce(() => jsonResponse({ exists: false, email: 'nova@shio.com' }))
        .mockImplementationOnce(() =>
          jsonResponse({ id: 3, name: 'Ana', email: 'nova@shio.com', admin_permissions: ['manage_orders'], action: 'created', invite_sent: false }),
        );
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Novo administrador/i }));
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@shio.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Ana' } });
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Pedidos' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e enviar convite' }));

      await waitFor(() =>
        expect(screen.getAllByRole('status').some((el) => /o e-mail não foi enviado/.test(el.textContent))).toBe(true),
      );
    });
  });

  describe('remover acesso (#81)', () => {
    it('não aparece na própria conta nem em superusuário', async () => {
      globalThis.fetch = vi
        .fn()
        .mockImplementationOnce(() =>
          jsonResponse({ results: [...admins, { id: 5, name: 'Root', email: 'root@shio.com', is_superuser: true, admin_permissions: [] }] }),
        )
        .mockImplementationOnce(() => jsonResponse({ results: permissionOptions }));
      render(<AdminPermissionsPage />);
      await screen.findByRole('button', { name: /Admin Principal/i });
      expect(screen.queryByRole('button', { name: /Remover acesso/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Root/i }));
      expect(screen.queryByRole('button', { name: /Remover acesso/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Admin Pedidos/i }));
      expect(screen.getByRole('button', { name: /Remover acesso/i })).toBeInTheDocument();
    });

    it('confirma, remove da lista e avisa', async () => {
      globalThis.fetch.mockImplementationOnce(() =>
        Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error('sem corpo')) }),
      );
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Admin Pedidos/i }));
      fireEvent.click(screen.getByRole('button', { name: /Remover acesso/i }));

      const dialog = screen.getByRole('dialog', { name: 'Remover acesso de administrador' });
      expect(dialog).toHaveTextContent('pedidos@shio.com');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remover acesso' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/auth/admins/2/'),
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(screen.queryByRole('button', { name: /Admin Pedidos/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Admin Principal/i })).toHaveAttribute('aria-pressed', 'true');
      expect(
        screen.getAllByRole('status').some((el) => el.textContent === 'Admin Pedidos não é mais administrador e voltou a ser cliente.'),
      ).toBe(true);
      // O botão que abriu o diálogo sumiu: o foco vai para o título da lista.
      expect(screen.getByRole('heading', { name: 'Administradores' })).toHaveFocus();
    });

    it('cancelar não remove', async () => {
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Admin Pedidos/i }));
      fireEvent.click(screen.getByRole('button', { name: /Remover acesso/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: /Admin Pedidos/i })).toBeInTheDocument();
    });

    it('erro da API fica no diálogo', async () => {
      globalThis.fetch.mockImplementationOnce(() =>
        jsonResponse({ detail: 'Superusuários não podem ser alterados pelo painel.' }, false),
      );
      render(<AdminPermissionsPage />);
      fireEvent.click(await screen.findByRole('button', { name: /Admin Pedidos/i }));
      fireEvent.click(screen.getByRole('button', { name: /Remover acesso/i }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover acesso' }));

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        'Superusuários não podem ser alterados pelo painel.',
      );
      expect(screen.getByRole('button', { name: /Admin Pedidos/i })).toBeInTheDocument();
    });
  });

  it('erro ao carregar aparece como alerta (#64)', async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({}, false));
    render(<AdminPermissionsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as permissões administrativas.');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import NewAdminModal from './NewAdminModal';
import { createAdmin, lookupAdminEmail } from '../../lib/adminAccounts';

vi.mock('../../lib/adminAccounts', () => ({
  lookupAdminEmail: vi.fn(),
  createAdmin: vi.fn(),
}));

const permissionOptions = [
  { code: 'manage_catalog', label: 'Produtos e estoque' },
  { code: 'manage_orders', label: 'Pedidos' },
];

function renderModal() {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const utils = render(
    <NewAdminModal permissionOptions={permissionOptions} onClose={onClose} onSaved={onSaved} />,
  );
  return { ...utils, onClose, onSaved };
}

function typeEmailAndContinue(value) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('NewAdminModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre como diálogo pedindo o e-mail', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Novo administrador' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('recusa e-mail inválido sem chamar a API', async () => {
    renderModal();
    typeEmailAndContinue('nao-e-email');
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
    expect(lookupAdminEmail).not.toHaveBeenCalled();
  });

  it.each([
    [{ is_admin: true }, 'Este e-mail já pertence a um administrador.'],
    [{ is_admin: true, is_superuser: true }, 'Superusuários não podem ser alterados pelo painel.'],
    [{ is_admin: false, is_active: false }, 'Esta conta está desativada e não pode virar administradora.'],
  ])('bloqueia e-mail que não pode virar admin (%o)', async (flags, message) => {
    lookupAdminEmail.mockResolvedValueOnce({ exists: true, email: 'x@shio.com', name: 'X', is_active: true, ...flags });
    renderModal();
    typeEmailAndContinue('x@shio.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(createAdmin).not.toHaveBeenCalled();
  });

  it('promove cliente existente com as permissões escolhidas', async () => {
    lookupAdminEmail.mockResolvedValueOnce({
      exists: true, id: 9, email: 'cliente@shio.com', name: 'Cliente', is_active: true, is_admin: false, is_superuser: false,
    });
    const saved = { id: 9, email: 'cliente@shio.com', name: 'Cliente', action: 'promoted', admin_permissions: ['manage_orders'] };
    createAdmin.mockResolvedValueOnce(saved);
    const { onSaved } = renderModal();

    typeEmailAndContinue('Cliente@Shio.com');
    const found = await screen.findByText(/Conta de cliente encontrada/);
    expect(found).toHaveTextContent('Cliente');
    await waitFor(() => expect(found).toHaveFocus());
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pedidos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Promover a administrador' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(createAdmin).toHaveBeenCalledWith({
      email: 'cliente@shio.com',
      name: undefined,
      adminPermissions: ['manage_orders'],
    });
  });

  it('cadastra conta nova pedindo nome e ao menos uma permissão', async () => {
    lookupAdminEmail.mockResolvedValueOnce({ exists: false, email: 'nova@shio.com' });
    const saved = { id: 10, email: 'nova@shio.com', name: 'Nova', action: 'created', invite_sent: true };
    createAdmin.mockResolvedValueOnce(saved);
    const { onSaved } = renderModal();

    typeEmailAndContinue('nova@shio.com');
    const nameInput = await screen.findByLabelText('Nome');
    await waitFor(() => expect(nameInput).toHaveFocus());
    expect(screen.getByText(/e-mail para criar a própria senha/)).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'Cadastrar e enviar convite' });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome');

    fireEvent.change(nameInput, { target: { value: 'Nova' } });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Selecione ao menos uma permissão');
    expect(createAdmin).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Produtos e estoque' }));
    fireEvent.click(submit);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(createAdmin).toHaveBeenCalledWith({
      email: 'nova@shio.com',
      name: 'Nova',
      adminPermissions: ['manage_catalog'],
    });
  });

  it('mostra o erro da API e deixa tentar de novo', async () => {
    lookupAdminEmail.mockResolvedValueOnce({ exists: false, email: 'nova@shio.com' });
    createAdmin.mockRejectedValueOnce(new Error('Este e-mail já pertence a um administrador.'));
    const { onSaved } = renderModal();

    typeEmailAndContinue('nova@shio.com');
    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Nova' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pedidos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e enviar convite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já pertence a um administrador.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cadastrar e enviar convite' })).not.toHaveAttribute('aria-disabled');
  });

  it('"Trocar e-mail" volta para a primeira etapa com o foco no campo', async () => {
    lookupAdminEmail.mockResolvedValueOnce({ exists: false, email: 'nova@shio.com' });
    renderModal();
    typeEmailAndContinue('nova@shio.com');
    await screen.findByLabelText('Nome');

    fireEvent.click(screen.getByRole('button', { name: 'Trocar e-mail' }));
    const emailInput = screen.getByLabelText('E-mail');
    expect(emailInput).toHaveValue('nova@shio.com');
    await waitFor(() => expect(emailInput).toHaveFocus());
  });

  it('Cancelar fecha', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('não tem violações de acessibilidade nas etapas', async () => {
    lookupAdminEmail.mockResolvedValueOnce({ exists: false, email: 'nova@shio.com' });
    const { container } = renderModal();
    expect(await axe(container)).toHaveNoViolations();
    typeEmailAndContinue('nova@shio.com');
    await screen.findByLabelText('Nome');
    expect(await axe(container)).toHaveNoViolations();
  });
});

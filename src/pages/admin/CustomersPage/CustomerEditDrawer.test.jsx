import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import CustomersPage from './index';
import apiClient from '../../../lib/axios';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({ useApi: useApiMock }));
vi.mock('../../../lib/axios', () => ({ default: { patch: vi.fn() } }));

const CUSTOMER = {
  id: 'c1', name: 'Maria Silva', email: 'maria@exemplo.com', phone_number: '(61) 99999-8888', cpf: '529.982.247-25',
  total_orders: 0, total_spent: '0', created_at: '2026-10-01T10:00:00Z', order_history: [],
};

let listRefetch;
let currentCustomer;

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/admin/customers/c1/edit']}>
      <CustomersPage />
    </MemoryRouter>,
  );

const editDialog = () => screen.getByRole('dialog', { name: 'Editar Cliente' });

describe('Editar cliente (#100)', () => {
  beforeEach(() => {
    listRefetch = vi.fn();
    currentCustomer = { ...CUSTOMER };
    useApiMock.mockImplementation((url) => (
      url === '/api/auth/crm/customers/c1/'
        ? { data: currentCustomer, loading: false, error: null, refetch: vi.fn() }
        : { data: [CUSTOMER], loading: false, error: null, refetch: listRefetch }
    ));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('abre com os dados do cliente e o e-mail só leitura', () => {
    renderEdit();
    const dialog = editDialog();
    expect(within(dialog).getByLabelText('Nome completo')).toHaveValue('Maria Silva');
    expect(within(dialog).getByLabelText('Telefone')).toHaveValue('(61) 99999-8888');
    expect(within(dialog).getByLabelText('CPF')).toHaveValue('529.982.247-25');
    const email = within(dialog).getByLabelText('E-mail');
    expect(email).toHaveValue('maria@exemplo.com');
    expect(email).toHaveAttribute('readonly');
    expect(email).toHaveAccessibleDescription('O e-mail é o login do cliente e não pode ser alterado.');
    expect(screen.queryByRole('dialog', { name: 'Perfil do Cliente' })).not.toBeInTheDocument();
  });

  it('salva, atualiza a lista e volta para o perfil com aviso', async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    renderEdit();
    const dialog = editDialog();
    fireEvent.change(within(dialog).getByLabelText('Nome completo'), { target: { value: 'Maria Souza' } });
    fireEvent.change(within(dialog).getByLabelText('Telefone'), { target: { value: '11987654321' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Perfil do Cliente' })).toBeInTheDocument());
    // Nome sempre vai; telefone mudou; CPF não mexido fica de fora.
    expect(apiClient.patch).toHaveBeenCalledWith('/auth/crm/customers/c1/', {
      name: 'Maria Souza',
      phone_number: '(11) 98765-4321',
    });
    expect(listRefetch).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Dados do cliente salvos.');
    expect(screen.queryByRole('dialog', { name: 'Editar Cliente' })).not.toBeInTheDocument();
  });

  it('erro de campo aparece no campo e nada do que foi digitado se perde', async () => {
    apiClient.patch.mockRejectedValue({ response: { status: 400, data: { cpf: ['Este CPF já está cadastrado em outra conta.'] } } });
    renderEdit();
    const dialog = editDialog();
    fireEvent.change(within(dialog).getByLabelText('Nome completo'), { target: { value: 'Maria Souza' } });
    fireEvent.change(within(dialog).getByLabelText('CPF'), { target: { value: '11144477735' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Revise os campos destacados.');
    const cpf = within(dialog).getByLabelText('CPF');
    expect(cpf).toHaveValue('111.444.777-35');
    expect(cpf).toHaveAttribute('aria-invalid', 'true');
    expect(cpf).toHaveAccessibleDescription('Este CPF já está cadastrado em outra conta.');
    expect(within(dialog).getByLabelText('Nome completo')).toHaveValue('Maria Souza');
    expect(listRefetch).not.toHaveBeenCalled();

    // Corrigir o campo tira o erro dele.
    fireEvent.change(cpf, { target: { value: '529982247' } });
    expect(cpf).not.toHaveAttribute('aria-invalid');
  });

  it('sem permissão mostra o motivo', async () => {
    apiClient.patch.mockRejectedValue({ response: { status: 403, data: { detail: 'Acesso negado.' } } });
    renderEdit();
    fireEvent.click(within(editDialog()).getByRole('button', { name: 'Salvar' }));
    expect(await within(editDialog()).findByRole('alert')).toHaveTextContent('Você não tem permissão para editar clientes.');
  });

  it('falha de rede mostra mensagem genérica e libera o botão', async () => {
    apiClient.patch.mockRejectedValue(new Error('Network Error'));
    renderEdit();
    const save = within(editDialog()).getByRole('button', { name: 'Salvar' });
    fireEvent.click(save);
    expect(await within(editDialog()).findByRole('alert')).toHaveTextContent('Não foi possível salvar. Tente de novo.');
    expect(save).not.toHaveAttribute('aria-disabled');
  });

  it('cliente sem telefone e CPF abre com os campos vazios e salva só o nome', async () => {
    currentCustomer = { ...CUSTOMER, phone_number: null, cpf: null };
    apiClient.patch.mockResolvedValue({ data: {} });
    renderEdit();
    expect(within(editDialog()).getByLabelText('Telefone')).toHaveValue('');
    fireEvent.click(within(editDialog()).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/auth/crm/customers/c1/', { name: 'Maria Silva' }));
  });

  it('Cancelar volta para o perfil sem salvar nem aviso', async () => {
    renderEdit();
    fireEvent.click(within(editDialog()).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Perfil do Cliente' })).toBeInTheDocument());
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(screen.queryByText('Dados do cliente salvos.')).not.toBeInTheDocument();
  });

  it('o botão Editar Cliente do perfil abre a edição', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/customers/c1']}>
        <CustomersPage />
      </MemoryRouter>,
    );
    const profile = screen.getByRole('dialog', { name: 'Perfil do Cliente' });
    expect(within(profile).getByText('(61) 99999-8888')).toBeInTheDocument();
    expect(within(profile).getByText('529.982.247-25')).toBeInTheDocument();
    fireEvent.click(within(profile).getByRole('button', { name: 'Editar Cliente' }));
    expect(await screen.findByRole('dialog', { name: 'Editar Cliente' })).toBeInTheDocument();
  });

  it('sem violações de acessibilidade, inclusive com erro', async () => {
    apiClient.patch.mockRejectedValue({ response: { status: 400, data: { name: ['Informe o nome.'], phone_number: ['Telefone inválido.'] } } });
    const { container } = renderEdit();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(within(editDialog()).getByRole('button', { name: 'Salvar' }));
    await within(editDialog()).findByRole('alert');
    expect(within(editDialog()).getByLabelText('Nome completo')).toHaveAccessibleDescription('Informe o nome.');
    expect(await axe(container)).toHaveNoViolations();
  });
});

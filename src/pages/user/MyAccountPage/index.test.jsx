import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyAccountPage from './index';
import apiClient from '../../../lib/axios';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));
vi.mock('../../../lib/axios', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

const OPT_IN = 'Quero receber novidades e cupons por e-mail';

const renderPage = () =>
  render(
    <BrowserRouter>
      <MyAccountPage />
    </BrowserRouter>
  );

describe('MyAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: { receives: true } });
    apiClient.put.mockResolvedValue({ data: { receives: false } });
  });

  it('renders headline', () => {
    renderPage();
    const headline = screen.getByText(/MyAccountPage/i);
    expect(headline).toBeInTheDocument();
  });

  it('interruptor reflete receives do backend', async () => {
    renderPage();
    const sw = await screen.findByRole('switch', { name: OPT_IN });
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me/marketing/');
  });

  it('alternar chama PUT e mantém estado', async () => {
    renderPage();
    const sw = await screen.findByRole('switch', { name: OPT_IN });
    await waitFor(() => expect(sw).toBeEnabled());
    fireEvent.click(sw);
    expect(apiClient.put).toHaveBeenCalledWith('/auth/me/marketing/', { receives: false });
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));
    await waitFor(() => expect(sw).toBeEnabled());
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('erro reverte o interruptor e mostra mensagem', async () => {
    apiClient.put.mockRejectedValue(new Error('falha'));
    renderPage();
    const sw = await screen.findByRole('switch', { name: OPT_IN });
    await waitFor(() => expect(sw).toBeEnabled());
    fireEvent.click(sw);
    expect(await screen.findByText('Não foi possível salvar sua preferência.')).toBeInTheDocument();
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });
  it('campos com autocomplete e teclado certo; aviso do e-mail ligado ao campo', async () => {
    renderPage();
    const nome = await screen.findByLabelText('Nome Completo');
    expect(nome).toHaveAttribute('autocomplete', 'name');
    const tel = screen.getByLabelText('Telefone');
    expect(tel).toHaveAttribute('autocomplete', 'tel');
    expect(tel).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('CPF')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('O e-mail não pode ser alterado.');
  });

  it('anuncia o resultado de salvar os dados', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos com sucesso!');
    fetchMock.mockRestore();
  });

  it('anuncia o erro de salvar os dados', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ cpf: ['inválido'] }) });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('inválido');
    fetchMock.mockRestore();
  });

  it('anuncia o erro da preferência de e-mail', async () => {
    apiClient.put.mockRejectedValue(new Error('falha'));
    renderPage();
    const sw = await screen.findByRole('switch', { name: OPT_IN });
    await waitFor(() => expect(sw).toBeEnabled());
    fireEvent.click(sw);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar sua preferência.');
  });
});

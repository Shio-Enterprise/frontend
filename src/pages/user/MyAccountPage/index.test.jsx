import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Revise os campos destacados.');
    expect(screen.getByLabelText('CPF')).toHaveAccessibleDescription('inválido');
    fetchMock.mockRestore();
  });

  describe('erro do backend no formato { error, details }', () => {
    const CPF_EM_USO = 'Este CPF já está cadastrado em outra conta.';
    const respondeCpfEmUso = () =>
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Dados inválidos.', details: { cpf: [CPF_EM_USO] } }),
      });

    it('mostra a mensagem do CPF no campo, sem [object Object]', async () => {
      const fetchMock = respondeCpfEmUso();
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('Revise os campos destacados.');
      const campo = screen.getByLabelText('CPF');
      expect(campo).toHaveAttribute('aria-invalid', 'true');
      expect(campo).toHaveAccessibleDescription(CPF_EM_USO);
      expect(document.body).not.toHaveTextContent('[object Object]');
      expect(document.body).not.toHaveTextContent('details');
      fetchMock.mockRestore();
    });

    it('o erro não some sozinho e sai quando a pessoa corrige o CPF', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const fetchMock = respondeCpfEmUso();
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
      await screen.findByText(CPF_EM_USO);

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText(CPF_EM_USO)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '98765432100' } });
      expect(screen.queryByText(CPF_EM_USO)).not.toBeInTheDocument();
      expect(screen.getByLabelText('CPF')).not.toHaveAttribute('aria-invalid');
      fetchMock.mockRestore();
      vi.useRealTimers();
    });

    it('erro sem campo mostra a mensagem geral do backend', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Dados inválidos.' }),
      });
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos.');
      fetchMock.mockRestore();
    });

    it('falha de rede mostra mensagem amigável', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar. Tente de novo.');
      expect(document.body).not.toHaveTextContent('Failed to fetch');
      fetchMock.mockRestore();
    });
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

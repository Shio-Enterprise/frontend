import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('renders headline', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
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
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Dados inválidos.', details: { cpf: ['CPF inválido.'] } }),
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar Alterações' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revise os campos destacados.');
    expect(screen.getByLabelText('CPF')).toHaveAccessibleDescription('CPF inválido.');
    expect(screen.getByLabelText('CPF')).toHaveAttribute('aria-invalid', 'true');
    fetchMock.mockRestore();
  });

  describe('telefone antigo fora do padrão', () => {
    const mockMe = (phone, patchResponse = {}) => vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({
      ok: true,
      json: async () => options?.method === 'PATCH'
        ? { name: 'Nome Novo', phone_number: phone, cpf: null, ...patchResponse }
        : { name: 'Cliente', phone_number: phone, cpf: null },
    }));
    const patchBody = (fetchMock) => {
      const call = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
      return JSON.parse(call[1].body);
    };

    beforeEach(() => localStorage.setItem('accessToken', 'test-token'));
    afterEach(() => {
      vi.restoreAllMocks();
      localStorage.removeItem('accessToken');
    });

    it.each([
      ['ligar à tarde', 'Telefone inválido. Informe DDD e número.'],
      ['99999-9999', 'Telefone inválido. Informe DDD e número.'],
      ['(61) 9999-9999', 'Celular precisa ter 9 dígitos depois do DDD. Confira se falta o 9 no começo.'],
    ])('%s aparece como está, com o erro, e não é apagado ao salvar só o nome', async (legacy, message) => {
      const fetchMock = mockMe(legacy);
      renderPage();
      const tel = await screen.findByLabelText('Telefone');
      await waitFor(() => expect(tel).toHaveValue(legacy));
      expect(tel).toHaveAttribute('aria-invalid', 'true');
      expect(tel).toHaveAccessibleDescription(message);

      fireEvent.change(screen.getByLabelText('Nome Completo'), { target: { value: 'Nome Novo' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos com sucesso!');

      expect(patchBody(fetchMock)).not.toHaveProperty('phone_number');
      expect(tel).toHaveValue(legacy);
      expect(tel).toHaveAccessibleDescription(message);
    });

    it('telefone válido sem mudança também não vai no PATCH', async () => {
      const fetchMock = mockMe('61999999999', { phone_number: '(61) 99999-9999' });
      renderPage();
      const tel = await screen.findByLabelText('Telefone');
      await waitFor(() => expect(tel).toHaveValue('(61) 99999-9999'));
      expect(tel).not.toHaveAttribute('aria-invalid');
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      await screen.findByRole('status');
      expect(patchBody(fetchMock)).not.toHaveProperty('phone_number');
    });

    it('corrigir o telefone tira o erro, envia e mostra o que a API devolveu', async () => {
      const fetchMock = mockMe('ligar à tarde', { phone_number: '(61) 99999-9999' });
      renderPage();
      const tel = await screen.findByLabelText('Telefone');
      await waitFor(() => expect(tel).toHaveAttribute('aria-invalid', 'true'));
      fireEvent.change(tel, { target: { value: '61999999999' } });
      expect(tel).not.toHaveAttribute('aria-invalid');
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos com sucesso!');
      expect(patchBody(fetchMock).phone_number).toBe('(61) 99999-9999');
      expect(tel).toHaveValue('(61) 99999-9999');
      expect(tel).not.toHaveAttribute('aria-invalid');
    });

    it('apagar o telefone envia vazio', async () => {
      const fetchMock = mockMe('ligar à tarde', { phone_number: null });
      renderPage();
      const tel = await screen.findByLabelText('Telefone');
      await waitFor(() => expect(tel).toHaveValue('ligar à tarde'));
      fireEvent.change(tel, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      await screen.findByRole('status');
      expect(patchBody(fetchMock).phone_number).toBe('');
      expect(tel).toHaveValue('');
    });
  });

  describe('CPF antigo fora do padrão', () => {
    beforeEach(() => localStorage.setItem('accessToken', 'test-token'));
    afterEach(() => {
      vi.restoreAllMocks();
      localStorage.removeItem('accessToken');
    });

    it.each([
      ['sem número', 'não informado'],
      ['com dígitos a mais', '123.456.789-0012'],
      ['duplicado preservado pela migração', '096.756.233-30'],
    ])('%s aparece como está e não vai no PATCH ao salvar só o nome', async (_caso, legacy) => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({
        ok: true,
        json: async () => ({ name: options?.method === 'PATCH' ? 'Nome Novo' : 'Cliente', phone_number: null, cpf: legacy }),
      }));
      renderPage();
      const cpf = await screen.findByLabelText('CPF');
      await waitFor(() => expect(cpf).toHaveValue(legacy));
      fireEvent.change(screen.getByLabelText('Nome Completo'), { target: { value: 'Nome Novo' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos com sucesso!');
      const call = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
      expect(JSON.parse(call[1].body)).toEqual({ name: 'Nome Novo' });
      expect(cpf).toHaveValue(legacy);
    });
  });

  it('aplica a máscara no telefone e no CPF, inclusive em dados antigos', async () => {
    localStorage.setItem('accessToken', 'test-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({
      ok: true,
      json: async () => options?.method === 'PATCH'
        ? { phone_number: '(11) 3333-4444', cpf: '529.982.247-25' }
        : { name: 'Cliente', phone_number: '+55 61 99999 9999', cpf: '52998224725' },
    }));
    try {
      renderPage();
      const tel = await screen.findByLabelText('Telefone');
      const cpf = screen.getByLabelText('CPF');
      await waitFor(() => expect(tel).toHaveValue('(61) 99999-9999'));
      expect(cpf).toHaveValue('529.982.247-25');

      fireEvent.change(tel, { target: { value: '11a3333 4444 99' } });
      expect(tel).toHaveValue('(11) 33334-4449');
      fireEvent.change(tel, { target: { value: '1133334444' } });
      expect(tel).toHaveValue('(11) 3333-4444');
      fireEvent.change(cpf, { target: { value: '529982' } });
      expect(cpf).toHaveValue('529.982');
      fireEvent.change(cpf, { target: { value: '0967562333099' } });
      expect(cpf).toHaveValue('096.756.233-30');

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos com sucesso!');
      const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
      expect(JSON.parse(patchCall[1].body)).toMatchObject({
        phone_number: '(11) 3333-4444',
        cpf: '096.756.233-30',
      });
    } finally {
      fetchMock.mockRestore();
      localStorage.removeItem('accessToken');
    }
  });

  it.each([
    ['09675623330', '096.756.233-30', '096.756.233-30'],
    ['096.756.233-30', '096.756.233-30', '096.756.233-30'],
    ['', '', null],
  ])('envia %s e exibe o CPF devolvido pela API depois de salvar', async (typed, shown, saved) => {
    localStorage.setItem('accessToken', 'test-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => ({
      ok: true,
      json: async () => options?.method === 'PATCH'
        ? { cpf: saved }
        : { name: 'Cliente', phone_number: '61999999999', cpf: '529.982.247-25' },
    }));
    try {
      renderPage();
      const field = await screen.findByLabelText('CPF');
      await waitFor(() => expect(field).toHaveValue('529.982.247-25'));
      fireEvent.change(field, { target: { value: typed } });
      expect(field).toHaveValue(shown);
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Dados salvos com sucesso!');
      expect(field).toHaveValue(saved ?? '');
      const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
      expect(JSON.parse(patchCall[1].body).cpf).toBe(shown);
    } finally {
      fetchMock.mockRestore();
      localStorage.removeItem('accessToken');
    }
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

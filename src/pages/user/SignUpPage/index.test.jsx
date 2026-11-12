import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SignUpPage from './index';
import { useAuth } from '../../../context/AuthContext';
import { axe } from 'vitest-axe';

vi.mock('../../../context/AuthContext');
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-mock" />,
  useGoogleLogin: () => vi.fn(),
}));

let registerWithPassword;
const OPT_IN = 'Quero receber novidades e cupons por e-mail';

describe('SignUpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerWithPassword = vi.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ registerWithPassword });
  });

  it('renders headline', () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );
    const headline = screen.getByText(/Bem vindo/i);
    expect(headline).toBeInTheDocument();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

  it('caixa de promoções começa desmarcada', () => {
    renderPage();
    expect(screen.getByLabelText(OPT_IN)).not.toBeChecked();
  });

  it('envia marketing_opt_in quando marcada', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByLabelText(OPT_IN));
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));
    await waitFor(() =>
      expect(registerWithPassword).toHaveBeenCalledWith('Ana', 'ana@x.com', 'Senha123!', true)
    );
  });
  it('campos com rótulo visível, autocomplete e olho na senha', () => {
    renderPage();
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();
  });

  const submitWith = (data, status = 400) => {
    registerWithPassword.mockRejectedValueOnce({ response: { status, data } });
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));
  };

  // #96: cada problema mostra a mensagem que o servidor mandou, no campo certo.
  it.each([
    ['em branco', 'Informe o e-mail.'],
    ['inválido', 'Informe um e-mail válido, como nome@exemplo.com.'],
    ['já cadastrado', 'Este e-mail já está em uso.'],
  ])('e-mail %s mostra a própria mensagem no campo', async (_caso, mensagem) => {
    submitWith({ email: [mensagem] });
    expect(await screen.findByRole('alert')).toHaveTextContent('Revise os campos destacados.');
    const field = screen.getByLabelText('E-mail');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(mensagem);
    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-invalid');
  });

  it.each([
    ['curta', ['A senha precisa ter pelo menos 8 caracteres.']],
    ['comum', ['Essa senha é muito comum.']],
    ['só com números', ['Essa senha é muito comum.', 'A senha não pode ter só números.']],
  ])('senha %s mostra o motivo no campo', async (_caso, mensagens) => {
    submitWith({ password: mensagens });
    await screen.findByRole('alert');
    const field = screen.getByLabelText('Senha');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(mensagens.join(' '));
  });

  it('mostra todos os problemas ao mesmo tempo, cada um no seu campo', async () => {
    submitWith({
      name: ['Informe o nome.'],
      email: ['Informe um e-mail válido, como nome@exemplo.com.'],
      password: ['A senha não pode ter só números.'],
    });
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Nome completo')).toHaveAccessibleDescription('Informe o nome.');
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@exemplo.com.'
    );
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'A senha não pode ter só números.'
    );
  });

  it('leva o foco para o primeiro campo com erro', async () => {
    submitWith({ email: ['Este e-mail já está em uso.'], password: ['Essa senha é muito comum.'] });
    await screen.findByRole('alert');
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });

  it('o erro some do campo quando a pessoa edita', async () => {
    submitWith({ email: ['Este e-mail já está em uso.'] });
    await screen.findByRole('alert');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'outra@x.com' } });
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText('Este e-mail já está em uso.')).not.toBeInTheDocument();
  });

  it('editar um campo não tira o foco nem apaga o erro dos outros', async () => {
    submitWith({ email: ['Este e-mail já está em uso.'], password: ['Essa senha é muito comum.'] });
    await screen.findByRole('alert');
    const email = screen.getByLabelText('E-mail');
    fireEvent.change(email, { target: { value: 'outra@x.com' } });
    expect(email).toHaveFocus();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
  });

  it('erro 500 mostra a mensagem genérica', async () => {
    submitWith({ detail: 'boom' }, 500);
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao criar conta.');
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
  });

  it('sem resposta do servidor mostra a mensagem genérica', async () => {
    registerWithPassword.mockRejectedValueOnce(new Error('Network Error'));
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao criar conta.');
  });
});

// Testes mínimos da #64: formulário de cadastro sem violações, vazio e com erro.
describe('SignUpPage — acessibilidade (axe)', () => {
  beforeEach(() => {
    registerWithPassword = vi.fn().mockRejectedValue({
      response: { status: 400, data: { email: ['Este e-mail já está em uso.'] } },
    });
    useAuth.mockReturnValue({ registerWithPassword });
  });

  it('sem violações vazio e com erro de cadastro', async () => {
    const { container } = render(<MemoryRouter><SignUpPage /></MemoryRouter>);
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));
    await screen.findByRole('alert');
    expect(await axe(container)).toHaveNoViolations();
  });
});

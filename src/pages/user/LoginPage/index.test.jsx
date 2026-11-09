import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './index';
import { useAuth } from '../../../context/AuthContext';
import { axe } from 'vitest-axe';

vi.mock('../../../context/AuthContext');
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-mock" />,
}));

describe('LoginPage', () => {
  const loginWithPasswordMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      loginWithPassword: loginWithPasswordMock,
      login: vi.fn(),
    });
  });

  it('renderiza a página de login corretamente', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByAltText('Shio Logo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Bem vindo\(a\)/i })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('returns to the complete source location, including query and hash', async () => {
    loginWithPasswordMock.mockResolvedValueOnce({});
    function LocationProbe() { return <span data-testid="location">{useLocation().pathname}{useLocation().search}{useLocation().hash}</span>; }
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/category/shoes', search: '?size=42', hash: '#results' } } }]}>
        <LoginPage />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/category/shoes?size=42#results'));
  });

  it('usa a mesma tela de login ao retornar para uma rota administrativa', async () => {
    loginWithPasswordMock.mockResolvedValue({
      user: { is_admin: true },
    });

    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/login',
          state: {
            from: {
              pathname: '/admin/dashboard',
              search: '?period=monthly',
              hash: '',
            },
          },
        }]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/dashboard"
            element={<div data-testid="admin-dashboard">Dashboard</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'admin@shio.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });

    expect(loginWithPasswordMock).toHaveBeenCalledWith(
      'admin@shio.com',
      'senha-segura',
    );
  });
  it('campos com rótulo visível, autocomplete e olho na senha', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('anuncia o erro de login', async () => {
    loginWithPasswordMock.mockRejectedValueOnce({ response: { data: { error: 'Credenciais inválidas.' } } });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas.');
  });

  it('enviando pelo botão, o foco fica no botão durante o envio e depois do erro', async () => {
    let falhar;
    loginWithPasswordMock.mockReturnValueOnce(new Promise((_, reject) => { falhar = reject; }));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    const botao = screen.getByRole('button', { name: 'Entrar' });
    botao.focus();
    fireEvent.click(botao);
    const ocupado = await screen.findByRole('button', { name: 'Autenticando...' });
    expect(ocupado).toHaveAttribute('aria-disabled', 'true');
    expect(ocupado).not.toBeDisabled();
    expect(ocupado).toHaveFocus();
    // Segundo clique durante o envio não manda de novo.
    fireEvent.click(ocupado);
    expect(loginWithPasswordMock).toHaveBeenCalledTimes(1);
    falhar({ response: { status: 401, data: {} } });
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveFocus();
  });
});

// Testes mínimos da #64: formulário de login sem violações, vazio e com erro.
describe('LoginPage — acessibilidade (axe)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ loginWithPassword: vi.fn().mockRejectedValue(new Error('x')), login: vi.fn() });
  });

  it('sem violações, com a senha visível e com erro de login', async () => {
    const { container } = render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('alert');
    expect(await axe(container)).toHaveNoViolations();
  });
});

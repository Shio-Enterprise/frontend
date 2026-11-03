import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './index';
import { useAuth } from '../../../context/AuthContext';

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
});

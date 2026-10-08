import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
    expect(screen.getByPlaceholderText('E-mail')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
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

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'admin@shio.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Senha'), {
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
});

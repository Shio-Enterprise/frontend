import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../lib/axios';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from '../lib/authToken';

vi.mock('../lib/axios', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../lib/authToken', () => ({
  clearAuthTokens: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setAuthTokens: vi.fn(),
}));

function AuthStateProbe() {
  const { user, isAdmin, login, logout } = useAuth();

  return (
    <>
      <span>{isAdmin ? 'admin' : 'not-admin'}</span>
      <span>{user?.email ?? 'sem-usuario'}</span>
      <button
        type="button"
        onClick={() => login({
          user: { email: 'admin@shio.com', is_admin: true },
          access: 'access-token',
          refresh: 'refresh-token',
        })}
      >
        Entrar como admin
      </button>
      <button type="button" onClick={() => logout()}>
        Sair
      </button>
    </>
  );
}

describe('AuthContext logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getAccessToken.mockReturnValue(null);
    getRefreshToken.mockReturnValue(null);
  });

  it('remove usuário e permissão administrativa imediatamente ao deslogar', () => {
    let resolveLogout;
    apiClient.post.mockReturnValue(new Promise((resolve) => {
      resolveLogout = resolve;
    }));

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar como admin' }));
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('admin@shio.com')).toBeInTheDocument();

    getAccessToken.mockReturnValue('access-token');
    getRefreshToken.mockReturnValue('refresh-token');

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.getByText('not-admin')).toBeInTheDocument();
    expect(screen.getByText('sem-usuario')).toBeInTheDocument();
    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/logout/',
      { refresh: 'refresh-token' },
      { headers: { Authorization: 'Bearer access-token' } },
    );

    resolveLogout({});
  });
});

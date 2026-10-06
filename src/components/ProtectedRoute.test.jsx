import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../lib/authToken';

vi.mock('../context/AuthContext');
vi.mock('../lib/authToken', () => ({
  getAccessToken: vi.fn(),
}));

function LoginProbe() {
  const location = useLocation();
  return (
    <div>
      <span>Login</span>
      <span data-testid="requested-path">{location.state?.from?.pathname}</span>
    </div>
  );
}

const renderAdminRoute = () => render(
  <MemoryRouter initialEntries={['/admin/dashboard']}>
    <Routes>
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <div>Área administrativa</div>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginProbe />} />
      <Route path="/" element={<div>Loja</div>} />
    </Routes>
  </MemoryRouter>
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redireciona usuário não autenticado para o login único', () => {
    getAccessToken.mockReturnValue(null);
    useAuth.mockReturnValue({ isAdmin: false, isAuthLoading: false });

    renderAdminRoute();

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByTestId('requested-path')).toHaveTextContent('/admin/dashboard');
  });

  it('impede usuário comum autenticado de acessar rota administrativa', () => {
    getAccessToken.mockReturnValue('token');
    useAuth.mockReturnValue({ isAdmin: false, isAuthLoading: false });

    renderAdminRoute();

    expect(screen.getByText('Loja')).toBeInTheDocument();
    expect(screen.queryByText('Área administrativa')).not.toBeInTheDocument();
  });

  it('permite que administrador autenticado acesse rota administrativa', () => {
    getAccessToken.mockReturnValue('token');
    useAuth.mockReturnValue({ isAdmin: true, isAuthLoading: false });

    renderAdminRoute();

    expect(screen.getByText('Área administrativa')).toBeInTheDocument();
  });
});

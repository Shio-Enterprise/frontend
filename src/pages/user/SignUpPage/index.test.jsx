import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SignUpPage from './index';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext');
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-mock" />,
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

  it('anuncia o erro de cadastro', async () => {
    registerWithPassword.mockRejectedValueOnce({ response: { data: { email: ['existe'] } } });
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já está em uso.');
  });
});

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
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UnsubscribePage from './index';
import apiClient from '../../../lib/axios';

vi.mock('../../../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../components/layout/public/PublicLayout', () => ({ default: ({ children }) => <main>{children}</main> }));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/descadastrar/abc123']}>
      <Routes>
        <Route path="/descadastrar/:token" element={<UnsubscribePage />} />
      </Routes>
    </MemoryRouter>
  );

describe('UnsubscribePage', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('mostra email mascarado e não descadastra ao abrir', async () => {
    apiClient.get.mockResolvedValue({ data: { email: 'ar***@gmail.com' } });
    renderPage();
    expect(await screen.findByText(/ar\*\*\*@gmail\.com/)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/auth/marketing/unsubscribe/abc123/');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmar descadastro' })).toBeEnabled();
  });

  it('confirma e mostra sucesso', async () => {
    apiClient.get.mockResolvedValue({ data: { email: 'ar***@gmail.com' } });
    apiClient.post.mockResolvedValue({ data: { message: 'Pronto, você não vai mais receber promoções.' } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar descadastro' }));
    expect(await screen.findByText('Pronto, você não vai mais receber promoções.')).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/marketing/unsubscribe/abc123/');
    expect(screen.queryByRole('button', { name: 'Confirmar descadastro' })).not.toBeInTheDocument();
  });

  it('link inválido mostra erro', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 400, data: { error: 'Link inválido.' } } });
    renderPage();
    expect(await screen.findByText('Este link de descadastro é inválido.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar descadastro' })).not.toBeInTheDocument();
  });
});

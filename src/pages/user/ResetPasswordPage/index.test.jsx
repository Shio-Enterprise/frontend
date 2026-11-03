import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from './index';
import apiClient from '../../../lib/axios';

vi.mock('../../../lib/axios', () => ({ default: { post: vi.fn() } }));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/reset-password/uid/token']}>
      <Routes>
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );

const fill = (nova, confirma) => {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: nova } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirma } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
};

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dois campos de senha com rótulo, autocomplete e olho', () => {
    renderPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getAllByRole('button', { name: 'Mostrar senha' })).toHaveLength(2);
  });

  it('senhas diferentes: erro ligado ao campo de confirmação, sem chamar a API', () => {
    renderPage();
    fill('Senha1234', 'Outra1234');
    const confirm = screen.getByLabelText('Confirmar nova senha');
    expect(confirm).toHaveAttribute('aria-invalid', 'true');
    expect(confirm).toHaveAccessibleDescription('As senhas não coincidem.');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('corrigir a confirmação limpa o erro do campo', () => {
    renderPage();
    fill('Senha1234', 'Outra1234');
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Senha1234' } });
    expect(screen.getByLabelText('Confirmar nova senha')).not.toHaveAttribute('aria-invalid');
  });

  it('anuncia erro da API', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { data: { error: 'Link expirado.' } } });
    renderPage();
    fill('Senha1234', 'Senha1234');
    expect(await screen.findByRole('alert')).toHaveTextContent('Link expirado.');
  });

  it('anuncia o sucesso', async () => {
    apiClient.post.mockResolvedValueOnce({});
    renderPage();
    fill('Senha1234', 'Senha1234');
    expect(await screen.findByRole('status')).toHaveTextContent('Senha redefinida com sucesso');
  });
});

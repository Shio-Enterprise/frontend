import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './index';
import apiClient from '../../../lib/axios';

vi.mock('../../../lib/axios', () => ({ default: { post: vi.fn() } }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('campo de e-mail com rótulo visível e autocomplete', () => {
    renderPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
  });

  it('anuncia o sucesso do envio', async () => {
    apiClient.post.mockResolvedValueOnce({});
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    expect(await screen.findByRole('status')).toHaveTextContent('você receberá as instruções');
  });

  it('o formulário some no sucesso e o foco vai para a mensagem', async () => {
    apiClient.post.mockResolvedValueOnce({});
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@x.com' } });
    const botao = screen.getByRole('button', { name: 'Enviar link de recuperação' });
    botao.focus();
    fireEvent.click(botao);
    expect(await screen.findByRole('status')).toHaveFocus();
  });

  it('anuncia o erro do envio', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { data: { error: 'Muitas tentativas.' } } });
    renderPage();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas.');
  });
});

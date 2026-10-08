import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WelcomeModal from './WelcomeModal';

// Mock getAccessToken so we control logged-in state
vi.mock('../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => null),
}));

import { getAccessToken } from '../../lib/authToken';

describe('WelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    getAccessToken.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.style.overflow = 'unset';
  });

  const renderModal = () => {
    return render(
      <BrowserRouter>
        <WelcomeModal />
      </BrowserRouter>
    );
  };

  it('não deve renderizar se o usuário estiver logado (accessToken válido presente)', () => {
    getAccessToken.mockReturnValue('valid-token');
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
  });

  it('deve renderizar se getAccessToken retornar null (token expirado ou ausente)', () => {
    getAccessToken.mockReturnValue(null);
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
  });

  it('não deve renderizar se o modal foi fechado há menos de 1 dia', () => {
    localStorage.setItem('welcomeModalClosedAt', Date.now().toString());
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
  });

  it('deve renderizar após 3 segundos se o usuário não estiver logado e não tiver visto o modal recentemente', () => {
    renderModal();

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('deve renderizar se o modal foi fechado há mais de 1 dia', () => {
    const doisDiasAtras = Date.now() - (2 * 24 * 60 * 60 * 1000);
    localStorage.setItem('welcomeModalClosedAt', doisDiasAtras.toString());

    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
  });

  it('deve fechar o modal e salvar no localStorage ao clicar no botão de fechar', () => {
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();

    const closeButton = screen.getByLabelText('Fechar');

    const mockNow = 1600000000000;
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
    expect(localStorage.getItem('welcomeModalClosedAt')).toBe(mockNow.toString());
  });

  it('deve fechar o modal ao pressionar Esc', () => {
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no backdrop', () => {
    const { container } = renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();

    // Clica no backdrop (o div externo)
    const backdrop = container.querySelector('.fixed.inset-0');
    act(() => {
      fireEvent.click(backdrop);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
  });

  it('não deve fechar o modal ao clicar dentro do conteúdo', () => {
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();

    // Clica no conteúdo (o div interno com role=dialog)
    const dialog = screen.getByRole('dialog');
    act(() => {
      fireEvent.click(dialog);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
  });
});

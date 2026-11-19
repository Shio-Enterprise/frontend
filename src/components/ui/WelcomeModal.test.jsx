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

  it('deve renderizar mesmo que o modal tenha sido fechado recentemente (sem cooldown)', () => {
    // Antes havia cooldown de 1 dia; agora o modal sempre aparece para usuário deslogado.
    localStorage.setItem('welcomeModalClosedAt', Date.now().toString());
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
  });

  it('deve renderizar após 3 segundos se o usuário não estiver logado', () => {
    renderModal();

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('deve renderizar mesmo com timestamp antigo no localStorage (cooldown removido)', () => {
    const doisDiasAtras = Date.now() - (2 * 24 * 60 * 60 * 1000);
    localStorage.setItem('welcomeModalClosedAt', doisDiasAtras.toString());

    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no botão de fechar (sem salvar no localStorage)', () => {
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();

    const closeButton = screen.getByLabelText('Fechar');

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
    // Não salva mais timestamp no localStorage — modal sempre reaparece
    expect(localStorage.getItem('welcomeModalClosedAt')).toBeNull();
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

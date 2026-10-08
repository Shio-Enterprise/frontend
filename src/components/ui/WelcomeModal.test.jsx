import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WelcomeModal from './WelcomeModal';

describe('WelcomeModal', () => {
  beforeEach(() => {
    // Limpa o localStorage antes de cada teste
    localStorage.clear();
    // Usa timers falsos do vitest para não ter que esperar 3 segundos reais nos testes
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.style.overflow = 'unset'; // Reseta o scroll
  });

  const renderModal = () => {
    return render(
      <BrowserRouter>
        <WelcomeModal />
      </BrowserRouter>
    );
  };

  it('não deve renderizar se o usuário estiver logado (accessToken presente)', () => {
    localStorage.setItem('accessToken', 'fake-token');
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
  });

  it('não deve renderizar se o modal foi fechado há menos de 1 dia', () => {
    // Simula que foi fechado agora
    localStorage.setItem('welcomeModalClosedAt', Date.now().toString());
    renderModal();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
  });

  it('deve renderizar após 3 segundos se o usuário não estiver logado e não tiver visto o modal recentemente', () => {
    renderModal();

    // Antes dos 3 segundos
    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();

    act(() => {
      // Avança o tempo em 3 segundos
      vi.advanceTimersByTime(3000);
    });

    // Agora o modal deve estar na tela
    expect(screen.getByText('Seja muito bem-vindo(a)!')).toBeInTheDocument();
    
    // Verifica se o scroll foi travado
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

    // Encontra o botão de fechar (pelo aria-label ou texto)
    const closeButton = screen.getByLabelText('Fechar');
    
    // Mock do Date.now para testar o timestamp exato
    const mockNow = 1600000000000;
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    act(() => {
      fireEvent.click(closeButton);
    });

    // O modal deve sumir
    expect(screen.queryByText('Seja muito bem-vindo(a)!')).not.toBeInTheDocument();
    
    // O scroll deve destravar
    expect(document.body.style.overflow).toBe('unset');

    // O localStorage deve ter sido atualizado com o timestamp
    expect(localStorage.getItem('welcomeModalClosedAt')).toBe(mockNow.toString());
  });
});

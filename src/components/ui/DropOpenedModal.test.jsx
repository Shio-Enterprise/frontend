import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DropOpenedModal from './DropOpenedModal';

vi.mock('../../lib/authToken', () => ({
  getAccessToken: vi.fn(() => null),
}));

vi.mock('../../lib/dropWaitlistApi', () => ({
  getUnseenOpenDrops: vi.fn(() => Promise.resolve([])),
  markWaitlistEntrySeen: vi.fn(() => Promise.resolve({})),
}));

import { getAccessToken } from '../../lib/authToken';
import { getUnseenOpenDrops, markWaitlistEntrySeen } from '../../lib/dropWaitlistApi';

const fakeDrop = (overrides = {}) => ({
  id: 'entry-uuid-1',
  drop: { id: 'drop-uuid-1', name: 'Drop Verão', slug: 'drop-verao', launch_date: null },
  seen_at: null,
  ...overrides,
});

const renderModal = () =>
  render(
    <BrowserRouter>
      <DropOpenedModal />
    </BrowserRouter>
  );

describe('DropOpenedModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('não renderiza nada se o usuário não estiver logado', async () => {
    getAccessToken.mockReturnValue(null);
    renderModal();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(getUnseenOpenDrops).not.toHaveBeenCalled();
  });

  it('não renderiza nada se não houver drops não vistos', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([]);
    renderModal();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renderiza o modal quando há drops não vistos para usuário logado', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('O Drop abriu! 🎉')).toBeInTheDocument();
    expect(screen.getByText(/Drop Verão/)).toBeInTheDocument();
  });

  it('trava o scroll do body ao abrir', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('fecha o modal ao clicar em Fechar e chama markWaitlistEntrySeen', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    act(() => {
      fireEvent.click(screen.getByLabelText('Fechar'));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(markWaitlistEntrySeen).toHaveBeenCalledWith('entry-uuid-1');
  });

  it('fecha o modal ao pressionar Esc', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('fecha o modal ao clicar no backdrop', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    const { container } = renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    act(() => {
      fireEvent.click(container.querySelector('.fixed.inset-0'));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('não fecha ao clicar dentro do conteúdo do modal', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    act(() => {
      fireEvent.click(screen.getByRole('dialog'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('avança para o próximo drop e marca o atual como visto', async () => {
    getAccessToken.mockReturnValue('valid-token');
    const entries = [
      fakeDrop({ id: 'entry-1', drop: { id: 'd1', name: 'Drop A', slug: 'drop-a', launch_date: null } }),
      fakeDrop({ id: 'entry-2', drop: { id: 'd2', name: 'Drop B', slug: 'drop-b', launch_date: null } }),
    ];
    getUnseenOpenDrops.mockResolvedValue(entries);
    renderModal();

    await waitFor(() => screen.getByText(/Drop A/));
    // Mostra "1 de 2"
    expect(screen.getByText('1 de 2')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByLabelText('Fechar'));
    });

    await waitFor(() => screen.getByText(/Drop B/));
    expect(markWaitlistEntrySeen).toHaveBeenCalledWith('entry-1');
    expect(screen.getByText('2 de 2')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByLabelText('Fechar'));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(markWaitlistEntrySeen).toHaveBeenCalledWith('entry-2');
  });

  it('o link "Ver o Drop" aponta para /drop/<slug>', async () => {
    getAccessToken.mockReturnValue('valid-token');
    getUnseenOpenDrops.mockResolvedValue([fakeDrop()]);
    renderModal();
    await waitFor(() => screen.getByRole('dialog'));

    const link = screen.getByRole('link', { name: /Ver o Drop/i });
    expect(link.getAttribute('href')).toBe('/drop/drop-verao');
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import DropsPage from './index';

const { useApiMock } = vi.hoisted(() => ({
  useApiMock: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
}));

vi.mock('../../../hooks/useApi', () => ({ useApi: useApiMock }));

const drop = {
  id: 'd1', name: 'Drop Genesis', slug: 'genesis', launch_date: '2026-01-10T00:00:00Z',
  is_active: true, is_public: true, products: [{ id: 'p1' }],
};

const setup = () => {
  useApiMock.mockImplementation((url) => ({
    data: url === '/api/catalog/drops/' ? [drop] : [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }));
  return render(<MemoryRouter><DropsPage /></MemoryRouter>);
};

const openMenuItem = (name) => {
  const trigger = screen.getByRole('button', { name: 'Ações para Drop Genesis' });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('menuitem', { name }));
  return trigger;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DropsPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><DropsPage /></MemoryRouter>);
    expect(screen.getByText(/DropsPage/i)).toBeInTheDocument();
  });

  it('busca tem nome acessível', () => {
    setup();
    expect(screen.getByRole('searchbox', { name: 'Buscar drops' })).toBeInTheDocument();
  });

  it('excluir abre um diálogo; Esc fecha e devolve o foco ao menu', () => {
    setup();
    const trigger = openMenuItem('Excluir drop');
    expect(screen.getByRole('dialog', { name: 'Excluir drop' })).toHaveAccessibleDescription(/permanente/);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('depois de excluir, o foco vai para o aviso do resultado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
    setup();
    openMenuItem('Excluir drop');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));

    // Tempo maior: com a suíte inteira rodando em paralelo o fetch simulado demora mais.
    const notice = await screen.findByRole('status', {}, { timeout: 4000 });
    expect(notice).toHaveTextContent('Drop Drop Genesis excluído.');
    await waitFor(() => expect(notice).toHaveFocus());
  });

  it('campos do modal de duplicar têm rótulo e o erro fica dentro dele', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    setup();
    openMenuItem('Duplicar drop');
    const dialog = screen.getByRole('dialog', { name: 'Duplicar drop' });
    expect(within(dialog).getByLabelText('Nome do drop')).toHaveValue('Drop Genesis');
    expect(within(dialog).getByLabelText('Data de lançamento')).toHaveValue('2026-01-10');
    expect(within(dialog).getByLabelText('Status')).toHaveValue('false');
    expect(within(dialog).getByRole('group', { name: 'O que duplicar' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Duplicar drop' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Falha ao duplicar o drop.');
  });

  it('lista e modal sem violações de acessibilidade', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
    openMenuItem('Duplicar drop');
    expect(await axe(container)).toHaveNoViolations();
  });
});

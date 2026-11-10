import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from './index';

const { useApiMock } = vi.hoisted(() => ({
  useApiMock: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
}));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProductsPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><ProductsPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('mostra os motivos da troca no histórico de estoque', async () => {
    const product = {
      id: 'p1',
      name: 'Camiseta',
      is_active: true,
      images: [],
      variations: [{ id: 'g', size: 'G', color: 'Preto', sku: 'CAM-G', stock_quantity: 3 }],
    };
    useApiMock.mockImplementation((url) => ({
      data: url === '/api/catalog/products/p1/' ? product : [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    }));
    const movement = (id, kind, reason, note) => ({
      id, kind, reason, note, quantity: 1, balance_after: 3, is_legacy: false,
      origin_type: 'EXCHANGE', origin_id: 'ei1', created_at: '2026-10-26T10:00:00Z',
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: async () => [
        movement('m1', 'SAIDA', 'TROCA', 'Reserva da reposição da troca'),
        movement('m2', 'ENTRADA', 'DEVOLUCAO', 'Peça devolvida na troca'),
      ],
    })));

    render(<MemoryRouter initialEntries={['/admin/stock/p1']}><ProductsPage /></MemoryRouter>);

    const reservation = (await screen.findByText('Reserva da reposição da troca')).parentElement;
    expect(within(reservation).getByText('Troca')).toBeInTheDocument();
    expect(within(reservation).queryByText('TROCA')).not.toBeInTheDocument();
    const returned = screen.getByText('Peça devolvida na troca').parentElement;
    expect(within(returned).getByText('Devolução')).toBeInTheDocument();
  });
});

describe('ProductsPage — acessibilidade (#64, área 6)', () => {
  const product = {
    id: 'p1',
    name: 'Camiseta',
    base_price: '99.90',
    effective_price: '99.90',
    cost_price: '40.00',
    is_active: true,
    drop: null,
    images: [],
    variations: [{ id: 'g', size: 'G', color: 'Preto', sku: 'CAM-G', stock_quantity: 3 }],
  };
  const refetch = vi.fn();

  const setup = (path = '/admin/products') => {
    useApiMock.mockImplementation((url) => ({
      data: url === '/api/catalog/products/' ? [product] : url === '/api/catalog/products/p1/' ? product : [],
      loading: false,
      error: null,
      refetch,
    }));
    return render(<MemoryRouter initialEntries={[path]}><ProductsPage /></MemoryRouter>);
  };

  const openMenuItem = (name) => {
    const [trigger] = screen.getAllByRole('button', { name: 'Ações para Camiseta' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name }));
    return trigger;
  };

  it('mostra cada produto como card com drop, preço e estoque (celular)', () => {
    setup();
    const card = within(screen.getByRole('list', { name: 'Produtos' })).getByRole('listitem');
    expect(within(card).getByText('Camiseta')).toBeInTheDocument();
    expect(within(card).getByText('Sem drop')).toBeInTheDocument();
    expect(within(card).getByText('R$ 99.90')).toBeInTheDocument();
    expect(within(card).getByText('3 UN.')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Ações para Camiseta' })).toBeInTheDocument();
  });

  it('busca tem nome acessível', () => {
    setup();
    expect(screen.getByRole('searchbox', { name: 'Buscar produtos' })).toBeInTheDocument();
  });

  it('modal de excluir é um diálogo: Esc fecha e devolve o foco ao menu', () => {
    setup();
    const trigger = openMenuItem('Excluir produto');
    const dialog = screen.getByRole('dialog', { name: 'Excluir produto' });
    expect(dialog).toHaveAccessibleDescription(/permanente/);
    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('depois de excluir, o foco vai para o aviso do resultado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
    setup();
    openMenuItem('Excluir produto');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));

    // Tempo maior: com a suíte inteira rodando em paralelo o fetch simulado demora mais.
    const notice = await screen.findByRole('status', {}, { timeout: 4000 });
    expect(notice).toHaveTextContent('Produto Camiseta excluído.');
    await waitFor(() => expect(notice).toHaveFocus());
  });

  it('erro ao duplicar aparece dentro do modal, que continua aberto', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: async () => ({ detail: 'SKU repetido.' }) })));
    setup();
    openMenuItem('Duplicar produto');
    const dialog = screen.getByRole('dialog', { name: 'Duplicar Produto' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Duplicar Produto' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('SKU repetido.');
    expect(screen.getByRole('dialog', { name: 'Duplicar Produto' })).toBeInTheDocument();
  });

  it('no celular o drawer de detalhes é um modal com título', () => {
    setup('/admin/products/p1');
    const dialog = screen.getByRole('dialog', { name: 'Detalhes do Produto' });
    expect(dialog).toHaveFocus();
    // X do cabeçalho e o botão do rodapé.
    expect(within(dialog).getAllByRole('button', { name: 'Fechar' })).toHaveLength(2);
  });

  it('"Editar produto" leva para a página de edição completa', () => {
    setup();
    const [trigger] = screen.getAllByRole('button', { name: 'Ações para Camiseta' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Editar produto' })).toHaveAttribute('href', '/admin/edit-product/p1');
  });

  it('na rota de edição a lista não abre mais o drawer antigo', () => {
    // /admin/edit-product/:id agora é a EditProductPage (rota própria).
    setup('/admin/edit-product/p1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Entrada/Saída do estoque anunciam qual está escolhido', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })));
    setup('/admin/stock/p1');
    const entrada = screen.getByRole('button', { name: '+ Entrada' });
    const saida = screen.getByRole('button', { name: '− Saída' });
    expect(entrada).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(saida);
    expect(saida).toHaveAttribute('aria-pressed', 'true');
    expect(entrada).toHaveAttribute('aria-pressed', 'false');
  });

  it('lista sem violações de acessibilidade', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});

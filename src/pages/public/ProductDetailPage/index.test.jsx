import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ProductDetailPage from './index';
import { getAccessToken } from '../../../lib/authToken';
import { createStockAlert, getPendingStockAlertVariationIds } from '../../../lib/stockAlertsApi';

vi.mock('../../../lib/authToken', () => ({ getAccessToken: vi.fn() }));
vi.mock('../../../lib/stockAlertsApi', () => ({
  createStockAlert: vi.fn(),
  getPendingStockAlertVariationIds: vi.fn(),
  stockAlertErrorMessage: (e) => e?.response?.data?.variation_id?.[0] ?? 'Não foi possível registrar o aviso.',
}));

vi.mock('../../../components/layout/public/PublicLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

vi.mock('../../../components/reviews/ProductReviews', () => ({
  default: ({ productId }) => <div data-testid="product-reviews">{productId}</div>,
}));

const product = (id) => ({
  id, name: `Produto ${id}`, base_price: '100.00', images: [], variations: [],
});
const response = (data) => ({ ok: true, json: async () => data });
const recommendations = (ids) => response({
  count: 30, next: '?page=2', previous: null, results: ids.map(product),
});
const section = () => within(screen.getByRole('heading', { name: 'Recomendações para você' }).closest('section'));
const mount = () => {
  const router = createMemoryRouter([
    { path: '/product/:id', element: <ProductDetailPage /> },
    { path: '/login', element: <div>Tela de login</div> },
  ], { initialEntries: ['/product/1'] });
  return { router, ...render(<RouterProvider router={router} />) };
};

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockReturnValue('token');
  getPendingStockAlertVariationIds.mockResolvedValue([]);
  vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve(
    url.includes('/recommendations/') ? recommendations([25, 9, 3, 12]) : response(product('1')),
  )));
});
afterEach(() => vi.unstubAllGlobals());

describe('ProductDetailPage', () => {
  it('consulta recomendações específicas e renderiza os resultados na ordem recebida', async () => {
    mount();
    expect(screen.getByText('Carregando produto...')).toBeInTheDocument();
    await screen.findByText('Produto 25');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/catalog\/products\/1\/$/);
    expect(fetch.mock.calls[1][0]).toMatch(/\/api\/catalog\/products\/1\/recommendations\/\?page_size=4$/);
    expect(section().getAllByRole('heading', { level: 3 }).map((node) => node.textContent))
      .toEqual(['Produto 25', 'Produto 9', 'Produto 3', 'Produto 12']);
    expect(section().getAllByRole('link').map((node) => node.getAttribute('href')))
      .toEqual(['/product/25', '/product/9', '/product/3', '/product/12']);
  });

  it('exibe recomendações vazias sem consultar o catálogo nem seguir next', async () => {
    fetch.mockImplementation((url) => Promise.resolve(
      url.includes('/recommendations/') ? recommendations([]) : response(product('1')),
    ));
    mount();
    expect(await screen.findByText('Nenhuma recomendação disponível no momento.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produto 1' })).toBeInTheDocument();
    expect(section().queryByRole('alert')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['http', 'network'])('preserva o detalhe quando as recomendações falham por %s', async (failure) => {
    fetch.mockImplementation((url) => {
      if (!url.includes('/recommendations/')) return Promise.resolve(response(product('1')));
      return failure === 'http'
        ? Promise.resolve({ ok: false })
        : Promise.reject(new Error('Offline'));
    });
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as recomendações.');
    expect(screen.getByRole('heading', { name: 'Produto 1' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma recomendação disponível no momento.')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('carrega o detalhe sem aguardar as recomendações', async () => {
    let resolveRecommendations;
    fetch.mockImplementation((url) => url.includes('/recommendations/')
      ? new Promise((resolve) => { resolveRecommendations = resolve; })
      : Promise.resolve(response(product('1'))));
    mount();
    await screen.findByRole('heading', { name: 'Produto 1' });
    expect(section().getByRole('status')).toHaveTextContent('Carregando recomendações...');
    await act(async () => resolveRecommendations(recommendations([25])));
    expect(section().getByText('Produto 25')).toBeInTheDocument();
  });

  it('limpa as recomendações anteriores e refaz a consulta ao trocar de produto', async () => {
    const { router } = mount();
    await screen.findByText('Produto 25');
    let resolveRecommendations;
    fetch.mockImplementation((url) => url.includes('/recommendations/')
      ? new Promise((resolve) => { resolveRecommendations = resolve; })
      : Promise.resolve(response(product('2'))));
    await act(async () => router.navigate('/product/2'));
    await screen.findByRole('heading', { name: 'Produto 2' });
    expect(screen.queryByText('Produto 25')).not.toBeInTheDocument();
    expect(section().getByRole('status')).toBeInTheDocument();
    expect(fetch.mock.calls[3][0]).toMatch(/\/products\/2\/recommendations\/\?page_size=4$/);
    await act(async () => resolveRecommendations(recommendations([40])));
    expect(section().getByText('Produto 40')).toBeInTheDocument();
  });

  it.each(['success', 'failure'])('ignora respostas antigas de detalhe e recomendações: %s', async (outcome) => {
    const pending = [];
    fetch.mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
    const { router } = mount();
    const oldRequests = fetch.mock.calls.slice();
    fetch.mockImplementation((url) => Promise.resolve(
      url.includes('/recommendations/') ? recommendations([40]) : response(product('2')),
    ));
    await act(async () => router.navigate('/product/2'));
    await screen.findByText('Produto 40');
    oldRequests.forEach(([, options]) => expect(options.signal.aborted).toBe(true));
    await act(async () => {
      if (outcome === 'success') {
        pending[0].resolve(response(product('1')));
        pending[1].resolve(recommendations([25]));
      } else {
        pending.forEach(({ reject }) => reject(new Error('Offline')));
      }
    });
    expect(screen.getByRole('heading', { name: 'Produto 2' })).toBeInTheDocument();
    expect(section().getByText('Produto 40')).toBeInTheDocument();
    expect(screen.queryByText('Produto 25')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Produto não encontrado.')).not.toBeInTheDocument();
  });

  it('cancela as duas requisições ao sair da página', () => {
    fetch.mockImplementation(() => new Promise(() => {}));
    const { unmount } = mount();
    unmount();
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mock.calls.forEach(([, options]) => expect(options.signal.aborted).toBe(true));
  });

  it('mostra a nota das recomendações avaliadas', async () => {
    fetch.mockImplementation((url) => Promise.resolve(url.includes('/recommendations/')
      ? response({ count: 1, next: null, previous: null, results: [{ ...product(25), rating_avg: '4.00', rating_count: 2 }] })
      : response(product('1'))));
    mount();
    await screen.findByText('Produto 25');
    expect(section().getByRole('img', { name: 'Nota 4,0 de 5' })).toBeInTheDocument();
  });

  it('mostra produto não encontrado quando o detalhe retorna 404', async () => {
    fetch.mockImplementation((url) => Promise.resolve(
      url.includes('/recommendations/') ? recommendations([]) : { ok: false, status: 404 },
    ));
    mount();
    expect(await screen.findByText('Produto não encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recomendações para você' })).not.toBeInTheDocument();
  });

  it('mostra a nota no topo e monta a seção de avaliações do produto', async () => {
    fetch.mockImplementation((url) => Promise.resolve(url.includes('/recommendations/')
      ? recommendations([])
      : response({ ...product('1'), rating_avg: '4.50', rating_count: 8 })));
    mount();
    expect(await screen.findByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText('4,5 (8)')).toBeInTheDocument();
    expect(screen.getByTestId('product-reviews')).toHaveTextContent('1');
  });

  it('não mostra estrelas no topo sem avaliações', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Produto 1' });
    await screen.findByText('Produto 25');
    expect(screen.queryByRole('img', { name: /^Nota/ })).not.toBeInTheDocument();
  });

  describe('Tabela de medidas', () => {
    const sizeGuide = {
      id: 'g1',
      name: 'Parte de baixo',
      columns: [{ key: 'waist', label: 'Cintura' }],
      rows: [
        { size: 'P', measures: { waist: [74, 80] } },
        { size: 'M', measures: { waist: [80, 86] } },
      ],
    };
    const withGuide = (extra = {}) => ({
      ...product('1'),
      is_sellable: true,
      variations: [{ id: 'vM', size: 'M', color: '', stock_quantity: 2 }],
      size_guide: sizeGuide,
      ...extra,
    });
    const mountWith = (data) => {
      fetch.mockImplementation((url) => Promise.resolve(
        url.includes('/recommendations/') ? recommendations([]) : response(data),
      ));
      return mount();
    };

    it('mostra a tabela na página e sugere o tamanho', async () => {
      mountWith(withGuide());
      const table = within(await screen.findByRole('region', { name: 'Tabela de medidas' }));
      expect(table.getByRole('rowheader', { name: 'M' })).toBeInTheDocument();
      expect(table.getByRole('cell', { name: '80–86' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Tabela de medidas' })).toHaveAttribute('href', '#tabela-de-medidas');

      fireEvent.change(table.getByLabelText('Sua medida (cm)'), { target: { value: '82' } });
      expect(table.getByRole('status')).toHaveTextContent('Seu tamanho é M.');

      fireEvent.change(table.getByLabelText('Sua medida (cm)'), { target: { value: '50' } });
      expect(table.getByRole('status')).toHaveTextContent('menor que a do tamanho P');
    });

    it('sem guia na categoria não mostra a tabela', async () => {
      mountWith(withGuide({ size_guide: null }));
      await screen.findByRole('button', { name: /^M/ });
      expect(screen.queryByRole('region', { name: 'Tabela de medidas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Tabela de medidas' })).not.toBeInTheDocument();
    });
  });

  describe('Avise-me quando chegar', () => {
    const withVariations = (extra = {}) => ({
      ...product('1'),
      is_sellable: true,
      variations: [
        { id: 'vM', size: 'M', color: '', stock_quantity: 0 },
        { id: 'vG', size: 'G', color: '', stock_quantity: 2 },
      ],
      ...extra,
    });
    const mountWith = (data) => {
      fetch.mockImplementation((url) => Promise.resolve(
        url.includes('/recommendations/') ? recommendations([]) : response(data),
      ));
      return mount();
    };
    const pickM = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^M/ }));
    };

    it('variação esgotada pode ser escolhida e mostra Avise-me quando chegar', async () => {
      mountWith(withVariations());
      const button = await screen.findByRole('button', { name: /^M/ });
      expect(button).not.toBeDisabled();
      fireEvent.click(button);
      expect(screen.getByRole('button', { name: 'Avise-me quando chegar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Adicionar ao Carrinho' })).not.toBeInTheDocument();
      expect(screen.queryByText('−')).not.toBeInTheDocument();
    });

    it('cliente logado pede aviso e vê Você já será avisado', async () => {
      createStockAlert.mockResolvedValue({ alreadyPending: false, alert: { id: 'a1' } });
      mountWith(withVariations());
      await pickM();
      fireEvent.click(screen.getByRole('button', { name: 'Avise-me quando chegar' }));
      expect(await screen.findByText('Você já será avisado')).toBeInTheDocument();
      expect(createStockAlert).toHaveBeenCalledWith('vM');
      expect(screen.getByRole('link', { name: /Avisos|meus avisos/i })).toHaveAttribute('href', '/my-stock-alerts');
    });

    it('mostra a mensagem de erro da API ao pedir o aviso', async () => {
      createStockAlert.mockRejectedValue({ response: { data: { variation_id: ['Este tamanho está disponível.'] } } });
      mountWith(withVariations());
      await pickM();
      fireEvent.click(screen.getByRole('button', { name: 'Avise-me quando chegar' }));
      expect(await screen.findByText('Este tamanho está disponível.')).toBeInTheDocument();
    });

    it('variação com aviso pendente já abre como Você já será avisado', async () => {
      getPendingStockAlertVariationIds.mockResolvedValue(['vM']);
      mountWith(withVariations());
      await pickM();
      expect(await screen.findByText('Você já será avisado')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /avisos/i })).toHaveAttribute('href', '/my-stock-alerts');
      expect(screen.queryByRole('button', { name: 'Avise-me quando chegar' })).not.toBeInTheDocument();
    });

    it('visitante vai para o login com retorno ao produto', async () => {
      getAccessToken.mockReturnValue(null);
      const { router } = mountWith(withVariations());
      await pickM();
      fireEvent.click(screen.getByRole('button', { name: 'Avise-me quando chegar' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(router.state.location.state.from.pathname).toBe('/product/1');
      expect(createStockAlert).not.toHaveBeenCalled();
      expect(getPendingStockAlertVariationIds).not.toHaveBeenCalled();
    });

    it('sessão expirada (user sem token) vai para o login', async () => {
      getAccessToken.mockReturnValue(null);
      const { router } = mountWith(withVariations());
      await pickM();
      fireEvent.click(screen.getByRole('button', { name: 'Avise-me quando chegar' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(createStockAlert).not.toHaveBeenCalled();
    });

    it('401 ao pedir aviso vai para o login', async () => {
      createStockAlert.mockRejectedValue({ response: { status: 401, data: { detail: 'Authentication credentials were not provided.' } } });
      const { router } = mountWith(withVariations());
      await pickM();
      fireEvent.click(screen.getByRole('button', { name: 'Avise-me quando chegar' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(router.state.location.state.from.pathname).toBe('/product/1');
    });

    it('produto não vendável continua Indisponível sem aviso', async () => {
      mountWith(withVariations({ is_sellable: false }));
      await pickM();
      expect(screen.getByRole('button', { name: 'Indisponível' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Avise-me quando chegar' })).not.toBeInTheDocument();
    });

    it('variação com estoque continua com Adicionar ao Carrinho', async () => {
      mountWith(withVariations());
      fireEvent.click(await screen.findByRole('button', { name: /^G/ }));
      expect(screen.getByRole('button', { name: 'Adicionar ao Carrinho' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Avise-me quando chegar' })).not.toBeInTheDocument();
    });
  });
});

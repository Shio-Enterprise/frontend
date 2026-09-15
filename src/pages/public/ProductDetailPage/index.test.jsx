import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ProductDetailPage from './index';

vi.mock('../../../components/layout/public/PublicLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
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
  ], { initialEntries: ['/product/1'] });
  return { router, ...render(<RouterProvider router={router} />) };
};

beforeEach(() => {
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

  it('mostra produto não encontrado quando o detalhe retorna 404', async () => {
    fetch.mockImplementation((url) => Promise.resolve(
      url.includes('/recommendations/') ? recommendations([]) : { ok: false, status: 404 },
    ));
    mount();
    expect(await screen.findByText('Produto não encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recomendações para você' })).not.toBeInTheDocument();
  });
});

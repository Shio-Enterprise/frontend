import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './index';

vi.mock('../../../components/layout/public/PublicLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

const product = (id) => ({ id, name: `Produto ${id}`, base_price: '100.00', images: [] });
const response = (ids) => ({
  ok: true,
  json: async () => ({ count: 30, next: 'page=2', previous: null, results: ids.map(product) }),
});
const mount = () => render(<MemoryRouter><HomePage /></MemoryRouter>);
const section = (name) => within(screen.getByRole('heading', { name }).closest('section'));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve(
    response(url.includes('-sales_count') ? [25, 3, 9, 1] : [30, 29, 28, 27]),
  )));
});
afterEach(() => vi.unstubAllGlobals());

describe('HomePage', () => {
  it('consulta quatro lançamentos e quatro mais vendidos e preserva a ordem do servidor', async () => {
    mount();
    await screen.findByText('Produto 25');
    expect(fetch).toHaveBeenCalledTimes(2);
    const queries = fetch.mock.calls.map(([url]) => new URL(url, 'http://localhost').searchParams);
    expect(queries.map((query) => query.get('ordering'))).toEqual(['-created_at', '-sales_count']);
    queries.forEach((query) => expect(query.get('page_size')).toBe('4'));
    expect(section('Lançamentos').getAllByRole('heading', { level: 3 }).map((node) => node.textContent))
      .toEqual(['Produto 30', 'Produto 29', 'Produto 28', 'Produto 27']);
    expect(section('Mais vendidos').getAllByRole('heading', { level: 3 }).map((node) => node.textContent))
      .toEqual(['Produto 25', 'Produto 3', 'Produto 9', 'Produto 1']);
    expect(section('Mais vendidos').getByRole('link', { name: /ver todos/i }))
      .toHaveAttribute('href', '/category/all?ordering=-sales_count');
  });

  it('permite o mesmo produto em lançamentos e mais vendidos', async () => {
    fetch.mockResolvedValue(response([1]));
    mount();
    expect(await screen.findAllByText('Produto 1')).toHaveLength(2);
  });

  it.each(['http', 'network'])('preserva lançamentos quando o ranking falha por %s', async (failure) => {
    fetch.mockImplementation((url) => {
      if (!url.includes('-sales_count')) return Promise.resolve(response([30]));
      return failure === 'http'
        ? Promise.resolve({ ok: false })
        : Promise.reject(new Error('Offline'));
    });
    mount();
    await screen.findByRole('alert');
    expect(section('Lançamentos').getByText('Produto 30')).toBeInTheDocument();
    expect(section('Mais vendidos').getByRole('alert')).toHaveTextContent('Não foi possível');
    expect(screen.queryByText('Nenhum produto disponível.')).not.toBeInTheDocument();
  });

  it('exibe resultados vazios sem carregar outras páginas do catálogo', async () => {
    fetch.mockResolvedValue(response([]));
    mount();
    expect(await screen.findAllByText('Nenhum produto disponível.')).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('carrega as seções independentemente e ignora respostas depois de sair', async () => {
    let resolveRanking;
    fetch.mockImplementation((url) => url.includes('-sales_count')
      ? new Promise((resolve) => { resolveRanking = resolve; })
      : Promise.resolve(response([30])));
    const view = mount();
    await screen.findByText('Produto 30');
    expect(section('Mais vendidos').getByText('Carregando...')).toBeInTheDocument();
    const resolveOld = resolveRanking;
    view.unmount();
    fetch.mock.calls.forEach(([, options]) => expect(options.signal.aborted).toBe(true));
    mount();
    await act(async () => resolveRanking(response([25])));
    await act(async () => resolveOld(response([1])));
    expect(section('Mais vendidos').getByText('Produto 25')).toBeInTheDocument();
    expect(screen.queryByText('Produto 1')).not.toBeInTheDocument();
  });
});

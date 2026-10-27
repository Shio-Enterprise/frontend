import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DropPage from './index';

vi.mock('../../../components/layout/public/PublicLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

const baseDrop = (overrides = {}) => ({
  id: 'drop-1',
  name: 'Coleção Inverno',
  slug: 'colecao-inverno',
  description: 'Peças limitadas de inverno.',
  banner: 'https://cdn.exemplo.com/banner.jpg',
  launch_date: null,
  end_date: null,
  max_quantity: null,
  remaining_quantity: null,
  sold_quantity: 0,
  is_active: true,
  is_visible: true,
  is_sellable: true,
  products: [],
  ...overrides,
});

const product = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Jaqueta',
  base_price: '200.00',
  is_promotion_active: false,
  is_sellable: true,
  images: [],
  variations: [],
  ...overrides,
});

const jsonResponse = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

const mount = (slug = 'colecao-inverno') => {
  const router = createMemoryRouter(
    [{ path: '/drop/:slug', element: <DropPage /> }],
    { initialEntries: [`/drop/${slug}`] },
  );
  return render(<RouterProvider router={router} />);
};

describe('DropPage', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('mostra o estado de carregamento e depois o drop', async () => {
    fetchMock.mockReturnValue(jsonResponse(baseDrop()));

    mount();

    expect(screen.getByText('Carregando drop...')).toBeInTheDocument();
    expect(await screen.findByText('Coleção Inverno')).toBeInTheDocument();
    expect(screen.getByText('Peças limitadas de inverno.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/catalog/drops/slug/colecao-inverno/'),
    );
  });

  it('mostra "não encontrado" quando o backend responde 404', async () => {
    fetchMock.mockReturnValue(jsonResponse({ error: 'Drop não encontrado.' }, 404));

    mount('nao-existe');

    expect(await screen.findByText('Drop não encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar à loja' })).toHaveAttribute('href', '/');
  });

  it('antes do lançamento, mostra "Em breve" e a contagem até o lançamento', async () => {
    const launch = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    fetchMock.mockReturnValue(jsonResponse(baseDrop({ launch_date: launch, is_active: true })));

    mount();

    expect(await screen.findByText('Em breve')).toBeInTheDocument();
    expect(screen.getByText('Lançamento em')).toBeInTheDocument();
    expect(screen.getByText('dias')).toBeInTheDocument();
    expect(screen.queryByText('Encerrado')).not.toBeInTheDocument();
  });

  it('durante o drop, mostra o contador de restantes e a contagem até o fim', async () => {
    const end = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    fetchMock.mockReturnValue(
      jsonResponse(baseDrop({ end_date: end, max_quantity: 50, remaining_quantity: 12 })),
    );

    mount();

    expect(await screen.findByText('12 de 50 restantes')).toBeInTheDocument();
    expect(screen.getByText('Termina em')).toBeInTheDocument();
  });

  it('depois do fim, mostra "Encerrado" e nenhuma contagem', async () => {
    const end = new Date(Date.now() - 1000).toISOString();
    fetchMock.mockReturnValue(jsonResponse(baseDrop({ end_date: end })));

    mount();

    expect(await screen.findByText('Encerrado')).toBeInTheDocument();
    expect(screen.queryByText('Termina em')).not.toBeInTheDocument();
    expect(screen.queryByText('Lançamento em')).not.toBeInTheDocument();
  });

  it('mostra "Esgotado" quando restam zero unidades e o drop ainda está no ar', async () => {
    fetchMock.mockReturnValue(
      jsonResponse(baseDrop({ max_quantity: 10, remaining_quantity: 0 })),
    );

    mount();

    expect(await screen.findByText('Esgotado')).toBeInTheDocument();
  });

  it('renderiza os produtos do drop, marcando os indisponíveis', async () => {
    fetchMock.mockReturnValue(
      jsonResponse(
        baseDrop({
          products: [
            product({ id: 'p1', name: 'Jaqueta' }),
            product({ id: 'p2', name: 'Boné', is_sellable: false }),
          ],
        }),
      ),
    );

    mount();

    expect(await screen.findByText('Jaqueta')).toBeInTheDocument();
    expect(screen.getByText('Boné')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });

  it('sem produtos, mostra o aviso de drop ainda vazio', async () => {
    fetchMock.mockReturnValue(jsonResponse(baseDrop({ products: [] })));

    mount();

    expect(await screen.findByText('Nenhum produto publicado neste drop ainda.')).toBeInTheDocument();
  });
});

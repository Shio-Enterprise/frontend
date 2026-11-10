import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditProductPage from './index';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({ useApi: useApiMock }));
vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'test-token' }));

const product = {
  id: 'p1',
  name: 'Camiseta Shio',
  description: 'Algodão',
  base_price: '120.00',
  cost_price: '50.00',
  promotional_price: null,
  promo_start: null,
  promo_end: null,
  is_active: true,
  drop: { id: 'd1', name: 'Drop Verão' },
  category: { id: 'c1', name: 'Camisetas' },
  images: [{ id: 'i1', image: 'http://img/1.png' }],
  variations: [
    { id: 'vp', size: 'P', color: '', stock_quantity: 0, is_active: false },
    { id: 'vg', size: 'G', color: 'Preto', stock_quantity: 3, is_active: true },
  ],
};

const apiData = {
  '/api/catalog/products/p1/': product,
  '/api/catalog/drops/': [{ id: 'd1', name: 'Drop Verão' }, { id: 'd2', name: 'Drop Inverno' }],
  '/api/catalog/categories/': [{ id: 'c1', name: 'Camisetas' }],
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/edit-product/p1']}>
    <Routes>
      <Route path="/admin/edit-product/:id" element={<EditProductPage />} />
      <Route path="/admin/products/:id" element={<p>Detalhe do produto</p>} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  useApiMock.mockImplementation((url) => ({ data: apiData[url] ?? null, loading: false, error: null, refetch: vi.fn() }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EditProductPage', () => {
  it('abre com os mesmos campos da criação, já preenchidos', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Editar Produto' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Camiseta Shio');
    expect(screen.getByRole('spinbutton', { name: 'Preço (R$)' })).toHaveValue(120);
    expect(screen.getByLabelText('Custo unitário')).toHaveValue(50);
    expect(screen.getByRole('combobox', { name: 'Drop (Coleção)' })).toHaveValue('d1');
    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveValue('c1');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('true');
    expect(screen.getByRole('textbox', { name: 'Descrição (Opcional)' })).toHaveValue('Algodão');
  });

  it('mostra a promoção atual no horário de Brasília', () => {
    useApiMock.mockImplementation((url) => ({
      data: url === '/api/catalog/products/p1/'
        ? { ...product, promotional_price: '99.90', promo_start: '2026-12-01T13:00:00Z', promo_end: '2026-12-10T13:00:00Z' }
        : apiData[url] ?? null,
      loading: false, error: null, refetch: vi.fn(),
    }));
    renderPage();
    expect(screen.getByLabelText('Preço promocional')).toHaveValue(99.9);
    expect(screen.getByLabelText('Início da promoção')).toHaveValue('2026-12-01T10:00');
    expect(screen.getByLabelText('Fim da promoção')).toHaveValue('2026-12-10T10:00');
  });

  it('marca o tamanho inativo na lista de tamanhos', () => {
    renderPage();
    expect(screen.getByText('P — 0 un. (inativo)')).toBeInTheDocument();
    expect(screen.getByText('G / Preto — 3 un.')).toBeInTheDocument();
  });

  it('salva com PUT os dados alterados e volta para o detalhe do produto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => product });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome do produto' }), { target: { value: 'Camiseta Nova' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Drop (Coleção)' }), { target: { value: 'd2' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'false' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Detalhe do produto')).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/catalog\/products\/p1\/$/);
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Camiseta Nova',
      description: 'Algodão',
      base_price: '120.00',
      cost_price: '50.00',
      promotional_price: null,
      promo_start: null,
      promo_end: null,
      drop: 'd2',
      category: 'c1',
      is_active: false,
    });
  });

  it('mostra na tela o motivo do erro do backend e continua na página', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Dados inválidos.', details: { promotional_price: ['Deve ser positivo e inferior ao preço base.'] } }),
    }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('promotional_price: Deve ser positivo e inferior ao preço base.');
    expect(screen.getByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Camiseta Shio');
  });

  it('não envia duas vezes com clique duplo', async () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const save = screen.getByRole('button', { name: 'Salvar alterações' });
    fireEvent.click(save);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvando...' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('formulário sem violações de acessibilidade', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});

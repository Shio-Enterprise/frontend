import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditProductPage from './index';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({ useApi: useApiMock, useApiAll: useApiMock }));
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

  it('mostra os tamanhos com a quantidade atual; o inativo só pode ser reativado', () => {
    renderPage();
    expect(screen.getByRole('spinbutton', { name: 'Quantidade final de G / Preto' })).toHaveValue(3);
    expect(screen.getByText('Atual: 3 un. · sem mudança')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Quantidade final de P' })).not.toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar tamanho P' })).toBeInTheDocument();
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
      size_guide: null,
      is_active: false,
    });
  });

  describe('guia de medidas (#55)', () => {
    const guides = [
      { id: 'g-normal', name: 'Camiseta normal' },
      { id: 'g-over', name: 'Camiseta oversized' },
    ];

    const setup = (overrides) => {
      useApiMock.mockImplementation((url) => ({
        data: url === '/api/catalog/products/p1/'
          ? { ...product, ...overrides }
          : url === '/api/catalog/size-guides/' ? guides : apiData[url] ?? null,
        loading: false, error: null, refetch: vi.fn(),
      }));
      renderPage();
      return screen.getByRole('combobox', { name: 'Guia de medidas' });
    };

    it('produto sem guia próprio não aparece com o guia da categoria selecionado', () => {
      // size_guide já vem com o fallback da categoria; o select precisa ler own_size_guide.
      const select = setup({ size_guide: guides[0], own_size_guide: null });
      expect(select).toHaveValue('');
      expect(select).toHaveAccessibleDescription('Escolha um guia só se este produto tiver uma modelagem diferente da categoria.');
    });

    it('mostra o guia próprio e envia a troca ao salvar', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }));
      vi.stubGlobal('fetch', fetchMock);
      const select = setup({ size_guide: guides[0], own_size_guide: 'g-normal' });
      expect(select).toHaveValue('g-normal');
      fireEvent.change(select, { target: { value: 'g-over' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).size_guide).toBe('g-over');
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

describe('EditProductPage — imagens', () => {
  const twoImages = { ...product, images: [{ id: 'i1', image: 'http://img/1.png' }, { id: 'i2', image: 'http://img/2.png' }] };
  const fileInputs = (container) => container.querySelectorAll('input[type=file]');
  const imageNames = () => screen.getAllByRole('img').map((img) => img.getAttribute('alt'));

  beforeEach(() => {
    let n = 0;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:img${n++}`);
    globalThis.URL.revokeObjectURL = vi.fn();
    useApiMock.mockImplementation((url) => ({
      data: url === '/api/catalog/products/p1/' ? twoImages : apiData[url] ?? null,
      loading: false, error: null, refetch: vi.fn(),
    }));
  });

  it('lista as imagens atuais, com a primeira como principal', () => {
    renderPage();
    expect(imageNames()).toEqual(['Imagem 1 (principal)', 'Imagem 2']);
    expect(screen.getByRole('button', { name: 'Tornar principal a imagem 1' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Subir imagem 1' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Descer imagem 2' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('tornar principal leva a imagem para o topo e mantém o foco no botão dela', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Tornar principal a imagem 2' }));

    expect(screen.getAllByRole('img').map((img) => img.getAttribute('src'))).toEqual(['http://img/2.png', 'http://img/1.png']);
    expect(screen.getByRole('status')).toHaveTextContent('A imagem agora é a principal.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tornar principal a imagem 1' })).toHaveFocus());
  });

  it('adiciona imagem nova e recusa arquivo acima de 5MB', () => {
    const { container } = renderPage();
    const big = new File(['x'], 'grande.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInputs(container)[0], { target: { files: [new File(['a'], 'frente.png', { type: 'image/png' }), big] } });

    expect(imageNames()).toEqual(['Imagem 1 (principal)', 'Imagem 2', 'Imagem 3, nova']);
    expect(screen.getByText('Nova: frente.png (enviada ao salvar)')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('1 imagem(ns) ignorada(s) por exceder 5MB.');
  });

  it('substituir troca a pré-visualização e marca a imagem como substituída', () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Substituir imagem 2' }));
    fireEvent.change(fileInputs(container)[1], { target: { files: [new File(['b'], 'nova-costas.png', { type: 'image/png' })] } });

    expect(imageNames()).toEqual(['Imagem 1 (principal)', 'Imagem 2, substituída']);
    expect(screen.getByText('Substituída: nova-costas.png (enviada ao salvar)')).toBeInTheDocument();
  });

  it('remover tira a imagem da lista e devolve o foco para "Adicionar imagens"', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 1' }));
    expect(imageNames()).toEqual(['Imagem 1 (principal)']);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar imagens' })).toHaveFocus());
  });

  it('ao salvar, envia produto, remoção, imagem nova e a ordem escolhida', async () => {
    const fetchMock = vi.fn((url, options) => {
      if (options.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ id: 'n1', image: 'http://img/n1.png' }) });
      return Promise.resolve({ ok: true, status: options.method === 'DELETE' ? 204 : 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 1' }));
    fireEvent.change(fileInputs(container)[0], { target: { files: [new File(['a'], 'frente.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Tornar principal a imagem 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Detalhe do produto')).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url, options]) => `${options.method} ${url.replace(/^.*\/api\/catalog/, '')}`)).toEqual([
      'PUT /products/p1/',
      'DELETE /images/i1/',
      'POST /products/p1/images/',
      'PUT /products/p1/images/order/',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ image_ids: ['n1', 'i2'] });
  });

  it('se a imagem falha, avisa na tela e a nova tentativa não reenvia o que já subiu', async () => {
    let posts = 0;
    const fetchMock = vi.fn((url, options) => {
      if (options.method === 'POST') {
        posts += 1;
        return posts === 1
          ? Promise.resolve({ ok: true, json: async () => ({ id: 'n1', image: 'http://img/n1.png' }) })
          : Promise.resolve({ ok: false, status: 400, json: async () => ({ details: { image: ['Formato inválido.'] } }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    fireEvent.change(fileInputs(container)[0], {
      target: { files: [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.gif', { type: 'image/gif' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(/Os dados do produto foram salvos, mas as imagens não\. Falha ao enviar a imagem 4: image: Formato inválido\./)).toBeInTheDocument();
    // A imagem 3 já subiu e deixou de ser "nova"; a 4 continua pendente.
    expect(imageNames()).toEqual(['Imagem 1 (principal)', 'Imagem 2', 'Imagem 3', 'Imagem 4, nova']);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await screen.findByRole('button', { name: 'Salvando...' });
    await screen.findByRole('button', { name: 'Salvar alterações' });
    // 2 envios na primeira tentativa + só a imagem 4 na segunda.
    expect(posts).toBe(3);
  });

  it('editor de imagens sem violações de acessibilidade (com imagem nova)', async () => {
    const { container } = renderPage();
    fireEvent.change(fileInputs(container)[0], { target: { files: [new File(['a'], 'frente.png', { type: 'image/png' })] } });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('EditProductPage — tamanhos e estoque', () => {
  const quantity = (name) => screen.getByRole('spinbutton', { name: `Quantidade final de ${name}` });
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  const route = ([url, options = {}]) => `${options.method ?? 'GET'} ${url.replace(/^.*\/api\/catalog/, '')}`;

  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:nova');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('diminuir o estoque abaixo de zero é recusado antes de salvar qualquer coisa', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    fireEvent.change(quantity('G / Preto'), { target: { value: '-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Justificativa do ajuste/ }), { target: { value: 'Avaria' } });
    save();

    // min="0": o próprio navegador barra o envio e mostra o motivo no campo
    // (a validação em productVariations.js é a segunda barreira, testada lá).
    expect(quantity('G / Preto')).toBeInvalid();
    expect(quantity('G / Preto').validity.rangeUnderflow).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Detalhe do produto')).not.toBeInTheDocument();
  });

  it('mudar o estoque exige justificativa', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    fireEvent.change(quantity('G / Preto'), { target: { value: '1' } });

    expect(screen.getByText('Atual: 3 un. · −2 un. (saída por ajuste)')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Justificativa do ajuste/ })).toHaveAttribute('aria-required', 'true');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe a justificativa do ajuste de estoque.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('salva nova imagem, novo tamanho e estoque alterado, e o ajuste vai para o histórico', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (!options.method) return Promise.resolve({ ok: true, json: async () => product });
      if (options.method === 'POST' && url.endsWith('/images/')) return Promise.resolve({ ok: true, json: async () => ({ id: 'n1', image: 'http://img/n1.png' }) });
      if (options.method === 'POST' && url.endsWith('/variations/')) return Promise.resolve({ ok: true, json: async () => ({ id: 'vm', size: 'M', sku: 'SH-1', stock_quantity: 4 }) });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();

    fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [new File(['a'], 'frente.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tamanho' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Tamanho do novo tamanho 1' }), { target: { value: 'M' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Estoque inicial do novo tamanho 1' }), { target: { value: '4' } });
    fireEvent.change(quantity('G / Preto'), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Justificativa do ajuste/ }), { target: { value: 'Chegou reposição' } });
    save();

    expect(await screen.findByText('Detalhe do produto')).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(route)).toEqual([
      'PUT /products/p1/',
      'POST /products/p1/images/',
      'PUT /products/p1/images/order/',
      'GET /products/p1/',
      'POST /products/p1/variations/',
      'POST /variations/vg/stock-movements/',
    ]);
    const bodies = fetchMock.mock.calls.map(([, options = {}]) => options.body);
    expect(JSON.parse(bodies[4])).toEqual({ size: 'M', color: '', sku: '', stock_quantity: 4 });
    const movement = JSON.parse(bodies[5]);
    expect(movement).toMatchObject({ kind: 'ENTRADA', reason: 'AJUSTE', quantity: 2, note: 'Chegou reposição' });
    expect(movement.idempotency_key).toEqual(expect.any(String));
  });

  it('remover tamanho com estoque avisa que zera; desfazer volta ao normal e o foco acompanha', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Remover tamanho G / Preto' }));

    expect(screen.getByText(/Será removido ao salvar \(ou desativado, se tiver histórico\)\. O estoque de 3 un\. será zerado por ajuste\./)).toBeInTheDocument();
    const undo = screen.getByRole('button', { name: 'Desfazer mudança em G / Preto' });
    await waitFor(() => expect(undo).toHaveFocus());

    fireEvent.click(undo);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover tamanho G / Preto' })).toHaveFocus());
    expect(quantity('G / Preto')).toHaveValue(3);
  });

  it('erro do backend no estoque aparece na tela com o motivo', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (!options.method) return Promise.resolve({ ok: true, json: async () => product });
      if (url.includes('stock-movements')) {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ details: { quantity: ['Saída supera o estoque atual.'] } }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }));
    renderPage();
    fireEvent.change(quantity('G / Preto'), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Justificativa do ajuste/ }), { target: { value: 'Perda' } });
    save();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Os dados do produto foram salvos, mas os tamanhos/estoque não. Falha ao ajustar o estoque de G / Preto: quantity: Saída supera o estoque atual.',
    );
  });

  describe('produto com a variação padrão “Único”', () => {
    const unicoProduct = {
      ...product,
      images: [],
      variations: [{ id: 'vu', size: 'Único', color: '', sku: 'CAM-U', stock_quantity: 2, is_active: true }],
    };

    beforeEach(() => {
      useApiMock.mockImplementation((url) => ({
        data: url === '/api/catalog/products/p1/' ? unicoProduct : apiData[url] ?? null,
        loading: false, error: null, refetch: vi.fn(),
      }));
    });

    it('adicionar tamanho sem converter o Único avisa antes de salvar', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar tamanho' }));
      fireEvent.change(screen.getByRole('combobox', { name: 'Tamanho do novo tamanho 1' }), { target: { value: 'M' } });
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent('converta antes o “Único” em um tamanho real');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('converte o Único em P, adiciona M e salva tudo pela edição, sem apagar a variação', async () => {
      const fetchMock = vi.fn((url, options = {}) => {
        if (!options.method) return Promise.resolve({ ok: true, json: async () => unicoProduct });
        if (options.method === 'PUT' && url.endsWith('/variations/vu/')) {
          return Promise.resolve({ ok: true, json: async () => ({ ...unicoProduct.variations[0], size: 'P' }) });
        }
        if (options.method === 'POST' && url.endsWith('/variations/')) {
          return Promise.resolve({ ok: true, json: async () => ({ id: 'vm', size: 'M', color: '', sku: 'SH-M', stock_quantity: 3, is_active: true }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });
      vi.stubGlobal('fetch', fetchMock);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Converter em tamanho real: Único' }));
      const newSize = screen.getByRole('combobox', { name: 'Novo tamanho de Único' });
      await waitFor(() => expect(newSize).toHaveFocus());
      expect(screen.getByText(/Pedidos, SKU e histórico de estoque continuam ligados a este tamanho/)).toBeInTheDocument();
      fireEvent.change(newSize, { target: { value: 'P' } });

      fireEvent.click(screen.getByRole('button', { name: 'Adicionar tamanho' }));
      fireEvent.change(screen.getByRole('combobox', { name: 'Tamanho do novo tamanho 1' }), { target: { value: 'M' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Estoque inicial do novo tamanho 1' }), { target: { value: '3' } });
      fireEvent.change(quantity('Único'), { target: { value: '5' } });
      fireEvent.change(screen.getByRole('textbox', { name: /Justificativa do ajuste/ }), { target: { value: 'Grade nova' } });
      save();

      expect(await screen.findByText('Detalhe do produto')).toBeInTheDocument();
      // A conversão vai antes da criação; o Único não é apagado nem recriado.
      expect(fetchMock.mock.calls.map(route)).toEqual([
        'PUT /products/p1/',
        'GET /products/p1/',
        'PUT /variations/vu/',
        'POST /products/p1/variations/',
        'POST /variations/vu/stock-movements/',
      ]);
      const bodies = fetchMock.mock.calls.map(([, options = {}]) => options.body);
      expect(JSON.parse(bodies[2])).toEqual({ size: 'P', color: '' });
      expect(JSON.parse(bodies[3])).toEqual({ size: 'M', color: '', sku: '', stock_quantity: 3 });
      expect(JSON.parse(bodies[4])).toMatchObject({ kind: 'ENTRADA', reason: 'AJUSTE', quantity: 3, note: 'Grade nova' });
    });

    it('desfazer a conversão devolve o foco ao botão de converter', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Converter em tamanho real: Único' }));
      fireEvent.click(screen.getByRole('button', { name: 'Desfazer conversão: Único' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Converter em tamanho real: Único' })).toHaveFocus());
      expect(screen.queryByRole('combobox', { name: 'Novo tamanho de Único' })).not.toBeInTheDocument();
    });

    it('conversão sem violações de acessibilidade', async () => {
      const { container } = renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Converter em tamanho real: Único' }));
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('tamanhos sem violações de acessibilidade (com tamanho novo)', async () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tamanho' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imagesChanged, syncProductImages } from './productImages';

const ok = (body) => Promise.resolve({ ok: true, status: 200, json: async () => body });
const fail = (status, body) => Promise.resolve({ ok: false, status, json: async () => body });

const calls = (fetchMock) => fetchMock.mock.calls.map(([url, options]) => `${options.method} ${url.replace(/^.*\/api\/catalog/, '')}`);

beforeEach(() => {
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('imagesChanged', () => {
  const original = [{ id: 'a' }, { id: 'b' }];
  const kept = [{ key: 'a', id: 'a' }, { key: 'b', id: 'b' }];

  it('sem mudança quando a lista é a mesma do servidor', () => {
    expect(imagesChanged(kept, [], original)).toBe(false);
  });

  it('detecta remoção, arquivo novo/substituído e troca de ordem', () => {
    expect(imagesChanged([kept[0]], ['b'], original)).toBe(true);
    expect(imagesChanged([...kept, { key: 'n', file: {} }], [], original)).toBe(true);
    expect(imagesChanged([{ ...kept[0], file: {} }, kept[1]], [], original)).toBe(true);
    expect(imagesChanged([kept[1], kept[0]], [], original)).toBe(true);
  });
});

describe('syncProductImages', () => {
  it('remove, substitui, envia a nova e grava a ordem da tela', async () => {
    const fetchMock = vi.fn((url, options) => {
      if (options.method === 'POST') return ok({ id: 'n1', image: 'http://img/n1.png' });
      if (options.method === 'PUT' && url.endsWith('/images/a/')) return ok({ id: 'a', image: 'http://img/a2.png' });
      if (url.endsWith('/order/')) return ok([]);
      return Promise.resolve({ ok: true, status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['x'], 'nova.png', { type: 'image/png' });

    const result = await syncProductImages({
      productId: 'p1',
      token: 't',
      removedIds: ['old'],
      // A nova foi colocada como principal; "a" teve o arquivo trocado.
      images: [
        { key: 'blob:1', file, preview: 'blob:1' },
        { key: 'a', id: 'a', url: 'http://img/a.png', file, preview: 'blob:2' },
        { key: 'b', id: 'b', url: 'http://img/b.png' },
      ],
    });

    expect(calls(fetchMock)).toEqual([
      'DELETE /images/old/',
      'POST /products/p1/images/',
      'PUT /products/p1/images/a/',
      'PUT /products/p1/images/order/',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ image_ids: ['n1', 'a', 'b'] });
    expect(fetchMock.mock.calls[1][1].body.get('image')).toBe(file);
    expect(result.images.map((item) => item.id)).toEqual(['n1', 'a', 'b']);
    expect(result.images.every((item) => !item.file)).toBe(true);
    expect(result.removedIds).toEqual([]);
  });

  it('com uma imagem só não precisa gravar a ordem', async () => {
    const fetchMock = vi.fn(() => ok({ id: 'n1', image: 'http://img/n1.png' }));
    vi.stubGlobal('fetch', fetchMock);
    await syncProductImages({ productId: 'p1', token: 't', removedIds: [], images: [{ key: 'k', file: new File(['x'], 'a.png') }] });
    expect(calls(fetchMock)).toEqual(['POST /products/p1/images/']);
  });

  it('se uma imagem falha, o erro traz o motivo e o que já foi feito', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => ok({ id: 'n1', image: 'http://img/n1.png' }))
      .mockImplementationOnce(() => fail(400, { error: 'Dados inválidos.', details: { image: ['Imagem não pode passar de 5MB.'] } }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['x'], 'a.png');

    const error = await syncProductImages({
      productId: 'p1', token: 't', removedIds: [],
      images: [{ key: 'k1', file }, { key: 'k2', file }],
    }).catch((err) => err);

    expect(error.message).toBe('Falha ao enviar a imagem 2: image: Imagem não pode passar de 5MB.');
    // A primeira já subiu: na próxima tentativa ela não é enviada de novo.
    expect(error.state.images).toEqual([{ key: 'k1', id: 'n1', url: 'http://img/n1.png' }, { key: 'k2', file }]);
  });

  it('imagem que já não existe (404) conta como removida', async () => {
    vi.stubGlobal('fetch', vi.fn(() => fail(404, {})));
    const result = await syncProductImages({ productId: 'p1', token: 't', removedIds: ['x'], images: [] });
    expect(result.removedIds).toEqual([]);
  });
});

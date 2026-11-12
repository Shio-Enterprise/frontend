import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useApiAll } from './useApi';

vi.mock('../lib/authToken', () => ({ getAccessToken: () => 'tok' }));

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useApiAll (#104)', () => {
  it('segue as páginas até não haver next e junta tudo, na ordem', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ id: `d${i + 1}` }));
    const page2 = [{ id: 'd21' }, { id: 'd22' }];
    const fetchMock = vi.fn(async (url) => (url.endsWith('page=1')
      ? jsonResponse({ count: 22, next: 'http://api/x?page=2', results: page1 })
      : jsonResponse({ count: 22, next: null, results: page2 })));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiAll('/api/catalog/drops/'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data.count).toBe(22);
    expect(result.current.data.results.map((d) => d.id)).toEqual([...page1, ...page2].map((d) => d.id));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/catalog\/drops\/\?page=1$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/catalog\/drops\/\?page=2$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('com poucos itens faz uma chamada só', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ count: 2, next: null, results: [{ id: 1 }, { id: 2 }] }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useApiAll('/api/catalog/categories/'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.results).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('usa & quando a URL já tem parâmetros', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ next: null, results: [] }));
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useApiAll('/api/catalog/drops/?visible=true'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toMatch(/\?visible=true&page=1$/);
  });

  it('aceita resposta sem paginação (lista pura)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([{ id: 1 }])));

    const { result } = renderHook(() => useApiAll('/api/catalog/drops/'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ count: 1, results: [{ id: 1 }] });
  });

  it('tira o item repetido entre páginas (criado durante a busca)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => (url.endsWith('page=1')
      ? jsonResponse({ next: 'x', results: [{ id: 'a' }, { id: 'b' }] })
      : jsonResponse({ next: null, results: [{ id: 'b' }, { id: 'c' }] }))));

    const { result } = renderHook(() => useApiAll('/api/catalog/drops/'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.results.map((d) => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('erro em qualquer página vira error, sem lista pela metade', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => (url.endsWith('page=1')
      ? jsonResponse({ next: 'x', results: [{ id: 'a' }] })
      : jsonResponse({}, false, 500))));

    const { result } = renderHook(() => useApiAll('/api/catalog/drops/'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });
});

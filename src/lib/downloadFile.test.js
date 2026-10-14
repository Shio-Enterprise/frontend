import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.hoisted(() => vi.fn());
vi.mock('./axios', () => ({
  default: {
    get: getMock,
  },
}));

import { downloadFile } from './downloadFile';

describe('downloadFile helper', () => {
  let createObjectURLMock;
  let revokeObjectURLMock;
  let appendChildSpy;
  let removeChildSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    createObjectURLMock = vi.fn(() => 'blob:http://localhost/test-blob');
    revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    appendChildSpy = vi.spyOn(document.body, 'appendChild');
    removeChildSpy = vi.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('faz requisição com responseType blob e extrai filename do header', async () => {
    getMock.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]),
      headers: {
        'content-disposition': 'attachment; filename="pedidos_2026.csv"',
        'content-type': 'text/csv; charset=utf-8',
      },
    });

    const filename = await downloadFile('/api/orders/admin/export/', { status: 'PAID' });

    expect(getMock).toHaveBeenCalledWith('/orders/admin/export/', {
      params: { status: 'PAID' },
      responseType: 'blob',
    });
    expect(filename).toBe('pedidos_2026.csv');
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/test-blob');
  });

  it('extrai filename codificado em UTF-8 (filename*=utf-8)', async () => {
    getMock.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]),
      headers: {
        'content-disposition': "attachment; filename*=utf-8''relat%C3%B3rio.xlsx",
      },
    });

    const filename = await downloadFile('/catalog/inventory/export/', { file_format: 'xlsx' });

    expect(filename).toBe('relatório.xlsx');
  });

  it('usa fallbackFilename caso o cabeçalho não contenha nome', async () => {
    getMock.mockResolvedValueOnce({
      data: new Uint8Array([]),
      headers: {},
    });

    const filename = await downloadFile('/orders/admin/export/', {}, 'padrao.csv');

    expect(filename).toBe('padrao.csv');
  });
});

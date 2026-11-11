import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncProductVariations, toVariationRows, validateVariations, variationsChanged } from './productVariations';

const ok = (body, status = 200) => Promise.resolve({ ok: true, status, json: async () => body });
const fail = (status, body) => Promise.resolve({ ok: false, status, json: async () => body });
const calls = (fetchMock) => fetchMock.mock.calls.map(([url, options = {}]) => `${options.method ?? 'GET'} ${url.replace(/^.*\/api\/catalog/, '')}`);
const bodyOf = (fetchMock, index) => JSON.parse(fetchMock.mock.calls[index][1].body);

const server = [
  { id: 'vg', size: 'G', color: 'Preto', sku: 'CAM-G', stock_quantity: 3, is_active: true },
  { id: 'vp', size: 'P', color: '', sku: 'CAM-P', stock_quantity: 0, is_active: false },
  { id: 'vx', size: 'GG', color: '', sku: 'CAM-GG', stock_quantity: 1, is_active: true },
];
const keyFor = (signature) => `key:${signature}`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('validateVariations', () => {
  const rows = toVariationRows(server);
  const set = (key, patch) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row));

  it('aceita a lista sem mudanças', () => {
    expect(validateVariations(rows, '')).toBeNull();
    expect(variationsChanged(rows)).toBe(false);
  });

  it('recusa estoque negativo ou que não é número inteiro', () => {
    expect(validateVariations(set('vg', { final: '-1' }), 'x')).toBe('O estoque de G / Preto não pode ficar negativo.');
    expect(validateVariations(set('vg', { final: '2.5' }), 'x')).toBe('Estoque de G / Preto: informe um número inteiro.');
  });

  it('exige justificativa quando o estoque muda (inclusive ao remover com estoque)', () => {
    expect(validateVariations(set('vg', { final: '5' }), '  ')).toBe('Informe a justificativa do ajuste de estoque.');
    expect(validateVariations(set('vx', { remove: true }), '')).toBe('Informe a justificativa do ajuste de estoque.');
    expect(validateVariations(set('vg', { final: '5' }), 'Contagem')).toBeNull();
  });

  it('exige ao menos um tamanho ativo e tamanho escolhido na linha nova', () => {
    const allRemoved = rows.map((row) => ({ ...row, remove: true, final: '0', current: 0 }));
    expect(validateVariations(allRemoved, 'x')).toBe('O produto precisa de pelo menos um tamanho ativo.');
    expect(validateVariations([...rows, { key: 'n', size: '', color: '', sku: '', final: '0' }], '')).toBe('Escolha o tamanho da nova linha.');
  });
});

describe('syncProductVariations', () => {
  it('confere o estoque, reativa, cria, ajusta pela quantidade final e remove', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (!options.method) return ok({ variations: server });
      if (options.method === 'POST' && url.endsWith('/products/p1/variations/')) {
        return ok({ id: 'vm', size: 'M', color: '', sku: 'SH-AUTO', stock_quantity: 4, is_active: true }, 201);
      }
      if (options.method === 'DELETE') return ok({ ...server[2], stock_quantity: 0, is_active: false });
      return ok({}, options.method === 'POST' ? 201 : 200);
    });
    vi.stubGlobal('fetch', fetchMock);
    const rows = toVariationRows(server).map((row) => ({
      vg: { ...row, final: '5' },
      vp: { ...row, reactivate: true, final: '2' },
      vx: { ...row, remove: true },
    }[row.key]));
    rows.push({ key: 'new-1', size: 'M', color: '', sku: '', final: '4' });

    const result = await syncProductVariations({ productId: 'p1', rows, note: ' Contagem física ', token: 't', keyFor });

    expect(calls(fetchMock)).toEqual([
      'GET /products/p1/',
      'PUT /variations/vp/',
      'POST /products/p1/variations/',
      'POST /variations/vg/stock-movements/',
      'POST /variations/vp/stock-movements/',
      'POST /variations/vx/stock-movements/',
      'DELETE /variations/vx/',
    ]);
    expect(bodyOf(fetchMock, 1)).toEqual({ is_active: true });
    expect(bodyOf(fetchMock, 2)).toEqual({ size: 'M', color: '', sku: '', stock_quantity: 4 });
    expect(bodyOf(fetchMock, 3)).toEqual({ kind: 'ENTRADA', reason: 'AJUSTE', quantity: 2, note: 'Contagem física', idempotency_key: 'key:vg:3:2:Contagem física' });
    expect(bodyOf(fetchMock, 4)).toMatchObject({ kind: 'ENTRADA', quantity: 2 });
    // Remover com estoque: zera por ajuste antes de pedir a remoção.
    expect(bodyOf(fetchMock, 5)).toMatchObject({ kind: 'SAIDA', reason: 'AJUSTE', quantity: 1 });

    const byKey = Object.fromEntries(result.map((row) => [row.key, row]));
    expect(byKey.vg).toMatchObject({ current: 5 });
    expect(byKey.vp).toMatchObject({ isActive: true, reactivate: false, current: 2 });
    // Tinha histórico: o backend desativou (200) em vez de apagar.
    expect(byKey.vx).toMatchObject({ isActive: false, remove: false, current: 0 });
    expect(byKey['new-1']).toMatchObject({ id: 'vm', sku: 'SH-AUTO', current: 4 });
  });

  it('remoção sem histórico (204) tira a linha', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => (options.method === 'DELETE' ? Promise.resolve({ ok: true, status: 204 }) : ok({ variations: server }))));
    const rows = toVariationRows([server[0], { ...server[2], stock_quantity: 0 }]).map((row) => (row.key === 'vx' ? { ...row, remove: true } : row));
    const result = await syncProductVariations({ productId: 'p1', rows, note: '', token: 't', keyFor });
    expect(result.map((row) => row.key)).toEqual(['vg']);
  });

  it('se o estoque mudou desde que a página abriu, não grava e atualiza o estoque atual', async () => {
    const fetchMock = vi.fn(() => ok({ variations: [{ ...server[0], stock_quantity: 2 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const rows = toVariationRows([server[0]]).map((row) => ({ ...row, final: '5' }));

    const error = await syncProductVariations({ productId: 'p1', rows, note: 'x', token: 't', keyFor }).catch((err) => err);

    expect(error.message).toBe('O estoque mudou desde que a página foi aberta (G / Preto: era 3, agora 2 un.). Confira a quantidade final e salve de novo.');
    expect(calls(fetchMock)).toEqual(['GET /products/p1/']);
    expect(error.state[0]).toMatchObject({ current: 2, final: '5' });
  });

  it('saída maior que o estoque: mostra o motivo do backend e guarda o que já foi feito', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (!options.method) return ok({ variations: server });
      if (url.includes('/vx/')) return fail(400, { error: 'Dados inválidos.', details: { quantity: ['Saída supera o estoque atual.'] } });
      return ok({}, 201);
    });
    vi.stubGlobal('fetch', fetchMock);
    const rows = toVariationRows([server[0], server[2]]).map((row) => ({ ...row, final: row.key === 'vg' ? '4' : '0' }));

    const error = await syncProductVariations({ productId: 'p1', rows, note: 'x', token: 't', keyFor }).catch((err) => err);

    expect(error.message).toBe('Falha ao ajustar o estoque de GG: quantity: Saída supera o estoque atual.');
    // G já foi ajustado: na próxima tentativa não entra de novo.
    expect(error.state.map((row) => row.current)).toEqual([4, 1]);
  });
});

describe('converter a variação padrão “Único”', () => {
  const unico = { id: 'vu', size: 'Único', color: '', sku: 'CAM-U', stock_quantity: 2, is_active: true };
  const newRow = { key: 'new-1', size: 'M', color: '', sku: '', final: '3' };

  it('não deixa adicionar tamanho sem converter o Único, nem converter sem escolher o tamanho', () => {
    const rows = toVariationRows([unico]);
    expect(validateVariations([...rows, newRow], '')).toBe(
      'Para adicionar tamanhos, converta antes o “Único” em um tamanho real (botão “Converter em tamanho real”).',
    );
    expect(validateVariations([{ ...rows[0], convert: true, convertSize: '' }, newRow], '')).toBe('Escolha o tamanho real para converter “Único”.');
    expect(validateVariations([{ ...rows[0], convert: true, convertSize: 'P' }, newRow], '')).toBeNull();
    expect(variationsChanged([{ ...rows[0], convert: true, convertSize: 'P' }])).toBe(true);
  });

  it('converte o Único (mesma variação) antes de criar os outros tamanhos', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (!options.method) return ok({ variations: [unico] });
      if (options.method === 'PUT') return ok({ ...unico, size: 'P' });
      if (url.endsWith('/products/p1/variations/')) return ok({ id: 'vm', size: 'M', color: '', sku: 'SH-M', stock_quantity: 3, is_active: true }, 201);
      return ok({}, 201);
    });
    vi.stubGlobal('fetch', fetchMock);
    const [row] = toVariationRows([unico]);
    const rows = [{ ...row, convert: true, convertSize: 'P', convertColor: ' ', final: '5' }, newRow];

    const result = await syncProductVariations({ productId: 'p1', rows, note: 'Grade nova', token: 't', keyFor });

    expect(calls(fetchMock)).toEqual([
      'GET /products/p1/',
      'PUT /variations/vu/',
      'POST /products/p1/variations/',
      'POST /variations/vu/stock-movements/',
    ]);
    expect(bodyOf(fetchMock, 1)).toEqual({ size: 'P', color: '' });
    // O ajuste de estoque fica na mesma variação (o histórico dela continua).
    expect(bodyOf(fetchMock, 3)).toMatchObject({ kind: 'ENTRADA', reason: 'AJUSTE', quantity: 3 });
    expect(result[0]).toMatchObject({ id: 'vu', sku: 'CAM-U', size: 'P', convert: false, current: 5 });
    expect(fetchMock.mock.calls.some(([, options = {}]) => options.method === 'DELETE')).toBe(false);
  });
});

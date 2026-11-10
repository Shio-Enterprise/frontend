// Tamanhos e estoque na tela de edição do produto (issue #79).
// Cada linha da lista:
//   - existente: { key, id, size, color, sku, isActive, current, final, remove, reactivate }
//     current = estoque no servidor; final = quantidade final digitada (texto do input);
//   - nova: { key, size, color, sku, final } (sem id; final = estoque inicial).
// O estoque nunca é gravado direto: a diferença vira uma movimentação de AJUSTE
// com justificativa, para o histórico continuar batendo.
import { apiError } from './productForm';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const variationLabel = (row) => `${row.size || 'novo tamanho'}${row.color ? ` / ${row.color}` : ''}`;

export const toVariationRows = (variations = []) => variations.map((v) => ({
  key: v.id,
  id: v.id,
  size: v.size,
  color: v.color || '',
  sku: v.sku,
  isActive: v.is_active !== false,
  current: v.stock_quantity ?? 0,
  final: String(v.stock_quantity ?? 0),
  remove: false,
  reactivate: false,
}));

let newRowCount = 0;
export const newVariationRow = () => {
  newRowCount += 1;
  return { key: `new-${newRowCount}`, size: '', color: '', sku: '', final: '0' };
};

const parseQuantity = (value) => (/^\d+$/.test(String(value).trim()) ? Number(value) : null);

// O admin pode digitar a quantidade desta linha? (inativo só depois de reativar)
export const stockEditable = (row) => !row.id || (!row.remove && (row.isActive || row.reactivate));

// Estoque que a linha terá depois de salvar.
export const plannedStock = (row) => {
  if (row.remove) return 0;
  if (!stockEditable(row)) return row.current;
  return parseQuantity(row.final);
};

// Diferença a registrar no histórico (só linhas existentes; null se o número é inválido).
export const stockDelta = (row) => {
  if (!row.id) return 0;
  const planned = plannedStock(row);
  return planned === null ? null : planned - row.current;
};

export const needsStockNote = (rows) => rows.some((row) => {
  const delta = stockDelta(row);
  return delta !== null && delta !== 0;
});

export const variationsChanged = (rows) => rows.some((row) => !row.id || row.remove || row.reactivate || stockDelta(row) !== 0);

// Mesmas regras do backend, conferidas antes de salvar qualquer coisa.
export const validateVariations = (rows, note) => {
  for (const row of rows) {
    if (!row.id && !row.size) return 'Escolha o tamanho da nova linha.';
    if (stockEditable(row) && parseQuantity(row.final) === null) {
      return String(row.final).trim().startsWith('-')
        ? `O estoque de ${variationLabel(row)} não pode ficar negativo.`
        : `Estoque de ${variationLabel(row)}: informe um número inteiro.`;
    }
  }
  if (!rows.some((row) => !row.id || (!row.remove && (row.isActive || row.reactivate)))) {
    return 'O produto precisa de pelo menos um tamanho ativo.';
  }
  if (needsStockNote(rows) && !note.trim()) return 'Informe a justificativa do ajuste de estoque.';
  return null;
};

const failure = async (response, prefix) => {
  const data = await response.json().catch(() => ({}));
  const reason = apiError(data.details ?? data);
  return new Error(reason ? `${prefix}: ${reason}` : `${prefix}.`);
};

// Envia as mudanças. Se algo falhar, o erro leva em `error.state` as linhas já
// atualizadas, para a nova tentativa não repetir o que deu certo.
// keyFor(assinatura) devolve sempre a mesma idempotency_key para a mesma operação.
export async function syncProductVariations({ productId, rows, note, token, keyFor }) {
  const auth = { Authorization: `Bearer ${token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const cleanNote = note.trim();
  let current = rows;
  const update = (key, patch) => {
    current = patch === null
      ? current.filter((row) => row.key !== key)
      : current.map((row) => (row.key === key ? { ...row, ...patch } : row));
  };
  const stop = (error) => Object.assign(error, { state: current });

  const moveStock = async (row, delta) => {
    const payload = { kind: delta > 0 ? 'ENTRADA' : 'SAIDA', reason: 'AJUSTE', quantity: Math.abs(delta), note: cleanNote };
    // O estoque de partida entra na assinatura: o mesmo ajuste repetido depois de
    // salvar é outra operação; a mesma tentativa repetida reaproveita a chave.
    const idempotencyKey = keyFor(`${row.id}:${row.current}:${delta}:${cleanNote}`);
    const response = await fetch(`${API_BASE_URL}/api/catalog/variations/${row.id}/stock-movements/`, {
      method: 'POST', headers: json, body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }),
    });
    if (!response.ok) throw stop(await failure(response, `Falha ao ajustar o estoque de ${variationLabel(row)}`));
  };

  // 1. A quantidade final foi calculada sobre o estoque de quando a página abriu:
  //    se mudou (uma venda, por exemplo), não arrisca gravar a diferença errada.
  const changing = rows.filter((row) => row.id && (stockDelta(row) !== 0 || (row.remove && row.current > 0)));
  if (changing.length) {
    const response = await fetch(`${API_BASE_URL}/api/catalog/products/${productId}/`, { headers: auth });
    if (!response.ok) throw stop(await failure(response, 'Falha ao conferir o estoque atual'));
    const fresh = new Map(((await response.json()).variations ?? []).map((v) => [v.id, v.stock_quantity]));
    const moved = changing.filter((row) => fresh.has(row.id) && fresh.get(row.id) !== row.current);
    if (moved.length) {
      moved.forEach((row) => update(row.key, { current: fresh.get(row.id) }));
      const detail = moved.map((row) => `${variationLabel(row)}: era ${row.current}, agora ${fresh.get(row.id)} un.`).join('; ');
      throw stop(new Error(`O estoque mudou desde que a página foi aberta (${detail}). Confira a quantidade final e salve de novo.`));
    }
  }

  // 2. Reativar antes de dar entrada (tamanho inativo não aceita entrada).
  for (const row of current.filter((r) => r.id && r.reactivate)) {
    const response = await fetch(`${API_BASE_URL}/api/catalog/variations/${row.id}/`, {
      method: 'PUT', headers: json, body: JSON.stringify({ is_active: true }),
    });
    if (!response.ok) throw stop(await failure(response, `Falha ao reativar ${variationLabel(row)}`));
    update(row.key, { isActive: true, reactivate: false });
  }

  // 3. Tamanhos novos antes das remoções: o produto nunca fica sem tamanho ativo.
  //    O estoque inicial é registrado pelo backend ("Estoque inicial" no histórico).
  for (const row of current.filter((r) => !r.id)) {
    const response = await fetch(`${API_BASE_URL}/api/catalog/products/${productId}/variations/`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ size: row.size, color: row.color, sku: row.sku, stock_quantity: Number(row.final) }),
    });
    if (!response.ok) throw stop(await failure(response, `Falha ao adicionar ${variationLabel(row)}`));
    const saved = await response.json();
    update(row.key, {
      id: saved.id, sku: saved.sku, isActive: true, current: saved.stock_quantity,
      final: String(saved.stock_quantity), remove: false, reactivate: false,
    });
  }

  // 4. Ajustes de estoque pela quantidade final.
  for (const row of current.filter((r) => r.id && !r.remove && stockDelta(r) !== 0)) {
    await moveStock(row, stockDelta(row));
    update(row.key, { current: plannedStock(row) });
  }

  // 5. Remover: zera o estoque (saída por ajuste) e pede a remoção. Com histórico
  //    o backend só desativa (200); sem histórico apaga (204).
  for (const row of current.filter((r) => r.id && r.remove)) {
    if (row.current > 0) {
      await moveStock(row, -row.current);
      update(row.key, { current: 0, final: '0' });
    }
    const response = await fetch(`${API_BASE_URL}/api/catalog/variations/${row.id}/`, { method: 'DELETE', headers: auth });
    if (response.status === 204 || response.status === 404) {
      update(row.key, null);
    } else if (response.ok) {
      const saved = await response.json();
      update(row.key, { isActive: saved.is_active, remove: false, current: saved.stock_quantity, final: String(saved.stock_quantity) });
    } else {
      throw stop(await failure(response, `Falha ao remover ${variationLabel(row)}`));
    }
  }

  return current;
}

export const apiError = (data) => {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(apiError).join('; ');
  return Object.entries(data || {}).map(([key, value]) => `${key}: ${apiError(value)}`).join(' | ');
};

export const toSaoPauloInput = (value) => {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const part = (type) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};
export const pricePayload = (form) => ({
  cost_price: form.cost_price === '' ? null : form.cost_price,
  promotional_price: form.promotional_price || null,
  promo_start: form.promotional_price && form.promo_start ? `${form.promo_start}:00-03:00` : null,
  promo_end: form.promotional_price && form.promo_end ? `${form.promo_end}:00-03:00` : null,
});
export const ONE_SIZE = 'Único';
export const SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG', ONE_SIZE];
export const emptyVariation = (size = ONE_SIZE) => ({ size, color: '', sku: '', stock_quantity: 0 });

// Opções do select de uma linha; mantém um tamanho antigo digitado à mão.
export const sizeOptionsFor = (current) => (current && !SIZE_OPTIONS.includes(current) ? [...SIZE_OPTIONS, current] : SIZE_OPTIONS);

const sizeOrder = (size) => {
  const index = SIZE_OPTIONS.indexOf(size);
  return index === -1 ? SIZE_OPTIONS.length : index;
};

// Marca/desmarca um tamanho no seletor: cria uma linha para o tamanho novo ou
// remove todas as linhas dele. "Único" não convive com tamanhos de verdade.
export const toggleSize = (rows, size) => {
  if (rows.some((row) => row.size === size)) {
    const rest = rows.filter((row) => row.size !== size);
    return rest.length ? rest : [emptyVariation()];
  }
  const kept = rows.filter((row) => (size === ONE_SIZE ? false : row.size !== ONE_SIZE && row.size !== ''));
  return [...kept, emptyVariation(size)].sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size));
};

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
export const emptyVariation = () => ({ size: 'Único', color: '', sku: '', stock_quantity: 0 });

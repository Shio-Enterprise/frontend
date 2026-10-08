import { emptyVariation } from './productForm';
const inputClass = 'mt-2 w-full rounded-lg border border-black/20 p-3';

export function MarginSummary({ product }) {
  return <div className="my-3 text-sm">
    <p>Custo: {product.cost_price == null ? 'Custo não informado' : `R$ ${Number(product.cost_price).toFixed(2)}`}</p>
    <p className={Number(product.margin_amount) < 0 ? 'text-red-600' : ''}>Margem estimada: {product.margin_amount == null ? 'Indisponível' : `R$ ${Number(product.margin_amount).toFixed(2)}`} / {product.margin_percent == null ? 'percentual indisponível' : `${product.margin_percent}%`}</p>
  </div>;
}

export function ProductPriceFields({ form, onChange }) {
  const set = (key, value) => onChange({ ...form, [key]: value });
  const previewPrice = Number(form.promotional_price || form.base_price || 0);
  const margin = form.cost_price === '' ? null : previewPrice - Number(form.cost_price);
  return <fieldset className="space-y-3">
    <label className="block">Custo unitário (R$) *<input aria-label="Custo unitário" className={inputClass} type="number" required min="0" max="99999999.99" step="0.01" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} /></label>
    <label className="block">Preço promocional (opcional)<input aria-label="Preço promocional" className={inputClass} type="number" min="0.01" step="0.01" value={form.promotional_price} onChange={(e) => set('promotional_price', e.target.value)} /></label>
    {form.promotional_price && <>
      <p className="text-sm">Horários de Brasília (America/Sao_Paulo).</p>
      <label className="block">Início da promoção<input className={inputClass} type="datetime-local" required value={form.promo_start} onChange={(e) => set('promo_start', e.target.value)} /></label>
      <label className="block">Fim da promoção<input className={inputClass} type="datetime-local" required value={form.promo_end} onChange={(e) => set('promo_end', e.target.value)} /></label>
    </>}
    <p className={margin < 0 ? 'text-sm text-red-600' : 'text-sm'}>Margem estimada {form.promotional_price ? 'durante a promoção' : 'no preço base'}: {margin == null ? 'Indisponível' : `R$ ${margin.toFixed(2)} / ${previewPrice ? `${(margin * 100 / previewPrice).toFixed(2)}%` : 'percentual indisponível'}`}</p>
    <p className="text-xs text-black/60">Preço e custo comuns a todas as variações. Estimativa sem frete, taxas, tributos ou cupons.</p>
  </fieldset>;
}

export function VariationFields({ rows, onChange, duplicate = false }) {
  const update = (index, key, value) => onChange(rows.map((r, i) => i === index ? { ...r, [key]: value } : r));
  return <fieldset className="space-y-4"><legend className="font-semibold">Variações</legend>
    <p className="text-sm">Sem tamanho/cor: mantenha uma linha “Único”, sem cor. SKU vazio será gerado automaticamente.</p>
    {rows.map((row, index) => <div key={row.source_id || index} className="space-y-2 rounded-lg border p-3">
      <label className="block">Tamanho<input aria-label={`Tamanho ${index + 1}`} className={inputClass} disabled={duplicate} value={row.size} onChange={(e) => update(index, 'size', e.target.value)} /></label>
      <label className="block">Cor<input aria-label={`Cor ${index + 1}`} className={inputClass} disabled={duplicate} placeholder="#RRGGBB ou nome" value={row.color} onChange={(e) => update(index, 'color', e.target.value)} /></label>
      <label className="block">{duplicate ? 'Novo SKU' : 'SKU'}<input aria-label={`SKU ${index + 1}`} className={inputClass} maxLength={100} value={row.sku} onChange={(e) => update(index, 'sku', e.target.value.toUpperCase())} /></label>
      <label className="block">Novo estoque inicial<input aria-label={`Estoque inicial ${index + 1}`} className={inputClass} type="number" min="0" step="1" value={row.stock_quantity} onChange={(e) => update(index, 'stock_quantity', e.target.value)} /></label>
      {!duplicate && rows.length > 1 && <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remover linha</button>}
    </div>)}
    {!duplicate && <button type="button" className="rounded-lg border px-4 py-2" onClick={() => onChange([...rows, { ...emptyVariation(), size: '' }])}>Adicionar combinação</button>}
  </fieldset>;
}

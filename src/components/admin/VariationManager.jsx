import { useState } from 'react';
import { getAccessToken } from '../../lib/authToken';
import { apiError, emptyVariation } from './productForm';

function VariationRow({ productId, variation, onSaved }) {
  const [row, setRow] = useState(variation || emptyVariation());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (remove = false) => {
    setSaving(true); setError('');
    try {
      const url = variation ? `/api/catalog/variations/${variation.id}/` : `/api/catalog/products/${productId}/variations/`;
      const body = variation ? { size: row.size, color: row.color } : { ...row, stock_quantity: Number(row.stock_quantity || 0) };
      const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
        method: remove ? 'DELETE' : variation ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' },
        ...(remove ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) throw new Error(apiError(await response.json()));
      if (!variation) setRow(emptyVariation());
      onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  return <div className="space-y-2 rounded-lg border p-3 text-sm">
    <label className="block">Tamanho<input className="w-full rounded border p-2" value={row.size} onChange={(e) => setRow({ ...row, size: e.target.value })} /></label>
    <label className="block">Cor<input className="w-full rounded border p-2" value={row.color} onChange={(e) => setRow({ ...row, color: e.target.value })} /></label>
    <label className="block">SKU<input className="w-full rounded border p-2" readOnly={!!variation} placeholder="Automático se vazio" value={row.sku} onChange={(e) => setRow({ ...row, sku: e.target.value.toUpperCase() })} /></label>
    {!variation && <label className="block">Estoque inicial<input className="w-full rounded border p-2" type="number" min="0" step="1" value={row.stock_quantity} onChange={(e) => setRow({ ...row, stock_quantity: e.target.value })} /></label>}
    <button type="button" disabled={saving} className="mr-3 underline" onClick={() => submit()}>{variation ? 'Salvar combinação' : 'Adicionar combinação'}</button>
    {variation && <button type="button" disabled={saving} className="text-red-600 underline" onClick={() => submit(true)}>Excluir</button>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
  </div>;
}
export default function VariationManager({ product, onSaved }) {
  return <section className="space-y-3 border-b px-7 py-5"><h3 className="font-semibold">Combinações de tamanho e cor</h3>
    <p className="text-sm">Preço e custo comuns ao produto. Para converter “Único” em uma combinação real, edite a linha existente primeiro.</p>
    {product.variations.map((v) => <VariationRow key={`${v.id}-${v.updated_at}`} productId={product.id} variation={v} onSaved={onSaved} />)}
    <h4 className="font-semibold">Nova combinação</h4><VariationRow productId={product.id} onSaved={onSaved} />
  </section>;
}

import { pricePayload, apiError, toSaoPauloInput } from '../../../components/admin/productForm';
import { ProductPriceFields } from '../../../components/admin/ProductFields';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { AdminPanel, Icon } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getResults = (apiResponse) => {
  if (!apiResponse) return [];
  return Array.isArray(apiResponse) ? apiResponse : apiResponse.results || [];
};

const labelClass = 'text-[15px] uppercase text-shio-muted';
const inputClass = 'mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black';
const selectClass = 'mt-3 h-12 w-full rounded-full border border-black/25 bg-white px-7 text-[16px] outline-none focus:border-black';

// Os dados atuais viram o estado inicial do formulário (mesmos campos da criação).
const initialForm = (product) => ({
  name: product.name || '',
  description: product.description || '',
  base_price: product.base_price ?? '',
  cost_price: product.cost_price ?? '',
  promotional_price: product.promotional_price ?? '',
  promo_start: toSaoPauloInput(product.promo_start),
  promo_end: toSaoPauloInput(product.promo_end),
  drop: product.drop?.id ?? '',
  category: product.category?.id ?? '',
  is_active: product.is_active,
});

const EditProductForm = ({ productId, product }) => {
  const navigate = useNavigate();
  const { data: dropsResponse } = useApi('/api/catalog/drops/');
  const { data: categoriesResponse } = useApi('/api/catalog/categories/');
  const [form, setForm] = useState(() => initialForm(product));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const drops = getResults(dropsResponse);
  const categories = getResults(categoriesResponse);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const detailUrl = `/admin/products/${productId}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Token de autenticação não encontrado.');

      const response = await fetch(`${API_BASE_URL}/api/catalog/products/${productId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          base_price: form.base_price,
          ...pricePayload(form),
          drop: form.drop || null,
          category: form.category || null,
          is_active: form.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // O backend responde {"error": ..., "details": {campo: motivo}}: mostra o motivo.
        throw new Error(apiError(errorData.details ?? errorData) || 'Falha ao salvar o produto.');
      }

      navigate(detailUrl);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            aria-label="Voltar para produtos"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition hover:bg-black/5"
          >
            <Icon name="arrowLeft" className="h-6 w-6 md:h-7 md:w-7" />
          </button>
          <h1 className="text-[24px] font-black uppercase leading-tight text-black md:text-[34px] lg:text-[42px]">Editar Produto</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(detailUrl)}
          aria-label="Fechar"
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition hover:bg-black/5"
        >
          <Icon name="x" className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      </div>

      <AdminPanel className="mx-auto max-w-[650px] p-5 md:p-9">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <label>
            <span className={labelClass}>Nome do produto</span>
            <input type="text" value={form.name} onChange={set('name')} placeholder="Ex: Moletom" required className={inputClass} />
          </label>

          <label>
            <span className={labelClass}>Preço (R$)</span>
            <input type="number" min="0" step="0.01" value={form.base_price} onChange={set('base_price')} placeholder="0.00" required className={inputClass} />
          </label>

          <ProductPriceFields form={form} onChange={setForm} />

          <div className="grid gap-6 md:grid-cols-2">
            <label>
              <span className={labelClass}>Drop (Coleção)</span>
              <select value={form.drop} onChange={set('drop')} className={selectClass}>
                <option value="">Sem drop</option>
                {drops.map((drop) => <option key={drop.id} value={drop.id}>{drop.name}</option>)}
              </select>
            </label>

            <label>
              <span className={labelClass}>Categoria</span>
              <select value={form.category} onChange={set('category')} className={selectClass}>
                <option value="">Sem categoria</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span className={labelClass}>Status</span>
            <select
              value={form.is_active ? 'true' : 'false'}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}
              className={selectClass}
            >
              <option value="true">Ativo</option>
              <option value="false">Rascunho</option>
            </select>
          </label>

          <label>
            <span className={labelClass}>Descrição (Opcional)</span>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Descrição do produto"
              className="mt-3 min-h-[135px] w-full rounded-[18px] border border-black/25 px-7 py-4 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>

          {/* Imagens e tamanhos ainda só aparecem aqui; a edição deles entra nas próximas etapas da issue #79. */}
          {product.images?.length > 0 && (
            <div>
              <span className={labelClass}>Imagens</span>
              <ul aria-label="Imagens do produto" className="mt-3 flex flex-wrap gap-3">
                {product.images.map((image, index) => (
                  <li key={image.id}>
                    <img src={image.image} alt={`Imagem ${index + 1}${index === 0 ? ' (principal)' : ''}`} className="h-20 w-20 rounded-[10px] border border-black/15 object-cover" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.variations?.length > 0 && (
            <div>
              <span className={labelClass}>Tamanhos</span>
              <ul aria-label="Tamanhos do produto" className="mt-3 flex flex-wrap gap-2">
                {product.variations.map((v) => (
                  <li key={v.id} className={`rounded-full border px-4 py-2 text-[14px] font-medium ${v.is_active === false ? 'border-dashed border-black/30 text-shio-muted' : 'border-black/20 text-black'}`}>
                    {v.size}{v.color ? ` / ${v.color}` : ''} — {v.stock_quantity ?? 0} un.{v.is_active === false ? ' (inativo)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitError && <p role="alert" className="text-center text-sm font-semibold text-shio-danger">{submitError}</p>}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-5">
            <button
              type="button"
              onClick={() => navigate(detailUrl)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-black/25 text-[13px] font-bold uppercase text-shio-muted transition hover:border-black hover:text-black sm:h-11 sm:w-auto sm:min-w-[195px] sm:rounded-[8px] sm:text-[15px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              aria-disabled={isSubmitting || undefined}
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-black text-[13px] font-bold uppercase text-white transition hover:bg-black/85 aria-disabled:cursor-not-allowed aria-disabled:bg-black/45 sm:h-11 sm:w-auto sm:min-w-[220px] sm:rounded-[8px] sm:gap-4 sm:px-7 sm:text-[15px]"
            >
              <Icon name="save" className="h-5 w-5" />
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
};

const EditProductPage = () => {
  const { id: productId } = useParams();
  const { data: product, loading, error } = useApi(`/api/catalog/products/${productId}/`);

  if (loading) return <div className="p-8 text-center">Carregando dados do produto...</div>;
  if (error) return <div className="p-8 text-center text-shio-danger">Erro ao carregar os dados. Verifique o ID e tente novamente.</div>;
  if (!product) return <div className="p-8 text-center">Produto não encontrado.</div>;

  // key: se o id da URL mudar, o formulário recomeça com os dados do novo produto.
  return <EditProductForm key={productId} productId={productId} product={product} />;
};

export default EditProductPage;

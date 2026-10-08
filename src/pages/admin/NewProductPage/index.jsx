import { emptyVariation, pricePayload, apiError } from '../../../components/admin/productForm';
import { ProductPriceFields, VariationFields } from '../../../components/admin/ProductFields';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { AdminPanel, Icon, PageMarker } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getResults = (apiResponse) => {
  if (!apiResponse) return [];
  return Array.isArray(apiResponse) ? apiResponse : apiResponse.results || [];
};

const NewProductPage = () => {
  const navigate = useNavigate();
  const { data: dropsResponse } = useApi('/api/catalog/drops/');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [pricing, setPricing] = useState({ cost_price: '', promotional_price: '', promo_start: '', promo_end: '' });
  const [variations, setVariations] = useState([emptyVariation()]);
  const [dropId, setDropId] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
    const oversized = files.length - valid.length;
    if (oversized > 0) setSubmitError(`${oversized} imagem(ns) ignorada(s) por exceder 5MB.`);
    setImages((prev) => [...prev, ...valid.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    event.target.value = '';
  };

  const removeImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const drops = getResults(dropsResponse);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setShowSuccess(false);


    const productData = {
      name,
      description,
      base_price: price || '0',
      drop: dropId || null,
      is_active: true,
      ...pricePayload(pricing),
      variations: variations.map((v) => ({ ...v, stock_quantity: Number(v.stock_quantity || 0) })),
    };

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Token de autenticação não encontrado.');

      const response = await fetch(`${API_BASE_URL}/api/catalog/products/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(apiError(errorData) || 'Falha ao criar o produto.');
      }

      const product = await response.json();

      for (const { file } of images) {
        const formData = new FormData();
        formData.append('image', file);
        await fetch(`${API_BASE_URL}/api/catalog/products/${product.id}/images/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
      }

      setShowSuccess(true);
      setTimeout(() => navigate('/admin/products'), 900);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageMarker name="NewProductPage" />
      {showSuccess && (
        <div className="mb-4 flex h-12 items-center gap-3 rounded-[12px] bg-[#b6edc8] px-5 text-[14px] font-bold uppercase text-[#1da64a] md:h-[72px] md:gap-4 md:px-8 md:text-[18px]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#1da64a] text-[#1da64a] md:h-8 md:w-8">✓</span>
          Produto salvo com sucesso!
        </div>
      )}

      <div className="mb-8 flex items-center gap-5 md:gap-7">
        <Link to="/admin/products" aria-label="Voltar para produtos" className="text-black transition hover:text-black/60">
          <Icon name="arrowLeft" className="h-6 w-6 md:h-7 md:w-7" />
        </Link>
        <h1 className="text-[24px] font-black uppercase leading-tight text-black md:text-[34px] lg:text-[42px]">Novo Produto</h1>
      </div>

      <AdminPanel className="mx-auto max-w-[650px] p-9">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <label>
            <span className="text-[15px] uppercase text-black/55">Nome do produto</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Moletom"
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-black/45 focus:border-black"
            />
          </label>

          <div className="grid gap-8 md:grid-cols-2">
            <label>
              <span className="text-[15px] uppercase text-black/55">Preço (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
                required
                className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-black/45 focus:border-black"
              />
            </label>

          </div>
          <ProductPriceFields form={{ ...pricing, base_price: price }} onChange={setPricing} />
          <VariationFields rows={variations} onChange={setVariations} />

          <label>
            <span className="text-[15px] uppercase text-black/55">Drop (Coleção)</span>
            <select
              value={dropId}
              onChange={(event) => setDropId(event.target.value)}
              className="mt-3 h-12 w-full rounded-full border border-black/25 bg-white px-7 text-[16px] text-black/65 outline-none focus:border-black"
            >
              <option value="">Selecione um drop...</option>
              {drops.map((drop) => (
                <option key={drop.id} value={drop.id}>{drop.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-[15px] uppercase text-black/55">Descrição (Opcional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição do produto"
              className="mt-3 min-h-[135px] w-full rounded-[18px] border border-black/25 px-7 py-4 text-[16px] outline-none placeholder:text-black/45 focus:border-black"
            />
          </label>

          <div>
            <span className="text-[15px] uppercase text-black/55">Imagens (Opcional)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex h-[88px] w-full items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/25 text-[15px] text-black/45 transition hover:border-black/50 hover:text-black/65"
            >
              <Icon name="plus" className="h-5 w-5" />
              Adicionar imagens
            </button>
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map(({ preview }, index) => (
                  <div key={preview} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border border-black/15">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label="Remover imagem"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
                    >
                      <Icon name="close" className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && <p className="text-center text-sm font-semibold text-red-500">{submitError}</p>}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-5">
            <Link
              to="/admin/products"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-black/25 text-[13px] font-bold uppercase text-black/55 transition hover:border-black hover:text-black sm:h-11 sm:w-auto sm:min-w-[195px] sm:rounded-[8px] sm:text-[15px]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-black text-[13px] font-bold uppercase text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/45 sm:h-11 sm:w-auto sm:min-w-[220px] sm:rounded-[8px] sm:gap-4 sm:px-7 sm:text-[15px]"
            >
              <Icon name="save" className="h-5 w-5" />
              {isSubmitting ? 'Salvando...' : 'Salvar produto'}
            </button>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
};

export default NewProductPage;

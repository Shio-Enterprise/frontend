import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { PageMarker, ProductCard, SectionTitle } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';
import { useCart } from '../../../context/CartContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const toCardShape = (p) => ({
  id: p.id,
  name: p.name,
  price: `R$ ${Number(p.base_price).toFixed(2)}`,
  image: p.images?.[0]?.image ?? null,
  rating: null,
});

const ProductDetailContent = ({ id }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedVarId, setSelectedVarId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState(false);
  const { cartItems, setCartData } = useCart();

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/api/catalog/products/${id}/`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar produto');
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setProduct(data);
        setActiveImage(0);
        if (data.variations?.length > 0) setSelectedVarId(data.variations[0].id);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotFound(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    fetch(`${API_BASE_URL}/api/catalog/products/${id}/recommendations/?page_size=4`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar recomendações');
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setRecommendations(data.results);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecommendationsError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecommendationsLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  const handleAddToCart = useCallback(async () => {
    if (!selectedVarId) return;
    setAddingToCart(true);
    setCartMsg(null);
    try {
      const token = getAccessToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/api/orders/cart/items/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ variation_id: selectedVarId, quantity }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.non_field_errors?.[0] || 'Falha ao adicionar ao carrinho.');
      }
      const cartData = await res.json();
      // Merge: garante que itens anteriores do contexto não sejam perdidos caso a
      // sessão tenha sido reiniciada (cookie ainda não persistido cross-origin).
      const responseItems = cartData.items ?? [];
      const addedItem = responseItems.find((i) => String(i.variation_id) === String(selectedVarId));
      if (addedItem) {
        const kept = cartItems.filter((i) => String(i.variation_id) !== String(selectedVarId));
        setCartData({ ...cartData, items: [...kept, addedItem] });
      } else {
        setCartData(cartData);
      }
      setCartMsg({ type: 'success', text: 'Adicionado ao carrinho!' });
    } catch (e) {
      setCartMsg({ type: 'error', text: e.message });
    } finally {
      setAddingToCart(false);
      setTimeout(() => setCartMsg(null), 3000);
    }
  }, [selectedVarId, quantity, cartItems, setCartData]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[400px] items-center justify-center text-black/40">Carregando produto...</div>
      </PublicLayout>
    );
  }

  if (notFound || !product) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-[1240px] px-6 py-20 text-center">
          <p className="text-[24px] font-bold text-black">Produto não encontrado.</p>
          <Link to="/" className="mt-6 inline-block text-black underline">Voltar à loja</Link>
        </div>
      </PublicLayout>
    );
  }

  const images = product.images ?? [];
  const currentImage = images[activeImage]?.image ?? null;
  const basePrice = Number(product.base_price ?? 0);
  const promoPrice = product.promotional_price ? Number(product.promotional_price) : null;
  const price = (promoPrice ?? basePrice).toFixed(2);
  const discount = promoPrice ? Math.round((1 - promoPrice / basePrice) * 100) : null;
  const selectedVariation = product.variations?.find((v) => v.id === selectedVarId);
  const totalStock = product.variations?.reduce((s, v) => s + (v.stock_quantity || 0), 0) ?? 0;

  return (
    <PublicLayout>
      <PageMarker name="ProductDetailPage" />

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[570px_1fr]">
          {/* Image gallery */}
          <div className="grid gap-5 sm:grid-cols-[132px_1fr]">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-1">
              {images.length > 0 ? images.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImage(i)}
                  className={`overflow-hidden rounded-[2px] bg-[#f0efed] ring-2 transition ${i === activeImage ? 'ring-black' : 'ring-transparent'}`}>
                  <img src={img.image} alt="" className="aspect-square w-full object-cover" />
                </button>
              )) : (
                <div className="overflow-hidden rounded-[2px] bg-[#f0efed]">
                  <div className="aspect-square w-full" />
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-[8px] bg-[#f0efed]">
              {currentImage ? (
                <img src={currentImage} alt={product.name} className="h-full min-h-[420px] w-full object-cover" />
              ) : (
                <div className="h-full min-h-[420px] w-full bg-[#f0efed]" />
              )}
            </div>
          </div>

          {/* Product info */}
          <div>
            <h1 className="text-[36px] font-black leading-tight text-black md:text-[42px]">{product.name}</h1>

            {product.category?.name && (
              <p className="mt-2 text-[14px] font-semibold uppercase text-black/45">{product.category.name}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-[32px] font-bold text-black">R$ {price}</span>
              {promoPrice && (
                <span className="text-[22px] font-bold text-black/35 line-through">R$ {basePrice.toFixed(2)}</span>
              )}
              {discount && (
                <span className="rounded-full bg-[#ffebeb] px-4 py-1 text-sm font-semibold text-[#ff3333]">-{discount}%</span>
              )}
              {totalStock === 0 && (
                <span className="rounded-full bg-red-50 px-4 py-1 text-sm font-medium text-[#ff3333]">Esgotado</span>
              )}
            </div>

            {product.description && (
              <p className="mt-4 max-w-[620px] border-b border-black/10 pb-6 text-[16px] leading-7 text-black/55">
                {product.description}
              </p>
            )}

            {/* Size selector */}
            {product.variations?.length > 0 && (
              <div className="border-b border-black/10 py-6">
                <p className="mb-4 text-[15px] text-black/55">Tamanho</p>
                <div className="flex flex-wrap gap-3">
                  {product.variations.map((v) => (
                    <button key={v.id} onClick={() => setSelectedVarId(v.id)}
                      disabled={v.stock_quantity === 0}
                      className={`min-w-[80px] rounded-full px-6 py-3 text-sm font-medium transition disabled:opacity-40 ${v.id === selectedVarId ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black/55 hover:bg-black/10'}`}>
                      {v.size}
                      {v.stock_quantity === 0 && ' (esgotado)'}
                    </button>
                  ))}
                </div>
                {selectedVariation && (
                  <p className="mt-3 text-[13px] text-black/45">
                    {selectedVariation.stock_quantity > 0
                      ? `${selectedVariation.stock_quantity} unidades em estoque`
                      : 'Sem estoque para este tamanho'}
                  </p>
                )}
              </div>
            )}

            {/* Quantity + Add to cart */}
            <div className="mt-6 grid gap-4 sm:grid-cols-[160px_1fr]">
              <div className="flex h-12 items-center justify-between rounded-full bg-[#f0f0f0] px-4">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-full text-[20px] font-bold hover:bg-black/10">−</button>
                <span className="text-[16px] font-semibold">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-[20px] font-bold hover:bg-black/10">+</button>
              </div>
              <button onClick={handleAddToCart} disabled={addingToCart || !selectedVarId || totalStock === 0}
                className="inline-flex h-12 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-black/85 disabled:bg-black/40">
                {addingToCart ? 'Adicionando...' : 'Adicionar ao Carrinho'}
              </button>
            </div>

            {cartMsg && (
              <p className={`mt-3 text-sm font-semibold ${cartMsg.type === 'success' ? 'text-[#10a545]' : 'text-[#ff3333]'}`}>
                {cartMsg.text}
              </p>
            )}

            {product.drop?.name && (
              <p className="mt-4 text-[14px] text-black/40">Drop: {product.drop.name}</p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] border-t border-black/10 px-6 py-16">
        <SectionTitle>Recomendações para você</SectionTitle>
        {recommendationsLoading ? (
          <p role="status" className="mt-10 text-center text-black/50">Carregando recomendações...</p>
        ) : recommendationsError ? (
          <p role="alert" className="mt-10 text-center text-black/50">Não foi possível carregar as recomendações.</p>
        ) : recommendations.length === 0 ? (
          <p className="mt-10 text-center text-black/50">Nenhuma recomendação disponível no momento.</p>
        ) : (
          <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map(toCardShape).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </PublicLayout>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  return <ProductDetailContent key={id} id={id} />;
};

export default ProductDetailPage;

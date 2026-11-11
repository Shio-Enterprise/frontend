import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { ProductCard, Rating, SectionTitle } from '../../../components/ui/ShioDesign';
import ProductReviews from '../../../components/reviews/ProductReviews';
import SizeGuideTable from '../../../components/product/SizeGuideTable';
import ProductGallery from '../../../components/product/ProductGallery';
import { getAccessToken } from '../../../lib/authToken';
import { EVENT_TYPES, trackEvent } from '../../../lib/analytics';
import { useCart } from '../../../context/CartContext';
import {
  createStockAlert, getPendingStockAlertVariationIds, stockAlertErrorMessage,
} from '../../../lib/stockAlertsApi';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const toCardShape = (p) => ({
  id: p.id,
  name: p.name,
  price: `R$ ${Number(p.effective_price ?? p.base_price).toFixed(2)}`,
  oldPrice: p.is_promotion_active ? `R$ ${Number(p.base_price).toFixed(2)}` : null,
  discount: p.is_promotion_active ? `-${Math.round((1 - Number(p.effective_price) / Number(p.base_price)) * 100)}%` : null,
  image: p.images?.[0]?.image ?? null,
  ratingAvg: p.rating_avg ?? 0,
  ratingCount: p.rating_count ?? 0,
  unavailable: p.is_sellable === false,
});

const ProductDetailContent = ({ id }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedVarId, setSelectedVarId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState(false);
  const [pendingAlertIds, setPendingAlertIds] = useState([]);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState(null);
  const { cartItems, setCartData } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  // Mesmo critério do ProtectedRoute: token de acesso válido (o user fica no
  // localStorage mesmo depois que o token expira).
  const isLoggedIn = Boolean(getAccessToken());

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    getPendingStockAlertVariationIds()
      .then((ids) => { if (!cancelled) setPendingAlertIds(ids.map(String)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

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
        if (data.variations?.length > 0) setSelectedVarId(data.variations[0].id);
        trackEvent(EVENT_TYPES.PRODUCT_VIEW, { productId: data.id });
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

  const productId = product?.id;

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
        // CartItemAddAPIView devolve {"message": "..."} para itens que
        // deixaram de ser vendáveis (drop oculto/esgotado) ou sem estoque.
        throw new Error(err.message || err.detail || err.non_field_errors?.[0] || 'Falha ao adicionar ao carrinho.');
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
      trackEvent(EVENT_TYPES.ADD_TO_CART, { productId, variationId: selectedVarId });
    } catch (e) {
      setCartMsg({ type: 'error', text: e.message });
    } finally {
      setAddingToCart(false);
      setTimeout(() => setCartMsg(null), 3000);
    }
  }, [selectedVarId, quantity, cartItems, setCartData, productId]);

  const handleStockAlert = async () => {
    if (!selectedVarId) return;
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setAlertSaving(true);
    setAlertError(null);
    try {
      await createStockAlert(selectedVarId);
      setPendingAlertIds((ids) => [...ids, String(selectedVarId)]);
    } catch (e) {
      if (e?.response?.status === 401) {
        navigate('/login', { state: { from: location } });
      } else {
        setAlertError(stockAlertErrorMessage(e));
      }
    } finally {
      setAlertSaving(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div role="status" className="flex min-h-[400px] items-center justify-center text-shio-muted">Carregando produto...</div>
      </PublicLayout>
    );
  }

  if (notFound || !product) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-[1240px] px-6 py-20 text-center">
          <h1 className="text-[24px] font-bold text-black">Produto não encontrado.</h1>
          <Link to="/" className="mt-6 inline-block text-black underline">Voltar à loja</Link>
        </div>
      </PublicLayout>
    );
  }

  const basePrice = Number(product.base_price ?? 0);
  const promoPrice = product.is_promotion_active ? Number(product.effective_price) : null;
  const price = (Number(product.effective_price ?? basePrice)).toFixed(2);
  const discount = promoPrice ? Math.round((1 - promoPrice / basePrice) * 100) : null;
  const selectedVariation = product.variations?.find((v) => v.id === selectedVarId);
  const anyInStock = product.variations?.some((v) => v.in_stock) ?? false;
  // Um produto pode ser visível (por isso a página carregou) e ainda assim
  // não vendável — drop Rascunho, Programado, Encerrado ou Esgotado (issue
  // #6). Distinto de "Esgotado" (estoque zerado na variação).
  const notSellable = product.is_sellable === false;
  const variationOutOfStock = Boolean(selectedVariation) && !selectedVariation.in_stock;
  const showStockAlert = variationOutOfStock && !notSellable;
  const alertPending = showStockAlert && pendingAlertIds.includes(String(selectedVarId));

  return (
    <PublicLayout>

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[570px_minmax(0,1fr)]">
          {/* Image gallery */}
          <ProductGallery images={product.images ?? []} productName={product.name} />

          {/* Product info */}
          <div>
            <h1 className="text-[36px] font-black leading-tight text-black md:text-[42px]">{product.name}</h1>

            {product.category?.name && (
              <p className="mt-2 text-[14px] font-semibold uppercase text-shio-muted">{product.category.name}</p>
            )}

            {Number(product.rating_count) > 0 && (
              <div className="mt-3">
                <Rating value={product.rating_avg} count={product.rating_count} />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-[32px] font-bold text-black">R$ {price}</span>
              {promoPrice && (
                <span className="text-[22px] font-bold text-shio-muted line-through">R$ {basePrice.toFixed(2)}</span>
              )}
              {discount && (
                <span className="rounded-full bg-[#ffebeb] px-4 py-1 text-sm font-semibold text-shio-danger">-{discount}%</span>
              )}
              {!anyInStock && (
                <span className="rounded-full bg-red-50 px-4 py-1 text-sm font-medium text-shio-danger">Esgotado</span>
              )}
              {notSellable && (
                <span className="rounded-full bg-black/5 px-4 py-1 text-sm font-medium text-shio-muted">Indisponível para compra</span>
              )}
            </div>

            {product.description && (
              <p className="mt-4 max-w-[620px] border-b border-black/10 pb-6 text-[16px] leading-7 text-shio-muted">
                {product.description}
              </p>
            )}

            {/* Size selector */}
            {product.variations?.length > 0 && (
              <div className="border-b border-black/10 py-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p id="variacoes-titulo" className="text-[15px] text-shio-muted">Tamanho e cor</p>
                  {product.size_guide && (
                    <a href="#tabela-de-medidas" className="text-[13px] font-semibold text-black underline">
                      Tabela de medidas
                    </a>
                  )}
                </div>
                <div role="group" aria-labelledby="variacoes-titulo" className="flex flex-wrap gap-3">
                  {product.variations.map((v) => (
                    // Esgotado continua clicável (abre o "Avise-me"); a borda tracejada substitui a
                    // transparência, que deixava o texto sem contraste.
                    <button key={v.id} type="button" aria-pressed={v.id === selectedVarId}
                      onClick={() => { setSelectedVarId(v.id); setAlertError(null); }}
                      className={`min-h-11 min-w-[80px] rounded-full px-6 py-3 text-sm font-medium transition ${v.id === selectedVarId ? 'bg-black text-white' : `bg-[#f0f0f0] text-shio-muted hover:bg-black/10 ${!v.in_stock ? 'border border-dashed border-shio-muted' : ''}`}`}>
                      {v.size}{v.color ? ` / ${v.color}` : ''}
                      {!v.in_stock && ' (esgotado)'}
                    </button>
                  ))}
                </div>
                <p aria-live="polite" className="mt-3 text-[13px] text-shio-muted empty:hidden">
                  {variationOutOfStock ? 'Sem estoque para este tamanho' : ''}
                </p>
              </div>
            )}

            {/* Quantity + Add to cart / Avise-me */}
            {showStockAlert ? (
              <div className="mt-6">
                {alertPending ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex h-12 items-center justify-center rounded-full bg-[#f0f0f0] px-8 text-sm font-medium text-black">Você já será avisado</span>
                    <Link to="/my-stock-alerts" className="text-sm text-black underline">Ver meus avisos</Link>
                  </div>
                ) : (
                  <button type="button" onClick={handleStockAlert} disabled={alertSaving}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-black/85 disabled:bg-black/40">
                    Avise-me quando chegar
                  </button>
                )}
                {alertError && <p role="alert" className="mt-3 text-sm font-semibold text-shio-danger">{alertError}</p>}
              </div>
            ) : (
              <>
            <div className="mt-6 grid gap-4 sm:grid-cols-[160px_1fr]">
              <div role="group" aria-label="Quantidade" className="flex h-12 items-center justify-between rounded-full bg-[#f0f0f0] px-1">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Diminuir quantidade" className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-bold hover:bg-black/10 disabled:opacity-40"><span aria-hidden="true">−</span></button>
                <span aria-live="polite" className="text-[16px] font-semibold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Aumentar quantidade" className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-bold hover:bg-black/10"><span aria-hidden="true">+</span></button>
              </div>
              <button type="button" onClick={handleAddToCart} disabled={addingToCart || !selectedVarId || !anyInStock || notSellable}
                className="inline-flex h-12 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-black/85 disabled:bg-black/40">
                {addingToCart ? 'Adicionando...' : notSellable ? 'Indisponível' : 'Adicionar ao Carrinho'}
              </button>
            </div>

              </>
            )}

            {/* Região sempre montada: o leitor de tela só anuncia mudanças numa região que já existia. */}
            <div role="status" className={cartMsg ? 'mt-3' : ''}>
              {cartMsg && (
                <p className={`text-sm font-semibold ${cartMsg.type === 'success' ? 'text-shio-success' : 'text-shio-danger'}`}>
                  {cartMsg.text}
                </p>
              )}
            </div>

            {product.drop?.name && (
              <Link to={`/drop/${product.drop.slug}`} className="mt-4 inline-block text-[14px] text-shio-muted underline hover:text-black/70">
                Drop: {product.drop.name}
              </Link>
            )}
          </div>
        </div>
      </section>

      {product.size_guide && <SizeGuideTable id="tabela-de-medidas" guide={product.size_guide} />}

      <ProductReviews productId={product.id} />

      <section className="mx-auto max-w-[1240px] border-t border-black/10 px-6 py-16">
        <SectionTitle>Recomendações para você</SectionTitle>
        {recommendationsLoading ? (
          <p role="status" className="mt-10 text-center text-shio-muted">Carregando recomendações...</p>
        ) : recommendationsError ? (
          <p role="alert" className="mt-10 text-center text-shio-muted">Não foi possível carregar as recomendações.</p>
        ) : recommendations.length === 0 ? (
          <p className="mt-10 text-center text-shio-muted">Nenhuma recomendação disponível no momento.</p>
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

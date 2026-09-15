import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';
import { useCart } from '../../../context/CartContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CartPage = () => {
  const { cartItems, setCartData, refreshCart } = useCart();
  const [updating, setUpdating] = useState(null);
  const [productImages, setProductImages] = useState({});

  useEffect(() => {
    if (cartItems.length === 0) return;
    const ids = [...new Set(cartItems.map((i) => i.product_id).filter(Boolean))];
    Promise.all(
      ids.map((id) =>
        fetch(`${API_BASE_URL}/api/catalog/products/${id}/`)
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then((results) => {
      const map = {};
      results.forEach((p) => {
        if (p?.id && p.images?.[0]?.image) map[p.id] = p.images[0].image;
      });
      setProductImages(map);
    });
  }, [cartItems]);

  const handleQuantity = async (variationId, newQty) => {
    if (newQty < 1) return;
    setUpdating(variationId);
    const res = await fetch(`${API_BASE_URL}/api/orders/cart/items/${variationId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ quantity: newQty }),
      credentials: 'include',
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setCartData(data);
    } else {
      refreshCart();
    }
    setUpdating(null);
  };

  const handleRemove = async (variationId) => {
    setUpdating(variationId);
    const res = await fetch(`${API_BASE_URL}/api/orders/cart/items/${variationId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setCartData(data);
    } else {
      refreshCart();
    }
    setUpdating(null);
  };

  const items = cartItems;
  const subtotal = items.reduce((s, i) => s + i.quantity * parseFloat(i.unit_price ?? 0), 0);
  const unavailableItems = items.filter((i) => i.is_sellable === false);
  const hasUnavailableItems = unavailableItems.length > 0;

  return (
    <PublicLayout>
      <PageMarker name="CartPage" />

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <h1 className="mb-8 text-[42px] font-black uppercase leading-tight text-black">Carrinho</h1>

        {hasUnavailableItems && (
          <div className="mb-6 rounded-[14px] bg-[#fff5f5] px-6 py-4 text-[14px] font-semibold text-[#cc0000]">
            {unavailableItems.length === 1
              ? 'Um item do seu carrinho não está mais disponível para compra.'
              : `${unavailableItems.length} itens do seu carrinho não estão mais disponíveis para compra.`}
            {' '}Remova-o{unavailableItems.length > 1 ? 's' : ''} para continuar.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_505px]">
            {/* Items */}
            <div className="rounded-[20px] border border-black/10 p-6">
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[20px] text-black/45">Seu carrinho está vazio.</p>
                  <Link to="/" className="mt-4 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white">
                    Ver produtos
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-black/10">
                  {items.map((item) => {
                    const unavailable = item.is_sellable === false;
                    return (
                    <article key={item.variation_id} className={`grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[124px_1fr_auto] ${unavailable ? 'opacity-60' : ''}`}>
                      <div className="h-[124px] w-[124px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0efed]">
                        {productImages[item.product_id] && (
                          <img
                            src={productImages[item.product_id]}
                            alt={item.product_name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-[20px] font-bold text-black">{item.product_name}</h2>
                            <p className="mt-1 text-[14px] text-black/60">Tamanho: {item.size}</p>
                            <p className="text-[14px] text-black/60">SKU: {item.sku}</p>
                            {unavailable && (
                              <p className="mt-1 text-[13px] font-semibold text-[#cc0000]">Indisponível para compra</p>
                            )}
                          </div>
                          <button onClick={() => handleRemove(item.variation_id)} disabled={updating === item.variation_id}
                            className="text-[#ff3333] transition hover:text-[#cc0000] disabled:opacity-40"
                            aria-label={`Remover ${item.product_name}`}>
                            <Icon name="trash" className="h-5 w-5" />
                          </button>
                        </div>
                        <p className="mt-5 text-[24px] font-bold text-black">
                          R$ {Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-end justify-start sm:justify-end">
                        <div className={`flex h-11 items-center gap-3 rounded-full bg-[#f0f0f0] px-4 ${updating === item.variation_id ? 'opacity-50' : ''}`}>
                          <button onClick={() => handleQuantity(item.variation_id, item.quantity - 1)}
                            disabled={updating === item.variation_id || unavailable || item.quantity <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] font-bold hover:bg-black/10 disabled:opacity-40">−</button>
                          <span className="min-w-[20px] text-center text-[16px] font-semibold">{item.quantity}</span>
                          <button onClick={() => handleQuantity(item.variation_id, item.quantity + 1)}
                            disabled={updating === item.variation_id || unavailable}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] font-bold hover:bg-black/10 disabled:opacity-40">+</button>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            <aside className="rounded-[20px] border border-black/10 p-6">
              <h2 className="text-[24px] font-bold text-black">Order Summary</h2>
              <div className="mt-6 space-y-5 text-[20px]">
                <div className="flex justify-between text-black/60">
                  <span>Subtotal</span>
                  <strong className="text-black">R$ {subtotal.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-5 text-black/60">
                  <span>Entrega</span>
                  <strong className="text-black">A calcular</strong>
                </div>
                <div className="flex justify-between text-[24px] text-black">
                  <span>Total</span>
                  <strong>R$ {subtotal.toFixed(2)}</strong>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="flex h-12 items-center gap-3 rounded-full bg-[#f0f0f0] px-5 text-black/40">
                  <Icon name="tag" className="h-5 w-5 shrink-0" />
                  <input className="w-full bg-transparent text-sm outline-none placeholder:text-black/35" placeholder="Código promocional" />
                </label>
                <button className="h-12 rounded-full bg-black text-sm font-medium text-white">Aplicar</button>
              </div>

              <Link to={hasUnavailableItems ? '#' : '/payment'}
                aria-disabled={items.length === 0 || hasUnavailableItems}
                onClick={(e) => { if (items.length === 0 || hasUnavailableItems) e.preventDefault(); }}
                className={`mt-6 flex h-[60px] w-full items-center justify-center gap-4 rounded-full bg-black text-[16px] font-medium text-white transition hover:bg-black/85 ${items.length === 0 || hasUnavailableItems ? 'pointer-events-none opacity-40' : ''}`}>
                Finalizar compra
                <Icon name="arrowRight" className="h-5 w-5" />
              </Link>
              {hasUnavailableItems && (
                <p className="mt-3 text-center text-[13px] text-[#cc0000]">
                  Remova os itens indisponíveis para continuar.
                </p>
              )}
            </aside>
          </div>
      </section>
    </PublicLayout>
  );
};

export default CartPage;

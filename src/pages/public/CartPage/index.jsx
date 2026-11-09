import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { Icon } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';
import { useCart } from '../../../context/CartContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CartPage = () => {
  const { cartItems, welcomeDiscountEligible, welcomeDiscountAmount, setCartData, refreshCart } = useCart();
  const [updating, setUpdating] = useState(null);
  const [productImages, setProductImages] = useState({});
  // Leitor de tela: anuncia quantidade nova, remoção e falhas.
  const [liveMessage, setLiveMessage] = useState('');
  const headingRef = useRef(null);

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

  const handleQuantity = async (variationId, newQty, productName) => {
    if (newQty < 1 || updating) return;
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
      setLiveMessage(`Quantidade de ${productName}: ${newQty}.`);
    } else {
      refreshCart();
      setLiveMessage(`Não foi possível atualizar a quantidade de ${productName}.`);
    }
    setUpdating(null);
  };

  const handleRemove = async (variationId, productName) => {
    if (updating) return;
    setUpdating(variationId);
    const res = await fetch(`${API_BASE_URL}/api/orders/cart/items/${variationId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setCartData(data);
      setLiveMessage(`${productName} removido do carrinho.`);
      // O botão some junto com o item: o foco vai para o título da página.
      headingRef.current?.focus();
    } else {
      refreshCart();
      setLiveMessage(`Não foi possível remover ${productName}.`);
    }
    setUpdating(null);
  };

  const items = cartItems;
  const subtotal = items.reduce((s, i) => s + i.quantity * parseFloat(i.unit_price ?? 0), 0);
  const unavailableItems = items.filter((i) => i.is_sellable === false);
  const hasUnavailableItems = unavailableItems.length > 0;
  const discount = welcomeDiscountEligible ? parseFloat(welcomeDiscountAmount) : 0;
  const total = subtotal - discount;
  const checkoutBlocked = items.length === 0 || hasUnavailableItems;

  return (
    <PublicLayout>

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <h1 ref={headingRef} tabIndex={-1} className="mb-8 text-[42px] font-black uppercase leading-tight text-black">Carrinho</h1>
        <p role="status" data-testid="cart-live" className="sr-only">{liveMessage}</p>

        {hasUnavailableItems && (
          <div className="mb-6 rounded-[14px] bg-[#fff5f5] px-6 py-4 text-[14px] font-semibold text-shio-danger">
            {unavailableItems.length === 1
              ? 'Um item do seu carrinho não está mais disponível para compra.'
              : `${unavailableItems.length} itens do seu carrinho não estão mais disponíveis para compra.`}
            {' '}Remova-o{unavailableItems.length > 1 ? 's' : ''} para continuar.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_505px]">
            {/* Items */}
            <div className="rounded-[20px] border border-black/10 p-6">
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[20px] text-shio-muted">Seu carrinho está vazio.</p>
                  <Link to="/" className="mt-4 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white">
                    Ver produtos
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-black/10">
                  {items.map((item) => {
                    const unavailable = item.is_sellable === false;
                    // aria-disabled (não disabled) enquanto atualiza: o foco fica no botão.
                    const busy = updating === item.variation_id;
                    return (
                    <article key={item.variation_id} className="grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[124px_1fr_auto]">
                      {/* Só a foto esmaece: o texto do item indisponível mantém o contraste. */}
                      <div className={`h-[124px] w-[124px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0efed] ${unavailable ? 'opacity-60' : ''}`}>
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
                          <div className="min-w-0">
                            <h2 className="break-words text-[20px] font-bold text-black">{item.product_name}</h2>
                            <p className="mt-1 text-[14px] text-black/60">Tamanho: {item.size}</p>
                            <p className="break-all text-[14px] text-black/60">SKU: {item.sku}</p>
                            {unavailable && (
                              <p className="mt-1 text-[13px] font-semibold text-shio-danger">Indisponível para compra</p>
                            )}
                          </div>
                          <button type="button" onClick={() => handleRemove(item.variation_id, item.product_name)} aria-disabled={busy || undefined}
                            className="-m-3 flex h-11 w-11 shrink-0 items-center justify-center text-shio-danger transition hover:text-shio-danger-hover aria-disabled:opacity-40"
                            aria-label={`Remover ${item.product_name}`}>
                            <Icon name="trash" className="h-5 w-5" />
                          </button>
                        </div>
                        {item.is_promotion_active && <p className="mt-2 text-sm text-shio-muted"><s><span className="sr-only">Preço original: </span>R$ {Number(item.base_price).toFixed(2)}</s> — {Math.round((1 - Number(item.unit_price) / Number(item.base_price)) * 100)}% de desconto</p>}
                        <p className="mt-5 text-[24px] font-bold text-black">
                          R$ {Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-end justify-start sm:justify-end">
                        <div role="group" aria-label={`Quantidade de ${item.product_name}`}
                          aria-busy={busy}
                          className={`flex h-11 items-center gap-1 rounded-full bg-[#f0f0f0] ${busy ? 'opacity-50' : ''}`}>
                          <button type="button" onClick={() => handleQuantity(item.variation_id, item.quantity - 1, item.product_name)}
                            disabled={unavailable}
                            aria-disabled={busy || item.quantity <= 1 || undefined}
                            aria-label={`Diminuir quantidade de ${item.product_name}`}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-[18px] font-bold hover:bg-black/10 disabled:opacity-40 aria-disabled:opacity-40"><span aria-hidden="true">−</span></button>
                          <span className="min-w-[20px] text-center text-[16px] font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => handleQuantity(item.variation_id, item.quantity + 1, item.product_name)}
                            disabled={unavailable}
                            aria-disabled={busy || undefined}
                            aria-label={`Aumentar quantidade de ${item.product_name}`}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-[18px] font-bold hover:bg-black/10 disabled:opacity-40 aria-disabled:opacity-40"><span aria-hidden="true">+</span></button>
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
              <h2 className="text-[24px] font-bold text-black">Resumo do pedido</h2>
              <div className="mt-6 space-y-5 text-[20px]">
                <div className="flex justify-between text-black/60">
                  <span>Subtotal</span>
                  <strong className="text-black">R$ {subtotal.toFixed(2)}</strong>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-shio-success">
                    <span>Desconto de boas-vindas</span>
                    <strong>- R$ {discount.toFixed(2)}</strong>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/10 pb-5 text-black/60">
                  <span>Entrega</span>
                  <strong className="text-black">A calcular</strong>
                </div>
                <div className="flex justify-between text-[24px] text-black">
                  <span>Total</span>
                  <strong>R$ {total.toFixed(2)}</strong>
                </div>
              </div>

              <Link to={checkoutBlocked ? '#' : '/payment'}
                aria-disabled={checkoutBlocked}
                aria-describedby={hasUnavailableItems ? 'cart-blocked-reason' : undefined}
                onClick={(e) => { if (checkoutBlocked) e.preventDefault(); }}
                className={`mt-6 flex h-[60px] w-full items-center justify-center gap-4 rounded-full bg-black text-[16px] font-medium text-white transition hover:bg-black/85 ${checkoutBlocked ? 'pointer-events-none opacity-40' : ''}`}>
                Finalizar compra
                <Icon name="arrowRight" className="h-5 w-5" />
              </Link>

              {hasUnavailableItems && (
                <p id="cart-blocked-reason" className="mt-3 text-center text-[13px] text-shio-danger">
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

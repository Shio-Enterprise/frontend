import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';
import { useCart } from '../../../context/CartContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ─── Icons ────────────────────────────────────────────────────────────────────

const PixLogo = () => (
  <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
    <path d="M17.5 6.5L24 0L30.5 6.5L24 13L17.5 6.5Z" fill="black"/>
    <path d="M41.5 17.5L48 24L41.5 30.5L35 24L41.5 17.5Z" fill="black"/>
    <path d="M30.5 41.5L24 48L17.5 41.5L24 35L30.5 41.5Z" fill="black"/>
    <path d="M6.5 30.5L0 24L6.5 17.5L13 24L6.5 30.5Z" fill="black"/>
    <path d="M24 13L35 24L24 35L13 24L24 13Z" fill="black" opacity="0.15"/>
    <path d="M24 17L31 24L24 31L17 24L24 17Z" fill="black"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg viewBox="0 0 56 40" className="h-11 w-14" fill="none">
    <rect width="56" height="40" rx="5" fill="black"/>
    <rect y="11" width="56" height="11" fill="#222"/>
    <rect x="6" y="27" width="14" height="7" rx="2" fill="#444"/>
    <circle cx="44" cy="30" r="4" fill="#555"/>
    <circle cx="50" cy="30" r="4" fill="#333"/>
  </svg>
);

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ number, title, active, onClick, children }) {
  return (
    <div className="rounded-[16px] border border-black/10">
      <button type="button" onClick={onClick}
        className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
          active ? 'bg-black text-white' : 'bg-black/10 text-black/40'
        }`}>{number}</span>
        <h2 className={`text-[18px] font-black uppercase tracking-widest ${
          active ? 'text-black' : 'text-black/30'
        }`}>{title}</h2>
      </button>
      {active && (
        <div className="border-t border-black/10 px-5 pb-6 pt-4">{children}</div>
      )}
    </div>
  );
}

// ─── PaymentPage ──────────────────────────────────────────────────────────────

const PaymentPage = () => {
  const { refreshCart } = useCart();

  const [activeStep, setActiveStep] = useState(0);

  // Cart
  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [productImages, setProductImages] = useState({});

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Freight
  const [freightData, setFreightData] = useState(null);
  const [calculationError, setCalculationError] = useState(null);
  const [cartUpdating, setCartUpdating] = useState(false);
  const [quoteRequest, setQuoteRequest] = useState(0);
  const [expiredQuoteId, setExpiredQuoteId] = useState(null);
  const [confirmedQuoteId, setConfirmedQuoteId] = useState(null);

  // Profile
  const [userProfile, setUserProfile] = useState(null);

  // Checkout
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutAttempt, setCheckoutAttempt] = useState(null);
  const [retryReady, setRetryReady] = useState(true);
  const [quoteInvalidated, setQuoteInvalidated] = useState(false);
  const checkoutInFlight = useRef(false);
  const retryTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  const fetchCart = useCallback(() => {
    const token = getAccessToken();
    return fetch(`${API_BASE_URL}/api/orders/cart/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (r) => {
      if (!r.ok) throw new Error('Não foi possível carregar o carrinho.');
      const data = await r.json();
      setCart(data);
      const ids = [...new Set((data?.items ?? []).map((i) => i.product_id).filter(Boolean))];
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`${API_BASE_URL}/api/catalog/products/${id}/`)
            .then((res) => res.ok ? res.json() : null)
            .catch(() => null)
        )
      );
      const map = {};
      results.forEach((p) => { if (p?.id && p.images?.[0]?.image) map[p.id] = p.images[0].image; });
      setProductImages(map);
    }).catch(() => {
      setCheckoutError('Não foi possível carregar o carrinho.');
      setCart(null);
    });
  }, []);

  const fetchAddresses = useCallback(() => {
    const token = getAccessToken();
    if (!token) return Promise.resolve();
    return fetch(`${API_BASE_URL}/api/auth/addresses/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => {
      if (!r.ok) throw new Error('Não foi possível carregar os endereços.');
      const data = await r.json();
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setAddresses(list);
      const def = list.find((a) => a.is_default) ?? list[0] ?? null;
      setSelectedAddressId((current) => list.some((address) => address.id === current) ? current : def?.id ?? null);
    }).catch(() => {
      setCheckoutError('Não foi possível carregar os endereços.');
      setAddresses([]);
      setSelectedAddressId(null);
    });
  }, []);

  const fetchProfile = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    return fetch(`${API_BASE_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => {
      if (r.ok) {
        const profile = await r.json();
        setUserProfile(profile);
        const saved = sessionStorage.getItem(`checkout-attempt:${profile.id}`);
        if (saved) setCheckoutAttempt(JSON.parse(saved));
      }
    }).catch(() => {
      setCheckoutError('Não foi possível carregar o perfil.');
    });
  }, []);

  useEffect(() => {
    fetchCart().finally(() => setCartLoading(false));
    fetchAddresses().finally(() => setAddressesLoading(false));
    fetchProfile();
  }, [fetchCart, fetchAddresses, fetchProfile]);

  useEffect(() => {
    if (!selectedAddressId || !cart?.items?.length || cartUpdating || checkoutAttempt || quoteInvalidated) return;
    let cancelled = false;
    const token = getAccessToken();
    fetch(
      `${API_BASE_URL}/api/orders/checkout/calculate/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address_id: selectedAddressId }),
      }
    ).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.detail || 'Cálculo indisponível.');
      if (!data.shipping_quote_id || !Number.isFinite(Date.parse(data.expires_at))) {
        throw new Error('Não foi possível validar a cotação. Calcule novamente.');
      }
      if (!cancelled) {
        setFreightData({ ...data, addressId: selectedAddressId, cartSnapshot: cart });
        setCalculationError(null);
        setConfirmedQuoteId(null);
      }
    }).catch((error) => {
      if (!cancelled) setCalculationError({ message: error.message, addressId: selectedAddressId, cartSnapshot: cart });
    });
    return () => { cancelled = true; };
  }, [selectedAddressId, cart, cartUpdating, quoteRequest, checkoutAttempt, quoteInvalidated]);

  useEffect(() => {
    if (!freightData?.shipping_quote_id) return;
    const expire = () => setExpiredQuoteId(freightData.shipping_quote_id);
    const timer = window.setTimeout(expire, Math.max(0, Date.parse(freightData.expires_at) - Date.now()));
    const checkExpiry = () => {
      if (Date.parse(freightData.expires_at) <= Date.now()) expire();
    };
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [freightData]);

  const recalculateQuote = async () => {
    if (cartUpdating || submitting || checkoutAttempt) return;
    setFreightData(null);
    setCalculationError(null);
    setConfirmedQuoteId(null);
    setCartUpdating(true);
    setQuoteInvalidated(false);
    await Promise.all([fetchCart(), fetchAddresses()]);
    setCartUpdating(false);
    setQuoteRequest((value) => value + 1);
  };

  const handleSelectAddress = (id) => {
    if (checkoutAttempt || checkoutInFlight.current) return;
    setFreightData(null);
    setQuoteInvalidated(false);
    setCalculationError(null);
    setConfirmedQuoteId(null);
    setSelectedAddressId(id);
  };

  const handleQtyChange = async (itemId, newQty) => {
    if (cartUpdating || submitting || checkoutAttempt || checkoutInFlight.current) return;
    if (newQty < 1) { handleRemove(itemId); return; }
    const token = getAccessToken();
    setCartUpdating(true);
    setFreightData(null);
    setCalculationError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/cart/items/${itemId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!response.ok) throw new Error('Não foi possível atualizar a quantidade.');
      await fetchCart();
      refreshCart();
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCartUpdating(false);
    }
  };

  const handleRemove = async (itemId) => {
    if (cartUpdating || submitting || checkoutAttempt || checkoutInFlight.current) return;
    const token = getAccessToken();
    setCartUpdating(true);
    setFreightData(null);
    setCalculationError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/cart/items/${itemId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Não foi possível remover o produto.');
      await fetchCart();
      refreshCart();
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCartUpdating(false);
    }
  };

  const handleCheckout = async () => {
    if (checkoutInFlight.current || !retryReady || cartUpdating || !userProfile?.id) return;
    if (!checkoutAttempt && (!hasCalculation || !quoteConfirmed || freightLoading)) return;
    if (!checkoutAttempt && Date.parse(freightData.expires_at) <= Date.now()) {
      setExpiredQuoteId(freightData.shipping_quote_id);
      return;
    }
    setCheckoutError(null);
    if (!checkoutAttempt && !selectedAddressId) {
      setCheckoutError('Selecione um endereço de entrega.');
      return;
    }
    checkoutInFlight.current = true;
    setSubmitting(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('Você precisa estar logado.');
      const payload = checkoutAttempt ?? {
        address_id: selectedAddressId,
        shipping_quote_id: freightData.shipping_quote_id,
        idempotency_key: crypto.randomUUID(),
      };
      // Persistir antes do envio permite recuperar a mesma tentativa após perder a resposta.
      sessionStorage.setItem(`checkout-attempt:${userProfile.id}`, JSON.stringify(payload));
      setCheckoutAttempt(payload);

      const res = await fetch(`${API_BASE_URL}/api/orders/checkout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status === 400 && data.shipping_quote_id) {
        sessionStorage.removeItem(`checkout-attempt:${userProfile.id}`);
        setCheckoutAttempt(null);
        setQuoteInvalidated(true);
        setFreightData(null);
        setConfirmedQuoteId(null);
        setCalculationError({
          message: 'A cotação não é mais válida. Recalcule e confirme os valores antes de finalizar.',
          addressId: selectedAddressId,
          cartSnapshot: cart,
        });
        return;
      }
      if (res.status === 409 && data.code === 'checkout_already_started' && data.attempt) {
        sessionStorage.setItem(`checkout-attempt:${userProfile.id}`, JSON.stringify(data.attempt));
        setCheckoutAttempt(data.attempt);
        setCheckoutError(data.message);
        return;
      }
      if (res.status === 202) {
        const retrySeconds = Number(res.headers?.get('Retry-After')) || 3;
        setRetryReady(false);
        retryTimer.current = window.setTimeout(() => setRetryReady(true), Math.min(60, Math.max(1, retrySeconds)) * 1000);
        setCheckoutError(data.message || 'Seu checkout está sendo processado. Consulte a mesma tentativa novamente.');
        return;
      }
      if (!res.ok) throw new Error(data.message || data.detail || 'Falha ao processar o pedido.');
      refreshCart();
      if (data.checkout_url) {
        sessionStorage.removeItem(`checkout-attempt:${userProfile.id}`);
        window.location.assign(data.checkout_url);
      } else {
        throw new Error('Não foi possível abrir o pagamento.');
      }
    } catch (e) {
      setCheckoutError(e.message);
    } finally {
      checkoutInFlight.current = false;
      setSubmitting(false);
    }
  };

  const quoteExpired = freightData?.shipping_quote_id && expiredQuoteId === freightData.shipping_quote_id;
  const hasCalculation = Boolean(freightData?.shipping_quote_id && freightData?.addressId === selectedAddressId
    && freightData?.cartSnapshot === cart && !cartUpdating && !quoteExpired);
  const quoteConfirmed = hasCalculation && confirmedQuoteId === freightData.shipping_quote_id;
  const freightError = quoteExpired ? 'Cotação expirada. Recalcule e confirme os valores novamente.'
    : calculationError?.addressId === selectedAddressId
      && calculationError?.cartSnapshot === cart ? calculationError.message : null;
  const freightLoading = Boolean(selectedAddressId && cart?.items?.length && !hasCalculation && !freightError);
  const items = (hasCalculation ? freightData.items : cart?.items) ?? [];
  const subtotal = hasCalculation ? Number(freightData.subtotal) : null;
  const FRETE = hasCalculation ? Number(freightData.shipping_cost) : null;
  const total = hasCalculation ? Number(freightData.total_amount) : null;
  const selectedAddress = selectedAddressId ? {
    ...addresses.find((a) => a.id === selectedAddressId),
    ...(hasCalculation ? freightData.address : {}),
  } : null;

  return (
    <PublicLayout>
      <PageMarker name="PaymentPage" />

      <section className="mx-auto max-w-[480px] px-4 py-10 lg:max-w-[1120px] lg:px-6 lg:py-16">
        <h1 className="mb-8 text-[28px] font-black uppercase tracking-wider text-black lg:text-[36px]">
          Pagamento
        </h1>

        {userProfile && (!userProfile.phone_number || !userProfile.cpf) && (
          <Link to="/my-account"
            className="flex items-start gap-3 rounded-[14px] border border-[#e6a817]/40 bg-[#fffbeb] px-5 py-4 transition hover:bg-[#fff8e1]">
            <Icon name="tag" className="mt-0.5 h-5 w-5 shrink-0 text-[#c8970a]" />
            <div>
              <p className="text-[14px] font-bold text-[#9a6e00]">Complete seu perfil para finalizar a compra</p>
              <p className="mt-0.5 text-[13px] text-[#b8860b]">
                {[!userProfile.phone_number && 'telefone', !userProfile.cpf && 'CPF'].filter(Boolean).join(' e ')} não cadastrado{(!userProfile.phone_number && !userProfile.cpf) ? 's' : ''}.
                {' '}Clique aqui para preencher.
              </p>
            </div>
          </Link>
        )}

        <div className="space-y-4">

          {/* ── Step 1: ENTREGA ── */}
          <StepCard number={1} title="Entrega" active={activeStep === 0} onClick={() => setActiveStep(0)}>
            <div className="space-y-4">
              {addressesLoading ? (
                <p className="text-[14px] text-black/40">Carregando endereços...</p>
              ) : addresses.length === 0 ? (
                <div className="rounded-[12px] border border-black/10 p-5 text-center">
                  <p className="text-[14px] text-black/55">Você ainda não tem endereços cadastrados.</p>
                  <Link to="/new-address?return=/payment"
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-black px-5 text-[13px] font-bold text-white transition hover:bg-black/85">
                    <Icon name="plus" className="h-4 w-4" />
                    Adicionar endereço
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label key={addr.id}
                      className={`flex cursor-pointer items-start gap-4 rounded-[12px] border-2 p-4 transition ${
                        selectedAddressId === addr.id ? 'border-black' : 'border-black/10 hover:border-black/30'
                      }`}>
                      <input
                        type="radio"
                        disabled={submitting || cartUpdating || Boolean(checkoutAttempt)}
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => handleSelectAddress(addr.id)}
                        className="mt-1 accent-black"
                      />
                      <div className="flex-1 text-[14px]">
                        <p className="font-bold text-black">{addr.title}</p>
                        <p className="text-black/60">
                          {addr.street}, {addr.address_number}
                          {addr.complement ? `, ${addr.complement}` : ''}
                        </p>
                        <p className="text-black/55">
                          {addr.neighborhood} — {addr.city}/{addr.state} · {addr.zip_code}
                        </p>
                      </div>
                      {addr.is_default && (
                        <span className="shrink-0 rounded-full bg-[#d4f7e2] px-2 py-0.5 text-[11px] font-semibold text-[#1da64a]">Padrão</span>
                      )}
                    </label>
                  ))}

                  <Link to="/new-address?return=/payment"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-dashed border-black/25 text-[13px] text-black/45 transition hover:border-black/50 hover:text-black/65">
                    <Icon name="plus" className="h-4 w-4" />
                    Adicionar outro endereço
                  </Link>
                </div>
              )}

              {/* Freight info */}
              {selectedAddressId && (
                <div className="rounded-[10px] bg-[#f7f7f7] px-4 py-3 text-[13px]">
                  {freightLoading ? (
                    <span className="text-black/45">Calculando frete...</span>
                  ) : freightError ? (
                    <span className="text-[#cc0000]">{freightError}</span>
                  ) : hasCalculation ? (
                    <div className="flex items-center justify-between">
                      <span className="text-black/55">
                        Frete estimado
                        {freightData.prazo_dias && ` (${freightData.prazo_dias} dias úteis)`}
                      </span>
                      <span className="font-bold text-black">
                        {FRETE === 0 ? 'Grátis' : `R$ ${FRETE.toFixed(2)}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              <button type="button"
                disabled={!hasCalculation || freightLoading || cartUpdating || submitting}
                onClick={() => setActiveStep(1)}
                className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 disabled:bg-black/35">
                Continuar para Pagamento
              </button>
            </div>
          </StepCard>

          {/* ── Step 2: PAGAMENTO ── */}
          <StepCard number={2} title="Pagamento" active={activeStep === 1} onClick={() => setActiveStep(1)}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-black/10 py-6">
                  <PixLogo />
                  <span className="text-[15px] font-bold text-black">PIX</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-black/10 py-6">
                  <CreditCardIcon />
                  <span className="text-[15px] font-bold text-black">Cartão</span>
                  <span className="text-[12px] text-black/45">ATÉ 12X</span>
                </div>
              </div>
              <p className="text-[13px] text-black/55">Escolha PIX ou cartão na página de pagamento da InfinitePay.</p>
              <button type="button" onClick={() => setActiveStep(2)}
                disabled={!hasCalculation || cartUpdating || submitting}
                className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85">
                Revisar Pedido
              </button>
            </div>
          </StepCard>

          {/* ── Step 3: REVISÃO ── */}
          <StepCard number={3} title="Revisão" active={activeStep === 2} onClick={() => setActiveStep(2)}>
            {cartLoading ? (
              <p className="py-4 text-center text-[14px] text-black/40">Carregando...</p>
            ) : (
              <div className="space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Resumo da compra</p>

                {/* Address summary */}
                {selectedAddress && (
                  <div className="rounded-[10px] bg-[#f7f7f7] px-4 py-3 text-[13px]">
                    <p className="font-semibold text-black/55 uppercase text-[11px] mb-1">Entrega em</p>
                    <p className="font-bold text-black">{selectedAddress.title}</p>
                    <p className="text-black/60">
                      {selectedAddress.street}, {selectedAddress.address_number}
                      {selectedAddress.complement ? `, ${selectedAddress.complement}` : ''} —{' '}
                      {selectedAddress.city}/{selectedAddress.state}
                    </p>
                  </div>
                )}

                {/* Items */}
                <div className="rounded-[12px] bg-[#f7f7f7] p-4 space-y-4">
                  {items.map((item) => (
                    <div key={item.variation_id ?? item.id} className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#e8e8e8]">
                        {productImages[item.product_id] && (
                          <img src={productImages[item.product_id]} alt={item.product_name}
                            className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[14px] font-bold text-black">{item.product_name}</p>
                          <button onClick={() => handleRemove(item.variation_id ?? item.id)}
                            aria-label={`Remover ${item.product_name}`}
                            disabled={submitting || cartUpdating || Boolean(checkoutAttempt)}
                            className="shrink-0 text-[#cc0000] transition hover:text-[#990000]">
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                        {item.size && <p className="text-[12px] text-black/50">Tamanho: {item.size}</p>}
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-[15px] font-bold text-black">R$ {Number(item.unit_price).toFixed(2)}</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleQtyChange(item.variation_id ?? item.id, item.quantity - 1)}
                              aria-label={`Diminuir quantidade de ${item.product_name}`}
                              disabled={submitting || cartUpdating || Boolean(checkoutAttempt)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/20 text-black hover:bg-black/5">
                              <Icon name="minus" className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-[14px] font-medium text-black">{item.quantity}</span>
                            <button onClick={() => handleQtyChange(item.variation_id ?? item.id, item.quantity + 1)}
                              aria-label={`Aumentar quantidade de ${item.product_name}`}
                              disabled={submitting || cartUpdating || Boolean(checkoutAttempt)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/20 text-black hover:bg-black/5">
                              <Icon name="plus" className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 text-[14px]">
                  <div className="flex justify-between text-black/55">
                    <span>Subtotal</span>
                    <span className="font-medium text-black">{subtotal === null ? 'A calcular' : `R$ ${subtotal.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-black/55">
                    <span>
                      Frete
                      {hasCalculation && freightData.prazo_dias && <span className="ml-1 text-[12px]">({freightData.prazo_dias} dias úteis)</span>}
                    </span>
                    <span className="font-medium text-black">
                      {FRETE === null ? 'A calcular' : FRETE === 0 ? 'Grátis' : `R$ ${FRETE.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-black/10 pt-3 text-[17px] font-black text-black">
                    <span>Total</span>
                    <span>{total === null ? 'A calcular' : `R$ ${total.toFixed(2)}`}</span>
                  </div>
                </div>

                {freightError && <p role="alert" className="text-[13px] text-[#cc0000]">{freightError}</p>}
                {hasCalculation && (
                  <div className="space-y-3 text-[13px] text-black/60">
                    <p>Cotação válida até {new Date(freightData.expires_at).toLocaleTimeString('pt-BR')}.</p>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={quoteConfirmed} disabled={submitting}
                        onChange={(event) => setConfirmedQuoteId(event.target.checked ? freightData.shipping_quote_id : null)} />
                      Conferi os itens, o endereço e o total desta compra.
                    </label>
                  </div>
                )}
                {checkoutError && !checkoutAttempt && (
                  <p className="rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-[#cc0000]">{checkoutError}</p>
                )}

                {userProfile && !userProfile.phone_number && (
                  <p className="text-center text-[13px] text-[#c8970a]">
                    Cadastre seu telefone em{' '}
                    <Link to="/my-account" className="font-bold underline">Meus Dados</Link>{' '}
                    para continuar.
                  </p>
                )}
                <button type="button" onClick={handleCheckout}
                  disabled={submitting || Boolean(checkoutAttempt) || !userProfile?.id || cartUpdating || freightLoading || !hasCalculation || !quoteConfirmed || items.length === 0 || !selectedAddressId || (userProfile && !userProfile.phone_number)}
                  className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 disabled:bg-black/40">
                  {submitting ? 'Processando...' : 'Finalizar Compra'}
                </button>
              </div>
            )}
          </StepCard>

        </div>
        {checkoutAttempt && (
          <div className="mt-4 space-y-3 rounded-[12px] border border-black/20 p-4 text-[14px]">
            <p role="status">{checkoutError || 'Há uma tentativa de checkout registrada. Consulte o resultado antes de iniciar outra compra.'}</p>
            <button type="button" onClick={handleCheckout} disabled={submitting || !retryReady || !userProfile?.id}
              className="h-12 w-full rounded-full bg-black font-bold text-white disabled:opacity-50">
              {submitting ? 'Consultando...' : 'Consultar tentativa'}
            </button>
          </div>
        )}
        {freightError && !checkoutAttempt && (
          <button type="button" onClick={recalculateQuote} disabled={cartUpdating || submitting}
            className="mt-4 h-12 w-full rounded-full border border-black/20 text-[14px] font-bold disabled:opacity-50">
            Recalcular cotação
          </button>
        )}
      </section>
    </PublicLayout>
  );
};

export default PaymentPage;

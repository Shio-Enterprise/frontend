import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  // Cart
  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [productImages, setProductImages] = useState({});

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Freight
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightData, setFreightData] = useState(null);
  const [freightError, setFreightError] = useState(null);

  // Profile
  const [userProfile, setUserProfile] = useState(null);

  // Checkout
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const fetchCart = useCallback(async () => {
    const token = getAccessToken();
    try {
      const r = await fetch(`${API_BASE_URL}/api/orders/cart/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return;
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
    } catch {}
  }, []);

  const fetchAddresses = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setAddressesLoading(false); return; }
    try {
      const r = await fetch(`${API_BASE_URL}/api/auth/addresses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0] ?? null;
        if (def) setSelectedAddressId(def.id);
      }
    } catch {}
    finally {
      setAddressesLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setUserProfile(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchCart().finally(() => setCartLoading(false));
    fetchAddresses();
    fetchProfile();
  }, [fetchCart, fetchAddresses, fetchProfile]);

  const fetchFreight = useCallback(async (addressId) => {
    const addr = addresses.find((a) => a.id === addressId);
    if (!addr) return;
    const cep = addr.zip_code.replace(/\D/g, '');
    setFreightLoading(true);
    setFreightError(null);
    setFreightData(null);
    try {
      const token = getAccessToken();
      const r = await fetch(
        `${API_BASE_URL}/api/orders/correios/frete/?cep_destino=${cep}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Frete indisponível.');
      setFreightData(data);
    } catch (e) {
      setFreightError(e.message);
    } finally {
      setFreightLoading(false);
    }
  }, [addresses]);

  const handleSelectAddress = (id) => {
    setSelectedAddressId(id);
    fetchFreight(id);
  };

  const handleQtyChange = async (itemId, newQty) => {
    if (newQty < 1) { handleRemove(itemId); return; }
    const token = getAccessToken();
    await fetch(`${API_BASE_URL}/api/orders/cart/items/${itemId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: newQty }),
    }).catch(() => {});
    fetchCart();
    refreshCart();
  };

  const handleRemove = async (itemId) => {
    const token = getAccessToken();
    await fetch(`${API_BASE_URL}/api/orders/cart/items/${itemId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    fetchCart();
    refreshCart();
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (!selectedAddressId) {
      setCheckoutError('Selecione um endereço de entrega.');
      return;
    }
    setSubmitting(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('Você precisa estar logado.');

      const res = await fetch(`${API_BASE_URL}/api/orders/checkout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          address_id: selectedAddressId,
          shipping_cost: FRETE,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Falha ao processar o pedido.');
      refreshCart();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        navigate('/pix', {
          state: {
            orderNumber: data.order_nsu ?? data.id ?? 'SH-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
            total: total,
            paymentMethod,
          },
        });
      }
    } catch (e) {
      setCheckoutError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const items = cart?.items ?? [];
  const subtotal = parseFloat(cart?.subtotal ?? 0);
  const FRETE = freightData ? parseFloat(freightData.preco_final ?? 0) : 0;
  const pixDiscount = paymentMethod === 'pix' ? +(subtotal * 0.05).toFixed(2) : 0;
  const total = subtotal + FRETE - pixDiscount;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

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
                  ) : freightData ? (
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
                disabled={!selectedAddressId || addresses.length === 0}
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
                <button type="button" onClick={() => setPaymentMethod('pix')}
                  className={`flex flex-col items-center gap-2 rounded-[14px] border-2 py-6 transition ${
                    paymentMethod === 'pix' ? 'border-black' : 'border-black/10 hover:border-black/30'
                  }`}>
                  <PixLogo />
                  <span className="text-[15px] font-bold text-black">PIX</span>
                  <span className="text-[12px] font-semibold text-[#c8970a]">5% OFF</span>
                </button>
                <button type="button" onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center gap-2 rounded-[14px] border-2 py-6 transition ${
                    paymentMethod === 'card' ? 'border-black' : 'border-black/10 hover:border-black/30'
                  }`}>
                  <CreditCardIcon />
                  <span className="text-[15px] font-bold text-black">Cartão</span>
                  <span className="text-[12px] text-black/45">ATÉ 12X</span>
                </button>
              </div>
              <button type="button" onClick={() => setActiveStep(2)}
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
                            className="shrink-0 text-[#cc0000] transition hover:text-[#990000]">
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                        {item.size && <p className="text-[12px] text-black/50">Tamanho: {item.size}</p>}
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-[15px] font-bold text-black">R$ {Number(item.unit_price).toFixed(2)}</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleQtyChange(item.variation_id ?? item.id, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/20 text-black hover:bg-black/5">
                              <Icon name="minus" className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-[14px] font-medium text-black">{item.quantity}</span>
                            <button onClick={() => handleQtyChange(item.variation_id ?? item.id, item.quantity + 1)}
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
                    <span className="font-medium text-black">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-black/55">
                    <span>
                      Frete
                      {freightData?.prazo_dias && <span className="ml-1 text-[12px]">({freightData.prazo_dias} dias úteis)</span>}
                    </span>
                    <span className="font-medium text-black">
                      {freightLoading ? '...' : FRETE === 0 ? 'Grátis' : `R$ ${FRETE.toFixed(2)}`}
                    </span>
                  </div>
                  {paymentMethod === 'pix' && (
                    <div className="flex justify-between text-[#c8970a]">
                      <span className="font-semibold">Desconto PIX (5%)</span>
                      <span className="font-semibold">- R$ {pixDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black/10 pt-3 text-[17px] font-black text-black">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {checkoutError && (
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
                  disabled={submitting || items.length === 0 || !selectedAddressId || (userProfile && !userProfile.phone_number)}
                  className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 disabled:bg-black/40">
                  {submitting ? 'Processando...' : 'Finalizar Compra'}
                </button>
              </div>
            )}
          </StepCard>

        </div>
      </section>
    </PublicLayout>
  );
};

export default PaymentPage;

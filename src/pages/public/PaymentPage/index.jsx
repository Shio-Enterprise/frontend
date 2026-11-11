import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import PublicLayout from "../../../components/layout/public/PublicLayout";
import { Icon } from "../../../components/ui/ShioDesign";
import { getAccessToken } from "../../../lib/authToken";
import { EVENT_TYPES, trackEvent } from "../../../lib/analytics";
import { useCart } from "../../../context/CartContext";
import { phoneError } from "../../../lib/masks";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const retryAfterSeconds = (headers) => {
  const value = headers?.get?.("Retry-After");
  if (!value) return 3;
  if (/^\d+$/.test(value.trim())) return Math.max(1, Number(value.trim()));
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? Math.max(1, Math.ceil((timestamp - Date.now()) / 1000))
    : 3;
};

const apiErrorMessage = (data, response, fallback) => {
  const message = data?.message || data?.detail || fallback;
  const requestId = response?.headers?.get?.("X-Request-ID");
  return requestId ? `${message} (referência: ${requestId})` : message;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const PixLogo = () => (
  <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
    <path d="M17.5 6.5L24 0L30.5 6.5L24 13L17.5 6.5Z" fill="black" />
    <path d="M41.5 17.5L48 24L41.5 30.5L35 24L41.5 17.5Z" fill="black" />
    <path d="M30.5 41.5L24 48L17.5 41.5L24 35L30.5 41.5Z" fill="black" />
    <path d="M6.5 30.5L0 24L6.5 17.5L13 24L6.5 30.5Z" fill="black" />
    <path d="M24 13L35 24L24 35L13 24L24 13Z" fill="black" opacity="0.15" />
    <path d="M24 17L31 24L24 31L17 24L24 17Z" fill="black" />
  </svg>
);

const CreditCardIcon = () => (
  <svg viewBox="0 0 56 40" className="h-11 w-14" fill="none" aria-hidden="true">
    <rect width="56" height="40" rx="5" fill="black" />
    <rect y="11" width="56" height="11" fill="#222" />
    <rect x="6" y="27" width="14" height="7" rx="2" fill="#444" />
    <circle cx="44" cy="30" r="4" fill="#555" />
    <circle cx="50" cy="30" r="4" fill="#333" />
  </svg>
);

// ─── Step card ────────────────────────────────────────────────────────────────

// Cabeçalho da etapa = título com botão (padrão sanfona): aria-expanded diz se está aberta.
function StepCard({ number, total, title, active, onClick, headerRef, children }) {
  const panelId = `payment-step-${number}`;
  return (
    <div className="rounded-[16px] border border-black/10">
      <h2>
        <button
          ref={headerRef}
          type="button"
          onClick={onClick}
          aria-expanded={active}
          aria-controls={panelId}
          className="flex w-full items-center gap-4 rounded-[16px] px-5 py-4 text-left"
        >
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
              active ? "bg-black text-white" : "bg-black/10 text-shio-muted"
            }`}
          >
            {number}
          </span>
          <span className="sr-only">{`Etapa ${number} de ${total}: ${title}`}</span>
          <span
            aria-hidden="true"
            className={`text-[18px] font-black uppercase tracking-widest ${
              active ? "text-black" : "text-shio-muted"
            }`}
          >
            {title}
          </span>
          {/* Seta: pista de aberto/fechado que não depende de cor (alto contraste). */}
          <svg
            data-chevron
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ml-auto h-5 w-5 shrink-0 transition-transform ${active ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      {active && (
        <div id={panelId} className="border-t border-black/10 px-5 pb-6 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

const brl = (value) => `R$ ${Number(value).toFixed(2)}`;

// ─── PaymentPage ──────────────────────────────────────────────────────────────

const PaymentPage = () => {
  const { refreshCart } = useCart();
  const location = useLocation();
  // Sem login não há endereços nem checkout: mostra o aviso para entrar.
  const [isGuest] = useState(() => !getAccessToken());

  const [activeStep, setActiveStep] = useState(0);
  const stepHeaders = useRef([]);
  // Foco só muda quando o usuário avança pelo botão (não no carregamento).
  const goToStep = (step) => {
    setActiveStep(step);
    stepHeaders.current[step]?.focus();
  };
  // Anúncio para leitor de tela: ação do usuário + valores da cotação.
  const [actionMessage, setActionMessage] = useState("");

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
  const [quoteRetryReady, setQuoteRetryReady] = useState(true);
  const [expiredQuoteId, setExpiredQuoteId] = useState(null);
  const [confirmedQuoteId, setConfirmedQuoteId] = useState(null);

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState(null);

  // Profile
  const [userProfile, setUserProfile] = useState(null);

  // Checkout
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutAttempt, setCheckoutAttempt] = useState(null);
  const [retryReady, setRetryReady] = useState(true);
  const [quoteInvalidated, setQuoteInvalidated] = useState(false);
  const checkoutInFlight = useRef(false);
  // "Finalizar" fica travado durante o envio e o foco cairia no início da página:
  // ao terminar, o foco vai para a mensagem que explica o resultado.
  const wasSubmitting = useRef(false);
  const attemptMessageRef = useRef(null);
  const checkoutErrorRef = useRef(null);
  const freightErrorRef = useRef(null);
  const couponErrorRef = useRef(null);
  const couponInputRef = useRef(null);
  const couponRemoveRef = useRef(null);
  // Aplicar/remover cupom troca o botão e recalcula a cotação: o foco espera o resultado e vai
  // para "Remover" (aplicado), para o erro (recusado) ou para o campo (removido) (#64).
  const couponFocusPending = useRef(false);
  const retryTimer = useRef(null);
  const quoteRetryTimer = useRef(null);
  const quoteRetryReadyRef = useRef(true);

  useEffect(
    () => () => {
      window.clearTimeout(retryTimer.current);
      window.clearTimeout(quoteRetryTimer.current);
    },
    [],
  );

  const fetchCart = useCallback(() => {
    const token = getAccessToken();
    return fetch(`${API_BASE_URL}/api/orders/cart/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Não foi possível carregar o carrinho.");
        const data = await r.json();
        setCart(data);
        const ids = [
          ...new Set(
            (data?.items ?? []).map((i) => i.product_id).filter(Boolean),
          ),
        ];
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE_URL}/api/catalog/products/${id}/`)
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null),
          ),
        );
        const map = {};
        results.forEach((p) => {
          if (p?.id && p.images?.[0]?.image) map[p.id] = p.images[0].image;
        });
        setProductImages(map);
      })
      .catch(() => {
        setCheckoutError("Não foi possível carregar o carrinho.");
        setCart(null);
      });
  }, []);

  const fetchAddresses = useCallback(() => {
    const token = getAccessToken();
    if (!token) return Promise.resolve();
    return fetch(`${API_BASE_URL}/api/auth/addresses/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Não foi possível carregar os endereços.");
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0] ?? null;
        setSelectedAddressId((current) =>
          list.some((address) => address.id === current)
            ? current
            : (def?.id ?? null),
        );
      })
      .catch(() => {
        setCheckoutError("Não foi possível carregar os endereços.");
        setAddresses([]);
        setSelectedAddressId(null);
      });
  }, []);

  const fetchProfile = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    return fetch(`${API_BASE_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (r.ok) {
          const profile = await r.json();
          setUserProfile(profile);
          const saved = sessionStorage.getItem(
            `checkout-attempt:${profile.id}`,
          );
          if (saved) setCheckoutAttempt(JSON.parse(saved));
        }
      })
      .catch(() => {
        setCheckoutError("Não foi possível carregar o perfil.");
      });
  }, []);

  useEffect(() => {
    if (isGuest) return;
    fetchCart().finally(() => setCartLoading(false));
    fetchAddresses().finally(() => setAddressesLoading(false));
    fetchProfile();
  }, [isGuest, fetchCart, fetchAddresses, fetchProfile]);

  useEffect(() => {
    if (
      !selectedAddressId ||
      !cart?.items?.length ||
      cartUpdating ||
      checkoutAttempt ||
      quoteInvalidated ||
      !quoteRetryReadyRef.current
    )
      return;
    let cancelled = false;
    const token = getAccessToken();
    fetch(`${API_BASE_URL}/api/orders/checkout/calculate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        appliedCoupon
          ? { address_id: selectedAddressId, coupon_code: appliedCoupon }
          : { address_id: selectedAddressId },
      ),
    })
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok && Array.isArray(data.coupon_code)) {
          // Cupom recusado: mostra o motivo e refaz a cotação sem ele.
          if (!cancelled) {
            setCouponError(data.coupon_code[0]);
            setAppliedCoupon("");
          }
          return;
        }
        if (!r.ok) {
          if (r.status === 429 || r.status === 503) {
            const retrySeconds = retryAfterSeconds(r.headers);
            quoteRetryReadyRef.current = false;
            setQuoteRetryReady(false);
            window.clearTimeout(quoteRetryTimer.current);
            quoteRetryTimer.current = window.setTimeout(
              () => {
                quoteRetryReadyRef.current = true;
                setQuoteRetryReady(true);
              },
              retrySeconds * 1000,
            );
            setCalculationError({
              message: apiErrorMessage(
                data,
                r,
                r.status === 429
                  ? `Muitas tentativas. Aguarde ${retrySeconds}s para calcular novamente.`
                  : `Cálculo temporariamente indisponível. Tente novamente em ${retrySeconds}s.`,
              ),
              addressId: selectedAddressId,
              cartSnapshot: cart,
              retryable: true,
            });
            return;
          }
          throw new Error(apiErrorMessage(data, r, "Cálculo indisponível."));
        }
        if (
          !data.shipping_quote_id ||
          !Number.isFinite(Date.parse(data.expires_at))
        ) {
          throw new Error(
            "Não foi possível validar a cotação. Calcule novamente.",
          );
        }
        if (!cancelled) {
          setFreightData({
            ...data,
            addressId: selectedAddressId,
            cartSnapshot: cart,
          });
          setCalculationError(null);
          setConfirmedQuoteId(null);
        }
      })
      .catch((error) => {
        if (!cancelled)
          setCalculationError({
            message: error.message,
            addressId: selectedAddressId,
            cartSnapshot: cart,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedAddressId,
    cart,
    cartUpdating,
    quoteRequest,
    checkoutAttempt,
    quoteInvalidated,
    appliedCoupon,
  ]);

  useEffect(() => {
    if (!freightData?.shipping_quote_id) return;
    const expire = () => setExpiredQuoteId(freightData.shipping_quote_id);
    const timer = window.setTimeout(
      expire,
      Math.max(0, Date.parse(freightData.expires_at) - Date.now()),
    );
    const checkExpiry = () => {
      if (Date.parse(freightData.expires_at) <= Date.now()) expire();
    };
    window.addEventListener("focus", checkExpiry);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [freightData]);

  const recalculateQuote = async () => {
    if (cartUpdating || submitting || checkoutAttempt || !quoteRetryReady) return;
    quoteRetryReadyRef.current = true;
    setFreightData(null);
    setCalculationError(null);
    setConfirmedQuoteId(null);
    setCartUpdating(true);
    setQuoteInvalidated(false);
    await Promise.all([fetchCart(), fetchAddresses()]);
    setCartUpdating(false);
    setQuoteRequest((value) => value + 1);
  };

  const changeCoupon = (code) => {
    setFreightData(null);
    setCalculationError((error) => (error?.retryable ? error : null));
    setConfirmedQuoteId(null);
    setQuoteInvalidated(false);
    setActionMessage(code ? "" : "Cupom removido.");
    setAppliedCoupon(code);
  };

  const handleApplyCoupon = (event) => {
    event.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (
      !code ||
      code === appliedCoupon ||
      couponDisabled ||
      cartUpdating ||
      submitting ||
      checkoutAttempt
    )
      return;
    setCouponError(null);
    couponFocusPending.current = true;
    changeCoupon(code);
  };

  const handleRemoveCoupon = () => {
    if (couponDisabled || cartUpdating || submitting || checkoutAttempt) return;
    setCouponInput("");
    setCouponError(null);
    couponFocusPending.current = true;
    if (appliedCoupon) changeCoupon("");
  };

  const handleSelectAddress = (id) => {
    if (checkoutAttempt || checkoutInFlight.current) return;
    setFreightData(null);
    setQuoteInvalidated(false);
    setCalculationError((error) => (error?.retryable ? error : null));
    setConfirmedQuoteId(null);
    setActionMessage("");
    setSelectedAddressId(id);
  };

  const handleQtyChange = async (itemId, newQty, productName) => {
    if (
      cartUpdating ||
      submitting ||
      checkoutAttempt ||
      checkoutInFlight.current
    )
      return;
    if (newQty < 1) {
      handleRemove(itemId, productName);
      return;
    }
    const token = getAccessToken();
    setCartUpdating(true);
    setFreightData(null);
    setCalculationError((error) => (error?.retryable ? error : null));
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/cart/items/${itemId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQty }),
        },
      );
      if (!response.ok)
        throw new Error("Não foi possível atualizar a quantidade.");
      await fetchCart();
      refreshCart();
      setActionMessage(`Quantidade de ${productName}: ${newQty}.`);
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCartUpdating(false);
    }
  };

  const handleRemove = async (itemId, productName) => {
    if (
      cartUpdating ||
      submitting ||
      checkoutAttempt ||
      checkoutInFlight.current
    )
      return;
    const token = getAccessToken();
    setCartUpdating(true);
    setFreightData(null);
    setCalculationError((error) => (error?.retryable ? error : null));
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/cart/items/${itemId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Não foi possível remover o produto.");
      trackEvent(EVENT_TYPES.REMOVE_FROM_CART, { variationId: itemId });
      await fetchCart();
      refreshCart();
      setActionMessage(`${productName} removido do pedido.`);
      // O botão some com o item: foco vai para o título da etapa.
      stepHeaders.current[2]?.focus();
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCartUpdating(false);
    }
  };

  const handleCheckout = async () => {
    if (
      checkoutInFlight.current ||
      !retryReady ||
      cartUpdating ||
      !userProfile?.id
    )
      return;
    if (
      !checkoutAttempt &&
      (!hasCalculation || !quoteConfirmed || freightLoading)
    )
      return;
    if (!checkoutAttempt && Date.parse(freightData.expires_at) <= Date.now()) {
      setExpiredQuoteId(freightData.shipping_quote_id);
      return;
    }
    setCheckoutError(null);
    if (!checkoutAttempt && !selectedAddressId) {
      setCheckoutError("Selecione um endereço de entrega.");
      return;
    }
    checkoutInFlight.current = true;
    // Reenvio da mesma tentativa (idempotente) não conta como novo início de checkout.
    if (!checkoutAttempt) trackEvent(EVENT_TYPES.CHECKOUT_STARTED);
    setSubmitting(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("Você precisa estar logado.");
      const payload = checkoutAttempt ?? {
        address_id: selectedAddressId,
        shipping_quote_id: freightData.shipping_quote_id,
        idempotency_key: crypto.randomUUID(),
      };
      // Persistir antes do envio permite recuperar a mesma tentativa após perder a resposta.
      sessionStorage.setItem(
        `checkout-attempt:${userProfile.id}`,
        JSON.stringify(payload),
      );
      setCheckoutAttempt(payload);

      const res = await fetch(`${API_BASE_URL}/api/orders/checkout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && Array.isArray(data.coupon_code)) {
        // O cupom deixou de valer depois da cotação: recalcula sem ele.
        sessionStorage.removeItem(`checkout-attempt:${userProfile.id}`);
        setCheckoutAttempt(null);
        setFreightData(null);
        setConfirmedQuoteId(null);
        setCouponError(data.coupon_code[0]);
        setAppliedCoupon("");
        return;
      }
      if (
        !res.ok &&
        ((res.status === 400 && data.shipping_quote_id) ||
          (res.status === 409 && data.code === "price_changed"))
      ) {
        sessionStorage.removeItem(`checkout-attempt:${userProfile.id}`);
        setCheckoutAttempt(null);
        setQuoteInvalidated(true);
        setFreightData(null);
        setConfirmedQuoteId(null);
        setCalculationError({
          message:
            data.code === "price_changed"
              ? "Os preços mudaram. Recalcule e confirme os novos valores antes de finalizar."
              : "A cotação não é mais válida. Recalcule e confirme os valores antes de finalizar.",
          addressId: selectedAddressId,
          cartSnapshot: cart,
        });
        return;
      }
      if (
        res.status === 409 &&
        data.code === "checkout_already_started" &&
        data.attempt
      ) {
        sessionStorage.setItem(
          `checkout-attempt:${userProfile.id}`,
          JSON.stringify(data.attempt),
        );
        setCheckoutAttempt(data.attempt);
        setCheckoutError(data.message);
        return;
      }
      if (res.status === 202) {
        const retrySeconds = retryAfterSeconds(res.headers);
        setRetryReady(false);
        window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(
          () => setRetryReady(true),
          Math.min(60, Math.max(1, retrySeconds)) * 1000,
        );
        setCheckoutError(
          data.message ||
            "Seu checkout está sendo processado. Consulte a mesma tentativa novamente.",
        );
        return;
      }
      if (res.status === 429 || res.status === 503) {
        const retrySeconds = retryAfterSeconds(res.headers);
        setRetryReady(false);
        window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(
          () => setRetryReady(true),
          retrySeconds * 1000,
        );
        setCheckoutError(
          apiErrorMessage(
            data,
            res,
            res.status === 429
              ? `Muitas tentativas. Aguarde ${retrySeconds}s antes de consultar novamente.`
              : "Checkout temporariamente indisponível. Consulte a mesma tentativa após a espera.",
          ),
        );
        return;
      }
      if (!res.ok) {
        // A falha pode ser por um item ter deixado de estar disponível
        // (produto/drop ocultado, estoque ou limite do drop esgotados entre
        // a montagem do carrinho e o checkout) — resincroniza para refletir
        // o estado atual (ex.: is_sellable) e o usuário poder agir.
        fetchCart();
        refreshCart();
        throw new Error(
          apiErrorMessage(data, res, "Falha ao processar o pedido."),
        );
      }
      trackEvent(EVENT_TYPES.PURCHASE);
      refreshCart();
      if (data.checkout_url) {
        sessionStorage.removeItem(`checkout-attempt:${userProfile.id}`);
        window.location.assign(data.checkout_url);
      } else {
        throw new Error("Não foi possível abrir o pagamento.");
      }
    } catch (e) {
      setCheckoutError(e.message);
    } finally {
      checkoutInFlight.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (submitting) {
      wasSubmitting.current = true;
      return;
    }
    if (!wasSubmitting.current) return;
    wasSubmitting.current = false;
    const active = document.activeElement;
    if (active && active !== document.body && !active.disabled) return;
    (
      attemptMessageRef.current ??
      checkoutErrorRef.current ??
      freightErrorRef.current ??
      couponErrorRef.current ??
      stepHeaders.current[2]
    )?.focus();
  }, [submitting]);

  const quoteExpired =
    freightData?.shipping_quote_id &&
    expiredQuoteId === freightData.shipping_quote_id;
  const hasCalculation = Boolean(
    freightData?.shipping_quote_id &&
    freightData?.addressId === selectedAddressId &&
    freightData?.cartSnapshot === cart &&
    !cartUpdating &&
    !quoteExpired,
  );
  const quoteConfirmed =
    hasCalculation && confirmedQuoteId === freightData.shipping_quote_id;
  const freightError = quoteExpired
    ? "Cotação expirada. Recalcule e confirme os valores novamente."
    : calculationError?.retryable ||
        (calculationError?.addressId === selectedAddressId &&
          calculationError?.cartSnapshot === cart)
      ? calculationError.message
      : null;
  const freightLoading = Boolean(
    !checkoutAttempt &&
    selectedAddressId &&
    cart?.items?.length &&
    !hasCalculation &&
    !freightError,
  );
  const items = (hasCalculation ? freightData.items : cart?.items) ?? [];
  const unavailableItems = items.filter((item) => item.is_sellable === false);
  const hasUnavailableItems = unavailableItems.length > 0;
  // Telefone vai para a InfinitePay. Cadastro antigo fora do padrão (a migração preserva)
  // também trava a compra até a pessoa corrigir em "Meus Dados".
  const phoneMissing =
    Boolean(userProfile) && !String(userProfile.phone_number ?? "").trim();
  const phoneInvalid =
    Boolean(userProfile?.phone_number) && Boolean(phoneError(userProfile.phone_number));
  const phoneBlocked = phoneMissing || phoneInvalid;
  const subtotal = hasCalculation ? Number(freightData.subtotal) : null;
  const FRETE = hasCalculation ? Number(freightData.shipping_cost) : null;
  const total = hasCalculation ? Number(freightData.total_amount) : null;
  const discount = hasCalculation
    ? Number(freightData.discount_amount ?? 0)
    : 0;
  const discountCouponCode = hasCalculation ? freightData.coupon?.code : null;
  const couponDisabled =
    submitting ||
    cartUpdating ||
    freightLoading ||
    Boolean(checkoutAttempt) ||
    !quoteRetryReady;
  useEffect(() => {
    if (!couponFocusPending.current) return;
    if (couponError) {
      couponFocusPending.current = false;
      couponErrorRef.current?.focus();
      return;
    }
    if (calculationError) {
      couponFocusPending.current = false;
      couponInputRef.current?.focus();
      return;
    }
    if (!hasCalculation || couponDisabled) return;
    couponFocusPending.current = false;
    (appliedCoupon ? couponRemoveRef.current : couponInputRef.current)?.focus();
  }, [couponError, calculationError, hasCalculation, couponDisabled, appliedCoupon]);

  const quoteMessage = hasCalculation
    ? `${discountCouponCode && discount > 0 ? `Cupom ${discountCouponCode} aplicado: desconto de ${brl(discount)}. ` : ""}Frete: ${FRETE === 0 ? "grátis" : brl(FRETE)}. Total: ${brl(total)}.`
    : "";
  const liveMessage = [actionMessage, quoteMessage].filter(Boolean).join(" ");
  const selectedAddress = selectedAddressId
    ? {
        ...addresses.find((a) => a.id === selectedAddressId),
        ...(hasCalculation ? freightData.address : {}),
      }
    : null;

  return (
    <PublicLayout>

      <section className="mx-auto max-w-[480px] px-4 py-10 lg:max-w-[1120px] lg:px-6 lg:py-16">
        <h1 className="mb-8 text-[28px] font-black uppercase tracking-wider text-black lg:text-[36px]">
          Pagamento
        </h1>
        <p
          role="status"
          aria-atomic="true"
          data-testid="payment-live"
          className="sr-only"
        >
          {liveMessage}
        </p>

        {isGuest ? (
          <div className="rounded-[16px] border border-black/10 px-5 py-8 text-center">
            <h2 className="text-[18px] font-black uppercase tracking-widest text-black">
              Entre para finalizar a compra
            </h2>
            <p className="mt-3 text-[14px] text-shio-muted">
              Para escolher o endereço de entrega e pagar, entre na sua conta ou crie uma.
            </p>
            <div className="mx-auto mt-6 flex max-w-[360px] flex-col gap-3">
              <Link
                to="/login"
                state={{ from: location }}
                className="flex h-12 items-center justify-center rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85"
              >
                Entrar
              </Link>
              <Link
                to="/signup"
                className="flex h-12 items-center justify-center rounded-full border border-black/20 text-[14px] font-bold text-black transition hover:bg-black/5"
              >
                Criar conta
              </Link>
              <Link
                to="/cart"
                className="flex min-h-11 items-center justify-center text-[13px] font-semibold text-shio-muted underline underline-offset-2 hover:text-black"
              >
                Voltar ao carrinho
              </Link>
            </div>
          </div>
        ) : (
        <>
        {userProfile && (phoneBlocked || !userProfile.cpf) && (
          <Link
            to="/my-account"
            className="flex items-start gap-3 rounded-[14px] border border-[#e6a817]/40 bg-[#fffbeb] px-5 py-4 transition hover:bg-[#fff8e1]"
          >
            <Icon
              name="tag"
              className="mt-0.5 h-5 w-5 shrink-0 text-shio-warning"
            />
            <div>
              <p className="text-[14px] font-bold text-shio-warning">
                Complete seu perfil para finalizar a compra
              </p>
              <p className="mt-0.5 text-[13px] text-shio-warning">
                {(phoneMissing || !userProfile.cpf) && (
                  <>
                    {[phoneMissing && "telefone", !userProfile.cpf && "CPF"]
                      .filter(Boolean)
                      .join(" e ")}{" "}
                    não cadastrado
                    {phoneMissing && !userProfile.cpf ? "s" : ""}.{" "}
                  </>
                )}
                {phoneInvalid && "O telefone cadastrado está incompleto ou inválido. "}
                Clique aqui para {phoneInvalid ? "corrigir" : "preencher"}.
              </p>
            </div>
          </Link>
        )}

        <div className="space-y-4">
          {/* ── Step 1: ENTREGA ── */}
          <StepCard
            number={1}
            total={3}
            title="Entrega"
            active={activeStep === 0}
            onClick={() => setActiveStep(0)}
            headerRef={(el) => { stepHeaders.current[0] = el; }}
          >
            <div className="space-y-4">
              {addressesLoading ? (
                <p className="text-[14px] text-shio-muted">
                  Carregando endereços...
                </p>
              ) : addresses.length === 0 ? (
                <div className="rounded-[12px] border border-black/10 p-5 text-center">
                  <p className="text-[14px] text-shio-muted">
                    Você ainda não tem endereços cadastrados.
                  </p>
                  <Link
                    to="/new-address?return=/payment"
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-black px-5 text-[13px] font-bold text-white transition hover:bg-black/85"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Adicionar endereço
                  </Link>
                </div>
              ) : (
                <fieldset className="space-y-3">
                  <legend className="sr-only">Endereço de entrega</legend>
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer items-start gap-4 rounded-[12px] border-2 p-4 transition ${
                        selectedAddressId === addr.id
                          ? "border-black"
                          : "border-black/10 hover:border-black/30"
                      }`}
                    >
                      <input
                        type="radio"
                        disabled={
                          submitting || cartUpdating || Boolean(checkoutAttempt)
                        }
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => handleSelectAddress(addr.id)}
                        className="mt-1 accent-black"
                      />
                      <div className="flex-1 text-[14px]">
                        <p className="font-bold text-black">{addr.title}</p>
                        <p className="text-black/60">
                          {addr.street}, {addr.address_number}
                          {addr.complement ? `, ${addr.complement}` : ""}
                        </p>
                        <p className="text-shio-muted">
                          {addr.neighborhood} — {addr.city}/{addr.state} ·{" "}
                          {addr.zip_code}
                        </p>
                      </div>
                      {addr.is_default && (
                        <span className="shrink-0 rounded-full bg-[#d4f7e2] px-2 py-0.5 text-[12px] font-semibold text-shio-success">
                          Padrão
                        </span>
                      )}
                    </label>
                  ))}

                  <Link
                    to="/new-address?return=/payment"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-dashed border-black/25 text-[13px] text-shio-muted transition hover:border-black/50 hover:text-black/65"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Adicionar outro endereço
                  </Link>
                </fieldset>
              )}

              {/* Freight info */}
              {selectedAddressId && (
                <div className="rounded-[10px] bg-[#f7f7f7] px-4 py-3 text-[13px]">
                  {checkoutAttempt && !hasCalculation ? (
                    <span className="text-black/60">
                      O frete está vinculado à tentativa anterior. Consulte o resultado abaixo.
                    </span>
                  ) : freightLoading ? (
                    <span className="text-shio-muted">Calculando frete...</span>
                  ) : freightError ? (
                    <span role="alert" className="text-shio-danger">{freightError}</span>
                  ) : hasCalculation ? (
                    <div className="flex items-center justify-between">
                      <span className="text-shio-muted">
                        Frete estimado
                        {freightData.prazo_dias &&
                          ` (${freightData.prazo_dias} dias úteis)`}
                      </span>
                      <span className="font-bold text-black">
                        {FRETE === 0 ? "Grátis" : `R$ ${FRETE.toFixed(2)}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              <button
                type="button"
                disabled={
                  !hasCalculation ||
                  freightLoading ||
                  cartUpdating ||
                  submitting
                }
                onClick={() => goToStep(1)}
                className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 disabled:bg-black/35"
              >
                Continuar para Pagamento
              </button>
            </div>
          </StepCard>

          {/* ── Step 2: PAGAMENTO ── */}
          <StepCard
            number={2}
            total={3}
            title="Pagamento"
            active={activeStep === 1}
            onClick={() => setActiveStep(1)}
            headerRef={(el) => { stepHeaders.current[1] = el; }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-black/10 py-6">
                  <PixLogo />
                  <span className="text-[15px] font-bold text-black">PIX</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-black/10 py-6">
                  <CreditCardIcon />
                  <span className="text-[15px] font-bold text-black">
                    Cartão
                  </span>
                  <span className="text-[12px] text-shio-muted">ATÉ 12X</span>
                </div>
              </div>
              <p className="text-[13px] text-shio-muted">
                Escolha PIX ou cartão na página de pagamento da InfinitePay.
              </p>
              <button
                type="button"
                onClick={() => goToStep(2)}
                disabled={!hasCalculation || cartUpdating || submitting}
                className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 disabled:bg-black/35"
              >
                Revisar Pedido
              </button>
            </div>
          </StepCard>

          {/* ── Step 3: REVISÃO ── */}
          <StepCard
            number={3}
            total={3}
            title="Revisão"
            active={activeStep === 2}
            onClick={() => setActiveStep(2)}
            headerRef={(el) => { stepHeaders.current[2] = el; }}
          >
            {cartLoading ? (
              <p className="py-4 text-center text-[14px] text-shio-muted">
                Carregando...
              </p>
            ) : (
              <div className="space-y-5">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-shio-muted">
                  Resumo da compra
                </h3>

                {/* Address summary */}
                {selectedAddress && (
                  <div className="rounded-[10px] bg-[#f7f7f7] px-4 py-3 text-[13px]">
                    <p className="font-semibold text-shio-muted uppercase text-[12px] mb-1">
                      Entrega em
                    </p>
                    <p className="font-bold text-black">
                      {selectedAddress.title}
                    </p>
                    <p className="text-black/60">
                      {selectedAddress.street}, {selectedAddress.address_number}
                      {selectedAddress.complement
                        ? `, ${selectedAddress.complement}`
                        : ""}{" "}
                      — {selectedAddress.city}/{selectedAddress.state}
                    </p>
                  </div>
                )}

                {/* Items */}
                {hasUnavailableItems && (
                  <p className="rounded-[10px] bg-[#fff5f5] px-4 py-3 text-[13px] font-semibold text-shio-danger">
                    {unavailableItems.length === 1
                      ? "Um item não está mais disponível para compra."
                      : `${unavailableItems.length} itens não estão mais disponíveis para compra.`}{" "}
                    Remova-o{unavailableItems.length > 1 ? "s" : ""} para
                    finalizar a compra.
                  </p>
                )}
                <ul
                  aria-label="Itens do pedido"
                  className="rounded-[12px] bg-[#f7f7f7] p-4 space-y-4"
                >
                  {items.map((item) => {
                    const unavailable = item.is_sellable === false;
                    const itemId = item.variation_id ?? item.id;
                    return (
                      <li key={itemId} className="flex gap-3">
                        {/* Só a foto esmaece: o texto do item indisponível mantém o contraste. */}
                        <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#e8e8e8] ${unavailable ? "opacity-60" : ""}`}>
                          {productImages[item.product_id] && (
                            <img
                              src={productImages[item.product_id]}
                              alt={item.product_name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="break-words text-[14px] font-bold text-black">
                              {item.product_name}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemove(itemId, item.product_name)
                              }
                              aria-label={`Remover ${item.product_name}`}
                              disabled={Boolean(checkoutAttempt)}
                              aria-disabled={submitting || cartUpdating || undefined}
                              className="-m-3 flex h-11 w-11 shrink-0 items-center justify-center text-shio-danger transition hover:text-shio-danger-hover disabled:opacity-40 aria-disabled:opacity-40"
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          </div>
                          {item.size && (
                            <p className="text-[12px] text-shio-muted">
                              Tamanho: {item.size}
                            </p>
                          )}
                          {unavailable && (
                            <p className="text-[12px] font-semibold text-shio-danger">
                              Indisponível para compra
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
                            {item.is_promotion_active && (
                              <p className="text-sm text-shio-muted">
                                <s>
                                  <span className="sr-only">Preço original: </span>
                                  R$ {Number(item.base_price).toFixed(2)}
                                </s>{" "}
                                —{" "}
                                {Math.round(
                                  (1 -
                                    Number(item.unit_price) /
                                      Number(item.base_price)) *
                                    100,
                                )}
                                % de desconto
                              </p>
                            )}
                            <p className="text-[15px] font-bold text-black">
                              R$ {Number(item.unit_price).toFixed(2)}
                            </p>
                            <div
                              role="group"
                              aria-label={`Quantidade de ${item.product_name}`}
                              className="-mr-2 flex items-center"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleQtyChange(
                                    itemId,
                                    item.quantity - 1,
                                    item.product_name,
                                  )
                                }
                                aria-label={`Diminuir quantidade de ${item.product_name}`}
                                disabled={unavailable || Boolean(checkoutAttempt)}
                                aria-disabled={submitting || cartUpdating || undefined}
                                className="group flex h-11 w-11 items-center justify-center text-black disabled:opacity-40 aria-disabled:opacity-40"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/20 group-hover:bg-black/5">
                                  <Icon name="minus" className="h-3 w-3" />
                                </span>
                              </button>
                              <span className="w-5 text-center text-[14px] font-medium text-black">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQtyChange(
                                    itemId,
                                    item.quantity + 1,
                                    item.product_name,
                                  )
                                }
                                aria-label={`Aumentar quantidade de ${item.product_name}`}
                                disabled={unavailable || Boolean(checkoutAttempt)}
                                aria-disabled={submitting || cartUpdating || undefined}
                                className="group flex h-11 w-11 items-center justify-center text-black disabled:opacity-40 aria-disabled:opacity-40"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/20 group-hover:bg-black/5">
                                  <Icon name="plus" className="h-3 w-3" />
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Coupon */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label
                    htmlFor="coupon-code"
                    className="text-[12px] font-semibold uppercase tracking-[0.18em] text-shio-muted"
                  >
                    Cupom de desconto
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="coupon-code"
                      type="text"
                      value={couponInput}
                      maxLength={50}
                      placeholder="Digite o código"
                      autoComplete="off"
                      onChange={(event) => setCouponInput(event.target.value)}
                      ref={couponInputRef}
                      readOnly={couponDisabled || Boolean(appliedCoupon)}
                      aria-disabled={couponDisabled || Boolean(appliedCoupon) || undefined}
                      aria-invalid={Boolean(couponError)}
                      aria-describedby={
                        couponError ? "coupon-error" : undefined
                      }
                      className="h-11 min-w-0 flex-1 rounded-full border border-black/20 px-4 text-[14px] uppercase text-black outline-none focus:border-black aria-disabled:bg-black/5"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        ref={couponRemoveRef}
                        onClick={handleRemoveCoupon}
                        aria-disabled={couponDisabled || undefined}
                        className="h-11 shrink-0 rounded-full border border-black/20 px-5 text-[13px] font-bold text-black transition hover:bg-black/5 aria-disabled:opacity-50"
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!couponInput.trim()}
                        aria-disabled={couponDisabled || undefined}
                        className="h-11 shrink-0 rounded-full bg-black px-5 text-[13px] font-bold text-white transition hover:bg-black/85 disabled:bg-black/35 aria-disabled:bg-black/35"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p
                      id="coupon-error"
                      ref={couponErrorRef}
                      tabIndex={-1}
                      role="alert"
                      className="text-[13px] text-shio-danger"
                    >
                      {couponError}
                    </p>
                  )}
                </form>

                {/* Totals */}
                <div className="space-y-2 text-[14px]">
                  <div className="flex justify-between text-shio-muted">
                    <span>Subtotal</span>
                    <span className="font-medium text-black">
                      {subtotal === null
                        ? "A calcular"
                        : `R$ ${subtotal.toFixed(2)}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-shio-success">
                      <span>
                        {discountCouponCode
                          ? `Cupom ${discountCouponCode}`
                          : "Desconto"}
                      </span>
                      <span className="font-medium">
                        - R$ {discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-shio-muted">
                    <span>
                      Frete
                      {hasCalculation && freightData.prazo_dias && (
                        <span className="ml-1 text-[12px]">
                          ({freightData.prazo_dias} dias úteis)
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-black">
                      {FRETE === null
                        ? "A calcular"
                        : FRETE === 0
                          ? "Grátis"
                          : `R$ ${FRETE.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-black/10 pt-3 text-[17px] font-black text-black">
                    <span>Total</span>
                    <span>
                      {total === null ? "A calcular" : `R$ ${total.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {freightError && (
                  <p
                    ref={freightErrorRef}
                    tabIndex={-1}
                    role="alert"
                    className="text-[13px] text-shio-danger"
                  >
                    {freightError}
                  </p>
                )}
                {hasCalculation && (
                  <div className="space-y-3 text-[13px] text-black/60">
                    <p>
                      Cotação válida até{" "}
                      {new Date(freightData.expires_at).toLocaleTimeString(
                        "pt-BR",
                      )}
                      .
                    </p>
                    <label className="flex min-h-6 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 accent-black"
                        checked={quoteConfirmed}
                        disabled={submitting}
                        onChange={(event) =>
                          setConfirmedQuoteId(
                            event.target.checked
                              ? freightData.shipping_quote_id
                              : null,
                          )
                        }
                      />
                      Conferi os itens, o endereço e o total desta compra.
                    </label>
                  </div>
                )}
                {checkoutError && !checkoutAttempt && (
                  <p
                    ref={checkoutErrorRef}
                    tabIndex={-1}
                    role="alert"
                    className="rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-shio-danger">
                    {checkoutError}
                  </p>
                )}

                {phoneBlocked && (
                  <p className="text-center text-[13px] text-shio-warning">
                    {phoneInvalid ? "Corrija" : "Cadastre"} seu telefone em{" "}
                    <Link to="/my-account" className="font-bold underline">
                      Meus Dados
                    </Link>{" "}
                    para continuar.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={
                    submitting ||
                    Boolean(checkoutAttempt) ||
                    !userProfile?.id ||
                    cartUpdating ||
                    freightLoading ||
                    !hasCalculation ||
                    !quoteConfirmed ||
                    items.length === 0 ||
                    hasUnavailableItems ||
                    !selectedAddressId ||
                    phoneBlocked
                  }
                  className="h-12 w-full rounded-full bg-black text-[14px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 disabled:bg-black/40"
                >
                  {submitting ? "Processando..." : "Finalizar Compra"}
                </button>
              </div>
            )}
          </StepCard>
        </div>
        {checkoutAttempt && (
          <div className="mt-4 space-y-3 rounded-[12px] border border-black/20 p-4 text-[14px]">
            <p ref={attemptMessageRef} tabIndex={-1} role="status">
              {checkoutError ||
                "Há uma tentativa de checkout registrada. Consulte o resultado antes de iniciar outra compra."}
            </p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || !retryReady || !userProfile?.id}
              className="h-12 w-full rounded-full bg-black font-bold text-white disabled:opacity-50"
            >
              {submitting ? "Consultando..." : "Consultar tentativa"}
            </button>
          </div>
        )}
        {freightError && !checkoutAttempt && (
          <button
            type="button"
            onClick={recalculateQuote}
            disabled={cartUpdating || submitting || !quoteRetryReady}
            className="mt-4 h-12 w-full rounded-full border border-black/20 text-[14px] font-bold disabled:opacity-50"
          >
            Recalcular cotação
          </button>
        )}
        </>
        )}
      </section>
    </PublicLayout>
  );
};

export default PaymentPage;

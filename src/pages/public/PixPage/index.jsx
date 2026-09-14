import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '../../../lib/payment';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PixPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_nsu');
  const [result, setResult] = useState({ state: 'loading', order: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const token = getAccessToken();
    const load = async () => {
      if (!UUID_PATTERN.test(orderId ?? '')) {
        setResult({ state: 'invalid', order: null });
        return;
      }
      if (!token) {
        setResult({ state: 'login', order: null });
        return;
      }
      setResult({ state: 'loading', order: null });
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/my-orders/${orderId}/`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!active) return;
        if (response.status === 401) {
          setResult({ state: 'login', order: null });
          return;
        }
        if (!response.ok) throw new Error('Consulta indisponível.');
        const order = await response.json();
        if (!active) return;
        if (order.id !== orderId || !Object.hasOwn(PAYMENT_STATUS_LABEL, order.payment?.status)) {
          throw new Error('Resposta de pagamento inválida.');
        }
        setResult({ state: 'loaded', order });
      } catch {
        if (active) setResult({ state: 'error', order: null });
      }
    };
    load();
    return () => { active = false; controller.abort(); };
  }, [orderId, attempt]);

  const { state, order } = result;
  const payment = order?.payment;
  const paid = state === 'loaded' && payment.status === 'PAID';
  const canRefresh = state === 'error' || (state === 'loaded' && ['PENDING', 'PROCESSING'].includes(payment.status));
  const title = {
    loading: 'Consultando pagamento...',
    invalid: 'Pedido não identificado',
    login: 'Entre para consultar seu pagamento',
    error: 'Não foi possível consultar o pagamento',
    loaded: paid ? 'Pagamento confirmado!' : PAYMENT_STATUS_LABEL[payment?.status],
  }[state];

  return (
    <PublicLayout>
      <PageMarker name="PixPage" />
      <section className="mx-auto max-w-[480px] px-4 py-10">
        <div className="rounded-[20px] border border-black/10 px-6 py-8">
          <h2 role="status" className={`text-center text-[20px] font-black ${paid ? 'text-[#10a545]' : 'text-black'}`}>
            {title}
          </h2>
          {state === 'error' && (
            <p className="mt-3 text-center text-[14px] text-black/55">
              A consulta falhou. Isso não significa que o pagamento falhou. Consulte novamente antes de iniciar outra compra.
            </p>
          )}
          {canRefresh && state === 'loaded' && (
            <p className="mt-3 text-center text-[14px] text-black/55">Aguardamos a confirmação do pagamento. Você pode consultar o mesmo pedido novamente.</p>
          )}
          {order && (
            <div className="mt-6 space-y-3 rounded-[12px] bg-[#f7f7f7] p-4 text-[13px]">
              <p>Número do pedido: <span className="font-semibold">{order.id}</span></p>
              <p>Valor do pedido: <span className="font-semibold">{Number(order.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
              <p>Forma de pagamento: <span className="font-semibold">{PAYMENT_METHOD_LABEL[payment.method] ?? PAYMENT_METHOD_LABEL.UNKNOWN}</span></p>
              {order.status === 'CANCELED' && <p>Pedido cancelado. Se houve pagamento, entre em contato para conferência.</p>}
            </div>
          )}
          <div className="mt-6 space-y-3">
            {canRefresh && (
              <button onClick={() => setAttempt((value) => value + 1)} className="h-12 w-full rounded-full bg-black text-[13px] font-bold text-white">
                Consultar novamente
              </button>
            )}
            <Link to="/my-orders" className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold text-black">
              Ver meus pedidos
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default PixPage;

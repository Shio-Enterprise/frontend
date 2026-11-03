import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';
import { REFUND_STATUS } from '../../../lib/refunds';
import { EXCHANGE_STATUS } from '../../../lib/exchanges';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const STATUS_LABEL = {
  AWAITING_PAYMENT: { label: 'Aguardando Pagamento', color: 'bg-[#fff3cd] text-[#856404]' },
  PAID:             { label: 'Pago',                  color: 'bg-[#d4f7e2] text-shio-success' },
  PREPARING:        { label: 'Em Preparação',          color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  SHIPPED:          { label: 'Enviado',                color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  DELIVERED:        { label: 'Entregue',               color: 'bg-[#d4f7e2] text-shio-success' },
  CANCELED:         { label: 'Cancelado',              color: 'bg-[#ffe0e0] text-[#cc0000]' },
};

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/my-orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError('Não foi possível carregar os pedidos.'); return; }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      setError('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  return (
    <AccountLayout>
      <PageMarker name="MyOrdersPage" />
      <h1 className="mb-7 text-[34px] font-black uppercase text-black">Meus Pedidos</h1>

      {loading ? (
        <p className="text-shio-muted">Carregando...</p>
      ) : error ? (
        <p className="text-[13px] text-[#cc0000]">{error}</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-black/10 px-8 py-20 text-center">
          <Icon name="bag" className="h-16 w-16 text-black/20" />
          <p className="mt-6 text-[22px] font-bold text-black">Nenhum pedido encontrado</p>
          <p className="mt-3 max-w-sm text-[16px] text-shio-muted">
            Seus pedidos aparecerão aqui assim que você realizar uma compra.
          </p>
          <Link to="/"
            className="mt-8 inline-flex h-12 items-center gap-3 rounded-full bg-black px-8 text-sm font-medium text-white transition hover:bg-black/85">
            Explorar produtos
            <Icon name="arrowRight" className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const s = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-black/5 text-shio-muted' };
            const refund = REFUND_STATUS[order.refund_status];
            const exchange = EXCHANGE_STATUS[order.exchange_status];
            const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short', year: 'numeric',
            });
            return (
              <Link
                key={order.id}
                to={`/my-orders/${order.id}`}
                className="flex items-center justify-between rounded-[16px] border border-black/10 px-5 py-4 transition hover:border-black/30 hover:bg-black/[0.02]"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] text-shio-muted">{date}</p>
                  <p className="text-[15px] font-bold text-black">
                    Pedido #{String(order.id).slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[14px] font-semibold text-black">
                    R$ {Number(order.total_amount).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {exchange && (
                    <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${exchange.color}`}>
                      {exchange.label}
                    </span>
                  )}
                  {refund && (
                    <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${refund.color}`}>
                      {refund.label}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${s.color}`}>
                    {s.label}
                  </span>
                  <Icon name="arrowRight" className="h-4 w-4 text-shio-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};

export default MyOrdersPage;

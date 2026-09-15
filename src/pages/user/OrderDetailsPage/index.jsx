import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const STATUS_LABEL = {
  AWAITING_PAYMENT: { label: 'Aguardando Pagamento', color: 'bg-[#fff3cd] text-[#856404]' },
  PAID: { label: 'Pago', color: 'bg-[#d4f7e2] text-[#1da64a]' },
  PREPARING: { label: 'Em Preparação', color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  SHIPPED: { label: 'Enviado', color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  DELIVERED: { label: 'Entregue', color: 'bg-[#d4f7e2] text-[#1da64a]' },
  CANCELED: { label: 'Cancelado', color: 'bg-[#ffe0e0] text-[#cc0000]' },
};

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    : '—';

const Section = ({ title, children }) => (
  <div className="rounded-[18px] border border-black/10 p-6">
    <h2 className="mb-4 text-[18px] font-bold text-black">{title}</h2>
    {children}
  </div>
);

const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !id) { setLoading(false); return; }

    fetch(`${API_BASE_URL}/api/orders/my-orders/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setOrder(data);
        if (data.tracking_code) {
          setTrackingLoading(true);
          fetch(`${API_BASE_URL}/api/orders/correios/${id}/tracking/`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then(setTracking)
            .catch(() => setTracking(null))
            .finally(() => setTrackingLoading(false));
        }
      })
      .catch(() => setError('Pedido não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AccountLayout>
        <PageMarker name="OrderDetailsPage" />
        <p className="text-black/40">Carregando pedido...</p>
      </AccountLayout>
    );
  }

  if (error || !order) {
    return (
      <AccountLayout>
        <PageMarker name="OrderDetailsPage" />
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-black/10 px-8 py-20 text-center">
          <Icon name="bag" className="h-16 w-16 text-black/20" />
          <p className="mt-6 text-[22px] font-bold text-black">Pedido não encontrado</p>
          <Link to="/my-orders"
            className="mt-8 inline-flex h-12 items-center gap-3 rounded-full border border-black/20 px-8 text-sm font-medium text-black transition hover:border-black">
            <Icon name="arrowLeft" className="h-5 w-5" />
            Voltar aos pedidos
          </Link>
        </div>
      </AccountLayout>
    );
  }

  const s = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-black/5 text-black/50' };
  const hasTracking = !!order.tracking_code;

  return (
    <AccountLayout>
      <PageMarker name="OrderDetailsPage" />

      {/* Header */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/my-orders"
            className="mb-3 inline-flex items-center gap-2 text-[13px] text-black/40 transition hover:text-black">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Meus Pedidos
          </Link>
          <h1 className="text-[34px] font-black uppercase text-black">
            Pedido #{String(order.id).slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-[14px] text-black/40">{formatDate(order.created_at)}</p>
        </div>
        <span className={`rounded-full px-4 py-2 text-[13px] font-semibold ${s.color}`}>
          {s.label}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-5">

          {/* Items */}
          <Section title="Itens do Pedido">
            <div className="divide-y divide-black/10">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[15px] font-semibold text-black">{item.product_name}</p>
                    <p className="text-[13px] text-black/40">SKU: {item.sku_snapshot}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-black">
                      {item.quantity}× R$ {Number(item.unit_price).toFixed(2)}
                    </p>
                    <p className="text-[13px] text-black/40">
                      R$ {(item.quantity * Number(item.unit_price)).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Rastreio Correios */}
          <Section title="Rastreamento">
            {!hasTracking ? (
              <div className="flex items-center gap-3 text-black/40">
                <Icon name="bag" className="h-5 w-5 shrink-0" />
                <p className="text-[14px]">
                  {order.status === 'AWAITING_PAYMENT' || order.status === 'PAID' || order.status === 'PREPARING'
                    ? 'O pedido ainda está sendo preparado para envio.'
                    : 'Código de rastreio não disponível.'}
                </p>
              </div>
            ) : trackingLoading ? (
              <p className="text-[14px] text-black/40">Consultando Correios...</p>
            ) : tracking && tracking.status !== 'not_shipped' ? (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-black/40">Código</p>
                    <p className="font-mono text-[15px] font-bold text-black">{tracking.tracking_code}</p>
                  </div>
                  {tracking.previsao_entrega && (
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-black/40">Previsão</p>
                      <p className="text-[15px] font-semibold text-black">
                        {new Date(tracking.previsao_entrega).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {tracking.status_atual && (
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-black/40">Status</p>
                      <p className="text-[14px] font-semibold text-black">{tracking.status_atual}</p>
                    </div>
                  )}
                </div>

                {tracking.eventos?.length > 0 && (
                  <div className="relative ml-1 space-y-0">
                    {tracking.eventos.map((ev, i) => (
                      <div key={i} className="flex gap-4">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${i === 0 ? 'border-black bg-black' : 'border-black/30 bg-white'}`} />
                          {i < tracking.eventos.length - 1 && (
                            <div className="w-px flex-1 bg-black/10" />
                          )}
                        </div>
                        {/* Event content */}
                        <div className="pb-5">
                          <p className="text-[14px] font-semibold text-black">{ev.descricao}</p>
                          {ev.detalhe && <p className="text-[13px] text-black/50">{ev.detalhe}</p>}
                          <p className="mt-1 text-[12px] text-black/40">
                            {ev.local && <span>{ev.local} · </span>}
                            {formatDate(ev.data)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-black/40">
                Código de rastreio: <span className="font-mono font-semibold text-black">{order.tracking_code}</span>
                <br />Ainda sem eventos disponíveis nos Correios.
              </p>
            )}
          </Section>

          {/* Histórico do Pedido */}
          <Section title="Histórico do Pedido">
            {order.status_logs?.length > 0 ? (
              <div className="max-h-[20vh] overflow-y-auto pr-2">
                <div className="relative ml-1 space-y-0">
                  {[...order.status_logs]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at) - new Date(a.created_at)
                    )
                    .map((log, i, logs) => {
                      const statusInfo =
                        STATUS_LABEL[log.new_status] ?? {
                          label: log.new_status,
                          color: 'bg-black/5 text-black/50',
                        };

                      return (
                        <div key={log.id} className="flex gap-4">
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${i === 0
                                ? 'border-black bg-black'
                                : 'border-black/30 bg-white'
                                }`}
                            />

                            {i < logs.length - 1 && (
                              <div className="w-px flex-1 bg-black/10" />
                            )}
                          </div>

                          {/* Conteúdo do histórico */}
                          <div className="pb-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[14px] font-semibold text-black">
                                {statusInfo.label}
                              </p>

                              {i === 0 && (
                                <span className="text-[11px] font-semibold uppercase text-black/40">
                                  Atual
                                </span>
                              )}
                            </div>

                            {log.comment && (
                              <p className="mt-1 text-[13px] text-black/50">
                                {log.comment}
                              </p>
                            )}

                            {log.tracking_code && (
                              <p className="mt-1 text-[13px] text-black/50">
                                Código de rastreio:{' '}
                                <span className="font-mono font-semibold text-black">
                                  {log.tracking_code}
                                </span>
                              </p>
                            )}

                            <p className="mt-1 text-[12px] text-black/40">
                              {formatDate(log.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-black/40">
                <Icon
                  name="bag"
                  className="h-5 w-5 shrink-0"
                />

                <p className="text-[14px]">
                  Ainda não há alterações registradas neste pedido.
                </p>
              </div>
            )}
          </Section>
        </div>

        {/* Right column — Summary */}
        <div className="space-y-5">
          <Section title="Resumo">
            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between text-black/60">
                <span>Subtotal</span>
                <span>R$ {Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-black/60">
                <span>Frete</span>
                <span>R$ {Number(order.shipping_cost).toFixed(2)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-[#1da64a]">
                  <span>Desconto</span>
                  <span>− R$ {Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-black/10 pt-3 text-[16px] font-bold text-black">
                <span>Total</span>
                <span>R$ {Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </Section>

          <Section title="Endereço de Entrega">
            <address className="space-y-1 text-[14px] not-italic text-black/70">
              <p>{order.shipping_street}, {order.shipping_number}
                {order.shipping_complement && ` — ${order.shipping_complement}`}
              </p>
              <p>{order.shipping_neighborhood}</p>
              <p>{order.shipping_city} — {order.shipping_state}</p>
              <p>CEP {order.shipping_zip_code}</p>
            </address>
          </Section>

          {order.payment && (
            <Section title="Pagamento">
              <div className="space-y-1 text-[14px] text-black/70">
                <p>Método: <span className="font-semibold text-black">{order.payment.method}</span></p>
                <p>Status: <span className="font-semibold text-black">{order.payment.status}</span></p>
              </div>
            </Section>
          )}
        </div>
      </div>
    </AccountLayout>
  );
};

export default OrderDetailsPage;

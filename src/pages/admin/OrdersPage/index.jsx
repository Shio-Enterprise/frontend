import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { ActionMenu, AdminPanel, AdminTitle, Icon } from '../../../components/ui/ShioDesign';
import ExportButton from '../../../components/admin/ExportButton';
import DrawerShell from '../../../components/admin/DrawerShell';
import Dialog from '../../../components/ui/Dialog';
import AdminRefundPanel from '../../../components/refunds/AdminRefundPanel';
import { REFUND_STATUS, refundTimelineEvents } from '../../../lib/refunds';
import AdminExchangePanel from '../../../components/exchanges/AdminExchangePanel';
import { EXCHANGE_STATUS, exchangeTimelineEvents } from '../../../lib/exchanges';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const STATUS_MAP = {
  AWAITING_PAYMENT: { label: 'Aguardando Pagamento', color: 'text-shio-warning' },
  PAID: { label: 'Pago', color: 'text-shio-success' },
  PREPARING: { label: 'Preparando', color: 'text-blue-600' },
  SHIPPED: { label: 'Em transporte', color: 'text-indigo-600' },
  DELIVERED: { label: 'Entregue', color: 'text-shio-success' },
  CANCELED: { label: 'Cancelado', color: 'text-shio-danger' },
};

const shortId = (id) => `#${String(id).substring(0, 8).toUpperCase()}`;

// A tela mostra "#" + 8 primeiros caracteres em maiúsculas; o ID real é o UUID minúsculo (#89).
const matchesSearch = (order, search) => {
  const term = search.trim().toLowerCase();
  const code = term.replace(/^#\s*/, '');
  return Boolean(
    (code && order.id.toLowerCase().includes(code))
    || order.customer_name?.toLowerCase().includes(term),
  );
};

// ?customer= vem do "Ver pedidos" em Clientes; valor que não é ID válido é ignorado (#88).
const parseCustomerId = (value) => (/^[1-9]\d*$/.test(value ?? '') ? value : null);

const PAYMENT_METHOD_MAP = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BOLETO: 'Boleto',
};

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function OrderDetailDrawer({ id, onChanged }) {
  const navigate = useNavigate();
  const { search: locationSearch } = useLocation();
  const { data: order, loading, refetch } = useApi(`/api/orders/admin/${id}/`);

  const [actionLoading, setActionLoading] = useState(false);
  // O erro fica dentro do painel: no celular ele cobre a página e um aviso lá atrás não seria visto.
  const [actionError, setActionError] = useState(null);
  // Depois de uma ação (ex.: aprovar reembolso, despachar), o botão usado costuma sumir com a
  // atualização do pedido. O foco vai para o título do painel e o resultado é anunciado (#64).
  const [notice, setNotice] = useState(null);
  const titleRef = useRef(null);
  const historyTitleId = useId();

  const pendingNotice = useRef(null);

  // Roda quando o pedido volta atualizado da API.
  useEffect(() => {
    if (!pendingNotice.current || !order) return;
    const message = pendingNotice.current(order);
    pendingNotice.current = null;
    setNotice({ text: message });
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) titleRef.current?.focus();
  }, [order]);

  // describe(pedidoAtualizado) → texto anunciado depois que o pedido recarrega.
  const afterChange = (describe) => {
    pendingNotice.current = describe;
    refetch();
  };
  const statusNotice = (updated) => `Status do pedido: ${STATUS_MAP[updated.status]?.label ?? updated.status}.`;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatCurrency = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;
  const statusInfo = order ? (STATUS_MAP[order.status] ?? { label: order.status, color: 'text-shio-muted' }) : null;

  const dispatchOrder = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const token = getAccessToken();

      const response = await fetch(
        `${API_BASE_URL}/api/orders/correios/${id}/despachar/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || 'Não foi possível despachar o pedido.'
        );
      }

      return data;
    } catch (err) {
      setActionError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus, extraData = {}) => {
    setActionLoading(true);
    setActionError(null);

    try {
      const token = getAccessToken();

      const response = await fetch(
        `${API_BASE_URL}/api/orders/admin/${id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            ...extraData,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.status?.[0] ||
          'Não foi possível atualizar o pedido.'
        );
      }

      return data;
    } catch (err) {
      setActionError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const getPrimaryAction = () => {
    if (!order) return null;
    // O backend recusa o envio enquanto o reembolso aguarda análise.
    if (order.status === 'PREPARING' && order.refund?.status === 'REQUESTED') return null;

    switch (order.status) {
      case 'PAID':
        return {
          label: 'Iniciar preparação',
          action: () => updateOrderStatus('PREPARING'),
        };

      case 'PREPARING':
        return {
          label: 'Despachar pedido',
          action: dispatchOrder,
        };

      case 'SHIPPED':
        return {
          label: 'Marcar como entregue',
          action: () => updateOrderStatus('DELIVERED'),
        };

      default:
        return null;
    }
  };

  const shippingAddress = order
    ? [order.shipping_street, order.shipping_number, order.shipping_complement, order.shipping_neighborhood, `${order.shipping_city} - ${order.shipping_state}`, order.shipping_zip_code]
      .filter(Boolean).join(', ')
    : '';

  const primaryAction = getPrimaryAction();
  // Mantém o filtro de cliente (?customer=) ao fechar o painel.
  const close = () => navigate(`/admin/orders${locationSearch}`);

  return (
    <DrawerShell title="Detalhes do Pedido" onClose={close} width={380} titleRef={titleRef}>
      <p role="status" className="sr-only">{notice?.text}</p>

      {/* Só a primeira carga troca o painel por "Carregando": numa atualização depois de uma
          ação, o conteúdo fica na tela e o foco não se perde. */}
      {loading && !order ? (
        <div className="flex flex-1 items-center justify-center text-shio-muted">Carregando...</div>
      ) : order ? (
        <>
          {/* Rola por dentro e pode não ter nenhum botão (pedido sem ações): tabIndex para rolar pelo teclado. */}
          <div role="region" aria-label={`Pedido ${shortId(order.id)}`} tabIndex={0} className="flex-1 overflow-y-auto focus-visible:outline-offset-[-2px]!">
            <div className="flex items-center justify-between border-b border-black/10 px-7 py-4">
              <span className="text-[16px] font-bold text-black">{shortId(order.id)}</span>
              <span className={`text-[14px] font-semibold ${statusInfo?.color}`}>{statusInfo?.label}</span>
            </div>

            {/* Resumo */}
            <div className="border-b border-black/10 px-7 py-5">
              <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Resumo do pedido</h3>
              <div className="space-y-3 text-[14px]">
                <div className="flex justify-between gap-4">
                  <span className="text-shio-muted">Cliente</span>
                  <span className="text-right font-medium">{order.user?.name || order.user?.email || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-shio-muted">Data do pedido</span>
                  <span className="text-right font-medium">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-shio-muted">Forma de pagamento</span>
                  <span className="text-right font-medium">{PAYMENT_METHOD_MAP[order.payment?.method] ?? order.payment?.method ?? '—'}</span>
                </div>
                {shippingAddress && (
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0 text-shio-muted">Endereço</span>
                    <span className="text-right font-medium">{shippingAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Itens */}
            {order.items?.length > 0 && (
              <div className="border-b border-black/10 px-7 py-5">
                <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Itens do pedido</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-[10px] border border-black/10 p-3">
                      <div className="h-14 w-14 shrink-0 rounded-[6px] bg-[#f0f0f0]" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[14px] font-semibold text-black">{item.product_name}</p>
                        {item.sku_snapshot && <p className="text-[12px] text-shio-muted">{item.sku_snapshot}</p>}
                        <p className="mt-1 text-[14px] font-bold text-black">
                          {formatCurrency(item.unit_price)}
                          {item.quantity > 1 && <span className="ml-1 text-[12px] text-shio-muted">x{item.quantity}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AdminRefundPanel
              order={order}
              onChanged={() => {
                afterChange((updated) => `Reembolso atualizado. ${statusNotice(updated)}`);
                onChanged();
              }}
            />

            <AdminExchangePanel
              order={order}
              onChanged={() => {
                afterChange((updated) => `Troca atualizada. ${statusNotice(updated)}`);
                onChanged();
              }}
            />

            {/* Resumo financeiro */}
            <div className="px-7 py-5">
              <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Resumo financeiro</h3>
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-shio-muted">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-shio-muted">Frete</span>
                  <span>{formatCurrency(order.shipping_cost)}</span>
                </div>
                {parseFloat(order.discount_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-shio-muted">Desconto</span>
                    <span className="text-shio-success">- {formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-black/10 pt-2 text-[16px] font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {actionError && (
            <p role="alert" className="shrink-0 border-t border-black/10 bg-red-50 px-5 py-3 text-sm font-semibold text-shio-danger">
              {actionError}
            </p>
          )}

          <div className="flex shrink-0 gap-3 border-t border-black/10 p-5">
            <button
              type="button"
              onClick={close}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-black/25 font-bold"
            >
              Fechar
            </button>

            {primaryAction && (
              <button
                type="button"
                // aria-disabled e não disabled: um botão desabilitado perde o foco no meio da ação.
                aria-disabled={actionLoading}
                onClick={async () => {
                  if (actionLoading) return;
                  try {
                    await primaryAction.action();
                    afterChange(statusNotice);
                    onChanged();
                  } catch {
                    // ja tratado
                  }
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-lg bg-black font-bold text-white aria-disabled:opacity-50"
              >
                {actionLoading
                  ? 'Processando...'
                  : primaryAction.label}
              </button>
            )}
          </div>

          {(order.status_logs?.length > 0 || order.refund || order.exchanges?.length > 0) && (
            <div className="border-t border-black/10 px-7 py-5">
              <h3 id={historyTitleId} className="mb-5 text-[15px] font-bold uppercase">
                Histórico do pedido
              </h3>

              {/* Rola por dentro: tabIndex para dar para rolar com as setas do teclado (#64). */}
              <div role="region" aria-labelledby={historyTitleId} tabIndex={0} className="max-h-[33vh] overflow-y-auto pr-2 focus-visible:outline-offset-[-2px]!">
                <OrderTimeline
                  logs={order.status_logs}
                  refund={order.refund}
                  exchanges={order.exchanges}
                  trackingCode={order.tracking_code}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-shio-muted">Pedido não encontrado.</div>
      )}
    </DrawerShell>
  );
}

// ─── Order Time Line ──────────────────────────────────────────────────────

function OrderTimeline({ logs = [], refund, exchanges = [], trackingCode }) {
  const orderedLogs = [
    ...logs.map((log) => ({
      ...log,
      ...(STATUS_MAP[log.new_status] ?? { label: log.new_status, color: 'text-black' }),
    })),
    ...refundTimelineEvents(refund).map((event) => ({ ...event, color: 'text-black' })),
    ...exchangeTimelineEvents(exchanges).map((event) => ({ ...event, color: 'text-black' })),
  ].sort(
    (a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
      {orderedLogs.map((log, index) => {
        const info = log;

        return (
          <li
            key={log.id}
            className="relative flex gap-4"
          >
            <div aria-hidden="true" className="flex flex-col items-center">
              <div className="mt-1 h-3 w-3 rounded-full bg-black" />

              {index < orderedLogs.length - 1 && (
                <div className="h-full w-px bg-black/15" />
              )}
            </div>

            <div className="pb-5">
              <p className={`text-sm font-bold ${info.color}`}>
                {info.label}
              </p>

              <p className="mt-1 text-xs text-shio-muted">
                {new Date(log.created_at).toLocaleString(
                  'pt-BR'
                )}
              </p>

              {log.comment && (
                <p className="mt-1 text-sm text-black/60">
                  {log.comment}
                </p>
              )}

              {log.tracking_code && (
                <p className="mt-1 text-xs font-medium">
                  Rastreio: {log.tracking_code}
                </p>
              )}
            </div>
          </li>
        );
      })}
      </ol>

      {trackingCode && (
        <div className="rounded-lg bg-[#f5f5f5] p-3 text-sm">
          <span className="text-shio-muted">
            Código de rastreio:
          </span>{' '}
          <strong>{trackingCode}</strong>
        </div>
      )}
    </div>
  );
}

// ─── OrdersPage ───────────────────────────────────────────────────────────────

function OrderBadges({ order }) {
  return (
    <>
      {REFUND_STATUS[order.refund_status] && (
        <span className={`mt-2 block w-fit rounded-full px-3 py-1 text-[13px] font-semibold ${REFUND_STATUS[order.refund_status].color}`}>
          {REFUND_STATUS[order.refund_status].label}
        </span>
      )}
      {EXCHANGE_STATUS[order.exchange_status] && (
        <span className={`mt-2 block w-fit rounded-full px-3 py-1 text-[13px] font-semibold ${EXCHANGE_STATUS[order.exchange_status].color}`}>
          {EXCHANGE_STATUS[order.exchange_status].label}
        </span>
      )}
    </>
  );
}

const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { search: locationSearch } = useLocation();
  const customerId = parseCustomerId(searchParams.get('customer'));
  const searchInputRef = useRef(null);
  const [refundFilter, setRefundFilter] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('');
  const listQuery = new URLSearchParams({
    ...(customerId ? { customer: customerId } : {}),
    ...(refundFilter ? { refund_status: refundFilter } : {}),
    ...(exchangeFilter ? { exchange_status: exchangeFilter } : {}),
  }).toString();
  const { data: ordersData, loading, error, refetch } = useApi(
    `/api/orders/admin/${listQuery ? `?${listQuery}` : ''}`,
  );
  const [search, setSearch] = useState('');
  const [knownCustomer, setKnownCustomer] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const cancelTitleId = useId();
  // Depois de cancelar, o item do menu some: o foco vai para o aviso do resultado (#64).
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const orderMatch = useMatch('/admin/orders/:id');
  const selectedId = orderMatch?.params?.id ?? null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };
  const formatTotal = (order) => `R$ ${parseFloat(order.total_amount).toFixed(2)}`;

  const renderStatus = (statusKey, sizeClass = 'text-[18px]') => {
    const { label, color } = STATUS_MAP[statusKey] ?? { label: statusKey, color: 'text-shio-muted' };
    return <span className={`${sizeClass} font-semibold ${color}`}>{label}</span>;
  };

  const getOrderMenuItems = (order) => {
    const items = [
      {
        label: 'Ver detalhes',
        to: `/admin/orders/${order.id}${locationSearch}`,
      },
    ];

    if (order.status === 'AWAITING_PAYMENT') {
      items.push(
        { separator: true, key: 'sep' },
        {
          label: 'Cancelar pedido',
          danger: true,
          icon: 'trash',
          onClick: () => setCancelTarget(order),
        }
      );
    }

    return items;
  };

  const handleCancel = async () => {
    if (!cancelTarget || canceling) return;
    setCanceling(true);
    setActionError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/orders/admin/${cancelTarget.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELED' }),
      });
      if (!response.ok) throw new Error('Falha ao cancelar o pedido.');
      setNotice({ text: `Pedido ${shortId(cancelTarget.id)} cancelado.` });
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancelTarget(null);
      setCanceling(false);
    }
  };

  const renderContent = () => {
    // Ao atualizar (botão Atualizar, ação no painel), a lista atual fica na tela.
    if (loading && !ordersData) return <div role="status" className="p-10 text-center text-shio-muted">Carregando pedidos...</div>;
    if (error) return <div role="alert" className="p-10 text-center text-shio-danger">Erro ao carregar pedidos. Tente novamente.</div>;

    const allOrders = Array.isArray(ordersData) ? ordersData : ordersData?.results ?? [];
    const orders = search.trim()
      ? allOrders.filter((o) => matchesSearch(o, search))
      : allOrders;

    if (orders.length === 0) return <div className="p-10 text-center text-shio-muted">Nenhum pedido encontrado.</div>;

    return (
      <>
      {/* Celular: um card por pedido (#64). */}
      <ul aria-label="Pedidos" className="divide-y divide-black/10 border-t border-black/10 md:hidden">
        {orders.map((order) => (
          <li key={order.id} className={`flex items-start gap-3 py-4 pl-4 pr-2 ${selectedId === order.id ? 'bg-[#f9f9f9]' : ''}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-black">{shortId(order.id)}</p>
              <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[13px]">
                <dt className="text-shio-muted">Cliente</dt>
                <dd className="break-words text-black">{order.customer_name || '—'}</dd>
                <dt className="text-shio-muted">Data</dt>
                <dd className="text-black">{formatDate(order.created_at)}</dd>
                <dt className="text-shio-muted">Total</dt>
                <dd className="text-black">{formatTotal(order)}</dd>
                <dt className="text-shio-muted">Status</dt>
                <dd>{renderStatus(order.status, 'text-[13px]')}</dd>
              </dl>
              <OrderBadges order={order} />
            </div>
            <ActionMenu label={`Ações para o pedido ${shortId(order.id)}`} items={getOrderMenuItems(order)} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left">
          <caption className="sr-only">Pedidos</caption>
          <thead className="bg-[#f0f0f0] text-[20px] text-shio-muted">
            <tr>
              <th className="px-10 py-6 font-normal">ID</th>
              <th className="px-10 py-6 font-normal">Cliente</th>
              <th className="px-10 py-6 font-normal">Data</th>
              <th className="px-10 py-6 font-normal">Total</th>
              <th className="px-10 py-6 font-normal">Status</th>
              <th className="px-10 py-6 text-right font-normal">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {orders.map((order) => (
              <tr key={order.id} className={selectedId === order.id ? 'bg-[#f9f9f9]' : ''}>
                <td className="px-10 py-8 text-[20px] font-semibold text-black">
                  {shortId(order.id)}
                </td>
                <td className="px-10 py-8 text-[20px] text-shio-muted">{order.customer_name}</td>
                <td className="px-10 py-8 text-[20px] text-shio-muted">{formatDate(order.created_at)}</td>
                <td className="px-10 py-8 text-[20px] text-shio-muted">{formatTotal(order)}</td>
                <td className="px-10 py-8">
                  {renderStatus(order.status)}
                  <OrderBadges order={order} />
                </td>
                <td className="px-10 py-8 text-right">
                  <ActionMenu
                    label={`Ações para o pedido ${shortId(order.id)}`}
                    items={getOrderMenuItems(order)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  const allOrders = Array.isArray(ordersData) ? ordersData : ordersData?.results ?? [];
  // A lista já vem filtrada pelo cliente: o nome sai do primeiro pedido. Fica guardado para o
  // chip não perder o nome quando reembolso/troca esvaziam a lista. Durante o carregamento a
  // lista ainda pode ser a do cliente anterior, então só vale com a resposta já chegada.
  const listedName = customerId && !loading ? allOrders[0]?.customer_name : null;
  if (listedName && (knownCustomer?.id !== customerId || knownCustomer.name !== listedName)) {
    setKnownCustomer({ id: customerId, name: listedName });
  }
  const customerName = listedName || (knownCustomer?.id === customerId ? knownCustomer.name : null);

  const clearCustomerFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('customer');
    setSearchParams(next);
    // O chip some junto com o botão: o foco vai para a busca (#64).
    searchInputRef.current?.focus();
  };

  const exportParams = {
    ...(customerId ? { customer: customerId } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };

  return (
    <div>
      <AdminTitle title="Pedidos" />

      {actionError && (
        <div role="alert" className="mb-4 rounded-[10px] bg-red-50 px-5 py-3 text-sm font-semibold text-shio-danger">
          {actionError}
          <button type="button" className="ml-3 min-h-11 underline" onClick={() => setActionError(null)}>Fechar</button>
        </div>
      )}

      <AdminPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <label className="flex h-12 min-w-0 max-w-[675px] flex-1 basis-56 items-center gap-4 rounded-full border border-black/20 px-5 text-shio-muted">
            <Icon name="search" className="h-5 w-5 shrink-0" />
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Buscar pedidos por ID ou cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-shio-placeholder md:text-[20px]"
              placeholder="Buscar por ID ou cliente..."
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="refund-filter">Filtrar por reembolso</label>
            <select
              id="refund-filter"
              value={refundFilter}
              onChange={(event) => setRefundFilter(event.target.value)}
              className="h-11 rounded-lg border border-black/20 bg-white px-3 text-sm text-black"
            >
              <option value="">Reembolso: todos</option>
              <option value="REQUESTED">Reembolso: solicitados</option>
              <option value="APPROVED">Reembolso: aprovados</option>
              <option value="COMPLETED">Reembolso: concluídos</option>
              <option value="REJECTED">Reembolso: recusados</option>
            </select>

            <label className="sr-only" htmlFor="exchange-filter">Filtrar por troca</label>
            <select
              id="exchange-filter"
              value={exchangeFilter}
              onChange={(event) => setExchangeFilter(event.target.value)}
              className="h-11 rounded-lg border border-black/20 bg-white px-3 text-sm text-black"
            >
              <option value="">Troca: todas</option>
              {Object.entries(EXCHANGE_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>{`Troca: ${label.replace(/^Troca /, '').toLowerCase()}`}</option>
              ))}
            </select>

            <ExportButton
              endpoint="/api/orders/admin/export/"
              params={exportParams}
              fallbackFilename="pedidos"
            />

            <button
              type="button"
              onClick={() => {
                if (!loading) refetch();
              }}
              // aria-disabled: com disabled o botão perderia o foco enquanto atualiza.
              aria-disabled={loading}
              className="flex h-11 items-center gap-2 rounded-lg bg-black px-4 text-white transition hover:bg-black/85 aria-disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
              />

              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
        {customerId && (
          <div className="px-5 pb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f0f0] pl-4 text-black">
              <span>{customerName ? `Pedidos de ${customerName}` : 'Pedidos do cliente selecionado'}</span>
              <button
                type="button"
                aria-label="Limpar filtro de cliente"
                onClick={clearCustomerFilter}
                // shrink-0: com nome longo no celular o botão encolhia para ~14px de largura.
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold hover:bg-black/10"
              >
                ×
              </button>
            </span>
          </div>
        )}
        {renderContent()}
      </AdminPanel>

      {selectedId && (
        <OrderDetailDrawer id={selectedId} onChanged={refetch} />
      )}

      {cancelTarget && (
        <Dialog
          labelledBy={cancelTitleId}
          onClose={() => !canceling && setCancelTarget(null)}
          className="w-full max-w-md rounded-[18px] bg-white p-6"
        >
          <h2 id={cancelTitleId} className="text-[20px] font-bold text-black">Cancelar pedido {shortId(cancelTarget.id)}?</h2>
          <p className="mt-2 text-[14px] text-shio-muted">O pedido ainda aguarda pagamento. Esta ação não pode ser desfeita.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              disabled={canceling}
              className="h-11 rounded-full border border-black/15 px-6 text-sm font-medium text-black transition hover:border-black"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={canceling}
              className="h-11 rounded-full bg-shio-danger px-6 text-sm font-medium text-white transition hover:bg-shio-danger-hover disabled:opacity-40"
            >
              {canceling ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        </Dialog>
      )}

      <p ref={noticeRef} tabIndex={-1} role="status" className="sr-only">{notice?.text}</p>
    </div>
  );
};

export default OrdersPage;

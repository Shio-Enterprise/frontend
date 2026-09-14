import { useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { ActionMenu, AdminPanel, AdminTitle, Icon, PageMarker } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const STATUS_MAP = {
  AWAITING_PAYMENT: { label: 'Aguardando Pagamento', color: 'text-yellow-600' },
  PAID: { label: 'Pago', color: 'text-[#00a651]' },
  PREPARING: { label: 'Preparando', color: 'text-blue-600' },
  SHIPPED: { label: 'Em transporte', color: 'text-indigo-600' },
  DELIVERED: { label: 'Entregue', color: 'text-[#00a651]' },
  CANCELED: { label: 'Cancelado', color: 'text-[#ff3333]' },
};

const PAYMENT_METHOD_MAP = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BOLETO: 'Boleto',
};

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function OrderDetailDrawer({ id, onError }) {
  const navigate = useNavigate();
  const { data: order, loading, refetch } = useApi(`/api/orders/admin/${id}/`);

  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatCurrency = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;
  const statusInfo = order ? (STATUS_MAP[order.status] ?? { label: order.status, color: 'text-black/55' }) : null;

  const dispatchOrder = async () => {
    setActionLoading(true);
    onError(null);

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
      onError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus, extraData = {}) => {
    setActionLoading(true);
    onError(null);

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
      onError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const getPrimaryAction = () => {
    if (!order) return null;

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

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[380px] flex-col border-l border-black/10 bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-7 py-5">
        <h2 className="text-[18px] font-black uppercase tracking-wide">Detalhes do Pedido</h2>
        <button onClick={() => navigate('/admin/orders')} aria-label="Fechar" className="rounded-full p-1 transition hover:bg-black/5">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-black/40">Carregando...</div>
      ) : order ? (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/10 px-7 py-4">
              <span className="text-[16px] font-bold text-black">#{String(order.id).substring(0, 8).toUpperCase()}</span>
              <span className={`text-[14px] font-semibold ${statusInfo?.color}`}>{statusInfo?.label}</span>
            </div>

            {/* Resumo */}
            <div className="border-b border-black/10 px-7 py-5">
              <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Resumo do pedido</h3>
              <div className="space-y-3 text-[14px]">
                <div className="flex justify-between gap-4">
                  <span className="text-black/55">Cliente</span>
                  <span className="text-right font-medium">{order.user?.name || order.user?.email || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-black/55">Data do pedido</span>
                  <span className="text-right font-medium">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-black/55">Forma de pagamento</span>
                  <span className="text-right font-medium">{PAYMENT_METHOD_MAP[order.payment?.method] ?? order.payment?.method ?? '—'}</span>
                </div>
                {shippingAddress && (
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0 text-black/55">Endereço</span>
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
                        {item.sku_snapshot && <p className="text-[12px] text-black/45">{item.sku_snapshot}</p>}
                        <p className="mt-1 text-[14px] font-bold text-black">
                          {formatCurrency(item.unit_price)}
                          {item.quantity > 1 && <span className="ml-1 text-[12px] text-black/45">x{item.quantity}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo financeiro */}
            <div className="px-7 py-5">
              <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Resumo financeiro</h3>
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-black/55">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55">Frete</span>
                  <span>{formatCurrency(order.shipping_cost)}</span>
                </div>
                {parseFloat(order.discount_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-black/55">Desconto</span>
                    <span className="text-[#00a651]">- {formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-black/10 pt-2 text-[16px] font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-black/10 p-5">
            <button
              onClick={() => navigate('/admin/orders')}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-black/25 font-bold"
            >
              Fechar
            </button>

            {primaryAction && (
              <button
                disabled={actionLoading}
                onClick={async () => {
                  try {
                    await primaryAction.action();

                    refetch();
                  } catch {
                    // ja tratado
                  }
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-lg bg-black font-bold text-white disabled:opacity-50"
              >
                {actionLoading
                  ? 'Processando...'
                  : primaryAction.label}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-black/40">Pedido não encontrado.</div>
      )}
    </aside>
  );
}

// ─── OrdersPage ───────────────────────────────────────────────────────────────

const OrdersPage = () => {
  const { data: ordersData, loading, error, refetch } = useApi('/api/orders/admin/');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState(null);

  const orderMatch = useMatch('/admin/orders/:id');
  const selectedId = orderMatch?.params?.id ?? null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const renderStatus = (statusKey) => {
    const { label, color } = STATUS_MAP[statusKey] ?? { label: statusKey, color: 'text-black/55' };
    return <span className={`text-[18px] font-semibold ${color}`}>{label}</span>;
  };

  const getOrderMenuItems = (order) => {
    const items = [
      {
        label: 'Ver detalhes',
        to: `/admin/orders/${order.id}`,
      },
    ];

    if (order.status === 'AWAITING_PAYMENT') {
      items.push(
        { separator: true, key: 'sep' },
        {
          label: 'Cancelar pedido',
          danger: true,
          icon: 'trash',
          onClick: () => handleCancel(order.id),
        }
      );
    }

    return items;
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancelar este pedido?')) return;
    setActionError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/orders/admin/${orderId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELED' }),
      });
      if (!response.ok) throw new Error('Falha ao cancelar o pedido.');
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const renderContent = () => {
    if (loading) return <div className="p-10 text-center text-black/55">Carregando pedidos...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Erro ao carregar pedidos. Tente novamente.</div>;

    const allOrders = Array.isArray(ordersData) ? ordersData : ordersData?.results ?? [];
    const orders = search.trim()
      ? allOrders.filter((o) =>
        o.id.includes(search) ||
        o.customer_name?.toLowerCase().includes(search.toLowerCase())
      )
      : allOrders;

    if (orders.length === 0) return <div className="p-10 text-center text-black/55">Nenhum pedido encontrado.</div>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#f0f0f0] text-[20px] text-black/55">
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
                  #{order.id.substring(0, 8).toUpperCase()}
                </td>
                <td className="px-10 py-8 text-[20px] text-black/55">{order.customer_name}</td>
                <td className="px-10 py-8 text-[20px] text-black/55">{formatDate(order.created_at)}</td>
                <td className="px-10 py-8 text-[20px] text-black/55">
                  R$ {parseFloat(order.total_amount).toFixed(2)}
                </td>
                <td className="px-10 py-8">{renderStatus(order.status)}</td>
                <td className="px-10 py-8 text-right">
                  <ActionMenu
                    label={`Ações para o pedido #${order.id}`}
                    items={getOrderMenuItems(order)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <PageMarker name="OrdersPage" />
      <AdminTitle title="Pedidos" />

      {actionError && (
        <div className="mb-4 rounded-[10px] bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
          {actionError}
          <button type="button" className="ml-3 underline" onClick={() => setActionError(null)}>Fechar</button>
        </div>
      )}

      <AdminPanel className="overflow-hidden">
        <div className="flex p-5 justify-between">
          <label className="flex h-12 max-w-[675px] items-center gap-4 rounded-full border border-black/20 px-5 text-black/45">
            <Icon name="search" className="h-5 w-5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[20px] outline-none placeholder:text-black/35"
              placeholder="Buscar por ID ou cliente..."
            />
          </label>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-white transition hover:bg-black/85 disabled:opacity-50"
          >
            <Icon
              name="refresh"
              className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
            />

            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        {renderContent()}
      </AdminPanel>

      {selectedId && <OrderDetailDrawer id={selectedId} onError={setActionError} />}
    </div>
  );
};

export default OrdersPage;

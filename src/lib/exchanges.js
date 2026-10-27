import apiClient from './axios';

export const EXCHANGE_STATUS = {
  REQUESTED: { label: 'Troca solicitada', color: 'bg-[#fff3cd] text-[#856404]' },
  APPROVED: { label: 'Troca aprovada', color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  RECEIVED: { label: 'Peça recebida', color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  COMPLETED: { label: 'Troca concluída', color: 'bg-[#d4f7e2] text-[#1da64a]' },
  REJECTED: { label: 'Troca recusada', color: 'bg-[#ffe0e0] text-[#cc0000]' },
  CANCELED: { label: 'Troca cancelada', color: 'bg-black/5 text-black/50' },
};

export const EXCHANGE_REASONS = [
  { value: 'SIZE_OR_COLOR', label: 'Tamanho ou cor' },
  { value: 'DEFECT', label: 'Defeito' },
];

export const EXCHANGE_CONDITIONS = [
  { value: 'RESTOCK', label: 'Volta ao estoque' },
  { value: 'LOSS', label: 'Perda/avaria' },
];

export const EXCHANGE_COMMENT_MAX = 1000;

// Impedimentos que o cliente precisa conhecer; nos demais não há o que mostrar.
const VISIBLE_EXCHANGE_BLOCKS = new Set(['deadline_passed', 'delivery_date_unknown']);

export const hasCustomerExchangePanel = (order) =>
  Boolean(
    order.exchanges?.length
    || order.exchange_eligibility?.can_request
    || VISIBLE_EXCHANGE_BLOCKS.has(order.exchange_eligibility?.code),
  );

export const openExchange = (order) =>
  order.exchanges?.find((exchange) => ['REQUESTED', 'APPROVED', 'RECEIVED'].includes(exchange.status)) ?? null;

export const variationLabel = (variation) => {
  if (!variation) return '—';
  return variation.color ? `${variation.size} / ${variation.color}` : variation.size;
};

const shortId = (id) => String(id).slice(0, 8);

// Eventos das trocas para a linha do tempo do pedido, no formato dos logs.
export function exchangeTimelineEvents(exchanges = []) {
  return exchanges.flatMap((exchange) => {
    const key = shortId(exchange.id);
    const events = [
      { id: `exchange-requested-${key}`, label: 'Troca solicitada', created_at: exchange.created_at },
    ];
    if (exchange.reviewed_at) {
      events.push({
        id: `exchange-reviewed-${key}`,
        label: exchange.status === 'REJECTED' ? 'Troca recusada' : 'Troca aprovada',
        created_at: exchange.reviewed_at,
        comment: exchange.status === 'REJECTED' ? exchange.review_message : '',
      });
    }
    if (exchange.received_at) {
      events.push({ id: `exchange-received-${key}`, label: 'Peça da troca recebida', created_at: exchange.received_at });
    }
    if (exchange.completed_at) {
      events.push({
        id: `exchange-completed-${key}`,
        label: 'Nova peça enviada',
        created_at: exchange.completed_at,
        tracking_code: exchange.tracking_code,
      });
    }
    if (exchange.canceled_at) {
      events.push({
        id: `exchange-canceled-${key}`,
        label: 'Troca cancelada',
        created_at: exchange.canceled_at,
        comment: exchange.review_message,
      });
    }
    return events;
  });
}

export async function requestExchange(orderId, { reason, comment, items }) {
  const { data } = await apiClient.post(`/orders/my-orders/${orderId}/exchange-request/`, { reason, comment, items });
  return data;
}

const adminAction = (action) => async (orderId, payload = {}) => {
  const { data } = await apiClient.post(`/orders/admin/${orderId}/exchange/${action}/`, payload);
  return data;
};

export const approveExchange = adminAction('approve');
export const rejectExchange = adminAction('reject');
export const receiveExchange = adminAction('receive');
export const completeExchange = adminAction('complete');
export const cancelExchange = adminAction('cancel');

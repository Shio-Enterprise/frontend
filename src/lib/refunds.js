import apiClient from './axios';

export const REFUND_STATUS = {
  REQUESTED: { label: 'Reembolso solicitado', color: 'bg-[#fff3cd] text-[#856404]' },
  APPROVED: { label: 'Reembolso aprovado', color: 'bg-[#e0f0ff] text-[#0a6bc4]' },
  REJECTED: { label: 'Reembolso recusado', color: 'bg-[#ffe0e0] text-[#cc0000]' },
  COMPLETED: { label: 'Reembolsado', color: 'bg-[#d4f7e2] text-[#1da64a]' },
};

// O cliente escolhe só entre estes; o backend rejeita os demais.
export const CUSTOMER_REFUND_REASONS = [
  { value: 'CUSTOMER_REQUEST', label: 'Desisti da compra' },
  { value: 'PRODUCT_ISSUE', label: 'Problema com o produto' },
  { value: 'OTHER', label: 'Outro' },
];

export const ADMIN_REFUND_REASONS = [
  { value: 'CUSTOMER_REQUEST', label: 'Desistência do cliente' },
  { value: 'PRODUCT_ISSUE', label: 'Problema com o produto' },
  { value: 'DELIVERY_ISSUE', label: 'Problema na entrega' },
  { value: 'PAID_AFTER_CANCELLATION', label: 'Pagamento após cancelamento' },
  { value: 'OTHER', label: 'Outro' },
];

export const REFUND_COMMENT_MAX = 1000;

// Impedimentos que o cliente precisa conhecer; nos demais não há o que mostrar.
const VISIBLE_REFUND_BLOCKS = new Set(['deadline_passed', 'delivery_date_unknown']);

export const hasCustomerRefundPanel = (order) =>
  Boolean(
    order.refund
    || order.refund_eligibility?.can_request
    || VISIBLE_REFUND_BLOCKS.has(order.refund_eligibility?.code),
  );

export const formatRefundDate = (iso, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })
    : '—';

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Eventos do reembolso para a linha do tempo do pedido, no formato dos logs.
export function refundTimelineEvents(refund) {
  if (!refund) return [];
  const events = [
    { id: `refund-requested-${refund.id}`, label: 'Reembolso solicitado', created_at: refund.created_at },
  ];
  if (refund.reviewed_at && refund.status !== 'REQUESTED') {
    events.push({
      id: `refund-reviewed-${refund.id}`,
      label: refund.status === 'REJECTED' ? 'Reembolso recusado' : 'Reembolso aprovado',
      created_at: refund.reviewed_at,
      comment: refund.review_message || '',
    });
  }
  if (refund.status === 'COMPLETED') {
    events.push({
      id: `refund-completed-${refund.id}`,
      label: 'Reembolsado',
      created_at: refund.completed_at ?? refund.refunded_at,
    });
  }
  return events;
}

export function refundErrorMessage(error, fallback = 'Não foi possível concluir a operação.') {
  const data = error?.response?.data;
  if (typeof data?.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}

export async function requestRefund(orderId, { reason, comment }) {
  const { data } = await apiClient.post(`/orders/my-orders/${orderId}/refund-request/`, { reason, comment });
  return data;
}

export async function approveRefund(orderId, { message }) {
  const { data } = await apiClient.post(`/orders/admin/${orderId}/refund/approve/`, { message });
  return data;
}

export async function rejectRefund(orderId, { message }) {
  const { data } = await apiClient.post(`/orders/admin/${orderId}/refund/reject/`, { message });
  return data;
}

export async function completeRefund(orderId, payload) {
  const { data } = await apiClient.post(`/orders/admin/${orderId}/refund/`, payload);
  return data;
}

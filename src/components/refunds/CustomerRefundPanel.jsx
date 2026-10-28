import { REFUND_STATUS, formatMoney, formatRefundDate } from '../../lib/refunds';

function RefundStatus({ refund }) {
  const status = REFUND_STATUS[refund.status] ?? { label: refund.status, color: 'bg-black/5 text-black/50' };
  return (
    <div className="space-y-3 text-[14px] text-black/70">
      <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${status.color}`}>
        {status.label}
      </span>
      {refund.status === 'REQUESTED' && (
        <p>Solicitado em {formatRefundDate(refund.created_at)} — em análise pela loja.</p>
      )}
      {refund.status === 'APPROVED' && (
        <p>Aprovado em {formatRefundDate(refund.reviewed_at)}. Você receberá um e-mail quando o estorno for feito.</p>
      )}
      {refund.status === 'REJECTED' && (
        <p>Recusado em {formatRefundDate(refund.reviewed_at)}.</p>
      )}
      {refund.status === 'COMPLETED' && (
        <>
          <p>
            Estorno de <strong className="text-black">{formatMoney(refund.amount)}</strong> feito em{' '}
            {formatRefundDate(refund.refunded_at)}.
          </p>
          <p className="text-[13px] text-black/55">
            O valor volta pelo mesmo meio de pagamento. O prazo para aparecer depende do seu banco ou da operadora do cartão.
          </p>
        </>
      )}
      {refund.review_message && (
        <div className="rounded-[12px] bg-[#f7f7f7] p-3">
          <p className="text-[12px] font-semibold uppercase text-black/40">
            {refund.status === 'REJECTED' ? 'Justificativa da loja' : 'Mensagem da loja'}
          </p>
          <p className="mt-1 whitespace-pre-line text-black">{refund.review_message}</p>
        </div>
      )}
      <p className="text-[13px] text-black/55">
        Motivo informado: {refund.reason_label}
        {refund.customer_comment && ` — ${refund.customer_comment}`}
      </p>
    </div>
  );
}

export default function CustomerRefundPanel({ order, onRequest }) {
  if (order.refund) return <RefundStatus refund={order.refund} />;

  const eligibility = order.refund_eligibility ?? {};
  if (eligibility.can_request) {
    return (
      <div className="space-y-3 text-[14px] text-black/70">
        <p>
          {eligibility.deadline
            ? `Você pode solicitar o reembolso até ${formatRefundDate(eligibility.deadline)}.`
            : 'Você pode solicitar o reembolso deste pedido.'}
        </p>
        <button
          type="button"
          onClick={onRequest}
          className="h-11 w-full rounded-full border border-black/20 px-6 text-sm font-semibold text-black transition hover:border-black"
        >
          Solicitar reembolso
        </button>
      </div>
    );
  }
  return <p className="text-[14px] text-black/55">{eligibility.message}</p>;
}

import { EXCHANGE_STATUS } from '../../lib/exchanges';
import { formatRefundDate } from '../../lib/refunds';
import ExchangeItemsList from './ExchangeItemsList';

const STATUS_TEXT = {
  REQUESTED: (e) => `Solicitada em ${formatRefundDate(e.created_at)}, em análise pela loja. Não envie a peça antes da aprovação.`,
  APPROVED: (e) => `Aprovada em ${formatRefundDate(e.reviewed_at)}. A nova peça está reservada; envie a peça conforme as instruções.`,
  RECEIVED: (e) => `Peça recebida em ${formatRefundDate(e.received_at)}. Você receberá o rastreio da nova peça por e-mail.`,
  COMPLETED: (e) => `Nova peça enviada em ${formatRefundDate(e.completed_at)}.`,
  REJECTED: (e) => `Recusada em ${formatRefundDate(e.reviewed_at)}.`,
  CANCELED: (e) => `Cancelada em ${formatRefundDate(e.canceled_at)}.`,
};

const MESSAGE_TITLE = {
  APPROVED: 'Como enviar a peça',
  REJECTED: 'Justificativa da loja',
};

function ExchangeCard({ exchange }) {
  const status = EXCHANGE_STATUS[exchange.status] ?? { label: exchange.status, color: 'bg-black/5 text-shio-muted' };
  return (
    <div className="space-y-3 text-[14px] text-black/70" data-testid={`exchange-${exchange.id}`}>
      <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${status.color}`}>
        {status.label}
      </span>
      <p>{STATUS_TEXT[exchange.status]?.(exchange)}</p>
      <ExchangeItemsList items={exchange.items} />
      {exchange.tracking_code && (
        <p className="text-[13px]">
          Rastreio da nova peça:{' '}
          <span className="font-mono font-semibold text-black">{exchange.tracking_code}</span>
        </p>
      )}
      {exchange.review_message && (
        <div className="rounded-[12px] bg-[#f7f7f7] p-3">
          <p className="text-[12px] font-semibold uppercase text-shio-muted">
            {MESSAGE_TITLE[exchange.status] ?? 'Mensagem da loja'}
          </p>
          <p className="mt-1 whitespace-pre-line text-black">{exchange.review_message}</p>
        </div>
      )}
      <p className="text-[13px] text-shio-muted">
        Motivo informado: {exchange.reason_label}
        {exchange.customer_comment && ` — ${exchange.customer_comment}`}
      </p>
    </div>
  );
}

export default function CustomerExchangePanel({ order, onRequest }) {
  const exchanges = order.exchanges ?? [];
  const eligibility = order.exchange_eligibility ?? {};
  return (
    <div className="space-y-5">
      {exchanges.map((exchange) => (
        <ExchangeCard key={exchange.id} exchange={exchange} />
      ))}
      {eligibility.can_request ? (
        <div className="space-y-3 text-[14px] text-black/70">
          <p>
            Troca por tamanho ou cor até {formatRefundDate(eligibility.size_or_color_deadline)}; por defeito até{' '}
            {formatRefundDate(eligibility.defect_deadline)}.
          </p>
          <button
            type="button"
            onClick={onRequest}
            className="h-11 w-full rounded-full border border-black/20 px-6 text-sm font-semibold text-black transition hover:border-black"
          >
            {exchanges.length ? 'Trocar outro item' : 'Solicitar troca'}
          </button>
        </div>
      ) : (
        eligibility.code !== 'exchange_in_progress' && eligibility.message && (
          <p className="text-[14px] text-shio-muted">{eligibility.message}</p>
        )
      )}
    </div>
  );
}

import { useState } from 'react';
import AdminModal from '../ui/AdminModal';
import {
  EXCHANGE_CONDITIONS,
  EXCHANGE_STATUS,
  approveExchange,
  cancelExchange,
  completeExchange,
  openExchange,
  receiveExchange,
  rejectExchange,
} from '../../lib/exchanges';
import { formatRefundDate, refundErrorMessage } from '../../lib/refunds';
import ExchangeItemsList from './ExchangeItemsList';

const inputClass = 'mt-2 w-full rounded-[12px] border border-black/15 px-4 py-3 text-[14px] text-black outline-none focus:border-black';

const MESSAGE_MODES = {
  approve: {
    title: 'Aprovar troca',
    label: 'Instruções de envio ao cliente (opcional)',
    placeholder: 'Ex.: endereço, prazo e como embalar a peça',
    submit: 'Aprovar',
    action: approveExchange,
    hint: 'Ao aprovar, a nova peça sai do estoque como reserva da troca.',
  },
  reject: {
    title: 'Recusar troca',
    label: 'Justificativa (obrigatória)',
    submit: 'Recusar',
    action: rejectExchange,
    required: true,
    danger: true,
  },
  cancel: {
    title: 'Cancelar troca',
    label: 'Motivo do cancelamento (obrigatório)',
    placeholder: 'Ex.: a variação escolhida acabou; o cliente pode pedir reembolso',
    submit: 'Cancelar troca',
    action: cancelExchange,
    required: true,
    danger: true,
    hint: 'Se a troca estava aprovada, a reserva da nova peça volta ao estoque.',
  },
};

function MessageModal({ order, mode, onClose, onDone }) {
  const config = MESSAGE_MODES[mode];
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const canSubmit = (!config.required || message.trim() !== '') && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await config.action(order.id, { message: message.trim() });
      onDone();
    } catch (err) {
      setError(refundErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      title={config.title}
      titleId="exchange-message-title"
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      canSubmit={canSubmit}
      danger={config.danger}
      submitLabel={submitting ? 'Salvando...' : config.submit}
    >
      {config.hint && <p className="mt-2 text-[13px] text-shio-muted">{config.hint}</p>}
      <label htmlFor="exchange-message" className="mt-4 block text-[14px] font-semibold text-black">
        {config.label}
      </label>
      <textarea
        id="exchange-message"
        value={message}
        maxLength={2000}
        rows={4}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={config.placeholder ?? ''}
        className={inputClass}
      />
      <p className="mt-1 text-[12px] text-shio-muted">O cliente verá esta mensagem.</p>
    </AdminModal>
  );
}

function ReceiveModal({ order, exchange, onClose, onDone }) {
  const [conditions, setConditions] = useState({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const canSubmit = exchange.items.every((item) => conditions[item.id]) && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await receiveExchange(order.id, {
        items: exchange.items.map((item) => ({ id: item.id, condition: conditions[item.id] })),
        internal_note: note.trim(),
      });
      onDone();
    } catch (err) {
      setError(refundErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      title="Confirmar recebimento"
      titleId="exchange-receive-title"
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      canSubmit={canSubmit}
      submitLabel={submitting ? 'Salvando...' : 'Confirmar'}
    >
      <p className="mt-2 text-[13px] text-shio-muted">
        A peça devolvida entra no estoque. Se tiver avaria, sai em seguida como perda.
      </p>
      {exchange.items.map((item) => (
        <label key={item.id} className="mt-4 block text-[14px] font-semibold text-black">
          {item.quantity}× {item.product_name}
          <select
            value={conditions[item.id] ?? ''}
            onChange={(event) => setConditions((current) => ({ ...current, [item.id]: event.target.value }))}
            className={inputClass}
          >
            <option value="">Condição da peça</option>
            {EXCHANGE_CONDITIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ))}
      <label htmlFor="exchange-note" className="mt-4 block text-[14px] font-semibold text-black">
        Observação interna (opcional)
      </label>
      <textarea
        id="exchange-note"
        value={note}
        maxLength={2000}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        className={inputClass}
      />
      <p className="mt-1 text-[12px] text-shio-muted">Visível só para administradores.</p>
    </AdminModal>
  );
}

function CompleteModal({ order, onClose, onDone }) {
  const [tracking, setTracking] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const canSubmit = tracking.trim() !== '' && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeExchange(order.id, { tracking_code: tracking.trim() });
      onDone();
    } catch (err) {
      setError(refundErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      title="Registrar envio da nova peça"
      titleId="exchange-complete-title"
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      canSubmit={canSubmit}
      submitLabel={submitting ? 'Salvando...' : 'Registrar envio'}
    >
      <label htmlFor="exchange-tracking" className="mt-4 block text-[14px] font-semibold text-black">
        Código de rastreio
      </label>
      <input
        id="exchange-tracking"
        value={tracking}
        maxLength={100}
        onChange={(event) => setTracking(event.target.value)}
        className={inputClass}
      />
      <p className="mt-1 text-[12px] text-shio-muted">O cliente recebe o código por e-mail.</p>
    </AdminModal>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-shio-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const byName = (user) => (user ? ` · ${user.name || user.email}` : '');

function ExchangeDetails({ exchange }) {
  const status = EXCHANGE_STATUS[exchange.status];
  return (
    <div className="space-y-2 text-[14px]" data-testid={`admin-exchange-${exchange.id}`}>
      <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${status?.color ?? ''}`}>
        {status?.label ?? exchange.status}
      </span>
      <ExchangeItemsList items={exchange.items} />
      <Row label="Motivo">{exchange.reason_label}</Row>
      {exchange.customer_comment && <Row label="Comentário do cliente">{exchange.customer_comment}</Row>}
      <Row label="Solicitada em">{formatRefundDate(exchange.created_at, true)}</Row>
      {exchange.reviewed_at && (
        <Row label={exchange.status === 'REJECTED' ? 'Recusada em' : 'Aprovada em'}>
          {formatRefundDate(exchange.reviewed_at, true)}{byName(exchange.reviewed_by)}
        </Row>
      )}
      {exchange.received_at && (
        <Row label="Recebida em">{formatRefundDate(exchange.received_at, true)}{byName(exchange.received_by)}</Row>
      )}
      {exchange.completed_at && (
        <Row label="Enviada em">{formatRefundDate(exchange.completed_at, true)}{byName(exchange.completed_by)}</Row>
      )}
      {exchange.canceled_at && (
        <Row label="Cancelada em">{formatRefundDate(exchange.canceled_at, true)}{byName(exchange.canceled_by)}</Row>
      )}
      {exchange.tracking_code && <Row label="Rastreio">{exchange.tracking_code}</Row>}
      {exchange.review_message && <Row label="Mensagem ao cliente">{exchange.review_message}</Row>}
      {exchange.internal_note && <Row label="Observação interna">{exchange.internal_note}</Row>}
    </div>
  );
}

export default function AdminExchangePanel({ order, onChanged }) {
  const [modal, setModal] = useState(null);
  const exchanges = order.exchanges ?? [];
  if (!exchanges.length) return null;

  const current = openExchange(order);
  const done = () => {
    setModal(null);
    onChanged();
  };
  const buttonClass = 'h-10 rounded-lg border border-black/25 px-4 text-sm font-bold transition hover:border-black';

  return (
    <div className="border-b border-black/10 px-7 py-5">
      <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Troca</h3>

      <div className="space-y-5">
        {exchanges.map((exchange) => (
          <ExchangeDetails key={exchange.id} exchange={exchange} />
        ))}
      </div>

      {current && (
        <div className="mt-4 flex flex-wrap gap-2">
          {current.status === 'REQUESTED' && (
            <>
              <button type="button" className={buttonClass} onClick={() => setModal('approve')}>Aprovar</button>
              <button type="button" className={`${buttonClass} text-shio-danger`} onClick={() => setModal('reject')}>Recusar</button>
            </>
          )}
          {current.status === 'APPROVED' && (
            <button type="button" className={buttonClass} onClick={() => setModal('receive')}>Confirmar recebimento</button>
          )}
          {current.status === 'RECEIVED' && (
            <button type="button" className={buttonClass} onClick={() => setModal('complete')}>Registrar envio</button>
          )}
          {['REQUESTED', 'APPROVED'].includes(current.status) && (
            <button type="button" className={`${buttonClass} text-shio-danger`} onClick={() => setModal('cancel')}>Cancelar troca</button>
          )}
        </div>
      )}

      {MESSAGE_MODES[modal] && (
        <MessageModal order={order} mode={modal} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal === 'receive' && (
        <ReceiveModal order={order} exchange={current} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal === 'complete' && <CompleteModal order={order} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

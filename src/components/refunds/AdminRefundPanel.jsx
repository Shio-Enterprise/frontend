import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_REFUND_REASONS,
  REFUND_STATUS,
  approveRefund,
  completeRefund,
  formatMoney,
  formatRefundDate,
  refundErrorMessage,
  rejectRefund,
} from '../../lib/refunds';

const ACTIVE = ['REQUESTED', 'APPROVED'];

const inputClass = 'mt-2 w-full rounded-[12px] border border-black/15 px-4 py-3 text-[14px] text-black outline-none focus:border-black';

// Valor de <input type="datetime-local"> no horário local.
const localDateTime = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

function Modal({ title, titleId, onClose, onSubmit, children, error, submitLabel, canSubmit, danger }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[18px] bg-white p-6 outline-none"
      >
        <h2 id={titleId} className="text-[20px] font-bold text-black">{title}</h2>
        {children}
        {error && <p role="alert" className="mt-3 text-[13px] text-[#cc0000]">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 whitespace-nowrap rounded-full border border-black/15 px-6 text-sm font-medium text-black transition hover:border-black"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`h-11 whitespace-nowrap rounded-full px-6 text-sm font-medium text-white transition disabled:opacity-40 ${danger ? 'bg-[#ff3333] hover:bg-[#e02020]' : 'bg-black hover:bg-black/80'}`}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReviewModal({ order, mode, onClose, onDone }) {
  const rejecting = mode === 'reject';
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const canSubmit = (!rejecting || message.trim() !== '') && !submitting;
  const cancelsOrder = ['PAID', 'PREPARING'].includes(order.status);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const action = rejecting ? rejectRefund : approveRefund;
      await action(order.id, { message: message.trim() });
      onDone();
    } catch (err) {
      setError(refundErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={rejecting ? 'Recusar reembolso' : 'Aprovar reembolso'}
      titleId="refund-review-title"
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      canSubmit={canSubmit}
      danger={rejecting}
      submitLabel={submitting ? 'Salvando...' : rejecting ? 'Recusar' : 'Aprovar'}
    >
      {!rejecting && cancelsOrder && (
        <p className="mt-2 text-[13px] text-black/55">
          O pedido ainda não foi enviado: ao aprovar, ele é cancelado e o estoque volta. O estorno é registrado depois.
        </p>
      )}
      <label htmlFor="refund-review-message" className="mt-4 block text-[14px] font-semibold text-black">
        {rejecting ? 'Justificativa (obrigatória)' : 'Mensagem ao cliente (opcional)'}
      </label>
      <textarea
        id="refund-review-message"
        value={message}
        maxLength={2000}
        rows={4}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={rejecting ? '' : 'Ex.: instruções para devolver o produto'}
        className={inputClass}
      />
      <p className="mt-1 text-[12px] text-black/45">O cliente verá esta mensagem.</p>
    </Modal>
  );
}

function CompleteModal({ order, onClose, onDone }) {
  const direct = !ACTIVE.includes(order.refund?.status);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [refundedAt, setRefundedAt] = useState(() => localDateTime(new Date()));
  const [note, setNote] = useState('');
  const [itemsReturned, setItemsReturned] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const shipped = order.status === 'SHIPPED';
  const showReturn = shipped || order.status === 'DELIVERED';
  const reasons = ADMIN_REFUND_REASONS.filter(
    (option) => option.value !== 'PAID_AFTER_CANCELLATION' || order.status === 'CANCELED',
  );
  const canSubmit = confirmed
    && reference.trim() !== ''
    && refundedAt
    && (!direct || reason)
    && (!direct || reason !== 'OTHER' || note.trim() !== '')
    && (!shipped || itemsReturned)
    && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeRefund(order.id, {
        gateway_reference: reference.trim(),
        refunded_at: new Date(refundedAt).toISOString(),
        items_returned: showReturn && itemsReturned,
        internal_note: note.trim(),
        ...(direct ? { reason } : {}),
      });
      onDone();
    } catch (err) {
      setError(refundErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={direct ? 'Registrar reembolso' : 'Registrar estorno'}
      titleId="refund-complete-title"
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      canSubmit={canSubmit}
      submitLabel={submitting ? 'Registrando...' : 'Registrar'}
    >
      <p className="mt-2 text-[14px] text-black/70">
        Valor: <strong className="text-black">{formatMoney(order.payment?.total_amount ?? order.total_amount)}</strong>
      </p>
      <p className="mt-2 rounded-[12px] bg-[#fff3cd] p-3 text-[13px] text-[#856404]">
        Este registro não devolve dinheiro. Faça o estorno no painel da InfinitePay antes de registrar.
      </p>

      {direct && (
        <>
          <label htmlFor="refund-reason" className="mt-4 block text-[14px] font-semibold text-black">Motivo</label>
          <select id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass}>
            <option value="">Selecione</option>
            {reasons.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </>
      )}

      <label htmlFor="refund-reference" className="mt-4 block text-[14px] font-semibold text-black">
        Referência do estorno na InfinitePay
      </label>
      <input
        id="refund-reference"
        value={reference}
        maxLength={255}
        onChange={(event) => setReference(event.target.value)}
        placeholder="Identificador ou descrição do comprovante"
        className={inputClass}
      />

      <label htmlFor="refund-date" className="mt-4 block text-[14px] font-semibold text-black">Data do estorno</label>
      <input
        id="refund-date"
        type="datetime-local"
        value={refundedAt}
        max={localDateTime(new Date())}
        onChange={(event) => setRefundedAt(event.target.value)}
        className={inputClass}
      />

      <label htmlFor="refund-note" className="mt-4 block text-[14px] font-semibold text-black">
        {direct && reason === 'OTHER' ? 'Observação interna (obrigatória)' : 'Observação interna (opcional)'}
      </label>
      <textarea
        id="refund-note"
        value={note}
        maxLength={2000}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        className={inputClass}
      />
      <p className="mt-1 text-[12px] text-black/45">Visível só para administradores.</p>

      {showReturn && (
        <label className="mt-4 flex gap-3 text-[14px] text-black">
          <input type="checkbox" checked={itemsReturned} onChange={(event) => setItemsReturned(event.target.checked)} />
          <span>
            {shipped
              ? 'O pacote voltou para a loja e os itens entram no estoque (obrigatório).'
              : 'Os itens voltaram para a loja e entram no estoque.'}
          </span>
        </label>
      )}

      <label className="mt-4 flex gap-3 text-[14px] font-semibold text-black">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Confirmo que o estorno já foi feito no painel da InfinitePay.</span>
      </label>
    </Modal>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-black/55">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default function AdminRefundPanel({ order, onChanged }) {
  const [modal, setModal] = useState(null);
  const refund = order.refund;
  const active = ACTIVE.includes(refund?.status);
  const canRegisterDirect = !active && order.payment?.status === 'PAID';
  if (!refund && !canRegisterDirect) return null;

  const status = refund ? REFUND_STATUS[refund.status] : null;
  const done = () => {
    setModal(null);
    onChanged();
  };
  const buttonClass = 'h-10 rounded-lg border border-black/25 px-4 text-sm font-bold transition hover:border-black';

  return (
    <div className="border-b border-black/10 px-7 py-5">
      <h3 className="mb-4 text-[15px] font-bold uppercase text-black">Reembolso</h3>

      {refund && (
        <div className="space-y-2 text-[14px]">
          <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${status?.color ?? ''}`}>
            {status?.label ?? refund.status}
          </span>
          <Row label="Motivo">{refund.reason_label}</Row>
          {refund.customer_comment && <Row label="Comentário do cliente">{refund.customer_comment}</Row>}
          <Row label="Solicitado em">{formatRefundDate(refund.created_at, true)}</Row>
          {refund.reviewed_at && (
            <Row label={refund.status === 'REJECTED' ? 'Recusado em' : 'Aprovado em'}>
              {formatRefundDate(refund.reviewed_at, true)}
              {refund.reviewed_by && ` · ${refund.reviewed_by.name || refund.reviewed_by.email}`}
            </Row>
          )}
          {refund.review_message && <Row label="Mensagem ao cliente">{refund.review_message}</Row>}
          {refund.status === 'COMPLETED' && (
            <>
              <Row label="Valor">{formatMoney(refund.amount)}</Row>
              <Row label="Estorno em">{formatRefundDate(refund.refunded_at, true)}</Row>
              <Row label="Referência">{refund.gateway_reference}</Row>
              <Row label="Estoque reposto">{refund.stock_returned ? 'Sim' : 'Não'}</Row>
              {refund.completed_by && (
                <Row label="Registrado por">{refund.completed_by.name || refund.completed_by.email}</Row>
              )}
            </>
          )}
          {refund.internal_note && <Row label="Observação interna">{refund.internal_note}</Row>}
          {refund.status === 'REQUESTED' && (
            <p className="rounded-[10px] bg-[#fff3cd] p-3 text-[13px] text-[#856404]">
              O envio fica bloqueado até a análise do reembolso.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {refund?.status === 'REQUESTED' && (
          <>
            <button type="button" className={buttonClass} onClick={() => setModal('approve')}>Aprovar</button>
            <button type="button" className={`${buttonClass} text-[#ff3333]`} onClick={() => setModal('reject')}>Recusar</button>
          </>
        )}
        {active && (
          <button type="button" className={buttonClass} onClick={() => setModal('complete')}>Registrar estorno</button>
        )}
        {canRegisterDirect && (
          <button type="button" className={buttonClass} onClick={() => setModal('complete')}>Registrar reembolso</button>
        )}
      </div>

      {(modal === 'approve' || modal === 'reject') && (
        <ReviewModal order={order} mode={modal} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal === 'complete' && <CompleteModal order={order} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

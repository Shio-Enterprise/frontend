import { useEffect, useRef, useState } from 'react';
import {
  CUSTOMER_REFUND_REASONS,
  REFUND_COMMENT_MAX,
  formatMoney,
  refundErrorMessage,
  requestRefund,
} from '../../lib/refunds';

export default function RefundRequestModal({ order, onClose, onRequested }) {
  const dialogRef = useRef(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const commentRequired = reason === 'OTHER';
  const canSubmit = Boolean(reason) && (!commentRequired || comment.trim() !== '') && !submitting;
  const delivered = order.status === 'DELIVERED';

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await requestRefund(order.id, { reason, comment: comment.trim() });
      onRequested(updated);
    } catch (err) {
      setError(refundErrorMessage(err, 'Não foi possível solicitar o reembolso.'));
      setSubmitting(false);
    }
  };

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
        aria-labelledby="refund-request-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[18px] bg-white p-6 outline-none"
      >
        <h2 id="refund-request-title" className="text-[20px] font-bold text-black">Solicitar reembolso</h2>
        <p className="mt-2 text-[14px] text-black/70">
          Valor a ser devolvido: <strong className="text-black">{formatMoney(order.total_amount)}</strong>
        </p>
        <p className="mt-2 text-[13px] text-black/55">
          {delivered
            ? 'A loja vai analisar o pedido. Se for aprovado, você recebe por e-mail as instruções para devolver o produto.'
            : 'A loja vai analisar o pedido. Se for aprovado, a compra é cancelada e não será enviada.'}
        </p>

        <fieldset className="mt-5 grid gap-2">
          <legend className="mb-2 text-[14px] font-semibold text-black">Motivo</legend>
          {CUSTOMER_REFUND_REASONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-[14px] text-black">
              <input
                type="radio"
                name="refund-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor="refund-comment" className="mt-4 block text-[14px] font-semibold text-black">
          {commentRequired ? 'Conte o motivo (obrigatório)' : 'Comentário (opcional)'}
        </label>
        <textarea
          id="refund-comment"
          value={comment}
          maxLength={REFUND_COMMENT_MAX}
          rows={3}
          onChange={(event) => setComment(event.target.value)}
          className="mt-2 w-full rounded-[12px] border border-black/15 px-4 py-3 text-[14px] text-black outline-none focus:border-black"
        />

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
            className="h-11 whitespace-nowrap rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/80 disabled:opacity-40"
          >
            {submitting ? 'Enviando...' : 'Solicitar reembolso'}
          </button>
        </div>
      </form>
    </div>
  );
}

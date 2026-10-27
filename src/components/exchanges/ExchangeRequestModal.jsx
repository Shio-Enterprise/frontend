import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EXCHANGE_COMMENT_MAX,
  EXCHANGE_REASONS,
  requestExchange,
} from '../../lib/exchanges';
import { formatRefundDate, refundErrorMessage } from '../../lib/refunds';

const optionLabel = (option) => {
  const name = option.color ? `${option.size} / ${option.color}` : option.size;
  return option.in_stock ? name : `${name} (esgotado)`;
};

export default function ExchangeRequestModal({ order, onClose, onRequested }) {
  const dialogRef = useRef(null);
  const eligibility = order.exchange_eligibility ?? {};
  const sizeWindowOpen = !eligibility.size_or_color_deadline
    || new Date() <= new Date(eligibility.size_or_color_deadline);
  const itemsById = useMemo(
    () => Object.fromEntries((order.items ?? []).map((item) => [item.id, item])),
    [order.items],
  );
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  // { [order_item_id]: { selected, quantity, replacement } }
  const [rows, setRows] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const updateRow = (id, patch) =>
    setRows((current) => ({ ...current, [id]: { quantity: 1, replacement: '', ...current[id], ...patch } }));

  const chosen = Object.entries(rows).filter(([, row]) => row.selected);
  const commentRequired = reason === 'DEFECT';
  const canSubmit = Boolean(reason)
    && chosen.length > 0
    && chosen.every(([, row]) => row.replacement)
    && (!commentRequired || comment.trim() !== '')
    && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await requestExchange(order.id, {
        reason,
        comment: comment.trim(),
        items: chosen.map(([id, row]) => ({
          order_item_id: id,
          replacement_variation_id: row.replacement,
          quantity: Number(row.quantity),
        })),
      });
      onRequested(updated);
    } catch (err) {
      setError(refundErrorMessage(err, 'Não foi possível solicitar a troca.'));
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
        aria-labelledby="exchange-request-title"
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[18px] bg-white p-6 outline-none"
      >
        <h2 id="exchange-request-title" className="text-[20px] font-bold text-black">Solicitar troca</h2>
        <p className="mt-2 text-[13px] text-black/55">
          A troca é por outra variação do mesmo produto, sem custo. Se for aprovada, a nova peça fica
          reservada e você recebe por e-mail as instruções para enviar a peça.
        </p>

        <fieldset className="mt-5 grid gap-2">
          <legend className="mb-2 text-[14px] font-semibold text-black">Motivo</legend>
          {EXCHANGE_REASONS.map((option) => {
            const disabled = option.value === 'SIZE_OR_COLOR' && !sizeWindowOpen;
            return (
              <label key={option.value} className={`flex items-center gap-3 text-[14px] ${disabled ? 'text-black/35' : 'text-black'}`}>
                <input
                  type="radio"
                  name="exchange-reason"
                  value={option.value}
                  checked={reason === option.value}
                  disabled={disabled}
                  onChange={() => setReason(option.value)}
                />
                {option.label}
                {option.value === 'SIZE_OR_COLOR' && (
                  <span className="text-[12px] text-black/40">
                    {disabled ? 'prazo encerrado' : `até ${formatRefundDate(eligibility.size_or_color_deadline)}`}
                  </span>
                )}
                {option.value === 'DEFECT' && (
                  <span className="text-[12px] text-black/40">até {formatRefundDate(eligibility.defect_deadline)}</span>
                )}
              </label>
            );
          })}
        </fieldset>

        <fieldset className="mt-5 grid gap-4">
          <legend className="mb-2 text-[14px] font-semibold text-black">Itens</legend>
          {(eligibility.items ?? []).map((entry) => {
            const item = itemsById[entry.order_item_id];
            const row = rows[entry.order_item_id] ?? {};
            const inputId = `exchange-item-${entry.order_item_id}`;
            return (
              <div key={entry.order_item_id} className="rounded-[12px] border border-black/10 p-3">
                <label htmlFor={inputId} className="flex items-center gap-3 text-[14px] font-semibold text-black">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={Boolean(row.selected)}
                    onChange={(event) => updateRow(entry.order_item_id, { selected: event.target.checked })}
                  />
                  {item?.product_name ?? 'Item'}
                </label>
                {row.selected && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[96px_1fr]">
                    <label className="grid gap-1 text-[12px] text-black/55">
                      Quantidade
                      <select
                        value={row.quantity ?? 1}
                        onChange={(event) => updateRow(entry.order_item_id, { quantity: event.target.value })}
                        className="h-10 rounded-[10px] border border-black/15 px-2 text-[14px] text-black"
                      >
                        {Array.from({ length: entry.available_quantity }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-[12px] text-black/55">
                      Trocar por
                      <select
                        value={row.replacement ?? ''}
                        onChange={(event) => updateRow(entry.order_item_id, { replacement: event.target.value })}
                        className="h-10 rounded-[10px] border border-black/15 px-2 text-[14px] text-black"
                      >
                        <option value="">Escolha a variação</option>
                        {entry.options.map((option) => (
                          <option key={option.variation_id} value={option.variation_id} disabled={!option.in_stock}>
                            {optionLabel(option)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {entry.options.length === 0 && (
                      <p className="text-[12px] text-black/50 sm:col-span-2">Este produto não tem outra variação.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>

        <label htmlFor="exchange-comment" className="mt-4 block text-[14px] font-semibold text-black">
          {commentRequired ? 'Descreva o defeito (obrigatório)' : 'Comentário (opcional)'}
        </label>
        <textarea
          id="exchange-comment"
          value={comment}
          maxLength={EXCHANGE_COMMENT_MAX}
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
            {submitting ? 'Enviando...' : 'Solicitar troca'}
          </button>
        </div>
      </form>
    </div>
  );
}

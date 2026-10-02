import { useState } from 'react';
import { REMOVAL_NOTE_MAX, REMOVAL_REASONS } from '../../lib/reviewLabels';
import { removeReview, reviewErrorMessage } from '../../lib/reviewsApi';

export default function RemoveReviewModal({ review, onClose, onRemoved }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const noteRequired = reason === 'OTHER';
  const canSubmit = Boolean(reason) && (!noteRequired || note.trim() !== '') && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await removeReview(review.id, { reason, note: note.trim() });
      onRemoved(updated);
    } catch (err) {
      setError(reviewErrorMessage(err, 'Não foi possível remover a avaliação.'));
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-review-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[18px] bg-white p-6"
      >
        <h2 id="remove-review-title" className="text-[20px] font-bold text-black">Remover avaliação</h2>
        <p className="mt-1 text-[14px] text-black/55">{review.author_name} · {review.product_name}</p>

        <fieldset className="mt-5 grid gap-2">
          <legend className="mb-2 text-[14px] font-semibold text-black">Motivo</legend>
          {REMOVAL_REASONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-[14px] text-black">
              <input
                type="radio"
                name="removal-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor="removal-note" className="mt-4 block text-[14px] font-semibold text-black">
          {noteRequired ? 'Detalhes (obrigatório)' : 'Detalhes (opcional)'}
        </label>
        <textarea
          id="removal-note"
          value={note}
          maxLength={REMOVAL_NOTE_MAX}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          className="mt-2 w-full rounded-[12px] border border-black/15 px-4 py-3 text-[14px] text-black outline-none focus:border-black"
        />
        <p className="mt-1 text-[12px] text-black/45">O cliente verá o motivo e os detalhes.</p>

        {error && <p role="alert" className="mt-3 text-[13px] text-[#cc0000]">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-black/15 px-6 text-sm font-medium text-black transition hover:border-black"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 rounded-full bg-[#ff3333] px-6 text-sm font-medium text-white transition hover:bg-[#e02020] disabled:opacity-40"
          >
            {submitting ? 'Removendo...' : 'Remover da loja'}
          </button>
        </div>
      </form>
    </div>
  );
}

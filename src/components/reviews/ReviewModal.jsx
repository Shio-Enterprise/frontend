import { useState } from 'react';
import { removalText } from '../../lib/reviewLabels';
import { createReview, deleteReview, reviewErrorMessage, updateReview } from '../../lib/reviewsApi';
import ReviewForm from './ReviewForm';

export default function ReviewModal({ productId, productName, review = null, onClose, onSaved, onDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isEdit = Boolean(review);
  const isRemoved = review?.status === 'REMOVED';
  const submitLabel = !isEdit ? 'Publicar avaliação' : isRemoved ? 'Salvar e republicar' : 'Salvar alterações';

  const handleSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    try {
      const saved = isEdit ? await updateReview(review.id, data) : await createReview(productId, data);
      onSaved(saved);
    } catch (err) {
      setError(reviewErrorMessage(err));
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteReview(review.id);
      onDeleted(review);
    } catch (err) {
      setError(reviewErrorMessage(err, 'Não foi possível excluir a avaliação.'));
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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[18px] bg-white p-6"
      >
        <h2 id="review-modal-title" className="text-[20px] font-bold text-black">
          {isEdit ? 'Editar avaliação' : 'Avaliar produto'}
        </h2>
        <p className="mt-1 text-[14px] text-black/55">{productName}</p>

        {isRemoved && (
          <p className="mt-4 rounded-[10px] bg-[#fff5f5] px-4 py-3 text-[13px] text-[#cc0000]">
            {removalText(review)}. Ao salvar, ela volta a ser publicada.
          </p>
        )}

        <div className="mt-5">
          <ReviewForm
            initialReview={review}
            submitting={submitting}
            error={error}
            submitLabel={submitLabel}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>

        {isEdit && (
          <div className="mt-6 border-t border-black/10 pt-4">
            {confirmingDelete ? (
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <p className="text-black/60">Excluir de vez esta avaliação?</p>
                <button type="button" onClick={handleDelete} disabled={submitting} className="font-semibold text-[#ff3333] disabled:opacity-40">
                  Confirmar exclusão
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} className="text-black/60">
                  Manter
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmingDelete(true)} className="text-[13px] font-semibold text-[#ff3333]">
                Excluir avaliação
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

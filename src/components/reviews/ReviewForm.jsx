import { useState } from 'react';
import { COMMENT_MAX, FIT_OPTIONS } from '../../lib/reviewLabels';
import RatingInput from './RatingInput';

const optional = <span className="font-normal text-black/45">(opcional)</span>;

export default function ReviewForm({
  initialReview = null,
  submitting = false,
  error = null,
  submitLabel = 'Publicar avaliação',
  onSubmit,
  onCancel,
}) {
  const [rating, setRating] = useState(initialReview?.rating ?? null);
  const [comment, setComment] = useState(initialReview?.comment ?? '');
  const [fit, setFit] = useState(initialReview?.fit ?? '');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!rating || submitting) return;
    onSubmit({ rating, comment: comment.trim(), fit });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div>
        <p className="mb-2 text-[14px] font-semibold text-black">Sua nota</p>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      <div>
        <p className="mb-2 text-[14px] font-semibold text-black">Caimento {optional}</p>
        <div className="flex flex-wrap gap-2">
          {FIT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={fit === option.value}
              onClick={() => setFit((current) => (current === option.value ? '' : option.value))}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                fit === option.value ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black/60 hover:bg-black/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-comment" className="mb-2 block text-[14px] font-semibold text-black">
          Comentário {optional}
        </label>
        <textarea
          id="review-comment"
          value={comment}
          maxLength={COMMENT_MAX}
          rows={4}
          placeholder="Conte o que achou do produto"
          onChange={(event) => setComment(event.target.value)}
          className="w-full rounded-[12px] border border-black/15 px-4 py-3 text-[14px] text-black outline-none focus:border-black"
        />
        <p className="mt-1 text-right text-[12px] text-black/45">{comment.length}/{COMMENT_MAX}</p>
      </div>

      {error && <p role="alert" className="text-[13px] text-[#cc0000]">{error}</p>}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-full border border-black/15 px-6 text-sm font-medium text-black transition hover:border-black"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!rating || submitting}
          className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/85 disabled:bg-black/40"
        >
          {submitting ? 'Enviando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

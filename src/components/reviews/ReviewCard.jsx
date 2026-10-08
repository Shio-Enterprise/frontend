import { FIT_LABELS, formatReviewDate } from '../../lib/reviewLabels';
import { Rating } from '../ui/ShioDesign';

export default function ReviewCard({ review }) {
  const details = [
    review.purchased_size && `Comprou: ${review.purchased_size}`,
    review.fit && `Caimento: ${FIT_LABELS[review.fit] ?? review.fit}`,
  ].filter(Boolean);

  return (
    <article className="rounded-[18px] border border-black/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Rating value={review.rating} />
        <time dateTime={review.created_at} className="text-[13px] text-black/45">
          {formatReviewDate(review.created_at)}
        </time>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[16px] font-bold text-black">{review.author_name}</h3>
        {review.verified_purchase && (
          <span className="rounded-full bg-[#d4f7e2] px-3 py-1 text-[12px] font-semibold text-[#1da64a]">
            Compra verificada
          </span>
        )}
      </div>
      {details.length > 0 && <p className="mt-1 text-[13px] text-black/50">{details.join(' · ')}</p>}
      {review.comment && <p className="mt-3 text-[15px] leading-6 text-black/70">{review.comment}</p>}
      {review.admin_reply && (
        <div className="mt-4 rounded-[12px] bg-[#f5f5f5] px-4 py-3">
          <p className="text-[12px] font-semibold uppercase text-black/45">Resposta da Shio</p>
          <p className="mt-1 text-[14px] leading-6 text-black/70">{review.admin_reply}</p>
        </div>
      )}
    </article>
  );
}

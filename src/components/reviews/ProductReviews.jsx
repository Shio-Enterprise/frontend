import { useEffect, useState } from 'react';
import { getProductReviews, getReviewSummary } from '../../lib/reviewsApi';
import { SectionTitle } from '../ui/ShioDesign';
import ReviewCard from './ReviewCard';
import ReviewSummary from './ReviewSummary';

const PAGE_SIZE = 10;
const STAR_FILTERS = [5, 4, 3, 2, 1];

const filterClass = (active) =>
  `rounded-full px-4 py-2 text-[13px] font-medium transition ${
    active ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black/60 hover:bg-black/10'
  }`;
const pageButtonClass = 'rounded-full border border-black/15 px-5 py-2 transition hover:border-black disabled:opacity-40';

export default function ProductReviews({ productId }) {
  const [summary, setSummary] = useState(null);
  const [rating, setRating] = useState(null);
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ key: null, count: 0, results: [] });
  const [error, setError] = useState(false);
  const requestKey = `${productId}|${rating ?? 'all'}|${page}`;

  useEffect(() => {
    let ignore = false;
    getReviewSummary(productId)
      .then((data) => {
        if (!ignore) setSummary(data);
      })
      .catch(() => {
        if (!ignore) setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [productId]);

  useEffect(() => {
    let ignore = false;
    getProductReviews(productId, { rating, page })
      .then((data) => {
        if (!ignore) setList({ key: requestKey, count: data.count, results: data.results });
      })
      .catch(() => {
        if (!ignore) setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [productId, rating, page, requestKey]);

  const selectRating = (value) => {
    setRating(value);
    setPage(1);
  };

  const loadingList = list.key !== requestKey;
  const totalPages = Math.max(1, Math.ceil(list.count / PAGE_SIZE));

  let content;
  if (error) {
    content = <p role="alert" className="mt-8 text-center text-black/50">Não foi possível carregar as avaliações.</p>;
  } else if (!summary) {
    content = <p role="status" className="mt-8 text-center text-black/50">Carregando avaliações...</p>;
  } else if (summary.rating_count === 0) {
    content = <p className="mt-8 text-center text-black/50">Ainda não há avaliações para este produto.</p>;
  } else {
    content = (
      <>
        <div className="mt-10">
          <ReviewSummary summary={summary} />
        </div>

        <div role="group" aria-label="Filtrar por nota" className="mt-10 flex flex-wrap gap-2">
          <button type="button" aria-pressed={rating === null} onClick={() => selectRating(null)} className={filterClass(rating === null)}>
            Todas
          </button>
          {STAR_FILTERS.map((star) => (
            <button key={star} type="button" aria-pressed={rating === star} onClick={() => selectRating(star)} className={filterClass(rating === star)}>
              {star === 1 ? '1 estrela' : `${star} estrelas`}
            </button>
          ))}
        </div>

        {loadingList ? (
          <p role="status" className="mt-8 text-black/50">Carregando avaliações...</p>
        ) : list.results.length === 0 ? (
          <p className="mt-8 text-black/50">Nenhuma avaliação com essa nota.</p>
        ) : (
          <div className="mt-6 grid gap-4">
            {list.results.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className={pageButtonClass}>
              Anterior
            </button>
            <span className="text-black/55">Página {page} de {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className={pageButtonClass}>
              Próxima
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <section aria-label="Avaliações" className="mx-auto max-w-[1240px] border-t border-black/10 px-6 py-16">
      <SectionTitle>Avaliações</SectionTitle>
      {content}
    </section>
  );
}

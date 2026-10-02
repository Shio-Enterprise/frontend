import { useEffect, useState } from 'react';
import RemoveReviewModal from '../../../components/reviews/RemoveReviewModal';
import { AdminPanel, AdminTitle, PageMarker, Rating } from '../../../components/ui/ShioDesign';
import { FIT_LABELS, REPLY_MAX, formatReviewDate, removalText } from '../../../lib/reviewLabels';
import { clearReply, getAdminReviews, restoreReview, reviewErrorMessage, setReply } from '../../../lib/reviewsApi';

const PAGE_SIZE = 10;
const TABS = [
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'REMOVED', label: 'Removidas' },
];
const ACTION = 'rounded-full border border-black/15 px-4 py-2 text-[13px] font-semibold text-black transition hover:border-black disabled:opacity-40';
const DANGER = 'rounded-full border border-[#ff3333]/30 px-4 py-2 text-[13px] font-semibold text-[#ff3333] transition hover:border-[#ff3333]';

function AdminReviewItem({ review, replyDraft, onReplyDraftChange, onFilterProduct, onRemove, onRestore, onSaveReply, onClearReply }) {
  const isPublished = review.status === 'PUBLISHED';
  const editingReply = replyDraft?.id === review.id;
  const details = [
    review.purchased_size && `Comprou: ${review.purchased_size}`,
    review.fit && `Caimento: ${FIT_LABELS[review.fit] ?? review.fit}`,
  ].filter(Boolean);

  return (
    <AdminPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            aria-label={`Ver só ${review.product_name}`}
            onClick={() => onFilterProduct(review)}
            className="text-[16px] font-bold text-black underline-offset-2 hover:underline"
          >
            {review.product_name}
          </button>
          <p className="mt-1 text-[13px] text-black/50">
            {review.author_name} · {review.author_email} · {formatReviewDate(review.created_at)}
          </p>
        </div>
        <Rating value={review.rating} />
      </div>

      {details.length > 0 && <p className="mt-2 text-[13px] text-black/50">{details.join(' · ')}</p>}
      {review.comment && <p className="mt-3 text-[15px] leading-6 text-black/80">{review.comment}</p>}

      {!isPublished && (
        <p className="mt-3 rounded-[10px] bg-[#fff5f5] px-4 py-3 text-[13px] text-[#cc0000]">
          {removalText(review)}{review.removed_by_name ? ` · por ${review.removed_by_name}` : ''}
        </p>
      )}

      {review.admin_reply && !editingReply && (
        <div className="mt-3 rounded-[10px] bg-[#f5f5f5] px-4 py-3">
          <p className="text-[12px] font-semibold uppercase text-black/45">Resposta da Shio</p>
          <p className="mt-1 text-[14px] text-black/80">{review.admin_reply}</p>
        </div>
      )}

      {editingReply && (
        <div className="mt-3 grid gap-2">
          <textarea
            aria-label="Resposta da Shio"
            value={replyDraft.text}
            maxLength={REPLY_MAX}
            rows={3}
            onChange={(event) => onReplyDraftChange({ id: review.id, text: event.target.value })}
            className="w-full rounded-[12px] border border-black/15 px-4 py-3 text-[14px] text-black outline-none focus:border-black"
          />
          <div className="flex gap-2">
            <button type="button" disabled={!replyDraft.text.trim()} onClick={() => onSaveReply(review, replyDraft.text.trim())} className={ACTION}>
              Salvar resposta
            </button>
            <button type="button" onClick={() => onReplyDraftChange(null)} className={ACTION}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {isPublished && !editingReply && (
          <button type="button" onClick={() => onReplyDraftChange({ id: review.id, text: review.admin_reply ?? '' })} className={ACTION}>
            {review.admin_reply ? 'Editar resposta' : 'Responder'}
          </button>
        )}
        {review.admin_reply && !editingReply && (
          <button type="button" onClick={() => onClearReply(review)} className={ACTION}>
            Apagar resposta
          </button>
        )}
        {isPublished ? (
          <button type="button" onClick={() => onRemove(review)} className={DANGER}>Remover</button>
        ) : (
          <button type="button" onClick={() => onRestore(review)} className={ACTION}>Restaurar</button>
        )}
      </div>
    </AdminPanel>
  );
}

export default function ReviewsPage() {
  const [tab, setTab] = useState('PUBLISHED');
  const [rating, setRating] = useState('');
  const [product, setProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [list, setList] = useState({ key: null, count: 0, results: [], error: false });
  const [removing, setRemoving] = useState(null);
  const [replyDraft, setReplyDraft] = useState(null);
  const [actionError, setActionError] = useState(null);

  const productId = product?.id;
  const requestKey = [tab, rating, productId ?? '', page, reloadCount].join('|');

  useEffect(() => {
    let ignore = false;
    getAdminReviews({ status: tab, rating: rating || undefined, product: productId, page })
      .then((data) => {
        if (!ignore) setList({ key: requestKey, count: data.count, results: data.results, error: false });
      })
      .catch(() => {
        if (!ignore) setList({ key: requestKey, count: 0, results: [], error: true });
      });
    return () => {
      ignore = true;
    };
  }, [tab, rating, productId, page, requestKey]);

  const loading = list.key !== requestKey;
  const totalPages = Math.max(1, Math.ceil(list.count / PAGE_SIZE));
  const reload = () => setReloadCount((count) => count + 1);

  const resetTo = (changes) => {
    changes();
    setPage(1);
    setReplyDraft(null);
  };

  const runAction = async (action) => {
    setActionError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(reviewErrorMessage(err, 'Não foi possível concluir a ação.'));
    }
  };

  return (
    <div>
      <PageMarker name="ReviewsPage" />
      <AdminTitle eyebrow="Moderação" title="Avaliações" />

      <div role="tablist" aria-label="Status das avaliações" className="mb-5 flex gap-2">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            onClick={() => resetTo(() => setTab(option.value))}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${
              tab === option.value ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black/60 hover:bg-black/10'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 text-[14px]">
        <label htmlFor="review-rating-filter" className="text-black/55">Filtrar por nota</label>
        <select
          id="review-rating-filter"
          value={rating}
          onChange={(event) => resetTo(() => setRating(event.target.value))}
          className="rounded-full border border-black/15 bg-white px-4 py-2 font-semibold text-black outline-none"
        >
          <option value="">Todas</option>
          {[5, 4, 3, 2, 1].map((star) => (
            <option key={star} value={String(star)}>{star === 1 ? '1 estrela' : `${star} estrelas`}</option>
          ))}
        </select>
        {product && (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] px-4 py-2 text-black">
            <span>Produto: {product.name}</span>
            <button type="button" aria-label="Limpar filtro de produto" onClick={() => resetTo(() => setProduct(null))} className="font-bold">
              ×
            </button>
          </span>
        )}
      </div>

      {actionError && <p role="alert" className="mb-4 text-[13px] text-[#cc0000]">{actionError}</p>}

      {loading ? (
        <p className="text-black/40">Carregando avaliações...</p>
      ) : list.error ? (
        <p className="text-[13px] text-[#cc0000]">Não foi possível carregar as avaliações.</p>
      ) : list.results.length === 0 ? (
        <p className="text-black/45">Nenhuma avaliação encontrada.</p>
      ) : (
        <ul className="space-y-4">
          {list.results.map((review) => (
            <li key={review.id}>
              <AdminReviewItem
                review={review}
                replyDraft={replyDraft}
                onReplyDraftChange={setReplyDraft}
                onFilterProduct={(item) => resetTo(() => setProduct({ id: item.product_id, name: item.product_name }))}
                onRemove={setRemoving}
                onRestore={(item) => runAction(() => restoreReview(item.id))}
                onSaveReply={(item, text) => runAction(async () => {
                  await setReply(item.id, text);
                  setReplyDraft(null);
                })}
                onClearReply={(item) => runAction(() => clearReply(item.id))}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className={ACTION}>Anterior</button>
          <span className="text-black/55">Página {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className={ACTION}>Próxima</button>
        </div>
      )}

      {removing && (
        <RemoveReviewModal
          review={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import RemoveReviewModal from '../../../components/reviews/RemoveReviewModal';
import { AdminPanel, AdminTitle, Rating } from '../../../components/ui/ShioDesign';
import { FIT_LABELS, REPLY_MAX, formatReviewDate, removalText } from '../../../lib/reviewLabels';
import { clearReply, getAdminReviews, restoreReview, reviewErrorMessage, setReply } from '../../../lib/reviewsApi';

const PAGE_SIZE = 10;
const TABS = [
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'REMOVED', label: 'Removidas' },
];
const ACTION = 'inline-flex min-h-11 items-center rounded-full border border-black/15 px-4 text-[13px] font-semibold text-black transition hover:border-black disabled:opacity-40 aria-disabled:opacity-40';
const DANGER = 'inline-flex min-h-11 items-center rounded-full border border-shio-danger/30 px-4 text-[13px] font-semibold text-shio-danger transition hover:border-shio-danger';

function AdminReviewItem({ review, replyDraft, onReplyDraftChange, onFilterProduct, onRemove, onRestore, onSaveReply, onClearReply }) {
  const isPublished = review.status === 'PUBLISHED';
  const editingReply = replyDraft?.id === review.id;
  // Ao cancelar a resposta, os botões do formulário somem: o foco volta para "Responder" (#64).
  const replyButtonRef = useRef(null);
  const wasEditing = useRef(editingReply);
  useEffect(() => {
    const active = document.activeElement;
    if (wasEditing.current && !editingReply && (!active || active === document.body)) replyButtonRef.current?.focus();
    wasEditing.current = editingReply;
  }, [editingReply]);
  const details = [
    review.purchased_size && `Comprou: ${review.purchased_size}`,
    review.fit && `Caimento: ${FIT_LABELS[review.fit] ?? review.fit}`,
  ].filter(Boolean);

  return (
    <AdminPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* O nome acessível começa pelo texto visível (WCAG 2.5.3), para comando de voz. */}
          <button
            type="button"
            onClick={() => onFilterProduct(review)}
            className="min-h-11 text-left text-[16px] font-bold text-black underline-offset-2 hover:underline"
          >
            {review.product_name}
            <span className="sr-only">, ver só as avaliações deste produto</span>
          </button>
          <p className="mt-1 text-[13px] text-shio-muted">
            {review.author_name} · {review.author_email} · {formatReviewDate(review.created_at)}
          </p>
        </div>
        <Rating value={review.rating} />
      </div>

      {details.length > 0 && <p className="mt-2 text-[13px] text-shio-muted">{details.join(' · ')}</p>}
      {review.comment && <p className="mt-3 text-[15px] leading-6 text-black/80">{review.comment}</p>}

      {!isPublished && (
        <p className="mt-3 rounded-[10px] bg-[#fff5f5] px-4 py-3 text-[13px] text-[#cc0000]">
          {removalText(review)}{review.removed_by_name ? ` · por ${review.removed_by_name}` : ''}
        </p>
      )}

      {review.admin_reply && !editingReply && (
        <div className="mt-3 rounded-[10px] bg-[#f5f5f5] px-4 py-3">
          <p className="text-[12px] font-semibold uppercase text-shio-muted">Resposta da Shio</p>
          <p className="mt-1 text-[14px] text-black/80">{review.admin_reply}</p>
        </div>
      )}

      {editingReply && (
        <div className="mt-3 grid gap-2">
          <textarea
            aria-label="Resposta da Shio"
            // Abre já no campo: quem clicou em Responder quer escrever.
            autoFocus
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
          <button ref={replyButtonRef} type="button" onClick={() => onReplyDraftChange({ id: review.id, text: review.admin_reply ?? '' })} className={ACTION}>
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
  // A lista recarrega depois de cada ação e o botão usado some: o foco vai para o aviso (#64).
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);
  const tabsId = useId();
  const ratingRef = useRef(null);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const productId = product?.id;
  const requestKey = [tab, rating, productId ?? '', page, reloadCount].join('|');

  useEffect(() => {
    let ignore = false;
    getAdminReviews({ status: tab, rating: rating || undefined, product: productId, page })
      .then((data) => {
        if (!ignore) setList({ key: requestKey, count: data.count, results: data.results, error: false });
      })
      .catch((err) => {
        if (ignore) return;
        if (err?.response?.status === 404 && page > 1) {
          setPage((current) => Math.max(1, current - 1));
          return;
        }
        setList({ key: requestKey, count: 0, results: [], error: true });
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

  const runAction = async (action, message) => {
    setActionError(null);
    try {
      await action();
      setNotice({ text: message });
      reload();
    } catch (err) {
      setActionError(reviewErrorMessage(err, 'Não foi possível concluir a ação.'));
    }
  };

  return (
    <div>
      <AdminTitle eyebrow="Moderação" title="Avaliações" />

      {/* Abas com setas/Home/End e só a aba ativa no Tab (padrão ARIA de abas, #64). */}
      <div
        role="tablist"
        aria-label="Status das avaliações"
        className="mb-5 flex gap-2"
        onKeyDown={(event) => {
          const index = TABS.findIndex((option) => option.value === tab);
          const next = {
            ArrowRight: (index + 1) % TABS.length,
            ArrowLeft: (index - 1 + TABS.length) % TABS.length,
            Home: 0,
            End: TABS.length - 1,
          }[event.key];
          if (next === undefined) return;
          event.preventDefault();
          resetTo(() => setTab(TABS[next].value));
          document.getElementById(`${tabsId}-tab-${TABS[next].value}`)?.focus();
        }}
      >
        {TABS.map((option) => (
          <button
            key={option.value}
            id={`${tabsId}-tab-${option.value}`}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            aria-controls={`${tabsId}-panel`}
            tabIndex={tab === option.value ? 0 : -1}
            onClick={() => resetTo(() => setTab(option.value))}
            // Cores forçadas (alto contraste) apagam o fundo preto: a aba ativa ganha borda e sublinhado.
            className={`min-h-11 rounded-full px-5 text-[14px] font-semibold transition forced-colors:border-2 ${
              tab === option.value
                ? 'bg-black text-white forced-colors:border-[Highlight] forced-colors:underline'
                : 'bg-[#f0f0f0] text-black/60 hover:bg-black/10 forced-colors:border-transparent'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 text-[14px]">
        <label htmlFor="review-rating-filter" className="text-shio-muted">Filtrar por nota</label>
        <select
          id="review-rating-filter"
          ref={ratingRef}
          value={rating}
          onChange={(event) => resetTo(() => setRating(event.target.value))}
          className="h-11 rounded-full border border-black/15 bg-white px-4 font-semibold text-black"
        >
          <option value="">Todas</option>
          {[5, 4, 3, 2, 1].map((star) => (
            <option key={star} value={String(star)}>{star === 1 ? '1 estrela' : `${star} estrelas`}</option>
          ))}
        </select>
        {product && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f0f0] pl-4 text-black">
            <span>Produto: {product.name}</span>
            <button type="button" aria-label="Limpar filtro de produto" onClick={() => {
                // O chip some junto com este botão: o foco vai para o filtro ao lado (#64).
                resetTo(() => setProduct(null));
                ratingRef.current?.focus();
              }} className="flex h-11 w-11 items-center justify-center rounded-full font-bold hover:bg-black/10">
              ×
            </button>
          </span>
        )}
      </div>

      {actionError && <p role="alert" className="mb-4 text-[13px] text-[#cc0000]">{actionError}</p>}

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`}>
      {loading ? (
        <p role="status" className="text-shio-muted">Carregando avaliações...</p>
      ) : list.error ? (
        <p role="alert" className="text-[13px] text-[#cc0000]">Não foi possível carregar as avaliações.</p>
      ) : list.results.length === 0 ? (
        <p className="text-shio-muted">Nenhuma avaliação encontrada.</p>
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
                onRestore={(item) => runAction(() => restoreReview(item.id), 'Avaliação restaurada. Ela voltou para a aba Publicadas.')}
                onSaveReply={(item, text) => runAction(async () => {
                  await setReply(item.id, text);
                  setReplyDraft(null);
                }, 'Resposta salva.')}
                onClearReply={(item) => runAction(() => clearReply(item.id), 'Resposta apagada.')}
              />
            </li>
          ))}
        </ul>
      )}

      </div>

      {totalPages > 1 && (
        // aria-disabled: na última página o botão continua com o foco (disabled o perderia).
        <nav aria-label="Paginação das avaliações" className="mt-8 flex items-center justify-between text-sm">
          <button type="button" aria-disabled={page <= 1} onClick={() => page > 1 && setPage((current) => current - 1)} className={ACTION}>Anterior</button>
          {/* Anunciado ao trocar de página: o foco fica no botão e a lista muda sem aviso. */}
          <span role="status" className="text-shio-muted">Página {page} de {totalPages}</span>
          <button type="button" aria-disabled={page >= totalPages} onClick={() => page < totalPages && setPage((current) => current + 1)} className={ACTION}>Próxima</button>
        </nav>
      )}

      {removing && (
        <RemoveReviewModal
          review={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            setNotice({ text: 'Avaliação removida. Ela está na aba Removidas.' });
            reload();
          }}
        />
      )}
      <p ref={noticeRef} tabIndex={-1} role="status" className="sr-only">{notice?.text}</p>
    </div>
  );
}

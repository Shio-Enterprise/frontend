import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { PageMarker, ProductCard } from '../../../components/ui/ShioDesign';
import apiClient from '../../../lib/axios';
import { getAccessToken } from '../../../lib/authToken';
import { useWishlist } from '../../../context/WishlistContext';

const PAGE_SIZE = 12;
const toCard = (product) => {
  const base = Number(product.base_price);
  const effective = Number(product.effective_price ?? base);
  const promo = product.is_promotion_active && effective < base;
  return {
    ...product,
    price: `R$ ${effective.toFixed(2)}`,
    oldPrice: promo ? `R$ ${base.toFixed(2)}` : null,
    discount: promo && base > 0 ? `-${Math.round((1 - effective / base) * 100)}%` : null,
    image: product.images?.[0]?.image ?? null,
    unavailable: product.is_sellable === false || !product.variations?.some((variation) => Number(variation.stock_quantity) > 0),
  };
};

export default function MyFavoritesPage() {
  const { sessionKey } = useWishlist();
  return <FavoritesList key={sessionKey} />;
}

function FavoritesList() {
  const { revision, isAuthenticated, onUnauthorized, reconcileWishlist } = useWishlist();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ items: [], count: 0, next: null, previous: null, loading: true, error: null });

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    const token = getAccessToken();
    const requestRevision = revision;
    const isCurrent = () => !controller.signal.aborted && getAccessToken() === token;
    // Fetch whenever the requested page or confirmed wishlist contents change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((old) => ({ ...old, loading: true, error: null }));
    apiClient.get('/catalog/wishlist/', {
      params: { page, page_size: PAGE_SIZE }, signal: controller.signal,
    }).then(({ data }) => {
      if (!isCurrent()) return;
      if (data.results.length === 0 && page > 1) { setPage((value) => value - 1); return; }
      const products = data.results.map(({ product }) => toCard(product));
      if (!reconcileWishlist(products.map((product) => product.id), requestRevision)) return;
      setState({ items: products, count: data.count,
        next: data.next, previous: data.previous, loading: false, error: null });
    }).catch((error) => {
      if (!isCurrent()) return;
      if (error.response?.status === 401) { void onUnauthorized(); return; }
      if (error.response?.status === 404 && page > 1) { setPage((value) => value - 1); return; }
      setState((old) => ({ ...old, loading: false, error }));
    });
    return () => controller.abort();
  }, [page, attempt, revision, isAuthenticated, onUnauthorized, reconcileWishlist]);

  const items = state.items;
  return (
    <AccountLayout>
      <PageMarker name="MyFavoritesPage" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-black uppercase text-black md:text-[34px]">Meus favoritos</h1>
        <span className="shrink-0 text-sm text-black/45">{state.count} {state.count === 1 ? 'item' : 'itens'}</span>
      </div>
      {state.error ? (
        <div className="py-10 text-center">
          <p role="alert">Não foi possível carregar seus favoritos.</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-full border border-black px-5 py-2">Tentar novamente</button>
        </div>
      ) : null}
      {state.loading && <p role="status" className="py-6 text-center text-black/50">Carregando favoritos...</p>}
      {!state.loading && !state.error && items.length === 0 ? (
        <div className="mt-8 rounded-[18px] border border-black/15 px-6 py-16 text-center">
          <h2 className="text-xl font-bold">Você ainda não tem favoritos</h2>
          <p className="mt-2 text-sm text-black/50">Salve os produtos que você quer acompanhar.</p>
          <Link to="/category/all" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">Explorar produtos</Link>
        </div>
      ) : null}
      <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" aria-busy={state.loading}>
        {items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {(state.next || state.previous) && (
        <nav aria-label="Paginação dos favoritos" className="mt-10 flex items-center justify-center gap-3">
          <button type="button" disabled={!state.previous || state.loading} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-black px-5 py-2 disabled:opacity-30">Anterior</button>
          <span className="text-sm">Página {page}</span>
          <button type="button" disabled={!state.next || state.loading} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-black px-5 py-2 disabled:opacity-30">Próxima</button>
        </nav>
      )}
    </AccountLayout>
  );
}

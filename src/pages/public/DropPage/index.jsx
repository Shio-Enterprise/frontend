import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { PageMarker, ProductCard } from '../../../components/ui/ShioDesign';
import useNow from '../../../hooks/useNow';
import { getCountdownParts, getDropPhase } from '../../../lib/dropCountdown';
import { getAccessToken } from '../../../lib/authToken';
import {
  getMyWaitlistEntries,
  joinDropWaitlist,
  leaveDropWaitlist,
  waitlistErrorMessage,
} from '../../../lib/dropWaitlistApi';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Mesma transformação usada no HomePage/CategoryPage para o ProductCard.
const toCardShape = (p) => {
  const base = Number(p.base_price);
  const promo = p.is_promotion_active ? Number(p.effective_price) : null;
  return {
    id: p.id,
    name: p.name,
    price: `R$ ${Number(p.effective_price ?? base).toFixed(2)}`,
    oldPrice: promo ? `R$ ${base.toFixed(2)}` : null,
    discount: promo ? `-${Math.round((1 - promo / base) * 100)}%` : null,
    image: p.images?.[0]?.image ?? null,
    ratingAvg: p.rating_avg ?? 0,
    ratingCount: p.rating_count ?? 0,
    unavailable: p.is_sellable === false,
  };
};

const CountdownUnit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="text-[32px] font-black text-black md:text-[48px]">
      {String(value).padStart(2, '0')}
    </span>
    <span className="text-[11px] uppercase tracking-widest text-black/50">{label}</span>
  </div>
);

const Countdown = ({ target }) => {
  const now = useNow();
  const parts = getCountdownParts(target, now);
  if (parts.isOver) return null;

  return (
    <div className="flex gap-6">
      <CountdownUnit value={parts.days} label="dias" />
      <CountdownUnit value={parts.hours} label="horas" />
      <CountdownUnit value={parts.minutes} label="min" />
      <CountdownUnit value={parts.seconds} label="seg" />
    </div>
  );
};

const PHASE_BADGE = {
  upcoming: { text: 'Em breve', className: 'bg-black text-white' },
  ended: { text: 'Encerrado', className: 'bg-black/10 text-black/60' },
};

const DropPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState({ slug: null, notFound: false, drop: null });
  const now = useNow();

  // Estado da lista de espera
  const [waitlistEntryId, setWaitlistEntryId] = useState(null); // UUID da entrada, ou null
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/api/catalog/drops/slug/${slug}/`)
      .then((res) => (res.status === 404 ? null : res.json()))
      .then((data) => {
        if (active) setResult({ slug, notFound: !data, drop: data });
      })
      .catch(() => {
        if (active) setResult({ slug, notFound: true, drop: null });
      });

    return () => {
      active = false;
    };
  }, [slug]);

  // Carrega estado da lista de espera para usuário logado
  useEffect(() => {
    if (!getAccessToken() || !result.drop) return;
    let active = true;
    getMyWaitlistEntries()
      .then((entries) => {
        if (!active) return;
        const found = entries.find((e) => e.drop?.id === result.drop.id);
        setWaitlistEntryId(found ? found.id : null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [result.drop]);

  const handleJoin = useCallback(async () => {
    if (!getAccessToken()) {
      navigate(`/login?next=/drop/${slug}`);
      return;
    }
    setWaitlistLoading(true);
    setWaitlistError('');
    try {
      const { entry } = await joinDropWaitlist(result.drop.id);
      setWaitlistEntryId(entry.id);
    } catch (err) {
      setWaitlistError(waitlistErrorMessage(err));
    } finally {
      setWaitlistLoading(false);
    }
  }, [result.drop, slug, navigate]);

  const handleLeave = useCallback(async () => {
    setWaitlistLoading(true);
    setWaitlistError('');
    try {
      await leaveDropWaitlist(result.drop.id);
      setWaitlistEntryId(null);
    } catch (err) {
      setWaitlistError(waitlistErrorMessage(err));
    } finally {
      setWaitlistLoading(false);
    }
  }, [result.drop]);

  const loading = result.slug !== slug;

  if (loading) {
    return (
      <PublicLayout>
        <PageMarker name="DropPage" />
        <div className="flex min-h-[400px] items-center justify-center text-black/40">
          Carregando drop...
        </div>
      </PublicLayout>
    );
  }

  if (result.notFound || !result.drop) {
    return (
      <PublicLayout>
        <PageMarker name="DropPage" />
        <div className="mx-auto max-w-[1240px] px-6 py-20 text-center">
          <p className="text-[24px] font-bold text-black">Drop não encontrado.</p>
          <Link to="/" className="mt-6 inline-block text-black underline">Voltar à loja</Link>
        </div>
      </PublicLayout>
    );
  }

  const { drop } = result;
  const phase = getDropPhase(drop, now);
  const badge = PHASE_BADGE[phase];
  const soldOut = phase === 'live' && drop.remaining_quantity !== null && drop.remaining_quantity <= 0;
  const products = drop.products.map(toCardShape);

  return (
    <PublicLayout>
      <PageMarker name="DropPage" />
      <section className="mx-auto max-w-[1240px] px-6 py-10">
        {drop.banner && (
          <div className="overflow-hidden rounded-[20px] bg-[#f0efed]">
            <img src={drop.banner} alt={drop.name} className="w-full object-cover" />
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {badge && (
            <span className={`rounded-full px-4 py-1 text-[13px] font-semibold ${badge.className}`}>
              {badge.text}
            </span>
          )}
          {soldOut && (
            <span className="rounded-full bg-[#ffebeb] px-4 py-1 text-[13px] font-semibold text-[#ff3333]">
              Esgotado
            </span>
          )}
          {drop.remaining_quantity !== null && (
            <span className="rounded-full border border-black/15 px-4 py-1 text-[13px] font-semibold text-black">
              {drop.remaining_quantity} de {drop.max_quantity} restantes
            </span>
          )}
        </div>

        <h1 className="mt-4 text-[32px] font-black uppercase leading-tight text-black md:text-[42px]">
          {drop.name}
        </h1>
        {drop.description && (
          <p className="mt-3 max-w-[760px] text-[16px] text-black/70">{drop.description}</p>
        )}

        {phase === 'upcoming' && (
          <div className="mt-8">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-black/50">
              Lançamento em
            </p>
            <Countdown target={drop.launch_date} />

            {/* Botão de lista de espera */}
            <div className="mt-6">
              {waitlistEntryId ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-semibold text-black">
                    ✅ Você está na lista de espera
                  </p>
                  <button
                    onClick={handleLeave}
                    disabled={waitlistLoading}
                    className="w-fit text-[13px] text-black/50 underline hover:text-black disabled:opacity-50"
                  >
                    {waitlistLoading ? 'Saindo...' : 'Sair da lista'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={waitlistLoading}
                  className="rounded-md bg-black px-8 py-3 text-[15px] font-bold uppercase text-white transition-colors hover:bg-black/80 disabled:opacity-50"
                >
                  {waitlistLoading ? 'Aguarde...' : 'Entrar na lista de espera'}
                </button>
              )}
              {waitlistError && (
                <p className="mt-2 text-[13px] text-red-600">{waitlistError}</p>
              )}
            </div>
          </div>
        )}
        {phase === 'live' && drop.end_date && (
          <div className="mt-8">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-black/50">
              Termina em
            </p>
            <Countdown target={drop.end_date} />
          </div>
        )}

        {products.length > 0 ? (
          <div className="mt-14 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-14 text-[14px] text-black/40">Nenhum produto publicado neste drop ainda.</p>
        )}
      </section>
    </PublicLayout>
  );
};

export default DropPage;

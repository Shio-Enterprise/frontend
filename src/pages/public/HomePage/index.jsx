import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { ProductCard, SectionTitle, ViewAllButton } from '../../../components/ui/ShioDesign';
import WelcomeModal from '../../../components/ui/WelcomeModal';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const DEFAULT_SLIDES = [
  { id: 'default-1', image_desktop: '/images/shio/hero-slide-1.png', alt_text: 'Pré-venda do Novo Drop — Shio' },
  { id: 'default-2', image_desktop: '/images/shio/hero-slide-2.jpg.png', alt_text: 'Deus primeiro. Negócios depois.' },
];
const DEFAULT_TAGLINE = 'Deus primeiro. Negócios depois.';
const isInternalLink = (link) => typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') && !link.includes('\\');

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

const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

function HeroCarousel({ slides }) {
  const [current, setCurrent] = useState(0);
  const visibleCurrent = current % slides.length;
  // Quem pede menos movimento no sistema começa com o carrossel parado.
  const [paused, setPaused] = useState(prefersReducedMotion);
  // Mouse ou foco dentro do carrossel seguram a troca, sem mexer no botão de pausar.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const rotating = !paused && !hovered && !focused;

  useEffect(() => {
    if (!rotating) return undefined;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, rotating]);

  const controlClass = 'absolute flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80';

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative overflow-hidden bg-black"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${visibleCurrent * 100}%)` }}
        aria-live={rotating ? 'off' : 'polite'}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${slides.length}`}
            aria-hidden={i !== visibleCurrent}
            className="w-full shrink-0"
          >
            {isInternalLink(slide.link) ? <Link to={slide.link} tabIndex={i === visibleCurrent ? 0 : -1}>
              <picture>
                {slide.image_mobile && <source media="(max-width: 767px)" srcSet={slide.image_mobile} />}
                <img src={slide.image_desktop} alt={slide.alt_text} className="h-[300px] w-full object-cover md:h-[480px]" />
              </picture>
            </Link> : <picture>
              {slide.image_mobile && <source media="(max-width: 767px)" srcSet={slide.image_mobile} />}
              <img src={slide.image_desktop} alt={slide.alt_text} className="h-[300px] w-full object-cover md:h-[480px]" />
            </picture>}
          </div>
        ))}
      </div>

      {slides.length > 1 && <button type="button" onClick={prev} className={`${controlClass} left-4 top-1/2 -translate-y-1/2`} aria-label="Slide anterior">
        <span aria-hidden="true">‹</span>
      </button>}
      {slides.length > 1 && <button type="button" onClick={next} className={`${controlClass} right-4 top-1/2 -translate-y-1/2`} aria-label="Próximo slide">
        <span aria-hidden="true">›</span>
      </button>}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className={`${controlClass} bottom-2 right-4`}
        aria-label={paused ? 'Retomar troca automática dos slides' : 'Pausar troca automática dos slides'}
      >
        <span aria-hidden="true" className="text-[14px] font-bold">{paused ? '▶' : '❚❚'}</span>
      </button>

      {/* Bolinhas: o desenho é pequeno, mas a área de toque tem 44px. */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Ir para slide ${i + 1}`}
            aria-current={i === visibleCurrent ? 'true' : undefined}
            className="flex h-11 min-w-11 items-center justify-center px-1"
          >
            <span aria-hidden="true" className={`block h-2 rounded-full transition-all duration-300 ${i === visibleCurrent ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
          </button>
        ))}
      </div>
    </section>
  );
}

function useHomeProducts(ordering) {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ ordering, page_size: '4' });

    fetch(`${API_BASE_URL}/api/catalog/products/?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Falha ao carregar produtos');
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ items: data.results.map(toCardShape), loading: false, error: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ items: [], loading: false, error: true });
        }
      });

    return () => controller.abort();
  }, [ordering]);

  return state;
}

const HomePage = () => {
  const [homepage, setHomepage] = useState({ banners: DEFAULT_SLIDES, tagline: DEFAULT_TAGLINE });
  const launches = useHomeProducts('-created_at');
  const bestSellers = useHomeProducts('-sales_count');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/catalog/homepage/`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Falha ao carregar a página inicial');
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setHomepage({
          banners: Array.isArray(data.banners) && data.banners.length ? data.banners : DEFAULT_SLIDES,
          tagline: data.tagline || DEFAULT_TAGLINE,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const renderGrid = ({ items, loading, error }) => {
    if (loading) return <div role="status" className="mt-10 text-center text-[18px] text-shio-muted">Carregando...</div>;
    if (error) return <div role="alert" className="mt-10 text-center text-[18px] text-shio-muted">Não foi possível carregar os produtos.</div>;
    if (items.length === 0) return <div className="mt-10 text-center text-[18px] text-shio-muted">Nenhum produto disponível.</div>;
    return (
      <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    );
  };

  return (
    <PublicLayout>
      <WelcomeModal />

      <HeroCarousel slides={homepage.banners} />

      <section className="bg-black py-8 text-center">
        <h1 className="text-[26px] font-black uppercase leading-tight text-white md:text-[34px]">
          {homepage.tagline}
        </h1>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-16 md:py-20">
        <SectionTitle>Lançamentos</SectionTitle>
        {renderGrid(launches)}
        <ViewAllButton />
      </section>

      <section className="mx-auto max-w-[1240px] border-t border-black/10 px-6 py-16 md:py-20">
        <SectionTitle>Mais vendidos</SectionTitle>
        {renderGrid(bestSellers)}
        <ViewAllButton to="/category/all?ordering=-sales_count" />
      </section>
    </PublicLayout>
  );
};

export default HomePage;

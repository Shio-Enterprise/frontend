import { useState, useEffect, useCallback } from 'react';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { PageMarker, ProductCard, SectionTitle, ViewAllButton } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const SLIDES = [
  { src: '/images/shio/hero-slide-1.png', alt: 'Pré-venda do Novo Drop — Shio' },
  { src: '/images/shio/hero-slide-2.jpg.png', alt: 'Deus primeiro. Negócios depois.' },
];

const toCardShape = (p) => {
  const base = Number(p.base_price);
  const promo = p.promotional_price ? Number(p.promotional_price) : null;
  return {
    id: p.id,
    name: p.name,
    price: `R$ ${(promo ?? base).toFixed(2)}`,
    oldPrice: promo ? `R$ ${base.toFixed(2)}` : null,
    discount: promo ? `-${Math.round((1 - promo / base) * 100)}%` : null,
    image: p.images?.[0]?.image ?? null,
    rating: null,
  };
};

function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length), []);
  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <section className="relative overflow-hidden bg-black">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className="h-[300px] w-full shrink-0 object-cover md:h-[480px]"
          />
        ))}
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        aria-label="Slide anterior"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        aria-label="Próximo slide"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Ir para slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
          />
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
  const launches = useHomeProducts('-created_at');
  const bestSellers = useHomeProducts('-sales_count');

  const renderGrid = ({ items, loading, error }) => {
    if (loading) return <div className="mt-10 text-center text-[18px] text-black/40">Carregando...</div>;
    if (error) return <div role="alert" className="mt-10 text-center text-[18px] text-black/40">Não foi possível carregar os produtos.</div>;
    if (items.length === 0) return <div className="mt-10 text-center text-[18px] text-black/40">Nenhum produto disponível.</div>;
    return (
      <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    );
  };

  return (
    <PublicLayout>
      <PageMarker name="HomePage" />

      <HeroCarousel />

      <section className="bg-black py-8 text-center">
        <p className="text-[26px] font-black uppercase leading-tight text-white md:text-[34px]">
          Deus primeiro. Negócios depois.
        </p>
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

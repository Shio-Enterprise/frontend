import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { Icon, PageMarker, ProductCard } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

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
    rating: null,
  };
};

const PAGE_SIZE = 9;

const COLOR_HEX = {
  'Verde':    '#22c55e',
  'Vermelho': '#ef4444',
  'Amarelo':  '#eab308',
  'Laranja':  '#f97316',
  'Ciano':    '#06b6d4',
  'Azul':     '#3b82f6',
  'Roxo':     '#a855f7',
  'Rosa':     '#ec4899',
  'Branco':   '#ffffff',
  'Preto':    '#111111',
};

// ─── Dual range slider ────────────────────────────────────────────────────────

function PriceRangeSlider({ min, max, value, onChange }) {
  const [minVal, maxVal] = value;
  const range = max - min || 1;
  const pct = (v) => ((v - min) / range) * 100;

  return (
    <div className="px-1">
      <div className="relative h-5">
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#e0e0e0]" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black"
          style={{ left: `${pct(minVal)}%`, right: `${100 - pct(maxVal)}%` }}
        />
        <input type="range" min={min} max={max} value={minVal}
          onChange={(e) => onChange([Math.min(+e.target.value, maxVal - 1), maxVal])}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ zIndex: minVal > max - range * 0.1 ? 5 : 3 }}
        />
        <input type="range" min={min} max={max} value={maxVal}
          onChange={(e) => onChange([minVal, Math.max(+e.target.value, minVal + 1)])}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ zIndex: 4 }}
        />
        <div className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow"
          style={{ left: `${pct(minVal)}%` }} />
        <div className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow"
          style={{ left: `${pct(maxVal)}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-[14px] font-medium text-black">
        <span>R$ {minVal}</span>
        <span>R$ {maxVal}</span>
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-black/10 py-5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between">
        <span className="text-[18px] font-bold text-black">{title}</span>
        <span className="text-black/55 text-[18px]">{open ? '∧' : '∨'}</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ─── Mobile filter modal ──────────────────────────────────────────────────────

function FilterModal({ open, onClose, priceMin, priceMax, allSizes, allColors,
  pendingPrice, setPendingPrice, pendingSize, setPendingSize,
  pendingColors, setPendingColors, onApply }) {

  const [priceOpen, setPriceOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-[380px] flex-col rounded-t-[24px] bg-white sm:rounded-[24px]"
        style={{ maxHeight: '90vh' }}>

        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <Icon name="tag" className="h-5 w-5 text-black/55" />
            <span className="text-[20px] font-bold text-black">Filtros</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 transition hover:bg-black/5">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <FilterSection title="Preço" open={priceOpen} onToggle={() => setPriceOpen((v) => !v)}>
            {priceMin < priceMax ? (
              <PriceRangeSlider min={priceMin} max={priceMax} value={pendingPrice} onChange={setPendingPrice} />
            ) : (
              <p className="text-[13px] text-black/40">Carregando...</p>
            )}
          </FilterSection>

          <FilterSection title="Cores" open={colorsOpen} onToggle={() => setColorsOpen((v) => !v)}>
            {allColors.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {allColors.map((c) => {
                  const selected = pendingColors.includes(c.name);
                  return (
                    <button key={c.name} type="button"
                      onClick={() => setPendingColors((prev) => selected ? prev.filter((n) => n !== c.name) : [...prev, c.name])}
                      title={c.name}
                      className="relative h-10 w-10 rounded-full transition"
                      style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1.5px solid #e0e0e0' : 'none' }}>
                      {selected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Icon name="save" className={`h-4 w-4 ${c.hex === '#ffffff' || c.hex === '#eab308' ? 'text-black' : 'text-white'}`} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-black/40">Nenhuma cor disponível.</p>
            )}
          </FilterSection>

          <FilterSection title="Tamanho" open={sizeOpen} onToggle={() => setSizeOpen((v) => !v)}>
            {allSizes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allSizes.map((size) => (
                  <button key={size} type="button"
                    onClick={() => setPendingSize(pendingSize === size ? null : size)}
                    className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                      pendingSize === size
                        ? 'bg-black text-white'
                        : 'border border-black/20 text-black/70 hover:border-black'
                    }`}>
                    {size}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-black/40">Nenhum tamanho disponível.</p>
            )}
          </FilterSection>
        </div>

        <div className="shrink-0 px-6 py-5">
          <button type="button" onClick={onApply}
            className="h-12 w-full rounded-full bg-black text-[15px] font-semibold text-white transition hover:bg-black/85">
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── CategoryPage ─────────────────────────────────────────────────────────────

const CategoryPage = () => {
  const [searchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');

  // Desktop sidebar open state
  const [priceOpen, setPriceOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  // Mobile modal
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingColors, setPendingColors] = useState([]);
  const [appliedColors, setAppliedColors] = useState([]);

  // Pending filters (shared between desktop inline and mobile modal)
  const [pendingPrice, setPendingPrice] = useState([0, 10000]);
  const [pendingSize, setPendingSize] = useState(null);

  // Applied filters (what actually filters the list)
  const [appliedPrice, setAppliedPrice] = useState([0, 10000]);
  const [appliedSize, setAppliedSize] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/catalog/products/`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const active = list.filter((p) => p.is_active !== false);
        setAllProducts(active);
        if (active.length > 0) {
          const prices = active.map((p) => Number(p.base_price));
          const min = Math.floor(Math.min(...prices));
          const max = Math.ceil(Math.max(...prices));
          setPendingPrice([min, max]);
          setAppliedPrice([min, max]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const priceMin = useMemo(() => {
    if (!allProducts.length) return 0;
    return Math.floor(Math.min(...allProducts.map((p) => Number(p.base_price))));
  }, [allProducts]);

  const priceMax = useMemo(() => {
    if (!allProducts.length) return 1000;
    return Math.ceil(Math.max(...allProducts.map((p) => Number(p.base_price))));
  }, [allProducts]);

  const allSizes = useMemo(() => {
    const sizes = new Set();
    allProducts.forEach((p) => p.variations?.forEach((v) => sizes.add(v.size)));
    const order = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Único'];
    return [...sizes].sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allProducts]);

  const allColors = useMemo(() => {
    const names = new Set();
    allProducts.forEach((p) => p.variations?.forEach((v) => { if (v.color) names.add(v.color); }));
    return [...names].map((name) => ({ name, hex: COLOR_HEX[name] ?? '#cccccc' }));
  }, [allProducts]);

  const q = searchParams.get('q') ?? '';

  const filtered = useMemo(() => {
    return allProducts
      .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.description?.toLowerCase().includes(q.toLowerCase()))
      .filter((p) => { const price = Number(p.base_price); return price >= appliedPrice[0] && price <= appliedPrice[1]; })
      .filter((p) => !appliedSize || p.variations?.some((v) => v.size === appliedSize))
      .filter((p) => appliedColors.length === 0 || p.variations?.some((v) => appliedColors.includes(v.color)));
  }, [allProducts, q, appliedPrice, appliedSize, appliedColors]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.base_price) - Number(b.base_price);
      if (sortBy === 'price-desc') return Number(b.base_price) - Number(a.base_price);
      return 0;
    });
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDesktopApply = () => {
    setAppliedPrice(pendingPrice);
    setAppliedSize(pendingSize);
    setAppliedColors(pendingColors);
    setPage(1);
  };

  const handleMobileApply = () => {
    setAppliedPrice(pendingPrice);
    setAppliedSize(pendingSize);
    setAppliedColors(pendingColors);
    setPage(1);
    setFiltersOpen(false);
  };

  const handleOpenMobileFilters = () => {
    setPendingPrice(appliedPrice);
    setPendingSize(appliedSize);
    setPendingColors(appliedColors);
    setFiltersOpen(true);
  };

  const clearPrice = () => { setAppliedPrice([priceMin, priceMax]); setPendingPrice([priceMin, priceMax]); setPage(1); };
  const clearSize = () => { setAppliedSize(null); setPendingSize(null); setPage(1); };
  const clearColors = () => { setAppliedColors([]); setPendingColors([]); setPage(1); };

  const priceActive = appliedPrice[0] > priceMin || appliedPrice[1] < priceMax;
  const colorsActive = appliedColors.length > 0;
  const hasActiveFilters = priceActive || !!appliedSize || colorsActive;

  const SortSelect = ({ className = '' }) => (
    <div className={`flex items-center gap-2 text-[14px] text-black/55 ${className}`}>
      <span>Ordenar por:</span>
      <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
        className="bg-transparent font-semibold text-black outline-none cursor-pointer">
        <option value="recent">Mais recentes</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
      </select>
    </div>
  );

  const Pagination = () => totalPages > 1 ? (
    <div className="mt-10 flex items-center justify-between border-t border-black/10 pt-6 text-sm">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-black/10 px-4 text-black disabled:opacity-40">
        <Icon name="arrowLeft" className="h-4 w-4" /> Anterior
      </button>
      <div className="hidden items-center gap-2 sm:flex">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setPage(n)}
            className={`rounded-[8px] px-4 py-2 ${n === currentPage ? 'bg-black text-white' : 'text-black/50 hover:bg-black/5'}`}>
            {n}
          </button>
        ))}
      </div>
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-black/10 px-4 text-black disabled:opacity-40">
        Próxima <Icon name="arrowRight" className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  return (
    <PublicLayout>
      <PageMarker name="CategoryPage" />

      <section className="mx-auto max-w-[1240px] px-6 py-16">

        {/* ══════════════════════════════════════════
            MOBILE (hidden on lg+)
        ══════════════════════════════════════════ */}
        <div className="lg:hidden">
          {/* Top bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={handleOpenMobileFilters}
              className="flex items-center gap-2 rounded-full border border-black/20 px-5 py-2.5 text-[15px] font-semibold text-black transition hover:border-black">
              <Icon name="tag" className="h-4 w-4" />
              Filtros
            </button>
            <SortSelect />
          </div>

          {/* Active filter chips */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className="text-[14px] text-black/55">
              {loading ? 'Carregando...' : `Mostrando ${filtered.length} produto${filtered.length !== 1 ? 's' : ''}`}
            </p>
            {priceActive && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Preço R${appliedPrice[0]} – R${appliedPrice[1]}
                <button onClick={clearPrice} className="ml-0.5 text-black/40 hover:text-black">
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {colorsActive && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Cor: {appliedColors.length} selecionada{appliedColors.length > 1 ? 's' : ''}
                <button onClick={clearColors} className="ml-0.5 text-black/40 hover:text-black">
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {appliedSize && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Tamanho: {appliedSize}
                <button onClick={clearSize} className="ml-0.5 text-black/40 hover:text-black">
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {hasActiveFilters && (
              <button onClick={() => { clearPrice(); clearSize(); clearColors(); }}
                className="text-[13px] font-medium text-black/45 underline hover:text-black">
                Limpar todos
              </button>
            )}
          </div>

          {/* Mobile grid */}
          {!loading && pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icon name="search" className="h-12 w-12 text-black/20" />
              <p className="mt-4 text-[20px] font-bold text-black">Nenhum produto encontrado</p>
              <p className="mt-2 text-black/45">Tente ajustar os filtros.</p>
            </div>
          ) : (
            <div className="grid gap-x-5 gap-y-10 grid-cols-2">
              {pageItems.map(toCardShape).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <Pagination />
        </div>

        {/* ══════════════════════════════════════════
            DESKTOP (hidden below lg)
        ══════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:gap-10">

          {/* Sidebar */}
          <aside className="w-[295px] shrink-0">
            <h2 className="mb-2 text-[22px] font-bold text-black">Filtros</h2>

            <FilterSection title="Preço" open={priceOpen} onToggle={() => setPriceOpen((v) => !v)}>
              {priceMin < priceMax ? (
                <PriceRangeSlider min={priceMin} max={priceMax} value={pendingPrice} onChange={setPendingPrice} />
              ) : (
                <p className="text-[13px] text-black/40">Carregando...</p>
              )}
            </FilterSection>

            <FilterSection title="Cores" open={colorsOpen} onToggle={() => setColorsOpen((v) => !v)}>
              {allColors.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {allColors.map((c) => {
                    const selected = pendingColors.includes(c.name);
                    return (
                      <button key={c.name} type="button"
                        onClick={() => setPendingColors((prev) => selected ? prev.filter((n) => n !== c.name) : [...prev, c.name])}
                        title={c.name}
                        className="relative h-10 w-10 rounded-full transition"
                        style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1.5px solid #e0e0e0' : 'none' }}>
                        {selected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Icon name="save" className={`h-4 w-4 ${c.hex === '#ffffff' || c.hex === '#eab308' ? 'text-black' : 'text-white'}`} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-black/40">Nenhuma cor disponível.</p>
              )}
            </FilterSection>

            <FilterSection title="Tamanho" open={sizeOpen} onToggle={() => setSizeOpen((v) => !v)}>
              {allSizes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((size) => (
                    <button key={size} type="button"
                      onClick={() => setPendingSize(pendingSize === size ? null : size)}
                      className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                        pendingSize === size
                          ? 'bg-black text-white'
                          : 'border border-black/20 text-black/70 hover:border-black'
                      }`}>
                      {size}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-black/40">Nenhum tamanho disponível.</p>
              )}
            </FilterSection>

            <div className="pt-6">
              <button type="button" onClick={handleDesktopApply}
                className="h-12 w-full rounded-full bg-black text-[15px] font-semibold text-white transition hover:bg-black/85">
                Aplicar Filtros
              </button>
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[14px] text-black/55">
                {loading ? 'Carregando...' : `${filtered.length} produto${filtered.length !== 1 ? 's' : ''}`}
              </p>
              <SortSelect />
            </div>

            {!loading && pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon name="search" className="h-12 w-12 text-black/20" />
                <p className="mt-4 text-[20px] font-bold text-black">Nenhum produto encontrado</p>
                <p className="mt-2 text-black/45">Tente ajustar os filtros.</p>
              </div>
            ) : (
              <div className="grid gap-x-5 gap-y-10 lg:grid-cols-3">
                {pageItems.map(toCardShape).map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
            <Pagination />
          </div>
        </div>
      </section>

      {/* Mobile filter modal */}
      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        priceMin={priceMin}
        priceMax={priceMax}
        allSizes={allSizes}
        allColors={allColors}
        pendingPrice={pendingPrice}
        setPendingPrice={setPendingPrice}
        pendingSize={pendingSize}
        setPendingSize={setPendingSize}
        pendingColors={pendingColors}
        setPendingColors={setPendingColors}
        onApply={handleMobileApply}
      />
    </PublicLayout>
  );
};

export default CategoryPage;

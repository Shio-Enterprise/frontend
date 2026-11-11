import { useState, useEffect, useId, useMemo } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import PublicLayout from "../../../components/layout/public/PublicLayout";
import {
  Icon,
  ProductCard,
} from "../../../components/ui/ShioDesign";
import Dialog from "../../../components/ui/Dialog";

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
    ratingAvg: p.rating_avg ?? 0,
    ratingCount: p.rating_count ?? 0,
    unavailable: p.is_sellable === false,
  };
};

const PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 50;
const ORDERING = {
  recent: "-created_at",
  "price-asc": "base_price",
  "price-desc": "-base_price",
  sales: "-sales_count",
  rating: "-rating_avg",
};

const COLOR_HEX = {
  Verde: "#22c55e",
  Vermelho: "#ef4444",
  Amarelo: "#eab308",
  Laranja: "#f97316",
  Ciano: "#06b6d4",
  Azul: "#3b82f6",
  Roxo: "#a855f7",
  Rosa: "#ec4899",
  Branco: "#ffffff",
  Preto: "#111111",
};

// ─── Dual range slider ────────────────────────────────────────────────────────

function PriceRangeSlider({ min, max, value, onChange }) {
  const [minVal, maxVal] = value;
  const range = max - min || 1;
  const pct = (v) => ((v - min) / range) * 100;

  return (
    <div className="px-1">
      <div className="relative h-5">
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#e0e0e0] forced-colors:bg-[GrayText]" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black forced-colors:bg-[CanvasText]"
          style={{ left: `${pct(minVal)}%`, right: `${100 - pct(maxVal)}%` }}
        />
        <input
          type="range"
          aria-label="Preço mínimo"
          aria-valuetext={`R$ ${minVal}`}
          min={min}
          max={max}
          value={minVal}
          onChange={(e) =>
            onChange([Math.min(+e.target.value, maxVal - 1), maxVal])
          }
          className="peer/min absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ zIndex: minVal > max - range * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          aria-label="Preço máximo"
          aria-valuetext={`R$ ${maxVal}`}
          min={min}
          max={max}
          value={maxVal}
          onChange={(e) =>
            onChange([minVal, Math.max(+e.target.value, minVal + 1)])
          }
          className="peer/max absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ zIndex: 4 }}
        />
        {/* Os inputs são invisíveis: o anel de foco vai na bolinha desenhada. */}
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow forced-colors:bg-[CanvasText] peer-focus-visible/min:outline-2 peer-focus-visible/min:outline-offset-2 peer-focus-visible/min:outline-black"
          style={{ left: `${pct(minVal)}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow forced-colors:bg-[CanvasText] peer-focus-visible/max:outline-2 peer-focus-visible/max:outline-offset-2 peer-focus-visible/max:outline-black"
          style={{ left: `${pct(maxVal)}%` }}
        />
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
  const contentId = useId();
  return (
    <div className="border-b border-black/10 py-5">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center justify-between"
        >
          <span className="text-[18px] font-bold text-black">{title}</span>
          <span aria-hidden="true" className="text-shio-muted text-[18px]">{open ? "∧" : "∨"}</span>
        </button>
      </h3>
      {open && <div id={contentId} className="mt-4">{children}</div>}
    </div>
  );
}

// ─── Opções de cor e tamanho (barra lateral e modal) ─────────────────────────

function ColorOptions({ colors, selected, onChange }) {
  if (colors.length === 0) {
    return <p className="text-[13px] text-shio-muted">Nenhuma cor disponível.</p>;
  }
  return (
    <div role="group" aria-label="Cores" className="flex flex-wrap gap-3">
      {colors.map((c) => {
        const isSelected = selected.includes(c.name);
        return (
          <button
            key={c.name}
            type="button"
            onClick={() =>
              onChange((prev) =>
                isSelected ? prev.filter((n) => n !== c.name) : [...prev, c.name],
              )
            }
            aria-label={c.name}
            aria-pressed={isSelected}
            title={c.name}
            data-swatch
            // A cor é a informação: no alto contraste ela continua sendo mostrada.
            className="relative h-11 w-11 rounded-full transition forced-color-adjust-none"
            style={{
              backgroundColor: c.hex,
              border: c.hex === "#ffffff" ? "1.5px solid #767676" : "none",
            }}
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Icon
                  name="save"
                  className={`h-4 w-4 ${c.hex === "#ffffff" || c.hex === "#eab308" ? "text-black" : "text-white"}`}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SizeOptions({ sizes, selected, onChange }) {
  if (sizes.length === 0) {
    return <p className="text-[13px] text-shio-muted">Nenhum tamanho disponível.</p>;
  }
  return (
    <div role="group" aria-label="Tamanhos" className="flex flex-wrap gap-2">
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(selected === size ? null : size)}
          aria-pressed={selected === size}
          className={`min-h-11 min-w-11 rounded-full px-4 py-2 text-[14px] font-medium transition ${
            selected === size
              ? "bg-black text-white"
              : "border border-black/20 text-black/70 hover:border-black"
          }`}
        >
          {size}
        </button>
      ))}
    </div>
  );
}

// ─── Mobile filter modal ──────────────────────────────────────────────────────

function FilterModal({
  open,
  onClose,
  priceMin,
  priceMax,
  allSizes,
  allColors,
  pendingPrice,
  setPendingPrice,
  pendingSize,
  setPendingSize,
  pendingColors,
  setPendingColors,
  onApply,
}) {
  const [priceOpen, setPriceOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const titleId = useId();

  if (!open) return null;

  return (
    <Dialog
      labelledBy={titleId}
      onClose={onClose}
      closeOnBackdrop
      overlayClassName="bg-black/40"
      className="flex w-full max-w-[380px] flex-col self-end rounded-t-[24px] bg-white outline-none sm:self-center sm:rounded-[24px]"
      style={{ maxHeight: "90vh" }}
    >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <Icon name="tag" className="h-5 w-5 text-shio-muted" />
            <h2 id={titleId} className="text-[20px] font-bold text-black">Filtros</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar filtros"
            className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/5"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <FilterSection
            title="Preço"
            open={priceOpen}
            onToggle={() => setPriceOpen((v) => !v)}
          >
            {priceMin < priceMax ? (
              <PriceRangeSlider
                min={priceMin}
                max={priceMax}
                value={pendingPrice}
                onChange={setPendingPrice}
              />
            ) : (
              <p className="text-[13px] text-shio-muted">
                Faixa de preço indisponível.
              </p>
            )}
          </FilterSection>

          <FilterSection
            title="Cores"
            open={colorsOpen}
            onToggle={() => setColorsOpen((v) => !v)}
          >
            <ColorOptions colors={allColors} selected={pendingColors} onChange={setPendingColors} />
          </FilterSection>

          <FilterSection
            title="Tamanho"
            open={sizeOpen}
            onToggle={() => setSizeOpen((v) => !v)}
          >
            <SizeOptions sizes={allSizes} selected={pendingSize} onChange={setPendingSize} />
          </FilterSection>
        </div>

        <div className="shrink-0 px-6 py-5">
          <button
            type="button"
            onClick={onApply}
            className="h-12 w-full rounded-full bg-black text-[15px] font-semibold text-white transition hover:bg-black/85"
          >
            Aplicar Filtros
          </button>
        </div>
    </Dialog>
  );
}

// ─── CategoryPage ─────────────────────────────────────────────────────────────

const CategoryCatalog = ({ category, search }) => {
  const [pageItems, setPageItems] = useState([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [filterOptions, setFilterOptions] = useState(null);
  const [filterOptionsError, setFilterOptionsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [urlParams, setUrlParams] = useSearchParams();
  const location = useLocation();
  const queryString = urlParams.toString();
  const page = Number(urlParams.get("page") ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Number(urlParams.get("page_size") ?? PAGE_SIZE),
  );
  const ordering = urlParams.get("ordering") ?? "-created_at";
  const sortBy =
    Object.keys(ORDERING).find((key) => ORDERING[key] === ordering) ?? "recent";
  const appliedSize = urlParams.get("size");
  const appliedColors = useMemo(
    () => new URLSearchParams(queryString).getAll("color"),
    [queryString],
  );
  const appliedPrice = useMemo(() => {
    const params = new URLSearchParams(queryString);
    const min = params.get("min_price");
    const max = params.get("max_price");
    return min !== null || max !== null ? [min, max] : null;
  }, [queryString]);

  // A URL é a fonte dos filtros aplicados.
  const [draft, setDraft] = useState(null);
  const pending =
    draft?.locationKey === location.key
      ? draft
      : {
          locationKey: location.key,
          price: appliedPrice,
          size: appliedSize,
          colors: appliedColors,
        };
  const pendingPrice = pending.price;
  const pendingSize = pending.size;
  const pendingColors = pending.colors;
  const setPendingPrice = (price) => setDraft({ ...pending, price });
  const setPendingSize = (size) => setDraft({ ...pending, size });
  const setPendingColors = (colors) =>
    setDraft({
      ...pending,
      colors: typeof colors === "function" ? colors(pending.colors) : colors,
    });

  const updateQuery = (changes) => {
    const next = new URLSearchParams(urlParams);
    next.delete("q");
    Object.entries(changes).forEach(([key, value]) => {
      next.delete(key);
      if (value !== null) {
        (Array.isArray(value) ? value : [value]).forEach((item) =>
          next.append(key, String(item)),
        );
      }
    });
    setDraft(null);
    setUrlParams(next);
  };
  const setPage = (value) =>
    updateQuery({ page: typeof value === "function" ? value(page) : value });

  // Desktop sidebar open state
  const [priceOpen, setPriceOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  // Mobile modal
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/catalog/products/filter-options/`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar filtros");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setFilterOptions(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFilterOptionsError(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      is_active: "true",
      ordering,
    });
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (appliedSize) params.set("size", appliedSize);
    appliedColors.forEach((color) => params.append("color", color));
    if (appliedPrice) {
      if (appliedPrice[0] !== null)
        params.set("min_price", String(appliedPrice[0]));
      if (appliedPrice[1] !== null)
        params.set("max_price", String(appliedPrice[1]));
    }
    async function loadProducts() {
      setLoading(true);
      setError("");
      setPageItems([]);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/catalog/products/?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!controller.signal.aborted) {
          setPageItems(data.results);
          setCount(data.count);
        }
      } catch {
        // Sem rede o fetch rejeita com a mensagem do navegador ("Failed to fetch"): mostra sempre a nossa.
        if (!controller.signal.aborted) {
          setError("Não foi possível carregar os produtos. Tente novamente.");
          setCount(0);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [
    category,
    search,
    page,
    ordering,
    pageSize,
    appliedPrice,
    appliedSize,
    appliedColors,
  ]);

  const priceMin = Math.floor(Number(filterOptions?.min_price ?? 0));
  const priceMax = Math.ceil(Number(filterOptions?.max_price ?? 0));
  const priceValue = [
    Number(pendingPrice?.[0] ?? priceMin),
    Number(pendingPrice?.[1] ?? priceMax),
  ];
  const allSizes = filterOptions?.sizes ?? [];
  const allColors = (filterOptions?.colors ?? []).map((name) => ({
    name,
    hex: COLOR_HEX[name] ?? "#cccccc",
  }));
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = page;

  const handleDesktopApply = () => {
    updateQuery({
      min_price: pendingPrice?.[0] ?? null,
      max_price: pendingPrice?.[1] ?? null,
      size: pendingSize,
      color: pendingColors,
      page: 1,
    });
  };

  const handleMobileApply = () => {
    handleDesktopApply();
    setFiltersOpen(false);
  };

  const handleOpenMobileFilters = () => {
    setDraft({
      locationKey: location.key,
      price: appliedPrice,
      size: appliedSize,
      colors: appliedColors,
    });
    setFiltersOpen(true);
  };

  const clearPrice = () => {
    updateQuery({ min_price: null, max_price: null, page: 1 });
  };
  const clearSize = () => {
    updateQuery({ size: null, page: 1 });
  };
  const clearColors = () => {
    updateQuery({ color: null, page: 1 });
  };

  const priceActive = appliedPrice !== null;
  const colorsActive = appliedColors.length > 0;
  const hasActiveFilters = priceActive || !!appliedSize || colorsActive;

  const sortSelect = (id) => (
    <div className="flex items-center gap-2 text-[14px] text-shio-muted">
      <label htmlFor={id}>Ordenar por:</label>
      <select
        id={id}
        value={sortBy}
        onChange={(e) => {
          updateQuery({ ordering: ORDERING[e.target.value], page: 1 });
        }}
        className="min-h-11 cursor-pointer bg-transparent font-semibold text-black"
      >
        <option value="recent">Mais recentes</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
        <option value="sales">Mais vendidos</option>
        <option value="rating">Mais bem avaliados</option>
      </select>
    </div>
  );

  const pagination =
    totalPages > 1 ? (
      <nav aria-label="Paginação" className="mt-10 flex items-center justify-between border-t border-black/10 pt-6 text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-black/10 px-4 text-black disabled:opacity-40"
        >
          <Icon name="arrowLeft" className="h-4 w-4" /> Anterior
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          {Array.from(
            { length: Math.min(5, totalPages) },
            (_, i) =>
              Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i,
          ).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-label={`Página ${n}`}
              aria-current={n === currentPage ? "page" : undefined}
              className={`min-h-11 min-w-11 rounded-[8px] px-4 py-2 ${n === currentPage ? "bg-black text-white" : "text-shio-muted hover:bg-black/5"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-black/10 px-4 text-black disabled:opacity-40"
        >
          Próxima <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </nav>
    ) : null;

  return (
    <PublicLayout>

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <h1 className="sr-only">
          {search ? `Resultados para "${search}"` : "Produtos"}
        </h1>
        {error && (
          <p role="alert" className="mb-6 text-shio-danger">
            {error}
          </p>
        )}
        {filterOptionsError && (
          <p role="alert" className="mb-6 text-shio-danger">
            Não foi possível carregar as opções de filtros.
          </p>
        )}

        {/* ══════════════════════════════════════════
            MOBILE (hidden on lg+)
        ══════════════════════════════════════════ */}
        <div className="lg:hidden">
          {/* Top bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleOpenMobileFilters}
              className="flex items-center gap-2 rounded-full border border-black/20 px-5 py-2.5 text-[15px] font-semibold text-black transition hover:border-black"
            >
              <Icon name="tag" className="h-4 w-4" />
              Filtros
            </button>
            {sortSelect("ordenar-celular")}
          </div>

          {/* Active filter chips */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p role="status" className="text-[14px] text-shio-muted">
              {loading
                ? "Carregando..."
                : `Mostrando ${count} produto${count !== 1 ? "s" : ""}`}
            </p>
            {priceActive && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Preço R${appliedPrice[0]} – R${appliedPrice[1]}
                <button
                  type="button"
                  onClick={clearPrice}
                  aria-label="Remover filtro de preço"
                  className="-my-2 -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-shio-muted hover:text-black"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {colorsActive && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Cor: {appliedColors.length} selecionada
                {appliedColors.length > 1 ? "s" : ""}
                <button
                  type="button"
                  onClick={clearColors}
                  aria-label="Remover filtro de cor"
                  className="-my-2 -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-shio-muted hover:text-black"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {appliedSize && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Tamanho: {appliedSize}
                <button
                  type="button"
                  onClick={clearSize}
                  aria-label="Remover filtro de tamanho"
                  className="-my-2 -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-shio-muted hover:text-black"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  updateQuery({
                    min_price: null,
                    max_price: null,
                    size: null,
                    color: null,
                    page: 1,
                  });
                }}
                className="min-h-6 text-[13px] font-medium text-shio-muted underline hover:text-black"
              >
                Limpar todos
              </button>
            )}
          </div>

          {/* Mobile grid */}
          <h2 className="sr-only">Lista de produtos</h2>
          {!loading && !error && pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icon name="search" className="h-12 w-12 text-black/20" />
              <p className="mt-4 text-[20px] font-bold text-black">
                Nenhum produto encontrado
              </p>
              <p className="mt-2 text-shio-muted">Tente ajustar os filtros.</p>
            </div>
          ) : (
            <div className="grid gap-x-5 gap-y-10 grid-cols-2">
              {pageItems.map(toCardShape).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {pagination}
        </div>

        {/* ══════════════════════════════════════════
            DESKTOP (hidden below lg)
        ══════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:gap-10">
          {/* Sidebar */}
          <aside className="w-[295px] shrink-0">
            <h2 className="mb-2 text-[22px] font-bold text-black">Filtros</h2>

            <FilterSection
              title="Preço"
              open={priceOpen}
              onToggle={() => setPriceOpen((v) => !v)}
            >
              {priceMin < priceMax ? (
                <PriceRangeSlider
                  min={priceMin}
                  max={priceMax}
                  value={priceValue}
                  onChange={setPendingPrice}
                />
              ) : (
                <p className="text-[13px] text-shio-muted">
                  Faixa de preço indisponível.
                </p>
              )}
            </FilterSection>

            <FilterSection
              title="Cores"
              open={colorsOpen}
              onToggle={() => setColorsOpen((v) => !v)}
            >
              <ColorOptions colors={allColors} selected={pendingColors} onChange={setPendingColors} />
            </FilterSection>

            <FilterSection
              title="Tamanho"
              open={sizeOpen}
              onToggle={() => setSizeOpen((v) => !v)}
            >
              <SizeOptions sizes={allSizes} selected={pendingSize} onChange={setPendingSize} />
            </FilterSection>

            <div className="pt-6">
              <button
                type="button"
                onClick={handleDesktopApply}
                className="h-12 w-full rounded-full bg-black text-[15px] font-semibold text-white transition hover:bg-black/85"
              >
                Aplicar Filtros
              </button>
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1">
            <h2 className="sr-only">Lista de produtos</h2>
            <div className="mb-6 flex items-center justify-between">
              <p role="status" className="text-[14px] text-shio-muted">
                {loading
                  ? "Carregando..."
                  : `${count} produto${count !== 1 ? "s" : ""}`}
              </p>
              {sortSelect("ordenar-desktop")}
            </div>

            {!loading && !error && pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon name="search" className="h-12 w-12 text-black/20" />
                <p className="mt-4 text-[20px] font-bold text-black">
                  Nenhum produto encontrado
                </p>
                <p className="mt-2 text-shio-muted">Tente ajustar os filtros.</p>
              </div>
            ) : (
              <div className="grid gap-x-5 gap-y-10 lg:grid-cols-3">
                {pageItems.map(toCardShape).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
            {pagination}
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
        pendingPrice={priceValue}
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

export default function CategoryPage() {
  const { name } = useParams();
  const [params] = useSearchParams();
  const category = name === "all" ? "" : (name ?? "");
  const search = params.get("search") ?? "";
  // Uma nova categoria/busca reinicia filtros e página sem consultar a página anterior.
  return (
    <CategoryCatalog
      key={JSON.stringify([category, search])}
      category={category}
      search={search}
    />
  );
}

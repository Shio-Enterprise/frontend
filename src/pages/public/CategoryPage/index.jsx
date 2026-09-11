import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "react-router-dom";
import PublicLayout from "../../../components/layout/public/PublicLayout";
import {
  Icon,
  PageMarker,
  ProductCard,
} from "../../../components/ui/ShioDesign";

const API_BASE_URL = import.meta.env.VITE_API_URL;

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

const PAGE_SIZE = 9;

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
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#e0e0e0]" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black"
          style={{ left: `${pct(minVal)}%`, right: `${100 - pct(maxVal)}%` }}
        />
        <input
          type="range"
          aria-label="Preço mínimo"
          min={min}
          max={max}
          value={minVal}
          onChange={(e) =>
            onChange([Math.min(+e.target.value, maxVal - 1), maxVal])
          }
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ zIndex: minVal > max - range * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          aria-label="Preço máximo"
          min={min}
          max={max}
          value={maxVal}
          onChange={(e) =>
            onChange([minVal, Math.max(+e.target.value, minVal + 1)])
          }
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          style={{ zIndex: 4 }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow"
          style={{ left: `${pct(minVal)}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow"
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
  return (
    <div className="border-b border-black/10 py-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between"
      >
        <span className="text-[18px] font-bold text-black">{title}</span>
        <span className="text-black/55 text-[18px]">{open ? "∧" : "∨"}</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 flex w-full max-w-[380px] flex-col rounded-t-[24px] bg-white sm:rounded-[24px]"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <Icon name="tag" className="h-5 w-5 text-black/55" />
            <span className="text-[20px] font-bold text-black">Filtros</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition hover:bg-black/5"
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
              <p className="text-[13px] text-black/40">
                Faixa de preço indisponível.
              </p>
            )}
          </FilterSection>

          <FilterSection
            title="Cores"
            open={colorsOpen}
            onToggle={() => setColorsOpen((v) => !v)}
          >
            {allColors.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {allColors.map((c) => {
                  const selected = pendingColors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() =>
                        setPendingColors((prev) =>
                          selected
                            ? prev.filter((n) => n !== c.name)
                            : [...prev, c.name],
                        )
                      }
                      title={c.name}
                      className="relative h-10 w-10 rounded-full transition"
                      style={{
                        backgroundColor: c.hex,
                        border:
                          c.hex === "#ffffff" ? "1.5px solid #e0e0e0" : "none",
                      }}
                    >
                      {selected && (
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
            ) : (
              <p className="text-[13px] text-black/40">
                Nenhuma cor disponível.
              </p>
            )}
          </FilterSection>

          <FilterSection
            title="Tamanho"
            open={sizeOpen}
            onToggle={() => setSizeOpen((v) => !v)}
          >
            {allSizes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setPendingSize(pendingSize === size ? null : size)
                    }
                    className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                      pendingSize === size
                        ? "bg-black text-white"
                        : "border border-black/20 text-black/70 hover:border-black"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-black/40">
                Nenhum tamanho disponível.
              </p>
            )}
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
      </div>
    </div>,
    document.body,
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
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("recent");

  // Desktop sidebar open state
  const [priceOpen, setPriceOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  // Mobile modal
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingColors, setPendingColors] = useState([]);
  const [appliedColors, setAppliedColors] = useState([]);

  // Pending filters (shared between desktop inline and mobile modal)
  const [pendingPrice, setPendingPrice] = useState(null);
  const [pendingSize, setPendingSize] = useState(null);

  // Applied filters (what actually filters the list)
  const [appliedPrice, setAppliedPrice] = useState(null);
  const [appliedSize, setAppliedSize] = useState(null);

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
      page_size: String(PAGE_SIZE),
      is_active: "true",
      ordering: {
        recent: "-created_at",
        "price-asc": "base_price",
        "price-desc": "-base_price",
      }[sortBy],
    });
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (appliedSize) params.set("size", appliedSize);
    appliedColors.forEach((color) => params.append("color", color));
    if (appliedPrice) {
      params.set("min_price", String(appliedPrice[0]));
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
        if (!response.ok)
          throw new Error(
            "Não foi possível carregar os produtos. Tente novamente.",
          );
        const data = await response.json();
        if (!controller.signal.aborted) {
          setPageItems(data.results);
          setCount(data.count);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause.message);
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
    sortBy,
    appliedPrice,
    appliedSize,
    appliedColors,
  ]);

  const priceMin = Math.floor(Number(filterOptions?.min_price ?? 0));
  const priceMax = Math.ceil(Number(filterOptions?.max_price ?? 0));
  const priceValue = pendingPrice ?? [priceMin, priceMax];
  const allSizes = filterOptions?.sizes ?? [];
  const allColors = (filterOptions?.colors ?? []).map((name) => ({
    name,
    hex: COLOR_HEX[name] ?? "#cccccc",
  }));
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = page;

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

  const clearPrice = () => {
    setAppliedPrice(null);
    setPendingPrice(null);
    setPage(1);
  };
  const clearSize = () => {
    setAppliedSize(null);
    setPendingSize(null);
    setPage(1);
  };
  const clearColors = () => {
    setAppliedColors([]);
    setPendingColors([]);
    setPage(1);
  };

  const priceActive = appliedPrice !== null;
  const colorsActive = appliedColors.length > 0;
  const hasActiveFilters = priceActive || !!appliedSize || colorsActive;

  const sortSelect = (
    <div className="flex items-center gap-2 text-[14px] text-black/55">
      <span>Ordenar por:</span>
      <select
        value={sortBy}
        onChange={(e) => {
          setSortBy(e.target.value);
          setPage(1);
        }}
        className="bg-transparent font-semibold text-black outline-none cursor-pointer"
      >
        <option value="recent">Mais recentes</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
      </select>
    </div>
  );

  const pagination =
    totalPages > 1 ? (
      <div className="mt-10 flex items-center justify-between border-t border-black/10 pt-6 text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-black/10 px-4 text-black disabled:opacity-40"
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
              onClick={() => setPage(n)}
              className={`rounded-[8px] px-4 py-2 ${n === currentPage ? "bg-black text-white" : "text-black/50 hover:bg-black/5"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-black/10 px-4 text-black disabled:opacity-40"
        >
          Próxima <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </div>
    ) : null;

  return (
    <PublicLayout>
      <PageMarker name="CategoryPage" />

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        {error && (
          <p role="alert" className="mb-6 text-red-700">
            {error}
          </p>
        )}
        {filterOptionsError && (
          <p role="alert" className="mb-6 text-red-700">
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
            {sortSelect}
          </div>

          {/* Active filter chips */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className="text-[14px] text-black/55">
              {loading
                ? "Carregando..."
                : `Mostrando ${count} produto${count !== 1 ? "s" : ""}`}
            </p>
            {priceActive && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Preço R${appliedPrice[0]} – R${appliedPrice[1]}
                <button
                  onClick={clearPrice}
                  className="ml-0.5 text-black/40 hover:text-black"
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
                  onClick={clearColors}
                  className="ml-0.5 text-black/40 hover:text-black"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {appliedSize && (
              <span className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1 text-[13px] font-medium text-black">
                Tamanho: {appliedSize}
                <button
                  onClick={clearSize}
                  className="ml-0.5 text-black/40 hover:text-black"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  clearPrice();
                  clearSize();
                  clearColors();
                }}
                className="text-[13px] font-medium text-black/45 underline hover:text-black"
              >
                Limpar todos
              </button>
            )}
          </div>

          {/* Mobile grid */}
          {!loading && !error && pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icon name="search" className="h-12 w-12 text-black/20" />
              <p className="mt-4 text-[20px] font-bold text-black">
                Nenhum produto encontrado
              </p>
              <p className="mt-2 text-black/45">Tente ajustar os filtros.</p>
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
                <p className="text-[13px] text-black/40">
                  Faixa de preço indisponível.
                </p>
              )}
            </FilterSection>

            <FilterSection
              title="Cores"
              open={colorsOpen}
              onToggle={() => setColorsOpen((v) => !v)}
            >
              {allColors.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {allColors.map((c) => {
                    const selected = pendingColors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() =>
                          setPendingColors((prev) =>
                            selected
                              ? prev.filter((n) => n !== c.name)
                              : [...prev, c.name],
                          )
                        }
                        title={c.name}
                        className="relative h-10 w-10 rounded-full transition"
                        style={{
                          backgroundColor: c.hex,
                          border:
                            c.hex === "#ffffff"
                              ? "1.5px solid #e0e0e0"
                              : "none",
                        }}
                      >
                        {selected && (
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
              ) : (
                <p className="text-[13px] text-black/40">
                  Nenhuma cor disponível.
                </p>
              )}
            </FilterSection>

            <FilterSection
              title="Tamanho"
              open={sizeOpen}
              onToggle={() => setSizeOpen((v) => !v)}
            >
              {allSizes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setPendingSize(pendingSize === size ? null : size)
                      }
                      className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                        pendingSize === size
                          ? "bg-black text-white"
                          : "border border-black/20 text-black/70 hover:border-black"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-black/40">
                  Nenhum tamanho disponível.
                </p>
              )}
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
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[14px] text-black/55">
                {loading
                  ? "Carregando..."
                  : `${count} produto${count !== 1 ? "s" : ""}`}
              </p>
              {sortSelect}
            </div>

            {!loading && !error && pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icon name="search" className="h-12 w-12 text-black/20" />
                <p className="mt-4 text-[20px] font-bold text-black">
                  Nenhum produto encontrado
                </p>
                <p className="mt-2 text-black/45">Tente ajustar os filtros.</p>
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
  const search = params.get("search") ?? params.get("q") ?? "";
  // Uma nova categoria/busca reinicia filtros e página sem consultar a página anterior.
  return (
    <CategoryCatalog
      key={JSON.stringify([category, search])}
      category={category}
      search={search}
    />
  );
}

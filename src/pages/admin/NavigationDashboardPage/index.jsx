import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, PageMarker } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';
import DashboardViewToggle from '../../../components/ui/DashboardViewToggle';
import { DonutChart, HorizontalBars } from '../DetailedDashboardPage/Visualizations';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const EVENT_TYPES = [
  ['PAGE_VIEW', 'Visualização de página'],
  ['PRODUCT_VIEW', 'Visualização de produto'],
  ['ADD_TO_CART', 'Adicionado ao carrinho'],
  ['REMOVE_FROM_CART', 'Removido do carrinho'],
  ['CHECKOUT_STARTED', 'Início do checkout'],
  ['PURCHASE', 'Compra'],
];

const eventLabel = Object.fromEntries(EVENT_TYPES);

const ACCESS_EVENT_TYPES = EVENT_TYPES.filter(([type]) => type !== 'PAGE_VIEW');

const INTEREST_LABEL = {
  PURCHASE: 'Comprou',
  CHECKOUT_STARTED: 'Iniciou o checkout',
  ADD_TO_CART: 'Colocou no carrinho',
  REMOVE_FROM_CART: 'Tirou do carrinho',
  PRODUCT_VIEW: 'Viu o produto',
};

function formatCount(value, singular, plural) {
  const total = Number(value) || 0;
  return `${total.toLocaleString('pt-BR')} ${total === 1 ? singular : plural}`;
}

function formatSeriesPeriod(date, groupBy) {
  const [year, month, day] = date.split('-');
  return groupBy === 'month' ? `${month}/${year}` : `${day}/${month}/${year}`;
}

function formatOccurredAt(iso) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function asRows(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results ?? [];
}

async function authorizedGet(url, { navigate, location, signal }) {
  const token = getAccessToken();
  if (!token) {
    navigate('/login', { state: { from: location }, replace: true });
    return { redirected: true };
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (response.status === 401) {
    clearAuthTokens();
    navigate('/login', {
      state: { from: location, error: 'Sua sessão expirou. Faça login novamente.' },
      replace: true,
    });
    return { redirected: true };
  }

  if (response.status === 403) {
    navigate('/', { replace: true });
    return { redirected: true };
  }

  if (!response.ok) throw new Error('Não foi possível carregar a navegação.');
  return { data: await response.json() };
}

function Section({ title, views, view, onViewChange, children }) {
  return (
    <AdminPanel className="mt-6 min-w-0 p-5 md:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 basis-[180px] text-lg font-black uppercase tracking-wide md:text-xl">{title}</h2>
        {views && (
          <DashboardViewToggle
            label={`Visualização de ${title}`}
            views={views}
            value={view}
            onChange={onViewChange}
          />
        )}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </AdminPanel>
  );
}

function EventSeries({ points, groupBy, view }) {
  const [hovered, setHovered] = useState(null);
  const empty = points.length === 0 || points.every((point) => point.total === 0);
  if (empty) return <p className="text-[14px] text-black/40">Nenhum evento no período.</p>;

  if (view === 'list') {
    return (
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase text-black/55">
            <tr>
              <th className="py-2">Período</th>
              <th className="py-2 text-right">Eventos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {points.map((point) => (
              <tr key={point.date}>
                <td className="py-2">{formatSeriesPeriod(point.date, groupBy)}</td>
                <td className="py-2 text-right font-semibold">{point.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const highlighted = points.find((point) => point.date === hovered) ?? points.at(-1);
  const max = Math.max(...points.map((point) => point.total), 1);

  return (
    <div>
      <div role="group" aria-label="Período em destaque" className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
        <span className="font-semibold tabular-nums">{formatSeriesPeriod(highlighted.date, groupBy)}</span>
        <span className="font-bold tabular-nums">{formatCount(highlighted.total, 'evento', 'eventos')}</span>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${Math.max(640, points.length * 56)}px` }}>
          <div
            className="mt-4 flex h-[180px] items-end gap-2 border-l-[4px] border-black pl-4 md:h-[260px] md:gap-6 md:border-l-[8px] md:pl-9"
            onMouseLeave={() => setHovered(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setHovered(null);
            }}
          >
            {points.map((point) => (
              <button
                type="button"
                key={point.date}
                onMouseEnter={() => setHovered(point.date)}
                onFocus={() => setHovered(point.date)}
                aria-label={`${formatSeriesPeriod(point.date, groupBy)}: ${formatCount(point.total, 'evento', 'eventos')}`}
                className="flex h-full w-full flex-col items-center justify-end gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <div
                  className="w-full rounded-t-[4px] bg-[#1f1f1f]"
                  style={{ height: `${(point.total / max) * 100}%`, minHeight: point.total > 0 ? '4px' : '0' }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2 pl-8 md:gap-6 md:pl-[52px]">
            {points.map((point) => (
              <p key={point.date} className="w-full text-center text-[10px] text-black/40 md:text-[12px]">
                {formatSeriesPeriod(point.date, groupBy)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SharedInterest({ products, selectedUserId, onSelectAccount, onSelectProduct }) {
  const maxAccounts = Math.max(1, ...products.map((product) => product.accounts || 0));

  return (
    <AdminPanel className="mb-6 p-5 md:p-6">
      <h2 className="text-lg font-black uppercase tracking-wide md:text-xl">Interesse por produto</h2>
      {products.length === 0 ? (
        <p className="mt-5 text-[14px] text-black/40">Nenhum produto reuniu acessos nesse período.</p>
      ) : (
        <div className="mt-5 space-y-6">
          {products.map((product) => {
            const extra = Math.max(0, (product.accounts || 0) - (product.users?.length || 0));
            return (
              <article key={product.product_id} className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link
                    to={`/admin/products/${product.product_id}`}
                    className="min-w-0 text-base font-black underline-offset-2 [overflow-wrap:anywhere] hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="flex items-center gap-3 text-sm font-semibold tabular-nums">
                    {formatCount(product.accounts, 'conta', 'contas')}
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold"
                    >
                      Ver acessos
                    </button>
                  </span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/[0.07]">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{ width: `${((product.accounts || 0) / maxAccounts) * 100}%` }}
                  />
                </div>
                {product.users?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.users.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        aria-pressed={String(person.id) === selectedUserId}
                        onClick={() => onSelectAccount(person)}
                        className={`rounded-full border px-3 py-1.5 text-left text-xs ${String(person.id) === selectedUserId ? 'border-black bg-black text-white' : 'border-black/15 bg-black/[0.03] hover:bg-black/[0.06]'}`}
                      >
                        <span className="font-semibold">{person.email}</span>
                        <span className={String(person.id) === selectedUserId ? 'ml-2 text-white/70' : 'ml-2 text-black/55'}>
                          {INTEREST_LABEL[person.interest] || person.interest}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {extra > 0 && (
                  <p className="mt-2 text-xs text-black/50">e mais {formatCount(extra, 'conta', 'contas')}</p>
                )}
                {product.anonymous > 0 && (
                  <p className="mt-2 text-xs text-black/50">{formatCount(product.anonymous, 'visitante sem conta', 'visitantes sem conta')}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AdminPanel>
  );
}

const NavigationDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') === 'anual' ? 'anual' : 'mensal';
  const selectedUserId = searchParams.get('user') || '';

  const selectedProductId = searchParams.get('product') || '';

  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [overviewError, setOverviewError] = useState('');
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [seriesView, setSeriesView] = useState('bars');
  const [eventsView, setEventsView] = useState('bars');

  const [emailQuery, setEmailQuery] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');

  const [productQuery, setProductQuery] = useState('');
  const [debouncedProduct, setDebouncedProduct] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchError, setProductSearchError] = useState('');
  const [access, setAccess] = useState(null);
  const [accessPage, setAccessPage] = useState(1);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');

  const [userProducts, setUserProducts] = useState([]);
  const [userProductsLoading, setUserProductsLoading] = useState(false);
  const [userProductsError, setUserProductsError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedEmail(emailQuery.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [emailQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedProduct(productQuery.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [productQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const loadOverview = async () => {
      setOverviewLoading(true);
      setOverviewError('');
      try {
        const [overviewResult, interestResult] = await Promise.all([
          authorizedGet(
            `${API_BASE_URL}/api/analytics/overview/?period=${period}`,
            { navigate, location, signal: controller.signal },
          ),
          authorizedGet(
            `${API_BASE_URL}/api/analytics/products/interest/?period=${period}`,
            { navigate, location, signal: controller.signal },
          ),
        ]);
        if (!overviewResult.redirected && overviewResult.data) setOverview(overviewResult.data);
        if (!interestResult.redirected && interestResult.data) setProducts(interestResult.data.products ?? []);
      } catch (error) {
        if (error.name !== 'AbortError') setOverviewError(error.message || 'Não foi possível carregar a navegação.');
      } finally {
        if (!controller.signal.aborted) setOverviewLoading(false);
      }
    };

    loadOverview();
    return () => controller.abort();
  }, [period, attempt, navigate, location]);

  useEffect(() => {
    const query = debouncedEmail;
    if (query.length < 2) return undefined;

    const controller = new AbortController();
    const searchAccounts = async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const result = await authorizedGet(
          `${API_BASE_URL}/api/analytics/users/search/?q=${encodeURIComponent(query)}`,
          { navigate, location, signal: controller.signal },
        );
        if (result.redirected || !result.data) return;
        const needle = query.toLowerCase();
        setAccounts(asRows(result.data).filter((account) => (account.email || '').toLowerCase().includes(needle)));
      } catch (error) {
        if (error.name !== 'AbortError') setSearchError(error.message || 'Não foi possível buscar a conta.');
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    };

    searchAccounts();
    return () => controller.abort();
  }, [debouncedEmail, attempt, navigate, location]);

  useEffect(() => {
    const query = debouncedProduct;
    if (query.length < 2) return undefined;

    const controller = new AbortController();
    const searchProducts = async () => {
      setProductSearchLoading(true);
      setProductSearchError('');
      try {
        const result = await authorizedGet(
          `${API_BASE_URL}/api/analytics/products/search/?q=${encodeURIComponent(query)}`,
          { navigate, location, signal: controller.signal },
        );
        if (result.redirected || !result.data) return;
        setProductOptions(asRows(result.data));
      } catch (error) {
        if (error.name !== 'AbortError') setProductSearchError(error.message || 'Não foi possível buscar o produto.');
      } finally {
        if (!controller.signal.aborted) setProductSearchLoading(false);
      }
    };

    searchProducts();
    return () => controller.abort();
  }, [debouncedProduct, attempt, navigate, location]);

  useEffect(() => {
    if (!selectedProductId) return undefined;

    const controller = new AbortController();
    const loadAccess = async () => {
      setAccessLoading(true);
      setAccessError('');
      try {
        const result = await authorizedGet(
          `${API_BASE_URL}/api/analytics/products/${selectedProductId}/accesses/?period=${period}&page=${accessPage}`,
          { navigate, location, signal: controller.signal },
        );
        if (result.redirected || !result.data) return;
        setAccess((current) => {
          if (accessPage === 1 || !current) return result.data;
          const seen = new Set((current.accesses || []).map((item) => item.id));
          return {
            ...result.data,
            accesses: [
              ...(current.accesses || []),
              ...(result.data.accesses || []).filter((item) => !seen.has(item.id)),
            ],
          };
        });
      } catch (error) {
        if (error.name !== 'AbortError') setAccessError(error.message || 'Não foi possível carregar os acessos.');
      } finally {
        if (!controller.signal.aborted) setAccessLoading(false);
      }
    };

    loadAccess();
    return () => controller.abort();
  }, [selectedProductId, period, accessPage, attempt, navigate, location]);

  useEffect(() => {
    if (!selectedUserId) return undefined;

    const controller = new AbortController();
    const loadUserProducts = async () => {
      setUserProductsLoading(true);
      setUserProductsError('');
      try {
        const result = await authorizedGet(
          `${API_BASE_URL}/api/analytics/users/${selectedUserId}/products/?period=${period}`,
          { navigate, location, signal: controller.signal },
        );
        if (result.redirected || !result.data) return;
        setUserProducts(result.data.products ?? []);
      } catch (error) {
        if (error.name !== 'AbortError') setUserProductsError(error.message || 'Não foi possível carregar os produtos da conta.');
      } finally {
        if (!controller.signal.aborted) setUserProductsLoading(false);
      }
    };

    loadUserProducts();
    return () => controller.abort();
  }, [selectedUserId, period, attempt, navigate, location]);

  const updatePeriod = (value) => {
    setAccessPage(1);
    setAccess(null);
    setUserProducts([]);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('period', value);
      return next;
    });
  };

  const selectProduct = (product) => {
    setAccessPage(1);
    setAccess(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('product', String(product.product_id || product.id));
      return next;
    });
  };

  const clearProduct = () => {
    setAccess(null);
    setAccessPage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('product');
      return next;
    });
  };

  const selectAccount = (account) => {
    setSelectedEmail(account.email);
    setUserProducts([]);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('user', String(account.id));
      return next;
    });
  };

  const clearAccount = () => {
    setSelectedEmail('');
    setUserProducts([]);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('user');
      return next;
    });
  };

  const header = (
    <>
      <PageMarker name="NavigationDashboardPage" />
      <AdminTitle title="Navegação" />
      <AdminPanel className="mb-6 p-5">
        <label htmlFor="navigation-period" className="block text-sm text-black/60">
          Intervalo de tempo
        </label>
        <select
          id="navigation-period"
          value={period}
          onChange={(event) => updatePeriod(event.target.value)}
          className="mt-3 h-11 w-full rounded-lg border border-black/20 px-4 md:max-w-xs"
        >
          <option value="mensal">Mensal</option>
          <option value="anual">Anual</option>
        </select>
      </AdminPanel>
    </>
  );

  const accessRows = ACCESS_EVENT_TYPES.map(([type, label]) => ({
    type,
    label,
    total: access?.totals?.[type] ?? 0,
  }));
  const accessList = access?.accesses ?? [];
  const accessHasMore = access ? accessPage * 20 < (access.count || 0) : false;

  const productPanel = (
    <AdminPanel className="mb-6 p-5 md:p-6">
      <h2 className="text-lg font-black uppercase tracking-wide md:text-xl">Acessos do produto</h2>
      <input
        aria-label="Buscar produto..."
        placeholder="Buscar produto..."
        value={productQuery}
        onChange={(event) => setProductQuery(event.target.value)}
        className="mt-5 h-11 w-full rounded-lg border border-black/20 px-4"
      />
      {debouncedProduct.length >= 2 && productSearchLoading && <p role="status" className="mt-4 text-sm text-black/55">Buscando produtos...</p>}
      {debouncedProduct.length >= 2 && productSearchError && <p role="alert" className="mt-4 text-sm text-[#b42318]">{productSearchError}</p>}
      {debouncedProduct.length >= 2 && !productSearchLoading && !productSearchError && productOptions.length === 0 && (
        <p className="mt-4 text-sm text-black/55">Nenhum produto com esse nome.</p>
      )}
      {debouncedProduct.length >= 2 && productOptions.length > 0 && (
        <div className="mt-4 divide-y divide-black/10">
          {productOptions.map((product) => (
            <button
              key={product.id}
              type="button"
              aria-pressed={String(product.id) === selectedProductId}
              onClick={() => selectProduct(product)}
              className={`flex w-full items-center py-3 text-left text-sm ${String(product.id) === selectedProductId ? 'font-bold' : 'hover:bg-black/[0.03]'}`}
            >
              {product.name}
            </button>
          ))}
        </div>
      )}

      {selectedProductId && (
        <div className="mt-6 border-t border-black/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-black">
              {access?.name || 'Acessos'}
            </h3>
            <button type="button" onClick={clearProduct} className="rounded-full border border-black/20 px-3 py-1.5 text-xs">
              Limpar
            </button>
          </div>
          {accessLoading && !access && <p role="status" className="mt-4 text-sm text-black/55">Carregando acessos...</p>}
          {accessError && <p role="alert" className="mt-4 text-sm text-[#b42318]">{accessError}</p>}
          {access && access.count === 0 && (
            <p className="mt-4 text-sm text-black/55">Nenhum acesso deste produto no período.</p>
          )}
          {access && access.count > 0 && (
            <>
              <div className="mt-5">
                <HorizontalBars
                  rows={accessRows}
                  getKey={(row) => row.type}
                  getLabel={(row) => row.label}
                  getValue={(row) => row.total}
                  formatValue={(row) => formatCount(row.total, 'acesso', 'acessos')}
                />
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase text-black/55">
                    <tr>
                      <th className="py-2">Ação</th>
                      <th className="py-2">Quando</th>
                      <th className="py-2">Conta</th>
                      <th className="py-2">Variação</th>
                      <th className="py-2">Caminho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {accessList.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-3">{eventLabel[item.event_type] || item.event_type}</td>
                        <td className="py-3 pr-3">{formatOccurredAt(item.occurred_at)}</td>
                        <td className="py-3 pr-3">{item.email || 'Sem conta'}</td>
                        <td className="py-3 pr-3">{item.variation || '—'}</td>
                        <td className="py-3">{item.path || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {accessHasMore && (
                <button
                  type="button"
                  onClick={() => setAccessPage((current) => current + 1)}
                  disabled={accessLoading}
                  className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:bg-black/45"
                >
                  Carregar mais
                </button>
              )}
            </>
          )}
        </div>
      )}
    </AdminPanel>
  );

  const accountPanel = (
    <AdminPanel className="mb-6 p-5 md:p-6">
      <h2 className="text-lg font-black uppercase tracking-wide md:text-xl">Acessos por usuário</h2>
      <input
        aria-label="Buscar por e-mail..."
        placeholder="Buscar por e-mail..."
        value={emailQuery}
        onChange={(event) => setEmailQuery(event.target.value)}
        className="mt-5 h-11 w-full rounded-lg border border-black/20 px-4"
      />
      {debouncedEmail.length >= 2 && searchLoading && <p role="status" className="mt-4 text-sm text-black/55">Buscando contas...</p>}
      {debouncedEmail.length >= 2 && searchError && <p role="alert" className="mt-4 text-sm text-[#b42318]">{searchError}</p>}
      {debouncedEmail.length >= 2 && !searchLoading && !searchError && accounts.length === 0 && (
        <p className="mt-4 text-sm text-black/55">Nenhuma conta com esse e-mail.</p>
      )}
      {debouncedEmail.length >= 2 && accounts.length > 0 && (
        <div className="mt-4 divide-y divide-black/10">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              aria-pressed={String(account.id) === selectedUserId}
              onClick={() => selectAccount(account)}
              className={`flex w-full items-center py-3 text-left text-sm ${String(account.id) === selectedUserId ? 'font-bold' : 'hover:bg-black/[0.03]'}`}
            >
              {account.email}
            </button>
          ))}
        </div>
      )}

      {selectedUserId && (
        <div className="mt-6 border-t border-black/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-black">
              {selectedEmail || 'Produtos da conta'}
            </h3>
            <button type="button" onClick={clearAccount} className="rounded-full border border-black/20 px-3 py-1.5 text-xs">
              Limpar
            </button>
          </div>
          {userProductsLoading && userProducts.length === 0 && <p role="status" className="mt-4 text-sm text-black/55">Carregando produtos...</p>}
          {userProductsError && <p role="alert" className="mt-4 text-sm text-[#b42318]">{userProductsError}</p>}
          {!userProductsLoading && !userProductsError && userProducts.length === 0 && (
            <p className="mt-4 text-sm text-black/55">Esta conta não acessou produtos no período.</p>
          )}
          {userProducts.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-black/55">
                  <tr>
                    <th className="py-2">Produto</th>
                    <th className="py-2 text-right">Viu</th>
                    <th className="py-2 text-right">Carrinho</th>
                    <th className="py-2 text-right">Checkout</th>
                    <th className="py-2 text-right">Comprou</th>
                    <th className="py-2 text-right">Último acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {userProducts.map((product) => (
                    <tr key={product.product_id}>
                      <td className="py-3 pr-3">
                        <button type="button" onClick={() => selectProduct(product)} className="font-semibold underline-offset-2 hover:underline">
                          {product.name}
                        </button>
                      </td>
                      <td className="py-3 text-right">{product.views}</td>
                      <td className="py-3 text-right">{product.added_to_cart}</td>
                      <td className="py-3 text-right">{product.checkouts}</td>
                      <td className="py-3 text-right">{product.purchases}</td>
                      <td className="py-3 text-right">{formatOccurredAt(product.last_access)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminPanel>
  );

  if (overviewLoading || (!overview && !overviewError)) {
    return (
      <div className="mx-auto max-w-[920px]">
        {header}
        <p role="status" className="mt-10 text-center text-lg text-black/60">Carregando dados...</p>
      </div>
    );
  }

  if (overviewError || !overview) {
    return (
      <div className="mx-auto max-w-[920px]">
        {header}
        <AdminPanel className="p-6">
          <p role="alert" className="text-[#b42318]">{overviewError || 'Não foi possível carregar a navegação.'}</p>
          <button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            Tentar novamente
          </button>
        </AdminPanel>
      </div>
    );
  }

  const eventRows = EVENT_TYPES.map(([type, label]) => ({
    type,
    label,
    total: overview.events_by_type?.[type] ?? 0,
  }));
  const totalEvents = eventRows.reduce((sum, row) => sum + row.total, 0);
  const series = overview.series ?? [];

  return (
    <div className="mx-auto max-w-[920px]">
      {header}
      {productPanel}
      {accountPanel}
      <SharedInterest
        products={products}
        selectedUserId={selectedUserId}
        onSelectAccount={selectAccount}
        onSelectProduct={selectProduct}
      />
      <div className="grid gap-4 md:grid-cols-2 md:gap-10">
        <MetricCard label="Visitantes cadastrados" value={overview.visitors?.registered ?? 0} icon="users" />
        <MetricCard label="Visitantes anônimos" value={overview.visitors?.anonymous ?? 0} icon="user" />
      </div>

      {totalEvents === 0 ? (
        <AdminPanel className="mt-6 p-6">
          <p className="text-[14px] text-black/40">Nenhum evento no período.</p>
        </AdminPanel>
      ) : (
        <>
          <Section title="Eventos por tipo" views={[['bars', 'Barras'], ['donut', 'Rosca']]} view={eventsView} onViewChange={setEventsView}>
            {eventsView === 'donut' ? (
              <DonutChart
                rows={eventRows.filter((row) => row.total > 0)}
                getKey={(row) => row.type}
                getLabel={(row) => row.label}
                getValue={(row) => row.total}
                formatValue={(row) => formatCount(row.total, 'evento', 'eventos')}
                totalLabel="eventos por tipo"
              />
            ) : (
              <HorizontalBars
                rows={eventRows}
                getKey={(row) => row.type}
                getLabel={(row) => row.label}
                getValue={(row) => row.total}
                formatValue={(row) => formatCount(row.total, 'evento', 'eventos')}
              />
            )}
          </Section>

          <Section
            title="Série do período"
            views={[['bars', 'Barras'], ['list', 'Lista']]}
            view={seriesView}
            onViewChange={setSeriesView}
          >
            <EventSeries points={series} groupBy={overview.group_by} view={seriesView} />
          </Section>

        </>
      )}
    </div>
  );
};

export default NavigationDashboardPage;

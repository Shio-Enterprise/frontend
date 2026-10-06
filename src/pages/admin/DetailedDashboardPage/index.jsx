import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, Icon, PageMarker } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';
import DashboardViewToggle from '../../../components/ui/DashboardViewToggle';
import { DonutChart, HorizontalBars } from './Visualizations';
import OrderDrilldown from '../../../components/dashboard/OrderDrilldown';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const FILTER_KEYS = ['period', 'start_date', 'end_date', 'drop', 'category'];

function readFilters(query) {
  const params = new URLSearchParams(query);
  return {
    period: params.get('period') === 'annual' ? 'annual' : 'monthly',
    start_date: params.get('start_date') || '',
    end_date: params.get('end_date') || '',
    drop: params.get('drop') || '',
    category: params.get('category') || '',
  };
}

function filterQuery(filters) {
  const params = new URLSearchParams({ period: filters.period });
  for (const key of FILTER_KEYS.slice(1)) if (filters[key]) params.set(key, filters[key]);
  return params.toString();
}

async function catalogOptions(kind, token, signal) {
  const rows = [];
  let page = 1;
  while (true) {
    const response = await fetch(`${API_BASE_URL}/api/catalog/${kind}/?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
    if (!response.ok) throw new Error('Não foi possível carregar as opções de drop e categoria.');
    const payload = await response.json();
    rows.push(...(payload.results ?? []));
    if (!payload.next) return rows;
    page += 1;
  }
}

function apiErrorMessage(payload) {
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) return payload.join(' ');
  if (payload && typeof payload === 'object') return Object.values(payload).flat().join(' ');
  return 'Não foi possível carregar a análise detalhada.';
}

function bucketRange(point, period) {
  if (period.granularity === 'day') return [point.period, point.period];
  const [year, month] = point.period.split('-').map(Number);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  return [first < period.start_date ? period.start_date : first, last > period.end_date ? period.end_date : last];
}

const formatMoney = (value) => {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value ?? '0'));
  if (!match) return `R$ ${value}`;
  const [, sign, whole, cents = ''] = match;
  return `${sign ? '-' : ''}R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents.padEnd(2, '0')}`;
};

const formatDate = (date) => date?.split('-').reverse().join('/') ?? '—';

const statusLabels = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PREPARING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

const paymentLabels = { PIX: 'Pix', CREDIT_CARD: 'Cartão de crédito', BOLETO: 'Boleto' };
const listAndBars = [['list', 'Lista'], ['bars', 'Barras']];
const listBarsAndDonut = [...listAndBars, ['donut', 'Rosca']];

function Section({ title, note, views, defaultView = 'list', children }) {
  const [view, setView] = useState(defaultView);
  return (
    <AdminPanel className="min-w-0 p-5 md:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 basis-[180px] text-lg font-black uppercase tracking-wide md:text-xl">{title}</h2>
        {views && <DashboardViewToggle label={`Visualização de ${title}`} views={views} value={view} onChange={setView} />}
      </div>
      {note && <p className="mt-2 text-sm leading-relaxed text-black/60">{note}</p>}
      <div className="mt-5 min-w-0">{typeof children === 'function' ? children(view) : children}</div>
    </AdminPanel>
  );
}

function Empty({ children = 'Nenhum dado no período.' }) {
  return <p className="rounded-lg bg-black/[0.03] px-4 py-6 text-sm text-black/55">{children}</p>;
}

function Rows({ rows, getKey, renderRow }) {
  if (!rows?.length) return <Empty />;
  return <div className="min-w-0 divide-y divide-black/10">{rows.map((row, index) => (
    <div key={getKey(row, index)} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 [overflow-wrap:anywhere] first:pt-0 last:pb-0">
      {renderRow(row, index)}
    </div>
  ))}</div>;
}

function DrillButton({ onClick, label }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label}
    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/15 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
    <Icon name="arrowRight" className="h-4 w-4" />
  </button>;
}

function SeriesChart({ points, granularity, onSelect }) {
  const active = points?.some((point) => Number(point.net_revenue) !== 0 || point.valid_sales > 0);
  if (!active) return <Empty>Nenhuma venda ou receita líquida no período.</Empty>;
  const max = Math.max(1, ...points.map((point) => Math.abs(Number(point.net_revenue))));

  return (
    <div className="overflow-x-auto pb-2" role="group" aria-label="Série de receita líquida e vendas válidas por período">
      <div className="flex min-w-max items-end gap-2 border-b border-black/20 px-2 pt-5 md:gap-3">
        {points.map((point) => {
          const value = Number(point.net_revenue);
          const label = granularity === 'month' ? point.period.slice(0, 7) : point.period.slice(5);
          return (
            <button key={point.period} type="button" onClick={() => onSelect(point)}
              aria-label={`Ver pedidos da receita líquida de ${formatDate(point.period)}: ${formatMoney(point.net_revenue)}`}
              className="flex w-11 flex-col items-center gap-2 rounded-t focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:w-14">
              <span className="text-[11px] font-semibold text-black/70">{point.valid_sales}</span>
              <div className="flex h-36 w-full items-end justify-center">
                <div className={`w-7 rounded-t ${value < 0 ? 'bg-[#ff3333]' : 'bg-black'}`}
                  style={{ height: `${Math.max(value === 0 ? 0 : 4, Math.abs(value) / max * 100)}%` }} />
              </div>
              <span className="whitespace-nowrap text-[10px] text-black/55">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-black/55">Altura: receita líquida · número acima: vendas válidas · vermelho: receita líquida negativa.</p>
    </div>
  );
}

function SeriesTable({ points, onSelect }) {
  if (!points?.some((point) => Number(point.net_revenue) !== 0 || point.valid_sales > 0)) return <Empty>Nenhuma venda ou receita líquida no período.</Empty>;
  return <div className="max-h-[420px] overflow-auto">
    <table className="w-full min-w-[560px] text-left text-sm">
      <thead className="sticky top-0 bg-white text-xs uppercase text-black/55">
        <tr><th className="py-2 pr-4">Período</th><th className="py-2 pr-4 text-right">Vendas</th><th className="py-2 pr-4 text-right">Bruto</th><th className="py-2 pr-4 text-right">Reembolsos</th><th className="py-2 pr-4 text-right">Líquido</th><th className="py-2 text-right">Pedidos</th></tr>
      </thead>
      <tbody className="divide-y divide-black/10">
        {points.map((point) => <tr key={point.period}>
          <td className="py-2 pr-4">{formatDate(point.period)}</td>
          <td className="py-2 pr-4 text-right">{point.valid_sales}</td>
          <td className="py-2 pr-4 text-right">{formatMoney(point.gross_revenue)}</td>
          <td className="py-2 pr-4 text-right">{formatMoney(point.refunds)}</td>
          <td className="py-2 pr-4 text-right font-semibold">{formatMoney(point.net_revenue)}</td>
          <td className="py-2 text-right"><DrillButton onClick={() => onSelect(point)} label={`Ver pedidos de ${formatDate(point.period)}`} /></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function ProductRanking({ rows, unit, onSelect }) {
  return <Rows rows={rows} getKey={(row) => row.product_id} renderRow={(row, index) => <>
    <div className="min-w-0 text-sm [overflow-wrap:anywhere]">
      <span className="mr-2 font-bold text-black/45">{index + 1}.</span>
      <Link to={`/admin/products/${row.product_id}`} className="font-semibold underline-offset-2 hover:underline">{row.product_name}</Link>
    </div>
    <span className="flex items-center gap-2 text-sm font-bold">{unit === 'units' ? `${row.units} un.` : formatMoney(row.revenue)}<DrillButton onClick={() => onSelect(row)} label={`Ver pedidos de ${row.product_name}`} /></span>
  </>} />;
}

function RevenueDistribution({ rows, idKey, onSelect }) {
  return <Rows rows={rows} getKey={(row) => row[idKey] ?? 'unclassified'} renderRow={(row) => <>
    <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{row.name}</span>
    <span className="flex min-w-0 items-center gap-2 text-right text-sm [overflow-wrap:anywhere]"><span><strong>{formatMoney(row.revenue)}</strong><span className="ml-2 text-black/50">{row.units} un.</span></span><DrillButton onClick={() => onSelect(row)} label={`Ver pedidos de ${row.name}`} /></span>
  </>} />;
}

export default function DetailedDashboardPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.toString();
  const filters = useMemo(() => readFilters(urlQuery), [urlQuery]);
  const requestQuery = useMemo(() => filterQuery(filters), [filters]);
  const [snapshot, setSnapshot] = useState({ query: null, data: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalog, setCatalog] = useState({ drops: [], categories: [], loading: true, error: '' });
  const [dateError, setDateError] = useState('');
  const [selection, setSelection] = useState(null);

  const updateFilters = (changes) => {
    setDateError('');
    setSelection(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const token = getAccessToken();
    if (!token) return () => controller.abort();
    const load = async () => {
      setCatalog((current) => ({ ...current, loading: true, error: '' }));
      try {
        const [drops, categories] = await Promise.all([
          catalogOptions('drops', token, controller.signal),
          catalogOptions('categories', token, controller.signal),
        ]);
        setCatalog({ drops, categories, loading: false, error: '' });
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setCatalog((current) => ({ ...current, loading: false, error: loadError.message }));
      }
    };
    load();
    return () => controller.abort();
  }, [catalogAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    const token = getAccessToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      return () => controller.abort();
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/dashboard/detail/?${requestQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          clearAuthTokens();
          navigate('/admin/login', { replace: true, state: { error: 'Sua sessão expirou ou não possui permissão de administrador.' } });
          return;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(response.status === 400 ? apiErrorMessage(payload) : 'Não foi possível carregar a análise detalhada.');
        }
        setSnapshot({ query: requestQuery, data: await response.json() });
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError({ query: requestQuery, message: loadError.message || 'Não foi possível carregar a análise detalhada.' });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [navigate, attempt, requestQuery]);

  useEffect(() => {
    const closeOnBack = () => setSelection(null);
    window.addEventListener('popstate', closeOnBack);
    return () => window.removeEventListener('popstate', closeOnBack);
  }, []);

  useEffect(() => {
    if (hash === '#estoque' && snapshot.query === requestQuery && snapshot.data) {
      document.getElementById('estoque')?.scrollIntoView();
    }
  }, [hash, requestQuery, snapshot]);

  const closeOrders = useCallback(() => setSelection(null), []);

  const openOrders = (metric, title, extra = {}, point = null) => {
    const params = new URLSearchParams(requestQuery);
    params.set('metric', metric);
    for (const [key, value] of Object.entries(extra)) {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    }
    if (point) {
      const [startDate, endDate] = bucketRange(point, snapshot.data.period);
      params.set('start_date', startDate);
      params.set('end_date', endDate);
    }
    const periodLabel = point
      ? bucketRange(point, snapshot.data.period).map(formatDate).join(' a ')
      : `${formatDate(snapshot.data.period.start_date)} a ${formatDate(snapshot.data.period.end_date)}`;
    setSelection({
      title,
      metric,
      url: `${API_BASE_URL}/api/orders/dashboard/orders/?${params}`,
      periodLabel,
      dateBasis: metric === 'status' ? 'order_created_at' : 'payment.paid_at',
      filterKey: requestQuery,
      returnFocus: document.activeElement,
    });
  };

  const onDateSubmit = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const startDate = values.get('start_date');
    const endDate = values.get('end_date');
    if (Boolean(startDate) !== Boolean(endDate)) {
      setDateError('Informe as duas datas para definir o intervalo.');
      return;
    }
    if (startDate && startDate > endDate) {
      setDateError('A data inicial não pode ser posterior à final.');
      return;
    }
    updateFilters({ start_date: startDate, end_date: endDate });
  };

  const header = <>
    <PageMarker name="DetailedDashboardPage" />
    <AdminTitle eyebrow="Análise comercial e operacional" title="Dashboard detalhado" action={(
      <Link to={`/admin/dashboard${urlQuery ? `?${urlQuery}` : ''}`} className="inline-flex min-h-11 items-center rounded-lg border border-black/20 px-5 text-sm font-bold uppercase hover:bg-black/5">
        Voltar ao resumo
      </Link>
    )} />
  </>;

  const filterPanel = <AdminPanel className="mb-7 p-5 md:p-6">
    <h2 className="text-sm font-black uppercase tracking-wide">Filtros da análise</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-1 text-sm font-semibold">Período e agrupamento
        <select aria-label="Período" value={filters.period} onChange={(event) => updateFilters({ period: event.target.value })} className="h-11 min-w-0 rounded-lg border border-black/20 px-3 font-normal">
          <option value="monthly">30 dias móveis · diário</option>
          <option value="annual">365 dias móveis · mensal</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Drop
        <select aria-label="Drop" value={filters.drop} onChange={(event) => updateFilters({ drop: event.target.value })} className="h-11 min-w-0 rounded-lg border border-black/20 px-3 font-normal">
          <option value="">Todos os drops</option>
          {filters.drop && !catalog.drops.some((row) => row.id === filters.drop) && <option value={filters.drop}>Drop selecionado</option>}
          {catalog.drops.map((drop) => <option key={drop.id} value={drop.id}>{drop.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Categoria
        <select aria-label="Categoria" value={filters.category} onChange={(event) => updateFilters({ category: event.target.value })} className="h-11 min-w-0 rounded-lg border border-black/20 px-3 font-normal">
          <option value="">Todas as categorias</option>
          {filters.category && !catalog.categories.some((row) => row.id === filters.category) && <option value={filters.category}>Categoria selecionada</option>}
          {catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
    </div>
    <form key={`${filters.start_date}:${filters.end_date}`} onSubmit={onDateSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="grid min-w-[150px] flex-1 gap-1 text-sm font-semibold">Data inicial
        <input name="start_date" type="date" aria-label="Data inicial" defaultValue={filters.start_date} className="h-11 min-w-0 rounded-lg border border-black/20 px-3 font-normal" />
      </label>
      <label className="grid min-w-[150px] flex-1 gap-1 text-sm font-semibold">Data final
        <input name="end_date" type="date" aria-label="Data final" defaultValue={filters.end_date} className="h-11 min-w-0 rounded-lg border border-black/20 px-3 font-normal" />
      </label>
      <button type="submit" className="h-11 rounded-lg bg-black px-5 text-sm font-semibold text-white hover:bg-black/80">Aplicar datas</button>
      {(filters.start_date || filters.end_date) && <button type="button" onClick={() => updateFilters({ start_date: '', end_date: '' })} className="h-11 rounded-lg border border-black/20 px-4 text-sm font-semibold hover:bg-black/5">Limpar datas</button>}
      {(filters.drop || filters.category || filters.start_date || filters.end_date || filters.period !== 'monthly') && <button type="button" onClick={() => updateFilters({ period: 'monthly', start_date: '', end_date: '', drop: '', category: '' })} className="h-11 rounded-lg border border-black/20 px-4 text-sm font-semibold hover:bg-black/5">Limpar filtros</button>}
    </form>
    {dateError && <p role="alert" className="mt-2 text-sm text-[#b42318]">{dateError}</p>}
    <p className="mt-3 text-xs leading-relaxed text-black/55">Datas personalizadas substituem a janela móvel; o período selecionado define o agrupamento. Drop e categoria devem corresponder ao mesmo item do pedido. Cadastros totais e estoque seguem seus próprios critérios.</p>
    {searchParams.has('search') && <p className="mt-2 text-xs text-black/55">A busca do resumo permanece na URL para a volta. Esta análise usa período, drop e categoria.</p>}
    {catalog.loading && <p role="status" className="mt-2 text-xs text-black/55">Carregando opções de drop e categoria...</p>}
    {catalog.error && <p role="alert" className="mt-2 text-xs text-[#b42318]">{catalog.error} <button type="button" onClick={() => setCatalogAttempt((current) => current + 1)} className="font-semibold underline">Tentar novamente</button></p>}
  </AdminPanel>;

  const data = snapshot.query === requestQuery ? snapshot.data : null;
  const currentError = error?.query === requestQuery ? error.message : '';
  if (loading || (!data && !currentError)) return <div className="mx-auto max-w-[1280px]">{header}{filterPanel}<AdminPanel className="p-6"><p role="status" className="text-center text-black/60">Carregando análise detalhada...</p></AdminPanel></div>;
  if (currentError || !data) return <div className="mx-auto max-w-[1280px]">{header}{filterPanel}<AdminPanel className="p-6"><p role="alert" className="text-[#b42318]">{currentError || 'Não foi possível carregar a análise detalhada.'}</p><button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-4 rounded-lg bg-black px-5 py-2 text-sm font-bold text-white">Tentar novamente</button></AdminPanel></div>;

  const { period, financial, sales_series, product_rankings, item_revenue, orders_by_status, sales_by_payment_method, customers, stock } = data;
  const openProductOrders = (row, metric) => openOrders(metric, `Pedidos de ${row.product_name}`, { product_id: row.product_id });
  const openDropOrders = (row) => openOrders('drop_item_revenue', `Receita de itens · ${row.name}`,
    row.drop_id ? { drop: row.drop_id } : { drop: null, unclassified: 'true' });
  const openCategoryOrders = (row) => openOrders('category_item_revenue', `Receita de itens · ${row.name}`,
    row.category_id ? { category: row.category_id } : { category: null, unclassified: 'true' });
  const openSeriesOrders = (point) => openOrders('net_revenue', `Receita líquida · ${formatDate(point.period)}`, {}, point);

  return <div className="mx-auto max-w-[1280px]">
    {header}
    {filterPanel}
    <p className="mb-7 text-sm text-black/60">
      {formatDate(period.start_date)} a {formatDate(period.end_date)} · Horário de São Paulo · {period.granularity === 'month' ? 'agrupamento mensal' : 'agrupamento diário'}
    </p>

    {financial.valid_sales === 0 && Number(financial.refunds) === 0 && <AdminPanel className="mb-6 p-5 text-sm text-black/60">Nenhuma venda válida ou reembolso neste período. Cadastros e estoque podem continuar exibindo dados.</AdminPanel>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Receita bruta" value={formatMoney(financial.gross_revenue)} icon="$" onClick={() => openOrders('gross_revenue', 'Pedidos da receita bruta')} />
      <MetricCard label="Reembolsos" value={formatMoney(financial.refunds)} icon="$" onClick={() => openOrders('refunds', 'Pedidos reembolsados')} />
      <MetricCard label="Receita líquida" value={formatMoney(financial.net_revenue)} icon="$" onClick={() => openOrders('net_revenue', 'Pedidos da receita líquida')} />
      <MetricCard label="Vendas válidas" value={financial.valid_sales} icon="bag" onClick={() => openOrders('valid_sales', 'Vendas válidas')} />
      <MetricCard label="Ticket médio" value={formatMoney(financial.average_ticket)} icon="$" onClick={() => openOrders('average_ticket', 'Pedidos do ticket médio')} />
    </div>
    <p className="mt-3 text-xs leading-relaxed text-black/55">Financeiro usa a data do pagamento. Vendas válidas: pedidos entregues e pagos. Receita líquida = receita bruta − reembolsos; ticket médio = receita líquida ÷ vendas válidas.</p>

    <div className="mt-8 grid gap-6">
      <Section title="Receita e vendas ao longo do tempo" note="Cada ponto usa a data do pagamento. O período mensal cobre 30 dias móveis; o anual, 365 dias móveis."
        views={listAndBars} defaultView="bars">
        {(view) => view === 'list' ? <SeriesTable points={sales_series} onSelect={openSeriesOrders} /> : <SeriesChart points={sales_series} granularity={period.granularity} onSelect={openSeriesOrders} />}
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Produtos por unidades vendidas" note="Até 10 produtos de vendas válidas, ordenados por quantidade." views={listAndBars}>
          {(view) => view === 'bars' ? <HorizontalBars rows={product_rankings.by_units} getKey={(row) => row.product_id}
            getLabel={(row) => row.product_name} getValue={(row) => row.units} formatValue={(row) => `${row.units} un.`}
            getHref={(row) => `/admin/products/${row.product_id}`} onSelect={(row) => openProductOrders(row, 'product_units')} />
            : <ProductRanking rows={product_rankings.by_units} unit="units" onSelect={(row) => openProductOrders(row, 'product_units')} />}
        </Section>
        <Section title="Produtos por receita de itens" note="Até 10 produtos de vendas válidas, ordenados por quantidade × preço do item." views={listAndBars}>
          {(view) => view === 'bars' ? <HorizontalBars rows={product_rankings.by_revenue} getKey={(row) => row.product_id}
            getLabel={(row) => row.product_name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)}
            getHref={(row) => `/admin/products/${row.product_id}`} onSelect={(row) => openProductOrders(row, 'product_revenue')} />
            : <ProductRanking rows={product_rankings.by_revenue} unit="revenue" onSelect={(row) => openProductOrders(row, 'product_revenue')} />}
        </Section>
      </div>
      {(product_rankings.unclassified.units > 0 || Number(product_rankings.unclassified.revenue) !== 0) && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-black/60">Itens sem vínculo atual com produto: {product_rankings.unclassified.units} un. · {formatMoney(product_rankings.unclassified.revenue)}.
          <DrillButton onClick={() => openOrders('product_units', 'Itens sem vínculo atual com produto', { unclassified: 'true' })} label="Ver pedidos de itens sem produto" />
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Receita de itens por drop" views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={item_revenue.by_drop} getKey={(row) => row.drop_id ?? 'unclassified'}
            getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} onSelect={openDropOrders} />
            : view === 'donut' ? <DonutChart rows={item_revenue.by_drop} getKey={(row) => row.drop_id ?? 'unclassified'}
              getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} totalLabel="receita de itens por drop" onSelect={openDropOrders} />
              : <RevenueDistribution rows={item_revenue.by_drop} idKey="drop_id" onSelect={openDropOrders} />}
        </Section>
        <Section title="Receita de itens por categoria" views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={item_revenue.by_category} getKey={(row) => row.category_id ?? 'unclassified'}
            getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} onSelect={openCategoryOrders} />
            : view === 'donut' ? <DonutChart rows={item_revenue.by_category} getKey={(row) => row.category_id ?? 'unclassified'}
              getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} totalLabel="receita de itens por categoria" onSelect={openCategoryOrders} />
              : <RevenueDistribution rows={item_revenue.by_category} idKey="category_id" onSelect={openCategoryOrders} />}
        </Section>
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-black/55">Receita de itens soma quantidade × preço unitário; frete e desconto não são rateados. Drop e categoria seguem os vínculos atuais do catálogo, que podem mudar após a venda. “Sem classificação” reúne itens sem vínculo atual.</p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Pedidos por status" note="Inclui todos os pedidos criados no período, inclusive pendentes e cancelados. Usa a data de criação do pedido."
          views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={orders_by_status.rows} getKey={(row) => row.status}
            getLabel={(row) => statusLabels[row.status] ?? row.status} getValue={(row) => row.orders} formatValue={(row) => `${row.orders} pedidos`}
            onSelect={(row) => openOrders('status', `Pedidos · ${statusLabels[row.status] ?? row.status}`, { status: row.status })} />
            : view === 'donut' ? <DonutChart rows={orders_by_status.rows} getKey={(row) => row.status}
              getLabel={(row) => statusLabels[row.status] ?? row.status} getValue={(row) => row.orders} formatValue={(row) => `${row.orders} pedidos`} totalLabel="pedidos por status"
              onSelect={(row) => openOrders('status', `Pedidos · ${statusLabels[row.status] ?? row.status}`, { status: row.status })} />
              : <Rows rows={orders_by_status.rows} getKey={(row) => row.status} renderRow={(row) => <><span className="text-sm font-medium">{statusLabels[row.status] ?? row.status}</span><span className="flex items-center gap-2"><strong className="text-sm">{row.orders} pedidos</strong><DrillButton onClick={() => openOrders('status', `Pedidos · ${statusLabels[row.status] ?? row.status}`, { status: row.status })} label={`Ver pedidos ${statusLabels[row.status] ?? row.status}`} /></span></>} />}
        </Section>
        <Section title="Vendas por método de pagamento" note="Somente vendas válidas, pela data do pagamento. Gráficos mostram a quantidade de vendas; a lista inclui receita bruta."
          views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={sales_by_payment_method} getKey={(row) => row.method}
            getLabel={(row) => paymentLabels[row.method] ?? row.method} getValue={(row) => row.valid_sales} formatValue={(row) => `${row.valid_sales} vendas`}
            onSelect={(row) => openOrders('payment_method', `Vendas · ${paymentLabels[row.method] ?? row.method}`, { payment_method: row.method })} />
            : view === 'donut' ? <DonutChart rows={sales_by_payment_method} getKey={(row) => row.method}
              getLabel={(row) => paymentLabels[row.method] ?? row.method} getValue={(row) => row.valid_sales} formatValue={(row) => `${row.valid_sales} vendas`} totalLabel="vendas por método de pagamento"
              onSelect={(row) => openOrders('payment_method', `Vendas · ${paymentLabels[row.method] ?? row.method}`, { payment_method: row.method })} />
              : <Rows rows={sales_by_payment_method} getKey={(row) => row.method} renderRow={(row) => <><span className="text-sm font-medium">{paymentLabels[row.method] ?? row.method}</span><span className="flex items-center gap-2 text-right text-sm"><span><strong>{row.valid_sales} vendas</strong><span className="ml-2 text-black/55">{formatMoney(row.gross_revenue)}</span></span><DrillButton onClick={() => openOrders('payment_method', `Vendas · ${paymentLabels[row.method] ?? row.method}`, { payment_method: row.method })} label={`Ver vendas por ${paymentLabels[row.method] ?? row.method}`} /></span></>} />}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Clientes" note="Total cadastrado é global e não usa filtros. Novos usam a data de cadastro no período. Recorrentes compraram em pelo menos dois drops consecutivos no histórico de vendas filtrado."
          views={[["cards", "Cartões"], ["list", "Lista"]]} defaultView="cards">
          {(view) => <>
            {view === 'cards' ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <MetricCard label="Total cadastrado" value={customers.total_registered} icon="users" />
              <MetricCard label="Novos no período" value={customers.new_in_period} icon="users" />
              <MetricCard label="Recorrentes" value={customers.recurring_customers} icon="users" />
            </div> : <Rows rows={[
              { label: 'Total cadastrado', value: customers.total_registered },
              { label: 'Novos no período', value: customers.new_in_period },
              { label: 'Recorrentes', value: customers.recurring_customers },
            ]} getKey={(row) => row.label} renderRow={(row) => <><span className="text-sm">{row.label}</span><strong className="text-sm">{row.value}</strong></>} />}
          <Link to="/admin/customers" className="mt-5 inline-block text-sm font-semibold underline underline-offset-2">Ver clientes</Link>
          </>}
        </Section>
        <div id="estoque" className="min-w-0 scroll-mt-6">
        <Section title="Estoque atual" note="Saldo de variações no momento da consulta. Baixo: 1 a 9 unidades; esgotado: zero. O período não altera estes totais; drop e categoria usam o vínculo atual do produto.">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Estoque baixo" value={stock.low_count} icon="box" negative={stock.low_count > 0} />
            <MetricCard label="Esgotados" value={stock.out_count} icon="box" negative={stock.out_count > 0} />
          </div>
          <h3 className="mt-6 mb-3 text-sm font-bold uppercase">Variações que exigem atenção</h3>
          <Rows rows={stock.attention} getKey={(row) => row.variation_id} renderRow={(row) => <>
            <Link to={row.admin_path} className="min-w-0 text-sm font-medium underline-offset-2 hover:underline">{row.product_name} · {row.size}{row.color ? ` · ${row.color}` : ''}<span className="block text-xs text-black/50">{row.sku}</span></Link>
            <strong className={`text-sm ${row.stock_quantity === 0 ? 'text-[#b42318]' : ''}`}>{row.stock_quantity} un.</strong>
          </>} />
          {stock.low_count + stock.out_count > stock.attention.length && <p className="mt-4 text-xs text-black/55">Exibindo as primeiras {stock.attention.length} variações com atenção; os totais consideram todas.</p>}
        </Section>
        </div>
      </div>
    </div>
    {selection?.filterKey === requestQuery && <OrderDrilldown key={selection.url} selection={selection} onClose={closeOrders} formatMoney={formatMoney} />}
  </div>;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, PageMarker } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';
import SiteBehaviorSection from './SiteBehaviorSection';
import DashboardViewToggle from '../../../components/ui/DashboardViewToggle';
import OrderDrilldown from '../../../components/dashboard/OrderDrilldown';

const money = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const seriesPeriod = (date, granularity) => {
  const [year, month, day] = date.split('-');
  return granularity === 'month' ? `${month}/${year}` : `${day}/${month}/${year}`;
};

const DashboardPage = () => {
  const [snapshot, setSnapshot] = useState({ query: null, data: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [drillDown, setDrillDown] = useState(null);
  const [seriesView, setSeriesView] = useState('bars');
  const [hoveredPeriod, setHoveredPeriod] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.toString();
  const filters = useMemo(() => {
    const params = new URLSearchParams(urlQuery);
    return { period: params.get('period') === 'annual' ? 'annual' : 'monthly', search: params.get('search') || '' };
  }, [urlQuery]);

  const query = useMemo(() => {
    const params = new URLSearchParams(urlQuery);
    params.set('period', filters.period);
    return params.toString();
  }, [filters.period, urlQuery]);
  const data = snapshot.query === query ? snapshot.data : null;
  const currentError = loadError?.query === query ? loadError.message : '';

  const updateFilter = (key, value) => {
    setDrillDown(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: key === 'search' });
  };

  const openDrillDown = (metric = 'net_revenue', point = null) => {
    const params = new URLSearchParams(query);
    params.set('metric', metric);
    if (point) {
      if (data?.period?.granularity === 'month') {
        const [year, month] = point.period.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        params.set('start_date', point.period < data.period.start_date ? data.period.start_date : point.period);
        params.set('end_date', monthEnd > data.period.end_date ? data.period.end_date : monthEnd);
      } else {
        params.set('start_date', point.period);
        params.set('end_date', point.period);
      }
    }
    const periodLabel = point ? `${params.get('start_date')} a ${params.get('end_date')}` : `${data.period.start_date} a ${data.period.end_date}`;
    setDrillDown({
      title: metric === 'valid_sales' ? 'Vendas válidas' : 'Pedidos da receita líquida',
      metric,
      url: `${import.meta.env.VITE_API_URL}/api/orders/dashboard/orders/?${params}`,
      dateBasis: 'payment.paid_at',
      periodLabel,
      returnFocus: document.activeElement,
    });
  };
  const closeDrillDown = useCallback(() => setDrillDown(null), []);

  useEffect(() => {
    const closeOnBack = () => setDrillDown(null);
    window.addEventListener('popstate', closeOnBack);
    return () => window.removeEventListener('popstate', closeOnBack);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAll = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = getAccessToken();
        if (!token) { navigate('/admin/login'); return; }

        const headers = { Authorization: `Bearer ${token}` };
        const base = import.meta.env.VITE_API_URL;

        const summaryRes = await fetch(`${base}/api/orders/dashboard/summary/?${query}`, { headers, signal: controller.signal });

        if (summaryRes.status === 401 || summaryRes.status === 403) {
          clearAuthTokens();
          navigate('/admin/login', {
            state: {
              error: summaryRes.status === 403
                ? "Acesso negado. Esta conta não possui permissão de administrador."
                : "Sua sessão expirou. Faça login novamente."
            },
            replace: true
          });
          return;
        }

        if (!summaryRes.ok) throw new Error('Não foi possível carregar o resumo.');
        setSnapshot({ query, data: await summaryRes.json() });
      } catch (error) {
        if (error.name !== 'AbortError') setLoadError({ query, message: error.message || 'Não foi possível carregar o resumo.' });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAll();
    return () => controller.abort();
  }, [navigate, query, attempt]);

  const activeParams = new URLSearchParams(urlQuery);
  const header = <>
    <PageMarker name="DashboardPage" />
    <AdminTitle title="Dashboard" action={(
      <Link to={`/admin/dashboard/detail${urlQuery ? `?${urlQuery}` : ''}`} className="inline-flex min-h-11 items-center rounded-lg bg-black px-5 text-sm font-bold uppercase text-white hover:bg-black/80">
        Análise detalhada
      </Link>
    )} />
  </>;
  const filterControls = <>
    <AdminPanel className="mx-auto mb-6 max-w-[920px] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input aria-label="Pesquisar dashboard" placeholder="Buscar por cliente, e-mail, produto, drop ou categoria..."
          value={filters.search} onChange={(event) => updateFilter('search', event.target.value)}
          className="h-11 w-full rounded-lg border border-black/20 px-4 md:max-w-xl" />
        <select aria-label="Período" value={filters.period} onChange={(event) => updateFilter('period', event.target.value)} className="h-11 rounded-lg border border-black/20 px-4">
          <option value="monthly">Mensal</option><option value="annual">Anual</option>
        </select>
      </div>
    </AdminPanel>
    {(activeParams.get('drop') || activeParams.get('category') || activeParams.get('start_date') || activeParams.get('end_date')) && <div className="mx-auto mb-6 flex max-w-[920px] flex-wrap items-center gap-2 text-xs text-black/65">
      <span>Filtros adicionais ativos:</span>
      {activeParams.get('drop') && <button type="button" onClick={() => updateFilter('drop', '')} className="rounded-full border border-black/20 px-3 py-1.5">Drop selecionado ×</button>}
      {activeParams.get('category') && <button type="button" onClick={() => updateFilter('category', '')} className="rounded-full border border-black/20 px-3 py-1.5">Categoria selecionada ×</button>}
      {(activeParams.get('start_date') || activeParams.get('end_date')) && <button type="button" onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('start_date'); next.delete('end_date'); return next; })} className="rounded-full border border-black/20 px-3 py-1.5">{activeParams.get('start_date') || 'Início'} a {activeParams.get('end_date') || 'Fim'} ×</button>}
    </div>}
  </>;

  if (loading || (!data && !currentError)) return <div>{header}{filterControls}<p role="status" className="mt-10 text-center text-lg text-black/60">Carregando dados...</p></div>;
  if (currentError || !data) return <div>{header}{filterControls}<AdminPanel className="mx-auto max-w-[920px] p-6"><p role="alert" className="text-[#b42318]">{currentError || 'Não foi possível carregar o resumo.'}</p><button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Tentar novamente</button></AdminPanel></div>;

  const { sales_summary, customers_summary, recent_orders, low_stock_alerts } = data;
  const chartData = data.series ?? [];
  const highlightedPoint = chartData.find((point) => point.period === hoveredPeriod) ?? chartData.at(-1);

  const metrics = [
    { 
      label: 'Receita total', 
      value: money(sales_summary?.total_revenue),
      icon: '$',
      onClick: () => openDrillDown('net_revenue'),
    },
    { 
      label: `Pedidos (${sales_summary?.period_days ?? 30}d)`,
      value: sales_summary?.total_orders || 0, 
      icon: 'bag',
      onClick: () => openDrillDown('valid_sales'),
    },
    { 
      label: 'Clientes cadastrados',
      value: customers_summary?.total_registered || 0, 
      change: `+${customers_summary?.new_in_period || 0} no período`, 
      icon: 'users',
      negative: false,
      onClick: () => navigate('/admin/customers'),
    },
    {
      label: 'Clientes recorrentes',
      value: customers_summary?.recurring_customers || 0,
      icon: 'users',
      onClick: () => navigate('/admin/customers'),
    },
    { 
      label: 'Alertas exibidos (até 50)',
      value: low_stock_alerts?.length || 0, 
      icon: 'box', 
      negative: (low_stock_alerts?.length || 0) > 0,
      onClick: () => navigate(`/admin/dashboard/detail${urlQuery ? `?${urlQuery}` : ''}#estoque`),
    },
  ];

  return (
    <div>
      {header}
      {filterControls}

      <div className="mx-auto grid max-w-[920px] gap-4 md:grid-cols-2 md:gap-10">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {low_stock_alerts && low_stock_alerts.length > 0 && (
        <AdminPanel className="mx-auto mt-6 max-w-[920px] border border-[#ff3333]/20 p-5 md:mt-14 md:p-8">
          <h2 className="text-[16px] font-bold uppercase text-[#ff3333] md:text-[20px]">Alertas de Estoque Baixo</h2>
          <div className="mt-4 space-y-3">
            {low_stock_alerts.map((alert) => (
              <div key={alert.id} className="flex justify-between border-b border-black/10 pb-2 text-[14px] last:border-0 last:pb-0 md:text-base">
                <span className="text-black/80">{alert.product_name} — {alert.size}</span>
                <span className="font-bold text-[#ff3333]">{alert.stock_quantity} un.</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      <AdminPanel className="mx-auto mt-6 max-w-[920px] p-5 md:mt-20 md:p-8">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 basis-[180px] text-[14px] font-bold uppercase tracking-widest text-black md:text-[20px]">
            Visão Geral de Vendas — {sales_summary?.period_days ?? 30} dias
          </h2>
          <DashboardViewToggle label="Visualização de vendas" views={[["bars", "Barras"], ["list", "Lista"]]} value={seriesView} onChange={setSeriesView} />
        </div>
        {chartData.length === 0 || chartData.every((d) => Number(d.total_revenue) === 0 && d.total_orders === 0) ? (
          <p className="mt-6 text-[14px] text-black/40">Nenhuma venda no período.</p>
        ) : seriesView === 'list' ? (
          <div className="mt-5 max-h-[420px] overflow-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase text-black/55"><tr><th className="py-2">Período</th><th className="py-2 text-right">Vendas</th><th className="py-2 text-right">Receita líquida</th><th className="py-2 text-right">Detalhamento</th></tr></thead>
              <tbody className="divide-y divide-black/10">
                {chartData.map((point) => <tr key={point.period}>
                  <td className="py-2">{new Date(`${point.period}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 text-right">{point.total_orders}</td>
                  <td className="py-2 text-right font-semibold">{money(point.total_revenue)}</td>
                  <td className="py-2 text-right"><button type="button" onClick={() => openDrillDown('net_revenue', point)} className="font-semibold underline underline-offset-2">Ver pedidos</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <div role="group" aria-label="Período em destaque" className="mt-5 flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-black/[0.04] px-4 py-3 text-sm">
              <span className="font-semibold tabular-nums">{seriesPeriod(highlightedPoint.period, data.period.granularity)}</span>
              <span className="font-bold tabular-nums [overflow-wrap:anywhere]">
                {money(highlightedPoint.total_revenue)} · {highlightedPoint.total_orders} {highlightedPoint.total_orders === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${Math.max(640, chartData.length * 56)}px` }}>
                <div className="mt-4 flex h-[180px] items-end gap-2 border-l-[4px] border-black pl-4 md:h-[260px] md:gap-6 md:border-l-[8px] md:pl-9"
                  onMouseLeave={() => setHoveredPeriod(null)}
                  onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHoveredPeriod(null); }}>
                  {(() => {
                    const max = Math.max(...chartData.map((d) => Math.abs(Number(d.total_revenue))), 1);
                    return chartData.map((d) => (
                      <button type="button" key={d.period} onClick={() => openDrillDown('net_revenue', d)}
                        onMouseEnter={() => setHoveredPeriod(d.period)} onFocus={() => setHoveredPeriod(d.period)}
                        aria-label={`Ver pedidos de ${seriesPeriod(d.period, data.period.granularity)}: ${money(d.total_revenue)}, ${d.total_orders} ${d.total_orders === 1 ? 'pedido' : 'pedidos'}`}
                        className="flex h-full w-full flex-col items-center justify-end gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        <div className="w-full rounded-t-[4px] bg-[#1f1f1f] transition-all"
                          style={{ height: `${(Math.abs(Number(d.total_revenue)) / max) * 100}%`, minHeight: Number(d.total_revenue) !== 0 ? '4px' : '0' }} />
                      </button>
                    ));
                  })()}
                </div>
                <div className="mt-2 flex gap-2 pl-8 md:gap-6 md:pl-[52px]">
                  {chartData.map((d) => (
                    <p key={d.period} className="w-full text-center text-[10px] capitalize text-black/40 md:text-[12px]">
                      {new Date(`${d.period}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminPanel>

      {drillDown && <OrderDrilldown key={drillDown.url} selection={drillDown} onClose={closeDrillDown} formatMoney={money} />}

      <AdminPanel className="mx-auto mt-6 max-w-[920px] p-5 md:mt-14 md:p-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-black md:text-[20px]">
          Últimos Pedidos
        </h2>
        {recent_orders && recent_orders.length > 0 ? (
          <div className="mt-4 divide-y divide-black/10 md:mt-8">
            {recent_orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <Link to={`/admin/orders/${order.id}`} className="text-[14px] font-bold text-black underline-offset-2 hover:underline md:text-[20px]">
                    SH-{String(order.id).split('-')[0].toUpperCase()}
                  </Link>
                  <p className="text-[12px] text-black/55 md:text-[16px]">
                    {order.customer_name || 'Cliente Anônimo'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-black md:text-[20px]">
                    R$ {parseFloat(order.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[12px] text-black/55 md:text-[16px]">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[14px] text-black/60">Nenhum pedido recente encontrado.</p>
        )}
      </AdminPanel>

      <SiteBehaviorSection />
    </div>
  );
};

export default DashboardPage;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, PageMarker } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';

const money = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ period: 'monthly', search: '' });
  const [drillDown, setDrillDown] = useState(null);
  const navigate = useNavigate();

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params.toString();
  }, [filters]);

  const loadDrillDown = useCallback(async (url) => {
    const token = getAccessToken();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setDrillDown(await response.json());
  }, []);

  const openDrillDown = useCallback(async (point = null) => {
    const params = new URLSearchParams(query);
    if (point) {
      params.set('start_date', point.period);
      if (data?.period?.granularity === 'month') {
        const [year, month] = point.period.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        params.set('end_date', `${year}-${String(month).padStart(2, '0')}-${lastDay}`);
      } else {
        params.set('end_date', point.period);
      }
    }
    await loadDrillDown(`${import.meta.env.VITE_API_URL}/api/orders/dashboard/orders/?${params}`);
  }, [data?.period?.granularity, loadDrillDown, query]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = getAccessToken();
        if (!token) { navigate('/admin/login'); return; }

        const headers = { Authorization: `Bearer ${token}` };
        const base = import.meta.env.VITE_API_URL;

        const summaryRes = await fetch(`${base}/api/orders/dashboard/summary/?${query}`, { headers });

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

        if (summaryRes.ok) setData(await summaryRes.json());
      } catch (error) {
        console.error('Erro de conexão ao buscar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [navigate, query]);

  if (loading) {
    return (
      <div>
        <PageMarker name="DashboardPage" />
        <AdminTitle title="Dashboard" />
        <p className="mt-10 text-center text-lg text-black/60">Carregando dados...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageMarker name="DashboardPage" />
        <AdminTitle title="Dashboard" />
        <p className="mt-10 text-center text-lg text-[#ff3333]">Erro ao carregar o dashboard.</p>
      </div>
    );
  }

  const { sales_summary, customers_summary, recent_orders, low_stock_alerts } = data;
  const chartData = data.series ?? [];

  const metrics = [
    { 
      label: 'Receita total', 
      value: money(sales_summary?.total_revenue),
      icon: '$',
      onClick: () => openDrillDown(),
    },
    { 
      label: `Pedidos (${sales_summary?.period_days ?? 30}d)`,
      value: sales_summary?.total_orders || 0, 
      icon: 'bag',
      onClick: () => openDrillDown(),
    },
    { 
      label: 'Clientes cadastrados',
      value: customers_summary?.total_registered || 0, 
      change: `+${customers_summary?.new_in_period || 0} no período`, 
      icon: 'users',
      negative: false,
      onClick: () => openDrillDown(),
    },
    {
      label: 'Clientes recorrentes',
      value: customers_summary?.recurring_customers || 0,
      icon: 'users',
      onClick: () => openDrillDown(),
    },
    { 
      label: 'Produtos em baixa', 
      value: low_stock_alerts?.length || 0, 
      icon: 'box', 
      negative: (low_stock_alerts?.length || 0) > 0,
      onClick: () => openDrillDown(),
    },
  ];

  return (
    <div>
      <PageMarker name="DashboardPage" />
      <AdminTitle title="Dashboard" />

      <AdminPanel className="mx-auto mb-6 max-w-[920px] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            aria-label="Pesquisar dashboard"
            placeholder="Buscar por cliente, e-mail, produto, drop ou categoria..."
            value={filters.search}
            onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))}
            className="h-11 w-full rounded-lg border border-black/20 px-4 md:max-w-xl"
          />
          <select aria-label="Período" value={filters.period} onChange={(e) => setFilters((old) => ({ ...old, period: e.target.value }))} className="h-11 rounded-lg border border-black/20 px-4">
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </select>
        </div>
      </AdminPanel>

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

      {/* Chart */}
      <AdminPanel className="mx-auto mt-6 max-w-[920px] p-5 md:mt-20 md:p-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-black md:text-[20px]">
          Visão Geral de Vendas — {sales_summary?.period_days ?? 30} dias
        </h2>
        {chartData.length === 0 || chartData.every((d) => Number(d.total_revenue) === 0) ? (
          <p className="mt-6 text-[14px] text-black/40">Nenhuma venda no período.</p>
        ) : (
          <>
            <div className="mt-4 flex h-[180px] items-end gap-2 border-l-[4px] border-black pl-4 md:h-[260px] md:gap-6 md:border-l-[8px] md:pl-9">
              {(() => {
                const max = Math.max(...chartData.map((d) => Math.abs(Number(d.total_revenue))), 1);
                return chartData.map((d) => (
                  <button type="button" onClick={() => openDrillDown(d)} key={d.period} className="group relative flex h-full w-full flex-col items-center justify-end gap-1">
                    <span className="absolute bottom-full mb-1 hidden rounded bg-black px-2 py-0.5 text-[11px] text-white group-hover:block">
                      {money(d.total_revenue)} · {d.total_orders} pedido(s)
                    </span>
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
          </>
        )}
      </AdminPanel>

      {drillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setDrillDown(null)}>
          <AdminPanel className="max-h-[80vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase">Pedidos da métrica</h2>
              <button type="button" onClick={() => setDrillDown(null)}>Fechar</button>
            </div>
            <div className="mt-4 divide-y divide-black/10">
              {(drillDown.results ?? []).map((order) => (
                <div key={order.id} className="flex justify-between py-3">
                  <span>#{String(order.id).slice(0, 8).toUpperCase()} · {order.customer_name}</span>
                  <span>{money(order.revenue_value)} · {order.payment_status}</span>
                </div>
              ))}
              {(drillDown.results ?? []).length === 0 && <p className="py-4 text-black/50">Nenhum pedido compõe esta métrica.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
              <span className="text-sm text-black/50">{drillDown.count ?? 0} pedido(s)</span>
              <div className="flex gap-2">
                <button type="button" disabled={!drillDown.previous} onClick={() => loadDrillDown(drillDown.previous)} className="rounded border border-black/20 px-3 py-1 disabled:opacity-30">Anterior</button>
                <button type="button" disabled={!drillDown.next} onClick={() => loadDrillDown(drillDown.next)} className="rounded border border-black/20 px-3 py-1 disabled:opacity-30">Próxima</button>
              </div>
            </div>
          </AdminPanel>
        </div>
      )}

      <AdminPanel className="mx-auto mt-6 max-w-[920px] p-5 md:mt-14 md:p-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-black md:text-[20px]">
          Últimos Pedidos
        </h2>
        {recent_orders && recent_orders.length > 0 ? (
          <div className="mt-4 divide-y divide-black/10 md:mt-8">
            {recent_orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[14px] font-bold text-black md:text-[20px]">
                    SH-{String(order.id).split('-')[0].toUpperCase()}
                  </p>
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
    </div>
  );
};

export default DashboardPage;

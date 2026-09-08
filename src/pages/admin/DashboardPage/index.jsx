import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, PageMarker } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';


function buildChartData(orders) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      key: d.toISOString().slice(0, 10),
      total: 0,
    });
  }
  for (const order of orders) {
    const day = order.created_at?.slice(0, 10);
    const slot = days.find((d) => d.key === day);
    if (slot) slot.total += parseFloat(order.total_amount || 0);
  }
  return days;
}

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = getAccessToken();
        if (!token) { navigate('/admin/login'); return; }

        const headers = { Authorization: `Bearer ${token}` };
        const base = import.meta.env.VITE_API_URL;

        const [summaryRes, ordersRes] = await Promise.all([
          fetch(`${base}/api/orders/dashboard/summary/`, { headers }),
          fetch(`${base}/api/orders/admin/`, { headers }),
        ]);

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
        if (ordersRes.ok) setChartData(buildChartData(await ordersRes.json()));
      } catch (error) {
        console.error('Erro de conexão ao buscar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

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

  const metrics = [
    { 
      label: 'Receita total', 
      value: `R$ ${parseFloat(sales_summary?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: '$' 
    },
    { 
      label: 'Pedidos (30d)', 
      value: sales_summary?.total_orders || 0, 
      icon: 'bag' 
    },
    { 
      label: 'Clientes ativos', 
      value: customers_summary?.total_registered || 0, 
      change: `+${customers_summary?.new_in_period || 0} no período`, 
      icon: 'users',
      negative: false
    },
    { 
      label: 'Produtos em baixa', 
      value: low_stock_alerts?.length || 0, 
      icon: 'box', 
      negative: (low_stock_alerts?.length || 0) > 0 
    },
  ];

  return (
    <div>
      <PageMarker name="DashboardPage" />
      <AdminTitle title="Dashboard" />

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
                <span className="text-black/80">{alert.product_name} — {alert.variation_size}</span>
                <span className="font-bold text-[#ff3333]">{alert.stock_quantity} un.</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {/* Chart */}
      <AdminPanel className="mx-auto mt-6 max-w-[920px] p-5 md:mt-20 md:p-8">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-black md:text-[20px]">
          Visão Geral de Vendas — últimos 7 dias
        </h2>
        {chartData.length === 0 || chartData.every((d) => d.total === 0) ? (
          <p className="mt-6 text-[14px] text-black/40">Nenhuma venda no período.</p>
        ) : (
          <>
            <div className="mt-4 flex h-[180px] items-end gap-2 border-l-[4px] border-black pl-4 md:h-[260px] md:gap-6 md:border-l-[8px] md:pl-9">
              {(() => {
                const max = Math.max(...chartData.map((d) => d.total), 1);
                return chartData.map((d) => (
                  <div key={d.key} className="group relative flex w-full flex-col items-center justify-end gap-1">
                    <span className="absolute bottom-full mb-1 hidden rounded bg-black px-2 py-0.5 text-[11px] text-white group-hover:block">
                      R$ {d.total.toFixed(2)}
                    </span>
                    <div className="w-full rounded-t-[4px] bg-[#1f1f1f] transition-all"
                      style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? '4px' : '0' }} />
                  </div>
                ));
              })()}
            </div>
            <div className="mt-2 flex gap-2 pl-8 md:gap-6 md:pl-[52px]">
              {chartData.map((d) => (
                <p key={d.key} className="w-full text-center text-[10px] capitalize text-black/40 md:text-[12px]">
                  {d.label}
                </p>
              ))}
            </div>
          </>
        )}
      </AdminPanel>

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

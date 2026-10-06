import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, PageMarker } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';
import DashboardViewToggle from '../../../components/ui/DashboardViewToggle';
import { DonutChart, HorizontalBars } from './Visualizations';

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

function SeriesChart({ points, granularity }) {
  const active = points?.some((point) => Number(point.net_revenue) !== 0 || point.valid_sales > 0);
  if (!active) return <Empty>Nenhuma venda ou receita líquida no período.</Empty>;
  const max = Math.max(1, ...points.map((point) => Math.abs(Number(point.net_revenue))));

  return (
    <div className="overflow-x-auto pb-2" role="img" aria-label="Série de receita líquida e vendas válidas por período">
      <div className="flex min-w-max items-end gap-2 border-b border-black/20 px-2 pt-5 md:gap-3">
        {points.map((point) => {
          const value = Number(point.net_revenue);
          const label = granularity === 'month' ? point.period.slice(0, 7) : point.period.slice(5);
          return (
            <div key={point.period} className="flex w-11 flex-col items-center gap-2 md:w-14" title={`${formatDate(point.period)}: ${formatMoney(point.net_revenue)}, ${point.valid_sales} venda(s)`}>
              <span className="text-[11px] font-semibold text-black/70">{point.valid_sales}</span>
              <div className="flex h-36 w-full items-end justify-center">
                <div className={`w-7 rounded-t ${value < 0 ? 'bg-[#ff3333]' : 'bg-black'}`}
                  style={{ height: `${Math.max(value === 0 ? 0 : 4, Math.abs(value) / max * 100)}%` }} />
              </div>
              <span className="whitespace-nowrap text-[10px] text-black/55">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-black/55">Altura: receita líquida · número acima: vendas válidas · vermelho: receita líquida negativa.</p>
    </div>
  );
}

function SeriesTable({ points }) {
  if (!points?.length) return <Empty />;
  return <div className="max-h-[420px] overflow-auto">
    <table className="w-full min-w-[560px] text-left text-sm">
      <thead className="sticky top-0 bg-white text-xs uppercase text-black/55">
        <tr><th className="py-2 pr-4">Período</th><th className="py-2 pr-4 text-right">Vendas</th><th className="py-2 pr-4 text-right">Bruto</th><th className="py-2 pr-4 text-right">Reembolsos</th><th className="py-2 text-right">Líquido</th></tr>
      </thead>
      <tbody className="divide-y divide-black/10">
        {points.map((point) => <tr key={point.period}>
          <td className="py-2 pr-4">{formatDate(point.period)}</td>
          <td className="py-2 pr-4 text-right">{point.valid_sales}</td>
          <td className="py-2 pr-4 text-right">{formatMoney(point.gross_revenue)}</td>
          <td className="py-2 pr-4 text-right">{formatMoney(point.refunds)}</td>
          <td className="py-2 text-right font-semibold">{formatMoney(point.net_revenue)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function ProductRanking({ rows, unit }) {
  return <Rows rows={rows} getKey={(row) => row.product_id} renderRow={(row, index) => <>
    <div className="min-w-0 text-sm [overflow-wrap:anywhere]">
      <span className="mr-2 font-bold text-black/45">{index + 1}.</span>
      <Link to={`/admin/products/${row.product_id}`} className="font-semibold underline-offset-2 hover:underline">{row.product_name}</Link>
    </div>
    <span className="text-sm font-bold">{unit === 'units' ? `${row.units} un.` : formatMoney(row.revenue)}</span>
  </>} />;
}

function RevenueDistribution({ rows, idKey }) {
  return <Rows rows={rows} getKey={(row) => row[idKey] ?? 'unclassified'} renderRow={(row) => <>
    <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{row.name}</span>
    <span className="min-w-0 text-right text-sm [overflow-wrap:anywhere]"><strong>{formatMoney(row.revenue)}</strong><span className="ml-2 text-black/50">{row.units} un.</span></span>
  </>} />;
}

export default function DetailedDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const token = getAccessToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      return () => controller.abort();
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/dashboard/detail/`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          clearAuthTokens();
          navigate('/admin/login', { replace: true, state: { error: 'Sua sessão expirou ou não possui permissão de administrador.' } });
          return;
        }
        if (!response.ok) throw new Error('Não foi possível carregar a análise detalhada.');
        setData(await response.json());
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Não foi possível carregar a análise detalhada.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [navigate, attempt]);

  const header = <>
    <PageMarker name="DetailedDashboardPage" />
    <AdminTitle eyebrow="Análise comercial e operacional" title="Dashboard detalhado" action={(
      <Link to="/admin/dashboard" className="inline-flex min-h-11 items-center rounded-lg border border-black/20 px-5 text-sm font-bold uppercase hover:bg-black/5">
        Voltar ao resumo
      </Link>
    )} />
  </>;

  if (loading) return <div>{header}<p role="status" className="py-12 text-center text-black/60">Carregando análise detalhada...</p></div>;
  if (error || !data) return <div>{header}<AdminPanel className="p-6"><p role="alert" className="text-[#b42318]">{error || 'Não foi possível carregar a análise detalhada.'}</p><button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-4 rounded-lg bg-black px-5 py-2 text-sm font-bold text-white">Tentar novamente</button></AdminPanel></div>;

  const { period, financial, sales_series, product_rankings, item_revenue, orders_by_status, sales_by_payment_method, customers, stock } = data;

  return <div className="mx-auto max-w-[1280px]">
    {header}
    <p className="mb-7 text-sm text-black/60">
      {formatDate(period.start_date)} a {formatDate(period.end_date)} · Horário de São Paulo · {period.granularity === 'month' ? 'agrupamento mensal' : 'agrupamento diário'}
    </p>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Receita bruta" value={formatMoney(financial.gross_revenue)} icon="$" />
      <MetricCard label="Reembolsos" value={formatMoney(financial.refunds)} icon="$" />
      <MetricCard label="Receita líquida" value={formatMoney(financial.net_revenue)} icon="$" />
      <MetricCard label="Vendas válidas" value={financial.valid_sales} icon="bag" />
      <MetricCard label="Ticket médio" value={formatMoney(financial.average_ticket)} icon="$" />
    </div>
    <p className="mt-3 text-xs leading-relaxed text-black/55">Vendas válidas: pedidos entregues e pagos. Receita líquida = receita bruta − reembolsos; ticket médio = receita líquida ÷ vendas válidas.</p>

    <div className="mt-8 grid gap-6">
      <Section title="Receita e vendas ao longo do tempo" note="Cada ponto usa a data do pagamento. O período mensal cobre 30 dias móveis; o anual, 365 dias móveis."
        views={listAndBars} defaultView="bars">
        {(view) => view === 'list' ? <SeriesTable points={sales_series} /> : <SeriesChart points={sales_series} granularity={period.granularity} />}
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Produtos por unidades vendidas" note="Até 10 produtos de vendas válidas, ordenados por quantidade." views={listAndBars}>
          {(view) => view === 'bars' ? <HorizontalBars rows={product_rankings.by_units} getKey={(row) => row.product_id}
            getLabel={(row) => row.product_name} getValue={(row) => row.units} formatValue={(row) => `${row.units} un.`}
            getHref={(row) => `/admin/products/${row.product_id}`} /> : <ProductRanking rows={product_rankings.by_units} unit="units" />}
        </Section>
        <Section title="Produtos por receita de itens" note="Até 10 produtos de vendas válidas, ordenados por quantidade × preço do item." views={listAndBars}>
          {(view) => view === 'bars' ? <HorizontalBars rows={product_rankings.by_revenue} getKey={(row) => row.product_id}
            getLabel={(row) => row.product_name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)}
            getHref={(row) => `/admin/products/${row.product_id}`} /> : <ProductRanking rows={product_rankings.by_revenue} unit="revenue" />}
        </Section>
      </div>
      {(product_rankings.unclassified.units > 0 || Number(product_rankings.unclassified.revenue) !== 0) && (
        <p className="text-sm text-black/60">Itens sem vínculo atual com produto: {product_rankings.unclassified.units} un. · {formatMoney(product_rankings.unclassified.revenue)}.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Receita de itens por drop" views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={item_revenue.by_drop} getKey={(row) => row.drop_id ?? 'unclassified'}
            getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} />
            : view === 'donut' ? <DonutChart rows={item_revenue.by_drop} getKey={(row) => row.drop_id ?? 'unclassified'}
              getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} totalLabel="receita de itens por drop" />
              : <RevenueDistribution rows={item_revenue.by_drop} idKey="drop_id" />}
        </Section>
        <Section title="Receita de itens por categoria" views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={item_revenue.by_category} getKey={(row) => row.category_id ?? 'unclassified'}
            getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} />
            : view === 'donut' ? <DonutChart rows={item_revenue.by_category} getKey={(row) => row.category_id ?? 'unclassified'}
              getLabel={(row) => row.name} getValue={(row) => row.revenue} formatValue={(row) => formatMoney(row.revenue)} totalLabel="receita de itens por categoria" />
              : <RevenueDistribution rows={item_revenue.by_category} idKey="category_id" />}
        </Section>
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-black/55">Receita de itens soma quantidade × preço unitário; frete e desconto não são rateados. Drop e categoria seguem os vínculos atuais do catálogo, que podem mudar após a venda. “Sem classificação” reúne itens sem vínculo atual.</p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Pedidos por status" note="Inclui todos os pedidos criados no período, inclusive pendentes e cancelados. Usa a data de criação do pedido."
          views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={orders_by_status.rows} getKey={(row) => row.status}
            getLabel={(row) => statusLabels[row.status] ?? row.status} getValue={(row) => row.orders} formatValue={(row) => `${row.orders} pedidos`} />
            : view === 'donut' ? <DonutChart rows={orders_by_status.rows} getKey={(row) => row.status}
              getLabel={(row) => statusLabels[row.status] ?? row.status} getValue={(row) => row.orders} formatValue={(row) => `${row.orders} pedidos`} totalLabel="pedidos por status" />
              : <Rows rows={orders_by_status.rows} getKey={(row) => row.status} renderRow={(row) => <><span className="text-sm font-medium">{statusLabels[row.status] ?? row.status}</span><strong className="text-sm">{row.orders} pedidos</strong></>} />}
        </Section>
        <Section title="Vendas por método de pagamento" note="Somente vendas válidas, pela data do pagamento. Gráficos mostram a quantidade de vendas; a lista inclui receita bruta."
          views={listBarsAndDonut} defaultView="bars">
          {(view) => view === 'bars' ? <HorizontalBars rows={sales_by_payment_method} getKey={(row) => row.method}
            getLabel={(row) => paymentLabels[row.method] ?? row.method} getValue={(row) => row.valid_sales} formatValue={(row) => `${row.valid_sales} vendas`} />
            : view === 'donut' ? <DonutChart rows={sales_by_payment_method} getKey={(row) => row.method}
              getLabel={(row) => paymentLabels[row.method] ?? row.method} getValue={(row) => row.valid_sales} formatValue={(row) => `${row.valid_sales} vendas`} totalLabel="vendas por método de pagamento" />
              : <Rows rows={sales_by_payment_method} getKey={(row) => row.method} renderRow={(row) => <><span className="text-sm font-medium">{paymentLabels[row.method] ?? row.method}</span><span className="text-right text-sm"><strong>{row.valid_sales} vendas</strong><span className="ml-2 text-black/55">{formatMoney(row.gross_revenue)}</span></span></>} />}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Clientes" note="Cadastros consideram clientes não administrativos. Recorrentes compraram em pelo menos dois drops consecutivos."
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
        <Section title="Estoque atual" note="Saldo de variações no momento da consulta. Baixo: 1 a 9 unidades; esgotado: zero. O período não altera estes totais.">
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
  </div>;
}

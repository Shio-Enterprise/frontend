import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminPanel } from '../../../components/ui/ShioDesign';
import MetricCard from '../../../components/ui/MetricCard';
import { getAccessToken } from '../../../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PERIOD_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
];

const EVENT_LABELS = {
  PAGE_VIEW: 'Página visualizada',
  PRODUCT_VIEW: 'Produto visualizado',
  ADD_TO_CART: 'Adicionado ao carrinho',
  REMOVE_FROM_CART: 'Removido do carrinho',
  CHECKOUT_STARTED: 'Início do checkout',
  PURCHASE: 'Pedido criado',
};

const fetchJson = async (path) => {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada.');

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
};

// As datas da série chegam como AAAA-MM-DD (dia) ou AAAA-MM-01 (mês); o rótulo é montado sem fuso.
const formatSeriesLabel = (date, groupBy) => {
  const [year, month, day] = date.split('-');
  return groupBy === 'month' ? `${month}/${year}` : `${day}/${month}`;
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const SiteBehaviorSection = () => {
  // O atalho "Ver comportamento" da página de clientes chega com ?usuario=<id>.
  const [searchParams] = useSearchParams();
  const initialUserId = /^\d+$/.test(searchParams.get('usuario') ?? '') ? searchParams.get('usuario') : null;

  const [period, setPeriod] = useState('mensal');
  const [overview, setOverview] = useState({ period: null, data: null, error: false });
  const [userQuery, setUserQuery] = useState(initialUserId ?? '');
  const [lookupError, setLookupError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [timeline, setTimeline] = useState({ key: null, events: [], count: 0, error: null });

  useEffect(() => {
    let active = true;
    fetchJson(`/api/analytics/overview/?period=${period}`)
      .then((data) => {
        if (active) setOverview({ period, data, error: false });
      })
      .catch(() => {
        if (active) setOverview({ period, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [period]);

  useEffect(() => {
    if (!selectedUserId) return undefined;
    const key = `${selectedUserId}-${period}`;
    let active = true;
    fetchJson(`/api/analytics/users/${selectedUserId}/events/?period=${period}`)
      .then((data) => {
        if (active) setTimeline({ key, events: data.results, count: data.count, error: null });
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error.status === 404
            ? 'Usuário não encontrado.'
            : 'Não foi possível carregar a linha do tempo.';
        setTimeline({ key, events: [], count: 0, error: message });
      });
    return () => {
      active = false;
    };
  }, [selectedUserId, period]);

  const handleLookup = async (event) => {
    event.preventDefault();
    const term = userQuery.trim();
    setLookupError('');
    setCandidates([]);

    // ID numérico abre a linha do tempo direto; qualquer outro texto é buscado por nome ou e-mail.
    if (/^\d+$/.test(term)) {
      setSelectedUserId(term);
      return;
    }
    if (term.length < 2) {
      setLookupError('Informe o ID do usuário, ou pelo menos 2 letras do nome ou e-mail.');
      return;
    }

    setSearching(true);
    try {
      const users = await fetchJson(`/api/analytics/users/search/?q=${encodeURIComponent(term)}`);
      if (users.length === 0) setLookupError('Nenhum usuário encontrado.');
      setCandidates(users);
    } catch {
      setLookupError('Não foi possível buscar usuários.');
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user) => {
    setUserQuery(user.email);
    setCandidates([]);
    setSelectedUserId(String(user.id));
  };

  const overviewLoading = overview.period !== period;
  const timelineKey = selectedUserId ? `${selectedUserId}-${period}` : null;
  const timelineLoading = Boolean(timelineKey) && timeline.key !== timelineKey;

  const renderOverview = () => {
    if (overviewLoading) {
      return <p className="mt-6 text-[14px] text-black/60">Carregando métricas...</p>;
    }
    if (overview.error || !overview.data) {
      return <p className="mt-6 text-[14px] text-[#ff3333]">Não foi possível carregar as métricas.</p>;
    }

    const {
      visitors = { registered: 0, anonymous: 0 },
      events_by_type: byType = {},
      series = [],
      top_products: topProducts = [],
      group_by: groupBy = 'day',
    } = overview.data;
    const max = Math.max(...series.map((point) => point.total), 1);
    const hasEvents = series.some((point) => point.total > 0);

    return (
      <>
        <div className="mx-auto mt-6 grid gap-4 md:grid-cols-2 md:gap-6">
          <MetricCard label="Visitantes cadastrados" value={visitors.registered} icon="users" />
          <MetricCard label="Visitantes anônimos" value={visitors.anonymous} icon="users" />
          <MetricCard label="Páginas visualizadas" value={byType.PAGE_VIEW} icon="box" />
          <MetricCard label="Adições ao carrinho" value={byType.ADD_TO_CART} icon="bag" />
          <MetricCard label="Início de checkout" value={byType.CHECKOUT_STARTED} icon="bag" />
          <MetricCard label="Pedidos criados" value={byType.PURCHASE} icon="bag" />
        </div>

        <div className="mt-8">
          <h3 className="text-[12px] font-bold uppercase tracking-widest text-black/60">
            Eventos por dia no período
          </h3>
          {hasEvents ? (
            <>
              <div className="mt-4 flex h-[160px] items-end gap-1 border-l-[4px] border-black pl-3 md:h-[220px] md:gap-2 md:pl-6">
                {series.map((point) => (
                  <div
                    key={point.date}
                    title={`${formatSeriesLabel(point.date, groupBy)}: ${point.total} evento(s)`}
                    className="w-full rounded-t-[4px] bg-[#1f1f1f]"
                    style={{
                      height: `${(point.total / max) * 100}%`,
                      minHeight: point.total > 0 ? '4px' : '0',
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-1 pl-3 md:gap-2 md:pl-6">
                {series.map((point, index) => (
                  <p
                    key={point.date}
                    className="w-full overflow-hidden text-center text-[9px] text-black/40 md:text-[11px]"
                  >
                    {index % (groupBy === 'day' ? 5 : 1) === 0 ? formatSeriesLabel(point.date, groupBy) : ''}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-[14px] text-black/40">Nenhum evento registrado no período.</p>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-[12px] font-bold uppercase tracking-widest text-black/60">
            Produtos mais visualizados
          </h3>
          {topProducts.length > 0 ? (
            <ol className="mt-4 divide-y divide-black/10">
              {topProducts.map((product) => (
                <li key={product.product_id} className="flex justify-between py-2 text-[14px] text-black">
                  <span>{product.name}</span>
                  <span className="font-bold">{product.views} visualização(ões)</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-[14px] text-black/40">Nenhuma visualização de produto no período.</p>
          )}
        </div>
      </>
    );
  };

  const renderTimeline = () => {
    if (!timelineKey) return null;
    if (timelineLoading) {
      return <p className="mt-4 text-[14px] text-black/60">Carregando linha do tempo...</p>;
    }
    if (timeline.error) {
      return <p className="mt-4 text-[14px] text-[#ff3333]">{timeline.error}</p>;
    }
    if (timeline.events.length === 0) {
      return <p className="mt-4 text-[14px] text-black/40">Nenhum evento deste usuário no período.</p>;
    }

    return (
      <>
        <p className="mt-4 text-[12px] text-black/50">
          Mostrando {timeline.events.length} de {timeline.count} evento(s), do mais recente ao mais antigo.
        </p>
        <ol className="mt-3 divide-y divide-black/10">
          {timeline.events.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-3 text-[14px] md:flex-row md:justify-between">
              <span className="font-semibold text-black">{EVENT_LABELS[item.event_type] ?? item.event_type}</span>
              <span className="text-black/60">
                {item.product_name ? `${item.product_name} · ` : ''}
                {item.path || '—'}
              </span>
              <span className="text-black/50">{formatDateTime(item.occurred_at)}</span>
            </li>
          ))}
        </ol>
      </>
    );
  };

  return (
    <AdminPanel className="mx-auto mt-6 max-w-[920px] p-5 md:mt-14 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[14px] font-bold uppercase tracking-widest text-black md:text-[20px]">
          Comportamento no site
        </h2>
        <div role="group" aria-label="Período" className="flex gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              aria-pressed={period === option.value}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold ${
                period === option.value
                  ? 'border-black bg-black text-white'
                  : 'border-black/20 text-black hover:border-black/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {renderOverview()}

      <div className="mt-10 border-t border-black/10 pt-8">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-black/60">
          Linha do tempo de um usuário
        </h3>
        <form onSubmit={handleLookup} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="Nome, e-mail ou ID"
            aria-label="Buscar usuário"
            className="w-full rounded-full border border-black/20 px-4 py-2 text-[14px] text-black sm:max-w-[320px]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-full bg-black px-5 py-2 text-[14px] font-semibold text-white hover:bg-black/80 disabled:opacity-50"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        {lookupError && <p className="mt-2 text-[13px] text-[#ff3333]">{lookupError}</p>}
        {candidates.length > 0 && (
          <ul className="mt-3 divide-y divide-black/10 rounded-[12px] border border-black/10">
            {candidates.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => selectUser(user)}
                  className="flex w-full flex-col px-4 py-2 text-left text-[14px] hover:bg-black/5 sm:flex-row sm:justify-between"
                >
                  <span className="font-semibold text-black">{user.name || 'Sem nome'}</span>
                  <span className="text-black/60">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {renderTimeline()}
      </div>
    </AdminPanel>
  );
};

export default SiteBehaviorSection;

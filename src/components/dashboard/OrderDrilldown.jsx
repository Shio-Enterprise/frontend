import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthTokens, getAccessToken } from '../../lib/authToken';
import { AdminPanel } from '../ui/ShioDesign';

export default function OrderDrilldown({ selection, onClose, formatMoney }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [url, setUrl] = useState(selection.url);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    closeRef.current?.focus();
    return () => selection.returnFocus?.focus();
  }, [selection.returnFocus]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      setPage(null);
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          clearAuthTokens();
          navigate('/admin/login', { replace: true, state: { error: 'Sua sessão expirou ou não possui permissão de administrador.' } });
          return;
        }
        if (!response.ok) throw new Error('Não foi possível carregar os pedidos desta métrica.');
        setPage(await response.json());
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Não foi possível carregar os pedidos.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [url, retry, navigate]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled), a[href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const pageNumber = Number(new URL(url, window.location.origin).searchParams.get('page') || 1);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <AdminPanel ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="dashboard-orders-title"
      onKeyDown={handleKeyDown} className="flex max-h-[88vh] w-full max-w-3xl min-w-0 flex-col overflow-hidden p-5 shadow-xl sm:p-7">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/10 pb-4">
        <div className="min-w-0">
          <h2 id="dashboard-orders-title" className="text-lg font-black uppercase [overflow-wrap:anywhere]">{selection.title}</h2>
          <p className="mt-1 text-xs text-black/55">{selection.dateBasis === 'order_created_at' ? 'Data de criação do pedido' : 'Data do pagamento'} · {selection.periodLabel}</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar detalhamento" className="shrink-0 rounded-lg border border-black/20 px-3 py-2 text-sm font-semibold hover:bg-black/5">Fechar</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
        {loading ? <p role="status" className="py-10 text-center text-black/60">Carregando pedidos...</p>
          : error ? <div className="py-8"><p role="alert" className="text-[#b42318]">{error}</p><button type="button" onClick={() => setRetry((current) => current + 1)} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Tentar novamente</button></div>
            : !page?.results?.length ? <p className="py-10 text-center text-black/55">Nenhum pedido compõe esta métrica.</p>
              : <div className="divide-y divide-black/10">{page.results.map((order) => <div key={order.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <Link to={order.admin_path} className="font-bold underline-offset-2 hover:underline">SH-{String(order.id).split('-')[0].toUpperCase()}</Link>
                  <p className="mt-1 text-sm text-black/65 [overflow-wrap:anywhere]">{order.customer_name} · {order.status}</p>
                  <p className="mt-1 text-xs text-black/50">{selection.dateBasis === 'order_created_at' ? `Criado em ${new Date(order.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : order.paid_at ? `Pago em ${new Date(order.paid_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : 'Sem pagamento confirmado'}</p>
                </div>
                <div className="min-w-0 text-right text-sm">
                  {order.metric_item_revenue != null ? selection.metric === 'product_units'
                    ? <><strong>{order.metric_units} un.</strong><p className="text-xs text-black/55">{formatMoney(order.metric_item_revenue)} em itens selecionados</p></>
                    : <><strong>{formatMoney(order.metric_item_revenue)}</strong><p className="text-xs text-black/55">{order.metric_units} un. dos itens selecionados</p></>
                    : <><strong>{formatMoney(['net_revenue', 'average_ticket'].includes(selection.metric) ? order.revenue_value : order.total_amount)}</strong><p className="text-xs text-black/55">{['net_revenue', 'average_ticket'].includes(selection.metric) ? 'Contribuição para o líquido' : 'Total do pedido'}</p></>}
                </div>
              </div>)}</div>}
      </div>

      {!loading && !error && page && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-sm">
        <span className="text-black/60">{page.count} pedido(s) · página {pageNumber}</span>
        <div className="flex gap-2">
          <button type="button" disabled={!page.previous} onClick={() => { closeRef.current?.focus(); setUrl(page.previous); }} className="rounded-lg border border-black/20 px-3 py-2 font-semibold disabled:opacity-40">Anterior</button>
          <button type="button" disabled={!page.next} onClick={() => { closeRef.current?.focus(); setUrl(page.next); }} className="rounded-lg border border-black/20 px-3 py-2 font-semibold disabled:opacity-40">Próxima</button>
        </div>
      </div>}
    </AdminPanel>
  </div>;
}

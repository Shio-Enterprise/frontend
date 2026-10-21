import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { PageMarker } from '../../../components/ui/ShioDesign';
import { cancelStockAlert, listStockAlerts, stockAlertErrorMessage } from '../../../lib/stockAlertsApi';

const formatDate = (iso) => {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export default function MyStockAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    listStockAlerts()
      .then((items) => { if (active) { setAlerts(items); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [attempt]);

  const handleCancel = useCallback(async (id) => {
    setCancelingId(id);
    setCancelError('');
    try {
      await cancelStockAlert(id);
      setAlerts((old) => old.filter((item) => item.id !== id));
    } catch (err) {
      setCancelError(stockAlertErrorMessage(err, 'Não foi possível cancelar o aviso.'));
    } finally {
      setCancelingId(null);
    }
  }, []);

  return (
    <AccountLayout>
      <PageMarker name="MyStockAlertsPage" />
      <h1 className="text-[28px] font-black uppercase text-black md:text-[34px]">Meus avisos</h1>
      {error ? (
        <div className="py-10 text-center">
          <p role="alert">Não foi possível carregar seus avisos.</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-full border border-black px-5 py-2">Tentar novamente</button>
        </div>
      ) : null}
      {loading && <p role="status" className="py-6 text-center text-black/50">Carregando avisos...</p>}
      {cancelError ? <p role="alert" className="mt-4 text-sm text-[#ff3333]">{cancelError}</p> : null}
      {!loading && !error && alerts.length === 0 ? (
        <div className="mt-8 rounded-[18px] border border-black/15 px-6 py-16 text-center">
          <h2 className="text-xl font-bold">Você não tem avisos</h2>
          <p className="mt-2 text-sm text-black/50">Quando um tamanho esgotado voltar ao estoque, avisamos você por e-mail. Toque em &quot;Avise-me quando chegar&quot; na página do produto.</p>
          <Link to="/category/all" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">Explorar produtos</Link>
        </div>
      ) : null}
      {!loading && !error && alerts.length > 0 ? (
        <ul className="mt-8 divide-y divide-black/10 rounded-[18px] border border-black/15">
          {alerts.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4">
              {item.product.image ? (
                <img src={item.product.image} alt="" className="h-20 w-16 shrink-0 rounded-[10px] object-cover" />
              ) : (
                <div className="h-20 w-16 shrink-0 rounded-[10px] bg-[#f0f0f0]" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                {item.product.is_visible ? (
                  <Link to={`/product/${item.product.id}`} className="block truncate font-semibold text-black hover:underline">{item.product.name}</Link>
                ) : (
                  <span className="block truncate font-semibold text-black/60">{item.product.name}</span>
                )}
                <p className="mt-1 text-sm text-black/60">{['Tamanho ' + item.size, item.color].filter(Boolean).join(' · ')}</p>
                <p className="mt-1 text-sm font-semibold text-black">
                  {item.notified_at ? `Avisado em ${formatDate(item.notified_at)}` : 'Aguardando'}
                </p>
              </div>
              {!item.notified_at && (
                <button
                  type="button"
                  disabled={cancelingId === item.id}
                  aria-label={`Cancelar aviso de ${item.product.name}`}
                  onClick={() => handleCancel(item.id)}
                  className="shrink-0 rounded-full border border-black px-4 py-2 text-sm disabled:opacity-40"
                >
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </AccountLayout>
  );
}

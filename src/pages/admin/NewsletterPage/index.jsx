import { useEffect, useState } from 'react';
import { AdminPanel, AdminTitle, BlackButton, Icon } from '../../../components/ui/ShioDesign';
import NewsletterModal from '../../../components/admin/NewsletterModal';
import DrawerShell from '../../../components/admin/DrawerShell';
import { getAccessToken } from '../../../lib/authToken';

const pad = (n) => String(n).padStart(2, '0');
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inscritos = (n) => `${n} ${n === 1 ? 'inscrito' : 'inscritos'}`;
const enviados = (n) => `${n} ${n === 1 ? 'enviado' : 'enviados'}`;
const falhas = (n) => `${n} ${n === 1 ? 'falha' : 'falhas'}`;

export default function NewsletterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSend, setSelectedSend] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/admin/newsletter/`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || 'Erro ao carregar dados da newsletter.');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalSubscribers = data?.total_subscribers ?? 0;
  const history = data?.history ?? [];

  return (
    <AdminPanel className="p-4 md:p-6">
      <AdminTitle
        eyebrow="Comunicação"
        title="Newsletter"
        action={
          <BlackButton onClick={() => setModalOpen(true)}>
            + Nova Newsletter
          </BlackButton>
        }
      />

      {error && (
        <div role="alert" className="mt-4 rounded-[10px] bg-red-50 p-4 text-sm font-semibold text-shio-danger">
          {error}
          <button type="button" className="ml-3 underline" onClick={fetchData}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-shio-muted">
            Inscritos Ativos (LGPD)
          </p>
          <p className="mt-2 text-3xl font-bold text-black" data-testid="metric-subscribers">
            {loading ? '…' : totalSubscribers}
          </p>
          <p className="mt-1 text-xs text-shio-muted">
            Consentiram no rodapé e não cancelaram
          </p>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-shio-muted">
            Campanhas Enviadas
          </p>
          <p className="mt-2 text-3xl font-bold text-black" data-testid="metric-campaigns">
            {loading ? '…' : history.length}
          </p>
          <p className="mt-1 text-xs text-shio-muted">
            Histórico total de envios
          </p>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-xs">
        <div
          role="region"
          aria-label="Tabela de histórico de newsletters"
          tabIndex={0}
          className="overflow-x-auto focus-visible:outline-offset-[-2px]!"
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Histórico de envios de newsletter</caption>
            <thead className="border-b bg-gray-50 text-[12px] font-semibold uppercase tracking-wider text-shio-muted">
              <tr>
                <th className="px-6 py-4">Assunto</th>
                <th className="px-6 py-4">Data do Envio</th>
                <th className="px-6 py-4">Enviado por</th>
                <th className="px-6 py-4">Entregues</th>
                <th className="px-6 py-4">Falhas</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading && (
                <tr>
                  <td colSpan="6" role="status" className="p-6 text-center text-shio-muted">
                    Carregando histórico...
                  </td>
                </tr>
              )}
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-shio-muted">
                    Nenhuma newsletter enviada ainda.
                  </td>
                </tr>
              )}
              {!loading &&
                history.map((item) => (
                  <tr key={item.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      <div className="max-w-xs truncate" title={item.subject}>
                        {item.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {fmtDateTime(item.sent_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.sent_by_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-green-700">
                      {enviados(item.sent_count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-amber-700">
                      {falhas(item.failed_count)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedSend(item)}
                        className="rounded-md border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                      >
                        Ver mensagem
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <NewsletterModal
          onClose={() => setModalOpen(false)}
          onSent={() => {
            fetchData();
          }}
        />
      )}

      {selectedSend && (
        <DrawerShell
          title="Detalhes da Newsletter"
          onClose={() => setSelectedSend(null)}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-shio-muted font-semibold">Assunto</span>
              <p className="text-lg font-bold text-black mt-1">{selectedSend.subject}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-black/10 py-4 text-sm">
              <div>
                <span className="text-xs text-shio-muted">Enviado em</span>
                <p className="font-medium mt-0.5">{fmtDateTime(selectedSend.sent_at)}</p>
              </div>
              <div>
                <span className="text-xs text-shio-muted">Enviado por</span>
                <p className="font-medium mt-0.5">{selectedSend.sent_by_name || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-shio-muted">Entregues</span>
                <p className="font-bold text-green-700 mt-0.5">{enviados(selectedSend.sent_count)}</p>
              </div>
              <div>
                <span className="text-xs text-shio-muted">Falhas</span>
                <p className="font-bold text-amber-700 mt-0.5">{falhas(selectedSend.failed_count)}</p>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-shio-muted font-semibold">Mensagem enviada</span>
              <div className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 border border-black/10 p-4 text-sm text-gray-800 font-sans leading-relaxed">
                {selectedSend.message}
              </div>
            </div>
          </div>
        </DrawerShell>
      )}
    </AdminPanel>
  );
}

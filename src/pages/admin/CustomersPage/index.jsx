import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { ActionMenu, AdminPanel, AdminTitle, Icon, PageMarker } from '../../../components/ui/ShioDesign';

// ─── Customer Profile Drawer ──────────────────────────────────────────────────

function CustomerProfileDrawer({ id }) {
  const navigate = useNavigate();
  const { data: customer, loading } = useApi(`/api/auth/crm/customers/${id}/`);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const formatCurrency = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;

  const initials = customer?.name
    ? customer.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : customer?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[360px] flex-col border-l border-black/10 bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-7 py-5">
        <h2 className="text-[18px] font-black uppercase tracking-wide">Perfil do Cliente</h2>
        <button onClick={() => navigate('/admin/customers')} aria-label="Fechar" className="rounded-full p-1 transition hover:bg-black/5">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-black/40">Carregando...</div>
      ) : customer ? (
        <>
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name */}
            <div className="flex items-center justify-between border-b border-black/10 px-7 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f0f0] text-[16px] font-bold text-black/55">
                  {initials}
                </div>
                <span className="text-[16px] font-semibold text-black">{customer.name || '—'}</span>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-[12px] font-semibold text-black/55">Cadastrado</span>
            </div>

            {/* Info grid */}
            <div className="border-b border-black/10 px-7 py-5">
              <div className="space-y-4 text-[14px]">
                <div className="flex items-start gap-3">
                  <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-black/40" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-black/55">E-mail</span>
                    <span className="text-right font-medium break-all">{customer.email}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="bag" className="mt-0.5 h-4 w-4 shrink-0 text-black/40" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-black/55">Cadastrado em</span>
                    <span className="text-right font-medium">{formatDate(customer.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="bag" className="mt-0.5 h-4 w-4 shrink-0 text-black/40" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-black/55">Total de pedidos</span>
                    <span className="text-right font-medium">{customer.total_orders ?? 0}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="tag" className="mt-0.5 h-4 w-4 shrink-0 text-black/40" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-black/55">Total gasto</span>
                    <span className="text-right font-semibold text-black">{formatCurrency(customer.total_spent)}</span>
                  </div>
                </div>
                {customer.last_purchase_date && (
                  <div className="flex items-start gap-3">
                    <Icon name="bag" className="mt-0.5 h-4 w-4 shrink-0 text-black/40" />
                    <div className="flex flex-1 justify-between gap-4">
                      <span className="text-black/55">Última compra</span>
                      <span className="text-right font-medium">{formatDate(customer.last_purchase_date)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order history */}
            {customer.order_history?.length > 0 && (
              <div className="px-7 py-5">
                <h3 className="mb-4 text-[13px] font-bold uppercase text-black/45">Histórico de Pedidos</h3>
                <div className="space-y-2">
                  {customer.order_history.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-[8px] border border-black/10 px-4 py-3 text-[13px]">
                      <span className="font-semibold text-black">#{String(order.id).substring(0, 8).toUpperCase()}</span>
                      <span className="text-black/55">{formatDate(order.created_at)}</span>
                      <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-black/10 p-5">
            <button onClick={() => navigate('/admin/customers')} className="flex h-11 flex-1 items-center justify-center rounded-[8px] border border-black/25 text-[13px] font-bold uppercase text-black/55 transition hover:border-black hover:text-black">
              Fechar
            </button>
            <button onClick={() => navigate(`/admin/customers/${id}/edit`)} className="flex h-11 flex-1 items-center justify-center rounded-[8px] bg-black text-[13px] font-bold uppercase text-white transition hover:bg-black/85">
              Editar Cliente
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-black/40">Cliente não encontrado.</div>
      )}
    </aside>
  );
}

// ─── CustomersPage ────────────────────────────────────────────────────────────

const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const customersUrl = debouncedSearch
    ? `/api/auth/crm/customers/?search=${encodeURIComponent(debouncedSearch)}`
    : '/api/auth/crm/customers/';
  const { data: apiResponse, loading, error } = useApi(customersUrl);

  const customerMatch = useMatch('/admin/customers/:id');
  const selectedId = customerMatch?.params?.id ?? null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const renderContent = () => {
    if (loading) return <div className="p-10 text-center text-black/55">Carregando clientes...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Erro ao carregar clientes. Tente novamente.</div>;

    const allCustomers = apiResponse
      ? Array.isArray(apiResponse) ? apiResponse : apiResponse.results ?? []
      : [];

    if (allCustomers.length === 0) return <div className="p-10 text-center text-black/55">Nenhum cliente encontrado.</div>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#f0f0f0] text-[20px] text-black/55">
            <tr>
              <th className="px-10 py-6 font-normal">Cliente</th>
              <th className="px-10 py-6 font-normal">Contato</th>
              <th className="px-10 py-6 font-normal">Pedidos</th>
              <th className="px-10 py-6 font-normal">Total gasto</th>
              <th className="px-10 py-6 font-normal">Cadastrado em</th>
              <th className="px-10 py-6 text-right font-normal">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {allCustomers.map((customer) => (
              <tr key={customer.id} className={selectedId === customer.id ? 'bg-[#f9f9f9]' : ''}>
                <td className="px-10 py-8 text-[20px] font-semibold text-black">
                  {customer.name || '—'}
                </td>
                <td className="px-10 py-8 text-[20px] text-black/55">{customer.email}</td>
                <td className="px-10 py-8 text-[20px] text-black/55">{customer.total_orders ?? 0}</td>
                <td className="px-10 py-8 text-[20px] text-black/55">
                  R$ {parseFloat(customer.total_spent || 0).toFixed(2)}
                </td>
                <td className="px-10 py-8 text-[20px] text-black/55">
                  {formatDate(customer.created_at)}
                </td>
                <td className="px-10 py-8 text-right">
                  <ActionMenu
                    label={`Ações para ${customer.name || customer.email}`}
                    items={[
                      { label: 'Ver perfil', to: `/admin/customers/${customer.id}` },
                      { label: 'Ver pedidos', to: `/admin/orders?customer=${customer.id}` },
                      { label: 'Editar cliente', to: `/admin/customers/${customer.id}/edit` },
                      { separator: true, key: 'sep' },
                      { label: 'Excluir cliente', danger: true, icon: 'trash', onClick: () => {} },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <PageMarker name="CustomersPage" />
      <AdminTitle title="Clientes" />

      <AdminPanel className="overflow-hidden">
        <div className="p-5">
          <label className="flex h-12 max-w-[675px] items-center gap-4 rounded-full border border-black/20 px-5 text-black/45">
            <Icon name="search" className="h-5 w-5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[20px] outline-none placeholder:text-black/35"
              placeholder="Buscar por nome ou e-mail..."
            />
          </label>
        </div>
        {renderContent()}
      </AdminPanel>

      {selectedId && <CustomerProfileDrawer id={selectedId} />}
    </div>
  );
};

export default CustomersPage;

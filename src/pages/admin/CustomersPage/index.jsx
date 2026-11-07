import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { ActionMenu, AdminPanel, AdminTitle, Icon } from '../../../components/ui/ShioDesign';
import ExportButton from '../../../components/admin/ExportButton';
import DrawerShell from '../../../components/admin/DrawerShell';

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
    <DrawerShell title="Perfil do Cliente" onClose={() => navigate('/admin/customers')}>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-shio-muted">Carregando...</div>
      ) : customer ? (
        <>
          {/* Rola por dentro sem nenhum botão: tabIndex para rolar pelo teclado. */}
          <div role="region" aria-label="Dados do cliente" tabIndex={0} className="flex-1 overflow-y-auto focus-visible:outline-offset-[-2px]!">
            {/* Avatar + name */}
            <div className="flex items-center justify-between border-b border-black/10 px-7 py-5">
              <div className="flex min-w-0 items-center gap-4">
                <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[16px] font-bold text-shio-muted">
                  {initials}
                </div>
                <span className="min-w-0 break-words text-[16px] font-semibold text-black">{customer.name || '—'}</span>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-[12px] font-semibold text-shio-muted">Cadastrado</span>
            </div>

            {/* Info grid */}
            <div className="border-b border-black/10 px-7 py-5">
              <div className="space-y-4 text-[14px]">
                <div className="flex items-start gap-3">
                  <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-shio-muted" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-shio-muted">E-mail</span>
                    <span className="text-right font-medium break-all">{customer.email}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="bag" className="mt-0.5 h-4 w-4 shrink-0 text-shio-muted" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-shio-muted">Cadastrado em</span>
                    <span className="text-right font-medium">{formatDate(customer.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="bag" className="mt-0.5 h-4 w-4 shrink-0 text-shio-muted" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-shio-muted">Total de pedidos</span>
                    <span className="text-right font-medium">{customer.total_orders ?? 0}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="tag" className="mt-0.5 h-4 w-4 shrink-0 text-shio-muted" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-shio-muted">Total gasto</span>
                    <span className="text-right font-semibold text-black">{formatCurrency(customer.total_spent)}</span>
                  </div>
                </div>
                {customer.last_purchase_date && (
                  <div className="flex items-start gap-3">
                    <Icon name="bag" className="mt-0.5 h-4 w-4 shrink-0 text-shio-muted" />
                    <div className="flex flex-1 justify-between gap-4">
                      <span className="text-shio-muted">Última compra</span>
                      <span className="text-right font-medium">{formatDate(customer.last_purchase_date)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-shio-muted" />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-shio-muted">Cliente recorrente</span>
                    <span className="text-right font-medium">{customer.is_recurring ? 'Sim' : 'Não'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order history */}
            {customer.order_history?.length > 0 && (
              <div className="px-7 py-5">
                <h3 className="mb-4 text-[13px] font-bold uppercase text-shio-muted">Histórico de Pedidos</h3>
                <ul className="space-y-2">
                  {customer.order_history.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[8px] border border-black/10 px-4 py-3 text-[13px]">
                      <span className="font-semibold text-black">#{String(order.id).substring(0, 8).toUpperCase()}</span>
                      <span className="text-shio-muted">{formatDate(order.created_at)}</span>
                      <span className="flex flex-col items-start gap-1 text-shio-muted">
                        {order.status}
                        {order.commercial_status === 'REFUNDED' && (
                          <span className="rounded-full bg-[#d4f7e2] px-2 py-0.5 text-[12px] text-shio-success">Reembolsado</span>
                        )}
                      </span>
                      <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-black/10 p-5">
            <button type="button" onClick={() => navigate('/admin/customers')} className="flex h-11 flex-1 items-center justify-center rounded-[8px] border border-black/25 text-[13px] font-bold uppercase text-shio-muted transition hover:border-black hover:text-black">
              Fechar
            </button>
            <button type="button" onClick={() => navigate(`/admin/customers/${id}/edit`)} className="flex h-11 flex-1 items-center justify-center rounded-[8px] bg-black text-[13px] font-bold uppercase text-white transition hover:bg-black/85">
              Editar Cliente
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-shio-muted">Cliente não encontrado.</div>
      )}
    </DrawerShell>
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
    if (loading) return <div role="status" className="p-10 text-center text-shio-muted">Carregando clientes...</div>;
    if (error) return <div role="alert" className="p-10 text-center text-shio-danger">Erro ao carregar clientes. Tente novamente.</div>;

    const allCustomers = apiResponse
      ? Array.isArray(apiResponse) ? apiResponse : apiResponse.results ?? []
      : [];

    if (allCustomers.length === 0) return <div className="p-10 text-center text-shio-muted">Nenhum cliente encontrado.</div>;

    return (
      // No celular a tabela rola para o lado dentro da caixa; a página não rola (#64, decisão B).
      // tabIndex/role/nome: para dar para rolar pelo teclado.
      <div role="region" aria-label="Tabela de clientes" tabIndex={0} className="overflow-x-auto focus-visible:outline-offset-[-2px]!">
        <table className="min-w-full whitespace-nowrap text-left">
          <caption className="sr-only">Clientes</caption>
          <thead className="bg-[#f0f0f0] text-[14px] text-shio-muted md:text-[20px]">
            <tr>
              <th className="px-4 py-4 font-normal md:px-10 md:py-6">Cliente</th>
              <th className="px-4 py-4 font-normal md:px-10 md:py-6">Contato</th>
              <th className="px-4 py-4 font-normal md:px-10 md:py-6">Pedidos</th>
              <th className="px-4 py-4 font-normal md:px-10 md:py-6">Total gasto</th>
              <th className="px-4 py-4 font-normal md:px-10 md:py-6">Cadastrado em</th>
              <th className="px-4 py-4 text-right font-normal md:px-10 md:py-6">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {allCustomers.map((customer) => (
              <tr key={customer.id} className={selectedId === customer.id ? 'bg-[#f9f9f9]' : ''}>
                <td className="px-4 py-4 text-[14px] font-semibold text-black md:px-10 md:py-8 md:text-[20px]">
                  {customer.name || '—'}
                </td>
                <td className="px-4 py-4 text-[14px] text-shio-muted md:px-10 md:py-8 md:text-[20px]">{customer.email}</td>
                <td className="px-4 py-4 text-[14px] text-shio-muted md:px-10 md:py-8 md:text-[20px]">{customer.total_orders ?? 0}</td>
                <td className="px-4 py-4 text-[14px] text-shio-muted md:px-10 md:py-8 md:text-[20px]">
                  R$ {parseFloat(customer.total_spent || 0).toFixed(2)}
                </td>
                <td className="px-4 py-4 text-[14px] text-shio-muted md:px-10 md:py-8 md:text-[20px]">
                  {formatDate(customer.created_at)}
                </td>
                <td className="px-4 py-2 text-right md:px-10 md:py-8">
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
      <AdminTitle title="Clientes" />

      <AdminPanel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <label className="flex h-12 min-w-0 max-w-[675px] flex-1 basis-56 items-center gap-4 rounded-full border border-black/20 px-5 text-shio-muted">
            <Icon name="search" className="h-5 w-5 shrink-0" />
            <input
              type="search"
              aria-label="Buscar clientes por nome ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-shio-placeholder md:text-[20px]"
              placeholder="Buscar por nome ou e-mail..."
            />
          </label>

          <ExportButton
            endpoint="/api/auth/crm/customers/export/"
            params={search.trim() ? { search: search.trim() } : {}}
            fallbackFilename="clientes"
          />
        </div>
        {renderContent()}
      </AdminPanel>

      {selectedId && <CustomerProfileDrawer id={selectedId} />}
    </div>
  );
};

export default CustomersPage;

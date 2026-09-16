import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { getDropStatus } from '../../../lib/dropStatus';
import { ActionMenu, AdminPanel, AdminTitle, BlackButton, Icon, PageMarker } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const DropsPage = () => {
  const { data: apiResponse, loading, error, refetch } = useApi('/api/catalog/drops/');
  const { data: dropRevenueResponse } = useApi('/api/orders/dashboard/drop-revenue/');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateLaunchDate, setDuplicateLaunchDate] = useState('');
  const [duplicateIsActive, setDuplicateIsActive] = useState('false');
  const [duplicateMode, setDuplicateMode] = useState('current');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusLabel = (drop) => {
    const { label, color } = getDropStatus(drop);
    return <span className={`text-[14px] md:text-[18px] font-semibold ${color}`}>{label}</span>;
  };

  const formatReceita = (drop) => {
    const metric = dropRevenueResponse?.find((item) => item.drop_id === drop.id);
    return `R$ ${Number(metric?.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/catalog/drops/${deleteTarget.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao excluir o drop.');
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setActionError(err.message);
      setDeleteTarget(null);
    }
  };

  const openDuplicateModal = (drop) => {
    setDuplicateTarget(drop);
    setDuplicateName(drop.name);
    setDuplicateLaunchDate(drop.launch_date ? drop.launch_date.slice(0, 10) : '');
    setDuplicateIsActive('false');
    setDuplicateMode('current');
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget) return;
    setActionError(null);
    try {
      const token = getAccessToken();
      const drop = duplicateTarget;
      const body = {
        name: duplicateName || `${drop.name} (cópia)`,
        description: drop.description || '',
        launch_date: duplicateLaunchDate || drop.launch_date,
        end_date: duplicateMode === 'current' ? drop.end_date : null,
        max_quantity: duplicateMode === 'current' ? drop.max_quantity : null,
        is_active: duplicateIsActive === 'true',
        is_public: drop.is_public ?? true,
      };
      const response = await fetch(`${API_BASE_URL}/api/catalog/drops/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Falha ao duplicar o drop.');
      setDuplicateTarget(null);
      refetch();
    } catch (err) {
      setActionError(err.message);
      setDuplicateTarget(null);
    }
  };

  const renderDeleteModal = () => {
    if (!deleteTarget) return null;
    const productCount = deleteTarget.products?.length ?? 0;
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-[480px] rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-[22px] font-bold tracking-wide text-black">EXCLUIR DROP</h2>
          <p className="mb-5 text-[15px] text-black/60">Tem certeza que deseja excluir esse drop?</p>
          <div className="mb-4 rounded-xl bg-[#f5f5f5] px-5 py-3 text-[14px] text-black/70">
            <span className="font-semibold text-black">{deleteTarget.name}</span>
            {' / '}
            {formatDate(deleteTarget.launch_date)}
            {' - '}
            {productCount} {productCount === 1 ? 'item' : 'itens'}
          </div>
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 text-[13px] font-semibold text-[#c8970a]">
            <span>⚠</span>
            <span>Essa ação é permanente</span>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="w-full rounded-full border border-black/25 py-3 text-[15px] font-semibold text-black hover:bg-black/5 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-full bg-red-600 py-3 text-[15px] font-semibold text-white hover:bg-red-700 transition-colors"
            >
              EXCLUIR
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderDuplicateModal = () => {
    if (!duplicateTarget) return null;
    const productCount = duplicateTarget.products?.length ?? 0;
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-[520px] rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-4 text-[22px] font-bold tracking-wide text-black">DUPLICAR DROP</h2>
          <div className="mb-5 rounded-xl bg-[#f5f5f5] px-5 py-3 text-[14px] text-black/70 flex items-center justify-between">
            <span>
              <span className="font-semibold text-black">{duplicateTarget.name}</span>
              {' · '}
              {productCount} {productCount === 1 ? 'item' : 'itens'}
            </span>
            {getStatusLabel(duplicateTarget)}
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-[13px] font-semibold text-black/60">Nome do drop</label>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="w-full rounded-xl border border-black/20 px-4 py-2.5 text-[15px] outline-none focus:border-black/50"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-[13px] font-semibold text-black/60">Data de lançamento</label>
            <input
              type="date"
              value={duplicateLaunchDate}
              onChange={(e) => setDuplicateLaunchDate(e.target.value)}
              className="w-full rounded-xl border border-black/20 px-4 py-2.5 text-[15px] outline-none focus:border-black/50"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1 block text-[13px] font-semibold text-black/60">Status</label>
            <select
              value={duplicateIsActive}
              onChange={(e) => setDuplicateIsActive(e.target.value)}
              className="w-full rounded-xl border border-black/20 px-4 py-2.5 text-[15px] outline-none focus:border-black/50"
            >
              <option value="false">Rascunho</option>
              <option value="true">Ativo</option>
            </select>
          </div>
          <div className="mb-6 flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-3 text-[14px] text-black/70">
              <input
                type="radio"
                name="duplicateMode"
                value="current"
                checked={duplicateMode === 'current'}
                onChange={() => setDuplicateMode('current')}
                className="accent-black"
              />
              Duplicar drop atual
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-[14px] text-black/70">
              <input
                type="radio"
                name="duplicateMode"
                value="config"
                checked={duplicateMode === 'config'}
                onChange={() => setDuplicateMode('config')}
                className="accent-black"
              />
              Duplicar configurações do drop
            </label>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setDuplicateTarget(null)}
              className="w-full rounded-full border border-black/25 py-3 text-[15px] font-semibold text-black hover:bg-black/5 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              className="w-full rounded-full bg-black py-3 text-[15px] font-semibold text-white hover:bg-black/80 transition-colors"
            >
              DUPLICAR DROP
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderContent = () => {
    if (loading) return <div className="p-10 text-center text-black/55">Carregando drops...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Erro ao carregar drops. Tente novamente.</div>;

    const allDrops = apiResponse ? (Array.isArray(apiResponse) ? apiResponse : apiResponse.results ?? []) : [];
    const drops = search.trim()
      ? allDrops.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
      : allDrops;

    if (drops.length === 0) return <div className="p-10 text-center text-black/55">Nenhum drop encontrado.</div>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#f0f0f0] text-[14px] md:text-[20px] text-black/55">
            <tr>
              <th className="px-4 py-4 md:px-10 md:py-6 font-normal">Drop</th>
              <th className="px-4 py-4 md:px-10 md:py-6 font-normal">Lançamento</th>
              <th className="px-4 py-4 md:px-10 md:py-6 font-normal">Produtos</th>
              <th className="px-4 py-4 md:px-10 md:py-6 font-normal">Receita</th>
              <th className="px-4 py-4 md:px-10 md:py-6 font-normal">Status</th>
              <th className="px-4 py-4 md:px-10 md:py-6 text-right font-normal">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {drops.map((drop) => (
              <tr key={drop.id}>
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] font-semibold text-black">
                  <Link to={`/admin/drops/${drop.id}`} className="hover:underline">{drop.name}</Link>
                </td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] text-black/55">{formatDate(drop.launch_date)}</td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] text-black/55">{drop.products?.length ?? 0}</td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] text-black/55">{formatReceita(drop)}</td>
                <td className="px-4 py-4 md:px-10 md:py-6">{getStatusLabel(drop)}</td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-right">
                  <ActionMenu
                    label={`Ações para ${drop.name}`}
                    items={[
                      { label: 'Ver detalhes', icon: 'search', to: `/admin/drops/${drop.id}` },
                      { label: 'Editar drop', icon: 'save', to: `/admin/edit-drop/${drop.id}` },
                      { label: 'Duplicar drop', icon: 'box', onClick: () => openDuplicateModal(drop) },
                      { label: 'Gerenciar drop', icon: 'tag', to: `/admin/drops/${drop.id}` },
                      { separator: true, key: 'sep' },
                      { label: 'Excluir drop', danger: true, icon: 'trash', onClick: () => setDeleteTarget(drop) },
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
      <PageMarker name="DropsPage" />
      <AdminTitle
        title="Drops"
        action={(
          <BlackButton as={Link} to="/admin/new-drop">
            <Icon name="plus" className="h-5 w-5" />
            Novo drop
          </BlackButton>
        )}
      />

      {actionError && (
        <div className="mb-4 rounded-[10px] bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
          {actionError}
          <button type="button" className="ml-3 underline" onClick={() => setActionError(null)}>Fechar</button>
        </div>
      )}

      <AdminPanel className="overflow-hidden">
        <div className="p-5">
          <label className="flex h-12 max-w-[675px] items-center gap-4 rounded-full border border-black/20 px-5 text-black/45">
            <Icon name="search" className="h-5 w-5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[14px] md:text-[20px] outline-none placeholder:text-black/35"
              placeholder="Buscar drops..."
            />
          </label>
        </div>
        {renderContent()}
      </AdminPanel>

      {renderDeleteModal()}
      {renderDuplicateModal()}
    </div>
  );
};

export default DropsPage;

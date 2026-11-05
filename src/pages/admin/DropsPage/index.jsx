import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { getDropStatus } from '../../../lib/dropStatus';
import { ActionMenu, AdminPanel, AdminTitle, BlackButton, Icon, PageMarker } from '../../../components/ui/ShioDesign';
import Dialog from '../../../components/ui/Dialog';

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
  const [duplicateError, setDuplicateError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Depois de excluir/duplicar, o foco vai para o aviso do resultado em vez do início da página.
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

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
    if (!deleteTarget || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/catalog/drops/${deleteTarget.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao excluir o drop.');
      setNotice(`Drop ${deleteTarget.name} excluído.`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setActionError(err.message);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const openDuplicateModal = (drop) => {
    setDuplicateError(null);
    setDuplicateTarget(drop);
    setDuplicateName(drop.name);
    setDuplicateLaunchDate(drop.launch_date ? drop.launch_date.slice(0, 10) : '');
    setDuplicateIsActive('false');
    setDuplicateMode('current');
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || busy) return;
    setBusy(true);
    setDuplicateError(null);
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
      setNotice(`Cópia de ${drop.name} criada.`);
      setDuplicateTarget(null);
      refetch();
    } catch (err) {
      // O modal continua aberto com o que foi digitado; o erro aparece dentro dele.
      setDuplicateError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renderDeleteModal = () => {
    if (!deleteTarget) return null;
    const productCount = deleteTarget.products?.length ?? 0;
    return (
      <Dialog
        labelledBy="delete-drop-title"
        aria-describedby="delete-drop-warning"
        onClose={() => setDeleteTarget(null)}
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <h2 id="delete-drop-title" className="mb-1 text-[22px] font-bold uppercase tracking-wide text-black">Excluir drop</h2>
        <p className="mb-5 text-[15px] text-shio-muted">Tem certeza que deseja excluir esse drop?</p>
        <div className="mb-4 break-words rounded-xl bg-[#f5f5f5] px-5 py-3 text-[14px] text-shio-muted">
          <span className="font-semibold text-black">{deleteTarget.name}</span>
          {' / '}
          {formatDate(deleteTarget.launch_date)}
          {' - '}
          {productCount} {productCount === 1 ? 'item' : 'itens'}
        </div>
        <p id="delete-drop-warning" className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 text-[13px] font-semibold text-shio-warning">
          <span aria-hidden="true">⚠</span>
          <span>Essa ação é permanente</span>
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="min-h-12 w-full rounded-full border border-black/25 py-3 text-[15px] font-semibold uppercase text-black transition-colors hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-disabled={busy || undefined}
            className="min-h-12 w-full rounded-full bg-shio-danger py-3 text-[15px] font-semibold uppercase text-white transition-colors hover:bg-shio-danger-hover aria-disabled:opacity-60"
          >
            {busy ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </Dialog>
    );
  };

  const renderDuplicateModal = () => {
    if (!duplicateTarget) return null;
    const productCount = duplicateTarget.products?.length ?? 0;
    const fieldClass = 'h-12 w-full rounded-xl border border-black/20 px-4 text-[15px] outline-none focus:border-black/50';
    return (
      <Dialog
        labelledBy="duplicate-drop-title"
        onClose={() => setDuplicateTarget(null)}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <h2 id="duplicate-drop-title" className="mb-4 text-[22px] font-bold uppercase tracking-wide text-black">Duplicar drop</h2>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f5f5f5] px-5 py-3 text-[14px] text-shio-muted">
          <span className="min-w-0 break-words">
            <span className="font-semibold text-black">{duplicateTarget.name}</span>
            {' · '}
            {productCount} {productCount === 1 ? 'item' : 'itens'}
          </span>
          {getStatusLabel(duplicateTarget)}
        </div>
        <div className="mb-4">
          <label htmlFor="duplicate-drop-name" className="mb-1 block text-[13px] font-semibold text-shio-muted">Nome do drop</label>
          <input
            id="duplicate-drop-name"
            type="text"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="duplicate-drop-date" className="mb-1 block text-[13px] font-semibold text-shio-muted">Data de lançamento</label>
          <input
            id="duplicate-drop-date"
            type="date"
            value={duplicateLaunchDate}
            onChange={(e) => setDuplicateLaunchDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="duplicate-drop-status" className="mb-1 block text-[13px] font-semibold text-shio-muted">Status</label>
          <select
            id="duplicate-drop-status"
            value={duplicateIsActive}
            onChange={(e) => setDuplicateIsActive(e.target.value)}
            className={`${fieldClass} bg-white`}
          >
            <option value="false">Rascunho</option>
            <option value="true">Ativo</option>
          </select>
        </div>
        <fieldset className="mb-6 flex flex-col">
          <legend className="sr-only">O que duplicar</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-black">
            <input
              type="radio"
              name="duplicateMode"
              value="current"
              checked={duplicateMode === 'current'}
              onChange={() => setDuplicateMode('current')}
              className="h-5 w-5 accent-black"
            />
            Duplicar drop atual
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-black">
            <input
              type="radio"
              name="duplicateMode"
              value="config"
              checked={duplicateMode === 'config'}
              onChange={() => setDuplicateMode('config')}
              className="h-5 w-5 accent-black"
            />
            Duplicar configurações do drop
          </label>
        </fieldset>
        {duplicateError && <p role="alert" className="mb-4 text-sm font-semibold text-shio-danger">{duplicateError}</p>}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setDuplicateTarget(null)}
            className="min-h-12 w-full rounded-full border border-black/25 py-3 text-[15px] font-semibold uppercase text-black transition-colors hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            aria-disabled={busy || undefined}
            className="min-h-12 w-full rounded-full bg-black py-3 text-[15px] font-semibold uppercase text-white transition-colors hover:bg-black/80 aria-disabled:opacity-60"
          >
            {busy ? 'Duplicando...' : 'Duplicar drop'}
          </button>
        </div>
      </Dialog>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="p-10 text-center text-shio-muted">Carregando drops...</div>;
    if (error) return <div className="p-10 text-center text-shio-danger">Erro ao carregar drops. Tente novamente.</div>;

    const allDrops = apiResponse ? (Array.isArray(apiResponse) ? apiResponse : apiResponse.results ?? []) : [];
    const drops = search.trim()
      ? allDrops.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
      : allDrops;

    if (drops.length === 0) return <div className="p-10 text-center text-shio-muted">Nenhum drop encontrado.</div>;

    return (
      // Decisão do time (#64): no celular a tabela de drops rola para o lado por dentro do painel.
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <caption className="sr-only">Drops</caption>
          <thead className="bg-[#f0f0f0] text-[14px] md:text-[20px] text-shio-muted">
            <tr>
              <th className="whitespace-nowrap px-4 py-4 md:px-10 md:py-6 font-normal">Drop</th>
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
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] text-shio-muted">{formatDate(drop.launch_date)}</td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] text-shio-muted">{drop.products?.length ?? 0}</td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-[14px] md:text-[20px] text-shio-muted">{formatReceita(drop)}</td>
                <td className="px-4 py-4 md:px-10 md:py-6">{getStatusLabel(drop)}</td>
                <td className="px-4 py-4 md:px-10 md:py-6 text-right">
                  <ActionMenu
                    label={`Ações para ${drop.name}`}
                    items={[
                      { label: 'Ver detalhes', icon: 'search', to: `/admin/drops/${drop.id}` },
                      { label: 'Ver página pública', icon: 'arrowRight', to: `/drop/${drop.slug}` },
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
        <div role="alert" className="mb-4 rounded-[10px] bg-red-50 px-5 py-3 text-sm font-semibold text-shio-danger">
          {actionError}
          <button type="button" className="ml-3 min-h-11 underline" onClick={() => setActionError(null)}>Fechar</button>
        </div>
      )}

      <AdminPanel className="overflow-hidden">
        <div className="p-5">
          <label className="flex h-12 max-w-[675px] items-center gap-4 rounded-full border border-black/20 px-5 text-shio-muted">
            <Icon name="search" className="h-5 w-5 shrink-0" />
            <input
              type="search"
              aria-label="Buscar drops"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full w-full min-w-0 bg-transparent text-[16px] md:text-[20px] outline-none placeholder:text-shio-placeholder"
              placeholder="Buscar drops..."
            />
          </label>
        </div>
        {renderContent()}
      </AdminPanel>

      {renderDeleteModal()}
      {renderDuplicateModal()}
      {notice && <p ref={noticeRef} tabIndex={-1} role="status" className="sr-only">{notice}</p>}
    </div>
  );
};

export default DropsPage;

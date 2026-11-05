import { useId, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { getDropStatus } from '../../../lib/dropStatus';
import { AdminPanel, AdminTitle, BlackButton, Icon, PageMarker } from '../../../components/ui/ShioDesign';
import Dialog from '../../../components/ui/Dialog';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const DropDetailsPage = () => {
  const { id: dropId } = useParams();
  const navigate = useNavigate();
  const { data: drop, loading, error } = useApi(`/api/catalog/drops/${dropId}/`);
  const { data: dropRevenueResponse } = useApi(`/api/orders/dashboard/drop-revenue/?drop=${dropId}`);
  const { data: productsResponse, loading: loadingProducts } = useApi('/api/catalog/products/');
  const [managedDrop, setManagedDrop] = useState(null);
  const [isManagingProducts, setIsManagingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [managerError, setManagerError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkStatus, setLinkStatus] = useState('');
  const managerId = useId();
  const mobileSearchRef = useRef(null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/catalog/drops/${dropId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir o drop.');
      navigate('/admin/drops');
    } catch (err) {
      setConfirmingDelete(false);
      setActionError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setActionError(null);
    const src = managedDrop || drop;
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/catalog/drops/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: `${src.name} (cópia)`,
          description: src.description || '',
          launch_date: src.launch_date,
          end_date: src.end_date,
          max_quantity: src.max_quantity,
          is_active: false,
          is_public: src.is_public ?? true,
        }),
      });
      if (!res.ok) throw new Error('Falha ao duplicar o drop.');
      const newDrop = await res.json();
      navigate(`/admin/drops/${newDrop.id}`);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  const formatPrice = (product) => {
    const price = product.base_price ?? product.price ?? 0;
    return `R$ ${Number(price).toFixed(2)}`;
  };

  const getStock = (product) => {
    if (Array.isArray(product.variations)) {
      return product.variations.reduce((total, variation) => total + (variation.stock_quantity || 0), 0);
    }
    return product.stock_quantity ?? product.stock ?? '-';
  };

  const getProductImage = (product) => {
    if (product.first_image_url) return product.first_image_url;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0].image;
    return null;
  };

  // Map product ID → image URL from the full products list (which includes image data)
  const productImageMap = useMemo(() => {
    const raw = productsResponse ? (Array.isArray(productsResponse) ? productsResponse : productsResponse.results ?? []) : [];
    const map = {};
    raw.forEach((p) => {
      const url = p.first_image_url || p.images?.[0]?.image || null;
      if (url) map[p.id] = url;
    });
    return map;
  }, [productsResponse]);

  const allProducts = useMemo(() => {
    const products = productsResponse ? (Array.isArray(productsResponse) ? productsResponse : productsResponse.results ?? []) : [];
    const normalizedSearch = productSearch.trim().toLowerCase();
    if (!normalizedSearch) return products;
    return products.filter((product) => product.name.toLowerCase().includes(normalizedSearch));
  }, [productsResponse, productSearch]);

  const handleProductLink = async (product, shouldAttach) => {
    if (updatingProductId) return;
    setUpdatingProductId(product.id);
    setManagerError(null);
    setLinkStatus('');

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Token de autenticação não encontrado.');

      const response = await fetch(`${API_BASE_URL}/api/catalog/drops/${dropId}/products/${product.id}/`, {
        method: shouldAttach ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Não foi possível atualizar os produtos do drop.');
      }

      if (shouldAttach) {
        const updatedDrop = await response.json();
        setManagedDrop(updatedDrop);
      } else {
        setManagedDrop((previousDrop) => ({
          ...(previousDrop || drop),
          products: ((previousDrop || drop)?.products || []).filter((dropProduct) => dropProduct.id !== product.id),
        }));
      }
      setLinkStatus(`${product.name} ${shouldAttach ? 'adicionado ao' : 'removido do'} drop.`);
    } catch (err) {
      setManagerError(err.message);
    } finally {
      setUpdatingProductId(null);
    }
  };

  // O botão não usa disabled durante a gravação: disabled tira o foco de quem está no teclado.
  const renderLinkButton = (product, isLinked) => {
    const isUpdating = updatingProductId === product.id;
    return (
      <button
        type="button"
        onClick={() => handleProductLink(product, !isLinked)}
        aria-disabled={updatingProductId ? true : undefined}
        aria-label={`${isLinked ? 'Remover' : 'Adicionar'} ${product.name} ${isLinked ? 'do' : 'ao'} drop`}
        className={`h-11 shrink-0 rounded-full px-4 text-[12px] font-bold uppercase transition aria-disabled:cursor-not-allowed aria-disabled:opacity-60 lg:h-9 ${isLinked ? 'border border-black/20 text-black hover:border-black' : 'bg-black text-white hover:bg-black/85'}`}
      >
        {isUpdating ? 'Salvando...' : isLinked ? 'Remover' : 'Adicionar'}
      </button>
    );
  };

  // Mesmo sem o drop, a página mantém o título (h1) para quem navega por cabeçalhos.
  const fallback = (message, className = '') => (
    <div>
      <h1 className="sr-only">Detalhes do drop</h1>
      <p role="status" className={`p-8 text-center ${className}`}>{message}</p>
      <p className="text-center">
        <Link to="/admin/drops" className="inline-flex min-h-11 items-center font-semibold underline">Voltar para drops</Link>
      </p>
    </div>
  );

  if (loading) {
    return fallback('Carregando detalhes do drop...');
  }

  if (error) {
    return fallback('Erro ao carregar o drop. Verifique se o ID é válido.', 'text-shio-danger');
  }

  const currentDrop = managedDrop || drop;

  if (!currentDrop) {
    return fallback('Drop não encontrado.');
  }

  const products = currentDrop.products || [];
  const linkedProductIds = new Set(products.map((product) => product.id));

  const { label: statusLabel, color: statusColor, badgeColor: statusBg } = getDropStatus(currentDrop);

  const revenue = Number(dropRevenueResponse?.[0]?.revenue || 0);
  const formattedRevenue = `R$ ${revenue.toFixed(2)}`;

  return (
    <div>
      <PageMarker name="DropDetailsPage" />

      {/* ── MOBILE layout ─────────────────────────────── */}
      <div className="lg:hidden">

      {/* Header row */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-black uppercase">Detalhes do drop</h1>
        <Link to="/admin/drops" aria-label="Voltar para drops" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5">
          <Icon name="close" className="h-6 w-6" />
        </Link>
      </div>

      {/* Status badge */}
      <span
        className="rounded-full px-3 py-1 text-[12px] font-semibold text-white"
        style={{ backgroundColor: statusBg }}
      >
        {statusLabel}
      </span>

      {/* Drop details card */}
      <AdminPanel className="mt-4 p-5">
        <div className="grid gap-2 text-[14px]">
          <div className="flex justify-between gap-4">
            <span className="shrink-0 text-shio-muted">Nome do drop</span>
            <span className="min-w-0 break-words text-right font-medium">{currentDrop.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-shio-muted">Data</span>
            <span>{formatDate(currentDrop.launch_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-shio-muted">Status</span>
            <span className={statusColor}>{statusLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-shio-muted">Produtos</span>
            <span>{products.length} itens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-shio-muted">Receita</span>
            <span>{formattedRevenue}</span>
          </div>
        </div>
        {currentDrop.description && (
          <p className="mt-4 text-[13px] leading-relaxed text-shio-muted">{currentDrop.description}</p>
        )}
      </AdminPanel>

      {/* Products section */}
      <AdminPanel className="mt-4">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-[16px] font-bold text-black">Produtos do drop</h2>
          <button
            type="button"
            onClick={() => setIsManagingProducts((isOpen) => !isOpen)}
            aria-expanded={isManagingProducts}
            aria-controls={`${managerId}-mobile`}
            className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-black"
          >
            {/* Texto fixo: o estado aberto/fechado vem do aria-expanded e do ícone. */}
            <Icon name={isManagingProducts ? 'close' : 'plus'} className="h-4 w-4" />
            Gerenciar
          </button>
        </div>

        {isManagingProducts && (
          <div id={`${managerId}-mobile`} className="border-t border-black/10 p-5">
            {/* Search bar */}
            <label className="flex h-12 items-center gap-3 rounded-full border border-black/20 px-4 text-shio-muted">
              <Icon name="search" className="h-4 w-4 shrink-0" />
              <input
                ref={mobileSearchRef}
                type="search"
                aria-label="Buscar produto para o drop"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="h-full w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-shio-placeholder"
                placeholder="Buscar produto..."
              />
            </label>

            {/* Add product button */}
            <button
              type="button"
              onClick={() => mobileSearchRef.current?.focus()}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-[10px] border border-dashed border-black/20 text-[13px] font-semibold text-shio-muted hover:border-black/40 transition"
            >
              + Adicionar produto
            </button>

            {managerError && <p role="alert" className="mt-4 text-sm font-semibold text-shio-danger">{managerError}</p>}

            <div className="mt-4 grid gap-3">
              {loadingProducts ? (
                <div className="rounded-[10px] bg-[#f0f0f0] p-5 text-center text-shio-muted">Carregando produtos...</div>
              ) : allProducts.length > 0 ? allProducts.map((product) => {
                const isLinked = linkedProductIds.has(product.id);
                const productImage = productImageMap[product.id] || getProductImage(product);
                return (
                  <div key={product.id} className="flex items-center gap-3 rounded-[10px] border border-black/10 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-[#f0f0f0]">
                      {productImage && (
                        <img src={productImage} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-black truncate">{product.name}</p>
                      <p className="text-[13px] text-shio-muted">{formatPrice(product)}</p>
                    </div>
                    {renderLinkButton(product, isLinked)}
                  </div>
                );
              }) : (
                <div className="rounded-[10px] bg-[#f0f0f0] p-5 text-center text-shio-muted">Nenhum produto encontrado.</div>
              )}
            </div>
          </div>
        )}

        {/* Attached products list */}
        {products.length > 0 ? (
        <ul aria-label="Produtos do drop" className="space-y-3 p-5">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[#f0f0f0]">
                {(productImageMap[product.id] || getProductImage(product)) && (
                  <img src={productImageMap[product.id] || getProductImage(product)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-black truncate">{product.name}</p>
                <p className="text-[12px] text-shio-muted">Estoque: {getStock(product)}</p>
                <p className="text-[14px] font-semibold text-black">{formatPrice(product)}</p>
              </div>
            </li>
          ))}
        </ul>
        ) : (
          <p className="p-5 text-center text-[14px] text-shio-muted">Nenhum produto associado a este drop.</p>
        )}

        {/* Summary row (when managing) */}
        {isManagingProducts && (
          <div className="border-t border-black/10 px-5 py-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-shio-muted">Total de produtos</span>
              <span>{products.length}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-shio-muted">Receita estimada</span>
              <span className="font-semibold">{formattedRevenue}</span>
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Error message */}
      {actionError && (
        <p role="alert" className="mt-4 rounded-[8px] bg-red-50 px-4 py-3 text-sm font-semibold text-shio-danger">{actionError}</p>
      )}

      {/* Bottom buttons */}
      <div className="mt-6 space-y-3">
        <Link
          to="/admin/drops"
          className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold uppercase tracking-widest text-black"
        >
          FECHAR
        </Link>
        <Link
          to={`/admin/edit-drop/${dropId}`}
          className="flex h-12 w-full items-center justify-center rounded-full bg-black text-[13px] font-bold uppercase tracking-widest text-white"
        >
          EDITAR DROP
        </Link>
        <Link
          to={`/drop/${currentDrop.slug}`}
          className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold uppercase tracking-widest text-black hover:bg-black/5 transition"
        >
          VER PÁGINA PÚBLICA
        </Link>
        <button
          type="button"
          onClick={handleDuplicate}
          className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold uppercase tracking-widest text-black hover:bg-black/5 transition"
        >
          DUPLICAR DROP
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex h-12 w-full items-center justify-center rounded-full bg-shio-danger text-[13px] font-bold uppercase tracking-widest text-white hover:bg-shio-danger-hover transition"
        >
          EXCLUIR DROP
        </button>
      </div>

      </div>{/* end lg:hidden */}

      {/* ── DESKTOP layout ─────────────────────────────── */}
      <div className="hidden lg:block">
        <AdminTitle
          title="Detalhes do Drop"
          action={
            <BlackButton as={Link} to={`/admin/edit-drop/${dropId}`}>
              Editar drop
            </BlackButton>
          }
        />

        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
          {/* Info panel */}
          <AdminPanel className="p-8">
            <div className="flex items-center gap-3">
              <h2 className="text-[24px] font-bold text-black">{currentDrop.name}</h2>
              <span
                className="rounded-full px-3 py-1 text-[12px] font-semibold text-white"
                style={{ backgroundColor: statusBg }}
              >
                {statusLabel}
              </span>
            </div>
            {currentDrop.description && (
              <p className="mt-4 max-w-2xl text-[18px] leading-7 text-shio-muted">{currentDrop.description}</p>
            )}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[14px] bg-[#f0f0f0] p-5 text-[18px] font-semibold">
                Lançamento: {formatDate(currentDrop.launch_date)}
              </div>
              <div className="rounded-[14px] bg-[#f0f0f0] p-5 text-[18px] font-semibold">
                {products.length} produtos
              </div>
              <div className="rounded-[14px] bg-[#f0f0f0] p-5 text-[18px] font-semibold">
                Receita: {formattedRevenue}
              </div>
            </div>
          </AdminPanel>

          {/* Actions panel */}
          <AdminPanel className="p-8">
            <h2 className="text-[24px] font-bold">Ações</h2>
            <div className="mt-6 grid gap-3">
              <Link
                to={`/admin/edit-drop/${dropId}`}
                className="flex h-12 items-center justify-center rounded-[10px] border border-black/20 text-[15px] font-semibold text-black hover:bg-[#f0f0f0] transition"
              >
                Editar drop
              </Link>
              <Link
                to={`/drop/${currentDrop.slug}`}
                className="flex h-12 items-center justify-center rounded-[10px] border border-black/20 text-[15px] font-semibold text-black hover:bg-[#f0f0f0] transition"
              >
                Ver página pública
              </Link>
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex h-12 items-center justify-center rounded-[10px] border border-black/20 text-[15px] font-semibold text-black hover:bg-[#f0f0f0] transition"
              >
                Duplicar drop
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="flex h-12 items-center justify-center rounded-[10px] bg-shio-danger text-[15px] font-semibold text-white hover:bg-shio-danger-hover transition"
              >
                Excluir drop
              </button>
            </div>
            {actionError && (
              <p role="alert" className="mt-4 text-sm font-semibold text-shio-danger">{actionError}</p>
            )}
          </AdminPanel>
        </div>

        {/* Products panel */}
        <AdminPanel className="mt-10">
          <div className="flex items-center justify-between p-8">
            <h2 className="text-[20px] font-bold">Produtos do drop</h2>
            <button
              type="button"
              onClick={() => setIsManagingProducts((v) => !v)}
              aria-expanded={isManagingProducts}
              aria-controls={`${managerId}-desktop`}
              className="inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-black"
            >
              <Icon name={isManagingProducts ? 'close' : 'plus'} className="h-4 w-4" />
              Gerenciar produtos
            </button>
          </div>

          {isManagingProducts && (
            <div id={`${managerId}-desktop`} className="border-t border-black/10 px-8 pb-8">
              <div className="mt-6 flex gap-4">
                <label className="flex flex-1 h-12 items-center gap-3 rounded-full border border-black/20 px-4 text-shio-muted">
                  <Icon name="search" className="h-4 w-4 shrink-0" />
                  <input
                    type="search"
                    aria-label="Buscar produto para o drop"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-full w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-shio-placeholder"
                    placeholder="Buscar produto..."
                  />
                </label>
              </div>
              {managerError && <p role="alert" className="mt-4 text-sm font-semibold text-shio-danger">{managerError}</p>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loadingProducts ? (
                  <div className="col-span-full rounded-[10px] bg-[#f0f0f0] p-5 text-center text-shio-muted">Carregando produtos...</div>
                ) : allProducts.length > 0 ? allProducts.map((product) => {
                  const isLinked = linkedProductIds.has(product.id);
                  const productImage = productImageMap[product.id] || getProductImage(product);
                  return (
                    <div key={product.id} className="flex items-center gap-3 rounded-[10px] border border-black/10 p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-[#f0f0f0]">
                        {productImage && <img src={productImage} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-black truncate">{product.name}</p>
                        <p className="text-[13px] text-shio-muted">{formatPrice(product)}</p>
                      </div>
                      {renderLinkButton(product, isLinked)}
                    </div>
                  );
                }) : (
                  <div className="col-span-full rounded-[10px] bg-[#f0f0f0] p-5 text-center text-shio-muted">Nenhum produto encontrado.</div>
                )}
              </div>
            </div>
          )}

          {products.length > 0 ? (
            // Rola por dentro se faltar espaço (decisão do time, #64); tabIndex deixa rolar pelo teclado.
            <div role="region" aria-label="Produtos do drop" tabIndex={0} className="overflow-x-auto rounded-b-[18px]" style={{ outlineOffset: '-4px' }}>
            <table className="w-full">
              <caption className="sr-only">Produtos do drop</caption>
              <thead>
                <tr className="border-t border-black/10 text-left text-[14px] text-shio-muted">
                  <th className="px-8 py-4 font-medium">Produto</th>
                  <th className="px-8 py-4 font-medium">Preço</th>
                  <th className="px-8 py-4 font-medium">Estoque</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const productImage = productImageMap[product.id] || getProductImage(product);
                  return (
                    <tr key={product.id} className="border-t border-black/10">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[#f0f0f0]">
                            {productImage && <img src={productImage} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <span className="text-[16px] font-semibold text-black">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[16px] text-black">{formatPrice(product)}</td>
                      <td className="px-8 py-5 text-[16px] text-black">{getStock(product)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <p className="px-8 pb-8 text-[16px] text-shio-muted">Nenhum produto associado a este drop.</p>
          )}
        </AdminPanel>
      </div>{/* end hidden lg:block */}

      <p role="status" className="sr-only">{linkStatus}</p>

      {confirmingDelete && (
        <Dialog
          labelledBy="delete-drop-title"
          aria-describedby="delete-drop-warning"
          onClose={() => setConfirmingDelete(false)}
          className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        >
          <h2 id="delete-drop-title" className="mb-1 text-[22px] font-bold uppercase tracking-wide text-black">Excluir drop</h2>
          <p className="mb-5 break-words text-[15px] text-shio-muted">
            Tem certeza que deseja excluir <span className="font-semibold text-black">{currentDrop.name}</span>?
          </p>
          <p id="delete-drop-warning" className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 text-[13px] font-semibold text-shio-warning">
            <span aria-hidden="true">⚠</span>
            <span>Essa ação é permanente. Os produtos associados ficarão sem drop.</span>
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="min-h-12 w-full rounded-full border border-black/25 py-3 text-[15px] font-semibold uppercase text-black transition-colors hover:bg-black/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-disabled={deleting || undefined}
              className="min-h-12 w-full rounded-full bg-shio-danger py-3 text-[15px] font-semibold uppercase text-white transition-colors hover:bg-shio-danger-hover aria-disabled:opacity-60"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </Dialog>
      )}

    </div>
  );
};

export default DropDetailsPage;

import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, BlackButton, Icon, PageMarker } from '../../../components/ui/ShioDesign';

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

  const handleDelete = async () => {
    if (!window.confirm('Excluir este drop? Os produtos associados ficarão sem drop.')) return;
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
      setActionError(err.message);
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
    setUpdatingProductId(product.id);
    setManagerError(null);

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
    } catch (err) {
      setManagerError(err.message);
    } finally {
      setUpdatingProductId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando detalhes do drop...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar o drop. Verifique se o ID é válido.</div>;
  }

  const currentDrop = managedDrop || drop;

  if (!currentDrop) {
    return <div className="p-8 text-center">Drop não encontrado.</div>;
  }

  const products = currentDrop.products || [];
  const linkedProductIds = new Set(products.map((product) => product.id));

  const now = new Date();
  const launchDate = currentDrop.launch_date ? new Date(currentDrop.launch_date) : null;
  let statusLabel;
  let statusColor;
  let statusBg;
  if (currentDrop.is_active && launchDate && launchDate > now) {
    statusLabel = 'Programado';
    statusColor = 'text-[#1d4ed8]';
    statusBg = '#1d4ed8';
  } else if (currentDrop.is_active) {
    statusLabel = 'Ativo';
    statusColor = 'text-[#00a651]';
    statusBg = '#00a651';
  } else if (products.length > 0 && products.every((p) => getStock(p) === 0)) {
    statusLabel = 'Esgotado';
    statusColor = 'text-[#888]';
    statusBg = '#888';
  } else {
    statusLabel = 'Rascunho';
    statusColor = 'text-[#c8970a]';
    statusBg = '#c8970a';
  }

  const revenue = Number(dropRevenueResponse?.[0]?.revenue || 0);
  const formattedRevenue = `R$ ${revenue.toFixed(2)}`;

  return (
    <div>
      <PageMarker name="DropDetailsPage" />

      {/* ── MOBILE layout ─────────────────────────────── */}
      <div className="lg:hidden">

      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-black uppercase">DETALHES DO DROP</h1>
        <Link to="/admin/drops">
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
          <div className="flex justify-between">
            <span className="text-black/50">Nome do drop</span>
            <span className="font-medium">{currentDrop.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50">Data</span>
            <span>{formatDate(currentDrop.launch_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50">Status</span>
            <span className={statusColor}>{statusLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50">Produtos</span>
            <span>{products.length} itens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/50">Receita</span>
            <span>{formattedRevenue}</span>
          </div>
        </div>
        {currentDrop.description && (
          <p className="mt-4 text-[13px] leading-relaxed text-black/55">{currentDrop.description}</p>
        )}
      </AdminPanel>

      {/* Products section */}
      <AdminPanel className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-[16px] font-bold text-black">Produtos do drop</h2>
          <button
            type="button"
            onClick={() => setIsManagingProducts((isOpen) => !isOpen)}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-black"
          >
            <Icon name="plus" className="h-4 w-4" />
            {isManagingProducts ? 'Fechar' : 'Gerenciar'}
          </button>
        </div>

        {isManagingProducts && (
          <div className="border-t border-black/10 p-5">
            {/* Search bar */}
            <label className="flex h-11 items-center gap-3 rounded-full border border-black/20 px-4 text-black/45">
              <Icon name="search" className="h-4 w-4 shrink-0" />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-black/35"
                placeholder="Buscar produto..."
              />
            </label>

            {/* Add product button */}
            <button
              type="button"
              onClick={() => setIsManagingProducts(true)}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-[10px] border border-dashed border-black/20 text-[13px] font-semibold text-black/55 hover:border-black/40 transition"
            >
              + Adicionar produto
            </button>

            {managerError && <p className="mt-4 text-sm font-semibold text-red-500">{managerError}</p>}

            <div className="mt-4 grid gap-3">
              {loadingProducts ? (
                <div className="rounded-[10px] bg-[#f0f0f0] p-5 text-center text-black/55">Carregando produtos...</div>
              ) : allProducts.length > 0 ? allProducts.map((product) => {
                const isLinked = linkedProductIds.has(product.id);
                const productImage = productImageMap[product.id] || getProductImage(product);
                return (
                  <div key={product.id} className="flex items-center gap-3 rounded-[10px] border border-black/10 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-[#f0f0f0]">
                      {productImage && (
                        <img src={productImage} alt={product.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-black truncate">{product.name}</p>
                      <p className="text-[13px] text-black/55">{formatPrice(product)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProductLink(product, !isLinked)}
                      disabled={updatingProductId === product.id}
                      className={`h-9 shrink-0 rounded-full px-4 text-[12px] font-bold uppercase transition disabled:cursor-not-allowed disabled:opacity-60 ${isLinked ? 'border border-black/20 text-black hover:border-black' : 'bg-black text-white hover:bg-black/85'}`}
                    >
                      {updatingProductId === product.id ? '...' : isLinked ? 'Remover' : 'Adicionar'}
                    </button>
                  </div>
                );
              }) : (
                <div className="rounded-[10px] bg-[#f0f0f0] p-5 text-center text-black/55">Nenhum produto encontrado.</div>
              )}
            </div>
          </div>
        )}

        {/* Attached products list */}
        <div className="space-y-3 p-5">
          {products.length > 0 ? products.map((product) => (
            <div key={product.id} className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[#f0f0f0]">
                {(productImageMap[product.id] || getProductImage(product)) && (
                  <img src={productImageMap[product.id] || getProductImage(product)} alt={product.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-black truncate">{product.name}</p>
                <p className="text-[12px] text-black/50">Estoque: {getStock(product)}</p>
                <p className="text-[14px] font-semibold text-black">{formatPrice(product)}</p>
              </div>
            </div>
          )) : (
            <p className="text-center text-[14px] text-black/55">Nenhum produto associado a este drop.</p>
          )}
        </div>

        {/* Summary row (when managing) */}
        {isManagingProducts && (
          <div className="border-t border-black/10 px-5 py-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-black/50">Total de produtos</span>
              <span>{products.length}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-black/50">Receita estimada</span>
              <span className="font-semibold">{formattedRevenue}</span>
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Error message */}
      {actionError && (
        <p className="mt-4 rounded-[8px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{actionError}</p>
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
        <button
          onClick={handleDuplicate}
          className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold uppercase tracking-widest text-black hover:bg-black/5 transition"
        >
          DUPLICAR DROP
        </button>
        <button
          onClick={handleDelete}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#ff3333] text-[13px] font-bold uppercase tracking-widest text-white hover:bg-[#cc0000] transition"
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
              <p className="mt-4 max-w-2xl text-[18px] leading-7 text-black/55">{currentDrop.description}</p>
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
              <button
                onClick={handleDuplicate}
                className="flex h-12 items-center justify-center rounded-[10px] border border-black/20 text-[15px] font-semibold text-black hover:bg-[#f0f0f0] transition"
              >
                Duplicar drop
              </button>
              <button
                onClick={handleDelete}
                className="flex h-12 items-center justify-center rounded-[10px] bg-[#ff3333] text-[15px] font-semibold text-white hover:bg-[#cc0000] transition"
              >
                Excluir drop
              </button>
            </div>
            {actionError && (
              <p className="mt-4 text-sm font-semibold text-red-500">{actionError}</p>
            )}
          </AdminPanel>
        </div>

        {/* Products panel */}
        <AdminPanel className="mt-10 overflow-hidden">
          <div className="flex items-center justify-between p-8">
            <h2 className="text-[20px] font-bold">Produtos do drop</h2>
            <button
              type="button"
              onClick={() => setIsManagingProducts((v) => !v)}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-black"
            >
              <Icon name="plus" className="h-4 w-4" />
              {isManagingProducts ? 'Fechar gerenciamento' : 'Gerenciar produtos'}
            </button>
          </div>

          {isManagingProducts && (
            <div className="border-t border-black/10 px-8 pb-8">
              <div className="mt-6 flex gap-4">
                <label className="flex flex-1 h-11 items-center gap-3 rounded-full border border-black/20 px-4 text-black/45">
                  <Icon name="search" className="h-4 w-4 shrink-0" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-transparent text-[14px] outline-none placeholder:text-black/35"
                    placeholder="Buscar produto..."
                  />
                </label>
              </div>
              {managerError && <p className="mt-4 text-sm font-semibold text-red-500">{managerError}</p>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loadingProducts ? (
                  <div className="col-span-full rounded-[10px] bg-[#f0f0f0] p-5 text-center text-black/55">Carregando produtos...</div>
                ) : allProducts.length > 0 ? allProducts.map((product) => {
                  const isLinked = linkedProductIds.has(product.id);
                  const productImage = productImageMap[product.id] || getProductImage(product);
                  return (
                    <div key={product.id} className="flex items-center gap-3 rounded-[10px] border border-black/10 p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-[#f0f0f0]">
                        {productImage && <img src={productImage} alt={product.name} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-black truncate">{product.name}</p>
                        <p className="text-[13px] text-black/55">{formatPrice(product)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProductLink(product, !isLinked)}
                        disabled={updatingProductId === product.id}
                        className={`h-9 shrink-0 rounded-full px-4 text-[12px] font-bold uppercase transition disabled:opacity-60 ${isLinked ? 'border border-black/20 text-black hover:border-black' : 'bg-black text-white hover:bg-black/85'}`}
                      >
                        {updatingProductId === product.id ? '...' : isLinked ? 'Remover' : 'Adicionar'}
                      </button>
                    </div>
                  );
                }) : (
                  <div className="col-span-full rounded-[10px] bg-[#f0f0f0] p-5 text-center text-black/55">Nenhum produto encontrado.</div>
                )}
              </div>
            </div>
          )}

          {products.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-t border-black/10 text-left text-[14px] text-black/55">
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
                            {productImage && <img src={productImage} alt={product.name} className="h-full w-full object-cover" />}
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
          ) : (
            <p className="px-8 pb-8 text-[16px] text-black/55">Nenhum produto associado a este drop.</p>
          )}
        </AdminPanel>
      </div>{/* end hidden lg:block */}

    </div>
  );
};

export default DropDetailsPage;

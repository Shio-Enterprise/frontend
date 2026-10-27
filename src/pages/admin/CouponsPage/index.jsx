import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import CouponEmailModal from '../../../components/admin/CouponEmailModal';
import { AdminPanel, AdminTitle, BlackButton, Icon, ActionMenu } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

function formatMoney(value) {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Mesma ordem de prioridade que o backend usa para recusar o envio por e-mail.
function couponStatus(coupon) {
  if (!coupon.is_active) return 'Inativo';
  if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) return 'Vencido';
  if (coupon.max_uses_total != null && coupon.uses_count >= coupon.max_uses_total) return 'Esgotado';
  return 'Ativo';
}

const STATUS_STYLES = {
  Ativo: 'bg-green-50 text-green-700 ring-green-600/20',
  Inativo: 'bg-red-50 text-red-700 ring-red-600/10',
  Vencido: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Esgotado: 'bg-amber-50 text-amber-800 ring-amber-600/20',
};

function optional(value, parse) {
  return value === '' || value == null ? null : parse(value);
}

const FIELD_LABELS = {
  code: 'Código',
  description: 'Descrição',
  discount_type: 'Tipo de Desconto',
  discount_value: 'Valor',
  max_discount_amount: 'Teto de Desconto',
  min_order_value: 'Valor Mínimo do Pedido',
  starts_at: 'Início',
  expiration_date: 'Fim',
  max_uses_total: 'Usos Totais',
  max_uses_per_user: 'Usos por Usuário',
  drops: 'Drops Válidos',
  categories: 'Categorias Válidas',
  partner: 'Parceiro',
};

// Erros do DRF chegam como { campo: ["mensagem"] }; vira "Rótulo: mensagem".
function formatSaveError(data) {
  if (!data || typeof data !== 'object') return 'Erro ao salvar cupom';
  if (data.detail) return data.detail;
  const lines = Object.entries(data).map(([field, messages]) => {
    const text = Array.isArray(messages) ? messages.join(' ') : String(messages);
    return field === 'non_field_errors' ? text : `${FIELD_LABELS[field] || field}: ${text}`;
  });
  return lines.join('\n') || 'Erro ao salvar cupom';
}

// ─── Drawer Component ────────────────────────────────────────────────────────

function CouponDrawer({ coupon, onClose, onSaved }) {
  const isEditing = !!coupon;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [code, setCode] = useState(coupon?.code || '');
  const [description, setDescription] = useState(coupon?.description || '');
  const [discountType, setDiscountType] = useState(coupon?.discount_type || 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(coupon?.discount_value || '');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(coupon?.max_discount_amount || '');
  const [minOrderValue, setMinOrderValue] = useState(coupon?.min_order_value || '');
  const [startsAt, setStartsAt] = useState(coupon?.starts_at ? coupon.starts_at.slice(0, 16) : '');
  const [expirationDate, setExpirationDate] = useState(coupon?.expiration_date ? coupon.expiration_date.slice(0, 16) : '');
  const [maxUsesTotal, setMaxUsesTotal] = useState(coupon?.max_uses_total ?? '');
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(coupon?.max_uses_per_user || '');
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(coupon?.first_purchase_only || false);
  const [autoApply, setAutoApply] = useState(coupon?.auto_apply || false);
  const [isActive, setIsActive] = useState(coupon ? coupon.is_active : true);
  const [partner, setPartner] = useState(coupon?.partner || '');
  
  // Scopes (multi-select)
  const { data: catalogData } = useApi('/api/catalog/categories/');
  const { data: dropsData } = useApi('/api/catalog/drops/');
  
  const categoriesList = catalogData?.results || catalogData || [];
  const dropsList = dropsData?.results || dropsData || [];
  
  const [selectedDrops, setSelectedDrops] = useState(coupon?.drops || []);
  const [selectedCategories, setSelectedCategories] = useState(coupon?.categories || []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      code,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      is_active: isActive,
      first_purchase_only: firstPurchaseOnly,
      auto_apply: autoApply,
      partner,
      drops: selectedDrops,
      categories: selectedCategories
    };

    // Campo vazio vira null: ao editar, é assim que o limite volta a "sem limite".
    payload.max_discount_amount = optional(maxDiscountAmount, (v) => v);
    payload.min_order_value = optional(minOrderValue, (v) => v);
    payload.starts_at = optional(startsAt, (v) => new Date(v).toISOString());
    payload.expiration_date = optional(expirationDate, (v) => new Date(v).toISOString());
    payload.max_uses_total = optional(maxUsesTotal, (v) => parseInt(v, 10));
    payload.max_uses_per_user = optional(maxUsesPerUser, (v) => parseInt(v, 10));

    try {
      const token = getAccessToken();
      const url = isEditing ? `${API_BASE_URL}/api/orders/admin/coupons/${coupon.id}/` : `${API_BASE_URL}/api/orders/admin/coupons/`;
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(formatSaveError(data));
      }

      onSaved(data, { created: !isEditing });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white shadow-xl h-full flex flex-col overflow-hidden animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold uppercase tracking-tight">{isEditing ? 'Editar Cupom' : 'Novo Cupom'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <Icon name="close" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form id="coupon-form" onSubmit={handleSave} className="space-y-5">
            {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md whitespace-pre-line">{error}</div>}
            
            <div>
              <label className="block text-sm font-semibold mb-1">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isEditing && coupon.uses_count > 0}
                className="w-full border rounded-md px-3 py-2 uppercase"
                required
                placeholder="Ex: VERAO20"
              />
              {isEditing && coupon.uses_count > 0 && (
                <p className="text-xs text-gray-500 mt-1">O código não pode ser alterado pois já possui usos.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Ex: Campanha Dia dos Namorados"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Tipo de Desconto</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="PERCENTAGE">Porcentagem (%)</option>
                  <option value="FIXED_VALUE">Valor Fixo (R$)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  required
                />
              </div>
            </div>

            {discountType === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-semibold mb-1">Teto de Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Valor máximo descontado"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">Valor Mínimo do Pedido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Aplicado ao subtotal"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Início</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Fim</label>
                <input
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Usos Totais</label>
                <input
                  type="number"
                  min="1"
                  value={maxUsesTotal}
                  onChange={(e) => setMaxUsesTotal(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Ilimitado"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Usos por Usuário</label>
                <input
                  type="number"
                  min="1"
                  value={maxUsesPerUser}
                  onChange={(e) => setMaxUsesPerUser(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Normal: 1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Drops Válidos (opcional)</label>
              <select
                multiple
                value={selectedDrops}
                onChange={(e) => setSelectedDrops(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {dropsList.map(drop => (
                  <option key={drop.id} value={drop.id}>{drop.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Categorias Válidas (opcional)</label>
              <select
                multiple
                value={selectedCategories}
                onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={firstPurchaseOnly} onChange={e => setFirstPurchaseOnly(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium">Apenas Primeira Compra</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoApply} onChange={e => setAutoApply(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium">Aplicação Automática</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium">Cupom Ativo</span>
              </label>
            </div>
            
            <div className="pt-2">
              <label className="block text-sm font-semibold mb-1">Parceiro (Méliuz, Influenciador)</label>
              <input
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Ex: MELIUZ"
              />
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold border rounded-md hover:bg-gray-100">
            Cancelar
          </button>
          <BlackButton type="submit" form="coupon-form" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Cupom'}
          </BlackButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [emailCoupon, setEmailCoupon] = useState(null);
  const [justCreated, setJustCreated] = useState(null);
  
  const { data: responseData, loading, refetch } = useApi('/api/orders/admin/coupons/');
  const coupons = responseData?.results || responseData || [];

  const handleCreate = () => {
    setEditingCoupon(null);
    setDrawerOpen(true);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setDrawerOpen(true);
  };

  const handleToggleActive = async (coupon) => {
    if (!window.confirm(`Tem certeza que deseja ${coupon.is_active ? 'desativar' : 'ativar'} o cupom ${coupon.code}?`)) return;
    
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/coupons/${coupon.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !coupon.is_active })
      });
      if (res.ok) refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(coupon.uses_count > 0 ? `Este cupom já possui usos e será DESATIVADO em vez de apagado. Confirmar?` : `Deseja realmente apagar o cupom ${coupon.code}?`)) return;

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/coupons/${coupon.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const emailDisabledReason = (coupon) => {
    const status = couponStatus(coupon);
    return status === 'Ativo' ? null : `Cupom ${status.toLowerCase()}`;
  };

  return (
    <AdminPanel className="p-6">
      <AdminTitle 
        eyebrow="Promoções" 
        title="Cupons de Desconto" 
        action={<BlackButton onClick={handleCreate}>+ Novo Cupom</BlackButton>} 
      />

      <div className="mt-8 bg-white border border-black/10 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[11px] tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Código / Status</th>
                <th className="px-6 py-4">Regras</th>
                <th className="px-6 py-4">Usos (Restantes)</th>
                <th className="px-6 py-4 text-right">Performance</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading && <tr><td colSpan="5" className="p-6 text-center text-gray-500">Carregando...</td></tr>}
              {!loading && coupons.length === 0 && (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">Nenhum cupom cadastrado.</td></tr>
              )}
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{coupon.code}</span>
                      <span className="text-xs text-gray-500">{coupon.description || 'Sem descrição'}</span>
                      <div className="mt-2 flex gap-2">
                        <span data-testid="coupon-status" className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[couponStatus(coupon)]}`}>
                          {couponStatus(coupon)}
                        </span>
                        {coupon.auto_apply && (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">Automático</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm text-gray-700 space-y-1">
                      <span>{coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : formatMoney(coupon.discount_value)} de desconto</span>
                      {coupon.min_order_value && <span className="text-xs text-gray-500">Min: {formatMoney(coupon.min_order_value)}</span>}
                      {coupon.first_purchase_only && <span className="text-xs text-gray-500">Apenas 1ª Compra</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{coupon.uses_count} usos</span>
                      {coupon.max_uses_total != null ? (
                        <span className="text-xs text-gray-500">{coupon.remaining_uses} restantes</span>
                      ) : (
                        <span className="text-xs text-gray-500">Ilimitado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col">
                      <span className="font-semibold text-green-700">{formatMoney(coupon.revenue)} gerado</span>
                      <span className="text-xs text-red-500">-{formatMoney(coupon.total_discount_given)} descontado</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionMenu
                      label="Ações"
                      items={[
                        { label: 'Editar Cupom', onClick: () => handleEdit(coupon) },
                        {
                          label: 'Enviar por e-mail',
                          disabled: !!emailDisabledReason(coupon),
                          title: emailDisabledReason(coupon) || undefined,
                          onClick: () => setEmailCoupon(coupon),
                        },
                        { label: coupon.is_active ? 'Desativar' : 'Reativar', onClick: () => handleToggleActive(coupon) },
                        { label: 'Deletar', onClick: () => handleDelete(coupon) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <CouponDrawer 
          coupon={editingCoupon} 
          onClose={() => setDrawerOpen(false)} 
          onSaved={(saved, { created }) => {
            setDrawerOpen(false);
            refetch();
            if (created && saved?.id) setJustCreated(saved);
          }} 
        />
      )}

      {justCreated && !emailCoupon && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl space-y-4">
            <p className="text-sm font-semibold">Cupom {justCreated.code} criado. Quer enviar este cupom por e-mail para os clientes agora?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setJustCreated(null)} className="px-4 py-2 text-sm font-bold border rounded-md hover:bg-gray-100">
                Agora não
              </button>
              <BlackButton onClick={() => { setEmailCoupon(justCreated); setJustCreated(null); }}>
                Enviar por e-mail
              </BlackButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {emailCoupon && (
        <CouponEmailModal coupon={emailCoupon} onClose={() => setEmailCoupon(null)} />
      )}
    </AdminPanel>
  );
}

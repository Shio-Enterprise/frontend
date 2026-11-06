import { useEffect, useId, useRef, useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
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

  const baseId = useId();
  const ids = Object.fromEntries(
    ['title', 'error', 'code', 'codeHint', 'description', 'discountType', 'discountValue', 'maxDiscount', 'minOrder',
      'startsAt', 'expiration', 'maxUses', 'maxPerUser', 'multiHint', 'drops', 'categories', 'partner']
      .map((name) => [name, `${baseId}-${name}`]),
  );

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

  const fieldClass = 'min-h-11 w-full rounded-md border border-black/25 px-3 py-2 text-[16px] md:text-sm';
  const labelClass = 'mb-1 block text-sm font-semibold';
  const codeLocked = isEditing && coupon.uses_count > 0;

  return (
    // Painel lateral como modal (#64): foco preso, Esc fecha, foco volta ao botão de origem.
    <Dialog
      labelledBy={ids.title}
      onClose={onClose}
      overlayClassName="bg-black/40"
      className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-xl animate-slide-in-right"
    >
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 id={ids.title} className="text-xl font-bold uppercase tracking-tight">{isEditing ? 'Editar Cupom' : 'Novo Cupom'}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="coupon-form" onSubmit={handleSave} aria-describedby={error ? ids.error : undefined} className="space-y-5">
            {error && <div id={ids.error} role="alert" className="whitespace-pre-line rounded-md bg-red-50 p-3 text-sm text-shio-danger">{error}</div>}

            <div>
              <label htmlFor={ids.code} className={labelClass}>Código</label>
              <input
                id={ids.code}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={codeLocked}
                aria-describedby={codeLocked ? ids.codeHint : undefined}
                className={`${fieldClass} uppercase`}
                required
                placeholder="Ex: VERAO20"
              />
              {codeLocked && (
                <p id={ids.codeHint} className="mt-1 text-xs text-shio-muted">O código não pode ser alterado pois já possui usos.</p>
              )}
            </div>

            <div>
              <label htmlFor={ids.description} className={labelClass}>Descrição</label>
              <input
                id={ids.description}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldClass}
                placeholder="Ex: Campanha Dia dos Namorados"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.discountType} className={labelClass}>Tipo de Desconto</label>
                <select
                  id={ids.discountType}
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className={fieldClass}
                >
                  <option value="PERCENTAGE">Porcentagem (%)</option>
                  <option value="FIXED_VALUE">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label htmlFor={ids.discountValue} className={labelClass}>Valor</label>
                <input
                  id={ids.discountValue}
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={fieldClass}
                  required
                />
              </div>
            </div>

            {discountType === 'PERCENTAGE' && (
              <div>
                <label htmlFor={ids.maxDiscount} className={labelClass}>Teto de Desconto (R$)</label>
                <input
                  id={ids.maxDiscount}
                  type="number"
                  step="0.01"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  className={fieldClass}
                  placeholder="Valor máximo descontado"
                />
              </div>
            )}

            <div>
              <label htmlFor={ids.minOrder} className={labelClass}>Valor Mínimo do Pedido (R$)</label>
              <input
                id={ids.minOrder}
                type="number"
                step="0.01"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className={fieldClass}
                placeholder="Aplicado ao subtotal"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.startsAt} className={labelClass}>Início</label>
                <input
                  id={ids.startsAt}
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor={ids.expiration} className={labelClass}>Fim</label>
                <input
                  id={ids.expiration}
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.maxUses} className={labelClass}>Usos Totais</label>
                <input
                  id={ids.maxUses}
                  type="number"
                  min="1"
                  value={maxUsesTotal}
                  onChange={(e) => setMaxUsesTotal(e.target.value)}
                  className={fieldClass}
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <label htmlFor={ids.maxPerUser} className={labelClass}>Usos por Usuário</label>
                <input
                  id={ids.maxPerUser}
                  type="number"
                  min="1"
                  value={maxUsesPerUser}
                  onChange={(e) => setMaxUsesPerUser(e.target.value)}
                  className={fieldClass}
                  placeholder="Normal: 1"
                />
              </div>
            </div>

            <p id={ids.multiHint} className="text-xs text-shio-muted">
              Para escolher mais de um item nas listas abaixo, segure Ctrl (ou Cmd no Mac) ao clicar. Sem nada escolhido, vale para todos.
            </p>

            <div>
              <label htmlFor={ids.drops} className={labelClass}>Drops Válidos (opcional)</label>
              <select
                id={ids.drops}
                multiple
                aria-describedby={ids.multiHint}
                value={selectedDrops}
                onChange={(e) => setSelectedDrops(Array.from(e.target.selectedOptions, option => option.value))}
                className={fieldClass}
              >
                {dropsList.map(drop => (
                  <option key={drop.id} value={drop.id}>{drop.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={ids.categories} className={labelClass}>Categorias Válidas (opcional)</label>
              <select
                id={ids.categories}
                multiple
                aria-describedby={ids.multiHint}
                value={selectedCategories}
                onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, option => option.value))}
                className={fieldClass}
              >
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <fieldset className="mt-4 border-t pt-2">
              <legend className="sr-only">Opções do cupom</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={firstPurchaseOnly} onChange={e => setFirstPurchaseOnly(e.target.checked)} className="h-5 w-5 accent-black" />
                <span className="text-sm font-medium">Apenas Primeira Compra</span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={autoApply} onChange={e => setAutoApply(e.target.checked)} className="h-5 w-5 accent-black" />
                <span className="text-sm font-medium">Aplicação Automática</span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-5 w-5 accent-black" />
                <span className="text-sm font-medium">Cupom Ativo</span>
              </label>
            </fieldset>

            <div className="pt-2">
              <label htmlFor={ids.partner} className={labelClass}>Parceiro (Méliuz, Influenciador)</label>
              <input
                id={ids.partner}
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                className={fieldClass}
                placeholder="Ex: MELIUZ"
              />
            </div>
          </form>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t bg-gray-50 p-4">
          <button type="button" onClick={onClose} className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5">
            Cancelar
          </button>
          <BlackButton type="submit" form="coupon-form" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Cupom'}
          </BlackButton>
        </div>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [emailCoupon, setEmailCoupon] = useState(null);
  const [justCreated, setJustCreated] = useState(null);
  // { kind: 'toggle' | 'delete', coupon }: confirmação em <Dialog> no lugar do window.confirm (#64).
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState(null);
  // Depois de salvar/desativar/apagar, o foco vai para o aviso do resultado (#64).
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);
  const confirmTitleId = useId();
  const createdTitleId = useId();

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const { data: responseData, loading, error: loadError, refetch } = useApi('/api/orders/admin/coupons/');
  const coupons = loadError ? [] : responseData?.results || responseData || [];

  const handleCreate = () => {
    setEditingCoupon(null);
    setDrawerOpen(true);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setDrawerOpen(true);
  };

  const runConfirmed = async () => {
    if (!confirm || working) return;
    const { kind, coupon } = confirm;
    setWorking(true);
    setActionError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/coupons/${coupon.id}/`, kind === 'toggle'
        ? {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_active: !coupon.is_active }),
        }
        : { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Não foi possível concluir a ação no cupom.');
      if (kind === 'toggle') setNotice({ text: `Cupom ${coupon.code} ${coupon.is_active ? 'desativado' : 'reativado'}.` });
      else setNotice({ text: coupon.uses_count > 0 ? `Cupom ${coupon.code} desativado.` : `Cupom ${coupon.code} apagado.` });
      refetch();
    } catch (err) {
      setActionError(err.message || 'Não foi possível concluir a ação no cupom.');
    } finally {
      setConfirm(null);
      setWorking(false);
    }
  };

  const confirmText = (() => {
    if (!confirm) return null;
    const { kind, coupon } = confirm;
    if (kind === 'toggle') {
      return {
        title: `${coupon.is_active ? 'Desativar' : 'Reativar'} o cupom ${coupon.code}?`,
        submit: coupon.is_active ? 'Desativar' : 'Reativar',
        danger: coupon.is_active,
      };
    }
    return coupon.uses_count > 0
      ? { title: `Desativar o cupom ${coupon.code}?`, body: 'Este cupom já possui usos e será desativado em vez de apagado.', submit: 'Desativar', danger: true }
      : { title: `Apagar o cupom ${coupon.code}?`, body: 'Esta ação não pode ser desfeita.', submit: 'Apagar', danger: true };
  })();

  const emailDisabledReason = (coupon) => {
    const status = couponStatus(coupon);
    return status === 'Ativo' ? null : `Cupom ${status.toLowerCase()}`;
  };

  return (
    <AdminPanel className="p-4 md:p-6">
      <AdminTitle 
        eyebrow="Promoções" 
        title="Cupons de Desconto" 
        action={<BlackButton onClick={handleCreate}>+ Novo Cupom</BlackButton>} 
      />

      {actionError && (
        <div role="alert" className="mb-4 rounded-[10px] bg-red-50 px-5 py-3 text-sm font-semibold text-shio-danger">
          {actionError}
          <button type="button" className="ml-3 min-h-11 underline" onClick={() => setActionError(null)}>Fechar</button>
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        {/* No celular a tabela rola para o lado dentro da caixa; a página não rola (#64, decisão B). */}
        <div role="region" aria-label="Tabela de cupons" tabIndex={0} className="overflow-x-auto focus-visible:outline-offset-[-2px]!">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Cupons de desconto</caption>
            <thead className="border-b bg-gray-50 text-[12px] font-semibold uppercase tracking-wider text-shio-muted">
              <tr>
                <th className="px-6 py-4">Código / Status</th>
                <th className="px-6 py-4">Regras</th>
                <th className="whitespace-nowrap px-6 py-4">Usos (Restantes)</th>
                <th className="px-6 py-4 text-right">Performance</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading && <tr><td colSpan="5" role="status" className="p-6 text-center text-shio-muted">Carregando...</td></tr>}
              {!loading && loadError && (
                <tr><td colSpan="5" role="alert" className="p-6 text-center text-shio-danger">Erro ao carregar cupons. Tente novamente.</td></tr>
              )}
              {!loading && !loadError && coupons.length === 0 && (
                <tr><td colSpan="5" className="p-6 text-center text-shio-muted">Nenhum cupom cadastrado.</td></tr>
              )}
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex min-w-40 flex-col">
                      <span className="font-bold text-gray-900">{coupon.code}</span>
                      <span className="text-xs text-shio-muted">{coupon.description || 'Sem descrição'}</span>
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
                    <div className="flex min-w-36 flex-col space-y-1 text-sm text-gray-700">
                      <span>{coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : formatMoney(coupon.discount_value)} de desconto</span>
                      {coupon.min_order_value && <span className="text-xs text-shio-muted">Min: {formatMoney(coupon.min_order_value)}</span>}
                      {coupon.first_purchase_only && <span className="text-xs text-shio-muted">Apenas 1ª Compra</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col whitespace-nowrap">
                      <span className="font-semibold text-gray-900">{coupon.uses_count} usos</span>
                      {coupon.max_uses_total != null ? (
                        <span className="text-xs text-shio-muted">{coupon.remaining_uses} restantes</span>
                      ) : (
                        <span className="text-xs text-shio-muted">Ilimitado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col whitespace-nowrap">
                      <span className="font-semibold text-green-700">{formatMoney(coupon.revenue)} gerado</span>
                      <span className="text-xs text-shio-danger">-{formatMoney(coupon.total_discount_given)} descontado</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionMenu
                      label={`Ações para o cupom ${coupon.code}`}
                      items={[
                        { label: 'Editar Cupom', onClick: () => handleEdit(coupon) },
                        {
                          label: 'Enviar por e-mail',
                          disabled: !!emailDisabledReason(coupon),
                          title: emailDisabledReason(coupon) || undefined,
                          onClick: () => setEmailCoupon(coupon),
                        },
                        { label: coupon.is_active ? 'Desativar' : 'Reativar', onClick: () => setConfirm({ kind: 'toggle', coupon }) },
                        { separator: true, key: 'sep' },
                        { label: 'Deletar', danger: true, icon: 'trash', onClick: () => setConfirm({ kind: 'delete', coupon }) },
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
            else setNotice({ text: `Cupom ${saved?.code ?? ''} salvo.` });
          }} 
        />
      )}

      {justCreated && !emailCoupon && (
        <Dialog
          labelledBy={createdTitleId}
          onClose={() => setJustCreated(null)}
          className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl"
        >
          <p id={createdTitleId} className="text-sm font-semibold">Cupom {justCreated.code} criado. Quer enviar este cupom por e-mail para os clientes agora?</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setJustCreated(null)} className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5">
              Agora não
            </button>
            <BlackButton onClick={() => { setEmailCoupon(justCreated); setJustCreated(null); }}>
              Enviar por e-mail
            </BlackButton>
          </div>
        </Dialog>
      )}

      {confirm && confirmText && (
        <Dialog
          labelledBy={confirmTitleId}
          onClose={() => !working && setConfirm(null)}
          className="w-full max-w-md rounded-[18px] bg-white p-6"
        >
          <h2 id={confirmTitleId} className="text-[20px] font-bold text-black">{confirmText.title}</h2>
          {confirmText.body && <p className="mt-2 text-[14px] text-shio-muted">{confirmText.body}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={working}
              className="h-11 rounded-full border border-black/15 px-6 text-sm font-medium text-black transition hover:border-black"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={runConfirmed}
              disabled={working}
              className={`h-11 rounded-full px-6 text-sm font-medium text-white transition disabled:opacity-40 ${confirmText.danger ? 'bg-shio-danger hover:bg-shio-danger-hover' : 'bg-black hover:bg-black/80'}`}
            >
              {working ? 'Salvando...' : confirmText.submit}
            </button>
          </div>
        </Dialog>
      )}

      {emailCoupon && (
        <CouponEmailModal coupon={emailCoupon} onClose={() => setEmailCoupon(null)} />
      )}

      <p ref={noticeRef} tabIndex={-1} role="status" className="sr-only">{notice?.text}</p>
    </AdminPanel>
  );
}

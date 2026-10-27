import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import {
  GUIDE_SIZES, addColumn, emptyGuideForm, formProblem, formToPayload, guideSaveError, guideToForm,
  removeColumn, setRangeValue, toggleCategory, toggleGuideSize,
} from '../../../lib/sizeGuideForm';
import { ActionMenu, AdminPanel, AdminTitle, BlackButton, Icon } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Faixa total de uma medida no guia: do mín do menor tamanho ao máx do maior.
const measureSpan = (guide, key) => {
  const first = guide.rows[0]?.measures[key];
  const last = guide.rows.at(-1)?.measures[key];
  return first && last ? `${first[0]}–${last[1]} cm` : '—';
};

function RangeInput({ form, setForm, row, column, index }) {
  return (
    <input
      type="number"
      min="1"
      step="0.5"
      aria-label={`${column.label} ${index ? 'máx' : 'mín'} ${row.size}`}
      value={row.measures[column.key][index]}
      onChange={(event) => setForm(setRangeValue(form, row.size, column.key, index, event.target.value))}
      className="w-16 rounded-md border px-2 py-1 text-sm"
    />
  );
}

function GuideDrawer({ guide, guides, onClose, onSaved }) {
  const isEditing = !!guide;
  const [form, setForm] = useState(() => (guide ? guideToForm(guide) : emptyGuideForm()));
  const [newColumn, setNewColumn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { data: categoriesData } = useApi('/api/catalog/categories/');
  const categories = categoriesData?.results || categoriesData || [];

  // Guia que cada categoria usa hoje, para avisar quando ela vai mudar de guia.
  const currentGuideOf = (categoryId) => guides.find(
    (other) => other.id !== guide?.id && other.categories.includes(categoryId),
  );

  const handleAddColumn = () => {
    setForm((current) => addColumn(current, newColumn));
    setNewColumn('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const problem = formProblem(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = isEditing ? `${API_BASE_URL}/api/catalog/size-guides/${guide.id}/` : `${API_BASE_URL}/api/catalog/size-guides/`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(guideSaveError(data));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="guide-drawer-title" className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="guide-drawer-title" className="text-xl font-bold uppercase tracking-tight">{isEditing ? 'Editar guia' : 'Novo guia'}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 hover:bg-gray-100">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="guide-form" onSubmit={handleSave} className="space-y-6">
            {error && <div role="alert" className="whitespace-pre-line rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</div>}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Nome</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ex: Parte de cima"
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Medidas (cm)</legend>
              <div className="flex flex-wrap gap-2">
                {form.columns.map((column) => (
                  <span key={column.key} className="inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] px-3 py-1 text-sm">
                    {column.label}
                    <button type="button" aria-label={`Remover ${column.label}`} onClick={() => setForm(removeColumn(form, column.key))} className="text-black/50 hover:text-black">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  aria-label="Nova medida"
                  value={newColumn}
                  onChange={(event) => setNewColumn(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddColumn();
                    }
                  }}
                  placeholder="Ex: Tórax"
                  className="flex-1 rounded-md border px-3 py-2"
                />
                <button type="button" onClick={handleAddColumn} className="rounded-md border px-4 py-2 text-sm font-bold hover:bg-gray-100">Adicionar medida</button>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Tamanhos</legend>
              <div className="flex flex-wrap gap-3">
                {GUIDE_SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.rows.some((row) => row.size === size)} onChange={() => setForm(toggleGuideSize(form, size))} />
                    {size}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.rows.length > 0 && form.columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Tamanho</th>
                      {form.columns.map((column) => <th key={column.key} className="py-2 pr-4">{column.label} (mín–máx)</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {form.rows.map((row) => (
                      <tr key={row.size}>
                        <th scope="row" className="py-2 pr-4 font-bold">{row.size}</th>
                        {form.columns.map((column) => (
                          <td key={column.key} className="py-2 pr-4">
                            <div className="flex items-center gap-1">
                              <RangeInput form={form} setForm={setForm} row={row} column={column} index={0} />
                              <span>–</span>
                              <RangeInput form={form} setForm={setForm} row={row} column={column} index={1} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-gray-500">Medidas do corpo. O máx de um tamanho pode ser o mín do próximo; os tamanhos precisam crescer na ordem.</p>
              </div>
            )}

            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Categorias que usam este guia</legend>
              {categories.length === 0 && <p className="text-sm text-gray-500">Nenhuma categoria cadastrada.</p>}
              <div className="space-y-1">
                {categories.map((category) => {
                  const other = currentGuideOf(category.id);
                  const checked = form.categories.includes(category.id);
                  return (
                    <label key={category.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => setForm(toggleCategory(form, category.id))} />
                      {category.name}
                      {other && (
                        <span className="text-xs text-gray-500">
                          {checked ? `(sai de “${other.name}”)` : `(usa “${other.name}”)`}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </form>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t bg-gray-50 p-4">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-bold hover:bg-gray-100">Cancelar</button>
          <BlackButton type="submit" form="guide-form" disabled={saving}>{saving ? 'Salvando...' : 'Salvar guia'}</BlackButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SizeGuidesPage() {
  const [drawer, setDrawer] = useState(null);
  const [actionError, setActionError] = useState(null);
  const { data, loading, error, refetch } = useApi('/api/catalog/size-guides/');
  const guides = Array.isArray(data) ? data : data?.results || [];

  const handleDelete = async (guide) => {
    const linked = guide.category_details.map((c) => c.name).join(', ');
    const warning = linked ? ` As categorias ${linked} ficarão sem tabela de medidas na loja.` : '';
    if (!window.confirm(`Excluir o guia “${guide.name}”?${warning}`)) return;
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/catalog/size-guides/${guide.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (!response.ok) throw new Error();
      refetch();
    } catch {
      setActionError('Não foi possível excluir o guia.');
    }
  };

  return (
    <AdminPanel className="p-6">
      <AdminTitle
        eyebrow="Catálogo"
        title="Guias de medidas"
        action={<BlackButton onClick={() => setDrawer({ guide: null })}>+ Novo guia</BlackButton>}
      />
      <p className="-mt-4 mb-6 text-sm text-black/55">A tabela de medidas aparece na página dos produtos das categorias ligadas a cada guia.</p>
      {actionError && <p role="alert" className="mb-4 text-sm font-semibold text-red-600">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Guia</th>
                <th className="px-6 py-4">Tamanhos</th>
                <th className="px-6 py-4">Medidas</th>
                <th className="px-6 py-4">Categorias</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading && <tr><td colSpan="5" className="p-6 text-center text-gray-500">Carregando...</td></tr>}
              {!loading && error && <tr><td colSpan="5" className="p-6 text-center text-red-600">Não foi possível carregar os guias.</td></tr>}
              {!loading && !error && guides.length === 0 && (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">Nenhum guia cadastrado.</td></tr>
              )}
              {guides.map((guide) => (
                <tr key={guide.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{guide.name}</td>
                  <td className="px-6 py-4 text-gray-700">{guide.rows.map((row) => row.size).join(', ')}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {guide.columns.map((column) => (
                      <span key={column.key} className="block">
                        {column.label}: {measureSpan(guide, column.key)}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {guide.category_details.length ? guide.category_details.map((c) => c.name).join(', ') : <span className="text-gray-400">Nenhuma</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionMenu
                      label="Ações"
                      items={[
                        { label: 'Editar guia', onClick: () => setDrawer({ guide }) },
                        { label: 'Excluir', onClick: () => handleDelete(guide) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <GuideDrawer
          guide={drawer.guide}
          guides={guides}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            refetch();
          }}
        />
      )}
    </AdminPanel>
  );
}

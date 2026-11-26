import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../../../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const base = `${API_BASE_URL}/api/catalog/homepage/`;
const emptyForm = { alt_text: '', link: '', image_desktop: null, image_mobile: null, remove_image_mobile: false };

function authHeaders(json = false) {
  return {
    Authorization: `Bearer ${getAccessToken()}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(base + path, options);
  if (response.ok) return response.status === 204 ? null : response.json();
  let details;
  try { details = await response.json(); } catch { details = null; }
  const fieldMessage = details && typeof details === 'object'
    ? Object.entries(details).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(' ')
    : '';
  throw new Error(fieldMessage || 'Não foi possível salvar a página inicial.');
}

function checkFile(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Use uma imagem JPEG, PNG ou WebP.';
  if (file.size > 5 * 1024 * 1024) return 'A imagem não pode passar de 5 MB.';
  return '';
}

function ImagePicker({ id, label, buttonLabel, file, onChange, disabled, keepExisting, currentSrc }) {
  const inputRef = useRef(null);

  return <div className="grid gap-2">
    <label htmlFor={id} className="text-sm font-medium text-black">{label}</label>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-black/25 bg-[#fafafa] p-4">
      {currentSrc && !file && <figure className="flex items-center gap-2">
        <img src={currentSrc} alt="" className="h-12 w-20 rounded object-cover" />
        <figcaption className="text-xs text-black/60">Imagem atual</figcaption>
      </figure>}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        tabIndex={-1}
        className="sr-only"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        {buttonLabel}
      </button>
      <span className="min-w-0 break-all text-sm text-black/60" aria-live="polite">
        {file?.name || (keepExisting ? 'Nenhuma nova imagem — a atual será mantida' : 'Nenhum arquivo selecionado')}
      </span>
    </div>
  </div>;
}

export default function HomepagePage() {
  const [banners, setBanners] = useState([]);
  const [tagline, setTagline] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formRevision, setFormRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusRequest, setFocusRequest] = useState(null);
  const formHeadingRef = useRef(null);
  const editButtonRefs = useRef({});
  const editingBanner = editingId ? banners.find((banner) => banner.id === editingId) : null;

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === 'form') {
      const heading = formHeadingRef.current;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      heading?.closest('section')?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      heading?.focus({ preventScroll: true });
    } else {
      editButtonRefs.current[focusRequest.target]?.focus();
    }
  }, [focusRequest]);

  const refresh = useCallback(async (includeTagline = false) => {
    const data = await apiRequest('admin/', { headers: authHeaders(), cache: 'no-store' });
    setBanners(data.banners ?? []);
    if (includeTagline) setTagline(data.tagline ?? '');
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest('admin/', { headers: authHeaders(), cache: 'no-store' })
      .then((data) => {
        if (!active) return;
        setBanners(data.banners ?? []);
        setTagline(data.tagline ?? '');
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (field, value) => setForm((old) => ({ ...old, [field]: value }));
  const selectFile = (field, file) => {
    const message = checkFile(file);
    if (message) { setError(message); return false; }
    setError('');
    update(field, file);
    return true;
  };

  const run = async (action, message, includeTagline = false) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await action();
      await refresh(includeTagline);
      setSuccess(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTagline = (event) => {
    event.preventDefault();
    if (!tagline.trim()) { setError('Informe a frase da faixa.'); return; }
    void run(() => apiRequest('tagline/', { method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ tagline: tagline.trim() }) }), 'Frase publicada.', true);
  };

  const saveBanner = (event) => {
    event.preventDefault();
    if (!form.alt_text.trim()) { setError('Informe o texto alternativo.'); return; }
    if (!editingId && !form.image_desktop) { setError('Escolha uma imagem para computador.'); return; }
    if (form.link && (!form.link.startsWith('/') || form.link.startsWith('//') || form.link.includes('\\'))) {
      setError('Use um caminho interno da loja começando por /.'); return;
    }
    for (const file of [form.image_desktop, form.image_mobile]) {
      const message = checkFile(file);
      if (message) { setError(message); return; }
    }
    const body = new FormData();
    body.append('alt_text', form.alt_text.trim());
    body.append('link', form.link.trim());
    if (form.image_desktop) body.append('image_desktop', form.image_desktop);
    if (form.image_mobile) body.append('image_mobile', form.image_mobile);
    if (form.remove_image_mobile) body.append('remove_image_mobile', 'true');
    void run(async () => {
      await apiRequest(editingId ? `banners/${editingId}/` : 'banners/', {
        method: editingId ? 'PATCH' : 'POST', headers: authHeaders(), body,
      });
      resetForm();
    }, 'Banner publicado.');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormRevision((value) => value + 1);
  };

  const edit = (banner) => {
    setEditingId(banner.id);
    setForm({ ...emptyForm, alt_text: banner.alt_text, link: banner.link || '' });
    setFormRevision((value) => value + 1);
    setError('');
    setSuccess('');
    setFocusRequest({ target: 'form' });
  };

  const cancelEdit = () => {
    const id = editingId;
    resetForm();
    setFocusRequest({ target: id });
  };

  const remove = (banner) => {
    if (!window.confirm(`Remover o banner “${banner.alt_text}”?`)) return;
    void run(async () => {
      await apiRequest(`banners/${banner.id}/`, { method: 'DELETE', headers: authHeaders() });
      if (banner.id === editingId) resetForm();
    }, 'Banner removido.');
  };

  const move = (index, direction) => {
    const next = [...banners];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run(() => apiRequest('banners/order/', {
      method: 'PUT', headers: authHeaders(true), body: JSON.stringify({ ids: next.map((banner) => banner.id) }),
    }), 'Ordem publicada.');
  };

  return <main className="mx-auto max-w-[1000px] space-y-8 px-5 py-8 md:px-10">
    <h1 className="text-3xl font-bold">Página inicial</h1>
    {loading && <p role="status">Carregando...</p>}
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {success && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{success}</p>}
    <section className="rounded-xl border border-black/15 bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold">Faixa abaixo do carrossel</h2>
      <form onSubmit={saveTagline} className="flex flex-col gap-3">
        <label htmlFor="homepage-tagline">Frase da faixa</label>
        <input id="homepage-tagline" maxLength={255} value={tagline} onChange={(event) => setTagline(event.target.value)} className="rounded border border-black/30 p-3" />
        <button type="submit" disabled={busy || loading} className="self-start rounded bg-black px-5 py-3 text-white disabled:opacity-50">Salvar frase</button>
      </form>
    </section>

    <section className="rounded-xl border border-black/15 bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold">Banners do carrossel</h2>
      {!loading && banners.length === 0 && <p className="mb-5 text-black/60">Nenhum banner cadastrado. A loja exibe os banners padrão.</p>}
      <ol className="space-y-4">
        {banners.map((banner, index) => <li key={banner.id} aria-current={banner.id === editingId ? 'true' : undefined} className={`flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center ${banner.id === editingId ? 'border-2 border-black bg-black/[0.04]' : 'border border-black/15'}`}>
          <img src={banner.image_desktop} alt="" className="h-28 w-full rounded object-cover sm:w-44" />
          <div className="min-w-0 flex-1">
            {banner.id === editingId && <span className="mb-1 inline-block rounded-full bg-black px-2.5 py-0.5 text-xs font-semibold text-white">Em edição</span>}
            <p className="font-semibold">{banner.alt_text}</p>
            {banner.link && <p className="truncate text-sm text-black/60">{banner.link}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Subir ${banner.alt_text}`} className="rounded border px-3 py-2 disabled:opacity-40">↑</button>
            <button type="button" disabled={busy || index === banners.length - 1} onClick={() => move(index, 1)} aria-label={`Descer ${banner.alt_text}`} className="rounded border px-3 py-2 disabled:opacity-40">↓</button>
            <button type="button" ref={(node) => { if (node) editButtonRefs.current[banner.id] = node; else delete editButtonRefs.current[banner.id]; }} disabled={busy} onClick={() => edit(banner)} className={`rounded border px-3 py-2 ${banner.id === editingId ? 'border-black bg-black text-white' : ''}`}>Editar</button>
            <button type="button" disabled={busy} onClick={() => remove(banner)} className="rounded border border-red-300 px-3 py-2 text-red-700">Remover</button>
          </div>
        </li>)}
      </ol>
    </section>

    <section aria-labelledby="homepage-banner-form-title" className={`scroll-mt-6 rounded-xl p-6 ${editingId ? 'border-2 border-black bg-[#fafafa] shadow-md' : 'border border-black/15 bg-white'}`}>
      <h2 id="homepage-banner-form-title" ref={formHeadingRef} tabIndex={-1} aria-describedby={editingBanner ? 'homepage-editing-banner' : undefined} className="mb-4 text-xl font-semibold focus:outline-none">{editingId ? 'Editar banner' : 'Adicionar banner'}</h2>
      {editingBanner && <div id="homepage-editing-banner" className="mb-5 flex items-center gap-4 rounded-lg border border-black/15 bg-white p-3">
        <img src={editingBanner.image_desktop} alt="" className="h-16 w-28 shrink-0 rounded object-cover" />
        <p className="min-w-0 text-sm">
          <span className="block font-semibold">Editando: {editingBanner.alt_text}</span>
          <span className="text-black/60">As alterações só valem depois de clicar em “Salvar banner”.</span>
        </p>
      </div>}
      <form key={formRevision} onSubmit={saveBanner} className="grid gap-4">
        <ImagePicker id="homepage-desktop-image" label="Imagem para computador" buttonLabel={editingId ? 'Trocar imagem para computador' : 'Escolher imagem para computador'} file={form.image_desktop} disabled={busy} keepExisting={Boolean(editingId)} currentSrc={editingBanner?.image_desktop} onChange={(event) => { if (!selectFile('image_desktop', event.target.files?.[0])) event.target.value = ''; }} />
        <ImagePicker id="homepage-mobile-image" label="Imagem para celular (opcional)" buttonLabel={editingBanner?.image_mobile ? 'Trocar imagem para celular' : 'Escolher imagem para celular'} file={form.image_mobile} disabled={busy} keepExisting={Boolean(editingBanner?.image_mobile) && !form.remove_image_mobile} currentSrc={form.remove_image_mobile ? null : editingBanner?.image_mobile} onChange={(event) => { if (!selectFile('image_mobile', event.target.files?.[0])) event.target.value = ''; }} />
        {editingBanner?.image_mobile && <label className="flex gap-2"><input type="checkbox" checked={form.remove_image_mobile} onChange={(event) => update('remove_image_mobile', event.target.checked)} />Remover imagem de celular atual</label>}
        <label className="grid gap-2">Texto alternativo<input required maxLength={255} value={form.alt_text} onChange={(event) => update('alt_text', event.target.value)} className="rounded border border-black/30 p-3" /></label>
        <label className="grid gap-2">Link interno (opcional)<input placeholder="/drop/novo" maxLength={500} value={form.link} onChange={(event) => update('link', event.target.value)} className="rounded border border-black/30 p-3" /></label>
        <p className="text-sm text-black/60">JPEG, PNG ou WebP. Máximo de 5 MB por imagem.</p>
        <div className="flex gap-3">
          <button type="submit" disabled={busy || loading} className="rounded bg-black px-5 py-3 text-white disabled:opacity-50">{editingId ? 'Salvar banner' : 'Adicionar banner'}</button>
          {editingId && <button type="button" onClick={cancelEdit} className="rounded border px-5 py-3">Cancelar edição</button>}
        </div>
      </form>
    </section>
  </main>;
}

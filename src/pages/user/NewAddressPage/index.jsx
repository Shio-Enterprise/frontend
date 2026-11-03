import { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  title: 'Casa',
  zip_code: '',
  street: '',
  address_number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  is_default: false,
};

const NewAddressPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('return') || '/addresses';
  const [form, setForm] = useState(EMPTY_FORM);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleCepChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
    set('zip_code', v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v);
  };

  const lookupCep = useCallback(async () => {
    const clean = form.zip_code.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado.');
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch (e) {
      setCepError(e.message);
    } finally {
      setCepLoading(false);
    }
  }, [form.zip_code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/addresses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        let msg = `Erro ${res.status}`;
        if (data && typeof data === 'object') {
          const detail = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
          if (detail) msg = detail;
        } else if (data) {
          msg = String(data);
        }
        throw new Error(msg);
      }
      navigate(returnTo);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountLayout>
      <PageMarker name="NewAddressPage" />

      <div className="mb-9 flex items-center gap-5">
        <Link to={returnTo} aria-label="Voltar" className="text-black transition hover:text-black/60">
          <Icon name="arrowLeft" className="h-6 w-6" />
        </Link>
        <h1 className="text-[34px] font-black uppercase text-black">Novo Endereço</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[720px] space-y-6">

        <label className="block">
          <span className="text-[15px] uppercase text-shio-muted">Título</span>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Casa, Trabalho"
            required
            className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-[15px] uppercase text-shio-muted">CEP</span>
            <input
              value={form.zip_code}
              onChange={handleCepChange}
              onBlur={lookupCep}
              placeholder="00000-000"
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>
          <button
            type="button"
            onClick={lookupCep}
            disabled={cepLoading}
            className="mt-auto h-12 rounded-full bg-black px-6 text-[14px] font-bold text-white disabled:bg-black/40"
          >
            {cepLoading ? '...' : 'Buscar'}
          </button>
        </div>
        {cepError && <p className="text-[13px] text-shio-danger">{cepError}</p>}

        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <label className="block">
            <span className="text-[15px] uppercase text-shio-muted">Rua / Logradouro</span>
            <input
              value={form.street}
              onChange={(e) => set('street', e.target.value)}
              placeholder="Rua..."
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>
          <label className="block">
            <span className="text-[15px] uppercase text-shio-muted">Número</span>
            <input
              value={form.address_number}
              onChange={(e) => set('address_number', e.target.value)}
              placeholder="123"
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[15px] uppercase text-shio-muted">Complemento <span className="normal-case font-normal text-shio-muted">(opcional)</span></span>
          <input
            value={form.complement}
            onChange={(e) => set('complement', e.target.value)}
            placeholder="Apto, Bloco..."
            className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="text-[15px] uppercase text-shio-muted">Bairro</span>
            <input
              value={form.neighborhood}
              onChange={(e) => set('neighborhood', e.target.value)}
              placeholder="Bairro"
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-[15px] uppercase text-shio-muted">Cidade</span>
            <input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Cidade"
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-[15px] uppercase text-shio-muted">UF</span>
            <input
              value={form.state}
              onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))}
              placeholder="SP"
              required
              className="mt-3 h-12 w-full rounded-full border border-black/25 px-7 text-[16px] outline-none placeholder:text-shio-placeholder focus:border-black"
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => set('is_default', e.target.checked)}
            className="h-5 w-5 accent-black"
          />
          <span className="text-[15px] text-black">Definir como endereço padrão</span>
        </label>

        {saveError && (
          <p className="rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-[#cc0000]">{saveError}</p>
        )}

        <div className="flex gap-4 pt-4">
          <Link to={returnTo}
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-black/25 text-[14px] font-bold uppercase text-shio-muted transition hover:border-black hover:text-black">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex h-12 flex-1 items-center justify-center gap-3 rounded-full bg-black text-[14px] font-bold uppercase text-white transition hover:bg-black/85 disabled:bg-black/40">
            <Icon name="save" className="h-5 w-5" />
            {saving ? 'Salvando...' : 'Salvar Endereço'}
          </button>
        </div>
      </form>
    </AccountLayout>
  );
};

export default NewAddressPage;

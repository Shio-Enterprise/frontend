import { useState, useEffect } from 'react';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import apiClient from '../../../lib/axios';
import { maskCpf, maskPhone } from '../../../lib/masks';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PROFILE_FIELDS = ['name', 'phone_number', 'cpf'];
const FIELD_INPUT_CLASS =
  'mt-3 h-11 w-full rounded-full border px-5 text-[14px] outline-none focus:border-black lg:mt-5 lg:h-12 lg:text-base';

const asText = (value) => (Array.isArray(value) ? value.join(' ') : String(value));

// O /me responde { error, details: { campo: [mensagens] } }; o DRF puro
// responde { campo: [mensagens] }. Erro de campo vai para o campo.
const parseSaveError = (data) => {
  const source = data?.details && typeof data.details === 'object' ? data.details : data ?? {};
  const fieldErrors = {};
  PROFILE_FIELDS.forEach((field) => {
    if (source[field]) fieldErrors[field] = asText(source[field]);
  });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: 'Revise os campos destacados.' };
  }
  const message = typeof data?.error === 'string' ? data.error : 'Não foi possível salvar. Tente de novo.';
  return { fieldErrors, message };
};

const MyAccountPage = () => {
  const { data: me, loading } = useApi('/api/auth/me/');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [receives, setReceives] = useState(null);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [marketingError, setMarketingError] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get('/auth/me/marketing/')
      .then((res) => {
        if (active) setReceives(Boolean(res.data?.receives));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleMarketing = async () => {
    if (savingMarketing) return;
    const previous = receives;
    setReceives(!previous);
    setSavingMarketing(true);
    setMarketingError(null);
    try {
      const res = await apiClient.put('/auth/me/marketing/', { receives: !previous });
      setReceives(Boolean(res.data?.receives));
    } catch {
      setReceives(previous);
      setMarketingError('Não foi possível salvar sua preferência.');
    } finally {
      setSavingMarketing(false);
    }
  };

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? '');
    // Dados antigos podem ter vindo em qualquer formato; a máscara padroniza na tela.
    setPhone(maskPhone(me.phone_number));
    setCpf(maskCpf(me.cpf));
  }, [me]);

  const editField = (field, setter, mask = (v) => v) => (e) => {
    setter(mask(e.target.value));
    if (fieldErrors[field]) {
      setFieldErrors((errors) => {
        const next = { ...errors };
        delete next[field];
        return next;
      });
    }
  };

  const fieldProps = (field) => ({
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
    className: `${FIELD_INPUT_CLASS} ${fieldErrors[field] ? 'border-shio-danger' : 'border-black/20'}`,
  });

  const fieldError = (field) =>
    fieldErrors[field] && (
      <p id={`${field}-error`} className="mt-2 text-[13px] text-shio-danger">
        {fieldErrors[field]}
      </p>
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    setFieldErrors({});
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone_number: phone, cpf }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const { fieldErrors: errors, message } = parseSaveError(data);
        setFieldErrors(errors);
        setSaveMsg({ type: 'error', text: message });
        return;
      }
      const data = await res.json();
      setCpf(maskCpf(data.cpf));
      setSaveMsg({ type: 'success', text: 'Dados salvos com sucesso!' });
      // Só o sucesso some sozinho; o erro fica até a pessoa corrigir.
      setTimeout(() => setSaveMsg((msg) => (msg?.type === 'success' ? null : msg)), 4000);
    } catch {
      setSaveMsg({ type: 'error', text: 'Não foi possível salvar. Tente de novo.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountLayout>
      <h1 className="mb-7 text-[34px] font-black uppercase text-black">Meus Dados</h1>

      {loading ? (
        <div className="py-12 text-center text-shio-muted">Carregando...</div>
      ) : (
        <form
          className="rounded-[18px] border border-black/20 p-5 md:p-8 lg:p-12"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-x-20 gap-y-6 md:grid-cols-2">
            <div>
              <label className="block">
                <span className="text-[14px] text-shio-muted lg:text-[20px]">Nome Completo</span>
                <input
                  autoComplete="name"
                  value={name}
                  onChange={editField('name', setName)}
                  {...fieldProps('name')}
                />
              </label>
              {fieldError('name')}
            </div>

            <div>
              <label className="block">
                <span className="text-[14px] text-shio-muted lg:text-[20px]">Telefone</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={editField('phone_number', setPhone, maskPhone)}
                  placeholder="(11) 99999-9999"
                  {...fieldProps('phone_number')}
                />
              </label>
              {fieldError('phone_number')}
            </div>

            <div>
              <label className="block">
                <span className="text-[14px] text-shio-muted lg:text-[20px]">E-mail</span>
                <input
                  type="email"
                  value={me?.email ?? ''}
                  readOnly
                  aria-describedby="email-readonly-hint"
                  className="mt-3 h-11 w-full rounded-full border border-black/20 bg-black/[0.03] px-5 text-[14px] outline-none lg:mt-5 lg:h-12 lg:text-base"
                />
              </label>
              <p id="email-readonly-hint" className="mt-2 text-[12px] text-shio-muted">O e-mail não pode ser alterado.</p>
            </div>

            <div>
              <label className="block">
                <span className="text-[14px] text-shio-muted lg:text-[20px]">CPF</span>
                <input
                  inputMode="numeric"
                  value={cpf}
                  onChange={editField('cpf', setCpf, maskCpf)}
                  placeholder="000.000.000-00"
                  {...fieldProps('cpf')}
                />
              </label>
              {fieldError('cpf')}
            </div>
          </div>

          {saveMsg && (
            <p
              role={saveMsg.type === 'success' ? 'status' : 'alert'}
              className={`mt-5 text-sm font-semibold ${saveMsg.type === 'success' ? 'text-shio-success' : 'text-shio-danger'}`}>
              {saveMsg.text}
            </p>
          )}

          <div className="mt-6 lg:mt-10">
            <button
              type="submit"
              aria-disabled={saving || undefined}
              className="h-12 w-full rounded-full bg-black text-[13px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85 aria-disabled:bg-black/40 lg:h-[62px] lg:rounded-[16px] lg:text-[18px]"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}

      {receives !== null && (
        <section className="mt-8 rounded-[18px] border border-black/20 p-5 md:p-8 lg:p-12">
          <h2 className="mb-4 text-[20px] font-bold text-black">Comunicações</h2>
          <div className="flex items-center justify-between gap-4">
            <span id="marketing-switch-label" className="text-[14px] text-black/70 lg:text-base">
              Quero receber novidades e cupons por e-mail
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={receives}
              aria-labelledby="marketing-switch-label"
              aria-disabled={savingMarketing || undefined}
              onClick={toggleMarketing}
              className={`relative h-7 w-12 shrink-0 rounded-full transition aria-disabled:opacity-50 ${receives ? 'bg-black' : 'bg-black/25'}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${receives ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
          {marketingError && <p role="alert" className="mt-3 text-sm font-semibold text-shio-danger">{marketingError}</p>}
        </section>
      )}
    </AccountLayout>
  );
};

export default MyAccountPage;

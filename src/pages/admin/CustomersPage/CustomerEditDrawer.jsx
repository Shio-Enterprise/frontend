import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import apiClient from '../../../lib/axios';
import { displayCpf, displayPhone, maskCpf, maskPhone } from '../../../lib/masks';
import DrawerShell from '../../../components/admin/DrawerShell';

const FIELDS = ['name', 'phone_number', 'cpf'];
const FIELD_CLASS = 'min-h-11 w-full rounded-md border px-3 py-2 text-[16px] md:text-sm';
const LABEL_CLASS = 'mb-1 block text-sm font-semibold';

const asText = (value) => (Array.isArray(value) ? value.join(' ') : String(value));

// O DRF responde { campo: [mensagens] }: erro de campo vai para o campo.
const parseSaveError = (err) => {
  const status = err?.response?.status;
  if (status === 403) return { fieldErrors: {}, message: 'Você não tem permissão para editar clientes.' };
  if (status === 404) return { fieldErrors: {}, message: 'Cliente não encontrado.' };
  const data = err?.response?.data ?? {};
  const fieldErrors = {};
  FIELDS.forEach((field) => {
    if (data[field]) fieldErrors[field] = asText(data[field]);
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, message: 'Revise os campos destacados.' };
  return { fieldErrors, message: 'Não foi possível salvar. Tente de novo.' };
};

// Edição do cliente pelo admin (#100): nome, telefone e CPF. E-mail é o login e fica só leitura.
export default function CustomerEditDrawer({ id, onSaved }) {
  const navigate = useNavigate();
  const { data: customer, loading, error: loadError } = useApi(`/api/auth/crm/customers/${id}/`);
  const backToProfile = (state) => navigate(`/admin/customers/${id}`, state ? { state } : undefined);

  return (
    <DrawerShell title="Editar Cliente" onClose={() => backToProfile()}>
      {loading ? (
        <div role="status" className="flex flex-1 items-center justify-center text-shio-muted">Carregando...</div>
      ) : !customer || loadError ? (
        <div role="alert" className="flex flex-1 items-center justify-center text-shio-muted">Cliente não encontrado.</div>
      ) : (
        <CustomerEditForm customer={customer} onSaved={onSaved} backToProfile={backToProfile} />
      )}
    </DrawerShell>
  );
}

// Montado só com o cliente carregado: o estado já nasce com os dados dele.
function CustomerEditForm({ customer, onSaved, backToProfile }) {
  const ids = { name: useId(), phone: useId(), cpf: useId(), email: useId(), emailHint: useId(), error: useId() };
  // Telefone e CPF como vieram da API. O que o admin não mexeu não vai no PATCH:
  // cadastro antigo fora do padrão não é apagado nem trava a troca do nome.
  const [saved] = useState(() => ({ phone: displayPhone(customer.phone_number), cpf: displayCpf(customer.cpf) }));
  const [name, setName] = useState(customer.name ?? '');
  const [phone, setPhone] = useState(saved.phone);
  const [cpf, setCpf] = useState(saved.cpf);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

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
    'aria-describedby': fieldErrors[field] ? `${ids[field === 'phone_number' ? 'phone' : field]}-error` : undefined,
    className: `${FIELD_CLASS} ${fieldErrors[field] ? 'border-shio-danger' : 'border-black/25'}`,
  });

  const fieldError = (field) => {
    const key = field === 'phone_number' ? 'phone' : field;
    return fieldErrors[field] && (
      <p id={`${ids[key]}-error`} className="mt-1 text-[13px] text-shio-danger">{fieldErrors[field]}</p>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    try {
      await apiClient.patch(`/auth/crm/customers/${customer.id}/`, {
        name,
        ...(phone !== saved.phone && { phone_number: phone }),
        ...(cpf !== saved.cpf && { cpf }),
      });
      onSaved?.();
      backToProfile({ customerSaved: true });
    } catch (err) {
      const { fieldErrors: errors, message: text } = parseSaveError(err);
      setFieldErrors(errors);
      setMessage(text);
      setSaving(false);
    }
  };

  return (
    <>
      <form
        id="customer-edit-form"
        onSubmit={handleSubmit}
        noValidate
        aria-describedby={message ? ids.error : undefined}
        className="flex-1 space-y-5 overflow-y-auto p-7"
      >
        {message && (
          <div id={ids.error} role="alert" className="rounded-md bg-red-50 p-3 text-sm text-shio-danger">{message}</div>
        )}

        <div>
          <label htmlFor={ids.name} className={LABEL_CLASS}>Nome completo</label>
          <input id={ids.name} autoComplete="off" value={name} onChange={editField('name', setName)} {...fieldProps('name')} />
          {fieldError('name')}
        </div>

        <div>
          <label htmlFor={ids.email} className={LABEL_CLASS}>E-mail</label>
          <input
            id={ids.email}
            type="email"
            value={customer.email ?? ''}
            readOnly
            aria-describedby={ids.emailHint}
            className={`${FIELD_CLASS} border-black/25 bg-black/[0.03] text-shio-muted`}
          />
          <p id={ids.emailHint} className="mt-1 text-xs text-shio-muted">O e-mail é o login do cliente e não pode ser alterado.</p>
        </div>

        <div>
          <label htmlFor={ids.phone} className={LABEL_CLASS}>Telefone</label>
          <input
            id={ids.phone}
            type="tel"
            autoComplete="off"
            value={phone}
            onChange={editField('phone_number', setPhone, maskPhone)}
            placeholder="(11) 99999-9999"
            {...fieldProps('phone_number')}
          />
          {fieldError('phone_number')}
        </div>

        <div>
          <label htmlFor={ids.cpf} className={LABEL_CLASS}>CPF</label>
          <input
            id={ids.cpf}
            inputMode="numeric"
            autoComplete="off"
            value={cpf}
            onChange={editField('cpf', setCpf, maskCpf)}
            placeholder="000.000.000-00"
            {...fieldProps('cpf')}
          />
          {fieldError('cpf')}
        </div>
      </form>

      <div className="flex shrink-0 gap-3 border-t border-black/10 p-5">
        <button type="button" onClick={() => backToProfile()} className="flex h-11 flex-1 items-center justify-center rounded-[8px] border border-black/25 text-[13px] font-bold uppercase text-shio-muted transition hover:border-black hover:text-black">
          Cancelar
        </button>
        <button
          type="submit"
          form="customer-edit-form"
          aria-disabled={saving || undefined}
          className="flex h-11 flex-1 items-center justify-center rounded-[8px] bg-black text-[13px] font-bold uppercase text-white transition hover:bg-black/85 aria-disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import AdminModal from '../ui/AdminModal';
import { createAdmin, lookupAdminEmail } from '../../lib/adminAccounts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Motivo para não seguir com um e-mail já cadastrado; null quando pode virar admin.
function blockedReason(account) {
  if (account.is_superuser) return 'Superusuários não podem ser alterados pelo painel.';
  if (account.is_admin) return 'Este e-mail já pertence a um administrador.';
  if (account.is_active === false) return 'Esta conta está desativada e não pode virar administradora.';
  return null;
}

const inputClass =
  'mt-2 h-11 w-full rounded-[12px] border border-black/15 px-4 text-[16px] text-black outline-none focus:border-black md:text-sm';

// Novo administrador (#81): primeiro o e-mail. Se já tem conta de cliente, confirma a promoção;
// se não tem, pede o nome e cria a conta (a pessoa recebe o e-mail para criar a senha).
export default function NewAdminModal({ permissionOptions, onClose, onSaved }) {
  const titleId = useId();
  const emailId = useId();
  const nameId = useId();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [account, setAccount] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);
  const nameRef = useRef(null);
  const foundRef = useRef(null);
  const firstStep = useRef(true);

  // Troca de etapa: o foco vai para o que a etapa pede (#64).
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    if (step === 'email') emailRef.current?.focus();
    if (step === 'create') nameRef.current?.focus();
    if (step === 'promote') foundRef.current?.focus();
  }, [step]);

  const togglePermission = (code) => {
    setPermissions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
    setError('');
  };

  const checkEmail = async () => {
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await lookupAdminEmail(value);
      if (!result.exists) {
        setAccount(null);
        setStep('create');
        return;
      }
      const reason = blockedReason(result);
      if (reason) {
        setError(reason);
        return;
      }
      setAccount(result);
      setStep('promote');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (step === 'create' && !name.trim()) {
      setError('Informe o nome para cadastrar uma conta nova.');
      return;
    }
    if (permissions.length === 0) {
      setError('Selecione ao menos uma permissão para a conta administrativa.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await createAdmin({
        email: account?.email ?? email,
        name: step === 'create' ? name : undefined,
        adminPermissions: permissions,
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    if (step === 'email') checkEmail();
    else save();
  };

  const backToEmail = () => {
    setStep('email');
    setAccount(null);
    setError('');
  };

  const submitLabel = busy
    ? step === 'email' ? 'Verificando...' : 'Salvando...'
    : step === 'email'
      ? 'Continuar'
      : step === 'promote'
        ? 'Promover a administrador'
        : 'Cadastrar e enviar convite';

  return (
    <AdminModal
      title="Novo administrador"
      titleId={titleId}
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      submitLabel={submitLabel}
      canSubmit
      submitting={busy}
    >
      {step === 'email' ? (
        <>
          <p className="mt-1 text-[14px] text-shio-muted">
            Digite o e-mail. Se a pessoa já tem conta de cliente, ela vira administradora; se não tem, criamos a conta.
          </p>
          <label htmlFor={emailId} className="mt-5 block text-[14px] font-semibold text-black">
            E-mail
          </label>
          <input
            id={emailId}
            ref={emailRef}
            // text + inputMode: a validação nativa de type="email" barraria o envio antes da
            // nossa mensagem em português.
            type="text"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            className={inputClass}
          />
        </>
      ) : (
        <>
          {step === 'promote' ? (
            <p ref={foundRef} tabIndex={-1} className="mt-4 rounded-[14px] border border-black/10 bg-[#f7f7f7] px-4 py-3 text-[14px] text-black outline-none">
              Conta de cliente encontrada: <strong>{account.name || account.email}</strong> ({account.email}).
              Ao confirmar, ela passa a acessar o painel com as permissões abaixo.
            </p>
          ) : (
            <>
              <p className="mt-4 rounded-[14px] border border-black/10 bg-[#f7f7f7] px-4 py-3 text-[14px] text-black">
                Nenhuma conta com {email.trim()}. Vamos criar uma nova; a pessoa recebe um e-mail para criar a própria senha.
              </p>
              <label htmlFor={nameId} className="mt-5 block text-[14px] font-semibold text-black">
                Nome
              </label>
              <input
                id={nameId}
                ref={nameRef}
                type="text"
                autoComplete="off"
                value={name}
                maxLength={255}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                className={inputClass}
              />
            </>
          )}

          <fieldset className="mt-5">
            <legend className="text-[14px] font-semibold text-black">Permissões</legend>
            <div className="mt-2 grid gap-2">
              {permissionOptions.map((permission) => (
                <label key={permission.code} className="flex cursor-pointer items-start gap-3 text-[14px] text-black">
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission.code)}
                    onChange={() => togglePermission(permission.code)}
                    className="mt-0.5 h-4 w-4 accent-black"
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={backToEmail}
            className="mt-4 text-[13px] font-semibold text-black underline underline-offset-2"
          >
            Trocar e-mail
          </button>
        </>
      )}
    </AdminModal>
  );
}

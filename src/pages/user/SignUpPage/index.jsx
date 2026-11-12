import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGoogleAuth } from '../../../context/useGoogleAuth';
import { GoogleLoginButton } from '../../../context/GoogleLoginButton';
import logo from '../../../assets/logo/logo.svg';
import PasswordInput from '../../../components/ui/PasswordInput';

const SIGNUP_FIELDS = ['name', 'email', 'password'];
const FIELD_INPUT_CLASS =
  'w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none aria-[invalid=true]:border-shio-danger';

const asText = (value) => (Array.isArray(value) ? value.join(' ') : String(value));

// O backend responde 400 com { campo: [mensagens em português] } (#96).
// Erro de campo vai para o campo; qualquer outro erro vira a mensagem genérica.
const parseSignUpError = (err) => {
  const data = err?.response?.data;
  const fieldErrors = {};
  if (err?.response?.status === 400 && data && typeof data === 'object') {
    SIGNUP_FIELDS.forEach((field) => {
      const text = data[field] ? asText(data[field]).trim() : '';
      if (text) fieldErrors[field] = text;
    });
  }
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return {
    fieldErrors,
    message: hasFieldErrors ? 'Revise os campos destacados.' : 'Erro ao criar conta.',
  };
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const { registerWithPassword } = useAuth();
  const { handleGoogleLogin, isLoading: isGoogleLoading, error: googleError } = useGoogleAuth({
    onSuccessRedirect: '/my-account',
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const formRef = useRef(null);
  // Só um envio com erro move o foco; apagar o erro ao editar não move.
  const focusFirstError = useRef(false);
  const displayedError = error || googleError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await registerWithPassword(name, email, password, marketingOptIn);
      navigate('/my-account', { replace: true });
    } catch (err) {
      const { fieldErrors: errors, message } = parseSignUpError(err);
      focusFirstError.current = Object.keys(errors).length > 0;
      setFieldErrors(errors);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Depois de um envio com erro, o foco vai para o primeiro campo inválido.
  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [fieldErrors]);

  const editField = (field, setter) => (e) => {
    setter(e.target.value);
    if (fieldErrors[field]) {
      const next = { ...fieldErrors };
      delete next[field];
      setFieldErrors(next);
      // Sem nenhum campo destacado, o "Revise os campos destacados." sai junto.
      if (Object.keys(next).length === 0) setError(null);
    }
  };

  const fieldProps = (field) => ({
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `signup-${field}-error` : undefined,
  });

  const fieldError = (field) =>
    fieldErrors[field] && (
      <p id={`signup-${field}-error`} className="mt-1.5 text-[13px] text-shio-danger">
        {fieldErrors[field]}
      </p>
    );

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 py-16 font-inter text-black">
      <section className="w-full max-w-[380px] text-center">
        <img src={logo} alt="Shio Logo" className="mx-auto h-auto w-[190px]" />
        <p className="mt-1 text-[18px] text-shio-muted">Crie sua conta</p>

        <h1 className="mt-10 text-[34px] font-normal text-black">Bem vindo(a)</h1>
        <p className="mt-4 text-[18px] text-shio-muted mb-8">Cadastre-se para continuar</p>

        <GoogleLoginButton
          onSuccess={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          onError={() => console.error("Google Login falhou a partir do componente.")}
        />

        <div className="flex w-full items-center gap-3 my-6">
          <hr className="w-full border-gray-200" />
          <span className="text-[12px] text-shio-muted uppercase tracking-widest font-semibold">ou</span>
          <hr className="w-full border-gray-200" />
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-black">
              Nome completo
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={editField('name', setName)}
              {...fieldProps('name')}
              className={FIELD_INPUT_CLASS}
            />
            {fieldError('name')}
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-black">
              E-mail
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={editField('email', setEmail)}
              {...fieldProps('email')}
              className={FIELD_INPUT_CLASS}
            />
            {fieldError('email')}
          </div>
          <PasswordInput
            label="Senha"
            autoComplete="new-password"
            required
            value={password}
            onChange={editField('password', setPassword)}
            error={fieldErrors.password}
          />
          <label className="flex items-start gap-2 text-sm text-black/60">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-black"
            />
            <span>Quero receber novidades e cupons por e-mail</span>
          </label>
          <button
            type="submit"
            disabled={isGoogleLoading}
            aria-disabled={isLoading || undefined}
            className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 aria-disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        {displayedError && (
          <p role="alert" className="mt-4 rounded-[12px] border border-red-100 bg-red-50 p-3 text-[13px] text-shio-danger">
            {displayedError}
          </p>
        )}

        <p className="mt-8 text-sm text-shio-muted">
          Ja tem conta?{' '}
          <Link to="/login" className="font-semibold text-black">Entrar</Link>
        </p>

        <p className="mt-14 text-sm text-shio-muted">
          Ao continuar voce concorda com nossos Termos de uso e Politica de Privacidade
        </p>
      </section>
    </main>
  );
};

export default SignUpPage;

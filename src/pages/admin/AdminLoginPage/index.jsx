import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGoogleAuth } from '../../../context/useGoogleAuth';
import { GoogleLoginButton } from '../../../context/GoogleLoginButton';
import logo from '../../../assets/logo/logo.svg';

const AdminLoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname ?? '/admin/dashboard';
  const { loginWithPassword } = useAuth();
  const { handleGoogleLogin, isLoading: isGoogleLoading, error: googleError } = useGoogleAuth({
    onSuccessRedirect: from,
    requireAdmin: true,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const displayedError = error || googleError || location.state?.error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const userData = await loginWithPassword(email, password);
      if (
        !userData.user.is_admin &&
        !userData.user.is_staff &&
        !userData.user.is_superuser
      ) {
        throw new Error('Acesso negado. Esta área é restrita para administradores.');
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Email ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 font-sans text-gray-800">
      <div className="w-full max-w-[380px] bg-white p-8 shadow-sm rounded-lg flex flex-col items-center border border-gray-100">
        
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Shio Logo" className="w-[160px] h-auto mb-2" />
          <p className="text-gray-400 text-[12px] font-semibold tracking-wider uppercase">Painel de Controle</p>
        </div>

        <GoogleLoginButton
          onSuccess={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          onError={() => console.error("Google Login falhou a partir do componente.")}
        />

        <div className="flex w-full items-center gap-3 my-6">
          <hr className="w-full border-gray-200" />
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">ou</span>
          <hr className="w-full border-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail Corporativo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Autenticando...' : 'Entrar no Admin'}
          </button>
        </form>

        {displayedError && (
          <p className="mt-6 rounded-md bg-red-50 w-full text-center border border-red-100 p-3 text-[13px] text-red-600">
            {displayedError}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;

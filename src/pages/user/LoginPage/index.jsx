import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/logo/logo.svg';

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname ?? '/my-account';
  const { loginWithPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await loginWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Email ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-sans text-gray-800">
      <div className="w-full max-w-[380px] flex flex-col items-center">
        
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Shio Logo" className="w-[180px] h-auto mb-1" />
          <p className="text-gray-400 text-[13px]">Acesse sua conta</p>
        </div>

        <h1 className="text-2xl text-black font-medium mb-2">Bem vindo(a)</h1>
        <p className="text-[14px] text-gray-500 mb-8">Faça login para continuar</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
          />
          <input
            type="password"
            placeholder="Senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 w-full text-center border border-red-100 p-3 text-[13px] text-red-600">
            {error}
          </p>
        )}

        <p className="mt-6 text-sm text-gray-500">
          Não tem conta? <Link to="/signup" className="font-semibold text-black">Cadastre-se</Link>
        </p>

        <p className="mt-14 text-[11px] text-gray-400 text-center leading-relaxed max-w-[320px]">
          Ao continuar você concorda com nossos Termos de uso e Política de Privacidade
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

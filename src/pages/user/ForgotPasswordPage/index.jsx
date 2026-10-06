import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import logo from '../../../assets/logo/logo.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await axios.post(`${API_URL}/auth/password-reset/`, { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao solicitar redefinição. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-sans text-gray-800">
      <div className="w-full max-w-[380px] flex flex-col items-center">
        
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Shio Logo" className="w-[180px] h-auto mb-1" />
          <p className="text-gray-400 text-[13px]">Esqueceu a senha?</p>
        </div>

        <h1 className="text-2xl text-black font-medium mb-2">Recuperar conta</h1>
        <p className="text-[14px] text-gray-500 mb-8 text-center">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        {success ? (
          <div className="w-full flex flex-col items-center">
            <div className="rounded-md bg-green-50 w-full text-center border border-green-100 p-4 text-[14px] text-green-700 mb-6">
              Se este e-mail estiver cadastrado, você receberá as instruções em instantes.
            </div>
            <Link to="/login" className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 text-center">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <input
              type="email"
              placeholder="E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
            />
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-red-50 w-full text-center border border-red-100 p-3 text-[13px] text-red-600">
            {error}
          </p>
        )}

        {!success && (
          <p className="mt-6 text-sm text-gray-500">
            Lembrou da senha? <Link to="/login" className="font-semibold text-black">Voltar ao login</Link>
          </p>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordPage;

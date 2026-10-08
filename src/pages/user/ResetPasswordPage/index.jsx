import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../lib/axios';
import logo from '../../../assets/logo/logo.svg';

const ResetPasswordPage = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/password-reset-confirm/', {
        uidb64: uid,
        token: token,
        new_password: newPassword
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const apiError = err.response?.data?.error || err.response?.data?.new_password?.[0] || 'O link é inválido ou expirou.';
      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-sans text-gray-800">
      <div className="w-full max-w-[380px] flex flex-col items-center">
        
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Shio Logo" className="w-[180px] h-auto mb-1" />
          <p className="text-gray-400 text-[13px]">Redefinir senha</p>
        </div>

        <h1 className="text-2xl text-black font-medium mb-2">Criar nova senha</h1>
        <p className="text-[14px] text-gray-500 mb-8 text-center">
          Digite a sua nova senha abaixo.
        </p>

        {success ? (
          <div className="w-full flex flex-col items-center">
            <div className="rounded-md bg-green-50 w-full text-center border border-green-100 p-4 text-[14px] text-green-700 mb-6">
              Senha redefinida com sucesso! Redirecionando para o login...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <input
              type="password"
              placeholder="Nova senha"
              required
              minLength="8"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
            />
            
            <input
              type="password"
              placeholder="Confirmar nova senha"
              required
              minLength="8"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-red-50 w-full text-center border border-red-100 p-3 text-[13px] text-red-600">
            {error}
          </p>
        )}

      </div>
    </div>
  );
};

export default ResetPasswordPage;

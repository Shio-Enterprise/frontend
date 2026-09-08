import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/logo/logo.svg';
import { PageMarker } from '../../../components/ui/ShioDesign';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { registerWithPassword } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await registerWithPassword(name, email, password);
      navigate('/my-account', { replace: true });
    } catch (err) {
      let errorMessage = 'Erro ao criar conta.';
      if (err.response?.data?.email) errorMessage = 'Este e-mail já está em uso.';
      else if (err.response?.data?.password) errorMessage = 'A senha informada é inválida.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 py-16 font-inter text-black">
      <PageMarker name="SignUpPage" />
      <section className="w-full max-w-[380px] text-center">
        <img src={logo} alt="Shio Logo" className="mx-auto h-auto w-[190px]" />
        <p className="mt-1 text-[18px] text-black/50">Crie sua conta</p>

        <h1 className="mt-10 text-[34px] font-normal text-black">Bem vindo(a)</h1>
        <p className="mt-4 text-[18px] text-black/45 mb-8">Cadastre-se para continuar</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
          <input
            type="text"
            placeholder="Nome Completo"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
          />
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
            className="w-full rounded-md bg-black p-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-[12px] border border-red-100 bg-red-50 p-3 text-[13px] text-red-600">
            {error}
          </p>
        )}

        <p className="mt-8 text-sm text-black/45">
          Ja tem conta?{' '}
          <Link to="/login" className="font-semibold text-black">Entrar</Link>
        </p>

        <p className="mt-14 text-sm text-black/40">
          Ao continuar voce concorda com nossos Termos de uso e Politica de Privacidade
        </p>
      </section>
    </main>
  );
};

export default SignUpPage;

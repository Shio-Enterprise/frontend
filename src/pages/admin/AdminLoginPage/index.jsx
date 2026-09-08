import { Link, useLocation } from "react-router-dom";
import { useGoogleAuth } from "../../../context/useGoogleAuth";
import { GoogleLoginButton } from "../../../context/GoogleLoginButton";
import logo from "../../../assets/logo/logo.svg";

const AdminLoginPage = () => {
  const location = useLocation();
  const { handleGoogleLogin, isLoading, error } = useGoogleAuth({
    onSuccessRedirect: "/admin/dashboard",
  });
  const displayedError = error || location.state?.error;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-sans text-gray-800">
      <div className="w-full max-w-[380px] flex flex-col items-center">
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Shio Logo" className="w-[180px] h-auto mb-1" />
          <p className="text-gray-400 text-[13px]">Acesse sua conta</p>
        </div>

        <h1 className="text-2xl text-black font-medium mb-2">Bem vindo(a)</h1>
        <p className="text-[14px] text-gray-500 mb-8">
          Faça login para continuar para o painel
        </p>

        <GoogleLoginButton
          onSuccess={handleGoogleLogin}
          disabled={isLoading}
          onError={() =>
            console.error("Google Login falhou a partir do componente.")
          }
        />

        {isLoading && (
          <p className="mt-4 text-[13px] text-gray-500">Autenticando...</p>
        )}
        {displayedError && (
          <p className="mt-4 rounded-md bg-red-50 w-full text-center border border-red-100 p-3 text-[13px] text-red-600">
            {displayedError}
          </p>
        )}

        <p className="mt-20 text-[11px] text-gray-400 text-center leading-relaxed max-w-[320px]">
          Ao continuar você concorda com nossos{" "}
          <Link
            to="/termos"
            className="font-semibold text-gray-500 hover:text-black transition-colors"
          >
            Termos de uso
          </Link>{" "}
          e{" "}
          <Link
            to="/privacidade"
            className="font-semibold text-gray-500 hover:text-black transition-colors"
          >
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;

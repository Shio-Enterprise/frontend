import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { loginWithGoogle } from "./googleAuth";

/**
 * Hook para lidar com o fluxo único de autenticação com Google.
 * A autorização de rotas administrativas é responsabilidade do ProtectedRoute.
 * @param {object} options
 * @param {string} options.onSuccessRedirect
 */
export const useGoogleAuth = ({
  onSuccessRedirect = "/my-account",
} = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleLogin = async (googleToken) => {
    setIsLoading(true);
    setError(null);
    try {
      const authData = await loginWithGoogle(googleToken);
      login(authData);
      navigate(onSuccessRedirect, { replace: true });
    } catch (err) {
      console.error("Erro capturado durante o login:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleGoogleLogin, isLoading, error };
};

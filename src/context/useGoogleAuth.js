import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { loginWithGoogle } from "./googleAuth";

/**
 * Hook para lidar com o fluxo de autenticação do Google para administradores.
 * @param {object} options
 * @param {string} options.onSuccessRedirect
 * @param {boolean} options.requireAdmin -
 */
export const useGoogleAuth = ({
  onSuccessRedirect = "/admin/dashboard",
  requireAdmin = true,
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

      if (
        requireAdmin &&
        !authData.user?.is_admin &&
        !authData.user?.is_staff &&
        !authData.user?.is_superuser
      ) {
        throw new Error(
          "Acesso negado. Esta área é restrita para administradores.",
        );
      }

      login(authData);
      navigate(onSuccessRedirect);
    } catch (err) {
      console.error("Erro capturado durante o login:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleGoogleLogin, isLoading, error };
};

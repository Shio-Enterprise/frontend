/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "../lib/authToken";
import apiClient from "../lib/axios";

const AuthContext = createContext(null);
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [accessToken, setAccessToken] = useState(() => getAccessToken());
  const [isAdmin, setIsAdmin] = useState(() => {
    const storedUser = getStoredUser();
    return Boolean(
      storedUser?.is_admin || storedUser?.is_staff || storedUser?.is_superuser,
    );
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearAuthTokens();
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    const access = getAccessToken();
    clearSession();
    if (refresh && access) {
      try {
        await apiClient.post(
          "/auth/logout/",
          { refresh },
          {
            headers: { Authorization: `Bearer ${access}` },
          },
        );
      } catch (err) {
        console.error("Erro ao fazer logout no servidor", err);
      }
    }
  }, [clearSession]);

  useEffect(() => {
    if (!accessToken) return;
    let timer;
    const checkExpiry = () => {
      try {
        const { exp } = jwtDecode(accessToken);
        if (!exp) return;
        const remaining = exp * 1000 - Date.now();
        if (remaining <= 0) {
          clearSession();
          return;
        }
        timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
      } catch {
        clearSession();
      }
    };
    checkExpiry();
    return () => clearTimeout(timer);
  }, [accessToken, clearSession]);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        if (decodedToken.exp * 1000 <= Date.now()) {
          // Clear an expired persisted session before rendering protected content.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          void logout();
        }
      } catch (error) {
        console.error("Token inválido:", error);
        logout();
      }
    }
    setIsAuthLoading(false);
  }, [logout]);

  const login = (authData) => {
    const { user: userData, access, refresh } = authData;
    setAuthTokens({ access, refresh });
    localStorage.setItem("user", JSON.stringify(userData));
    setAccessToken(access);
    setUser(userData);
    setIsAdmin(
      userData.is_admin || userData.is_staff || userData.is_superuser || false,
    );
  };

  const loginWithPassword = async (email, password) => {
    const response = await apiClient.post("/auth/login/", { email, password });
    login(response.data);
    return response.data;
  };

  const registerWithPassword = async (name, email, password) => {
    const response = await apiClient.post("/auth/register/", {
      name,
      email,
      password,
    });
    login(response.data);
    return response.data;
  };

  const value = {
    user,
    accessToken,
    isAdmin,
    isAuthLoading,
    login,
    logout,
    loginWithPassword,
    registerWithPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

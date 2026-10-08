import { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from '../lib/authToken';
import apiClient from '../lib/axios';
import { firstAllowedAdminRoute, resolveAdminPermissions } from '../lib/adminPermissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => getAccessToken());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        if (decodedToken.exp * 1000 > Date.now()) {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser) {
            setUser(storedUser);
            setIsAdmin(
              storedUser.is_admin ||
              storedUser.is_staff ||
              storedUser.is_superuser ||
              false
            );
          }
          setAccessToken(token);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Token inválido:', error);
        logout();
      }
    }
    setIsAuthLoading(false);
  }, []);

  const login = (authData) => {
    const { user: userData, access, refresh } = authData;
    setAuthTokens({ access, refresh });
    localStorage.setItem('user', JSON.stringify(userData));
    setAccessToken(access);
    setUser(userData);
    setIsAdmin(
      userData.is_admin || 
      userData.is_staff || 
      userData.is_superuser || 
      false
    );
  };

  const logout = async () => {
    const refresh = getRefreshToken();
    const access = getAccessToken();

    clearAuthTokens();
    localStorage.removeItem('user');
    setAccessToken(null);
    setUser(null);
    setIsAdmin(false);

    if (refresh && access) {
      try {
        await apiClient.post(
          '/auth/logout/',
          { refresh },
          { headers: { Authorization: `Bearer ${access}` } },
        );
      } catch (err) {
        console.error('Erro ao fazer logout no servidor', err);
      }
    }
  };

  const refreshUser = async () => {
    const response = await apiClient.get('/auth/me/');
    const userData = response.data;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAdmin(
      userData.is_admin ||
      userData.is_staff ||
      userData.is_superuser ||
      false
    );
    return userData;
  };

  const loginWithPassword = async (email, password) => {
    const response = await apiClient.post('/auth/login/', { email, password });
    login(response.data);
    return response.data;
  };

  const registerWithPassword = async (name, email, password) => {
    const response = await apiClient.post('/auth/register/', { name, email, password });
    login(response.data);
    return response.data;
  };

  const adminPermissions = resolveAdminPermissions(user, isAdmin);
  const hasAdminPermission = (permission) =>
    Boolean(isAdmin && adminPermissions.includes(permission));
  const adminHomePath = firstAllowedAdminRoute(adminPermissions);

  const value = {
    user,
    accessToken,
    isAdmin,
    adminPermissions,
    hasAdminPermission,
    adminHomePath,
    isAuthLoading,
    login,
    logout,
    loginWithPassword,
    registerWithPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

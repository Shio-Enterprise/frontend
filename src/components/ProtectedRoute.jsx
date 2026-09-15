import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../lib/authToken';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const location = useLocation();
  const token = getAccessToken();
  const { isAdmin, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div>Carregando...</div>;
  }

  if (!token) {
    return <Navigate to={requireAdmin ? "/admin/login" : "/login"} state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardRouteForRole } from '../../utils/roleRouting.js';
import AuthLoading from './AuthLoading.jsx';

/**
 * @param {Object} props
 * @param {string[]} props.allowedRoles
 * @param {import('react').ReactNode} props.children
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (!role) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDashboardRouteForRole(role)} replace />;
  }

  return children;
}

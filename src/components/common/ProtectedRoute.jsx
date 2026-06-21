import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES, USER_ROLES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardRouteForRole } from '../../utils/roleRouting.js';
import AuthLoading from './AuthLoading.jsx';

/**
 * @param {Object} props
 * @param {string[]} props.allowedRoles
 * @param {import('react').ReactNode} props.children
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, isLoading, profile } = useAuth();
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

  // Check role-based access or permission-based access via flags
  const hasAllowedRole = allowedRoles.includes(role);
  const hasHodPermission = allowedRoles.includes(USER_ROLES.HOD) && profile?.can_view_hod === true;
  const hasFacultyPermission = allowedRoles.includes(USER_ROLES.FACULTY) && profile?.can_view_faculty === true;

  if (!hasAllowedRole && !hasHodPermission && !hasFacultyPermission) {
    return <Navigate to={getDashboardRouteForRole(role)} replace />;
  }

  return children;
}

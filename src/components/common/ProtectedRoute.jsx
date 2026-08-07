import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import ForcePasswordChange from '../auth/ForcePasswordChange.jsx';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#11131f',
          color: 'white',
        }}
      >
        Loading UCA...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile && profile.has_changed_password !== true) {
    return <ForcePasswordChange />;
  }

  const currentPath = location.pathname;

  // Roles are sourced strictly from the profile loaded by AuthProvider
  // (fetchUserProfile -> maybeSingle with a secure 'student' fallback).
  // No email-domain inference is performed: elevated roles must come from an
  // explicit user_profiles row.
  const role = profile?.role?.toLowerCase() || '';
  const canViewHod = profile?.can_view_hod === true;
  const canViewFaculty = profile?.can_view_faculty === true;

  const isFaculty = role === 'faculty' || canViewFaculty;
  const isHOD = role === 'hod' || canViewHod;
  const isDirector = role === 'director';

  const isStaff = isFaculty || isHOD || isDirector;

  if (!isStaff && !currentPath.startsWith('/student')) {
    return <Navigate to="/student" replace />;
  }

  if (isStaff && currentPath.startsWith('/student')) {
    if (isDirector) return <Navigate replace to="/director"/>;
    if (isHOD) return <Navigate replace to="/hod-dashboard"/>;
    return <Navigate replace to="/faculty"/>;
  }

  return children;
}

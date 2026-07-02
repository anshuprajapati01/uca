import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

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

  const currentPath = location.pathname;
  const email = user.email?.toLowerCase() || '';

  const dbRole = profile?.role?.toLowerCase() || user.user_metadata?.role || '';

  const isFaculty = email.includes('faculty') || dbRole === 'faculty';
  const isHOD = email.includes('hod') || dbRole === 'hod' || profile?.is_hod === true;
  const isDirector = email.includes('director') || dbRole === 'director';

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

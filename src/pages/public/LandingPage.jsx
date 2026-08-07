import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, ROUTES, USER_ROLES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogout } from '../../hooks/useLogout.js';

export default function LandingPage() {
  const { user, profile, isAuthenticated, loading } = useAuth();
  const { logout, isLoading: isLoggingOut, error: logoutError } = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const loginSuccess = location.state?.loginSuccess === true;

  useEffect(() => {
    const checkAndRoute = async () => {
      if (!loading && isAuthenticated && user) {
        // Role is sourced strictly from the profile (fetchUserProfile ->
        // maybeSingle with a secure 'student' fallback). No email-domain
        // inference is performed: elevated roles require an explicit row.
        const role = profile?.role ?? USER_ROLES.STUDENT;
        const canViewHod = profile?.can_view_hod === true;

        if (role === USER_ROLES.DIRECTOR) navigate(ROUTES.DIRECTOR_DASHBOARD, { replace: true });
        else if (role === USER_ROLES.HOD || canViewHod) navigate(ROUTES.HOD_DASHBOARD, { replace: true });
        else if (role === USER_ROLES.FACULTY) navigate(ROUTES.FACULTY_DASHBOARD, { replace: true });
        else navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      }
    };
    if (!loading) checkAndRoute();
  }, [profile, user, loading, navigate]);

  async function handleLogout() {
    await logout();
    navigate(ROUTES.HOME, { replace: true });
  }

  return (
    <main className="page">
      <h1>{APP_NAME}</h1>
      <p>Your college portal for students, faculty, and administrators.</p>

      {loginSuccess ? (
        <p className="status-message status-message--success">
          Signed in successfully.
        </p>
      ) : null}

      {isAuthenticated ? (
        <section className="auth-status">
          <p>
            Signed in as <strong>{user?.email}</strong>
          </p>
          {logoutError ? (
            <p className="status-message status-message--error" role="alert">
              {logoutError}
            </p>
          ) : null}
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </section>
      ) : (
        <p>
          <Link to={ROUTES.LOGIN}>Sign in</Link> to access your dashboard.
        </p>
      )}
    </main>
  );
}

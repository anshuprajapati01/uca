import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, ROUTES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogout } from '../../hooks/useLogout.js';
import { getDashboardRouteForProfile } from '../../utils/roleRouting.js';

export default function LandingPage() {
  const { user, profile, isAuthenticated } = useAuth();
  const { logout, isLoading: isLoggingOut, error: logoutError } = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const loginSuccess = location.state?.loginSuccess === true;

  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate(getDashboardRouteForProfile(profile), { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

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

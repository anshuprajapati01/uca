import { Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogout } from '../../hooks/useLogout.js';
import './DashboardLayout.css';

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {() => void} props.onMenuClick
 */
export default function TopNavbar({ title, onMenuClick }) {
  const { user, profile, role } = useAuth();
  const { logout, isLoading } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = profile?.full_name || user?.email || 'User';
  const canViewFaculty = profile?.can_view_faculty === true;
  const canViewHod = profile?.can_view_hod === true;
  const showRoleSwitcher = canViewFaculty && canViewHod;

  const isFacultyDashboard = location.pathname.startsWith('/faculty');
  const isHodDashboard = location.pathname.startsWith('/hod-dashboard');

  function handleSwitchRole() {
    if (isFacultyDashboard) {
      navigate(ROUTES.HOD_DASHBOARD, { replace: true });
    } else if (isHodDashboard) {
      navigate(ROUTES.FACULTY_DASHBOARD, { replace: true });
    }
  }

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__left">
        <button
          type="button"
          className="dashboard-topbar__menu-btn"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <h1 className="dashboard-topbar__title">{title}</h1>
      </div>

      <div className="dashboard-topbar__right">
        {showRoleSwitcher ? (
          <button
            type="button"
            className="dashboard-topbar__switcher"
            onClick={handleSwitchRole}
          >
            {isFacultyDashboard ? '🔄 Switch to HOD Portal' : '🔄 Switch to Faculty Portal'}
          </button>
        ) : null}
        <div className="dashboard-topbar__user">
          <strong>{displayName}</strong>
          {role ? <span className="dashboard-topbar__role">{role}</span> : null}
        </div>
        <button
          type="button"
          className="dashboard-topbar__logout"
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}
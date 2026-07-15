import { LogOut, Menu } from 'lucide-react';
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

  const fullName = profile?.full_name || user?.full_name || '';
  const displayName = fullName || user?.email || 'User';
  const avatarUrl = profile?.avatar_url || user?.avatar_url || null;
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? 'U');
  const canViewFaculty = profile?.can_view_faculty === true;
  const canViewHod = profile?.can_view_hod === true;
  const showRoleSwitcher =
    ((role === 'hod' || role === 'director') && canViewFaculty) ||
    (role !== 'hod' && role !== 'director' && canViewFaculty && canViewHod);

  const isFacultyDashboard = location.pathname.startsWith('/faculty');
  const isHodDashboard = location.pathname.startsWith('/hod-dashboard');
  const isDirectorDashboard = location.pathname.startsWith('/director');

  let switcherLabel = null;
  let switcherTarget = null;

  if (isFacultyDashboard) {
    if (role === 'director' && canViewFaculty) {
      switcherLabel = '🔄 Switch to Director Portal';
      switcherTarget = ROUTES.DIRECTOR_DASHBOARD;
    } else {
      switcherLabel = '🔄 Switch to HOD Portal';
      switcherTarget = ROUTES.HOD_DASHBOARD;
    }
  } else if (isHodDashboard) {
    switcherLabel = '🔄 Switch to Faculty Portal';
    switcherTarget = ROUTES.FACULTY_DASHBOARD;
  } else if (isDirectorDashboard) {
    switcherLabel = '🔄 Switch to Faculty Portal';
    switcherTarget = ROUTES.FACULTY_DASHBOARD;
  }

  function handleSwitchRole() {
    if (switcherTarget) {
      navigate(switcherTarget, { replace: true });
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
        {showRoleSwitcher && switcherLabel ? (
          <button
            type="button"
            className="dashboard-topbar__switcher"
            onClick={handleSwitchRole}
          >
            {switcherLabel}
          </button>
        ) : null}
        <div className="dashboard-topbar__profile">
          <div className="dashboard-topbar__profile-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || 'Profile'}
                className="dashboard-topbar__avatar-image"
              />
            ) : (
              <span className="dashboard-topbar__avatar-initials">{initials}</span>
            )}
          </div>
          <div className="dashboard-topbar__user">
            <strong>{displayName}</strong>
            {/* URL check: HOD portal hai toh HOD likho, varna original role */}
            {role ? (
              <span className="dashboard-topbar__role">
                {location.pathname.startsWith('/hod-dashboard')
                  ? 'HOD'
                  : role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="dashboard-topbar__logout"
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            'Signing out…'
          ) : (
            <>
              <LogOut size={16} aria-hidden="true" />
              Sign Out
            </>
          )}
        </button>
      </div>
    </header>
  );
}
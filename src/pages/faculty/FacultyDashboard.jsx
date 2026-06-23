import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, LogOut, Upload, User } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ROUTES } from '../../config/constants.js';
import './FacultyDashboard.css';

const navItems = [
  { id: 'overview', label: '🏠 Overview', path: ROUTES.FACULTY_DASHBOARD, icon: <LayoutDashboard size={18} /> },
  { id: 'subjects', label: '📚 My Subjects', path: `${ROUTES.FACULTY_DASHBOARD}/subjects`, icon: <BookOpen size={18} /> },
  { id: 'upload', label: '📤 Upload Materials', path: `${ROUTES.FACULTY_DASHBOARD}/resources`, icon: <Upload size={18} /> },
];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = useMemo(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || ROUTES.FACULTY_DASHBOARD;

    if (pathname === ROUTES.FACULTY_DASHBOARD) return 'overview';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/subjects` || pathname.startsWith(`${ROUTES.FACULTY_DASHBOARD}/subjects/`)) return 'subjects';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/resources`) return 'upload';

    return 'overview';
  }, [location.pathname]);
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFacultyData() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          navigate(ROUTES.LOGIN, { replace: true });
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*, batches(name)')
          .eq('id', user.id)
          .eq('role', 'faculty')
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Faculty profile not found.');

        if (!cancelled) setFacultyProfile(profileData);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load faculty dashboard.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFacultyData();

    return () => { cancelled = true; };
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  const canViewFaculty = facultyProfile?.can_view_faculty === true;
  const canViewHod = facultyProfile?.can_view_hod === true;
  const showRoleSwitcher = canViewFaculty && canViewHod;
  const isOnHodDashboard = location.pathname.startsWith(ROUTES.HOD_DASHBOARD);

  function handleSwitchRole() {
    if (isOnHodDashboard) {
      navigate(ROUTES.FACULTY_DASHBOARD, { replace: true });
    } else {
      navigate(ROUTES.HOD_DASHBOARD, { replace: true });
    }
  }

  const displayName = facultyProfile?.full_name || 'Faculty';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return <FacultyDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="faculty-dashboard-layout">
        <FacultySidebar activeTab={activeTab} onNavigate={navigate} />
        <main className="faculty-main">
          <FacultyHeader
            displayName={displayName}
            initials={initials}
            onSignOut={handleSignOut}
            showRoleSwitcher={showRoleSwitcher}
            onSwitchRole={handleSwitchRole}
            isOnHodDashboard={isOnHodDashboard}
          />
          <div className="faculty-content">
            <div className="faculty-error-card">
              <User size={28} />
              <h2>Unable to load Faculty Dashboard</h2>
              <p>{error}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="faculty-dashboard-layout">
      <FacultySidebar activeTab={activeTab} onNavigate={navigate} />

      <main className="faculty-main">
        <FacultyHeader
          displayName={displayName}
          initials={initials}
          onSignOut={handleSignOut}
          showRoleSwitcher={showRoleSwitcher}
          onSwitchRole={handleSwitchRole}
          isOnHodDashboard={isOnHodDashboard}
        />

        <div className="faculty-content">
          {activeTab === 'overview' && <Outlet />}

          {activeTab === 'subjects' && <Outlet />}

          {activeTab === 'upload' && <Outlet />}
        </div>
      </main>
    </div>
  );
}

function FacultySidebar({ activeTab, onNavigate }) {
  return (
    <aside className="faculty-sidebar">
      <div className="faculty-sidebar__header">
        <div className="faculty-sidebar__logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
          </svg>
        </div>
        <h1 className="faculty-sidebar__brand">UCA</h1>
      </div>

      <nav className="faculty-sidebar__nav">
        {navItems.map(({ id, path, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`faculty-sidebar__link ${activeTab === id ? 'faculty-sidebar__link--active' : ''}`}
            onClick={() => onNavigate(path)}
          >
            <span className="faculty-sidebar__link-icon">{icon}</span>
            <span className="faculty-sidebar__link-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="faculty-sidebar__footer">
        <span>Faculty Portal · v1.0</span>
      </div>
    </aside>
  );
}

function FacultyHeader({ displayName, initials, onSignOut, showRoleSwitcher, onSwitchRole, isOnHodDashboard }) {
  return (
    <header className="faculty-header">
      <div className="faculty-header__title-wrap">
        <h2 className="faculty-header__title">Faculty Dashboard</h2>
        <span className="faculty-header__welcome">Welcome back, {displayName.split(' ')[0]}</span>
      </div>

      <div className="faculty-header__right">
        {showRoleSwitcher ? (
          <button type="button" className="faculty-header__switcher" onClick={onSwitchRole}>
            {isOnHodDashboard ? '🔄 Switch to Faculty Portal' : '🔄 Switch to HOD Portal'}
          </button>
        ) : null}
        <div className="faculty-header__user">
          <div className="faculty-header__avatar">{initials}</div>
          <div className="faculty-header__meta">
            <span className="faculty-header__name">{displayName}</span>
            <span className="faculty-header__role">Faculty</span>
          </div>
        </div>
        <button type="button" className="faculty-header__signout" onClick={onSignOut}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </header>
  );
}

function FacultyDashboardSkeleton() {
  return (
    <div className="faculty-dashboard-layout">
      <aside className="faculty-sidebar">
        <div className="faculty-sidebar__header">
          <div className="faculty-sidebar__logo" />
          <div className="faculty-sidebar__brand skeleton" />
        </div>
        <nav className="faculty-sidebar__nav">
          {navItems.map(({ label }) => (
            <div key={label} className="faculty-sidebar__link skeleton" />
          ))}
        </nav>
      </aside>

      <main className="faculty-main">
        <header className="faculty-header">
          <div className="faculty-header__title-wrap">
            <div className="faculty-header__skeleton" />
            <div className="faculty-header__skeleton faculty-header__skeleton--sm" />
          </div>
          <div className="faculty-header__right">
            <div className="faculty-header__skeleton faculty-header__skeleton--avatar" />
            <div className="faculty-header__skeleton faculty-header__skeleton--button" />
          </div>
        </header>

        <div className="faculty-content">
          <div className="faculty-skeleton-grid">
            <div className="faculty-skeleton-card faculty-skeleton-card--wide" />
            <div className="faculty-skeleton-card" />
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, User, ClipboardList, Star, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ROUTES } from '../../config/constants.js';
import { signOut } from '../../services/authService.js';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import FacultyAssignments from '../dashboard/FacultyAssignments.jsx';
import FacultySessionalMarks from '../dashboard/FacultySessionalMarks.jsx';
import './FacultyDashboard.css';

const BASE_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', path: ROUTES.FACULTY_DASHBOARD, icon: <LayoutDashboard size={18} /> },
  { id: 'subjects', label: 'My Subjects', path: `${ROUTES.FACULTY_DASHBOARD}/subjects`, icon: <BookOpen size={18} /> },
  { id: 'assignments', label: 'Assignments', path: `${ROUTES.FACULTY_DASHBOARD}/assignments`, icon: <FileText size={18} /> },
  { id: 'sessional-marks', label: 'Sessional Marks', path: `${ROUTES.FACULTY_DASHBOARD}/sessional-marks`, icon: <ClipboardList size={18} /> },
];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMentor, setIsMentor] = useState(false);

  const navItems = useMemo(() => {
    if (!isMentor) return BASE_NAV_ITEMS;
    return [
      ...BASE_NAV_ITEMS,
      { id: 'mentor', label: '⭐ Mentor Dashboard', path: `${ROUTES.FACULTY_DASHBOARD}/mentor`, icon: <Star size={18} /> },
    ];
  }, [isMentor]);

  const activeTab = useMemo(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || ROUTES.FACULTY_DASHBOARD;

    if (pathname === ROUTES.FACULTY_DASHBOARD) return 'overview';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/subjects` || pathname.startsWith(`${ROUTES.FACULTY_DASHBOARD}/subjects/`) || pathname === `${ROUTES.FACULTY_DASHBOARD}/workspace` || pathname.startsWith(`${ROUTES.FACULTY_DASHBOARD}/workspace/`)) return 'subjects';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/assignments`) return 'assignments';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/sessional-marks`) return 'sessional-marks';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/mentor`) return 'mentor';

    return 'overview';
  }, [location.pathname]);

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
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Faculty profile not found.');

        if (!cancelled) setFacultyProfile(profileData);

        const { data: mentorData, error: mentorError } = await supabase
          .from('section_mentors')
          .select('branch, year, section')
          .eq('faculty_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          if (mentorData && !mentorError) {
            setIsMentor(true);
          } else {
            setIsMentor(false);
          }
        }
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
    try {
      await signOut();
    } catch (error) {
      console.warn("Backend signout failed, forcing local cleanup:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  }

  const canViewFaculty = facultyProfile?.can_view_faculty === true;
  const canViewHod = facultyProfile?.can_view_hod === true;
  const isDirector = facultyProfile?.role === 'director';
  const showRoleSwitcher = (canViewFaculty && canViewHod) || (isDirector && canViewFaculty);
  const isOnHodDashboard = location.pathname.startsWith(ROUTES.HOD_DASHBOARD);
  const isOnDirectorDashboard = location.pathname.startsWith(ROUTES.DIRECTOR_DASHBOARD);

  function handleSwitchRole() {
    if (isOnHodDashboard || isOnDirectorDashboard) {
      navigate(ROUTES.FACULTY_DASHBOARD, { replace: true });
    } else if (isDirector) {
      navigate(ROUTES.DIRECTOR_DASHBOARD, { replace: true });
    } else {
      navigate(ROUTES.HOD_DASHBOARD, { replace: true });
    }
  }

  const displayName = facultyProfile?.full_name || 'Faculty';
  const avatarUrl = facultyProfile?.avatar_url || null;
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
      <DashboardLayout title="Faculty Portal" navItems={navItems}>
        <div className="faculty-error-card">
          <User size={28} />
          <h2>Unable to load Faculty Dashboard</h2>
          <p>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const pageTitle = activeTab === 'subjects' ? 'My Subjects' : activeTab === 'mentor' ? 'Mentor Dashboard' : 'Faculty Dashboard';

  return (
    <DashboardLayout title={pageTitle} navItems={navItems}>
      {activeTab === 'overview' && <Outlet />}

      {activeTab === 'subjects' && <Outlet />}

      {activeTab === 'assignments' && <FacultyAssignments />}

      {activeTab === 'sessional-marks' && <FacultySessionalMarks />}

      {activeTab === 'mentor' && <Outlet />}
    </DashboardLayout>
  );
}

function FacultyDashboardSkeleton() {
  const itemCount = BASE_NAV_ITEMS.length + 1;
  return (
    <div className="faculty-dashboard-layout">
      <aside className="global-sidebar">
        <div className="global-sidebar__header">
          <div className="brand-wrapper">
            <div className="global-sidebar__logo skeleton" />
            <div className="global-sidebar__brand skeleton" />
          </div>
        </div>
        <nav className="global-sidebar__nav">
          {Array.from({ length: itemCount }).map((_, idx) => (
            <div key={idx} className="global-sidebar__link skeleton" />
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

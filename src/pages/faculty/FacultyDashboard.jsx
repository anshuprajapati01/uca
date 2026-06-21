import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, LogOut, Upload, User } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ROUTES } from '../../config/constants.js';
import './FacultyDashboard.css';

const navItems = [
  { id: 'overview', label: '🏠 Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'subjects', label: '📚 My Subjects', icon: <BookOpen size={18} /> },
  { id: 'upload', label: '📤 Upload Materials', icon: <Upload size={18} /> },
];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
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

        const subjects = await fetchAssignedSubjects(user.id, profileData.full_name);
        if (!cancelled) setAssignedSubjects(subjects);
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

  const location = useLocation();
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
        <FacultySidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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
      <FacultySidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
          {activeTab === 'overview' && (
            <OverviewTab facultyProfile={facultyProfile} assignedSubjects={assignedSubjects} />
          )}

          {activeTab === 'subjects' && (
            <MySubjectsTab assignedSubjects={assignedSubjects} />
          )}

          {activeTab === 'upload' && (
            <UploadMaterialsTab />
          )}
        </div>
      </main>
    </div>
  );
}

function FacultySidebar({ activeTab, setActiveTab }) {
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
        {navItems.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`faculty-sidebar__link ${activeTab === id ? 'faculty-sidebar__link--active' : ''}`}
            onClick={() => setActiveTab(id)}
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

function OverviewTab({ facultyProfile, assignedSubjects }) {
  const batchName = facultyProfile?.batches?.name || '—';

  return (
    <div className="faculty-section">
      <section className="faculty-welcome-banner">
        <div>
          <span className="faculty-welcome-banner__eyebrow">Faculty Workspace</span>
          <h3>Welcome to the Faculty Portal</h3>
          <p>Track your assigned subjects and prepare to upload learning materials from one place.</p>
        </div>
        <div className="faculty-welcome-banner__accent">
          <BookOpen size={34} />
        </div>
      </section>

      <div className="faculty-overview-grid">
        <section className="faculty-profile-card">
          <div className="faculty-profile-card__icon">
            <User size={32} />
          </div>
          <div className="faculty-profile-card__body">
            <div className="faculty-profile-row">
              <span>Name</span>
              <strong>{facultyProfile?.full_name || '—'}</strong>
            </div>
            <div className="faculty-profile-row">
              <span>Email</span>
              <strong>{facultyProfile?.email || '—'}</strong>
            </div>
            <div className="faculty-profile-row">
              <span>Batch</span>
              <strong>{batchName}</strong>
            </div>
          </div>
        </section>

        <section className="faculty-stat-card">
          <div className="faculty-stat-card__icon">
            <BookOpen size={28} />
          </div>
          <div>
            <p>Total Assigned Subjects</p>
            <strong>{assignedSubjects.length}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

function MySubjectsTab({ assignedSubjects }) {
  return (
    <section className="faculty-section">
      <div className="faculty-section-header">
        <div>
          <span className="faculty-section-header__eyebrow">Subject Allocation</span>
          <h3>My Subjects</h3>
          <p>Subjects currently allocated to your faculty profile.</p>
        </div>
        <span className="faculty-section-badge">{assignedSubjects.length} assigned</span>
      </div>

      {assignedSubjects.length === 0 ? (
        <div className="faculty-empty-card">
          <BookOpen size={44} />
          <h4>No subjects assigned yet</h4>
          <p>Your administrator has not allocated any subjects to you yet.</p>
        </div>
      ) : (
        <div className="faculty-subjects-grid">
          {assignedSubjects.map((subject) => (
            <article key={subject.id} className="faculty-subject-card">
              <div className="faculty-subject-card__accent" />
              <div className="faculty-subject-card__icon">
                <BookOpen size={24} />
              </div>
              <div className="faculty-subject-card__body">
                <h4>{subject.name || subject.subject_name || 'Unnamed Subject'}</h4>
                <p>{subject.code || subject.subject_code || 'No Code'}</p>
                <div className="faculty-subject-card__meta">
                  <span>Semester {subject.semester || 'N/A'}</span>
                  {subject.credits != null && <span>{subject.credits} Credits</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function UploadMaterialsTab() {
  return (
    <section className="faculty-upload-card">
      <div className="faculty-upload-card__icon">
        <Upload size={34} />
      </div>
      <h3>Upload Materials</h3>
      <p>Upload form will go here</p>
    </section>
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

async function fetchAssignedSubjects(facultyId, facultyName) {
  const normalizedFacultyName = String(facultyName || '').toLowerCase();

  let { data: subjectsData, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .eq('faculty_id', facultyId)
    .order('semester', { ascending: true })
    .order('name', { ascending: true });

  if (subjectsError) {
    const { data: allSubjectsData, error: allSubjectsError } = await supabase
      .from('subjects')
      .select('*')
      .order('semester', { ascending: true })
      .order('name', { ascending: true });

    if (allSubjectsError) throw subjectsError;
    subjectsData = allSubjectsData;
  }

  return (subjectsData || []).filter((subject) => {
    const assignedFaculty = String(subject.assigned_faculty || '').toLowerCase();
    const assignedFacultyName = String(subject.assigned_faculty_name || '').toLowerCase();

    return (
      subject.faculty_id === facultyId ||
      assignedFaculty === facultyId ||
      assignedFaculty === normalizedFacultyName ||
      assignedFacultyName === normalizedFacultyName
    );
  });
}

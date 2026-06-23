import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Layers, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ROUTES, USER_ROLES } from '../../config/constants.js';
import { useNavigate, useParams } from 'react-router-dom';
import './MySubjects.css';

const FACULTY_AVATAR_FALLBACK = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Faculty';

function getFacultyAvatarUrl(faculty) {
  if (!faculty) return FACULTY_AVATAR_FALLBACK;
  if (faculty.avatar_url) return faculty.avatar_url;
  if (faculty.avatarUrl) return faculty.avatarUrl;

  const seed = encodeURIComponent(faculty.full_name || faculty.name || 'Faculty');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

function normalizeSubject(subject) {
  const branch = subject.department || subject.branch || subject.department_code || subject.branch_code || 'N/A';
  const year = subject.year || subject.academic_year || 'N/A';
  const semester = subject.semester || subject.semester_number || 'N/A';

  return {
    ...subject,
    name: subject.name || subject.subject_name || 'Unnamed Subject',
    code: subject.code || subject.subject_code || 'N/A',
    branch: branch === 'cs' ? 'CS' : branch === 'it' ? 'IT' : branch,
    year: /^\d+$/.test(String(year)) ? `Year ${year}` : year,
    semester: /^\d+$/.test(String(semester)) ? `Semester ${semester}` : semester,
    status: subject.status || 'LIVE',
  };
}

function formatStatus(status) {
  if (!status) return 'LIVE';
  return status === 'active' ? 'LIVE' : String(status).toUpperCase();
}

function isLiveSubject(subject) {
  return subject.is_active !== false && subject.status !== 'inactive' && subject.status !== 'archived';
}

export default function MySubjects() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const workspacePanelRef = useRef(null);

  const [facultyProfile, setFacultyProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizedSubjects = useMemo(
    () => subjects.map(normalizeSubject),
    [subjects]
  );

  const selectedSubject = useMemo(
    () => normalizedSubjects.find((subject) => subject.id === subjectId) || null,
    [normalizedSubjects, subjectId]
  );

  const liveCount = useMemo(
    () => normalizedSubjects.filter(isLiveSubject).length,
    [normalizedSubjects]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFacultySubjects() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData?.user) {
          navigate(ROUTES.LOGIN, { replace: true });
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url, role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;
        if (profileData?.role !== USER_ROLES.FACULTY) {
          throw new Error('Faculty profile not found.');
        }

        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*, faculty:faculty_id(id, full_name, avatar_url, expertise_tags)')
          .eq('faculty_id', authData.user.id)
          .order('year', { ascending: true })
          .order('semester', { ascending: true })
          .order('name', { ascending: true });

        if (subjectsError) throw subjectsError;
        if (cancelled) return;

        setFacultyProfile(profileData);
        setSubjects(subjectsData || []);
      } catch (err) {
        console.error('Failed to fetch faculty subjects:', err);
        if (!cancelled) {
          setError(err.message || 'Unable to load subjects.');
          setSubjects([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFacultySubjects();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (subjectId && workspacePanelRef.current) {
      workspacePanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [subjectId, selectedSubject]);

  function handleOpenWorkspace(subject) {
    navigate(`${ROUTES.FACULTY_DASHBOARD}/subjects/${encodeURIComponent(subject.id)}`);
  }

  function handleBackToSubjects() {
    navigate(`${ROUTES.FACULTY_DASHBOARD}/subjects`, { replace: true });
  }

  if (isLoading) {
    return (
      <div className="my-subjects" aria-busy="true">
        <MySubjectsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-subjects">
        <div className="my-subjects__error-card">
          <BookOpen size={32} />
          <h2>Unable to load My Subjects</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const facultyName = facultyProfile?.full_name || 'Faculty';
  const facultyInitials = facultyName
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="my-subjects">
      <section className="my-subjects__hero">
        <div>
          <p className="my-subjects__eyebrow">Faculty Portal · Subject Workspace</p>
          <h1>My Subjects</h1>
          <p className="my-subjects__subtitle">
            Assigned subjects for <strong>{facultyName}</strong>. Open a subject workspace to manage the academic flow.
          </p>
        </div>

        <div className="my-subjects__hero-panel">
          <div className="my-subjects__faculty-avatar">{facultyInitials}</div>
          <div>
            <span className="my-subjects__hero-label">Logged-in faculty</span>
            <strong>{facultyName}</strong>
          </div>
          <span className="my-subjects__live-pill">
            <span className="my-subjects__live-dot" />
            LIVE
          </span>
        </div>
      </section>

      <section className="my-subjects__summary-grid" aria-label="Subject summary">
        <div className="my-subjects__summary-card">
          <BookOpen size={22} />
          <span>Total Subjects</span>
          <strong>{normalizedSubjects.length}</strong>
        </div>
        <div className="my-subjects__summary-card">
          <CalendarDays size={22} />
          <span>Live Workspaces</span>
          <strong>{liveCount}</strong>
        </div>
        <div className="my-subjects__summary-card">
          <UserCheck size={22} />
          <span>Faculty ID</span>
          <strong>{facultyProfile?.id ? `${facultyProfile.id.slice(0, 8)}…` : '—'}</strong>
        </div>
      </section>

      {selectedSubject ? (
        <section ref={workspacePanelRef} className="my-subjects__workspace-panel" aria-label="Subject workspace">
          <div className="my-subjects__workspace-panel__top">
            <div>
              <p className="my-subjects__workspace-eyebrow">Open Workspace</p>
              <h2>{selectedSubject.name}</h2>
              <p>{selectedSubject.code} · {selectedSubject.branch} · {selectedSubject.year}</p>
            </div>
            <span className={`my-subjects__status-pill ${isLiveSubject(selectedSubject) ? 'my-subjects__status-pill--live' : ''}`}>
              {formatStatus(selectedSubject.status)}
            </span>
          </div>

          <div className="my-subjects__workspace-grid">
            <div>
              <span>Subject Code</span>
              <strong>{selectedSubject.code}</strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>{selectedSubject.branch}</strong>
            </div>
            <div>
              <span>Year</span>
              <strong>{selectedSubject.year}</strong>
            </div>
            <div>
              <span>Semester</span>
              <strong>{selectedSubject.semester}</strong>
            </div>
          </div>

          <div className="my-subjects__workspace-actions">
            <button type="button" className="my-subjects__workspace-button" onClick={handleBackToSubjects}>
              Back to Subjects
            </button>
            <span className="my-subjects__workspace-hint">Workspace is ready for course materials, announcements, and faculty tools.</span>
          </div>
        </section>
      ) : subjectId ? (
        <section ref={workspacePanelRef} className="my-subjects__workspace-panel my-subjects__workspace-panel--missing" aria-label="Subject workspace unavailable">
          <div>
            <p className="my-subjects__workspace-eyebrow">Workspace not found</p>
            <h2>Subject workspace could not be opened</h2>
            <p>The selected subject is not assigned to your faculty profile.</p>
          </div>
          <button type="button" className="my-subjects__workspace-button" onClick={handleBackToSubjects}>
            Back to Subjects
          </button>
        </section>
      ) : null}

      {normalizedSubjects.length === 0 ? (
        <section className="my-subjects__empty-card">
          <div className="my-subjects__empty-icon">
            <BookOpen size={34} />
          </div>
          <h2>No subjects assigned yet</h2>
          <p>Your administrator has not allocated any subjects to your faculty account.</p>
        </section>
      ) : (
        <section className="my-subjects__cards-grid" aria-label="Assigned subjects">
          {normalizedSubjects.map((subject) => (
            <article key={subject.id} className="my-subjects__subject-card">
              <div className="my-subjects__subject-card__glow" aria-hidden="true" />
              <div className="my-subjects__subject-card__top">
                <div className="my-subjects__subject-icon">
                  <BookOpen size={22} />
                </div>
                <span className={`my-subjects__status-pill ${isLiveSubject(subject) ? 'my-subjects__status-pill--live' : ''}`}>
                  {formatStatus(subject.status)}
                </span>
              </div>

              <div className="my-subjects__subject-card__body">
                <h3>{subject.name}</h3>
                <p className="my-subjects__subject-code">{subject.code}</p>

                <div className="my-subjects__subject-meta">
                  <span><Layers size={15} /> {subject.branch}</span>
                  <span>{subject.year}</span>
                  <span>{subject.semester}</span>
                </div>

                {subject.faculty && (
                  <div className="my-subjects__faculty-row">
                    <img
                      className="my-subjects__faculty-avatar-img"
                      src={getFacultyAvatarUrl(subject.faculty)}
                      alt={subject.faculty.full_name || 'Assigned faculty'}
                    />
                    <span>{subject.faculty.full_name || 'Assigned Faculty'}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="my-subjects__open-workspace-button"
                onClick={() => handleOpenWorkspace(subject)}
              >
                <span>Open Workspace</span>
                <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function MySubjectsSkeleton() {
  return (
    <>
      <div className="my-subjects__hero my-subjects__skeleton-card" />
      <div className="my-subjects__summary-grid">
        {[0, 1, 2].map((item) => (
          <div key={item} className="my-subjects__summary-card my-subjects__skeleton-card" />
        ))}
      </div>
      <div className="my-subjects__cards-grid">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="my-subjects__subject-card my-subjects__skeleton-card" />
        ))}
      </div>
    </>
  );
}

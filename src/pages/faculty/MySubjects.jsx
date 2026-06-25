import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ROUTES, USER_ROLES } from '../../config/constants.js';
import { useNavigate } from 'react-router-dom';
import './MySubjects.css';

function normalizeSubject(subject) {
  const year = subject.year || subject.academic_year || 'N/A';
  const semester = subject.semester || subject.semester_number || 'N/A';

  return {
    ...subject,
    name: subject.name || subject.subject_name || 'Unnamed Subject',
    code: subject.code || subject.subject_code || 'N/A',
    branch: subject.department || subject.branch || subject.department_code || subject.branch_code || 'N/A',
    year: /^\d+$/.test(String(year)) ? `Year ${year}` : year,
    semester: /^\d+$/.test(String(semester)) ? `Semester ${semester}` : semester,
    status: subject.status || 'LIVE',
    credits: subject.credits || subject.credit_hours || null,
  };
}

export default function MySubjects() {
  const navigate = useNavigate();

  const [, setFacultyProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeBranch, setActiveBranch] = useState('All');
  const [activeYear, setActiveYear] = useState('All');

  const normalizedSubjects = useMemo(
    () => subjects.map(normalizeSubject),
    [subjects]
  );

  const availableBranches = useMemo(() => {
    const branches = Array.from(
      new Set(normalizedSubjects.map((s) => s.branch).filter(Boolean))
    );
    return ['All', ...branches];
  }, [normalizedSubjects]);

  const availableYears = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];

  const filteredSubjects = useMemo(() => {
    return normalizedSubjects.filter((subject) => {
      const branchMatch = activeBranch === 'All' || subject.branch === activeBranch;
      const yearMatch =
        activeYear === 'All' ||
        (subject.year &&
          subject.year.toLowerCase().includes(activeYear.toLowerCase().replace(' Year', '')));
      return branchMatch && yearMatch;
    });
  }, [normalizedSubjects, activeBranch, activeYear]);

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

  function handleCardClick(subject) {
    navigate(`/faculty/workspace/${encodeURIComponent(subject.id)}`);
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
        <div className="faculty-error-card">
          <BookOpen size={28} />
          <h2>Unable to load My Subjects</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-subjects">
      <div className="my-subjects__header">
        <h1>My Subjects</h1>
      </div>

      <div className="my-subjects__filters flex flex-col gap-4">
        <div className="my-subjects__year-pills pill-group">
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              className={`pill-btn ${activeYear === year ? 'pill-btn--active' : ''}`}
              onClick={() => setActiveYear(year)}
            >
              {year}
            </button>
          ))}
        </div>

        <div className="my-subjects__branch-tabs director-branch-subtabs">
          {availableBranches.map((branch) => (
            <button
              key={branch}
              type="button"
              className={`director-branch-subtab ${activeBranch === branch ? 'director-branch-subtab--active' : ''}`}
              onClick={() => setActiveBranch(branch)}
            >
              {branch}
            </button>
          ))}
        </div>
      </div>

      {normalizedSubjects.length === 0 ? (
        <section className="my-subjects__empty-card">
          <div className="my-subjects__empty-icon">
            <BookOpen size={36} />
          </div>
          <h2>No subjects assigned yet</h2>
          <p>Your administrator has not allocated any subjects to your faculty account.</p>
        </section>
      ) : filteredSubjects.length === 0 ? (
        <section className="my-subjects__empty-card">
          <div className="my-subjects__empty-icon">
            <BookOpen size={36} />
          </div>
          <h2>No subjects assigned for this selection</h2>
          <p>No subjects match the selected branch and year filters.</p>
        </section>
      ) : (
        <section className="my-subjects__cards-grid" aria-label="Assigned subjects">
          {filteredSubjects.map((subject) => {
            const footerParts = [subject.semester];
            if (subject.credits) {
              footerParts.push(`Credits ${subject.credits}`);
            }
            const footerText = footerParts.join('  ·  ');

            return (
              <article
                key={subject.id}
                className="my-subjects__subject-card"
                onClick={() => handleCardClick(subject)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(subject);
                  }
                }}
              >
                <div className="my-subjects__subject-card__icon">
                  <BookOpen size={24} />
                </div>

                <div className="my-subjects__subject-card__body">
                  <h3>{subject.name}</h3>
                  <span className="my-subjects__subject-code-pill">{subject.code}</span>

                  <div className="text-gray-400 text-xs mt-3 font-medium">{subject.year} • {subject.branch}</div>

                  <div className="my-subjects__subject-card__footer">
                    {footerText}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function MySubjectsSkeleton() {
  return (
    <div className="my-subjects__skeleton-wrapper">
      <div className="my-subjects__skeleton-header" />
      <div className="my-subjects__cards-grid">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="my-subjects__subject-card my-subjects__skeleton-card" />
        ))}
      </div>
    </div>
  );
}


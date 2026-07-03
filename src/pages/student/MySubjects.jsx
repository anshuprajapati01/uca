import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { USER_ROLES, ROUTES } from '../../config/constants.js';
import './MySubjects.css'; // Isko rehne dete hain tabs/header ke liye

function branchMatches(profileBranch, subjectDepartment) {
  const pb = String(profileBranch || '').toLowerCase();
  const sd = String(subjectDepartment || '').toLowerCase();
  if (!pb || !sd) return false;
  if (pb === sd) return true;
  const tokens = sd.split(/[\s_\-/]+/);
  return tokens.some((token) => pb.includes(token) || token.includes(pb));
}

function yearMatches(profileYear, subjectYear) {
  const py = String(profileYear || '').toLowerCase();
  const sy = String(subjectYear || '').toLowerCase();
  if (!py || !sy) return false;
  if (py === sy) return true;
  const yearNumber = py.match(/\d+/)?.[0];
  if (!yearNumber) return false;
  return sy.includes(yearNumber);
}

function extractSemNum(semString) {
  if (!semString) return null;
  const match = String(semString).match(/\d+/);
  return match ? Number(match[0]) : null;
}

export default function MySubjects({ onSubjectClick }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [liveSemester, setLiveSemester] = useState(null);
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function loadStudentSubjects() {
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
          .select('*, batches(*)')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;
        if (profileData?.role !== USER_ROLES.STUDENT) {
          throw new Error('Unauthorized access.');
        }

        const studentBranch = profileData.selected_branch || profileData.branch || profileData.branch_id || profileData.department || profileData.batches?.department || profileData.batches?.branch || 'Unknown';
        const studentYear = profileData.selected_year || profileData.year || profileData.batches?.year || profileData.batches?.academic_year || 'Unknown';

        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
          .order('semester', { ascending: true })
          .order('name', { ascending: true });

        if (subjectsError) throw subjectsError;
        if (cancelled) return;

        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('is_sem1_live, is_sem2_live, is_sem3_live, is_sem4_live, is_sem5_live, is_sem6_live, is_sem7_live, is_sem8_live')
          .eq('code', studentBranch)
          .eq('description', studentYear)
          .maybeSingle();

        const yearSemesterMap = {
          '1st Year': [1, 2],
          '2nd Year': [3, 4],
          '3rd Year': [5, 6],
          '4th Year': [7, 8],
        };
        const semestersForStudentYear = yearSemesterMap[studentYear] || [];

        let liveSemester = null;
        if (deptData && !deptError) {
          for (let i = 1; i <= 8; i++) {
            if (deptData[`is_sem${i}_live`]) {
              liveSemester = i;
              break;
            }
          }
        }

        const allSemesters = (subjectsData || [])
          .map((s) => extractSemNum(s.semester))
          .filter((sem) => sem !== null);
        const uniqueSorted = [...new Set(allSemesters)].sort((a, b) => a - b);

        let defaultSemester = null;
        if (liveSemester != null && uniqueSorted.includes(liveSemester)) {
          defaultSemester = liveSemester;
        } else {
          const availableForYear = uniqueSorted.filter((sem) => semestersForStudentYear.includes(sem));
          if (availableForYear.length > 0) {
            defaultSemester = availableForYear[availableForYear.length - 1];
          } else if (uniqueSorted.length > 0) {
            defaultSemester = uniqueSorted[uniqueSorted.length - 1];
          }
        }

        setProfile(profileData);
        setAllSubjects(subjectsData || []);
        setSelectedSemester(defaultSemester);
        setLiveSemester(liveSemester);
      } catch (err) {
        console.error('Failed to fetch student subjects:', err);
        if (!cancelled) {
          setError(err.message || 'Unable to load subjects.');
          setAllSubjects([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStudentSubjects();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const filteredSubjects = useMemo(() => {
    if (!profile) return [];
    const studentBranch = profile?.selected_branch || profile?.branch || profile?.branch_id || profile?.department || profile?.batches?.department || profile?.batches?.branch;
    const studentYear = profile?.selected_year || profile?.year || profile?.batches?.year || profile?.batches?.academic_year;
    return (allSubjects || []).filter((s) => {
      const branchOk = branchMatches(studentBranch, s.department);
      const yearOk = yearMatches(studentYear, s.year) || yearMatches(studentYear, s.semester);
      return branchOk && yearOk;
    });
  }, [allSubjects, profile]);

  const uniqueSemesters = useMemo(() => {
    const semesterSet = new Set();
    filteredSubjects.forEach((s) => {
      const num = extractSemNum(s.semester);
      if (num !== null) semesterSet.add(num);
    });
    return Array.from(semesterSet).sort((a, b) => Number(a) - Number(b));
  }, [filteredSubjects]);

  const subjectsForSelectedSemester = useMemo(() => {
    if (selectedSemester == null) return [];
    const filtered = filteredSubjects.filter((s) => extractSemNum(s.semester) === selectedSemester);
    
    const uniqueSubjects = [];
    const seenCodes = new Set();
    
    for (const sub of filtered) {
      const uniqueKey = sub.code || sub.subject_code || sub.name; 
      if (!seenCodes.has(uniqueKey)) {
        seenCodes.add(uniqueKey);
        uniqueSubjects.push(sub);
      }
    }
    return uniqueSubjects;
  }, [filteredSubjects, selectedSemester]);

  const isPractical = (sub) => {
    const type = sub.type?.toLowerCase();
    const name = sub.name?.toLowerCase() || '';
    const subjectName = sub.subject_name?.toLowerCase() || '';
    return type === 'practical' || name.includes('lab') || subjectName.includes('lab') || name.includes('practical');
  };

  const finalFilteredSubjects = useMemo(() => {
    if (subjectTypeFilter === 'Practical') {
      return subjectsForSelectedSemester.filter(isPractical);
    }
    if (subjectTypeFilter === 'Theory') {
      return subjectsForSelectedSemester.filter((sub) => !isPractical(sub));
    }
    return subjectsForSelectedSemester;
  }, [subjectsForSelectedSemester, subjectTypeFilter]);

  if (isLoading) {
    return (
      <div className="student-my-subjects" aria-busy="true">
        <div className="student-my-subjects__header">
          <h1>My Subjects</h1>
        </div>
        <div className="student-my-subjects__skeleton-grid">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="student-my-subjects__skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-my-subjects">
        <div className="student-my-subjects__header">
          <h1>My Subjects</h1>
        </div>
        <div className="student-my-subjects__error-card">
          <h2>Unable to load subjects</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const studentBranch = profile?.selected_branch || profile?.branch || profile?.branch_id || profile?.department || profile?.batches?.department || profile?.batches?.branch || 'Unknown';
  const studentYear = profile?.selected_year || profile?.year || profile?.batches?.year || profile?.batches?.academic_year || 'Unknown';

  return (
    <div className="student-my-subjects">
      <div className="student-my-subjects__header">
        <h1>My Subjects</h1>
        {profile && (
          <span className="student-my-subjects__subtitle">
            {studentBranch || 'Your Department'} · Year {studentYear || 'N/A'}
          </span>
        )}
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="student-my-subjects__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <h2>No subjects assigned yet</h2>
          <p>There are no subjects mapped to your department and year.</p>
        </div>
      ) : (
        <>
          <div className="student-my-subjects__tabs">
            {uniqueSemesters.map((sem) => {
              const isLive = sem === liveSemester;
              return (
                <button
                  key={sem}
                  type="button"
                  className={`student-my-subjects__tab ${selectedSemester === sem ? 'student-my-subjects__tab--active' : ''}`}
                  onClick={() => setSelectedSemester(sem)}
                >
                  <span className="student-my-subjects__tab-label">Semester {sem}</span>
                  {isLive && <span className="student-my-subjects__tab-live">LIVE</span>}
                </button>
              );
            })}
          </div>

          <div className="student-my-subjects__type-filter">
            {['All', 'Theory', 'Practical'].map((type) => (
              <button
                key={type}
                type="button"
                className={`student-my-subjects__type-pill ${subjectTypeFilter === type ? 'student-my-subjects__type-pill--active' : ''}`}
                onClick={() => setSubjectTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {finalFilteredSubjects.length === 0 ? (
            <div className="student-my-subjects__empty-state">
              <h2>No theory/practical subjects found for this semester.</h2>
              <p>Try changing the type filter or selecting a different semester.</p>
            </div>
          ) : (
            /* 🔥 YAHAN SE MAIN MAGIC START HOTA HAI 🔥 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {finalFilteredSubjects.map((subject) => (
                <div 
                  key={subject.id}
                  className="group relative bg-[#1c1c27] border border-white/10 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/60 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] flex flex-col justify-between min-h-[160px]"
                  onClick={() => onSubjectClick && onSubjectClick(subject)}
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight mb-3 line-clamp-2 leading-tight">
                      {subject.name || subject.subject_name || 'Unnamed Subject'}
                    </h3>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-mono text-gray-300 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-md">
                        {subject.code || subject.subject_code || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {subject.credits || subject.credit_hours || 'N/A'} Cr
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-3">
                    <img 
                      src={subject.faculty?.avatar_url || subject.faculty?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(subject.faculty?.full_name || subject.faculty_name || 'Teacher')}&background=2d2d3f&color=8b5cf6`} 
                      alt="Faculty" 
                      className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover:border-emerald-500/50 transition-colors"
                    />
                    <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
                      {subject.faculty?.full_name || subject.faculty_name || 'Faculty TBA'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
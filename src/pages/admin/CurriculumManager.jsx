import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import './CurriculumManager.css';

const FACULTY_AVATAR_FALLBACK = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Faculty';

const getFacultyAvatarUrl = (faculty) => {
  if (!faculty) return FACULTY_AVATAR_FALLBACK;
  if (faculty.avatar_url) return faculty.avatar_url;
  if (faculty.avatarUrl) return faculty.avatarUrl;
  const seed = encodeURIComponent(faculty.full_name || faculty.name || 'Faculty');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const YEAR_SEMESTERS = {
  '1st Year': [1, 2],
  '2nd Year': [3, 4],
  '3rd Year': [5, 6],
  '4th Year': [7, 8]
};

const CURRENT_TERM = 'ODD';

function getSemestersForYear(year, isLive = true) {
  if (!year || !YEAR_SEMESTERS[year]) return [];
  return YEAR_SEMESTERS[year].map((semesterNumber) => ({
    id: `sem${semesterNumber}`,
    name: `Semester ${semesterNumber}`,
    year,
    isLive: CURRENT_TERM === 'ODD' && semesterNumber % 2 === 1 && isLive
  }));
}

const getFacultyInfo = (subject) => {
  const faculty = subject.faculty || subject.assigned_faculty || null;
  if (!faculty) {
    console.warn('Missing faculty on subject:', subject.id, subject.name, 'keys:', Object.keys(subject));
    return { name: 'Unknown Faculty', avatarUrl: FACULTY_AVATAR_FALLBACK };
  }
  return {
    name: faculty.full_name || faculty.name || 'Unknown Faculty',
    avatarUrl: getFacultyAvatarUrl(faculty),
  };
};

export default function CurriculumManager() {
  // ── State Hooks ──
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [dbSubjectsList, setDbSubjectsList] = useState([]);
  const [dbFacultyList, setDbFacultyList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectType, setSubjectType] = useState('Theory');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('Theory');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const toastTimerRef = useRef(null);

  // ── Context Hooks ──
  const {
    isLoading: isCheckingAuth,
    isAssigned,
    hodAuthorizedBranches,
    hodAssignedYears,
    hodDepartmentsData,
    refreshDepartments,
  } = useHodContext();
  const { profile } = useAuth();
  const hodPersonName = profile?.full_name || '';

  // ── Helper Functions ──
  const getDepartmentRow = (branchCode, year) => {
    return hodDepartmentsData.find(
      (d) => d.code === branchCode && d.description === year
    );
  };

  const getDepartmentRowsForYear = (year) => {
    if (!year) return [];
    return hodDepartmentsData.filter((d) => {
      const branchCode = d.code || d.name;
      return d.description === year && hodAuthorizedBranches.some((b) => b.code === branchCode);
    });
  };

  // ── Derived Values ──
  const activeDepartmentRows = selectedYear ? getDepartmentRowsForYear(selectedYear) : [];

  const isSemLiveForYear = (semId) => {
    if (activeDepartmentRows.length === 0) return false;
    const semNum = semId.replace('sem', '');
    return activeDepartmentRows.some((d) => d[`is_sem${semNum}_live`]);
  };

  const effectiveBranchCode = selectedBranch || (hodAuthorizedBranches.length === 1 ? hodAuthorizedBranches[0].code : null);
  const activeDepartmentRow = effectiveBranchCode && selectedYear
    ? getDepartmentRow(effectiveBranchCode, selectedYear)
    : null;

  const selectedSemesterDetails = selectedSemester
    ? getSemestersForYear(selectedYear, true).find((semester) => semester.id === selectedSemester)
    : null;
  const selectedSemesterNumber = selectedSemester?.replace('sem', '');
  const activeSemesterLive = activeDepartmentRow?.[`is_sem${selectedSemesterNumber}_live`] ?? false;

  const selectedFacultyData = dbFacultyList.find((faculty) => faculty.id === selectedFaculty);

  // ── useMemo Hooks ──
  const theorySubjects = useMemo(
    () => dbSubjectsList.filter((subject) => subject.type?.toLowerCase() === 'theory'),
    [dbSubjectsList]
  );
  const practicalSubjects = useMemo(
    () => dbSubjectsList.filter((subject) => subject.type?.toLowerCase() === 'practical'),
    [dbSubjectsList]
  );

  const branchFilteredTheorySubjects = useMemo(
    () => theorySubjects.filter((subject) => subject.department === selectedBranch),
    [theorySubjects, selectedBranch]
  );
  const branchFilteredPracticalSubjects = useMemo(
    () => practicalSubjects.filter((subject) => subject.department === selectedBranch),
    [practicalSubjects, selectedBranch]
  );

  const filteredSemesterSubjects =
    subjectTypeFilter?.toLowerCase() === 'theory' ? branchFilteredTheorySubjects : branchFilteredPracticalSubjects;

  // ── useCallback Hooks ──
  const fetchFaculty = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, expertise_tags')
      .eq('can_view_faculty', true)
      .order('full_name', { ascending: true });

    if (!error && data) {
      setDbFacultyList(data || []);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    const semesterDetails = selectedSemester
      ? getSemestersForYear(selectedYear).find((sem) => sem.id === selectedSemester)
      : null;

    if (!semesterDetails || !selectedBranch) {
      setDbSubjectsList([]);
      return;
    }

    setIsLoadingSubjects(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
         .select('*, faculty:faculty_id(id, full_name, avatar_url, expertise_tags)')
         .eq('department', selectedBranch)
         .eq('year', selectedYear)
         .eq('semester', semesterDetails.name)
         .order('created_at', { ascending: false });

      if (error) throw error;
      setDbSubjectsList(data || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setDbSubjectsList([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [selectedBranch, selectedSemester, selectedYear]);

  // ── useEffect Hooks ──
  useEffect(() => {
    console.log('showAddModal changed:', showAddModal);
  }, [showAddModal]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  useEffect(() => {
    if (!isAssigned) return;
  }, [isAssigned]);

  useEffect(() => {
    if (!selectedYear) {
      setSelectedSemester(null);
      setSelectedBranch(null);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedBranch && selectedSemester && selectedYear) {
      fetchSubjects();
    }
  }, [fetchSubjects]);

  useEffect(() => {
    if (!isAssigned) return;
    if (!selectedYear && hodAssignedYears.length > 0) {
      setSelectedYear(hodAssignedYears[0]);
    }
  }, [isAssigned, selectedYear, hodAssignedYears]);

  // ── Handler Functions ──
  const handleSubmitSubject = async (e) => {
    e.preventDefault();
    if (!selectedFacultyData || !selectedSemesterDetails || !selectedBranch || !activeSemesterLive) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: subjectName,
        code: subjectCode,
        type: subjectType.toLowerCase(),
        faculty_id: selectedFacultyData.id,
        department: selectedBranch,
        year: selectedYear,
        semester: selectedSemesterDetails.name,
      };

      const { error } = await supabase.from('subjects').insert(payload);

      if (error) throw error;

      await fetchSubjects();
      setSubjectName('');
      setSubjectCode('');
      setSubjectType('Theory');
      setSelectedFaculty('');
      setShowAddModal(false);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setToastMsg('Subject added successfully!');
      toastTimerRef.current = setTimeout(() => {
        setToastMsg('');
      }, 3000);
    } catch (err) {
      alert('Error adding subject: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!selectedSemesterDetails || !activeSemesterLive) return;

    if (window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      const { error } = await supabase.from('subjects').delete().eq('id', subjectId);

      if (error) {
        alert('Failed to delete subject: ' + error.message);
        return;
      }
      await fetchSubjects();

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setToastMsg('Subject deleted successfully!');
      toastTimerRef.current = setTimeout(() => {
        setToastMsg('');
      }, 3000);
    }
  };

  const toggleSemesterLive = async (e, semesterId) => {
    e.stopPropagation();
    if (activeDepartmentRows.length === 0) return;

    const semNum = semesterId.replace('sem', '');
    const targetColumn = `is_sem${semNum}_live`;

    const updates = activeDepartmentRows.map(async (deptRow) => {
      const isCurrentlyLive = deptRow[targetColumn];
      const payload = {};

      for (let i = 1; i <= 8; i++) {
        const col = 'is_sem' + i + '_live';
        if (deptRow.hasOwnProperty(col)) {
          payload[col] = false;
        }
      }

      if (!isCurrentlyLive) {
        payload[targetColumn] = true;
      }

      const { error } = await supabase
        .from('departments')
        .update(payload)
        .eq('id', deptRow.id);

      return error;
    });

    const results = await Promise.all(updates);
    const hasError = results.some((err) => err);

    if (hasError) {
      console.error('Error toggling semester live:', results.filter(Boolean));
    } else {
      await refreshDepartments();
    }
  };

  // ── Early Returns (after all hooks) ──
  if (isCheckingAuth) {
    return <div className="curriculum-manager"><p>Verifying Access...</p></div>;
  }

  if (!isAssigned) {
    return (
      <div className="curriculum-manager">
        <div className="curriculum-manager__header">
          <h3 className="section-title">Access Denied</h3>
          <p className="curriculum-manager__subtitle">You have not been assigned as an HOD to any department yet.</p>
        </div>
      </div>
    );
  }

  const yearOptions = hodAssignedYears;

  console.log('Button Disabled Status:', !activeSemesterLive, 'for branch:', selectedBranch, 'activeDepartmentRow:', activeDepartmentRow);

  // ── JSX Return ──
  return (
    <div className="curriculum-manager">
      <div className="curriculum-manager__header">
        <div>
          <p className="curriculum-manager__eyebrow">HOD Curriculum Access</p>
          <h3 className="section-title">Curriculum Manager</h3>
          <p className="curriculum-manager__subtitle">
            {hodPersonName} · Authorized for {hodAssignedYears.join(' & ')}
          </p>
        </div>
        <span className="curriculum-manager__term-pill">{CURRENT_TERM} Term</span>
      </div>

      {/* State 1: Year Tabs + Semester Cards (no semester selected) */}
      {!selectedSemester ? (
        <>
          {/* Year Tabs */}
          <div className="year-selector-container" style={{ marginBottom: '1.75rem' }}>
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={`year-tab${year === selectedYear ? ' year-tab--active' : ''}`}
                onClick={() => setSelectedYear(year)}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Semester Selection */}
          <div className="curriculum-manager__year-panel">
            <div className="curriculum-manager__year-header">
              <div>
                <p className="curriculum-manager__eyebrow">{selectedYear}</p>
                <h4 className="curriculum-manager__panel-title">Select a semester</h4>
              </div>
              <span className="curriculum-manager__scope-pill">
                {getSemestersForYear(selectedYear).length} semesters
              </span>
            </div>

            <div className="semester-cards-grid">
              {getSemestersForYear(selectedYear).map((sem) => {
                const isSemLive = isSemLiveForYear(sem.id);
                return (
                  <div key={sem.id} className="semester-card-wrapper">
                    <button
                      type="button"
                      className="semester-card"
                      onClick={() => setSelectedSemester(sem.id)}
                    >
                      {isSemLive && <span className="live-badge">LIVE</span>}
                      <h4 className="semester-card__name">{sem.name}</h4>
                      <p className="semester-card__year">{sem.year}</p>
                      <span className="semester-card__action">Open curriculum</span>
                    </button>
                    {activeDepartmentRows.length > 0 && (
                      <label className="semester-card__toggle">
                        <input
                          type="checkbox"
                          checked={isSemLive}
                          onChange={(e) => toggleSemesterLive(e, sem.id)}
                        />
                        <span className="toggle-track"><span className="toggle-thumb" /></span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : !selectedBranch ? (
        <>
          {/* State 2: Branch Cards only */}
          <button className="curriculum-manager__back" onClick={() => setSelectedSemester(null)}>
            &larr; Back to Semesters
          </button>

          <div className="semester-detail-card">
            <div className="semester-detail-card__top">
              <div>
                <p className="curriculum-manager__eyebrow">{selectedYear}</p>
                <h4 className="semester-detail-card__title">{selectedSemesterDetails?.name}</h4>
                <p className="semester-detail-card__meta">
                  {activeSemesterLive ? 'Live curriculum planning is active' : 'Upcoming curriculum planning'}
                </p>
              </div>
              {activeSemesterLive && <span className="live-badge">LIVE</span>}
            </div>
          </div>

          <div className="branch-cards-grid semester-branch-cards">
            {hodAuthorizedBranches.map((branch) => (
              <button
                key={branch.code}
                type="button"
                className="branch-card"
                onClick={() => setSelectedBranch(branch.code)}
              >
                <div className="branch-card__code">{branch.code}</div>
                <div className="branch-card__name">{branch.name}</div>
                <div className="branch-card__action">Manage Subjects</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* State 3: Subject Management only */}
          <button className="curriculum-manager__back" onClick={() => setSelectedBranch(null)}>
            &larr; Back to Branches
          </button>
          {toastMsg && (
            <div className="cm-toast">
              <span className="cm-toast__message">{toastMsg}</span>
            </div>
          )}
          <div className="semester-detail-card">
            <div className="semester-detail-card__top">
              <div>
                <p className="curriculum-manager__eyebrow">{selectedYear}</p>
                <h4 className="semester-detail-card__title">{selectedSemesterDetails?.name} · {selectedBranch}</h4>
                <p className="semester-detail-card__meta">
                  {activeSemesterLive ? 'Live curriculum planning is active' : 'Upcoming curriculum planning'}
                </p>
              </div>
              {activeSemesterLive && <span className="live-badge">LIVE</span>}
            </div>

            {filteredSemesterSubjects.length === 0 && !isLoadingSubjects && (
              <div className="semester-detail-card__empty">
                <strong>No subjects added yet</strong>
                <span>Subject details for {selectedSemesterDetails?.name} will appear here.</span>
              </div>
            )}

            <button
              type="button"
              className="curriculum-manager__add-button"
              onClick={() => setShowAddModal(true)}
              disabled={!activeSemesterLive}
            >
              + Add New Subject
            </button>
          </div>

          <div className="cm-type-tabs" role="tablist" aria-label="Subject type" style={{ marginTop: '1.5rem' }}>
            {['Theory', 'Practical'].map((type) => (
              <button
                key={type}
                type="button"
                className={`cm-type-tab ${subjectTypeFilter === type ? 'cm-type-tab--active' : ''}`}
                role="tab"
                aria-selected={subjectTypeFilter === type}
                onClick={() => setSubjectTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="subject-grid">
            {isLoadingSubjects ? (
              <div className="semester-detail-card__empty">Loading subjects...</div>
            ) : filteredSemesterSubjects.length > 0 ? filteredSemesterSubjects.map((subject) => {
              const facultyInfo = getFacultyInfo(subject);
              return (
                <div
                  key={subject.id}
                  className="subject-card"
                >
                  <button
                    type="button"
                    className="subject-card__delete-button"
                    aria-label={`Delete ${subject.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSubject(subject.id);
                    }}
                    title="Delete subject"
                    disabled={!activeSemesterLive}
                  >
                    <Trash2 size={16} />
                  </button>
                  <h3 className="subject-card__title">{subject.name}</h3>
                  <p className="subject-card__code">{subject.code}</p>
                  <div className="subject-card__faculty-section">
                    <img
                      className="subject-card__faculty-avatar"
                      src={facultyInfo.avatarUrl}
                      alt={facultyInfo.name}
                    />
                    <span className="subject-card__faculty-name">{facultyInfo.name}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="semester-detail-card__empty">
                <strong>No {subjectTypeFilter.toLowerCase()} subjects added yet</strong>
                <span>Use Add New Subject to populate this semester.</span>
              </div>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="cm-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cm-modal__title">Add New Subject</h3>
            <form className="cm-form" onSubmit={handleSubmitSubject}>
              <div className="cm-form__row">
                <label className="cm-label">Subject Name</label>
                <input
                  className="cm-input"
                  type="text"
                  placeholder="Discrete Structures & Theory of Logic"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required
                />
              </div>

              <div className="cm-form__row">
                <label className="cm-label">Subject Code</label>
                <input
                  className="cm-input"
                  type="text"
                  placeholder="BCS301"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  required
                />
              </div>

              <div className="cm-form__row">
                <label className="cm-label">Subject Type</label>
                <div className="cm-type-group">
                  {['Theory', 'Practical'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`cm-type-pill ${subjectType === type ? 'cm-type-pill--active' : ''}`}
                      onClick={() => setSubjectType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cm-form__row">
                <label className="cm-label">Assign Faculty Teacher</label>
                <select
                  className="cm-select"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Faculty</option>
                  {dbFacultyList.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.full_name} {fac.expertise_tags?.length > 0 ? `(${fac.expertise_tags[0]})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFacultyData && (
                <div className="cm-faculty-preview">
                  <img
                    className="cm-faculty-avatar-img"
                    src={getFacultyAvatarUrl(selectedFacultyData)}
                    alt={selectedFacultyData.full_name}
                  />
                  <span className="cm-faculty-name">
                    {selectedFacultyData.full_name}
                  </span>
                </div>
              )}

              <div className="cm-form__actions">
                <button type="button" className="cm-cancel-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="cm-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

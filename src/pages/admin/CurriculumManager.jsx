import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Trash2, PenTool } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { useHodContext } from '../../context/HodContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
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
  const [selectedSubBranch, setSelectedSubBranch] = useState(null);
  const [dbSubjectsList, setDbSubjectsList] = useState([]);
  const [dbFacultyList, setDbFacultyList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [credits, setCredits] = useState(3);
  const [subjectType, setSubjectType] = useState('Theory');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState(false);
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('Theory');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [deleteSubjectId, setDeleteSubjectId] = useState(null);
  const [reassignModal, setReassignModal] = useState({ isOpen: false, subject: null, newFacultyId: '' });
  const [reassignSearchTerm, setReassignSearchTerm] = useState('');
  const [isReassignDropdownOpen, setIsReassignDropdownOpen] = useState(false);
  const toastTimerRef = useRef(null);
  const facultyDropdownRef = useRef(null);
  const reassignDropdownRef = useRef(null);

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
      return d.description === year && hodAuthorizedBranches.some((b) => b.code === branchCode || AGGREGATE_DEPARTMENTS[b.code]?.includes(d.code));
    });
  };

  const isAggregateHod = useMemo(() => {
    return hodAuthorizedBranches.some((b) => AGGREGATE_DEPARTMENTS[b.code]);
  }, [hodAuthorizedBranches]);

  const getSubBranchesForAggregate = (branchCode) => {
    if (!AGGREGATE_DEPARTMENTS[branchCode]) return [];
    return AGGREGATE_DEPARTMENTS[branchCode].map((sub) => ({
      id: sub,
      code: sub,
      name: sub
    }));
  };

  // ── Derived Values ──
  const activeDepartmentRows = selectedYear ? getDepartmentRowsForYear(selectedYear) : [];

  const isSemLiveForYear = (semId) => {
    if (activeDepartmentRows.length === 0) return false;
    const semNum = semId.replace('sem', '');
    return activeDepartmentRows.some((d) => d[`is_sem${semNum}_live`]);
  };

  const effectiveBranchCode = isAggregateHod && selectedSubBranch
    ? selectedSubBranch
    : (hodAuthorizedBranches.length === 1 && !isAggregateHod ? hodAuthorizedBranches[0].code : selectedBranch);

  const activeDepartmentRow = effectiveBranchCode && selectedYear
    ? getDepartmentRow(effectiveBranchCode, selectedYear) || (isAggregateHod && selectedSubBranch && getDepartmentRow(selectedBranch, selectedYear))
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
    () => theorySubjects.filter((subject) => subject.department === effectiveBranchCode),
    [theorySubjects, effectiveBranchCode]
  );
  const branchFilteredPracticalSubjects = useMemo(
    () => practicalSubjects.filter((subject) => subject.department === effectiveBranchCode),
    [practicalSubjects, effectiveBranchCode]
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

    if (!semesterDetails || !effectiveBranchCode) {
      setDbSubjectsList([]);
      return;
    }

    setIsLoadingSubjects(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
         .select('*, faculty:faculty_id(id, full_name, avatar_url, expertise_tags)')
         .eq('department', effectiveBranchCode)
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
  }, [effectiveBranchCode, selectedSemester, selectedYear]);

  useEffect(() => {
    if (!selectedYear) {
      setSelectedSemester(null);
      setSelectedBranch(null);
      setSelectedSubBranch(null);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedBranch) {
      setSelectedSubBranch(null);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  useEffect(() => {
    if (!isAssigned) return;
    if (!selectedYear && hodAssignedYears.length > 0) {
      setSelectedYear(hodAssignedYears[0]);
    }
  }, [isAssigned, selectedYear, hodAssignedYears]);

  const isStandardSingleBranchHod = hodAuthorizedBranches.length === 1 && !isAggregateHod;

  useEffect(() => {
    if (isStandardSingleBranchHod && selectedSemester && !selectedBranch) {
      setSelectedBranch(hodAuthorizedBranches[0].code);
    }
  }, [isStandardSingleBranchHod, selectedSemester, selectedBranch, hodAuthorizedBranches]);

  useEffect(() => {
    if (effectiveBranchCode && selectedSemester && selectedYear) {
      fetchSubjects();
    }
  }, [effectiveBranchCode, selectedSemester, selectedYear, fetchSubjects]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (facultyDropdownRef.current && !facultyDropdownRef.current.contains(event.target)) {
        setIsFacultyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleReassignClickOutside(event) {
      if (reassignDropdownRef.current && !reassignDropdownRef.current.contains(event.target)) {
        setIsReassignDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleReassignClickOutside);
    return () => document.removeEventListener('mousedown', handleReassignClickOutside);
  }, []);

  const selectedReassignFaculty = dbFacultyList.find((f) => f.id === reassignModal.newFacultyId);

  const handleSubmitSubject = async (e) => {
    e.preventDefault();
    if (!selectedFacultyData || !selectedSemesterDetails || !effectiveBranchCode || !activeSemesterLive) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: subjectName,
        code: subjectCode,
        type: subjectType.toLowerCase(),
        faculty_id: selectedFacultyData.id,
        department: effectiveBranchCode,
        year: selectedYear,
        semester: selectedSemesterDetails.name,
        credits,
      };

      const { error } = await supabase.from('subjects').insert(payload);

      if (error) throw error;

      await fetchSubjects();
      setSubjectName('');
      setSubjectCode('');
      setCredits(3);
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

  const confirmDeleteSubject = async (subjectId) => {
    if (!selectedSemesterDetails || !activeSemesterLive) return;

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

    setDeleteSubjectId(null);
  };

  const handleReassignFaculty = async () => {
    if (!reassignModal.newFacultyId) return toast.error('Select a faculty');
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ faculty_id: reassignModal.newFacultyId })
        .eq('id', reassignModal.subject.id);

      if (error) throw error;

      toast.success('Faculty assigned successfully!');
      setReassignModal({ isOpen: false, subject: null, newFacultyId: '' });
      setReassignSearchTerm('');
      fetchSubjects();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign faculty.');
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
        if (Object.prototype.hasOwnProperty.call(deptRow, col)) {
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
            {hodAssignedYears.map((year) => (
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
          {/* State 2: Branch Cards (for multi-branch HODs and aggregate HODs) */}
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
            {hodAuthorizedBranches.map((branch) => {
              const isAggregate = AGGREGATE_DEPARTMENTS[branch.code];
              const branchLabel = isAggregate ? `${branch.name} Branch` : branch.name;
              return (
                <button
                  key={branch.code}
                  type="button"
                  className="branch-card"
                  onClick={() => setSelectedBranch(branch.code)}
                >
                  <div className="branch-card__code">{branch.code}</div>
                  <div className="branch-card__name">{branchLabel}</div>
                  <div className="branch-card__action">{isAggregate ? 'Select Sub-Branch' : 'Manage Subjects'}</div>
                </button>
              );
            })}
          </div>
        </>
      ) : isAggregateHod && !selectedSubBranch ? (
        <>
          {/* State 2b: Sub-Branch Cards (only for aggregate HODs) */}
          <button className="curriculum-manager__back" onClick={() => setSelectedBranch(null)}>
            &larr; Back to Branches
          </button>

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
          </div>

          <div className="branch-cards-grid semester-branch-cards">
            {getSubBranchesForAggregate(selectedBranch).map((subBranch) => (
              <button
                key={subBranch.code}
                type="button"
                className="branch-card"
                onClick={() => setSelectedSubBranch(subBranch.code)}
              >
                <div className="branch-card__code">{subBranch.code}</div>
                <div className="branch-card__name">{subBranch.name}</div>
                <div className="branch-card__action">Manage Subjects</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* State 3: Subject Management */}
          <button className="curriculum-manager__back" onClick={() => {
            if (isAggregateHod) {
              setSelectedSubBranch(null);
            } else {
              setSelectedBranch(null);
            }
          }}>
            &larr; Back to {isAggregateHod ? 'Sub-Branches' : 'Branches'}
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
                <h4 className="semester-detail-card__title">{selectedSemesterDetails?.name} · {effectiveBranchCode}</h4>
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      background: 'transparent',
                      padding: '0',
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                    }}
                  >
                    <button
                      type="button"
                      className="subject-card__assign-button"
                      aria-label={`Assign faculty to ${subject.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setReassignModal({ isOpen: true, subject, newFacultyId: '' });
                      }}
                      title="Assign faculty"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '5px',
                        color: '#94a3b8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '999px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#e2e8f0';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <PenTool size={16} />
                    </button>
                    <button
                      type="button"
                      className="subject-card__delete-button"
                      aria-label={`Delete ${subject.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteSubjectId(subject.id);
                      }}
                      title="Delete subject"
                      disabled={!activeSemesterLive}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '5px',
                        color: '#fca5a5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '999px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!activeSemesterLive) return;
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#fca5a5';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                <label className="cm-label">Credits</label>
                <select
                  className="cm-select"
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  required
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} Credit{value !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
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
                <div className="cm-faculty-combobox" ref={facultyDropdownRef}>
                  <input
                    className="cm-input"
                    type="text"
                    placeholder="Search & Select Faculty..."
                    value={facultySearch}
                    onChange={(e) => {
                      setFacultySearch(e.target.value);
                      setIsFacultyDropdownOpen(true);
                    }}
                    onFocus={() => setIsFacultyDropdownOpen(true)}
                    required
                  />
                  {isFacultyDropdownOpen && (
                    <div className="cm-faculty-dropdown">
                      {dbFacultyList
                        .filter((f) =>
                          f.full_name.toLowerCase().includes(facultySearch.toLowerCase())
                        )
                        .map((fac) => (
                          <div
                            key={fac.id}
                            className="cm-faculty-option"
                            onClick={() => {
                              setSelectedFaculty(fac.id);
                              setFacultySearch(fac.full_name + (fac.expertise_tags?.length > 0 ? ` (${fac.expertise_tags[0]})` : ''));
                              setIsFacultyDropdownOpen(false);
                            }}
                          >
                            {fac.full_name} {fac.expertise_tags?.length > 0 ? `(${fac.expertise_tags[0]})` : ''}
                          </div>
                        ))}
                      {dbFacultyList.filter((f) =>
                        f.full_name.toLowerCase().includes(facultySearch.toLowerCase())
                      ).length === 0 && (
                        <div className="cm-faculty-option cm-faculty-option--empty">
                          No faculty found
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

      {reassignModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
          }}
          onClick={() => {
            setReassignModal({ isOpen: false, subject: null, newFacultyId: '' });
            setReassignSearchTerm('');
          }}
        >
          <div
            style={{
              background: '#1a1c2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              Reassign Faculty
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 20px 0' }}>
              Subject: <strong style={{ color: '#fbbf24' }}>{reassignModal.subject?.name}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                New Faculty
              </label>
              <div
                style={{
                  position: 'relative',
                }}
                ref={reassignDropdownRef}
              >
                <input
                  type="text"
                  placeholder="Search faculty by name..."
                  value={
                    reassignModal.newFacultyId
                      ? selectedReassignFaculty?.full_name || ''
                      : reassignSearchTerm
                  }
                  onChange={(e) => {
                    setReassignSearchTerm(e.target.value);
                    setReassignModal((prev) => ({ ...prev, newFacultyId: '' }));
                    setIsReassignDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsReassignDropdownOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(45,45,61,0.5)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'text',
                    boxSizing: 'border-box',
                  }}
                />
                {isReassignDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '6px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: '#1e1e2d',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      zIndex: 10000,
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    {dbFacultyList
                      .filter((f) =>
                        f.full_name.toLowerCase().includes(reassignSearchTerm.toLowerCase())
                      )
                      .map((fac) => (
                        <div
                          key={fac.id}
                          onClick={() => {
                            setReassignModal((prev) => ({ ...prev, newFacultyId: fac.id }));
                            setReassignSearchTerm('');
                            setIsReassignDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            color: '#e2e8f0',
                            fontSize: '0.9rem',
                            transition: 'background 0.15s',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {fac.full_name}
                          {fac.email ? (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '8px' }}>
                              ({fac.email})
                            </span>
                          ) : null}
                        </div>
                      ))}
                    {dbFacultyList.filter((f) =>
                      f.full_name.toLowerCase().includes(reassignSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div
                        style={{
                          padding: '12px 16px',
                          color: '#6b7280',
                          fontSize: '0.85rem',
                          fontStyle: 'italic',
                        }}
                      >
                        No faculty found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  setReassignModal({ isOpen: false, subject: null, newFacultyId: '' });
                  setReassignSearchTerm('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: '#d1d5db',
                  backgroundColor: '#2d314d',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#3b4063')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2d314d')}
              >
                Cancel
              </button>
              <button
                onClick={handleReassignFaculty}
                disabled={!reassignModal.newFacultyId}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: reassignModal.newFacultyId ? '#8b5cf6' : '#4b5563',
                  border: 'none',
                  cursor: reassignModal.newFacultyId ? 'pointer' : 'not-allowed',
                  boxShadow: reassignModal.newFacultyId ? '0 10px 15px -3px rgba(139,92,246,0.3)' : 'none',
                  transition: 'background-color 0.2s',
                  opacity: reassignModal.newFacultyId ? 1 : 0.7,
                }}
                onMouseOver={(e) => reassignModal.newFacultyId && (e.currentTarget.style.backgroundColor = '#7c3aed')}
                onMouseOut={(e) => reassignModal.newFacultyId && (e.currentTarget.style.backgroundColor = '#8b5cf6')}
              >
                Assign Faculty
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteSubjectId && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
            <div style={{ background: '#1a1c2e', padding: '24px', borderRadius: '16px', border: '1px solid #ef4444', maxWidth: '400px', width: '90%' }}>
               <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Delete Subject?</h3>
               <p style={{ color: '#ccc', margin: '10px 0' }}>Are you sure you want to delete this subject? This action cannot be undone.</p>
               <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button onClick={() => setDeleteSubjectId(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#374151', color: 'white', fontWeight: '500', transition: '0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.background = '#4b5563'} onMouseOut={(e) => e.target.style.background = '#374151'}>Cancel</button>
                  <button onClick={() => confirmDeleteSubject(deleteSubjectId)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#dc2626', color: 'white', fontWeight: 'bold', transition: '0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.background = '#b91c1c'} onMouseOut={(e) => e.target.style.background = '#dc2626'}>Delete</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

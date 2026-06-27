import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCheck, Trash2, GraduationCap, Users, CalendarDays, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import './HodManagement.css';

const YEARS = [
  { id: '1st Year', label: '1st Year', subtitle: 'Foundation' },
  { id: '2nd Year', label: '2nd Year', subtitle: 'Core Studies' },
  { id: '3rd Year', label: '3rd Year', subtitle: 'Advanced Core' },
  { id: '4th Year', label: '4th Year', subtitle: 'Specialization' },
];

const FALLBACK_DEPARTMENTS = [
  'ASH 1',
  'ASH 2',
  'CS & IT',
  'CSE & ECE',
  'AI ML & DS',
  'ME & CE',
];

const DUMMY_BRANCH_IDS = new Set([
  '33333333-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000003',
]);

const DEFAULT_COLLEGE_ID = '11111111-0000-0000-0000-000000000001';

const getAvatarUrl = (faculty, seedText = 'Faculty') => {
  if (faculty?.avatar_url) return faculty.avatar_url;
  const seed = encodeURIComponent(faculty?.full_name || seedText);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const getFacultyDetails = (assignment, facultyMap) => {
  const profile = assignment.user_profiles || {};
  const faculty = facultyMap.get(assignment.faculty_id) || {};
  return {
    name: profile.full_name || faculty.full_name || assignment.faculty_name || 'Unknown Faculty',
    email: profile.email || faculty.email || assignment.faculty_email || 'N/A',
    phone: profile.phone || faculty.phone || assignment.faculty_phone || 'N/A',
    avatarUrl: getAvatarUrl(profile.avatar_url ? profile : faculty, profile.full_name || faculty.full_name || assignment.faculty_name || 'HOD'),
  };
};

export default function HodManagement() {
  const [facultyList, setFacultyList] = useState([]);
  const [departmentList, setDepartmentList] = useState(FALLBACK_DEPARTMENTS);
  const [assignments, setAssignments] = useState([]);
  const [mainTab, setMainTab] = useState('assign');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('CS & IT');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedTab, setSelectedTab] = useState('1st Year');
const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedRole, setSelectedRole] = useState('both');
  const [pendingDelete, setPendingDelete] = useState(null);

  const facultyMap = useMemo(() => {
    const map = new Map();
    facultyList.forEach((faculty) => map.set(faculty.id, faculty));
    return map;
  }, [facultyList]);

  const enrichedAssignments = useMemo(
    () =>
      assignments.map((assignment) => ({
        ...assignment,
        ...getFacultyDetails(assignment, facultyMap),
        user_profiles: assignment.user_profiles || null,
      })),
    [assignments, facultyMap]
  );

  const filteredAssignments = enrichedAssignments.filter((assignment) => assignment.year === selectedTab);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchFaculty = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, avatar_url, can_view_faculty, can_view_hod')
      .eq('can_view_faculty', true)
      .order('full_name', { ascending: true });

if (error) {
      showToast('Failed to fetch faculty', 'error');
      return;
    }

    setFacultyList(data || []);
    if (data?.[0]) {
      setSelectedFacultyId((currentFacultyId) => currentFacultyId || data[0].id);
    }
  }, [showToast]);

  const fetchDepartments = useCallback(async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true });

    if (error || !data?.length) {
      setDepartmentList(FALLBACK_DEPARTMENTS);
      return;
    }

    const uniqueDepartments = Array.from(
      new Map(
        data
          .filter((department) => department.name && !DUMMY_BRANCH_IDS.has(department.id))
          .map((department) => [department.name, department.name])
      ).values()
    );

    const departmentNames = uniqueDepartments.length > 0 ? uniqueDepartments : FALLBACK_DEPARTMENTS;
    setDepartmentList(departmentNames);

    if (!departmentNames.includes(selectedDepartment)) {
      setSelectedDepartment(departmentNames[0]);
    }
  }, [selectedDepartment]);

  const refreshAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code, description, hod_id, user_profiles:user_profiles!hod_id(full_name, email, phone, avatar_url, can_view_faculty, can_view_hod)')
      .not('hod_id', 'is', null)
      .order('description', { ascending: true });

    if (error) {
      console.error('DB Error:', error);
      showToast('Failed to fetch HOD assignments', 'error');
      return;
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      year: row.description,
      department: row.code,
      hod_id: row.hod_id,
      user_profiles: row.user_profiles || null,
      faculty_id: row.hod_id,
    }));

    setAssignments(mapped);
  }, [showToast]);

   
  useEffect(() => {
    fetchFaculty();
  }, []);

   
  useEffect(() => {
    fetchDepartments();
  }, []);

   
  useEffect(() => {
    refreshAssignments();
  }, []);

  const toggleYear = (yearId) => {
    setSelectedYears((currentYears) => {
      if (currentYears.includes(yearId)) {
        const nextYears = currentYears.filter((year) => year !== yearId);
        return nextYears.length === 0 ? currentYears : nextYears;
      }
      return [...currentYears, yearId].sort(
        (a, b) => YEARS.findIndex((year) => year.id === a) - YEARS.findIndex((year) => year.id === b)
      );
    });
  };

  const handleAssignAndSave = async () => {
    if (!selectedFacultyId) {
      showToast('Please select a faculty member', 'error');
      return;
    }

    if (!selectedDepartment) {
      showToast('Please select a department', 'error');
      return;
    }

    if (selectedYears.length === 0) {
      showToast('Please select at least one year', 'error');
      return;
    }

    const selectedFaculty = facultyList.find((faculty) => faculty.id === selectedFacultyId);
    if (!selectedFaculty) {
      showToast('Selected faculty not found', 'error');
      return;
    }

    setLoading(true);

    try {
      for (const year of selectedYears) {
        const { data: existing, error: selectError } = await supabase
          .from('departments')
          .select('id')
          .eq('code', selectedDepartment)
          .eq('description', year)
          .limit(1);

        if (selectError) {
          console.error('DB Error:', selectError);
          throw selectError;
        }

        const existingRow = existing?.[0];

        if (existingRow?.id) {
          const { error: updateError } = await supabase
            .from('departments')
            .update({ hod_id: selectedFaculty.id })
            .eq('id', existingRow.id);

          if (updateError) {
            console.error('DB Error:', updateError);
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('departments')
            .insert({
              name: selectedDepartment,
              code: selectedDepartment,
              description: year,
              hod_id: selectedFaculty.id,
              college_id: '11111111-0000-0000-0000-000000000001',
            });

          if (insertError) {
            console.error('DB Error:', insertError);
            throw insertError;
          }
        }
      }

      const { error: clearError } = await supabase
        .from('departments')
        .update({ hod_id: null })
        .eq('code', selectedDepartment)
        .not('description', 'in', `(${selectedYears.map((y) => `"${y}"`).join(',')})`);

      if (clearError) {
        console.error('DB Error:', clearError);
        throw clearError;
      }

      let canViewFaculty = false;
      let canViewHod = false;

      if (selectedRole === 'faculty') {
        canViewFaculty = true;
      } else if (selectedRole === 'hod') {
        canViewHod = true;
      } else if (selectedRole === 'both') {
        canViewFaculty = true;
        canViewHod = true;
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ can_view_faculty: canViewFaculty, can_view_hod: canViewHod })
        .eq('id', selectedFaculty.id);

      if (profileError) {
        console.error('DB Error:', profileError);
        throw profileError;
      }

      showToast('Assigned and saved successfully');
      setSelectedYears([]);
      setSelectedRole('both');
      await refreshAssignments();
    } catch (error) {
      console.error('DB Error:', error);
      showToast(`Failed to assign: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!pendingDelete) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('departments')
        .update({ hod_id: null })
        .eq('id', pendingDelete.id);

      if (error) {
        console.error('DB Error:', error);
        throw error;
      }

      showToast('HOD assignment removed successfully');
      setPendingDelete(null);
      await refreshAssignments();
    } catch (error) {
      console.error('DB Error:', error);
      showToast(`Failed to remove assignment: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hod-management">
      <header className="hod-header">
        <div className="hod-header__content">
          <h1 className="hod-header__title">HOD Management</h1>
          <p className="hod-header__subtitle">Assign Heads of Department across years and departments</p>
        </div>
      </header>

      <section className="hod-section">
        <div className="hod-main-tabs" role="tablist" aria-label="Main management tabs">
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'assign'}
            className={`hod-main-tab ${mainTab === 'assign' ? 'hod-main-tab--active' : ''}`}
            onClick={() => setMainTab('assign')}
          >
            <UserCheck size={18} />
            Assign HOD & Roles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === 'assigned'}
            className={`hod-main-tab ${mainTab === 'assigned' ? 'hod-main-tab--active' : ''}`}
            onClick={() => setMainTab('assigned')}
          >
            <Users size={18} />
            Assigned HODs
          </button>
        </div>

        {mainTab === 'assign' && (
          <div className="hod-form-panel">
            <div className="hod-form-panel__header">
              <div>
                <h2 className="hod-form-panel__title">Assign HOD & Roles</h2>
                <p className="hod-form-panel__subtitle">Configure department, faculty, years, and role permissions</p>
              </div>
              <UserCheck className="hod-form-panel__icon" size={28} />
            </div>

            <div className="hod-form-stack">
              <div className="hod-form-field">
                <label className="hod-label" htmlFor="hod-department">Select Department</label>
                <div className="hod-select-wrapper">
                  <GraduationCap size={18} />
                  <select
                    id="hod-department"
                    className="hod-select"
                    value={selectedDepartment}
                    onChange={(event) => setSelectedDepartment(event.target.value)}
                  >
                    {departmentList.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hod-form-field">
                <label className="hod-label" htmlFor="hod-faculty">Select Faculty</label>
                <div className="hod-select-wrapper">
                  <Users size={18} />
<select
                     id="hod-faculty"
                     className="hod-select"
                     value={selectedFacultyId}
                     onChange={(event) => setSelectedFacultyId(event.target.value)}
                     onFocus={() => fetchFaculty()}
                   >
                    <option value="">Choose faculty</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hod-form-field">
                <span className="hod-label">Select Year(s)</span>
                <div className="hod-year-checkboxes">
                  {YEARS.map((year) => (
                    <label key={year.id} className="hod-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedYears.includes(year.id)}
                        onChange={() => toggleYear(year.id)}
                      />
                      <span>
                        <strong>{year.label}</strong>
                        <small>{year.subtitle}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="hod-form-field">
                <span className="hod-label">Assign Role</span>
                <div className="hod-role-group">
                  <label className={`hod-radio ${selectedRole === 'faculty' ? 'hod-radio--active' : ''}`}>
                    <input
                      type="radio"
                      name="hod-role"
                      value="faculty"
                      checked={selectedRole === 'faculty'}
                      onChange={(event) => setSelectedRole(event.target.value)}
                    />
                    <span>
                      <strong>Faculty Only</strong>
                      <small>Can view faculty data</small>
                    </span>
                  </label>

                  <label className={`hod-radio ${selectedRole === 'hod' ? 'hod-radio--active' : ''}`}>
                    <input
                      type="radio"
                      name="hod-role"
                      value="hod"
                      checked={selectedRole === 'hod'}
                      onChange={(event) => setSelectedRole(event.target.value)}
                    />
                    <span>
                      <strong>HOD Only</strong>
                      <small>Can view HOD data</small>
                    </span>
                  </label>

                  <label className={`hod-radio ${selectedRole === 'both' ? 'hod-radio--active' : ''}`}>
                    <input
                      type="radio"
                      name="hod-role"
                      value="both"
                      checked={selectedRole === 'both'}
                      onChange={(event) => setSelectedRole(event.target.value)}
                    />
                    <span>
                      <strong>Both</strong>
                      <small>Can view both faculty and HOD data</small>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="hod-assign-btn"
              onClick={handleAssignAndSave}
              disabled={loading}
            >
              {loading ? <Loader2 className="hod-spinner" size={18} /> : <UserCheck size={18} />}
              {loading ? 'Assigning...' : 'Assign & Save'}
            </button>
          </div>
        )}

        {mainTab === 'assigned' && (
          <div className="hod-display-panel">
            <div className="hod-tabs" role="tablist" aria-label="HOD year tabs">
              {YEARS.map((year) => (
                <button
                  key={year.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedTab === year.id}
                  className={`hod-tab ${selectedTab === year.id ? 'hod-tab--active' : ''}`}
                  onClick={() => setSelectedTab(year.id)}
                >
                  {year.label}
                </button>
              ))}
            </div>

            <div className="hod-assignment-grid">
              {filteredAssignments.length === 0 ? (
                <div className="hod-empty-state">
                  <AlertCircle size={34} />
                  <h3>No HOD assigned for this year.</h3>
                  <p>Switch to Assign HOD & Roles to create an assignment.</p>
                </div>
              ) : (
                filteredAssignments.map((assignment) => {
                  const facultyDetails = getFacultyDetails(assignment, facultyMap);

                  return (
                    <article key={assignment.id} className="hod-assignment-card">
                      <div className="hod-assignment-card__top">
                        <img
                          className="hod-assignment-card__avatar"
                          src={facultyDetails.avatarUrl}
                          alt={facultyDetails.name}
                        />
                        <div className="hod-assignment-card__profile">
                          <h3>
                            {facultyDetails.name}
                            {assignment.user_profiles && (
                              <span
                                className={`hod-role-badge ${
                                  assignment.user_profiles.can_view_faculty && assignment.user_profiles.can_view_hod
                                    ? 'hod-role-badge--both'
                                    : assignment.user_profiles.can_view_hod
                                      ? 'hod-role-badge--hod'
                                      : ''
                                }`}
                              >
                                {assignment.user_profiles.can_view_faculty && assignment.user_profiles.can_view_hod
                                  ? 'HOD & Faculty'
                                  : assignment.user_profiles.can_view_hod
                                    ? 'HOD Only'
                                    : null}
                              </span>
                            )}
                          </h3>
                          <p>{facultyDetails.email}</p>
                          <span>{facultyDetails.phone}</span>
                        </div>
                      </div>

                      <div className="hod-assignment-card__meta">
                        <div>
                          <CalendarDays size={16} />
                          <span>{assignment.year}</span>
                        </div>
                        <div>
                          <GraduationCap size={16} />
                          <span>{assignment.department}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="hod-remove-btn"
                        onClick={() => setPendingDelete(assignment)}
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                        Remove Assignment
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}

        {toast && (
          <div className={`hod-toast hod-toast--${toast.type}`}>
            <span className="hod-toast__message">{toast.message}</span>
          </div>
        )}

        {pendingDelete && (
          <div className="hod-modal-backdrop" onClick={() => setPendingDelete(null)}>
            <div className="hod-modal" onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal__icon">
                <AlertCircle size={48} />
              </div>
              <h3 className="hod-modal__title">Are you sure you want to remove this HOD assignment?</h3>
              <div className="hod-modal__actions">
                <button
                  type="button"
                  className="hod-modal__btn hod-modal__btn--cancel"
                  onClick={() => setPendingDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="hod-modal__btn hod-modal__btn--delete"
                  onClick={handleRemoveAssignment}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}



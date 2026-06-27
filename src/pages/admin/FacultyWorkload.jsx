import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import './FacultyWorkload.css';

function useSafeHodContext() {
  try {
    return useHodContext();
  } catch {
    return {
      hodAuthorizedBranches: [],
      hodDepartmentsData: [],
      isAssigned: false,
      isLoading: false,
      refreshDepartments: () => {},
    };
  }
}

export default function FacultyWorkload() {
  const [facultyWorkload, setFacultyWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [subjectsDetail, setSubjectsDetail] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSubBranch, setSelectedSubBranch] = useState('');

  const {
    hodAuthorizedBranches,
  } = useSafeHodContext();

  const isHodMode = hodAuthorizedBranches.length > 0;

  const isAggregateHod = useMemo(() => {
    return hodAuthorizedBranches.some((b) => AGGREGATE_DEPARTMENTS[b.code]);
  }, [hodAuthorizedBranches]);

  const availableBranches = useMemo(() => {
    if (!isAggregateHod) return hodAuthorizedBranches;
    const firstAggregate = hodAuthorizedBranches.find((b) => AGGREGATE_DEPARTMENTS[b.code]);
    if (!firstAggregate) return hodAuthorizedBranches;
    return AGGREGATE_DEPARTMENTS[firstAggregate.code].map((sub) => ({
      id: sub,
      code: sub,
      name: sub,
    }));
  }, [isAggregateHod, hodAuthorizedBranches]);

  const allowedDepartments = useMemo(() => {
    if (!isHodMode) return [];
    if (isAggregateHod) {
      return selectedSubBranch ? [selectedSubBranch] : availableBranches.map((b) => b.code);
    }
    return selectedBranch ? [selectedBranch] : hodAuthorizedBranches.map((b) => b.code);
  }, [isHodMode, isAggregateHod, selectedSubBranch, selectedBranch, availableBranches, hodAuthorizedBranches]);

  useEffect(() => {
    if (isHodMode && hodAuthorizedBranches.length === 1 && !isAggregateHod && !selectedBranch) {
      setSelectedBranch(hodAuthorizedBranches[0].code);
    }
  }, [isHodMode, hodAuthorizedBranches, isAggregateHod, selectedBranch]);

  useEffect(() => {
    async function loadWorkload() {
      setLoading(true);

      let query = supabase
        .from('subjects')
        .select('faculty_id, faculty:user_profiles!faculty_id(full_name), department, year')
        .not('faculty_id', 'is', null);

      if (isHodMode && isAggregateHod) {
        query = query.eq('year', '1st Year');
      }
      if (isHodMode && !isAggregateHod) {
        query = query.neq('year', '1st Year');
      }

      if (isHodMode && allowedDepartments.length > 0) {
        query = query.in('department', allowedDepartments);
      }

      const { data: subjectsData, error: subjectsError } = await query;

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setFacultyWorkload([]);
        setLoading(false);
        return;
      }

      const workloadMap = new Map();
      (subjectsData || []).forEach((subject) => {
        if (isHodMode && !allowedDepartments.includes(subject.department)) return;
        const isCorrectYear =
          isAggregateHod ? subject.year === '1st Year' : subject.year !== '1st Year';
        if (isHodMode && !isCorrectYear) return;
        const facultyId = subject.faculty_id;
        const facultyName = subject.faculty?.full_name || 'Unknown Faculty';
        if (!workloadMap.has(facultyId)) {
          workloadMap.set(facultyId, { id: facultyId, name: facultyName, count: 0 });
        }
        workloadMap.get(facultyId).count += 1;
      });

      const sorted = [...workloadMap.values()].sort((a, b) => b.count - a.count);
      setFacultyWorkload(sorted);
      setLoading(false);
    }

    loadWorkload();

    const channel = supabase
      .channel('faculty-workload-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        () => {
          loadWorkload();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHodMode, allowedDepartments]);

  const getWorkloadStatus = (count) => {
    if (count <= 2) return { label: 'Low', class: 'workload-low' };
    if (count <= 4) return { label: 'Medium', class: 'workload-medium' };
    return { label: 'High', class: 'workload-high' };
  };

  const openSchedule = async (faculty) => {
    setSelectedFaculty(faculty);

    let query = supabase
      .from('subjects')
      .select('id, code, name, semester, department, year')
      .eq('faculty_id', faculty.id)
      .order('semester', { ascending: true });

    if (isHodMode && isAggregateHod) {
      query = query.eq('year', '1st Year');
    }
    if (isHodMode && !isAggregateHod) {
      query = query.neq('year', '1st Year');
    }

    if (isHodMode && allowedDepartments.length > 0) {
      query = query.in('department', allowedDepartments);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching subjects:', error);
      setSubjectsDetail([]);
    } else {
      const filteredData = isHodMode
        ? (data || []).filter((subject) => allowedDepartments.includes(subject.department))
        : (data || []);
      setSubjectsDetail(filteredData);
    }

    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedFaculty(null);
    setSubjectsDetail([]);
  };

  return (
    <div className="workload-container">
      <header className="workload-header">
        <h2>Faculty Workload</h2>
        {isHodMode && (
          <div className="workload-filter-controls">
            {isAggregateHod ? (
              <div className="workload-filter-group">
                <label className="workload-filter-label" htmlFor="subbranch-select">
                  Sub-Branch
                </label>
                <select
                  id="subbranch-select"
                  className="workload-filter-select"
                  value={selectedSubBranch}
                  onChange={(e) => setSelectedSubBranch(e.target.value)}
                >
                  <option value="">All Sub-Branches</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.code} value={branch.code}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="workload-filter-group">
                <label className="workload-filter-label" htmlFor="branch-select">
                  Branch
                </label>
                <select
                  id="branch-select"
                  className="workload-filter-select"
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.code} value={branch.code}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="workload-list-glass">
        {loading ? (
          <div className="workload-status">Loading faculty workload...</div>
        ) : (
          <div className="workload-table" role="table">
            <div className="workload-row workload-row--head" role="row">
              <div className="workload-cell" role="columnheader">Faculty Name</div>
              <div className="workload-cell" role="columnheader">Subjects Count</div>
              <div className="workload-cell" role="columnheader">Workload Status</div>
              <div className="workload-cell" role="columnheader">Action</div>
            </div>

            {facultyWorkload.map((faculty) => {
              const status = getWorkloadStatus(faculty.count);
              return (
                <div className="workload-row" key={faculty.id} role="row">
                  <div className="workload-cell" role="cell">
                    <span className="workload-name">{faculty.name}</span>
                  </div>
                  <div className="workload-cell" role="cell">
                    <span className="workload-count">{faculty.count}</span>
                  </div>
                  <div className="workload-cell" role="cell">
                    <div className="workload-status-cell">
                      <div className="workload-bar-wrapper">
                        <div
                          className={`workload-bar ${status.class}`}
                          style={{
                            width:
                              faculty.count <= 2
                                ? '30%'
                                : faculty.count <= 4
                                ? '60%'
                                : '100%',
                          }}
                        />
                      </div>
                      <span className={`workload-badge ${status.class}`}>{status.label}</span>
                    </div>
                  </div>
                  <div className="workload-cell" role="cell">
                    <button
                      className="workload-action-btn"
                      onClick={() => openSchedule(faculty)}
                    >
                      View Schedule
                    </button>
                  </div>
                </div>
              );
            })}

            {facultyWorkload.length === 0 && (
              <div className="workload-empty">
                <p>No faculty workloads found. Assign subjects to faculty in the Curriculum Manager.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="workload-drawer-overlay" onClick={closeDrawer}>
          <div className="workload-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="workload-drawer-header">
              <h3>Schedule - {selectedFaculty?.name}</h3>
              <button className="workload-drawer-close" onClick={closeDrawer}>
                &times;
              </button>
            </div>
            <div className="workload-drawer-body">
              <table className="workload-drawer-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Semester</th>
                    <th>Department</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsDetail.map((subject) => (
                    <tr key={subject.id}>
                      <td><span className="subject-code">{subject.code}</span></td>
                      <td>{subject.name}</td>
                      <td>{subject.semester}</td>
                      <td>{subject.department || 'N/A'}</td>
                      <td>{subject.year || 'N/A'}</td>
                    </tr>
                  ))}
                  {subjectsDetail.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="workload-drawer-empty">
                          No subjects assigned yet.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import './FacultyWorkload.css';

export default function FacultyWorkload() {
  const [facultyWorkload, setFacultyWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [subjectsDetail, setSubjectsDetail] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadWorkload() {
      setLoading(true);

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('faculty_id, faculty:user_profiles!faculty_id(full_name)')
        .not('faculty_id', 'is', null);

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setLoading(false);
        return;
      }

      const workloadMap = new Map();
      (subjectsData || []).forEach((subject) => {
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
  }, []);

  const getWorkloadStatus = (count) => {
    if (count <= 2) return { label: 'Low', class: 'workload-low' };
    if (count <= 4) return { label: 'Medium', class: 'workload-medium' };
    return { label: 'High', class: 'workload-high' };
  };

  const openSchedule = async (faculty) => {
    setSelectedFaculty(faculty);

    console.log('Fetching schedule for:', faculty.id);

    const { data, error } = await supabase
      .from('subjects')
      .select('code, name, semester, department, year')
      .eq('faculty_id', faculty.id)
      .order('semester', { ascending: true });

    if (error) {
      console.error('Error fetching subjects:', error);
      setSubjectsDetail([]);
    } else {
      console.log('Fetched subjects:', data);
      setSubjectsDetail(data || []);
    }

    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedFaculty(null);
    setSubjectsDetail([]);
  };

  if (loading) {
    return <div className="workload-status">Loading faculty workload...</div>;
  }

  return (
    <div className="workload-container">
      <header className="workload-header">
        <h2>Faculty Workload</h2>
      </header>

      <div className="workload-list-glass">
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
                        style={{ width: faculty.count <= 2 ? '30%' : faculty.count <= 4 ? '60%' : '100%' }}
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
                    <tr key={subject.code}>
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

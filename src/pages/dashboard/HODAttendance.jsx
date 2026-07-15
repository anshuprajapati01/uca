import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import { ArrowUpRight } from 'lucide-react';
import StudentAttendanceDetail from './StudentAttendanceDetail.jsx';
import './HodDashboard.css';

// 3-tier status derived from the attendance percentage.
const getAttendanceStatus = (pct) => {
  if (pct >= 75) {
    return { label: 'Safe', bg: 'rgba(34, 197, 94, 0.2)', color: '#bbf7d0', border: 'rgba(34, 197, 94, 0.4)' };
  }
  if (pct >= 60) {
    return { label: 'Warning', bg: 'rgba(251, 191, 36, 0.2)', color: '#fde68a', border: 'rgba(251, 191, 36, 0.4)' };
  }
  return { label: 'Defaulter', bg: 'rgba(239, 68, 68, 0.2)', color: '#fecaca', border: 'rgba(239, 68, 68, 0.4)' };
};

export default function HODAttendance() {
  const { hodDepartmentsData } = useHodContext();
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  const openStudentAttendanceDetail = (studentId, studentName) => {
    setSelectedStudent({ id: studentId, name: studentName });
  };

  const closeStudentAttendanceDetail = () => {
    setSelectedStudent(null);
  };

  const hodAuthorizedBranches = useMemo(() => {
    const branchMap = {};
    hodDepartmentsData.forEach((d) => {
      const year = d.description;
      const code = d.code || d.name;
      const name = d.name || d.code;
      if (!year || !code) return;
      if (!branchMap[year]) branchMap[year] = [];
      if (AGGREGATE_DEPARTMENTS[code]) {
        branchMap[year].push(...AGGREGATE_DEPARTMENTS[code]);
      } else if (AGGREGATE_DEPARTMENTS[name]) {
        branchMap[year].push(...AGGREGATE_DEPARTMENTS[name]);
      } else {
        branchMap[year].push(code);
      }
    });
    return branchMap;
  }, [hodDepartmentsData]);

  const availableYears = useMemo(
    () => [...new Set(hodDepartmentsData.map((d) => d.description))].filter(Boolean).sort(),
    [hodDepartmentsData]
  );

  const availableBranches = useMemo(() => {
    const branchSet = new Set();
    Object.values(hodAuthorizedBranches).forEach((list) => {
      (list || []).forEach((b) => branchSet.add(b));
    });
    return [...branchSet].sort();
  }, [hodAuthorizedBranches]);

  const isFilterActive = filterYear !== 'All' || filterBranch !== 'All';

  const authorizedStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.selected_year) return false;
      const authorizedBranches = hodAuthorizedBranches[s.selected_year];
      if (!authorizedBranches) return false;
      if (!s.selected_branch) return false;
      return authorizedBranches.includes(s.selected_branch);
    });
  }, [students, hodAuthorizedBranches]);

  const studentStats = useMemo(() => {
    const studentMap = {};
    authorizedStudents.forEach((s) => {
      studentMap[s.id] = {
        id: s.id,
        full_name: s.full_name || 'Unknown',
        roll_number: s.roll_number || 'N/A',
        total: 0,
        present: 0,
      };
    });

    // Aggregate per student: total_conducted (every record) and
    // total_attended (status 'P' / 'Present'). Matches the Student Portal
    // percentage formula: (total_attended / total_conducted) * 100.
    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        studentMap[r.student_id].total += 1; // total_conducted
        const status = String(r.status || '').toUpperCase();
        if (status === 'P' || status === 'PRESENT') {
          studentMap[r.student_id].present += 1; // total_attended
        }
      }
    });

    return Object.values(studentMap)
      .map((s) => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      }))
      .sort((a, b) => a.percentage - b.percentage);
  }, [authorizedStudents, attendanceRecords]);

  const totalStudents = authorizedStudents.length;
  const totalDefaulters = studentStats.filter((s) => s.percentage < 60).length;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let studentsQuery = supabase
          .from('user_profiles')
          .select('id, full_name, roll_number, selected_year, selected_branch')
          .eq('role', 'student');

        // Apply year / branch filters only when a specific value is selected.
        if (filterYear !== 'All') {
          studentsQuery = studentsQuery.eq('selected_year', filterYear);
        }
        if (filterBranch !== 'All') {
          studentsQuery = studentsQuery.eq('selected_branch', filterBranch);
        }

        const { data: studentsData, error: studentsError } = await studentsQuery;

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        const studentIds = (studentsData || []).map((s) => s.id);
        if (studentIds.length === 0) {
          setAttendanceRecords([]);
          return;
        }

        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('status, student_id')
          .in('student_id', studentIds);

        if (recordsError) throw recordsError;
        setAttendanceRecords(recordsData || []);
      } catch (err) {
        console.error('Failed to fetch attendance analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filterYear, filterBranch]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const filterSelectStyle = {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '0.6rem 2.2rem 0.6rem 0.9rem',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    outline: 'none',
    minWidth: '200px',
    cursor: 'pointer',
  };

  const selectChevronStyle = {
    position: 'absolute',
    right: '0.8rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#94a3b8',
    fontSize: '0.7rem',
  };

  return (
    <div className="hod-dashboard">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="All">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span style={selectChevronStyle}>▼</span>
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="All">All Branches</option>
            {availableBranches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <span style={selectChevronStyle}>▼</span>
        </div>
      </div>

      {isLoading ? (
        <div className="hod-card">
          <div className="skeleton-line" style={{ width: '40%', height: '1.4rem', marginBottom: '1rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '2.5rem' }} />
        </div>
      ) : (
        <>
          <div className="hod-card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.03em' }}>
          Department Attendance Analytics
        </h3>
        <div className="hod-stats-grid">
          <div className="hod-stat hod-stat--cyan">
            <span>Total Students</span>
            <strong>{totalStudents}</strong>
          </div>
              <div className="hod-stat hod-stat--amber">
                <span>Total Defaulters (&lt; 60%)</span>
                <strong>{totalDefaulters}</strong>
              </div>
        </div>
      </div>

      <div className="hod-card">
      <div className="w-full overflow-x-auto table-wrapper">
        <table className="hod-table" style={{ minWidth: 0 }}>
          <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Overall Attendance</th>
                <th className="pr-8">Status</th>
                <th className="pr-8">Details</th>
              </tr>
          </thead>
          <tbody>
            {studentStats.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
                  {isFilterActive
                    ? 'No students found for this selection'
                    : 'No attendance records found for your department.'}
                </td>
              </tr>
            ) : (
              studentStats.map((s) => {
                const status = getAttendanceStatus(s.percentage);
                return (
                  <tr
                    key={s.id}
                    onClick={() => openStudentAttendanceDetail(s.id, s.full_name)}
                    style={{ cursor: 'pointer' }}
                    className="hod-attendance-row"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: '#fff',
                          fontSize: '0.8rem',
                          flexShrink: 0,
                        }}>
                          {getInitials(s.full_name)}
                        </div>
                        <strong>{s.full_name}</strong>
                      </div>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{s.roll_number}</td>
                    <td>
                      <span style={{
                        fontWeight: '900',
                        color: status.color,
                        fontSize: '0.95rem',
                      }}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td className="pr-8">
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.28rem 0.68rem',
                          border: `1px solid ${status.border}`,
                          borderRadius: '999px',
                          color: status.color,
                          background: status.bg,
                          fontSize: '0.78rem',
                          fontWeight: '900',
                        }}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentAttendanceDetail(s.id, s.full_name);
                          }}
                          title="View attendance details"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: '#c7d2fe',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.28)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; }}
                        >
                          <ArrowUpRight size={16} strokeWidth={2.4} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={closeStudentAttendanceDetail}
        >
          <div
            style={{
              width: 'min(680px, 100%)',
              height: '100%',
              background: '#0c0e1a',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
              overflowY: 'auto',
              padding: '1.5rem 1.75rem',
              animation: 'hod-drawer-in 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900' }}>
                  {selectedStudent.name}
                </h3>
                <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Subject-wise &amp; Week-wise Attendance Breakdown
                </p>
              </div>
              <button
                type="button"
                onClick={closeStudentAttendanceDetail}
                title="Close"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <StudentAttendanceDetail studentId={selectedStudent.id} studentName={selectedStudent.name} />
          </div>
        </div>
      )}
    </div>
  );
}

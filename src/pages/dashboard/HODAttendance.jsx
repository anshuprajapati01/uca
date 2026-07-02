import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import './HodDashboard.css';

export default function HODAttendance() {
  const { hodDepartmentsData } = useHodContext();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

    attendanceRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        studentMap[r.student_id].total += 1;
        if (r.status === 'Present') {
          studentMap[r.student_id].present += 1;
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
  const totalDefaulters = studentStats.filter((s) => s.percentage < 75).length;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('user_profiles')
          .select('id, full_name, roll_number, selected_year, selected_branch')
          .eq('role', 'student');

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
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="hod-dashboard">
        <div className="hod-card">
          <div className="skeleton-line" style={{ width: '40%', height: '1.4rem', marginBottom: '1rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '2.5rem' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="hod-dashboard">
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
            <span>Total Defaulters (&lt; 75%)</span>
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
            </tr>
          </thead>
          <tbody>
            {studentStats.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
                  No attendance records found for your department.
                </td>
              </tr>
            ) : (
              studentStats.map((s) => {
                const isDefaulter = s.percentage < 75;
                return (
                  <tr key={s.id}>
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
                        fontWeight: isDefaulter ? '900' : '700',
                        color: isDefaulter ? '#fb7185' : '#34d399',
                        fontSize: '0.95rem',
                      }}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td className="pr-8">
                        {isDefaulter ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.28rem 0.68rem',
                            border: '1px solid rgba(251, 113, 133, 0.3)',
                            borderRadius: '999px',
                            color: '#fecdd3',
                            background: 'rgba(251, 113, 133, 0.12)',
                            fontSize: '0.78rem',
                            fontWeight: '900',
                          }}>
                            ⚠️ Defaulter
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.28rem 0.68rem',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '999px',
                            color: '#a7f3d0',
                            background: 'rgba(52, 211, 153, 0.1)',
                            fontSize: '0.78rem',
                            fontWeight: '900',
                          }}>
                            Good
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

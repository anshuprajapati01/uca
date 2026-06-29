import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Users, Search, Mail } from 'lucide-react';
import './DirectorDashboard-v2.css';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const BRANCHES = ['Information Technology', 'Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'CSE', 'CSE A', 'CSE B', 'CSE C', 'ECE', 'AI ML', 'DS', 'VLSI'];

export default function DirectorStudentDirectory() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

   
  const getStudentEmail = (student) => {
    return student.email || student.email_address || student.contact_email || 'N/A';
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, batches(section)')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (!error && data) {
      const validStudents = data.filter(student => Boolean(student.selected_branch) && Boolean(student.selected_year));
      setStudents(validStudents);
    }
    setLoading(false);
  }, []);

   
  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (filterYear !== 'All') {
      result = result.filter(s => s.selected_year === filterYear || s.year_level === filterYear);
    }

    if (filterBranch !== 'All') {
      result = result.filter(s => s.selected_branch === filterBranch || s.branch === filterBranch);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => {
        const name = (s.full_name || '').toLowerCase();
        const email = (s.email || s.email_address || s.contact_email || '').toLowerCase();
        const roll = (s.roll_number || '').toLowerCase();
        return name.includes(q) || email.includes(q) || roll.includes(q);
      });
    }

    return result;
  }, [students, filterYear, filterBranch, searchQuery]);

  const getAvatarUrl = (student) => {
    if (student.avatar_url) return student.avatar_url;
    const name = encodeURIComponent(student.full_name || student.name || 'Student');
    return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`;
  };

  return (
    <div className="director-dashboard">
      <div className="director-section__header" style={{ marginBottom: '1.5rem' }}>
        <Users size={24} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginLeft: '0.75rem' }}>Student Directory</h2>
      </div>

      <div className="director-semester-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="broadcast-input manage-students-select"
            style={{ maxWidth: '200px' }}
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="All">All Years</option>
            {YEARS.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            className="broadcast-input manage-students-select"
            style={{ maxWidth: '200px' }}
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="All">All Branches</option>
            {BRANCHES.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input
              type="text"
              className="broadcast-input"
              style={{ paddingLeft: '40px' }}
              placeholder="Search by Name, Email, or Roll No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="director-semester-card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div className="pw-loading-subjects" style={{ gridColumn: '1 / -1' }}>Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="pw-empty-subjects" style={{ gridColumn: '1 / -1', padding: '3rem 1rem' }}>
            No students found. {filterYear !== 'All' || filterBranch !== 'All' || searchQuery.trim() ? 'Try adjusting your filters.' : ''}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  Avatar
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  Full Name
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  Email / Roll No
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  Branch
                </th>
<th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  Year
                </th>
              </tr>
            </thead>
<tbody className="director-student-table">
              {filteredStudents.map((student) => (
                <tr key={student.id} style={{ transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <img
                      src={getAvatarUrl(student)}
                      alt={student.full_name || 'Student'}
                      style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500' }}>
                    {student.full_name || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={13} style={{ color: '#818cf8' }} />
                        <span style={{ color: getStudentEmail(student) === 'N/A' ? '#9ca3af' : 'inherit' }}>
                          {getStudentEmail(student)}
                        </span>
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        {student.roll_number || <span style={{ color: '#6b7280' }}>N/A</span>}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      letterSpacing: '0.025em',
                      display: 'inline-block',
                      ...(student.selected_branch || student.branch
                        ? { background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }
                        : { background: '#1f2937', color: '#9ca3af' })
                    }}>
                      {student.selected_branch || student.branch || 'Unassigned'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      letterSpacing: '0.025em',
                      display: 'inline-block',
                       ...(student.selected_year
                         ? { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }
                         : { background: '#1f2937', color: '#9ca3af' })
                    }}>
                       {student.selected_year || 'Unassigned'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
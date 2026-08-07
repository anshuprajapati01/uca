import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Users, Search, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import './DirectorDashboard-v2.css';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const BRANCHES = ['Information Technology', 'Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'CSE', 'CSE A', 'CSE B', 'CSE C', 'ECE', 'AI ML', 'DS', 'VLSI'];

export default function DirectorStudentDirectory() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionPhone, setActionPhone] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

   
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

  const openActionModal = (student) => {
    setSelectedStudent(student);
    setActionPhone(student.phone || '');
  };

  const closeActionModal = () => {
    setSelectedStudent(null);
    setActionPhone('');
    setIsUpdatingPhone(false);
    setIsSendingReset(false);
  };

  const handleUpdatePhone = async () => {
    if (!selectedStudent) return;
    setIsUpdatingPhone(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone: actionPhone.trim() })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast.success('Phone number updated successfully!');
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, phone: actionPhone } : s));
      setSelectedStudent(prev => prev ? { ...prev, phone: actionPhone } : prev);
    } catch (error) {
      toast.error('Failed to update phone: ' + error.message);
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!selectedStudent?.email) {
      toast.error('No email found for this student');
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedStudent.email.trim(), { redirectTo: `${window.location.origin}/update-password` });

      if (error) throw error;

      toast.success(`Password reset link sent to ${selectedStudent.email}`);
    } catch (error) {
      toast.error('Failed to send reset link: ' + error.message);
    } finally {
      setIsSendingReset(false);
    }
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
                <tr key={student.id} style={{ transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => openActionModal(student)}>
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

      {selectedStudent && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
        }} onClick={closeActionModal}>
          <div style={{
            backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
            padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#f1f5f9' }}>Student Actions</h3>
              <button onClick={closeActionModal} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#cbd5e1', cursor: 'pointer', padding: '0.35rem 0.6rem', fontSize: '0.8rem'
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <img
                src={getAvatarUrl(selectedStudent)}
                alt={selectedStudent.full_name || 'Student'}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.3)' }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>{selectedStudent.full_name || '—'}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>{selectedStudent.email || 'N/A'}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Roll: {selectedStudent.roll_number || 'N/A'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                <input
                  type="tel"
                  value={actionPhone}
                  onChange={(e) => setActionPhone(e.target.value)}
                  placeholder="Enter phone number"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,40,0.5)',
                    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>
              <button
                onClick={handleUpdatePhone}
                disabled={isUpdatingPhone}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '12px', border: 'none',
                  fontSize: '0.9rem', fontWeight: '600', cursor: isUpdatingPhone ? 'not-allowed' : 'pointer',
                  background: isUpdatingPhone ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', opacity: isUpdatingPhone ? 0.7 : 1, transition: 'all 0.2s ease'
                }}
              >
                {isUpdatingPhone ? 'Updating...' : 'Update Phone'}
              </button>
              <button
                onClick={handleSendResetLink}
                disabled={isSendingReset}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '12px', border: 'none',
                  fontSize: '0.9rem', fontWeight: '600', cursor: isSendingReset ? 'not-allowed' : 'pointer',
                  background: isSendingReset ? 'rgba(16, 185, 129, 0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', opacity: isSendingReset ? 0.7 : 1, transition: 'all 0.2s ease'
                }}
              >
                {isSendingReset ? 'Sending...' : 'Send Password Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
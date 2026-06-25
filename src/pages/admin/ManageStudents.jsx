import { useState, useEffect, useMemo } from 'react';
import { supabase, createTempClient } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { toast, Toaster } from 'react-hot-toast';
import './DirectorDashboard-v2.css';

export default function ManageStudents() {
  const { hodDepartmentsData } = useHodContext();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [formData, setFormData] = useState({ fullName: '', rollNumber: '', phone: '', email: '', batchId: '', selectedYear: '', selectedBranch: '' });
  const [activeTab, setActiveTab] = useState('register');
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const availableYears = useMemo(() => {
    return [...new Set(hodDepartmentsData.map((d) => d.description))].filter(Boolean).sort();
  }, [hodDepartmentsData]);

  const hodAuthorizedBranches = useMemo(() => {
    const branchMap = {};
    hodDepartmentsData.forEach((d) => {
      const year = d.description;
      const code = d.code || d.name;
      if (!year || !code) return;
      if (!branchMap[year]) branchMap[year] = new Set();
      branchMap[year].add(code);
    });
    return branchMap;
  }, [hodDepartmentsData]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.selected_year) return false;
      const authorizedBranches = hodAuthorizedBranches[s.selected_year];
      if (!authorizedBranches) return false;
      if (!s.selected_branch) return false;
      return authorizedBranches.has(s.selected_branch);
    });
  }, [students, hodAuthorizedBranches]);

  const availableBranches = useMemo(() => {
    if (!formData.selectedYear) return [];
    return hodDepartmentsData
      .filter((d) => d.description === formData.selectedYear)
      .map((d) => ({
        id: d.code || d.name,
        code: d.code || d.name,
        name: d.name || d.code,
      }));
  }, [formData.selectedYear, hodDepartmentsData]);

  const tableStudents = useMemo(() => {
    let result = filteredStudents;
    if (filterYear !== 'All') {
      result = result.filter(s => s.selected_year === filterYear);
    }
    if (filterBranch !== 'All') {
      result = result.filter(s => s.selected_branch === filterBranch);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => {
        const name = (s.full_name || '').toLowerCase();
        const roll = (s.roll_number || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        return name.includes(q) || roll.includes(q) || phone.includes(q);
      });
    }
    return result;
  }, [filteredStudents, filterYear, filterBranch, searchQuery]);

  useEffect(() => {
    fetchBatches();
    fetchStudents();
  }, []);

  const fetchBatches = async () => {
    const { data, error } = await supabase.from('batches').select('*').order('semester', { ascending: true });
    if (!error && data) setBatches(data);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, batches(semester, section)')
      .eq('role', 'student');
    if (!error && data) setStudents(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const tempSupabase = createTempClient();

    try {
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.rollNumber,
        options: {
          data: { role: 'student' }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Could not create user. Email might already exist.");

      const { error: profileError } = await supabase.from('user_profiles').insert([{
        id: authData.user.id,
        full_name: formData.fullName,
        roll_number: formData.rollNumber,
        phone: formData.phone,
        role: 'student',
        batch_id: formData.batchId || null,
        selected_year: formData.selectedYear,
        selected_branch: formData.selectedBranch,
        college_id: '11111111-0000-0000-0000-000000000001',
        branch_id: null,
        is_active: true,
        can_view_faculty: false,
        can_view_hod: false
      }]);

      if (profileError) throw profileError;

      toast.success('Student Registered Successfully! 🎉 Password is Roll No.');
      setFormData({ fullName: '', rollNumber: '', phone: '', email: '', batchId: '' });
      fetchStudents();
      
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const initiateDelete = (id) => {
    setStudentToDelete(id);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    const { error } = await supabase.from('user_profiles').delete().eq('id', studentToDelete);

    if (error) {
      toast.error('Error deleting student: ' + error.message);
      setStudentToDelete(null);
      return;
    }

    setStudents(prev => prev.filter(s => s.id !== studentToDelete));
    toast.success('Student deleted successfully!');
    setStudentToDelete(null);
  };

  const cancelDelete = () => {
    setStudentToDelete(null);
  };

  return (
    <div className="min-h-screen">
      <h2 className="broadcast-title">Manage Students 🎓</h2>

      <div className="director-branch-subtabs">
        <button type="button" onClick={() => setActiveTab('register')} className={`director-branch-subtab ${activeTab === 'register' ? 'director-branch-subtab--active' : ''}`}>📝 Register Student</button>
        <button type="button" onClick={() => setActiveTab('list')} className={`director-branch-subtab ${activeTab === 'list' ? 'director-branch-subtab--active' : ''}`}>📋 Student List</button>
      </div>

      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {activeTab === 'register' && (
        <div className="director-semester-card">
          <form onSubmit={handleSubmit} className="broadcast-form-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.2rem' }}>
              <input type="text" placeholder="Full Name" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="broadcast-input" />
              <input type="text" placeholder="Roll Number" required value={formData.rollNumber} onChange={(e) => setFormData({...formData, rollNumber: e.target.value})} className="broadcast-input" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.2rem' }}>
              <input type="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="broadcast-input" />
              <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="broadcast-input" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.2rem' }}>
              <select className="broadcast-input manage-students-select" required value={formData.selectedYear} onChange={(e) => setFormData({...formData, selectedYear: e.target.value, selectedBranch: '' })}>
                <option value="">-- Select Year --</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select className="broadcast-input manage-students-select" required value={formData.selectedBranch} onChange={(e) => setFormData({...formData, selectedBranch: e.target.value })} disabled={!formData.selectedYear}>
                <option value="">-- Select Branch --</option>
                {availableBranches.map(branch => (
                  <option key={branch.id} value={branch.code}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div className="broadcast-form-actions">
              <button type="submit" className="broadcast-send-btn">Register Student</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="director-semester-card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="broadcast-input manage-students-select" style={{ maxWidth: '200px' }} value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterBranch('All'); }}>
              <option value="All">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select className="broadcast-input manage-students-select" style={{ maxWidth: '200px' }} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} disabled={filterYear === 'All'}>
              <option value="All">All Branches</option>
              {filterYear !== 'All' && hodAuthorizedBranches[filterYear] 
                ? [...hodAuthorizedBranches[filterYear]].map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))
                : null
              }
            </select>
          </div>

          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              className="broadcast-input"
              style={{ paddingLeft: '40px' }}
              placeholder="Search by Name, Roll Number, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll Number</th>
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</th>
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
                    No students found.
                  </td>
                </tr>
              ) : tableStudents.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 12px', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500' }}>{student.full_name}</td>
                  <td style={{ padding: '14px 12px', color: '#cbd5e1', fontSize: '0.85rem' }}>{student.roll_number}</td>
                  <td style={{ padding: '14px 12px', color: '#cbd5e1', fontSize: '0.85rem' }}>{student.phone || 'N/A'}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <button onClick={() => initiateDelete(student.id)} className="dept-card__delete-btn">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {studentToDelete && (
        <div className="dept-modal-overlay">
          <div className="dept-modal">
            <p className="dept-modal__title">Are you sure you want to delete this student? This action cannot be undone.</p>
            <div className="dept-modal__actions">
              <button onClick={cancelDelete} className="dept-modal__btn dept-modal__btn--cancel">Cancel</button>
              <button onClick={confirmDelete} className="dept-modal__btn dept-modal__btn--delete">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase, createTempClient } from '../../lib/supabase.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { toast, Toaster } from 'react-hot-toast';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import './DirectorDashboard-v2.css';

export default function ManageStudents() {
  const { hodDepartmentsData } = useHodContext();
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({ fullName: '', rollNumber: '', phone: '', email: '', batchId: '', selectedYear: '', selectedBranch: '' });
  const [activeTab, setActiveTab] = useState('register');
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionSelectedStudents, setSectionSelectedStudents] = useState(new Set());
  const [isSplitting, setIsSplitting] = useState(false);
  const [sec1Name, setSec1Name] = useState('B1');
  const [sec2Name, setSec2Name] = useState('B2');

  const getSection = (student) => student?.section || null;

  const availableYears = useMemo(() => {
    return [...new Set(hodDepartmentsData.map((d) => d.description))].filter(Boolean).sort();
  }, [hodDepartmentsData]);

  const availableBranches = useMemo(() => {
    if (!formData.selectedYear) return [];
    const yearFiltered = hodDepartmentsData.filter((d) => d.description === formData.selectedYear);
    const branches = [];
    yearFiltered.forEach((d) => {
      const code = d.code || d.name;
      const name = d.name || d.code;
      if (AGGREGATE_DEPARTMENTS[code]) {
        AGGREGATE_DEPARTMENTS[code].forEach(sub => branches.push({ id: sub, code: sub, name: sub }));
      } else {
        branches.push({ id: code || name, code: code || name, name: name });
      }
    });
    return branches;
  }, [formData.selectedYear, hodDepartmentsData]);

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

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.selected_year) return false;
      const authorizedBranches = hodAuthorizedBranches[s.selected_year];
      if (!authorizedBranches) return false;
      if (!s.selected_branch) return false;
      return authorizedBranches.includes(s.selected_branch);
    });
  }, [students, hodAuthorizedBranches]);

  const tableStudents = useMemo(() => {
    let result = filteredStudents;
    if (filterYear !== 'All') {
      result = result.filter(s => s.selected_year === filterYear);
    }
    if (filterBranch !== 'All') {
      result = result.filter(s => s.selected_branch === filterBranch);
    }
    if (filterSection !== 'All') {
      result = result.filter(s => getSection(s) === filterSection);
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
  }, [filteredStudents, filterYear, filterBranch, filterSection, searchQuery]);

  const availableSections = useMemo(() => {
    return [...new Set(students.map(s => getSection(s)).filter(Boolean))];
  }, [students]);

  const sectionTargetStudents = useMemo(() => {
    let result = filteredStudents;
    if (filterYear !== 'All') {
      result = result.filter(s => s.selected_year === filterYear);
    }
    if (filterBranch !== 'All') {
      result = result.filter(s => s.selected_branch === filterBranch);
    }
    return [...result].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [filteredStudents, filterYear, filterBranch]);

  const unassignedStudents = useMemo(() => {
    return sectionTargetStudents.filter(s => !getSection(s));
  }, [sectionTargetStudents]);

  const b1Students = useMemo(() => {
    return sectionTargetStudents.filter(s => getSection(s) === sec1Name);
  }, [sectionTargetStudents, sec1Name]);

  const b2Students = useMemo(() => {
    return sectionTargetStudents.filter(s => getSection(s) === sec2Name);
  }, [sectionTargetStudents, sec2Name]);

  const updateStudentSection = async (studentIds, section) => {
    const { error } = await supabase.from('user_profiles').update({ section }).in('id', studentIds);
    if (error) {
      toast.error('Failed to update section: ' + error.message);
      return false;
    }
    return true;
  };

  const handleAutoSplit = async () => {
    if (isSplitting) return;
    const unassignedToSplit = sectionTargetStudents.filter(s => !getSection(s));
    if (unassignedToSplit.length === 0) {
      toast.error('No unassigned students to split');
      return;
    }

    setIsSplitting(true);
    const sorted = [...unassignedToSplit].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    const midpoint = Math.ceil(sorted.length / 2);
    const b1Group = sorted.slice(0, midpoint);
    const b2Group = sorted.slice(midpoint);

    let hasError = false;

    for (const student of b1Group) {
      if (student.id) {
        const success = await updateStudentSection([student.id], sec1Name);
        if (!success) hasError = true;
      }
    }

    for (const student of b2Group) {
      if (student.id) {
        const success = await updateStudentSection([student.id], sec2Name);
        if (!success) hasError = true;
      }
    }

    if (!hasError) {
      toast.success(`Students split into ${sec1Name} and ${sec2Name} successfully!`);
      fetchStudents();
    }
    setIsSplitting(false);
  };

  const handleMoveToSection = async (section) => {
    const selectedIds = Array.from(sectionSelectedStudents).map(id => String(id));
    if (selectedIds.length === 0) {
      toast.error('Please select students to move');
      return;
    }

    const success = await updateStudentSection(selectedIds, section);
    if (success) {
      toast.success(`Moved ${selectedIds.length} student(s) to Section ${section}`);
      setSectionSelectedStudents(new Set());
      fetchStudents();
    }
  };

  const handleRemoveSection = async (studentId) => {
    const success = await updateStudentSection([String(studentId)], null);
    if (success) {
      toast.success('Section removed');
      fetchStudents();
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSectionSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, roll_number, email, phone, selected_year, selected_branch, section, batch_id, role, college_id, branch_id, is_active, can_view_faculty, can_view_hod')
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
        email: formData.email,
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
        <button type="button" onClick={() => setActiveTab('sections')} className={`director-branch-subtab ${activeTab === 'sections' ? 'director-branch-subtab--active' : ''}`}>📂 Manage Sections</button>
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
            <select className="broadcast-input manage-students-select" style={{ maxWidth: '200px' }} value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterBranch('All'); setFilterSection('All'); }}>
              <option value="All">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select className="broadcast-input manage-students-select" style={{ maxWidth: '200px' }} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} disabled={filterYear === 'All'}>
              <option value="All">All Branches</option>
              {filterYear !== 'All' && hodAuthorizedBranches[filterYear]
                ? hodAuthorizedBranches[filterYear].map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))
                : null
              }
            </select>
            <select className="broadcast-input manage-students-select" style={{ maxWidth: '200px' }} value={filterSection} onChange={(e) => setFilterSection(e.target.value)} disabled={filterYear === 'All'}>
              <option value="All">All Sections</option>
              {availableSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
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
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</th>
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</th>
                <th style={{ padding: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
                    No students found.
                  </td>
                </tr>
              ) : tableStudents.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 12px', color: '#f8fafc', fontSize: '0.95rem', fontWeight: '500' }}>{student.full_name}</td>
                  <td style={{ padding: '14px 12px', color: '#cbd5e1', fontSize: '0.85rem' }}>{student.roll_number}</td>
                   <td style={{ padding: '14px 12px', color: '#cbd5e1', fontSize: '0.85rem' }}>{getSection(student) || '-'}</td>
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

      {activeTab === 'sections' && (
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
                ? hodAuthorizedBranches[filterYear].map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))
                : null
              }
            </select>
          </div>

          {filterYear === 'All' || filterBranch === 'All' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Please select a Year and Branch to manage sections.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '500' }}>Section 1 Name:</label>
                  <input
                    type="text"
                    value={sec1Name}
                    onChange={(e) => setSec1Name(e.target.value)}
                    className="broadcast-input"
                    style={{ maxWidth: '120px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '500' }}>Section 2 Name:</label>
                  <input
                    type="text"
                    value={sec2Name}
                    onChange={(e) => setSec2Name(e.target.value)}
                    className="broadcast-input"
                    style={{ maxWidth: '120px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleAutoSplit}
                  disabled={isSplitting || unassignedStudents.length === 0}
                  className="broadcast-send-btn"
                  style={{ opacity: (isSplitting || unassignedStudents.length === 0) ? 0.6 : 1 }}
                >
                  {isSplitting ? 'Splitting...' : `Auto-Split Alphabetically (${sec1Name}/${sec2Name})`}
                </button>
                <span style={{ marginLeft: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  {unassignedStudents.length} student(s) selected
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', fontWeight: '700' }}>Unassigned</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{unassignedStudents.length}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveToSection(sec1Name)}
                      disabled={sectionSelectedStudents.size === 0}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c4b5fd',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        opacity: sectionSelectedStudents.size === 0 ? 0.5 : 1
                      }}
                    >
                      Move to {sec1Name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveToSection(sec2Name)}
                      disabled={sectionSelectedStudents.size === 0}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#bfdbfe',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        opacity: sectionSelectedStudents.size === 0 ? 0.5 : 1
                      }}
                    >
                      Move to {sec2Name}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {unassignedStudents.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No unassigned students</div>
                    ) : unassignedStudents.map(student => (
                      <div
                        key={student.id}
                        onClick={() => toggleStudentSelection(student.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: sectionSelectedStudents.has(student.id) ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid ' + (sectionSelectedStudents.has(student.id) ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255, 255, 255, 0.05)'),
                          cursor: 'pointer',
                          transition: 'background 0.2s ease, border-color 0.2s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={sectionSelectedStudents.has(student.id)}
                          onChange={() => {}}
                          style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{student.roll_number}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                     <h4 style={{ margin: 0, color: '#c084fc', fontSize: '0.95rem', fontWeight: '700' }}>Section {sec1Name}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{b1Students.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {b1Students.length === 0 ? (
                       <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No students in {sec1Name}</div>
                    ) : b1Students.map(student => (
                      <div
                        key={student.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{student.roll_number}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(student.id)}
                          title={`Remove from ${sec1Name}`}
                          style={{
                            flexShrink: 0,
                            width: '28px',
                            height: '28px',
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '8px',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            background: 'rgba(244, 63, 94, 0.08)',
                            color: '#fda4af',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                     <h4 style={{ margin: 0, color: '#bfdbfe', fontSize: '0.95rem', fontWeight: '700' }}>Section {sec2Name}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>{b2Students.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {b2Students.length === 0 ? (
                       <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No students in {sec2Name}</div>
                    ) : b2Students.map(student => (
                      <div
                        key={student.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{student.roll_number}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(student.id)}
                          title={`Remove from ${sec2Name}`}
                          style={{
                            flexShrink: 0,
                            width: '28px',
                            height: '28px',
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '8px',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            background: 'rgba(244, 63, 94, 0.08)',
                            color: '#fda4af',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
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

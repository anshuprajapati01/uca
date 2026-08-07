import { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { supabase, createTempClient } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { toast, Toaster } from 'react-hot-toast';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import './DirectorDashboard-v2.css';

export default function ManageStudents() {
  const { hodDepartmentsData } = useHodContext();
  const { profile } = useAuth();
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
  const [isLockingSections, setIsLockingSections] = useState(false);
  const [lockSuccess, setLockSuccess] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [mentorAssignments, setMentorAssignments] = useState({});
  const [isSavingMentor, setIsSavingMentor] = useState(false);
  const fileInputRef = useRef(null);

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
      toast.success(`Student(s) successfully moved to ${section}`);
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

  const handleLockSections = async () => {
    if (isLockingSections) return;
    if (!filterYear || filterYear === 'All' || !filterBranch || filterBranch === 'All') return;

    setIsLockingSections(true);
    setLockSuccess(false);

    try {
      const { data, error: fetchErr } = await supabase
        .from('branches')
        .select('id, name, locked_sections')
        .ilike('description', `%${filterYear}%`);

      console.log("🕵️ Spy Log - DB Rows for", filterYear, ":", data, "Error:", fetchErr);

      if (fetchErr || !data) {
        throw new Error('Branch record not found in DB.');
      }

      const targetBranch = filterBranch.trim().toLowerCase();
      const row = data.find(d => {
        if (!d.name) return false;
        const branches = d.name.split('&').map(s => s.trim().toLowerCase());
        return branches.includes(targetBranch);
      });
      if (!row) {
        throw new Error('Branch record not found in DB.');
      }

      const newLocked = { ...(row.locked_sections || {}) };
      newLocked[filterBranch] = [sec1Name, sec2Name].filter(Boolean);

      const { error: updateError } = await supabase
        .from('branches')
        .update({ locked_sections: newLocked })
        .eq('id', row.id);

      if (updateError) throw updateError;

      setLockSuccess(true);
      toast.success('Sections locked successfully');
      setTimeout(() => setLockSuccess(false), 2000);
    } catch (err) {
      toast.error('Failed to lock sections: ' + (err?.message || String(err)));
    } finally {
      setIsLockingSections(false);
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

  useEffect(() => {
    async function loadFaculties() {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'faculty');
      setFaculties(data || []);
    }
    loadFaculties();
  }, []);

  useEffect(() => {
    async function loadLockedSections() {
      if (filterYear === 'All' || filterBranch === 'All') {
        setSec1Name('B1');
        setSec2Name('B2');
        return;
      }

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, locked_sections')
        .ilike('description', `%${filterYear}%`);

      console.log("🕵️ Spy Log - DB Rows for", filterYear, ":", data, "Error:", error);

      if (error || !data) {
        setSec1Name('B1');
        setSec2Name('B2');
        return;
      }

      const targetBranch = filterBranch.trim().toLowerCase();
      const row = data.find(d => {
        if (!d.name) return false;
        const branches = d.name.split('&').map(s => s.trim().toLowerCase());
        return branches.includes(targetBranch);
      });
      const sections = row?.locked_sections?.[filterBranch] || [];
      setSec1Name(sections[0] || 'B1');
      setSec2Name(sections[1] || 'B2');
    }
    loadLockedSections();
  }, [filterYear, filterBranch]);

  useEffect(() => {
    async function loadMentors() {
      if (activeTab !== 'sections' || filterYear === 'All' || filterBranch === 'All') {
        return;
      }
      const { data } = await supabase
        .from('section_mentors')
        .select('section, faculty_id')
        .eq('branch', filterBranch)
        .eq('year', filterYear);
      if (data) {
        const map = {};
        data.forEach(row => {
          map[row.section] = row.faculty_id;
        });
        setMentorAssignments(map);
      }
    }
    loadMentors();
  }, [activeTab, filterYear, filterBranch, sec1Name, sec2Name]);

  const handleMentorChange = async (section, facultyId) => {
    if (isSavingMentor) return;
    setIsSavingMentor(true);
    const year = filterYear;
    const branch = filterBranch;

    if (facultyId === '' || facultyId === null) {
      const { error } = await supabase
        .from('section_mentors')
        .delete()
        .eq('branch', branch)
        .eq('year', year)
        .eq('section', section);
      if (!error) {
        setMentorAssignments(prev => {
          const next = { ...prev };
          delete next[section];
          return next;
        });
        toast.success(`Mentor removed from ${section}`);
      } else {
        toast.error('Failed to remove mentor: ' + error.message);
      }
    } else {
      const { error } = await supabase
        .from('section_mentors')
        .upsert({ branch, year, section, faculty_id: facultyId }, { onConflict: 'branch,year,section' });
      if (!error) {
        setMentorAssignments(prev => ({ ...prev, [section]: facultyId }));
        const facultyName = faculties.find(f => f.id === facultyId)?.full_name || 'Faculty';
        toast.success(`Mentor assigned to ${section}: ${facultyName}`);
      } else {
        toast.error('Failed to assign mentor: ' + error.message);
      }
    }
    setIsSavingMentor(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const tempSupabase = createTempClient();

    try {
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.rollNumber,
        options: {
          data: {
            role: 'student',
            college_id: profile?.college_id || '11111111-0000-0000-0000-000000000001',
          },
        },
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
        college_id: profile?.college_id || '11111111-0000-0000-0000-000000000001',
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

  const handleDownloadTemplate = () => {
    const headers = ['Full Name', 'Roll Number', 'Email', 'Phone Number', 'Year', 'Branch'];
    const sampleRow = ['John Doe', '21UCA001', 'john@example.com', '9876543210', '2', 'CSE'];
    const csvContent = [headers, sampleRow].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'student_registration_template.csv';
    link.click();
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      setImportResult(null);
    }
    e.target.value = null;
  };

  const clearCsvFile = () => {
    setCsvFile(null);
    setImportResult(null);
  };

  const importSingleStudent = async (row) => {
    const tempSupabase = createTempClient();
    const fullName = (row['Full Name'] || '').trim();
    const rollNumber = (row['Roll Number'] || '').trim();
    const email = (row['Email'] || '').trim();
    const phone = (row['Phone Number'] || '').trim();
    const selectedYear = (row['Year'] || '').trim();
    const selectedBranch = (row['Branch'] || '').trim();

    if (!fullName || !rollNumber || !email || !selectedYear || !selectedBranch) {
      return { success: false, reason: 'Missing required fields' };
    }

    const yearDescriptions = [...new Set(hodDepartmentsData.map(d => d.description).filter(Boolean))];
    const exactYearMatch = yearDescriptions.find(y => y.toLowerCase() === selectedYear.toLowerCase());
    let normalizedYear = exactYearMatch || selectedYear;
    if (!exactYearMatch) {
      const inputNum = parseInt(selectedYear, 10);
      if (!isNaN(inputNum)) {
        const numericMatch = yearDescriptions.find(y => {
          const match = y.match(/^(\d+)/);
          return match && parseInt(match[1], 10) === inputNum;
        });
        if (numericMatch) normalizedYear = numericMatch;
      }
    }

    const branchValues = new Set();
    hodDepartmentsData.forEach(d => {
      const code = d.code || d.name;
      const name = d.name || d.code;
      if (code) branchValues.add(code);
      if (name) branchValues.add(name);
      if (AGGREGATE_DEPARTMENTS[code]) {
        AGGREGATE_DEPARTMENTS[code].forEach(sub => branchValues.add(sub));
      }
    });
    const normalizedBranch = [...branchValues].find(b => b && b.toLowerCase() === selectedBranch.toLowerCase()) || selectedBranch;

    try {
      const signUpPayload = {
        email: email.toLowerCase(),
        password: rollNumber,
        options: {
          data: {
            full_name: fullName,
            roll_number: rollNumber,
            phone_number: phone || null,
            year: normalizedYear,
            branch: normalizedBranch,
            role: 'student',
            college_id: profile?.college_id || '11111111-0000-0000-0000-000000000001',
            branch_id: null,
            is_active: true
          }
        }
      };
      console.log('[Bulk Import] SignUp payload:', signUpPayload);
      const { data: authData, error: authError } = await tempSupabase.auth.signUp(signUpPayload);

      if (authError) throw authError;
      if (!authData.user) throw new Error('Could not create user. Email might already exist.');

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!existingProfile) {
        const profilePayload = {
          id: authData.user.id,
          full_name: fullName,
          email: email,
          roll_number: rollNumber,
          phone: phone || null,
          role: 'student',
          batch_id: null,
          selected_year: normalizedYear,
          selected_branch: normalizedBranch,
          college_id: profile?.college_id || '11111111-0000-0000-0000-000000000001',
          branch_id: null,
          section: null,
          is_active: true,
          can_view_faculty: false,
          can_view_hod: false
        };
        console.log('[Bulk Import] Inserting profile payload:', profilePayload);
        const { error: profileError } = await supabase.from('user_profiles').insert([profilePayload]);

        if (profileError) throw profileError;
      }

      return { success: true };
    } catch (error) {
      console.error('[Bulk Import Row Error]', error);
      const message = error?.message || String(error) || '';
      const lowerMessage = message.toLowerCase();
      const status = error?.status || error?.code;
      const isDuplicate = lowerMessage.includes('already registered') || lowerMessage.includes('duplicate') || status === 500;
      if (isDuplicate) {
        return { success: false, reason: 'Email address already exists in the system' };
      }
      return { success: false, reason: message || 'Unknown error' };
    }
  };

  const handleProcessCsv = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results),
          error: (error) => reject(error)
        });
      });

      if (parsed?.errors?.length > 0) {
        toast.error('CSV parsing error: ' + (parsed.errors[0]?.message || 'Unknown CSV error'));
        setIsImporting(false);
        return;
      }

      const rows = Array.isArray(parsed?.data) ? parsed.data : [];
      if (rows.length === 0) {
        toast.error('CSV file is empty or has no valid data rows.');
        setIsImporting(false);
        return;
      }

      const results = await Promise.allSettled(rows.map(row => importSingleStudent(row)));

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value?.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`Row ${index + 2}: ${result.value?.reason || 'Unknown error'}`);
          }
        } else {
          failCount++;
          errors.push(`Row ${index + 2}: ${result.reason || 'Unknown error'}`);
        }
      });

      setImportResult({ successCount, failCount, errors });

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} student(s)!`);
        fetchStudents();
        setTimeout(() => {
          clearCsvFile();
        }, 3000);
      }
      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} student(s). Check details below.`);
      }
    } catch (error) {
      console.error('[Bulk Import Error]', error);
      const message = error?.message || String(error) || 'An unknown error occurred';
      toast.error('Import failed: ' + message);
    } finally {
      setIsImporting(false);
    }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <form onSubmit={handleSubmit} className="broadcast-form-container" style={{ flex: 1, minWidth: 0 }}>
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

            <div style={{ width: '320px', flexShrink: 0, background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Bulk Upload via CSV</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button type="button" onClick={handleDownloadTemplate} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '10px', border: '0', background: '#059669', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s ease, transform 0.2s ease', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  Download Template
                </button>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvFileChange} style={{ display: 'none' }} />
                <div onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}>
                  Choose CSV File
                </div>
                {csvFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <span style={{ flex: 1, color: '#e2e8f0', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{csvFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); clearCsvFile(); }} title="Clear selected file" style={{ flexShrink: 0, width: '28px', height: '28px', display: 'grid', placeItems: 'center', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.25)', background: 'rgba(244, 63, 94, 0.08)', color: '#fda4af', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, transition: 'background 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'; }}>
                      ✕
                    </button>
                  </div>
                )}
                <button type="button" onClick={handleProcessCsv} disabled={isImporting || !csvFile} style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '10px', border: '0', background: isImporting || !csvFile ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: isImporting || !csvFile ? '#64748b' : '#fff', fontSize: '0.9rem', fontWeight: '800', cursor: isImporting || !csvFile ? 'not-allowed' : 'pointer', boxShadow: isImporting || !csvFile ? 'none' : '0 8px 20px rgba(99, 102, 241, 0.35)', transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }} onMouseEnter={(e) => { if (!isImporting && csvFile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(99, 102, 241, 0.45)'; } }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isImporting || !csvFile ? 'none' : '0 8px 20px rgba(99, 102, 241, 0.35)'; }}>
                  {isImporting ? 'Importing...' : 'Import Students'}
                </button>
              </div>
              {importResult && (
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: importResult.failCount > 0 ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${importResult.failCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, marginTop: '0.75rem' }}>
                  <p style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: '600', margin: '0 0 0.4rem' }}>
                    {importResult.successCount} succeeded, {importResult.failCount} failed
                  </p>
                  {importResult.errors?.length > 0 && (
                    <ul style={{ color: '#fda4af', fontSize: '0.8rem', margin: 0, paddingLeft: '1.1rem' }}>
                      {importResult.errors?.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {importResult.errors?.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
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
                <button
                  type="button"
                  onClick={handleLockSections}
                  disabled={isLockingSections}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    background: lockSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.1)',
                    color: lockSuccess ? '#6ee7b7' : '#fda4af',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {lockSuccess ? '✓ Locked' : isLockingSections ? 'Locking...' : '🔒 Lock Sections'}
                </button>
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
                      className="move-to-section-btn"
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c4b5fd',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Move to {sec1Name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveToSection(sec2Name)}
                      disabled={sectionSelectedStudents.size === 0}
                      className="move-to-section-btn"
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#bfdbfe',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer'
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, color: '#c084fc', fontSize: '0.95rem', fontWeight: '700' }}>Section {sec1Name}</h4>
                      <select
                        value={mentorAssignments[sec1Name] || ''}
                        onChange={(e) => handleMentorChange(sec1Name, e.target.value)}
                        disabled={isSavingMentor}
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(15, 23, 42, 0.6)',
                          color: '#e2e8f0',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="">👤 Assign Mentor</option>
                        {faculties.map(f => (
                          <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                      </select>
                    </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, color: '#bfdbfe', fontSize: '0.95rem', fontWeight: '700' }}>Section {sec2Name}</h4>
                      <select
                        value={mentorAssignments[sec2Name] || ''}
                        onChange={(e) => handleMentorChange(sec2Name, e.target.value)}
                        disabled={isSavingMentor}
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(15, 23, 42, 0.6)',
                          color: '#e2e8f0',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="">👤 Assign Mentor</option>
                        {faculties.map(f => (
                          <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                      </select>
                    </div>
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

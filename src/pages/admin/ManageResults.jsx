import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Papa from 'papaparse';

const ManageResults = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [allowedYears, setAllowedYears] = useState([]);
  const [allowedBranches, setAllowedBranches] = useState([]);
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('manageResultsFilters');
      return saved ? JSON.parse(saved) : { year: '', branch: '', semester: '' };
    } catch {
      return { year: '', branch: '', semester: '' };
    }
  });

  const [students, setStudents] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState(null);
  const [toast, setToast] = useState(null);
  const [uploadedRecords, setUploadedRecords] = useState([]);
  const [recordToDelete, setRecordToDelete] = useState(null);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configData, setConfigData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', type: 'Theory', credits: 3 });

  const getSemestersForYear = (year) => {
    switch(year) {
      case '1st Year': return ['1', '2'];
      case '2nd Year': return ['3', '4'];
      case '3rd Year': return ['5', '6'];
      case '4th Year': return ['7', '8'];
      default: return ['1', '2'];
    }
  };

  useEffect(() => {
    if (user) fetchHodAssignments();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('manageResultsFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (filters.year && filters.branch && filters.semester) {
      fetchConfig();
    } else {
      setConfigData([]);
    }
  }, [filters.year, filters.branch, filters.semester]);

  const fetchHodAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('assigned_years, assigned_branches')
        .eq('id', user.id)
        .single();

      let years = ['2nd Year', '3rd Year'];
      let branches = ['CS', 'IT'];

      if (!error && data) {
        if (data.assigned_years?.length > 0) years = data.assigned_years;
        if (data.assigned_branches?.length > 0) branches = data.assigned_branches;
      }

      setAllowedYears(years);
      setAllowedBranches(branches);

      try {
        const saved = localStorage.getItem('manageResultsFilters');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (years.includes(parsed.year) && branches.includes(parsed.branch)) {
            const sems = getSemestersForYear(parsed.year);
            if (sems.includes(parsed.semester)) {
              setFilters(parsed);
              return;
            }
          }
        }
      } catch {}

      setFilters({
        year: years[0],
        branch: branches[0],
        semester: getSemestersForYear(years[0])[0]
      });

    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjectsFromDb = async () => {
    try {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('department', filters.branch)
        .eq('year', filters.year)
        .eq('semester', `Semester ${filters.semester}`)
        .order('code', { ascending: true });
      if (data) {
        const uniqueData = Array.from(new Map(data.map(item => [item.code, item])).values());
        setSubjects(uniqueData);
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setSubjects([]);
    }
  };

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('semester_config')
        .select('*')
        .eq('year', filters.year)
        .eq('branch', filters.branch)
        .eq('semester', parseInt(filters.semester));
      if (data) {
        const uniqueData = Array.from(new Map(data.map(item => [item.subject_code, item])).values());
        setConfigData(uniqueData);
      } else {
        setConfigData([]);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setConfigData([]);
    }
  };

  useEffect(() => {
    if (filters.year && filters.branch && filters.semester) {
      fetchConfig();
    } else {
      setConfigData([]);
    }
  }, [filters.year, filters.branch, filters.semester]);

  useEffect(() => {
    if (filters.semester) {
      fetchUploadedRecords();
    } else {
      setUploadedRecords([]);
    }
  }, [filters.semester]);

  const handleConfigToggle = (subjectKey, field, value) => {
    setConfigData(prev => {
      const existing = prev.find(c => c.subject_id === subjectKey);
      if (existing) {
        return prev.map(c => c.subject_id === subjectKey ? { ...c, [field]: value } : c);
      }
      return [...prev, {
        subject_id: subjectKey,
        year: filters.year,
        branch: filters.branch,
        semester: parseInt(filters.semester),
        is_cgpa_active: field === 'is_cgpa_active' ? value : false,
        is_mandatory: field === 'is_mandatory' ? value : false,
      }];
    });

    setSubjects(prev => prev.map(s => {
      const key = s.id || s.code;
      return key === subjectKey ? { ...s, [field]: value } : s;
    }));
  };

  const handleSelectAll = (field, value) => {
    setSubjects(prev => prev.map(s => ({ ...s, [field]: value })));
  };

  const handleAddSubject = () => {
    if (!newSubject.name || !newSubject.code) return;
    const isDuplicate = subjects.some(s => s.code === newSubject.code);
if (isDuplicate) {
       showToast("This subject code already exists in this semester!", 'error');
       return;
     }
    setSubjects(prev => [...prev, { ...newSubject, id: null }]);
    setNewSubject({ name: '', code: '', type: 'Theory', credits: 3 });
  };

  const handleDeleteSubject = (index) => {
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      // 1. DELETE FIRST: Ensure the table is clean for this specific category
      const { error: deleteError } = await supabase
        .from('semester_config')
        .delete()
        .eq('year', filters.year)
        .eq('branch', filters.branch)
        .eq('semester', filters.semester);

      if (deleteError) throw deleteError;

      // 2. De-duplicate based on subject_code
      const uniqueSubjects = Array.from(new Map(subjects.map(s => [s.code, s])).values());

      // 3. INSERT FRESH: Insert the current state of the subjects array
      const payload = uniqueSubjects.map(s => ({
        year: filters.year,
        branch: filters.branch,
        semester: filters.semester,
        subject_code: s.code,
        subject_name: s.name,
        type: s.type || 'Theory',
        is_cgpa_active: s.is_cgpa_active ?? true,
        is_mandatory: s.is_mandatory ?? true
      }));

const { error: insertError } = await supabase
        .from('semester_config')
        .insert(payload);

      if (insertError) throw insertError;

      await fetchConfig();

      showToast('Configuration saved successfully!');
      setShowConfigModal(false);
    } catch (err) {
      console.error('Error saving config:', err);
      showToast('Failed to save configuration: ' + err.message, 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
    if (filters.branch && filters.year) fetchStudents();
  }, [filters.branch, filters.year]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, roll_number, email')
        .in('role', ['student', 'cr']);
      if (data) setStudents(data);
    } catch (err) {}
    setLoading(false);
  };

  const fetchUploadedRecords = async () => {
    if (!filters.semester) {
      setUploadedRecords([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('academic_history')
        .select('id, roll_number, sgpa, total_marks, created_at')
        .eq('semester', parseInt(filters.semester))
        .order('created_at', { ascending: false });
      if (data) setUploadedRecords(data);
      else setUploadedRecords([]);
    } catch (err) {
      console.error('Failed to fetch uploaded records:', err);
      setUploadedRecords([]);
    }
  };

  const confirmDelete = async () => {
      if (!recordToDelete) return;
      try {
        const { error } = await supabase.from('academic_history').delete().eq('id', recordToDelete);
        if (error) throw error;
        
        if (typeof showToast === 'function') {
            showToast('Record deleted successfully!', 'success');
        } else {
            alert('Record deleted successfully!');
        }
        fetchUploadedRecords();
      } catch (error) {
        console.error('Delete error:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to delete record.', 'error');
        }
      } finally {
        setRecordToDelete(null);
      }
    };

  const handleDownloadTemplate = () => {
    if (!configData || configData.length === 0) {
      showToast('Please configure the semester subjects first to generate a template.', 'error');
      return;
    }

    const baseHeaders = ['roll_number', 'full_name', 'sgpa', 'total_marks', 'status'];
    const dynamicHeaders = configData.flatMap(cfg => [`${cfg.subject_code}_int`, `${cfg.subject_code}_ext`, `${cfg.subject_code}_grade`]);
    const headers = [...baseHeaders, ...dynamicHeaders].join(',');

    const csvContent = headers;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Semester_${filters.semester}_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('CSV template downloaded successfully!');
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    const availableSems = getSemestersForYear(newYear);
    setFilters({ ...filters, year: newYear, semester: availableSems[0] });
    setPreviewData([]); setMessage(null);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPreviewData([]); setMessage(null);
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!configData || configData.length === 0) {
      setMessage({ type: 'error', text: 'No semester configuration found. Please configure subjects first.' });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvData = results.data;
        
        const mappedData = csvData.map(row => {
          const matchedStudent = students.find(s => s.roll_number === row.roll_number);
          
          const parsedSubjects = configData.map(config => {
            const code = config.subject_code;
            return {
              code: code,
              name: config.subject_name,
              type: config.type || 'Theory',
              internal: parseInt(row[`${code}_int`]) || 0,
              external: parseInt(row[`${code}_ext`]) || 0,
              grade: row[`${code}_grade`] || 'N/A'
            };
          });

          return {
            student_id: matchedStudent?.id || null, 
            roll_number: row.roll_number,
            full_name: matchedStudent?.full_name || row.full_name || 'Unknown',
            semester: parseInt(filters.semester),
            sgpa: parseFloat(row.sgpa),
            total_marks: parseInt(row.total_marks),
            total_credits: 24,
            status: row.status?.toUpperCase() || 'PASS',
            details: 'AKTU Exact Results via HOD CSV Upload.',
            subjects: parsedSubjects
          };
        }).filter(d => d.student_id); 

        if(mappedData.length === 0) {
          setMessage({ type: 'error', text: 'No matching roll numbers found in the database.' });
        } else {
          setPreviewData(mappedData);
          setMessage({ type: 'success', text: `Successfully matched and parsed ${mappedData.length} records with EXACT subject marks.` });
        }
      },
      error: (err) => setMessage({ type: 'error', text: `CSV Parse Error: ${err.message}` })
    });
    
    e.target.value = null;
  };

  const handlePublishBulk = async () => {
    setPublishing(true);
    setMessage(null);
    try {
      const insertPayload = previewData.map(d => ({
        student_id: d.student_id,
        roll_number: d.roll_number,
        semester: d.semester,
        sgpa: d.sgpa,
        total_marks: d.total_marks,
        total_credits: d.total_credits,
        status: d.status,
        details: d.details,
        subjects: d.subjects
      }));

      const { error } = await supabase
        .from('academic_history')
        .upsert(insertPayload, { 
          onConflict: 'roll_number, semester',
          ignoreDuplicates: false
        });

      if (error) throw error;

      setMessage({ type: 'success', text: `Successfully published/updated results for ${insertPayload.length} students!` });
      setPreviewData([]);
      await fetchUploadedRecords();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setPublishing(false);
  };

  if (!filters.year) return <div className="p-6 text-slate-400">Verifying HOD access permissions...</div>;

  return (
    <div className="fade-in" style={{ padding: '20px', color: '#e2e8f0' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '12px 20px', borderRadius: '8px', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: '#fff', zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 'bold' }}>
          {toast.text}
        </div>
      )}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#f1f5f9', marginBottom: '5px' }}>Batch Publish Results</h2>
        <p style={{ color: '#94a3b8' }}>Upload AKTU university results via CSV. Subjects are automatically mapped based on selected semester.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px', background: '#151725', padding: '20px', borderRadius: '12px', border: '1px solid #2d314d' }}>
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Assigned Year</label>
          <select value={filters.year} onChange={handleYearChange} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #2d314d', borderRadius: '6px', color: '#fff', outline: 'none' }}>
            {allowedYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Assigned Branch</label>
          <select name="branch" value={filters.branch} onChange={handleFilterChange} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #2d314d', borderRadius: '6px', color: '#fff', outline: 'none' }}>
            {allowedBranches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Target Semester</label>
          <select name="semester" value={filters.semester} onChange={handleFilterChange} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #2d314d', borderRadius: '6px', color: '#fff', outline: 'none' }}>
            {getSemestersForYear(filters.year).map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <button 
          onClick={() => { setShowConfigModal(true); fetchConfig(); fetchSubjectsFromDb(); }}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-end' }}
        >
          Configure Semester
        </button>
      </div>

      {configData && configData.length > 0 && (
        <div style={{ marginTop: '20px', marginBottom: '20px', background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✅ Active Configuration for Semester {filters.semester}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', color: '#cbd5e1', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Subject Code</th>
                  <th style={{ padding: '12px' }}>Subject Name</th>
                  <th style={{ padding: '12px' }}>SGPA Active</th>
                  <th style={{ padding: '12px' }}>Mandatory</th>
                </tr>
              </thead>
              <tbody>
                {configData.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#e2e8f0' }}>{sub.subject_code}</td>
                    <td style={{ padding: '12px' }}>{sub.subject_name}</td>
                    <td style={{ padding: '12px' }}>
                      {sub.is_cgpa_active ? <span style={{ color: '#22c55e' }}>✔ Yes</span> : <span style={{ color: '#ef4444' }}>✖ No</span>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {sub.is_mandatory ? <span style={{ color: '#22c55e' }}>✔ Yes</span> : <span style={{ color: '#ef4444' }}>✖ No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewData.length === 0 && (
        <>
          <div style={{ background: '#151725', border: '2px dashed #6d28d9', borderRadius: '12px', padding: '50px 20px', textAlign: 'center', marginBottom: '30px' }}>
            <svg style={{ width: '48px', height: '48px', color: '#8b5cf6', margin: '0 auto 15px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <h3 style={{ color: '#e2e8f0', fontSize: '1.2rem', marginBottom: '10px' }}>Upload AKTU Result CSV here</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '25px' }}>File headers must include: <strong>roll_number, full_name, sgpa, total_marks, status</strong> plus subject columns like <strong>BCS401_int, BCS401_ext, BCS401_grade</strong></p>
            
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            
            <div style={{ marginBottom: '15px' }}>
              <button onClick={handleDownloadTemplate} style={{ background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                📥 Download Blank CSV Template
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
              <button onClick={handleBrowseClick} style={{ background: '#6d28d9', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Browse CSV File
              </button>
            </div>
          </div>
        </>
      )}

      {message && (
        <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'error' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)', color: message.type === 'error' ? '#f87171' : '#34d399', border: `1px solid ${message.type === 'error' ? '#f87171' : '#34d399'}` }}>
          {message.text}
        </div>
      )}

      {previewData.length > 0 && (
        <div style={{ background: '#151725', border: '1px solid #2d314d', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #2d314d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.1rem' }}>Data Preview ({previewData.length} records)</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPreviewData([])} style={{ background: '#2d314d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handlePublishBulk} disabled={publishing} style={{ background: '#34d399', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: publishing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {publishing ? 'Publishing...' : 'Confirm & Publish All'}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Roll Number</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Student Name</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>SGPA</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Total Marks</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '15px', color: '#cbd5e1' }}>{row.roll_number}</td>
                    <td style={{ padding: '15px', color: '#f1f5f9' }}>{row.full_name}</td>
                    <td style={{ padding: '15px', color: '#38bdf8', fontWeight: 'bold' }}>{row.sgpa}</td>
                    <td style={{ padding: '15px', color: '#cbd5e1' }}>{row.total_marks}</td>
                    <td style={{ padding: '15px' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: row.status === 'PASS' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', color: row.status === 'PASS' ? '#34d399' : '#f87171' }}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', marginBottom: '20px', background: '#151725', borderRadius: '12px', border: '1px solid #2d314d', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2d314d' }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.1rem' }}>
            Uploaded Results for {filters.semester ? `Semester ${filters.semester}` : 'Selected Semester'}
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {uploadedRecords.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              No results uploaded yet for this semester.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Roll Number</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>SGPA</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Total Marks</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d' }}>Upload Date</th>
                  <th style={{ padding: '15px', color: '#94a3b8', borderBottom: '1px solid #2d314d', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {uploadedRecords.map((record) => {
                  const date = new Date(record.created_at);
                  const formattedDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <tr key={record.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '15px', color: '#cbd5e1', fontWeight: '500' }}>{record.roll_number}</td>
                      <td style={{ padding: '15px', color: '#38bdf8', fontWeight: 'bold' }}>{record.sgpa ?? 'N/A'}</td>
                      <td style={{ padding: '15px', color: '#cbd5e1' }}>{record.total_marks ?? 'N/A'}</td>
                      <td style={{ padding: '15px', color: '#94a3b8', fontSize: '0.85rem' }}>{formattedDate}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button
                          onClick={() => setRecordToDelete(record.id)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showConfigModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '700px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #334155' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>Configure Semester {filters.semester} Subjects</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>Manage subjects and toggle settings for this semester.</p>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155' }}>
              <h4 style={{ color: '#f1f5f9', margin: '0 0 12px 0', fontSize: '0.95rem' }}>Add New Subject</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Subject Name</label>
                  <input 
                    type="text" 
                    value={newSubject.name}
                    onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                    placeholder="e.g. Data Structures"
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Subject Code</label>
                  <input 
                    type="text" 
                    value={newSubject.code}
                    onChange={e => setNewSubject({...newSubject, code: e.target.value.toUpperCase()})}
                    placeholder="e.g. BCS301"
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Type</label>
                  <select 
                    value={newSubject.type}
                    onChange={e => setNewSubject({...newSubject, type: e.target.value})}
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', outline: 'none' }}
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Credits</label>
                  <input 
                    type="number" 
                    value={newSubject.credits}
                    onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value) || 0})}
                    min="1"
                    max="6"
                    style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff', outline: 'none' }}
                  />
                </div>
                <button onClick={handleAddSubject} style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '36px' }}>Add</button>
              </div>
            </div>

            {subjects.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No subjects configured. Add subjects using the form above.</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', padding: '8px 14px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>Subject Details</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    SGPA Active<br/>
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAll('is_cgpa_active', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Mandatory<br/>
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAll('is_mandatory', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>Action</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {subjects.map((subject, index) => {
                    const subjectKey = subject.id || subject.code;
                    const cfg = configData.find(c => c.subject_id === subjectKey);
                    const isCgpaActive = cfg ? (cfg.is_cgpa_active !== false) : (subject.is_cgpa_active !== false);
                    const isMandatory = cfg ? (cfg.is_mandatory !== false) : (subject.is_mandatory !== false);

                    return (
                      <div key={subjectKey} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', background: '#0f172a', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '0.9rem' }}>{subject.code} - {subject.name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{subject.type} | Credits: {subject.credits || 3}</div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isCgpaActive}
                            onChange={(e) => handleConfigToggle(subjectKey, 'is_cgpa_active', e.target.checked)}
                          />
                          {isCgpaActive ? 'Yes' : 'No'}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isMandatory}
                            onChange={(e) => handleConfigToggle(subjectKey, 'is_mandatory', e.target.checked)}
                          />
                          {isMandatory ? 'Yes' : 'No'}
                        </label>
                        <button 
                          onClick={() => handleDeleteSubject(index)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowConfigModal(false)} style={{ padding: '8px 16px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
              <button onClick={handleSaveConfig} disabled={isSavingConfig} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSavingConfig ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {recordToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} className="fade-in">
            <h3 style={{ color: '#f87171', margin: '0 0 12px 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Confirm Deletion
            </h3>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete this student's result? This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setRecordToDelete(null)} 
                style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.target.style.color = '#cbd5e1'}
                onMouseOut={(e) => e.target.style.color = '#94a3b8'}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = '#dc2626'}
                onMouseOut={(e) => e.target.style.background = '#ef4444'}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageResults;
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react';

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
        <h2 style={{ color: '#0f172a', fontSize: '1.875rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', letterSpacing: '-0.025em' }}>Batch Publish Results</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', textAlign: 'center', marginBottom: '32px' }}>Upload AKTU university results via CSV. Subjects are automatically mapped based on selected semester.</p>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <div>
          <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Assigned Year</label>
          <select value={filters.year} onChange={handleYearChange} style={{ width: '100%', minWidth: '200px', appearance: 'none', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
            {allowedYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Assigned Branch</label>
          <select name="branch" value={filters.branch} onChange={handleFilterChange} style={{ width: '100%', minWidth: '200px', appearance: 'none', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
            {allowedBranches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Target Semester</label>
          <select name="semester" value={filters.semester} onChange={handleFilterChange} style={{ width: '100%', minWidth: '200px', appearance: 'none', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 16px', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
            {getSemestersForYear(filters.year).map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <button 
          onClick={() => { setShowConfigModal(true); fetchConfig(); fetchSubjectsFromDb(); }}
          style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' }}
        >
          Configure Semester
        </button>
      </div>

      {configData && configData.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '32px', marginTop: '24px' }}>
          <h3 style={{ backgroundColor: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '700', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10b981" /> Active Configuration for Semester {filters.semester}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>Subject Code</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>Subject Name</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>SGPA Active</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>Mandatory</th>
                </tr>
              </thead>
              <tbody>
                {configData.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{sub.subject_code}</td>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{sub.subject_name}</td>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>
                      {sub.is_cgpa_active ? <><CheckCircle2 size={16} color="#10b981" /> Yes</> : <><XCircle size={16} color="#ef4444" /> No</>}
                    </td>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>
                      {sub.is_mandatory ? <><CheckCircle2 size={16} color="#10b981" /> Yes</> : <><XCircle size={16} color="#ef4444" /> No</>}
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
          <div style={{ backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', transition: 'all 0.2s ease', marginTop: '24px' }}>
            <UploadCloud size={48} color="#4f46e5" style={{ margin: '0 auto 15px', display: 'block' }} />
            <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: '600', marginTop: '16px', marginBottom: '8px' }}>Upload AKTU Result CSV here</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px', lineHeight: '1.5' }}>File headers must include: <strong>roll_number, full_name, sgpa, total_marks, status</strong> plus subject columns like <strong>BCS401_int, BCS401_ext, BCS401_grade</strong></p>
            
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            
            <div style={{ marginBottom: '15px' }}>
              <button onClick={handleDownloadTemplate} style={{ backgroundColor: '#ffffff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                📥 Download Blank CSV Template
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
              <button onClick={handleBrowseClick} style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' }}>
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
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: '700' }}>Data Preview ({previewData.length} records)</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPreviewData([])} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handlePublishBulk} disabled={publishing} style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: publishing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {publishing ? 'Publishing...' : 'Confirm & Publish All'}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Roll Number</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Student Name</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>SGPA</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Total Marks</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{row.roll_number}</td>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{row.full_name}</td>
                    <td style={{ color: '#0f172a', padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600' }}>{row.sgpa}</td>
                    <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{row.total_marks}</td>
                    <td style={{ padding: '16px 24px' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: row.status === 'PASS' ? '#d1fae5' : '#fee2e2', color: row.status === 'PASS' ? '#065f46' : '#991b1b' }}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: '32px' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '700', fontSize: '1.125rem', textAlign: 'center' }}>
            Uploaded Results for {filters.semester ? `Semester ${filters.semester}` : 'Selected Semester'}
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {uploadedRecords.length === 0 ? (
            <div style={{ color: '#64748b', padding: '48px 24px', textAlign: 'center' }}>
              No results uploaded yet for this semester.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>Roll Number</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>SGPA</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>Total Marks</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left' }}>Upload Date</th>
                  <th style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'center' }}>Action</th>
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
                    <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem', fontWeight: '500' }}>{record.roll_number}</td>
                      <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{record.sgpa ?? 'N/A'}</td>
                      <td style={{ color: '#334155', padding: '16px 24px', fontSize: '0.875rem' }}>{record.total_marks ?? 'N/A'}</td>
                      <td style={{ color: '#64748b', padding: '16px 24px', fontSize: '0.875rem' }}>{formattedDate}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
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
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>Configure Semester {filters.semester} Subjects</h3>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>Manage subjects and toggle settings for this semester.</p>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <h4 style={{ color: '#0f172a', margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '600' }}>Add New Subject</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.75rem', marginBottom: '4px', fontWeight: '600' }}>Subject Name</label>
                  <input 
                    type="text" 
                    value={newSubject.name}
                    onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                    placeholder="e.g. Data Structures"
                    style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.75rem', marginBottom: '4px', fontWeight: '600' }}>Subject Code</label>
                  <input 
                    type="text" 
                    value={newSubject.code}
                    onChange={e => setNewSubject({...newSubject, code: e.target.value.toUpperCase()})}
                    placeholder="e.g. BCS301"
                    style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.75rem', marginBottom: '4px', fontWeight: '600' }}>Type</label>
                  <select 
                    value={newSubject.type}
                    onChange={e => setNewSubject({...newSubject, type: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#475569', fontSize: '0.75rem', marginBottom: '4px', fontWeight: '600' }}>Credits</label>
                  <input 
                    type="number" 
                    value={newSubject.credits}
                    onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value) || 0})}
                    min="1"
                    max="6"
                    style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <button onClick={handleAddSubject} style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '36px' }}>Add</button>
              </div>
            </div>

            {subjects.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No subjects configured. Add subjects using the form above.</div>
            ) : (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Subject Details</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
                    SGPA Active<br/>
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAll('is_cgpa_active', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
                    Mandatory<br/>
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAll('is_mandatory', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Action</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {subjects.map((subject, index) => {
                    const subjectKey = subject.id || subject.code;
                    const cfg = configData.find(c => c.subject_id === subjectKey);
                    const isCgpaActive = cfg ? (cfg.is_cgpa_active !== false) : (subject.is_cgpa_active !== false);
                    const isMandatory = cfg ? (cfg.is_mandatory !== false) : (subject.is_mandatory !== false);

                    return (
                      <div key={subjectKey} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', background: '#ffffff', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ color: '#0f172a', fontWeight: '600' }}>{subject.code} - {subject.name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{subject.type} | Credits: {subject.credits || 3}</div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isCgpaActive}
                            onChange={(e) => handleConfigToggle(subjectKey, 'is_cgpa_active', e.target.checked)}
                          />
                          {isCgpaActive ? 'Yes' : 'No'}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isMandatory}
                            onChange={(e) => handleConfigToggle(subjectKey, 'is_mandatory', e.target.checked)}
                          />
                          {isMandatory ? 'Yes' : 'No'}
                        </label>
                        <button 
                          onClick={() => handleDeleteSubject(index)}
                          style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
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
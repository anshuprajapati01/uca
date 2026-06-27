import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { sanitizeFileName, validateAcademicFile } from '../../services/resourceService.js';
import { useHodContext } from '../../context/HodContext.jsx';
import { AGGREGATE_DEPARTMENTS } from '../../config/constants.js';
import './DirectorDashboard-v2.css';

const MATERIAL_CATEGORIES = ['Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'];

export default function UploadMaterials() {
  const { hodDepartmentsData } = useHodContext();

  const [subjects, setSubjects] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subject_id: '',
    file_url: '',
  });
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedMaterials, setUploadedMaterials] = useState([]);
  const [manageFilter, setManageFilter] = useState('All');
  const [deleteId, setDeleteId] = useState(null);

  const availableYears = useMemo(() => {
    return [...new Set(hodDepartmentsData.map((d) => d.description))].filter(Boolean).sort();
  }, [hodDepartmentsData]);

  const availableBranches = useMemo(() => {
    if (!selectedYear) return [];
    const yearFiltered = hodDepartmentsData.filter((d) => d.description === selectedYear);
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
  }, [selectedYear, hodDepartmentsData]);

  const fetchSubjects = useCallback(async () => {
    if (!selectedYear || !selectedBranch) {
      setSubjects([]);
      return;
    }
    let query = supabase.from('subjects').select('id, name, code');
    
    if (selectedYear) {
      query = query.eq('year', selectedYear);
    }
    if (selectedBranch) {
      query = query.eq('department', selectedBranch);
    }
    
    const { data, error } = await query;
    if (!error && data) {
      setSubjects(data);
    }
  }, [selectedYear, selectedBranch]);

  const fetchUploadedMaterials = async () => {
    const { data: materials, error } = await supabase.from('study_materials').select('*');
    if (!error && materials) {
      const { data: subjects } = await supabase.from('subjects').select('id, code');
      const subjectMap = Object.fromEntries((subjects || []).map(s => [s.id, s.code]));

      const { data: users } = await supabase.from('user_profiles').select('id, full_name, role');
      const userMap = Object.fromEntries((users || []).map(u => [u.id, { name: u.full_name, role: u.role }]));

      const enriched = materials.map(m => {
        let uploaderName = 'Unknown';
        if (m.uploaded_by) {
            if (userMap[m.uploaded_by]) {
                uploaderName = userMap[m.uploaded_by].name;
            } else {
                uploaderName = "Profile Missing in DB";
            }
        } else {
            uploaderName = "ID Not Saved by Faculty";
        }

        const uploaderRole = m.uploaded_by && userMap[m.uploaded_by] ? userMap[m.uploaded_by].role : 'Unknown';

        return { 
          ...m, 
          subject_code: subjectMap[m.subject_id] || 'N/A',
          uploader_name: uploaderName,
          uploader_role: uploaderRole,
          file_url: m.file_url
        };
      });
      setUploadedMaterials(enriched);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchUploadedMaterials();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let finalFileUrl = formData.file_url;

    if (file) {
      validateAcademicFile(file);
      const filePath = `documents/${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      finalFileUrl = urlData.publicUrl;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const insertPayload = {
        title: formData.title,
        type: formData.category,
        subject_id: formData.subject_id,
        file_url: finalFileUrl,
      };

      if (user) {
        insertPayload.uploaded_by = user.id;
      }

      const { error } = await supabase.from('study_materials').insert([insertPayload]);

      if (error) throw error;

      setToast({ message: 'Material uploaded successfully! 🎉', type: 'success' });
      setFormData({ title: '', category: '', subject_id: '', file_url: '' });
      setFile(null);
      fetchUploadedMaterials();
    } catch (error) {
      setToast({ message: 'Error: ' + error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }

    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleReset = () => {
    setFormData({ title: '', category: '', subject_id: '', file_url: '' });
    setFile(null);
    setSelectedYear('');
    setSelectedBranch('');
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const { error } = await supabase.from('study_materials').delete().eq('id', id);
    if (!error) {
      setUploadedMaterials(prev => prev.filter(item => item.id !== id));
      setToast({ message: 'Material deleted successfully!', type: 'success' });
    } else {
      setToast({ message: 'Error deleting material: ' + error.message, type: 'error' });
    }
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  return (
    <div className="relative min-h-screen">
      <div className="premium-glass-card p-6">
        {toast.message && (
          <div className={`custom-toast ${toast.type}`}>
            {toast.message}
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 1.5rem 0', letterSpacing: '-0.02em' }}>Upload Study Materials</h2>

        <form onSubmit={handleSubmit} className="broadcast-form-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.2rem' }}>
            <div className="broadcast-form-row">
              <label htmlFor="title" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="e.g., OS Unit 1 Notes"
                value={formData.title}
                onChange={handleChange}
                required
                className="broadcast-input w-full"
              />
            </div>

            <div className="broadcast-form-row">
              <label htmlFor="category" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="broadcast-input w-full"
              >
                <option value="">-- Select Category --</option>
                {MATERIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="broadcast-form-row">
              <label htmlFor="year" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
              <select
                id="year"
                name="year"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedBranch('');
                  setFormData(prev => ({ ...prev, subject_id: '' }));
                }}
                required
                className="broadcast-input w-full"
              >
                <option value="">-- Select Year --</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="broadcast-form-row">
              <label htmlFor="branch" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</label>
              <select
                id="branch"
                name="branch"
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setFormData(prev => ({ ...prev, subject_id: '' }));
                }}
                required
                disabled={!selectedYear}
                className="broadcast-input w-full"
              >
                <option value="">-- Select Branch --</option>
                {availableBranches.map((branch) => (
                  <option key={branch.code} value={branch.code}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="broadcast-form-row">
              <label htmlFor="subject_id" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
              <select
                id="subject_id"
                name="subject_id"
                value={formData.subject_id}
                onChange={handleChange}
                required
                disabled={!selectedYear || !selectedBranch}
                className="broadcast-input w-full"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="broadcast-form-row">
              <label htmlFor="file_url" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>File URL / Google Drive Link</label>
              <input
                type="url"
                id="file_url"
                name="file_url"
                placeholder="https://drive.google.com/... or any file URL"
                value={formData.file_url}
                onChange={handleChange}
                className="broadcast-input w-full"
              />
            </div>

            <div className="broadcast-form-row">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload Document</label>
              <div className="broadcast-upload-btn">
                <input
                  type="file"
                  id="local-file-upload"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="local-file-upload" style={{ cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                  📁 Choose File
                </label>
                {file && (
                  <span style={{ marginLeft: '12px', color: '#9ca3af', fontSize: '13px' }}>{file.name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="broadcast-form-actions">
            <button type="button" className="dept-modal__btn dept-modal__btn--cancel" onClick={handleReset}>
              Clear
            </button>
            <button type="submit" className="broadcast-send-btn" disabled={isLoading}>
              {isLoading ? 'Uploading...' : 'Upload Material'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '40px' }}>
          <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', letterSpacing: '-0.01em' }}>Manage Uploaded Materials</h3>

          <div className="pill-group" style={{ marginBottom: '20px' }}>
            {['All', 'Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'].map((f) => (
              <button
                key={f}
                className={`pill-btn ${manageFilter === f ? 'pill-btn--active' : ''}`}
                onClick={() => setManageFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="director-announcements-list">
            {(() => {
              const filtered = uploadedMaterials.filter(item => manageFilter === 'All' || item.type === manageFilter);
              if (filtered.length === 0) {
                return (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
                    No materials found.
                  </div>
                );
              }
              return filtered.map((item) => (
                <div key={item.id} className="director-announcement-card">
                  <div className="director-announcement-card__header">
                    <h4>{item.title}</h4>
                    <div className="director-announcement-card__date">
                      Code: {item.subject_code} • {item.type}
                    </div>
                  </div>
                  <div style={{ color: '#fbbf24', fontSize: '13px', margin: '6px 0 0 0', fontWeight: 'bold' }}>
                    Uploaded by: {item.uploader_name} ({item.uploader_role})
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
                    {item.file_url && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          color: '#93c5fd',
                          textDecoration: 'none',
                          borderRadius: '10px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        👁️ View
                      </a>
                    )}

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="dept-card__delete-btn"
                      style={{ width: 'auto', height: 'auto', padding: '0.5rem 1rem', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#1a1c2e', padding: '24px', borderRadius: '16px', border: '1px solid #ef4444', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Delete Material?</h3>
            <p style={{ color: '#ccc', margin: '10px 0' }}>Are you sure? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#374151', color: 'white' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#dc2626', color: 'white' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

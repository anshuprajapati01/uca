import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import './UploadMaterials.css';

const MATERIAL_CATEGORIES = ['Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'];

export default function UploadMaterials() {
  const [subjects, setSubjects] = useState([]);
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

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('id, name, code');
    if (!error && data) {
      setSubjects(data);
    }
  };

  const fetchUploadedMaterials = async () => {
    const { data: materials, error } = await supabase.from('study_materials').select('id, title, type, subject_id');
    if (!error && materials) {
      const { data: subjects } = await supabase.from('subjects').select('id, code');
      const subjectMap = Object.fromEntries((subjects || []).map(s => [s.id, s.code]));
      const enriched = materials.map(m => ({ ...m, subject_code: subjectMap[m.subject_id] || 'N/A' }));
      setUploadedMaterials(enriched);
    }
  };

  useEffect(() => {
    fetchSubjects();
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

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
      const { error } = await supabase.from('study_materials').insert([{
        title: formData.title,
        type: formData.category,
        subject_id: formData.subject_id,
        file_url: finalFileUrl,
      }]);

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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      const { error } = await supabase.from('study_materials').delete().eq('id', id);
      if (!error) {
        setUploadedMaterials(prev => prev.filter(item => item.id !== id));
        alert("Material deleted successfully!");
      } else {
        alert("Error deleting material: " + error.message);
      }
    }
  };

  return (
    <div className="upload-materials-container">
      {toast.message && (
        <div className={`custom-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <h2 className="upload-materials-title">Upload Study Materials</h2>

      <form onSubmit={handleSubmit} className="upload-materials-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., OS Unit 1 Notes"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Category --</option>
              {MATERIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject_id">Subject</label>
            <select
              id="subject_id"
              name="subject_id"
              value={formData.subject_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Subject --</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="file_url">File URL / Google Drive Link</label>
            <input
              type="url"
              id="file_url"
              name="file_url"
              placeholder="https://drive.google.com/... or any file URL"
              value={formData.file_url}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Upload Document</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="local-file-upload"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
              <label htmlFor="local-file-upload" className="file-upload-label">
                📁 Choose File
              </label>
              {file && (
                <span className="file-name-display">{file.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="reset-button" onClick={handleReset}>
            Clear
          </button>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Upload Material'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '40px' }}>
        <h3 style={{ color: '#f3f4f6', fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Manage Uploaded Materials</h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {['All', 'Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'].map((f) => (
            <button
              key={f}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
                background: manageFilter === f ? '#4f46e5' : '#374151',
                color: manageFilter === f ? '#fff' : '#9ca3af',
                transition: '0.2s'
              }}
              onClick={() => setManageFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(() => {
            const filtered = uploadedMaterials.filter(item => manageFilter === 'All' || item.type === manageFilter);
            if (filtered.length === 0) {
              return (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '30px', background: '#1f2937', borderRadius: '10px' }}>
                  No materials found.
                </div>
              );
            }
            return filtered.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1f2937',
                padding: '16px 20px',
                borderRadius: '10px',
                border: '1px solid #374151'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f3f4f6', fontWeight: '600', fontSize: '15px' }}>{item.title}</div>
                  <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>
                    Code: {item.subject_code} • {item.type}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginLeft: '16px',
                    transition: '0.2s'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

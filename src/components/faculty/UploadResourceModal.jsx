import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { supabase } from '../../lib/supabase.js';
import { uploadNewResource } from '../../services/resourceService.js';
import './UploadResourceModal.css';

export default function UploadResourceModal({ onClose, onSubmit, onSuccess, subjectId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categoryDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
        setCategorySearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('material_categories')
      .select('name')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (!error && data) {
      setCategories(data.map(c => c.name));
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: subjectId || '',
    type: '',
    uploadMethod: 'file',
    file: null,
    url: '',
  });

  useEffect(() => {
    if (categories.length > 0 && !formData.type) {
      setFormData(prev => ({ ...prev, type: categories[0] }));
    }
  }, [categories]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Debug: Check what you are sending
    console.log("Form Data before submit:", formData);

    if (!formData.title.trim() || !formData.subject_id) {
      alert('Please fill required fields.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description || '', // Yeh add kiya
        type: formData.type,
        duration: formData.duration || '00:00', // Yeh add kiya
        subject_id: formData.subject_id,
        file_url: null,
        external_url: formData.uploadMethod === 'link' ? formData.url : null,
      };
      
      const fileToUpload = formData.uploadMethod === 'file' ? formData.file : null;
      await uploadNewResource(payload, fileToUpload);
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload failed:', error); 
      alert('Upload failed. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      className="upload-modal__overlay"
      onClick={handleCancel}
    >
      <div className="upload-modal__content" onClick={(e) => e.stopPropagation()}>
        <header className="upload-modal__header">
          <h2>Upload Resource</h2>
          <button type="button" className="upload-modal__close" onClick={handleCancel} aria-label="Close modal">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="upload-modal__form">
          <FormField id="title" label="Title">
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter resource title"
            />
          </FormField>

          <FormField id="type" label="Resource Type">
            <div style={{ position: 'relative' }} ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.75rem 1rem',
                  border: '1px solid #2d314d',
                  borderRadius: '8px',
                  background: '#11131f',
                  color: formData.type ? '#f1f5f9' : '#64748b',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{formData.type || '-- Select Type --'}</span>
                <ChevronDown size={16} style={{ color: '#94a3b8' }} />
              </button>
              {isCategoryDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: '#1e1e2d',
                  border: '1px solid #2d314d',
                  borderRadius: '8px',
                  marginTop: '0.25rem',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                  maxHeight: '200px',
                  overflow: 'hidden'
                }}>
                  <input
                    type="text"
                    placeholder="Search type..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      borderBottom: '1px solid #2d314d',
                      background: '#11131f',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {categories.filter(cat => cat.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 ? (
                      <div style={{ padding: '0.75rem', color: '#cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}>No type found</div>
                    ) : (
                      categories
                        .filter(cat => cat.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                        .map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, type: cat }));
                              setIsCategoryDropdownOpen(false);
                              setCategorySearchQuery('');
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: 'none',
                              background: 'transparent',
                              color: '#e2e8f0',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.15)'; e.target.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#e2e8f0'; }}
                          >
                            {cat}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </FormField>

{formData.type === 'Lecture' && (
  <FormField id="duration" label="Duration (e.g. 45:00)">
    <input type="text" name="duration" value={formData.duration || ''} onChange={handleChange} placeholder="HH:MM:SS" />
  </FormField>
)}

          <div className="col-span-2">
            <FormField id="description" label="Description">
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the resource"
              />
            </FormField>
          </div>

          <div className="col-span-2">
            <div className="upload-modal__field">
              <span className="upload-modal__label">Upload Method</span>
              <div className="upload-modal__radios">
                <label>
                  <input
                    type="radio"
                    name="uploadMethod"
                    value="file"
                    checked={formData.uploadMethod === 'file'}
                    onChange={handleChange}
                  />
                  <span>Upload File</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="uploadMethod"
                    value="link"
                    checked={formData.uploadMethod === 'link'}
                    onChange={handleChange}
                  />
                  <span>Provide Link</span>
                </label>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            {formData.uploadMethod === 'file' ? (
              <>
                <FormField id="file" label="File">
                  <input type="file" id="file" name="file" onChange={handleChange} />
                </FormField>
                {formData.file && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', padding: '10px 16px', backgroundColor: 'rgba(31, 41, 55, 0.7)', borderRadius: '8px', border: '1px solid rgba(75, 85, 99, 0.6)' }}>
                    <span style={{ color: '#d1d5db', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formData.file.name}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, file: null }))} 
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      title="Clear file"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </>
            ) : (
              <FormField id="url" label="URL">
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://"
                />
              </FormField>
            )}
          </div>

          <div className="col-span-2">
            <div className="upload-modal__actions">
              <button type="button" className="upload-modal__cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="upload-modal__submit" disabled={isLoading}>
                {isLoading ? 'Uploading...' : 'Submit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
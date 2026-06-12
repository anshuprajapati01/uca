import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { uploadNewResource } from '../../services/resourceService.js';
import { supabase } from '../../lib/supabase.js';
import './UploadResourceModal.css';

const RESOURCE_TYPES = ['Notes', 'Lectures', 'Assignments', 'PYQs', 'Syllabus'];

export default function UploadResourceModal({ isOpen, onClose, onSubmit, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    type: 'PDF',
    uploadMethod: 'file',
    file: null,
    url: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchSubjects = async () => {
      const { data, error } = await supabase.from('subjects').select('id, name, code');
      if (data) setSubjects(data);
      if (error) console.error("Error fetching subjects:", error);
    };
    fetchSubjects();
  }, [isOpen]);

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
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        subject_id: formData.subject_id,
        type: formData.type,
        file_url: null,
        external_url: formData.uploadMethod === 'link' ? formData.url : null,
      };
      const shouldPassFile = formData.uploadMethod === 'file' ? formData.file : null;
      await uploadNewResource(payload, shouldPassFile);
      if (onSubmit) onSubmit(formData);
      if (onSuccess) onSuccess();
      onClose();
      setFormData({
        title: '',
        description: '',
        subject_id: '',
        type: 'PDF',
        uploadMethod: 'file',
        file: null,
        url: '',
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      subject_id: '',
      type: 'PDF',
      uploadMethod: 'file',
      file: null,
      url: '',
    });
    onClose();
  };

  // 👇 YAHAN HAI ASLI MAGIC JO MISSING THA (Modal hide karne ke liye) 👇
  if (!isOpen) return null;

  return (
    <div className="upload-modal__overlay" onClick={handleCancel}>
      <div className="upload-modal__content" onClick={(e) => e.stopPropagation()}>
        <header className="upload-modal__header">
          <h2>Upload Resource</h2>
          <button type="button" className="upload-modal__close" onClick={handleCancel}>
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
            />
          </FormField>

          <FormField id="description" label="Description">
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </FormField>

          <FormField id="subject" label="Subject">
            <select
              id="subject"
              name="subject_id"
              value={formData.subject_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Subject --</option>
              {subjects.map(sub => (
<option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
              ))}
            </select>
          </FormField>

          <FormField id="type" label="Resource Type">
            <select id="type" name="type" value={formData.type} onChange={handleChange}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

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
                Upload File
              </label>
              <label>
                <input
                  type="radio"
                  name="uploadMethod"
                  value="link"
                  checked={formData.uploadMethod === 'link'}
                  onChange={handleChange}
                />
                Provide Link
              </label>
            </div>
          </div>

          {formData.uploadMethod === 'file' ? (
            <FormField id="file" label="File">
              <input type="file" id="file" name="file" onChange={handleChange} />
            </FormField>
          ) : (
            <FormField id="url" label="URL">
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </FormField>
          )}

          <div className="upload-modal__actions">
            <button type="button" className="upload-modal__cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="upload-modal__submit" disabled={isLoading}>
              {isLoading ? 'Uploading...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
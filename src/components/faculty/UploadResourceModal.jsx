import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import FormField from '../common/FormField.jsx';
import { uploadNewResource } from '../../services/resourceService.js';
import './UploadResourceModal.css';

const RESOURCE_TYPES = ['Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'];

export default function UploadResourceModal({ onClose, onSubmit, onSuccess, subjectId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: subjectId || '',
    type: RESOURCE_TYPES[0],
    uploadMethod: 'file',
    file: null,
    url: '',
  });

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
    
    if (!formData.title.trim() || !formData.subject_id) {
      alert('Please fill required fields.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        title: formData.title,
        subject_id: formData.subject_id,
        type: formData.type,
        file_url: null,
        // YE LINE MISSING THI JISKI WAJAH SE LINK SAVE NAHI HO RAHA THA:
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
            <select id="type" name="type" value={formData.type} onChange={handleChange}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

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

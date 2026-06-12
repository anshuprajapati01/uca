import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { supabase } from '../../lib/supabase.js';
import './AnnouncementModal.css';

const ANNOUNCEMENT_TYPES = ['General', 'Exam', 'Holiday', 'Important'];

export default function AnnouncementModal({ isOpen, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'General',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('announcements')
        .insert([
          {
            title: formData.title,
            content: formData.content,
            type: formData.type,
          },
        ]);
      if (insertError) throw insertError;
      if (onSuccess) onSuccess();
      setFormData({ title: '', content: '', type: 'General' });
    } catch (err) {
      console.error('Failed to create announcement:', err);
      alert('Failed to create announcement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ title: '', content: '', type: 'General' });
    onClose();
  };

  return (
    <div className="upload-modal__overlay" onClick={handleCancel}>
      <div className="upload-modal__content" onClick={(e) => e.stopPropagation()}>
        <header className="upload-modal__header">
          <h2>New Announcement</h2>
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

          <FormField id="content" label="Content">
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={4}
              required
            />
          </FormField>

          <FormField id="type" label="Type">
            <select id="type" name="type" value={formData.type} onChange={handleChange}>
              {ANNOUNCEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

          <div className="upload-modal__actions">
            <button type="button" className="upload-modal__cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="upload-modal__submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="upload-modal__spinner" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

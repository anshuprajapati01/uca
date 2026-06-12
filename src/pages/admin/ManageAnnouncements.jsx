import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Trash2 } from 'lucide-react';
import './ManageAnnouncements.css';

const ANNOUNCEMENT_TYPES = ['General', 'Academic', 'Event', 'Urgent'];

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'General',
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAnnouncements() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (supabaseError) throw supabaseError;
        if (!cancelled) setAnnouncements(data || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadAnnouncements();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalFileUrl = null;

    try {
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `notices/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('notices')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('notices')
          .getPublicUrl(filePath);

        finalFileUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('announcements')
        .insert([{
          title: formData.title,
          content: formData.content,
          type: formData.type,
          file_url: finalFileUrl,
        }]);
      if (insertError) throw insertError;

      setFormData({ title: '', content: '', type: 'General' });
      setFile(null);

      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);

      setToast({ message: 'Announcement created successfully! 🎉', type: 'success' });
      setTimeout(() => setToast({ message: '', type: '' }), 3000);
    } catch (err) {
      console.error('Failed to create announcement:', err);
      setToast({ message: 'Failed to create announcement.', type: 'error' });
      setTimeout(() => setToast({ message: '', type: '' }), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        const { error: deleteError } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;

        const { data } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        setAnnouncements(data || []);

        setToast({ message: 'Announcement deleted.', type: 'success' });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
      } catch (err) {
        console.error('Delete failed:', err);
        setToast({ message: 'Failed to delete announcement.', type: 'error' });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
      }
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Academic':
        return 'announcement-badge--academic';
      case 'Event':
        return 'announcement-badge--event';
      case 'Urgent':
        return 'announcement-badge--urgent';
      default:
        return 'announcement-badge--general';
    }
  };

  if (isLoading) {
    return (
      <div className="manage-announcements">
        <p className="dashboard-resources__status">Loading announcements…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manage-announcements">
        <p className="dashboard-resources__status dashboard-resources__status--error">
          Unable to load announcements. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="manage-announcements">
      <header className="manage-announcements__header">
        <h2>Manage Announcements</h2>
      </header>

      {toast.message && (
        <div className={`custom-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="form-wrapper">
        <form className="announcement-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter announcement title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Enter announcement content"
            />
          </div>

          <div className="form-group">
            <label>Attach Official Notice (Optional)</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="notice-file-upload"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                className="file-input-hidden"
              />
              <label htmlFor="notice-file-upload" className="file-upload-label" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#374151', color: '#e5e7eb', borderRadius: '8px', border: 'none', fontSize: '14px', transition: '0.2s' }}>
                📎 Choose File
              </label>
              {file && (
                <span className="file-name-display" style={{ marginLeft: '12px', color: '#9ca3af', fontSize: '13px' }}>{file.name}</span>
              )}
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Announcement'}
          </button>
        </form>
      </div>

      {announcements.length === 0 ? (
        <p className="dashboard-resources__status">
          No announcements yet. Create one above.
        </p>
      ) : (
        <div className="announcements-grid">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-card__body">
                <div className="announcement-card__row">
                  <h3 className="announcement-card__title">{announcement.title}</h3>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDelete(announcement.id)}
                    aria-label="Delete announcement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="announcement-card__content">{announcement.content}</p>
                <div className="announcement-card__meta">
                  <span className={`announcement-badge ${getTypeBadgeClass(announcement.type)}`}>
                    {announcement.type}
                  </span>
                  <time className="announcement-card__date">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </time>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
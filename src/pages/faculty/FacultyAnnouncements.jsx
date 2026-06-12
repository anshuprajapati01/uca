import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Plus, Trash2 } from 'lucide-react';
import AnnouncementModal from '../../components/faculty/AnnouncementModal.jsx';
import './FacultyAnnouncements.css';

const ANNOUNCEMENT_TYPES = ['General', 'Exam', 'Holiday', 'Important'];

export default function FacultyAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    load();
    return () => { cancelled = true; };
  }, []);

  const handleAddAnnouncement = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    const loadAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);
    };
    loadAnnouncements();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        const { error: deleteError } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
        handleModalSuccess();
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete announcement. Please try again.');
      }
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Exam':
        return 'announcement-badge--exam';
      case 'Holiday':
        return 'announcement-badge--holiday';
      case 'Important':
        return 'announcement-badge--important';
      default:
        return 'announcement-badge--general';
    }
  };

  if (isLoading) {
    return <p className="dashboard-resources__status">Loading announcements…</p>;
  }

  if (error) {
    return (
      <p className="dashboard-resources__status dashboard-resources__status--error">
        Unable to load announcements. Please try again later.
      </p>
    );
  }

  return (
    <>
      <header className="faculty-announcements__header">
        <h2>Manage Announcements</h2>
        <button
          type="button"
          className="faculty-resources__add-btn"
          onClick={handleAddAnnouncement}
        >
          <Plus size={18} />
          New Announcement
        </button>
      </header>

      {announcements.length === 0 ? (
        <p className="dashboard-resources__status">
          No announcements yet. Click "New Announcement" to create one.
        </p>
      ) : (
        <div className="faculty-announcements__grid">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-card__body">
                <div className="announcement-card__row">
                  <h3 className="announcement-card__title">{announcement.title}</h3>
                  <button
                    type="button"
                    className="faculty-resources__delete-btn"
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

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

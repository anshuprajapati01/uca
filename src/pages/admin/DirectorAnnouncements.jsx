import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Megaphone, Trash2, Send, ShieldAlert, Image as ImageIcon, FileText } from 'lucide-react';
import './DirectorAnnouncements.css';

const MAIN_AUDIENCES = ['Global', 'HODs Only', 'Faculty Only'];
const YEAR_OPTIONS = ['ALL', '1st Yr', '2nd Yr', '3rd Yr', '4th Yr'];
const PRIORITY_OPTIONS = ['Normal', 'Important', 'URGENT'];

export default function DirectorAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState('Global');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('Normal');
  const [attachmentType, setAttachmentType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    let cancelled = false;
    loadAnnouncements();
    return () => { cancelled = true; };

    async function loadAnnouncements() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error: supabaseError } = await supabase
          .from('announcements')
          .select('*')
          .eq('posted_by', user?.id)
          .order('created_at', { ascending: false });
        if (supabaseError) throw supabaseError;
        if (!cancelled) setAnnouncements(data || []);
      } catch (err) {
        if (!cancelled) setError(err);
        console.error('Failed to load announcements:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let targetAudience = selectedAudience;
    if (selectedAudience === 'HODs Only' && selectedYear) {
      targetAudience = `${selectedYear} Year HODs`;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from('announcements')
        .insert([{
          title: formData.title,
          content: formData.content,
          priority: selectedPriority,
          target_audience: targetAudience,
          posted_by: user?.id,
          attachment_type: attachmentType,
        }]);
      if (insertError) throw insertError;

      setFormData({ title: '', content: '' });
      setSelectedPriority('Normal');
      setAttachmentType(null);
      setSelectedFile(null);

      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('posted_by', user?.id)
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to create announcement:', err);
      alert('Failed to create announcement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to retract this broadcast?')) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: deleteError } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id)
          .eq('posted_by', user?.id);
        if (deleteError) throw deleteError;

        const { data } = await supabase
          .from('announcements')
          .select('*')
          .eq('posted_by', user?.id)
          .order('created_at', { ascending: false });
        setAnnouncements(data || []);
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to retract broadcast.');
      }
    }
  };

  const handleFileChange = (file) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setAttachmentType('image');
    } else if (file.type === 'application/pdf') {
      setAttachmentType('pdf');
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'broadcast-history-badge--urgent';
      case 'Important':
        return 'broadcast-history-badge--important';
      default:
        return 'broadcast-history-badge--normal';
    }
  };

  const getPriorityGlowClass = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'priority-glow--urgent';
      case 'Important':
        return 'priority-glow--important';
      default:
        return 'priority-glow--normal';
    }
  };

  return (
    <div className="broadcast-command-center">
      <header className="broadcast-command-center__header">
        <div className="broadcast-command-center__header-content">
          <Megaphone size={32} className="broadcast-command-center__icon" />
          <h1 className="broadcast-command-center__title">Broadcast Command Center</h1>
        </div>
        <p className="broadcast-command-center__subtitle">Send targeted announcements to your college community</p>
      </header>

      <section className="broadcast-command-center__section">
        <form className={`broadcast-form ${selectedPriority === 'URGENT' ? 'broadcast-form--urgent' : ''}`} onSubmit={handleSubmit}>
          <div className="target-selection-row">
            <div className="target-segmented-control">
              {MAIN_AUDIENCES.map((audience) => (
                <button
                  key={audience}
                  type="button"
                  className={`target-segment ${selectedAudience === audience ? 'target-segment--active' : ''}`}
                  onClick={() => setSelectedAudience(audience)}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>

          {selectedAudience === 'HODs Only' && (
            <div className="year-pills-row">
              {YEAR_OPTIONS.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`year-pill ${selectedYear === year ? 'year-pill--active' : ''}`}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          <div className="compose-row">
            <div className="compose-main">
              <input
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Announcement title..."
                className="broadcast-title-input"
              />
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                placeholder="Compose your announcement..."
                className="broadcast-textarea"
              />
            </div>
            <div className="attachment-zone">
              <button
                type="button"
                className={`attachment-btn ${attachmentType === 'pdf' ? 'attachment-btn--active' : ''}`}
                onClick={() => document.getElementById('broadcast-file').click()}
              >
                <FileText size={20} />
                <span>PDF</span>
              </button>
              <button
                type="button"
                className={`attachment-btn ${attachmentType === 'image' ? 'attachment-btn--active' : ''}`}
                onClick={() => document.getElementById('broadcast-file').click()}
              >
                <ImageIcon size={20} />
                <span>Image</span>
              </button>
              <input
                type="file"
                id="broadcast-file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileChange(file);
                }}
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                className="file-input-hidden"
              />
              {selectedFile && (
                <span className="attachment-name">{selectedFile.name}</span>
              )}
            </div>
          </div>

          <div className="action-row">
            <div className="priority-pills">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className={`priority-pill ${selectedPriority === priority ? `priority-pill--active ${getPriorityGlowClass(priority)}` : ''}`}
                  onClick={() => setSelectedPriority(priority)}
                >
                  {priority}
                </button>
              ))}
            </div>
            <button type="submit" className="broadcast-submit-btn" disabled={isSubmitting}>
              <Send size={16} />
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </section>

      <section className="broadcast-command-center__section">
        <div className="broadcast-command-center__section-header">
          <ShieldAlert size={20} />
          <h2>Broadcast Feed</h2>
        </div>

        {isLoading ? (
          <p className="broadcast-command-center__status">Loading...</p>
        ) : error ? (
          <p className="broadcast-command-center__status broadcast-command-center__status--error">
            Unable to load broadcasts.
          </p>
        ) : announcements.length === 0 ? (
          <p className="broadcast-command-center__status">No broadcasts yet. Create one above.</p>
        ) : (
          <div className="broadcast-history-grid">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="broadcast-history-card">
                <div className="broadcast-history-card__header">
                  <h3 className="broadcast-history-card__title">{announcement.title}</h3>
                  <button
                    type="button"
                    className="broadcast-history-delete-btn"
                    onClick={() => handleDelete(announcement.id)}
                    aria-label="Retract"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="broadcast-history-card__message">{announcement.content}</p>
                <div className="broadcast-history-card__footer">
                  <span className="broadcast-history-card__target">Target: {announcement.target_audience}</span>
                  <span className={`broadcast-history-badge ${getPriorityBadgeClass(announcement.priority)}`}>
                    <span className="priority-dot"></span>
                    {announcement.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
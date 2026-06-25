import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { Send, Paperclip, X, ExternalLink, Trash2, Plus } from 'lucide-react';

export default function AnnouncementsTab({ subjectId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const [linkInput, setLinkInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      toast.error('Could not load announcements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [subjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return toast.error('Please enter an announcement message');

    setIsPosting(true);
    try {
      let fileUrl = null;

      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from('resources').getPublicUrl(fileName);
        fileUrl = publicData.publicUrl;
      } else if (linkInput.trim()) {
        fileUrl = linkInput.trim();
      }

      const { error } = await supabase
        .from('announcements')
        .insert([
          {
            subject_id: subjectId,
            title: 'Class Announcement',
            content: content.trim(),
            type: 'Class',
            file_url: fileUrl,
          },
        ]);

      if (error) throw error;

      toast.success('Announcement posted successfully!');
      setContent('');
      setLinkInput('');
      setSelectedFile(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Post failed:', err);
      toast.error('Failed to post announcement.');
    } finally {
      setIsPosting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', deleteModal.id);

      if (error) throw error;

      toast.success('Announcement deleted.');
      fetchAnnouncements();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Could not delete announcement.');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
        Loading announcements…
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* COMPOSER CARD */}
      <div style={{ backgroundColor: '#1c1d2e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <form onSubmit={handleSubmit}>
          <textarea
            rows="4"
            placeholder="Write your announcement here... (e.g., Bring your tutorial copy tomorrow)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#11131f',
              border: '1px solid #2d314d',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '0',
              resize: 'none',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '12px' }}>
            <input
              type="text"
              placeholder="🔗 Optional: Paste a link here..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: '#11131f',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            {selectedFile ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2d314d',
                  padding: '8px 14px',
                  borderRadius: '24px',
                  fontSize: '0.85rem',
                  color: '#e5e7eb',
                  fontWeight: 500,
                }}
              >
                <Paperclip size={14} />
                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2d314d',
                  color: '#e5e7eb',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <Paperclip size={16} /> Attach File
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={isPosting}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                cursor: isPosting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isPosting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.875rem',
              }}
            >
              <Send size={16} /> {isPosting ? 'Posting…' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>

      {/* FEED */}
      {announcements.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#151623', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Plus size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No announcements yet. Post the first one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {announcements.map((ann) => (
            <div
              key={ann.id}
              style={{
                backgroundColor: '#1c1d2e',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {ann.type || 'Class'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{formatDate(ann.created_at)}</span>
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, id: ann.id })}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                    title="Delete announcement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p style={{ color: '#e5e7eb', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                {ann.content}
              </p>
              {ann.file_url && (
                <a
                  href={ann.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}
                >
                  <ExternalLink size={14} /> View Attachment
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    {/* 🛑 DELETE CONFIRMATION MODAL */}
    {/* 🛑 DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          
          {/* Modal Card */}
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>Delete Announcement?</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 24px 0', lineHeight: '1.5' }}>Are you sure you want to delete this announcement? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                onClick={() => setDeleteModal({ isOpen: false, id: null })}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b4063'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d314d'}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: 'white', backgroundColor: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                Delete
              </button>
            </div>
          </div>
          
        </div>
      )}
  </>
  );
}

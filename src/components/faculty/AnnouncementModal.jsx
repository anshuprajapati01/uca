import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnnouncementModal({ isOpen, onClose, subjectId }) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return toast.error('Please enter a message');
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{ subject_id: subjectId, message: message.trim() }]);
      if (error) throw error;
      toast.success('Announcement sent successfully!');
      setMessage('');
      onClose();
    } catch (err) {
      console.error('Announcement failed:', err);
      toast.error('Failed to send announcement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'white', fontSize: '1.25rem', margin: 0, fontWeight: 'bold' }}>Make an Announcement</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea 
            rows="4" 
            placeholder="Write your announcement here... (e.g., Bring your tutorial copy tomorrow)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px', resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            <button type="submit" disabled={isLoading} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Send Announcement</button>
          </div>
        </form>
      </div>
    </div>
  );
}

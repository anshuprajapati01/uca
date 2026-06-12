import { useState, useEffect } from 'react';
import { CheckCircle, Bookmark } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import './ResourceCard.css';

/**
 * @param {{
 *   id: string,
 *   title: string,
 *   description: string | null,
 *   type: string,
 *   file_url: string | null,
 *   external_url: string | null,
 *   subjectName: string | null
 * }} props
 */
export default function ResourceCard({ id, title, description, type, file_url, external_url, subjectName }) {
  const [isAccessed, setIsAccessed] = useState(() => {
    try {
      return localStorage.getItem(`accessed_${id}`) === 'true';
    } catch {
      return false;
    }
  });

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!currentUser) return;
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('resource_id', id)
        .maybeSingle();
      setIsBookmarked(!!data);
    };
    checkBookmark();
  }, [currentUser, id]);

  const href = file_url || external_url;

  const handleOpenResource = () => {
    if (!href) return;
    localStorage.setItem(`accessed_${id}`, 'true');
    setIsAccessed(true);
    window.open(href, '_blank');
  };

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert('Please log in to bookmark resources.');
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('resource_id', id);
        setIsBookmarked(false);
      } else {
        await supabase
          .from('bookmarks')
          .insert([{ user_id: currentUser.id, resource_id: id }]);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Bookmark operation failed:', error);
      alert('Failed to update bookmark. Please try again.');
    }
  };

  return (
    <article className="resource-card">
      <div className="resource-card__header">
        <h3 className="resource-card__title">
          {title}
          {isAccessed && <CheckCircle color="#22c55e" size={24} style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'middle' }} />}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isBookmarked ? (
              <Bookmark fill="#eab308" color="#eab308" size={24} />
            ) : (
              <Bookmark color="gray" size={24} />
            )}
          </button>
          <span className="resource-card__badge">{type}</span>
          {subjectName && (
            <span className="resource-card__subject-badge" style={{ marginLeft: '8px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px' }}>{subjectName}</span>
          )}
        </div>
      </div>
      {description && <p className="resource-card__description">{description}</p>}
      {href && (
        <button
          onClick={handleOpenResource}
          className="resource-card__button"
        >
          Open Resource
        </button>
      )}
    </article>
  );
}

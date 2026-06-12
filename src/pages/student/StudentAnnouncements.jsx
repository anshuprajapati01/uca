import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import './StudentAnnouncements.css';

/**
 * @param {{ title: string, content: string | null, type: string | null, created_at: string }} announcement
 */
function AnnouncementCard({ title, content, type, created_at }) {
  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const badgeClass = type
    ? `announcement-card__badge announcement-card__badge--${type.toLowerCase()}`
    : '';

  return (
    <article className="announcement-card">
      <div className="announcement-card__header">
        <h3 className="announcement-card__title">{title}</h3>
        {type && <span className={badgeClass}>{type}</span>}
      </div>
      <p className="announcement-card__date">{formattedDate}</p>
      {content && <p className="announcement-card__content">{content}</p>}
    </article>
  );
}

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

        if (!cancelled) {
          setAnnouncements(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[StudentAnnouncements] Load error:', err);
          setError(err);
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

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

  if (announcements.length === 0) {
    return <p className="dashboard-resources__status">No announcements yet.</p>;
  }

  return (
    <div className="student-announcements">
      <div className="student-announcements__header">
        <h2>Notice Board</h2>
      </div>
      <div className="student-announcements__list">
        {announcements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            title={announcement.title}
            content={announcement.content}
            type={announcement.type}
            created_at={announcement.created_at}
          />
        ))}
      </div>
    </div>
  );
}
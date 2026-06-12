import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import ResourceCard from '../../components/common/ResourceCard.jsx';
import './StudentBookmarks.css';

export default function StudentBookmarks() {
  const [bookmarkedResources, setBookmarkedResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data, error: supabaseError } = await supabase
          .from('bookmarks')
          .select('id, resource_id, resources(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;

        if (!cancelled) {
          const resources = (data || [])
            .map((item) => item.resources)
            .filter(Boolean);
          setBookmarkedResources(resources);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[StudentBookmarks] Load error:', err);
          setError(err);
          setBookmarkedResources([]);
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

  const handleRemoveBookmark = async (resourceId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('resource_id', resourceId);

      if (error) throw error;

      setBookmarkedResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      alert('Failed to remove bookmark. Please try again.');
    }
  };

  if (isLoading) {
    return <p className="dashboard-resources__status">Loading bookmarks…</p>;
  }

  if (error) {
    return (
      <p className="dashboard-resources__status dashboard-resources__status--error">
        Unable to load bookmarks. Please try again later.
      </p>
    );
  }

  if (bookmarkedResources.length === 0) {
    return (
      <p className="dashboard-resources__status">You haven't bookmarked any resources yet.</p>
    );
  }

  return (
    <div className="student-bookmarks">
      <header className="student-bookmarks__header">
        <h2>My Bookmarks</h2>
        <span className="student-bookmarks__count">{bookmarkedResources.length} saved</span>
      </header>
      <div className="dashboard-resources__grid">
        {bookmarkedResources.map((resource) => (
          <div key={resource.id} className="bookmark-card">
            <ResourceCard
              id={resource.id}
              title={resource.title}
              description={resource.description}
              type={resource.type}
              file_url={resource.file_url}
              external_url={resource.external_url}
            />
            <button
              type="button"
              className="bookmark-card__remove"
              onClick={() => handleRemoveBookmark(resource.id)}
            >
              Remove Bookmark
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

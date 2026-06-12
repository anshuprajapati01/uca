import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import ResourceCard from '../../components/common/ResourceCard.jsx';
import './StudentResources.css';

const FILTERS = ['Notes', 'PYQs', 'Assignments', 'Syllabus'];

export default function StudentResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Notes');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*, subjects(name, code)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setResources(data || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredResources = useMemo(() => {
    return resources
      .filter((r) => {
        if (activeFilter === 'Notes') {
          return r.type === 'Notes' || r.type === 'PDF' || r.type === 'Note';
        }
        return r.type === activeFilter;
      })
      .filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.subjects?.name && r.subjects.name.toLowerCase().includes(q))
        );
      });
  }, [resources, activeFilter, searchQuery]);

  if (loading) {
    return <p className="dashboard-resources__status">Loading resources…</p>;
  }

  if (error) {
    return (
      <p className="dashboard-resources__status dashboard-resources__status--error">
        Unable to load resources. Please try again later.
      </p>
    );
  }

  return (
    <div className="student-resources">
      <header className="student-resources__header">
        <h2>Global Smart Library</h2>
      </header>

      <div className="student-resources__search">
        <Search size={20} className="student-resources__search-icon" />
        <input
          type="text"
          placeholder="Search resources by title, description, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="student-resources__search-input"
        />
      </div>

      <div className="student-resources__filters">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`student-resources__filter-btn ${activeFilter === filter ? 'student-resources__filter-btn--active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <section className="student-resources__content">
        {filteredResources.length === 0 ? (
          <p className="dashboard-resources__status">No resources found for this filter.</p>
        ) : (
          <div className="dashboard-resources__grid">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                id={resource.id}
                title={resource.title}
                description={resource.description}
                type={resource.type}
                file_url={resource.file_url}
                external_url={resource.external_url}
                subjectName={resource.subjects?.name}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
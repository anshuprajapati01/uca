import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { Play, FileText, ChevronLeft } from 'lucide-react';
import './SubjectDetail.css';

const TABS = [
  { key: 'All', label: 'All', filter: () => true },
  { key: 'Lectures', label: 'Lectures', filter: (r) => r.type === 'Video' },
  { key: 'Notes', label: 'Notes', filter: (r) => ['PDF', 'Note'].includes(r.type) },
  { key: 'Assignments', label: 'Assignments', filter: (r) => r.type === 'Assignment' },
  { key: 'PYQs', label: 'PYQs', filter: (r) => r.type === 'PYQs' },
  { key: 'Syllabus', label: 'Syllabus', filter: (r) => r.type === 'Syllabus' },
];

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [{ data: subjectData, error: subjectError }, { data: resourceData, error: resourceError }] =
          await Promise.all([
            supabase.from('subjects').select('id, name, code').eq('id', subjectId).single(),
            supabase.from('resources').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false }),
          ]);

        if (subjectError) throw subjectError;
        if (resourceError) throw resourceError;

        if (!cancelled) {
          setSubject(subjectData);
          setResources(resourceData || []);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [subjectId]);

  const activeFilter = TABS.find((tab) => tab.key === activeTab);
  const filtered = activeFilter ? resources.filter(activeFilter.filter) : resources;

  const getResourceIcon = (type) => {
    if (type === 'Video') return <Play size={16} />;
    return <FileText size={16} />;
  };

  if (loading) {
    return <p className="subject-detail__status">Loading subject details…</p>;
  }

  if (error || !subject) {
    return (
      <p className="subject-detail__status subject-detail__status--error">
        Unable to load subject. Please try again later.
      </p>
    );
  }

  return (
    <div className="subject-detail">
      <header className="subject-detail__header">
        <Link to="/student/subjects" className="subject-detail__back">
          <ChevronLeft size={20} />
          Back to Subjects
        </Link>
        <h1 className="subject-detail__title">{subject.name}</h1>
        <span className="subject-detail__code">{subject.code}</span>
      </header>

      <nav className="subject-detail__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`subject-detail__tab ${activeTab === tab.key ? 'subject-detail__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="subject-detail__content">
        {filtered.length === 0 ? (
          <p className="subject-detail__empty">No resources found for this tab.</p>
        ) : (
          <div className="subject-detail__grid">
            {filtered.map((resource) => (
              <div key={resource.id} className="resource-card">
                <div className="resource-card__icon">{getResourceIcon(resource.type)}</div>
                <div className="resource-card__body">
                  <h3 className="resource-card__title">{resource.title}</h3>
                  <span className="resource-card__type">{resource.type}</span>
                </div>
                <div className="resource-card__action">
                  {resource.file_url ? (
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="resource-card__link">
                      View / Download
                    </a>
                  ) : resource.external_url ? (
                    <a href={resource.external_url} target="_blank" rel="noopener noreferrer" className="resource-card__link">
                      View / Download
                    </a>
                  ) : (
                    <span className="resource-card__link resource-card__link--disabled">Unavailable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

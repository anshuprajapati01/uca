import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { ChevronLeft, Link as LinkIcon, FileText, Bookmark } from 'lucide-react';

export default function StudentSubjectWorkspace({ subject, onBack, bookmarkedIds = [], toggleBookmark }) {
  const [materials, setMaterials] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('material_categories')
      .select('name')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (!error && data) {
      setCategories(['All', ...data.map(c => c.name)]);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    let cancelled = false;

    async function loadMaterials() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('subject_id', subject.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (error) console.error('Failed to fetch study materials:', error);
        setMaterials(data || []);
        setIsLoading(false);
      }
    }

    loadMaterials();
    return () => { cancelled = true; };
  }, [subject.id]);

  const filteredMaterials = activeFilter === 'All'
    ? materials
    : materials.filter((m) => {
        const type = (m.type || m.category || '').toLowerCase();
        return type === activeFilter.toLowerCase() || type.includes(activeFilter.toLowerCase());
      });

  const getCategoryPillClass = (cat) => {
    const base = 'workspace-pill';
    if (activeFilter === cat) return `${base} ${base}--active`;
    return base;
  };

  return (
    <div className="student-workspace">
      <div className="student-workspace__header">
        <button type="button" className="student-workspace-back-btn" onClick={onBack}>
          <ChevronLeft size={18} />
          <span>Back to Subjects</span>
        </button>
        <div className="student-workspace__title-block">
          <h2 className="student-workspace__title">{subject.name || subject.subject_name || 'Subject'}</h2>
          <span className="student-workspace__code">{subject.code || subject.subject_code || ''}</span>
        </div>
      </div>

      <div className="student-workspace__filter-row">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={getCategoryPillClass(cat)}
            onClick={() => setActiveFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="student-workspace__list">
        {isLoading ? (
          <div className="student-workspace__empty">
            <p>Loading materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="student-workspace__empty">
            <FileText size={40} color="#6366f1" />
            <p>No materials found for this filter.</p>
          </div>
        ) : (
          filteredMaterials.map((mat) => (
            <div key={mat.id} className="student-workspace__row">
              <div className="student-workspace__row-icon">
                {mat.file_url ? <FileText size={20} /> : <LinkIcon size={20} />}
              </div>
              <div className="student-workspace__row-content">
                <span className="student-workspace__row-title">{mat.title || mat.name || 'Untitled Material'}</span>
                <span className="student-workspace__row-type">{(mat.type || mat.category || 'MATERIAL').toUpperCase()}</span>
              </div>
              <div className="student-workspace__row-actions">
                {mat.file_url && (
                  <a
                    href={mat.file_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="student-workspace__view-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  className={`student-workspace__bookmark-btn ${bookmarkedIds.includes(mat.id) ? 'student-workspace__bookmark-btn--active' : ''}`}
                  onClick={() => toggleBookmark && toggleBookmark(mat.id)}
                >
                  <Bookmark size={18} fill={bookmarkedIds.includes(mat.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
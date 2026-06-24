import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Plus, Trash2 } from 'lucide-react';
import UploadResourceModal from '../../components/faculty/UploadResourceModal.jsx';
import { deleteResource } from '../../services/resourceService.js';
import './FacultyResources.css';

const FILTERS = ['All', 'Notes', 'Lectures', 'Assignments', 'PYQs', 'Syllabus'];

export default function FacultyResources() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('study_materials')
          .select('*')
          .order('created_at', { ascending: false });
        if (supabaseError) throw supabaseError;
        if (!cancelled) setResources(data || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredResources = resources.filter((r) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Notes') return r.type === 'Notes' || r.type === 'PDF' || r.type === 'Note';
    if (activeFilter === 'Lectures') return r.type === 'Lectures' || r.type === 'Video';
    if (activeFilter === 'Assignments') return r.type === 'Assignments' || r.type === 'Assignment';
    return r.type === activeFilter;
  });

  const handleAddResource = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSubmit = (formData) => {
    console.log('Form submitted:', formData);
  };

  const handleModalSuccess = () => {
    const loadResources = async () => {
      const { data } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false });
      setResources(data || []);
    };
    loadResources();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        await deleteResource(id);
        handleModalSuccess();
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete resource. Please try again.');
      }
    }
  };

  if (isLoading) {
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
    <>
      <header className="faculty-resources__header">
        <h2>Manage Resources</h2>
        <button type="button" className="faculty-resources__add-btn" onClick={handleAddResource}>
          <Plus size={18} />
          Add Resource
        </button>
      </header>

      <nav className="faculty-resources__tabs">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`faculty-resources__tab ${activeFilter === filter ? 'faculty-resources__tab--active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </nav>

      {filteredResources.length === 0 ? (
        <p className="dashboard-resources__status">No resources found for this filter. Click "Add Resource" to upload.</p>
      ) : (
        <table className="faculty-resources__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((resource) => (
              <tr key={resource.id}>
                <td>{resource.title}</td>
                <td>{resource.type}</td>
                <td>{new Date(resource.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    className="faculty-resources__delete-btn"
                    onClick={() => handleDelete(resource.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <UploadResourceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
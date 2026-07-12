import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { Trash2, ArrowLeft, Eye, FileText, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import UploadResourceModal from '../../components/faculty/UploadResourceModal.jsx';
import AnnouncementsTab from '../../components/faculty/AnnouncementsTab.jsx';
import TakeAttendance from '../../components/faculty/TakeAttendance.jsx';
import { deleteResource } from '../../services/resourceService.js';
import './SubjectWorkspace.css';

export default function SubjectWorkspace() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, resourceId: null });
  const [mainTab, setMainTab] = useState(location.state?.openAttendance ? 'Attendance' : 'Resources');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('id, name, code, year, semester, department, credits')
          .eq('id', subjectId)
          .single();

        if (subjectError) throw subjectError;
        if (!cancelled) setSubject(subjectData);

        const { data: resourcesData, error: resourcesError } = await supabase
          .from('study_materials')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false });

        if (resourcesError) throw resourcesError;
        if (!cancelled) setResources(resourcesData || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [subjectId]);

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

  const filteredResources = resources.filter((r) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Notes') return r.type === 'Notes' || r.type === 'PDF' || r.type === 'Note';
    if (activeFilter === 'Lectures') return r.type === 'Lectures' || r.type === 'Video';
    if (activeFilter === 'Assignments') return r.type === 'Assignments' || r.type === 'Assignment';
    return r.type === activeFilter;
  });

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    const loadResources = async () => {
      const { data } = await supabase
        .from('study_materials')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
      setResources(data || []);
    };
    loadResources();
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, resourceId: id });
  };

  const confirmDelete = async () => {
    try {
      await deleteResource(deleteModal.resourceId);
      handleModalSuccess();
      toast.success('Resource deleted successfully!');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete resource. Please try again.');
    } finally {
      setDeleteModal({ isOpen: false, resourceId: null });
    }
  };

  if (isLoading) {
    return <p className="subject-workspace__status">Loading workspace…</p>;
  }

  if (error || !subject) {
    return (
      <div className="subject-workspace">
        <div className="w-full text-left mb-6">
          <button type="button" className="subject-workspace__back" onClick={() => navigate('/faculty/subjects')}>
            <ArrowLeft size={18} /> Back to Subjects
          </button>
        </div>
        <div className="subject-workspace__error">
          <h2>Subject not found</h2>
          <p>The requested subject could not be loaded. It may have been removed or you do not have access.</p>
        </div>
      </div>
    );
  }

  const yearLabel = typeof subject.year === 'number' ? `Year ${subject.year}` : subject.year;
  const headerTitle = `${subject.name} (${subject.code})`;
  const headerSubtitle = `${yearLabel} • ${subject.department}`;

  return (
    <div className="w-full relative"> 
      
      <div className="subject-workspace text-left flex flex-col items-start w-full">
        
        <div className="subject-workspace__top-bar">
          <button onClick={() => navigate('/faculty/subjects')} className="subject-workspace__back">
            <ArrowLeft size={18} /> Back to Subjects
          </button>
        </div>

        <div className="w-full subject-workspace__header">
          <div className="text-left">
            <h1 className="subject-workspace__title">{headerTitle}</h1>
            <p className="subject-workspace__subtitle">{headerSubtitle}</p>
          </div>
          <div className="subject-workspace__badge">LIVE</div>
        </div>

        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', paddingBottom: '16px', marginTop: '24px', width: '100%' }}>
          <button
            onClick={() => setMainTab('Resources')}
            style={{
              background: 'transparent',
              border: 'none',
              color: mainTab === 'Resources' ? '#818cf8' : '#9ca3af',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: 'pointer',
              paddingBottom: '8px',
              borderBottom: mainTab === 'Resources' ? '2px solid #818cf8' : '2px solid transparent'
            }}
          >
            Manage Resources
          </button>
          <button
            onClick={() => setMainTab('Announcements')}
            style={{
              background: 'transparent',
              border: 'none',
              color: mainTab === 'Announcements' ? '#818cf8' : '#9ca3af',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: 'pointer',
              paddingBottom: '8px',
              borderBottom: mainTab === 'Announcements' ? '2px solid #818cf8' : '2px solid transparent'
            }}
          >
            Announcements
          </button>
          <button
            onClick={() => setMainTab('Attendance')}
            style={{
              background: 'transparent',
              border: 'none',
              color: mainTab === 'Attendance' ? '#818cf8' : '#9ca3af',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: 'pointer',
              paddingBottom: '8px',
              borderBottom: mainTab === 'Attendance' ? '2px solid #818cf8' : '2px solid transparent'
            }}
          >
            Attendance
          </button>
        </div>

        {mainTab === 'Resources' && (
          <div className="resources-section w-full">
            
            <div className="subject-workspace__section-header relative z-50">
              <h2 className="subject-workspace__section-title">Manage Resources</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="subject-workspace__add-btn relative z-50 cursor-pointer"
                >
                  + Add Resource
                </button>
              </div>
            </div>

            <div className="subject-workspace__tabs-container hide-scrollbar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
              {categories.map(filterName => (
                <button 
                  key={filterName} onClick={() => setActiveFilter(filterName)}
                  className={`subject-workspace__tab ${activeFilter === filterName ? 'subject-workspace__tab--active' : ''}`}
                  style={{ flexShrink: 0 }}
                >
                  {filterName}
                </button>
              ))}
            </div>

            {filteredResources.length === 0 ? (
              <div className="subject-workspace__empty w-full">
                <p>No resources uploaded yet. Click <strong>+ Add Resource</strong> to begin.</p>
              </div>
            ) : (
              <div className="subject-workspace__cards w-full mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredResources.map(resource => (
                  <div key={resource.id} className="subject-resource-card" style={{
                    background: '#1e1e2d',
                    border: '1px solid #2d2d3f',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(129, 140, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {resource.file_url ? <FileText size={20} color="#818cf8" /> : <LinkIcon size={20} color="#818cf8" />}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.95rem' }}>{resource.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(resource.created_at).toLocaleDateString()}</span>
                        <span style={{
                          background: 'rgba(129, 140, 248, 0.15)',
                          color: '#a5b4fc',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>{resource.type}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(resource.external_url || resource.file_url) && (
                        <a
                          href={resource.external_url || resource.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '9999px',
                            background: '#3b82f6',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#60a5fa'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                          <Eye size={14} />
                          View
                        </a>
                      )}

                      <button
                        onClick={() => handleDelete(resource.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '9999px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab === 'Announcements' && <AnnouncementsTab subjectId={subjectId} />}

        {mainTab === 'Attendance' && <TakeAttendance subjectId={subjectId} subjectDetails={subject} initialSection={location.state?.sectionContext} />}
        
      </div>

      {isModalOpen && (
        <UploadResourceModal 
          subjectId={subjectId} 
          onClose={handleModalClose} 
          onSuccess={handleModalSuccess} 
        />
      )}

      {deleteModal.isOpen && (
        <div 
          className="delete-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999999
          }}
        >
          <div 
            className="delete-card"
            style={{
              backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>
              Delete Resource?
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Are you sure you want to delete this material? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                onClick={() => setDeleteModal({ isOpen: false, resourceId: null })}
                style={{
                  padding: '10px 20px', borderRadius: '8px', fontWeight: '600',
                  color: '#d1d5db', backgroundColor: '#2d314d', border: 'none',
                  cursor: 'pointer', transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b4063'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d314d'}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px', borderRadius: '8px', fontWeight: '600',
                  color: 'white', backgroundColor: '#ef4444', border: 'none',
                  cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
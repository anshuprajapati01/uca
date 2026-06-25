import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { Trash2, ArrowLeft, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import UploadResourceModal from '../../components/faculty/UploadResourceModal.jsx';
import AnnouncementsTab from '../../components/faculty/AnnouncementsTab.jsx';
import { deleteResource } from '../../services/resourceService.js';
import './SubjectWorkspace.css'; 

const FILTERS = ['All', 'Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'];

export default function SubjectWorkspace() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, resourceId: null });
  const [mainTab, setMainTab] = useState('Resources');

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
      
      {/* MAIN PREMIUM CONTAINER */}
      <div className="subject-workspace text-left flex flex-col items-start w-full">
        
        {/* TOP BAR */}
        <div className="subject-workspace__top-bar">
          <button onClick={() => navigate('/faculty/subjects')} className="subject-workspace__back">
            <ArrowLeft size={18} /> Back to Subjects
          </button>
        </div>

        {/* HERO CARD */}
        <div className="w-full subject-workspace__header">
          <div className="text-left">
            <h1 className="subject-workspace__title">{headerTitle}</h1>
            <p className="subject-workspace__subtitle">{headerSubtitle}</p>
          </div>
          <div className="subject-workspace__badge">LIVE</div>
        </div>

        {/* MAIN TABS */}
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
        </div>

        {/* RESOURCES CONTENT */}
        {mainTab === 'Resources' && (
          <div className="resources-section w-full">
            
            {/* Header & Add Button (Forced right side) */}
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

            {/* Filter Tabs */}
            <div className="subject-workspace__tabs-container hide-scrollbar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
              {FILTERS.map(tab => (
                <button 
                  key={tab} onClick={() => setActiveFilter(tab)}
                  className={`subject-workspace__tab ${activeFilter === tab ? 'subject-workspace__tab--active' : ''}`}
                  style={{ flexShrink: 0 }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Table Area */}
            {filteredResources.length === 0 ? (
              <div className="subject-workspace__empty w-full">
                <p>No resources uploaded yet. Click <strong>+ Add Resource</strong> to begin.</p>
              </div>
            ) : (
              <div className="subject-workspace__table-wrapper w-full mt-4">
                <table className="subject-workspace__table w-full text-left">
                  <thead>
                    <tr style={{ backgroundColor: '#1e1b4b', borderBottom: '2px solid #3730a3' }}>
                      <th style={{ color: '#818cf8', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px' }}>Title</th>
                      <th style={{ color: '#818cf8', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px' }}>Type</th>
                      <th style={{ color: '#818cf8', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px' }}>Date</th>
                      <th style={{ color: '#818cf8', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map(resource => (
                      <tr key={resource.id}>
                        <td style={{ padding: '16px' }}>{resource.title}</td>
                        <td style={{ padding: '16px' }}>{resource.type}</td>
                        <td style={{ padding: '16px' }}>{new Date(resource.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '16px', display: 'flex', gap: '32px', alignItems: 'center' }}>
                          
                          {(resource.external_url || resource.file_url) && (
                            <a
                              href={resource.external_url || resource.file_url}
                              target="_blank" rel="noopener noreferrer"
                              style={{ color: '#818cf8', cursor: 'pointer', padding: '8px' }}
                              title="View Material"
                            >
                              <Eye size={32} strokeWidth={2.5} />
                            </a>
                          )}

                          <button
                            style={{ color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                            onClick={() => handleDelete(resource.id)}
                            title="Delete Material"
                          >
                            <Trash2 size={28} strokeWidth={2.5} />
                          </button>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS CONTENT */}
      {mainTab === 'Announcements' && <AnnouncementsTab subjectId={subjectId} />}
        
      </div> {/* END MAIN PREMIUM CONTAINER */}

      {/* MODAL FREE FROM CSS BLUR */}
      {isModalOpen && (
        <UploadResourceModal 
          subjectId={subjectId} 
          onClose={handleModalClose} 
          onSuccess={handleModalSuccess} 
        />
      )}

      {/* 🛑 DELETE CONFIRMATION MODAL */}
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
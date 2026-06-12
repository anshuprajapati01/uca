import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { ROUTES } from '../../config/constants.js';
import './StudentDashboard.css';

const IconOverview = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconSubjects = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconLibrary = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSyllabus = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gSyllabus)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="gSyllabus" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconNotes = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gNotes)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="gNotes" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
    <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </svg>
);

const IconPYQs = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gPYQs)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="gPYQs" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconBookmark = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-7-7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const IconAnnouncement = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconPDF = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="8" y2="12" />
    <line x1="12" y1="16" x2="8" y2="16" />
    <line x1="12" y1="20" x2="8" y2="20" />
  </svg>
);

const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54-.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
    <path d="M14 11a5 5 0 0 0-7.54.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconStar = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gStar)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="gStar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient></defs>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCheatsheet = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gCheat)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="gCheat" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
    <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

const IconBook = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gBook)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="gBook" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const navItems = [
  { id: 'overview', label: '🏠 Overview', icon: <IconOverview /> },
  { id: 'subjects', label: '📚 My Subjects', icon: <IconSubjects /> },
  { id: 'library', label: '📂 Mega Library', icon: <IconLibrary /> },
  { id: 'bookmarks', label: '🔖 Bookmarks', icon: <IconBookmark filled={false} /> },
  { id: 'announcements', label: '📢 Announcements', icon: <IconAnnouncement /> },
];

const CATEGORIES = ['All', 'Lecture', 'Notes', 'Assignment', 'Tutorial', 'PYQ', 'Syllabus'];

const LIBRARY_FILTERS = ['All', 'Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets'];

const MOCK_LIBRARY_ITEMS = [
  { id: 'lib1', title: 'Galvin - Operating Systems PDF', category: 'Reference Books', iconType: 'book' },
  { id: 'lib2', title: 'TOC Unit 1-5 Toppers Notes', category: 'Toppers Notes', iconType: 'star' },
  { id: 'lib3', title: 'Python 1-Shot Cheat Sheet', category: 'Exam Cheatsheets', iconType: 'cheatsheet' },
  { id: 'lib4', title: 'Data Structures Complete Syllabus', category: 'Syllabus', iconType: 'syllabus' },
  { id: 'lib5', title: 'DBMS Class Notes - Handwritten', category: 'Class Notes', iconType: 'notes' },
  { id: 'lib6', title: 'Software Engineering PYQs 2020-2024', category: 'PYQs', iconType: 'pyqs' },
  { id: 'lib7', title: 'Computer Networks - Tanenbaum PDF', category: 'Reference Books', iconType: 'book' },
  { id: 'lib8', title: 'AIML Toppers Handwritten Notes', category: 'Toppers Notes', iconType: 'star' },
  { id: 'lib9', title: 'OS Exam Cheatsheet - All Concepts', category: 'Exam Cheatsheets', iconType: 'cheatsheet' },
  { id: 'lib10', title: 'Compiler Design Syllabus - Unit Wise', category: 'Syllabus', iconType: 'syllabus' },
  { id: 'lib11', title: 'SE Class Notes - Full Semester', category: 'Class Notes', iconType: 'notes' },
  { id: 'lib12', title: 'CN Previous Year Papers Solved', category: 'PYQs', iconType: 'pyqs' },
];

const getLibIcon = (type) => {
  switch (type) {
    case 'book': return <IconBook />;
    case 'star': return <IconStar />;
    case 'cheatsheet': return <IconCheatsheet />;
    case 'syllabus': return <IconSyllabus />;
    case 'notes': return <IconNotes />;
    case 'pyqs': return <IconPYQs />;
    default: return <IconBook />;
  }
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [semester, setSemester] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [bookmarkedIds, setBookmarkedIds] = useState(() => JSON.parse(localStorage.getItem('uca_student_bookmarks')) || []);
  const [bookmarkFilter, setBookmarkFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function loadStudentData() {
      setIsLoading(true);

      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!cancelled) setUser(authUser);

        if (!authUser) return;

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*, batches(*)')
          .eq('id', authUser.id)
          .single();

        if (profileError) throw profileError;
        if (!cancelled) {
          setProfile(profileData);
          setStudentProfile(profileData);
        }

        const { data: announcementData, error: announcementError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (announcementError) throw announcementError;
        if (!cancelled) setAnnouncements(announcementData || []);

        const studentSemester = profileData?.batches?.semester;
        if (!cancelled) setSemester(studentSemester ?? null);

        if (studentSemester != null) {
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .eq('semester', studentSemester);

          if (!cancelled) setSubjects(subjectsData || []);

          const { data: studyMaterialsData, error: studyMaterialsError } = await supabase
            .from('study_materials')
            .select('id, title, type, subject_id, file_url')
            .order('id', { ascending: true });

          if (studyMaterialsError || !studyMaterialsData || studyMaterialsData.length === 0) {
            if (!cancelled) {
              setAllMaterials(MOCK_LIBRARY_ITEMS.map(item => ({
                id: item.id,
                title: item.title,
                type: item.category === 'PYQs' ? 'PYQ' : item.category === 'Syllabus' ? 'Syllabus' : item.category === 'Class Notes' || item.category === 'Toppers Notes' ? 'Notes' : 'Reference',
                subject_id: null,
                file_url: null
              })));
            }
          } else {
            if (!cancelled) setAllMaterials(studyMaterialsData);
          }
        }
      } catch (err) {
        console.error('Failed to load student dashboard data:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStudentData();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSelectedSubject(null);
    setActiveFilter('All');
    setLibrarySearch('');
    setLibraryFilter('All');
    setBookmarkFilter('All');
  }, [activeTab]);

  const toggleBookmark = (materialId) => {
    setBookmarkedIds(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  useEffect(() => {
    localStorage.setItem('uca_student_bookmarks', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  const handleViewFile = (url) => {
    if (!url) return alert('No file link available.');
    
    // Check if it's a mocked local file from our Admin upload
    if (url.startsWith('local:') || !url.includes('.')) {
      return alert(`This is a local file placeholder: ${url.replace('local:', '')}\n\nNote: To view actual uploaded PDF/Doc files, we need to configure Supabase Storage Buckets. For now, Google Drive links will work perfectly!`);
    }

    try {
      const finalUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      alert('Invalid link format. Cannot open this file.');
    }
  };

  const getFilteredMaterials = () => {
    if (!selectedSubject) return [];
    const subjectCode = (selectedSubject.subject_code || selectedSubject.code || '').toLowerCase();
    const subjectMaterials = allMaterials.filter(m => {
      const mCode = m.subject_code || m.code || '';
      const mSubjectId = m.subject_id || m.subjectId || '';
      const sId = selectedSubject.id || '';
      return mCode.toLowerCase() === subjectCode || mSubjectId === sId;
    });
    if (activeFilter === 'All') return subjectMaterials;
    return subjectMaterials.filter(m => {
      const type = (m.type || m.category || '').toLowerCase();
      return type === activeFilter.toLowerCase() || type.includes(activeFilter.toLowerCase());
    });
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  const displayName = studentProfile?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const displayRole = profile?.role || 'student';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const filteredLibraryItems = allMaterials.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(librarySearch.toLowerCase()) ||
                          (item.category && item.category.toLowerCase().includes(librarySearch.toLowerCase()));
    const matchesFilter = libraryFilter === 'All' || item.type === libraryFilter || (item.category && item.category === libraryFilter);
    return matchesSearch && matchesFilter;
  });

  const libraryPills = LIBRARY_FILTERS.map((f) => (
    <button
      key={f}
      className={`student-lib-filter-pill ${libraryFilter === f ? 'student-lib-filter-pill--active' : ''}`}
      onClick={() => setLibraryFilter(f)}
    >
      {f}
    </button>
  ));

  const BOOKMARK_FILTERS = ['All', 'Syllabus', 'Class Notes', 'Toppers Notes', 'Reference Books', 'PYQs', 'Exam Cheatsheets', 'Lecture', 'Assignment', 'Tutorial'];

  const bookmarkPills = BOOKMARK_FILTERS.map((f) => (
    <button
      key={f}
      className={`student-lib-filter-pill ${bookmarkFilter === f ? 'student-lib-filter-pill--active' : ''}`}
      onClick={() => setBookmarkFilter(f)}
    >
      {f}
    </button>
  ));

  const libraryCards = filteredLibraryItems.map((item) => {
    const iconType = item.iconType || (item.type === 'PYQ' ? 'pyqs' : item.type === 'Syllabus' ? 'syllabus' : item.type === 'Notes' ? 'notes' : item.type === 'Tutorial' ? 'cheatsheet' : item.type === 'Assignment' ? 'notes' : 'book');
    const badgeType = (item.category || item.type || 'resource').toLowerCase().replace(/\s+/g, '-');
    return (
      <div key={item.id} className="student-lib-card">
        <div className="student-lib-card__glow" />
        <div className="student-lib-card__icon">{getLibIcon(iconType)}</div>
        <div className="student-lib-card__body">
          <h4 className="student-lib-card__title">{item.title}</h4>
          <span className={`student-lib-card__badge student-lib-card__badge--${badgeType}`}>
            {item.category || item.type || 'Resource'}
          </span>
        </div>
        <div className="student-lib-card__actions">
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', marginRight: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s' }} onClick={() => handleViewFile(item.file_url)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View
          </button>
          <button
            className={`student-lib-card__bookmark-btn ${bookmarkedIds.includes(item.id) ? 'student-lib-card__bookmark-btn--active' : ''}`}
            onClick={() => toggleBookmark(item.id)}
          >
            <IconBookmark filled={bookmarkedIds.includes(item.id)} />
          </button>
        </div>
      </div>
    );
  });

  const libraryEmptyState = (
    <div className="student-lib-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p>No materials found for your search.</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="student-dashboard-layout">
        <aside className="student-sidebar">
          <div className="student-sidebar__header">
            <h1 className="student-sidebar__brand">UCA</h1>
          </div>
          <nav className="student-sidebar__nav">
            {navItems.map(({ label }) => (
              <div key={label} className="student-sidebar__link skeleton-link" />
            ))}
          </nav>
          <div className="student-sidebar__footer" />
        </aside>

        <main className="student-main">
          <header className="student-header">
            <div className="student-header__title-wrap">
              <div className="student-header__skeleton" />
            </div>
            <div className="student-header__actions">
              <div className="student-header__skeleton student-header__skeleton--sm" />
              <div className="student-header__skeleton student-header__skeleton--sm" />
            </div>
          </header>
          <div className="student-content">
            <div className="student-skeleton-grid">
              <div className="student-skeleton-card student-skeleton-card--profile" />
              <div className="student-skeleton-card" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="student-dashboard-layout">
      <aside className="student-sidebar">
        <div className="student-sidebar__header">
          <div className="student-sidebar__logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <h1 className="student-sidebar__brand">UCA</h1>
        </div>

        <nav className="student-sidebar__nav">
          {navItems.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`student-sidebar__link ${activeTab === id ? 'student-sidebar__link--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="student-sidebar__link-icon">{icon}</span>
              <span className="student-sidebar__link-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="student-sidebar__footer">
          <span>Student Portal · v1.0</span>
        </div>
      </aside>

      <main className="student-main">
        <header className="student-header">
          <div className="student-header__title-wrap">
            <h2 className="student-header__title">Student Dashboard</h2>
            <span className="student-header__welcome">Welcome back, {displayName.split(' ')[0]}</span>
          </div>

          <div className="student-header__right">
            <div className="student-header__user">
              <div className="student-header__avatar">{initials}</div>
              <div className="student-header__meta">
                <span className="student-header__name">{displayName}</span>
                <span className="student-header__role">{displayRole}</span>
              </div>
            </div>
            <button className="student-header__signout" onClick={handleSignOut}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        <div className="student-content">
          {activeTab === 'overview' && (
            <div className="student-grid">
              <section className="student-section">
                <h3 className="student-section__title">Student Profile</h3>
                <div className="student-profile-card">
                  <div className="student-profile__icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="student-profile__body">
                    <div className="student-profile__row">
                      <span className="student-profile__label">Name</span>
                      <span className="student-profile__value">
                        {studentProfile?.full_name || profile?.full_name || '—'}
                      </span>
                    </div>
                    <div className="student-profile__row">
                      <span className="student-profile__label">Roll No</span>
                      <span className="student-profile__value">
                        {studentProfile?.roll_number || profile?.roll_number || '—'}
                      </span>
                    </div>
                    <div className="student-profile__row">
                      <span className="student-profile__label">Phone</span>
                      <span className="student-profile__value">
                        {studentProfile?.phone || profile?.phone || '—'}
                      </span>
                    </div>
                    <div className="student-profile__row">
                      <span className="student-profile__label">College ID</span>
                      <span className="student-profile__value">
                        {studentProfile?.college_id || profile?.college_id || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="student-section student-section--grow">
                <h3 className="student-section__title">Notice Board</h3>
                {announcements.length === 0 ? (
                  <div className="student-empty-box">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <p>No announcements yet.</p>
                  </div>
                ) : (
                  <div className="student-announcements">
                    {announcements.map((a) => (
                      <article key={a.id} className="student-announcement-card">
                        <div className="student-announcement__header">
                          <h4 className="student-announcement__title">{a.title}</h4>
                          {a.type && (
                            <span className={`student-announcement__badge student-announcement__badge--${String(a.type).toLowerCase()}`}>
                              {a.type}
                            </span>
                          )}
                        </div>
                        {a.content && <p className="student-announcement__content">{a.content}</p>}
                        <time className="student-announcement__date">
                          {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                        {a.file_url && (
                          <button
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                            onClick={() => window.open(a.file_url, '_blank', 'noopener,noreferrer')}
                          >
                            📎 View Official Notice
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'subjects' && (
            <section className="student-section">
              {selectedSubject ? (
                <>
                  <div className="student-subject-detail-header">
                    <button className="student-subject-back" onClick={() => setSelectedSubject(null)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                    <h3 className="student-section__title" style={{ marginTop: 0 }}>
                      {selectedSubject.subject_name || selectedSubject.name || selectedSubject.title || "Unnamed Subject"}
                      <span style={{ color: '#8b5cf6', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                        {selectedSubject.subject_code || selectedSubject.code || "No Code"}
                      </span>
                    </h3>
                  </div>
                  <div className="student-material-filters">
                    {CATEGORIES.map((f) => (
                      <button
                        key={f}
                        className={`student-filter-pill ${activeFilter === f ? 'student-filter-pill--active' : ''}`}
                        onClick={() => setActiveFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="student-materials-list">
                    {getFilteredMaterials().length > 0 ? (
                      getFilteredMaterials().map((material) => (
                        <div key={material.id} className="student-material-card">
                          <div className="student-material-card__left">
                            {material.file_type === 'pdf' || material.type === 'PYQ' || material.type === 'Syllabus' ? <IconPDF /> : <IconLink />}
                          </div>
                          <div className="student-material-card__center">
                            <h4 className="student-material-card__title">{material.title || material.name || "Untitled"}</h4>
                            <span className={`student-material-card__badge student-material-card__badge--${(material.type || material.category || 'resource').toLowerCase().replace(/\s+/g, '-')}`}>
                              {material.type || material.category || 'Resource'}
                            </span>
                          </div>
                          <div className="student-material-card__right">
                              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', marginRight: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s' }} onClick={() => handleViewFile(material.file_url)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              View
                            </button>
                            <button
                              className={`student-bookmark-btn ${bookmarkedIds.includes(material.id) ? 'student-bookmark-btn--active' : ''}`}
                              onClick={() => toggleBookmark(material.id)}
                            >
                              <IconBookmark filled={bookmarkedIds.includes(material.id)} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="student-material-empty">
                        <p>No {activeFilter} uploaded for {selectedSubject.subject_name || selectedSubject.name || selectedSubject.title || "this subject"} yet.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="student-section__title">
                    My Subjects
                    {semester != null && (
                      <span className="student-section__badge">Semester {semester}</span>
                    )}
                  </h3>
                  {subjects.length === 0 ? (
                    <div className="student-empty-box">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <p>No subjects assigned for your semester yet.</p>
                    </div>
                  ) : (
                    <div className="student-subjects-grid">
                      {subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="student-subject-card"
                          onClick={() => setSelectedSubject(subject)}
                        >
                          <div className="student-subject-card__accent" />
                          <h4>{subject.subject_name || subject.name || subject.title || "Unnamed Subject"}</h4>
                          <p style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{subject.subject_code || subject.code || "No Code"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === 'library' && (
            <section className="student-section student-section--library">
              <div className="student-lib-header-row">
                <h3 className="student-section__title">Mega Library</h3>
              </div>

              <div className="student-lib-search-wrap">
                <span className="student-lib-search-icon"><IconSearch /></span>
                <input
                  type="text"
                  className="student-lib-search-input"
                  placeholder="Search resources, books, notes..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>

              <div className="student-lib-filter-row">
                {libraryPills}
              </div>

              <div className="student-lib-grid">
                {filteredLibraryItems.length > 0 ? libraryCards : libraryEmptyState}
              </div>
            </section>
          )}

          {activeTab === 'bookmarks' && (
            <section className="student-section student-section--library">
              <h3 className="student-section__title">
                Your Bookmarks
                {bookmarkedIds.length > 0 && (
                  <span className="student-section__badge">{bookmarkedIds.length} saved</span>
                )}
              </h3>

              <div className="student-lib-filter-row">
                {bookmarkPills}
              </div>

              {bookmarkedIds.length === 0 ? (
                <div className="student-lib-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M19 21l-7-7-7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <p>No materials bookmarked yet. Explore My Subjects or Mega Library to save resources.</p>
                </div>
              ) : (
                (() => {
                  const filteredBookmarks = allMaterials
                    .filter(m => bookmarkedIds.includes(m.id))
                    .filter(m => {
                      if (bookmarkFilter === 'All') return true;
                      const type = (m.type || m.category || '').toLowerCase();
                      const filterLower = bookmarkFilter.toLowerCase();
                      return type === filterLower || type.includes(filterLower);
                    });

                  if (filteredBookmarks.length === 0) {
                    return (
                      <div className="student-lib-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <p>No materials found for this filter.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="student-lib-grid">
                      {filteredBookmarks.map((material) => {
                        const iconType = material.iconType || (material.type === 'PYQ' ? 'pyqs' : material.type === 'Syllabus' ? 'syllabus' : material.type === 'Notes' ? 'notes' : material.type === 'Tutorial' ? 'cheatsheet' : material.type === 'Assignment' ? 'notes' : 'book');
                        const badgeType = (material.category || material.type || 'resource').toLowerCase().replace(/\s+/g, '-');
                        return (
                          <div key={material.id} className="student-lib-card">
                            <div className="student-lib-card__glow" />
                            <div className="student-lib-card__icon">{getLibIcon(iconType)}</div>
                            <div className="student-lib-card__body">
                              <h4 className="student-lib-card__title">{material.title}</h4>
                              <span className={`student-lib-card__badge student-lib-card__badge--${badgeType}`}>
                                {material.category || material.type || 'Resource'}
                              </span>
                            </div>
                            <div className="student-lib-card__actions">
                            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', marginRight: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s' }} onClick={() => handleViewFile(material.file_url)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                View
                              </button>
                              <button
                                className={`student-lib-card__bookmark-btn ${bookmarkedIds.includes(material.id) ? 'student-lib-card__bookmark-btn--active' : ''}`}
                                onClick={() => toggleBookmark(material.id)}
                              >
                                <IconBookmark filled={bookmarkedIds.includes(material.id)} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </section>
          )}

          {activeTab === 'announcements' && (
            <section className="student-section student-section--grow">
              <h3 className="student-section__title">All Announcements</h3>
              {announcements.length === 0 ? (
                <div className="student-empty-box">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <p>No announcements yet.</p>
                </div>
              ) : (
                <div className="student-announcements">
                  {announcements.map((a) => (
                    <article key={a.id} className="student-announcement-card">
                      <div className="student-announcement__header">
                        <h4 className="student-announcement__title">{a.title}</h4>
                        {a.type && (
                          <span className={`student-announcement__badge student-announcement__badge--${String(a.type).toLowerCase()}`}>
                            {a.type}
                          </span>
                        )}
                      </div>
                      {a.content && <p className="student-announcement__content">{a.content}</p>}
                      <time className="student-announcement__date">
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </time>
                      {a.file_url && (
                        <button
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                          onClick={() => window.open(a.file_url, '_blank', 'noopener,noreferrer')}
                        >
                          📎 View Official Notice
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
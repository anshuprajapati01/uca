import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, LogOut, User, ClipboardList, Star, ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ROUTES } from '../../config/constants.js';
import { signOut } from '../../services/authService.js';
import toast from 'react-hot-toast';
import FacultyAssignments from '../dashboard/FacultyAssignments.jsx';
import FacultySessionalMarks from '../dashboard/FacultySessionalMarks.jsx';
import './FacultyDashboard.css';

const BASE_NAV_ITEMS = [
  { id: 'overview', label: '🏠 Overview', path: ROUTES.FACULTY_DASHBOARD, icon: <LayoutDashboard size={18} /> },
  { id: 'subjects', label: '📚 My Subjects', path: `${ROUTES.FACULTY_DASHBOARD}/subjects`, icon: <BookOpen size={18} /> },
  { id: 'assignments', label: '📋 Assignments', path: `${ROUTES.FACULTY_DASHBOARD}/assignments`, icon: <ClipboardList size={18} /> },
  { id: 'sessional-marks', label: 'Sessional Marks', path: `${ROUTES.FACULTY_DASHBOARD}/sessional-marks`, icon: <ClipboardCheck size={18} /> },
];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMentor, setIsMentor] = useState(false);

  const navItems = useMemo(() => {
    if (!isMentor) return BASE_NAV_ITEMS;
    return [
      ...BASE_NAV_ITEMS,
      { id: 'mentor', label: '⭐ Mentor Dashboard', path: `${ROUTES.FACULTY_DASHBOARD}/mentor`, icon: <Star size={18} /> },
    ];
  }, [isMentor]);

  const activeTab = useMemo(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || ROUTES.FACULTY_DASHBOARD;

    if (pathname === ROUTES.FACULTY_DASHBOARD) return 'overview';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/subjects` || pathname.startsWith(`${ROUTES.FACULTY_DASHBOARD}/subjects/`) || pathname === `${ROUTES.FACULTY_DASHBOARD}/workspace` || pathname.startsWith(`${ROUTES.FACULTY_DASHBOARD}/workspace/`)) return 'subjects';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/assignments`) return 'assignments';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/sessional-marks`) return 'sessional-marks';
    if (pathname === `${ROUTES.FACULTY_DASHBOARD}/mentor`) return 'mentor';

    return 'overview';
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadFacultyData() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          navigate(ROUTES.LOGIN, { replace: true });
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*, batches(name)')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Faculty profile not found.');

        if (!cancelled) setFacultyProfile(profileData);

        const { data: mentorData, error: mentorError } = await supabase
          .from('section_mentors')
          .select('branch, year, section')
          .eq('faculty_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          if (mentorData && !mentorError) {
            setIsMentor(true);
          } else {
            setIsMentor(false);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load faculty dashboard.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFacultyData();

    return () => { cancelled = true; };
  }, [navigate]);

  async function handleSignOut() {
    await signOut();
  }

  const canViewFaculty = facultyProfile?.can_view_faculty === true;
  const canViewHod = facultyProfile?.can_view_hod === true;
  const isDirector = facultyProfile?.role === 'director';
  const showRoleSwitcher = (canViewFaculty && canViewHod) || (isDirector && canViewFaculty);
  const isOnHodDashboard = location.pathname.startsWith(ROUTES.HOD_DASHBOARD);
  const isOnDirectorDashboard = location.pathname.startsWith(ROUTES.DIRECTOR_DASHBOARD);

  function handleSwitchRole() {
    if (isOnHodDashboard || isOnDirectorDashboard) {
      navigate(ROUTES.FACULTY_DASHBOARD, { replace: true });
    } else if (isDirector) {
      navigate(ROUTES.DIRECTOR_DASHBOARD, { replace: true });
    } else {
      navigate(ROUTES.HOD_DASHBOARD, { replace: true });
    }
  }

  const displayName = facultyProfile?.full_name || 'Faculty';
  const avatarUrl = facultyProfile?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return <FacultyDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="faculty-dashboard-layout">
        <FacultySidebar items={navItems} activeTab={activeTab} onNavigate={navigate} />
        <main className="faculty-main">
          <FacultyHeader
            displayName={displayName}
            initials={initials}
            avatarUrl={avatarUrl}
            onSignOut={handleSignOut}
            showRoleSwitcher={showRoleSwitcher}
            onSwitchRole={handleSwitchRole}
            isOnHodDashboard={isOnHodDashboard}
            isOnDirectorDashboard={isOnDirectorDashboard}
            isDirector={isDirector}
            facultyProfile={facultyProfile}
          />
          <div className="faculty-content">
            <div className="faculty-error-card">
              <User size={28} />
              <h2>Unable to load Faculty Dashboard</h2>
              <p>{error}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const pageTitle = activeTab === 'subjects' ? 'My Subjects' : activeTab === 'mentor' ? 'Mentor Dashboard' : 'Faculty Dashboard';

  return (
    <div className="faculty-dashboard-layout">
      <FacultySidebar items={navItems} activeTab={activeTab} onNavigate={navigate} />

      <main className="faculty-main">
        <FacultyHeader
          displayName={displayName}
          initials={initials}
          avatarUrl={avatarUrl}
          onSignOut={handleSignOut}
          showRoleSwitcher={showRoleSwitcher}
          onSwitchRole={handleSwitchRole}
          isOnHodDashboard={isOnHodDashboard}
          isOnDirectorDashboard={isOnDirectorDashboard}
          isDirector={isDirector}
          pageTitle={pageTitle}
          facultyProfile={facultyProfile}
        />

        <div className="faculty-content">
          {activeTab === 'overview' && <Outlet />}

          {activeTab === 'subjects' && <Outlet />}

          {activeTab === 'assignments' && <FacultyAssignments />}

          {activeTab === 'sessional-marks' && <FacultySessionalMarks />}

          {activeTab === 'mentor' && <Outlet />}
        </div>
      </main>
    </div>
  );
}

function FacultySidebar({ items, activeTab, onNavigate }) {
  return (
    <aside className="faculty-sidebar">
      <div className="faculty-sidebar__header">
        <div className="faculty-sidebar__logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
          </svg>
        </div>
        <h1 className="faculty-sidebar__brand">UCA</h1>
      </div>

      <nav className="faculty-sidebar__nav">
        {items.map(({ id, path, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`faculty-sidebar__link ${activeTab === id ? 'faculty-sidebar__link--active' : ''}`}
            onClick={() => onNavigate(path)}
          >
            <span className="faculty-sidebar__link-icon">{icon}</span>
            <span className="faculty-sidebar__link-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="faculty-sidebar__footer">
        <span>Faculty Portal · v1.0</span>
      </div>
    </aside>
  );
}

function FacultyHeader({ displayName, initials, onSignOut, showRoleSwitcher, onSwitchRole, isOnHodDashboard, isOnDirectorDashboard, isDirector, pageTitle, facultyProfile }) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const lastSavedPhone = useRef(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState(facultyProfile?.avatar_url || '');
  const [currentAvatar, setCurrentAvatar] = useState(facultyProfile?.avatar_url || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const switcherLabel = isOnHodDashboard || isOnDirectorDashboard
    ? '🔄 Switch to Faculty Portal'
    : `🔄 Switch to ${isDirector ? 'Director' : 'HOD'} Portal`;

  function openProfileModal() {
    setPhone(lastSavedPhone.current ?? facultyProfile?.phone ?? '');
    setNewPassword('');
    setConfirmPassword('');
    setActiveTab('general');
    setIsProfileModalOpen(true);
  }

  function closeProfileModal() {
    setNewPassword('');
    setConfirmPassword('');
    setIsProfileModalOpen(false);
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setIsProfileModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsUpdating(false);
  }

  async function handleProfileUpdate() {
    setIsUpdatingProfile(true);
    try {
      console.log("Attempting to update phone for ID:", facultyProfile.id, "to:", phone);

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ phone: phone })
        .eq('id', facultyProfile.id)
        .select();

      if (error) {
        console.error("Supabase Update Error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Update blocked by Row Level Security (RLS) or ID not found.");
      }

      toast.success("Phone number updated successfully!");

      lastSavedPhone.current = phone;

      closeProfileModal();

    } catch {
      toast.error("Failed to update profile. Check console.");
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  const handleAvatarUpload = async (event) => {
    try {
      setIsUploadingAvatar(true);
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        return toast.error("Image size must be less than 2MB");
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${facultyProfile?.id || Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage
         .from('avatars')
         .getPublicUrl(filePath);

       const finalUrl = `${publicUrl}?t=${Date.now()}`;

       const { error: updateError } = await supabase
         .from('user_profiles')
         .update({ avatar_url: finalUrl })
         .eq('id', facultyProfile?.id);

       if (updateError) throw updateError;

       setCurrentAvatar(finalUrl);

       if (typeof setUploadedAvatarUrl === 'function') {
         setUploadedAvatarUrl(finalUrl);
       }

       if (facultyProfile) {
         facultyProfile.avatar_url = finalUrl;
       }

       toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Avatar Upload Error:", error);
      toast.error("Failed to upload image. Does the 'avatars' storage bucket exist?");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <>
      <header className="faculty-header">
        <div className="faculty-header__title-wrap">
          <h2 className="faculty-header__title">{pageTitle}</h2>
        </div>

        <div className="faculty-header__right">
          {showRoleSwitcher ? (
            <button type="button" className="faculty-header__switcher" onClick={onSwitchRole}>
              {switcherLabel}
            </button>
          ) : null}
          <div className="faculty-header__user">
            <button
              type="button"
              className="faculty-header__avatar-btn"
              onClick={openProfileModal}
              aria-label="Open profile settings"
            >
              <div className="faculty-header__avatar">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={displayName || 'Profile'}
                    className="faculty-header__avatar-image"
                  />
                ) : (
                  initials
                )}
              </div>
            </button>
            <div className="faculty-header__meta">
              <span className="faculty-header__name">{displayName}</span>
              <span className="faculty-header__role">Faculty</span>
            </div>
          </div>
          <button type="button" className="faculty-header__signout" onClick={onSignOut}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </header>
      {isProfileModalOpen &&
        createPortal(
          <div
            className="faculty-profile-modal-overlay"
            onClick={closeProfileModal}
          >
            <div
              className="faculty-profile-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="faculty-profile-modal__header">
                <h3>Edit Profile</h3>
                <button
                  type="button"
                  className="faculty-profile-modal__close"
                  onClick={closeProfileModal}
                >
                  ✕
                </button>
              </div>
              <div className="faculty-profile-modal__tabs">
                <button
                  type="button"
                  className={`faculty-profile-modal__tab ${activeTab === 'general' ? 'faculty-profile-modal__tab--active' : ''}`}
                  onClick={() => setActiveTab('general')}
                >
                  General
                </button>
                <button
                  type="button"
                  className={`faculty-profile-modal__tab ${activeTab === 'password' ? 'faculty-profile-modal__tab--active' : ''}`}
                  onClick={() => setActiveTab('password')}
                >
                  Change Password
                </button>
              </div>
          {/* General Details Tab */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-5">
              
              {/* STRICTLY CENTERED AVATAR SECTION */}
              <div className="flex flex-col items-center justify-center gap-3 w-full" style={{ textAlign: 'center' }}>
                <div className="relative" style={{ width: '96px', height: '96px', margin: '0 auto' }}>
                  <img 
                    src={uploadedAvatarUrl || facultyProfile?.avatar_url || `https://ui-avatars.com/api/?name=${facultyProfile?.name || 'Faculty'}&background=2d3748&color=fff`} 
                    alt="Avatar" 
                    className={`border-2 border-[#7c3aed] shadow-lg transition-opacity ${isUploadingAvatar ? 'opacity-50' : ''}`} 
                    style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <label 
                  style={{ 
                    display: 'inline-block',
                    margin: '12px auto 0 auto',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#a78bfa',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    border: '1px dashed #7c3aed',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
                  }}
                >
                  {isUploadingAvatar ? 'Uploading...' : 'Choose Avatar Image'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>

              {/* NAME INPUT (Rest of the form continues below) */}
                  <div className="faculty-profile-modal__field">
                    <label>Name</label>
                    <input type="text" value={displayName} disabled />
                  </div>
                  <div className="faculty-profile-modal__field">
                    <label>Email</label>
                    <input type="email" value={facultyProfile?.email || ''} disabled />
                  </div>
                  <div className="faculty-profile-modal__field">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleProfileUpdate}
                    disabled={isUpdatingProfile}
                    className="faculty-profile-modal__save-btn"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
          )}
          {activeTab === 'password' && (
            <div className="faculty-profile-modal__body">
              <div className="faculty-profile-modal__field">
                <label>New Password</label>
                <div className="faculty-profile-modal__password-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="faculty-profile-modal__eye-btn"
                  >
                    {showNewPassword ? (
                      <svg className="faculty-profile-modal__eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="faculty-profile-modal__eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="faculty-profile-modal__field">
                <label>Confirm Password</label>
                <div className="faculty-profile-modal__password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="faculty-profile-modal__eye-btn"
                  >
                    {showConfirmPassword ? (
                      <svg className="faculty-profile-modal__eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="faculty-profile-modal__eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="faculty-profile-modal__update-btn"
                onClick={handlePasswordUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    )}
  </>
  );
}

function FacultyDashboardSkeleton() {
  const itemCount = BASE_NAV_ITEMS.length + 1;
  return (
    <div className="faculty-dashboard-layout">
      <aside className="faculty-sidebar">
        <div className="faculty-sidebar__header">
          <div className="faculty-sidebar__logo" />
          <div className="faculty-sidebar__brand skeleton" />
        </div>
        <nav className="faculty-sidebar__nav">
          {Array.from({ length: itemCount }).map((_, idx) => (
            <div key={idx} className="faculty-sidebar__link skeleton" />
          ))}
        </nav>
      </aside>

      <main className="faculty-main">
        <header className="faculty-header">
          <div className="faculty-header__title-wrap">
            <div className="faculty-header__skeleton" />
            <div className="faculty-header__skeleton faculty-header__skeleton--sm" />
          </div>
          <div className="faculty-header__right">
            <div className="faculty-header__skeleton faculty-header__skeleton--avatar" />
            <div className="faculty-header__skeleton faculty-header__skeleton--button" />
          </div>
        </header>

        <div className="faculty-content">
          <div className="faculty-skeleton-grid">
            <div className="faculty-skeleton-card faculty-skeleton-card--wide" />
            <div className="faculty-skeleton-card" />
          </div>
        </div>
      </main>
    </div>
  );
}

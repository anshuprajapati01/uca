import { createPortal } from 'react-dom';
import { LogOut, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogout } from '../../hooks/useLogout.js';
import toast from 'react-hot-toast';
import './DashboardLayout.css';

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {() => void} props.onMenuClick
 */
export default function TopNavbar({ title, onMenuClick }) {
  const { user, profile, role } = useAuth();
  const { logout, isLoading } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const lastSavedPhone = useRef(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');

  useEffect(() => {
    if (profile?.avatar_url) setCurrentAvatar(profile.avatar_url);
  }, [profile?.avatar_url]);

  useEffect(() => {
    const fetchPhoneNumber = async () => {
      const targetId = profile?.id || user?.id;
      if (!targetId) return;

      if (profile?.phone) {
        setPhone(profile.phone);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', targetId)
          .maybeSingle();

        if (!error && data?.phone) {
          setPhone(data.phone);
          if (profile) profile.phone = data.phone;
        }
      } catch (err) {
        console.error("[TopNavbar] Failed to fetch phone:", err);
      }
    };

    fetchPhoneNumber();
  }, [profile?.id, user?.id, profile?.phone]);

  const fullName = profile?.full_name || user?.full_name || '';
  const displayName = fullName || user?.email || 'User';
  const avatarUrl = profile?.avatar_url || user?.avatar_url || null;
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? 'U');
  const canViewFaculty = profile?.can_view_faculty === true;
  const canViewHod = profile?.can_view_hod === true;
  const showRoleSwitcher =
    ((role === 'hod' || role === 'director') && canViewFaculty) ||
    (role !== 'hod' && role !== 'director' && canViewFaculty && canViewHod);

  const isFacultyDashboard = location.pathname.startsWith('/faculty');
  const isHodDashboard = location.pathname.startsWith('/hod-dashboard');
  const isDirectorDashboard = location.pathname.startsWith('/director');

  let switcherLabel = null;
  let switcherTarget = null;

  if (isFacultyDashboard) {
    if (role === 'director' && canViewFaculty) {
      switcherLabel = '🔄 Switch to Director Portal';
      switcherTarget = ROUTES.DIRECTOR_DASHBOARD;
    } else {
      switcherLabel = '🔄 Switch to HOD Portal';
      switcherTarget = ROUTES.HOD_DASHBOARD;
    }
  } else if (isHodDashboard) {
    switcherLabel = '🔄 Switch to Faculty Portal';
    switcherTarget = ROUTES.FACULTY_DASHBOARD;
  } else if (isDirectorDashboard) {
    switcherLabel = '🔄 Switch to Faculty Portal';
    switcherTarget = ROUTES.FACULTY_DASHBOARD;
  }

  function handleSwitchRole() {
    if (switcherTarget) {
      navigate(switcherTarget, { replace: true });
    }
  }

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  function openProfileModal() {
    setPhone(lastSavedPhone.current ?? profile?.phone ?? '');
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

  async function handleProfileUpdate() {
    setIsUpdatingProfile(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ phone: phone })
        .eq('id', profile?.id ?? user?.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("ID not found or RLS blocked.");

      lastSavedPhone.current = phone;

      toast.success("Profile updated successfully!");
      setIsProfileModalOpen(false);
    } catch (error) {
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match!");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.");

    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setIsProfileModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsUpdatingPassword(false);
  }

  const handleAvatarUpload = async (event) => {
    try {
      setIsUploadingAvatar(true);
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) return toast.error("Image size must be less than 2MB");

      const fileExt = file.name.split('.').pop();
      const targetId = profile?.id || user?.id;
      const fileName = `${targetId || Math.random()}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: finalUrl })
        .eq('id', targetId);

      if (updateError) throw updateError;

      setCurrentAvatar(finalUrl);
      setUploadedAvatarUrl(finalUrl);
      if (profile) profile.avatar_url = finalUrl;

      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Avatar Upload Error:", error);
      toast.error("Failed to upload image.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <>
      <header className="dashboard-topbar">
      <div className="dashboard-topbar__left">
        <button
          type="button"
          className="dashboard-topbar__menu-btn"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <h1 className="dashboard-topbar__title">{title}</h1>
      </div>

      <div className="dashboard-topbar__right">
        {showRoleSwitcher && switcherLabel ? (
          <button
            type="button"
            className="dashboard-topbar__switcher"
            onClick={handleSwitchRole}
          >
            {switcherLabel}
          </button>
        ) : null}
        <div className="dashboard-topbar__profile">
          <button
            type="button"
            onClick={openProfileModal}
            className="dashboard-topbar__profile-btn"
            aria-label="Open profile settings"
          >
             <div className="dashboard-topbar__profile-avatar">
               {currentAvatar ? (
                 <img
                   src={currentAvatar}
                   alt={fullName || 'Profile'}
                   className="dashboard-topbar__avatar-image"
                 />
               ) : (
                 <span className="dashboard-topbar__avatar-initials">{initials}</span>
               )}
             </div>
            <div className="dashboard-topbar__user">
              <strong>{displayName}</strong>
              {/* URL check: HOD portal hai toh HOD likho, varna original role */}
              {role ? (
                <span className="dashboard-topbar__role">
                  {location.pathname.startsWith('/hod-dashboard')
                    ? 'HOD'
                    : role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              ) : null}
            </div>
          </button>
        </div>
        <button
          type="button"
          className="dashboard-topbar__logout"
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            'Signing out…'
          ) : (
            <>
              <LogOut size={16} aria-hidden="true" />
              Sign Out
            </>
          )}
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
              {activeTab === 'general' ? (
                <div className="faculty-profile-modal__body">
                  {/* STRICTLY CENTERED AVATAR SECTION */}
                  <div className="flex flex-col items-center justify-center gap-3 w-full" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div className="relative" style={{ width: '96px', height: '96px', margin: '0 auto' }}>
                      <img 
                        src={uploadedAvatarUrl || currentAvatar || `https://ui-avatars.com/api/?name=${profile?.name || 'HOD'}&background=2d3748&color=fff`} 
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
                        display: 'inline-block', margin: '12px auto 0 auto', padding: '10px 24px', fontSize: '14px', fontWeight: '600',
                        color: '#a78bfa', backgroundColor: 'rgba(124, 58, 237, 0.1)', border: '1px dashed #7c3aed', 
                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.1)'}
                    >
                      {isUploadingAvatar ? 'Uploading...' : 'Choose Avatar Image'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                    </label>
                  </div>
                  <div className="faculty-profile-modal__field">
                    <label>Name</label>
                    <input type="text" value={displayName} disabled />
                  </div>
                  <div className="faculty-profile-modal__field">
                    <label>Email</label>
                    <input type="email" value={profile?.email || user?.email || ''} disabled />
                  </div>
                  <div className="faculty-profile-modal__field">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={phone || ''}
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
              ) : (
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
                          <svg className="faculty-profile-modal__eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
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
                          <svg className="faculty-profile-modal__eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
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
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? 'Updating…' : 'Update Password'}
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

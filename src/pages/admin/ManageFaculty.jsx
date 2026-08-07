import { useState, useEffect } from 'react';
import { supabase, createTempClient } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import toast from 'react-hot-toast';

export default function ManageFaculty() {
  const { profile } = useAuth();
  const [faculties, setFaculties] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', branchId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoverModal, setHandoverModal] = useState({ isOpen: false, faculty: null });
  const [replacementId, setReplacementId] = useState('');
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [selectedActionFaculty, setSelectedActionFaculty] = useState(null);
  const [actionPhone, setActionPhone] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*');
      if (error) {
        console.error("Supabase Error:", error);
      } else {
        setBranches(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFaculties = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, expertise, avatar_url, can_view_faculty')
      .eq('can_view_faculty', true);

    if (!error && data) {
      setFaculties(data || []);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchFaculties();
  }, []);

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.branchId) {
      toast.error('Error: Please select a Department/Branch.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ can_view_faculty: true })
          .eq('email', formData.email);

        if (updateError) throw updateError;

        toast.success('Existing user granted Faculty access!');
        setFormData({ fullName: '', email: '', phone: '', branchId: '' });
        fetchFaculties();
        return;
      }

      const tempClient = createTempClient();

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: formData.email,
        password: 'Test@123',
        options: {
          data: {
           college_id: '11111111-0000-0000-0000-000000000001',
          },
        },
      });

      if (authError) throw authError;

      const realUserId = authData.user.id;

      const { error: profileError } = await supabase.from('user_profiles').insert([{
        id: realUserId,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: 'faculty',
        can_view_faculty: true,
        expertise: '',
        branch_id: formData.branchId,
        college_id: '11111111-0000-0000-0000-000000000001',
        is_active: true
      }]);

      if (profileError) throw profileError;

      toast.success('Faculty added successfully. Default password is Test@123');
      
      setFormData({ fullName: '', email: '', phone: '', branchId: '' });
      fetchFaculties();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkFacultyAssignments = async (facultyId) => {
    const [deptRes, subRes, timeRes] = await Promise.all([
      supabase.from('departments').select('id').eq('hod_id', facultyId),
      supabase.from('subjects').select('id').eq('faculty_id', facultyId),
      supabase.from('timetable_slots').select('id').eq('faculty_id', facultyId),
    ]);

    const hasDept = deptRes.data && deptRes.data.length > 0;
    const hasSub = subRes.data && subRes.data.length > 0;
    const hasTime = timeRes.data && timeRes.data.length > 0;

    return hasDept || hasSub || hasTime;
  };

  const handleForceDelete = async () => {
    if (!handoverModal.faculty) return;
    const oldId = handoverModal.faculty.id;

    try {
      const { error: subErr } = await supabase.from('subjects').update({ faculty_id: null }).eq('faculty_id', oldId);
      if (subErr) throw new Error("Failed to unassign subjects: " + subErr.message);

      const { error: deptErr } = await supabase.from('departments').update({ hod_id: null }).eq('hod_id', oldId);
      if (deptErr) throw new Error("Failed to unassign HOD roles: " + deptErr.message);

      const { error: timeErr } = await supabase.from('timetable_slots').update({ faculty_id: null }).eq('faculty_id', oldId);
      if (timeErr) throw new Error("Failed to unassign timetable: " + timeErr.message);

      const { error: delErr } = await supabase.from('user_profiles').delete().eq('id', oldId);
      if (delErr) throw delErr;

      toast.success("Faculty deleted and roles left unassigned!");
      setHandoverModal({ isOpen: false, faculty: null });
      setReplacementId('');
      fetchFaculties();
    } catch (err) {
      console.error("Force Delete Error:", err);
      toast.error(err.message || "Failed to force delete.");
    }
  };

  const handleHandoverAndDelete = async () => {
    if (!replacementId) {
      toast.error('Please select a replacement faculty member.');
      return;
    }

    if (replacementId === handoverModal.faculty.id) {
      toast.error('Cannot select the same faculty as replacement.');
      return;
    }

    setIsHandingOver(true);

    try {
      const oldFacultyId = handoverModal.faculty.id;

      const { error: deptError } = await supabase
        .from('departments')
        .update({ hod_id: replacementId })
        .eq('hod_id', oldFacultyId);

      if (deptError) throw deptError;

      const { error: subjectError } = await supabase
        .from('subjects')
        .update({ faculty_id: replacementId })
        .eq('faculty_id', oldFacultyId);

      if (subjectError) throw subjectError;

      const { error: timetableError } = await supabase
        .from('timetable_slots')
        .update({ faculty_id: replacementId })
        .eq('faculty_id', oldFacultyId);

      if (timetableError) throw timetableError;

      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', oldFacultyId);

      if (deleteError) throw deleteError;

      setFaculties(prev => prev.filter(f => f.id !== oldFacultyId));
      toast.success('Handover and deletion successful!');
      setHandoverModal({ isOpen: false, faculty: null });
      setReplacementId('');
    } catch (error) {
      console.error('Handover error:', error);
      toast.error('Failed to complete handover and deletion.');
    } finally {
      setIsHandingOver(false);
    }
  };

  const otherFaculties = faculties.filter(f => f.id !== handoverModal.faculty?.id);

  const getAvatarUrl = (faculty) => {
    if (faculty.avatar_url) return faculty.avatar_url;
    const name = encodeURIComponent(faculty.full_name || 'Faculty');
    return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`;
  };

  const renderExpertiseTags = (expertise) => {
    if (!expertise) {
      return (
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>N/A</span>
      );
    }
    const tags = String(expertise)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) {
      return (
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>N/A</span>
      );
    }
    return tags.map((tag) => (
      <span
        key={tag}
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          letterSpacing: '0.025em',
          display: 'inline-block',
          background: 'rgba(168, 85, 247, 0.2)',
          color: '#c084fc',
        }}
      >
        {tag}
      </span>
    ));
  };

  const openActionModal = (faculty) => {
    setSelectedActionFaculty(faculty);
    setActionPhone(faculty.phone || '');
  };

  const closeActionModal = () => {
    setSelectedActionFaculty(null);
    setActionPhone('');
    setIsUpdatingPhone(false);
    setIsSendingReset(false);
  };

  const handleUpdatePhone = async () => {
    if (!selectedActionFaculty) return;
    setIsUpdatingPhone(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone: actionPhone.trim() })
        .eq('id', selectedActionFaculty.id);

      if (error) throw error;

      toast.success('Phone number updated successfully!');
      setFaculties((prev) =>
        prev.map((f) =>
          f.id === selectedActionFaculty.id ? { ...f, phone: actionPhone.trim() } : f,
        ),
      );
      setSelectedActionFaculty((prev) =>
        prev ? { ...prev, phone: actionPhone.trim() } : prev,
      );
    } catch (error) {
      toast.error('Failed to update phone: ' + error.message);
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!selectedActionFaculty?.email) {
      toast.error('No email found for this faculty');
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        selectedActionFaculty.email.trim(),
        { redirectTo: `${window.location.origin}/update-password` },
      );

      if (error) throw error;

      toast.success(`Password reset link sent to ${selectedActionFaculty.email}`);
    } catch (error) {
      toast.error('Failed to send reset link: ' + error.message);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Manage Faculty 👨‍🏫</h2>

      <div style={formContainerStyle}>
        <form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Full Name" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={inputStyle} />
            <input type="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Phone Number" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
          </div>
          
          <select 
            required 
            value={formData.branchId || ""} 
            onChange={(e) => setFormData({...formData, branchId: e.target.value})} 
            style={{...selectStyle, backgroundColor: '#1e1e2d', color: '#e0e0e0'}}
          >
            <option value="" disabled style={{ backgroundColor: '#1e1e2d', color: '#a0a0b0' }}>-- Select Department / Branch --</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id} style={{ backgroundColor: '#1e1e2d', color: '#ffffff' }}>
                {branch.name}
              </option>
            ))}
          </select>

          <button type="submit" style={submitButtonStyle} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : '✨ Add Faculty'}
          </button>
        </form>
      </div>

      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Email</th>
              <th style={tableHeaderStyle}>Phone</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faculties.map(faculty => (
              <tr
                key={faculty.id}
                style={{ ...tableRowStyle, cursor: 'pointer' }}
                onClick={() => openActionModal(faculty)}
              >
                <td style={tableCellStyle}>{faculty.full_name}</td>
                <td style={tableCellStyle}>{faculty.email || 'N/A'}</td>
                <td style={tableCellStyle}>{faculty.phone || 'N/A'}</td>
                <td style={tableCellStyle}>
                  <button onClick={(e) => { e.stopPropagation(); setHandoverModal({ isOpen: true, faculty }); }} style={deleteButtonStyle}>🗑️ Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Handover Modal */}
      {handoverModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ 
            backgroundColor: '#1c1d2e', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '16px', 
            padding: '28px', 
            width: '100%', 
            maxWidth: '480px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
            textAlign: 'center' 
          }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(245, 158, 11, 0.15)', 
              marginBottom: '16px' 
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>Handover Responsibilities</h3>
             <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
               Please choose how to handle the deletion of <strong style={{ color: '#fbbf24' }}>{handoverModal.faculty?.full_name}</strong>. You can assign a replacement for their active subjects, or delete them and leave their subjects unassigned.
             </p>
            
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Replacement Faculty
              </label>
              <select
                value={replacementId}
                onChange={(e) => setReplacementId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(45, 45, 61, 0.5)',
                  color: replacementId ? '#fff' : '#a0a0b0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                <option value="" disabled>-- Select Replacement Faculty --</option>
                {otherFaculties.map(f => (
                  <option key={f.id} value={f.id} style={{ backgroundColor: '#1e1e2d', color: '#ffffff' }}>
                    {f.full_name} {f.email ? `(${f.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => { setHandoverModal({ isOpen: false, faculty: null }); setReplacementId(''); }}
                disabled={isHandingOver}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b4063'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d314d'}
              >
                Cancel
              </button>
              <button 
                onClick={handleForceDelete}
                disabled={isHandingOver}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  border: '1px solid #ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Delete & Unassign
              </button>
              <button 
                onClick={handleHandoverAndDelete}
                disabled={isHandingOver || !replacementId}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  fontWeight: '600', 
                  color: 'white', 
                  backgroundColor: isHandingOver ? '#7f1d1d' : '#ef4444', 
                  border: 'none', 
                  cursor: isHandingOver || !replacementId ? 'not-allowed' : 'pointer', 
                  boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)', 
                  transition: 'background-color 0.2s',
                  opacity: isHandingOver || !replacementId ? 0.7 : 1
                }}
                onMouseOver={(e) => !isHandingOver && replacementId && (e.currentTarget.style.backgroundColor = '#dc2626')}
                onMouseOut={(e) => !isHandingOver && replacementId && (e.currentTarget.style.backgroundColor = '#ef4444')}
              >
                {isHandingOver ? 'Processing...' : 'Handover & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedActionFaculty && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
          }}
          onClick={closeActionModal}
        >
          <div
            style={{
              backgroundColor: '#1c1d2e',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: '#f1f5f9',
                }}
              >
                Faculty Actions
              </h3>
              <button
                onClick={closeActionModal}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <img
                src={getAvatarUrl(selectedActionFaculty)}
                alt={selectedActionFaculty.full_name || 'Faculty'}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(99,102,241,0.3)',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#f1f5f9',
                  }}
                >
                  {selectedActionFaculty.full_name || '—'}
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    marginTop: '0.25rem',
                  }}
                >
                  {selectedActionFaculty.email || 'N/A'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                marginBottom: '1.25rem',
              }}
            >
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  color: '#6366f1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Expertise
              </label>
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}
              >
                {renderExpertiseTags(selectedActionFaculty.expertise)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    color: '#6366f1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={actionPhone}
                  onChange={(e) => setActionPhone(e.target.value)}
                  placeholder="Enter phone number"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(20,20,40,0.5)',
                    color: '#f1f5f9',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleUpdatePhone}
                disabled={isUpdatingPhone}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: isUpdatingPhone ? 'not-allowed' : 'pointer',
                  background: isUpdatingPhone
                    ? 'rgba(99,102,241,0.4)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  opacity: isUpdatingPhone ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isUpdatingPhone ? 'Updating...' : 'Update Phone'}
              </button>
              <button
                onClick={handleSendResetLink}
                disabled={isSendingReset}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: isSendingReset ? 'not-allowed' : 'pointer',
                  background: isSendingReset
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  opacity: isSendingReset ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isSendingReset ? 'Sending...' : 'Send Password Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// STYLES
const containerStyle = { padding: '30px', minHeight: '100vh', background: '#0d0d14', color: '#e0e0e0', fontFamily: "'Inter', sans-serif" };
const headingStyle = { fontSize: '26px', fontWeight: '700', marginBottom: '25px', color: '#ffffff' };
const formContainerStyle = { background: 'rgba(26, 26, 38, 0.6)', backdropFilter: 'blur(12px)', padding: '28px', borderRadius: '16px', marginBottom: '30px', border: '1px solid rgba(255, 255, 255, 0.06)' };
const inputStyle = { flex: 1, minWidth: '240px', padding: '13px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(45, 45, 61, 0.5)', color: '#fff', outline: 'none', WebkitAppearance: 'none' };
const selectStyle = { ...inputStyle, width: '100%', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' };
const submitButtonStyle = { padding: '13px 28px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };
const tableContainerStyle = { ...formContainerStyle, padding: '24px', overflowX: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const tableHeaderRowStyle = { borderBottom: '2px solid rgba(255, 255, 255, 0.08)' };
const tableHeaderStyle = { padding: '12px 16px', color: '#a0a0b0', textTransform: 'uppercase', fontSize: '12px', textAlign: 'left' };
const tableRowStyle = { borderBottom: '1px solid rgba(255, 255, 255, 0.04)' };
const tableCellStyle = { padding: '14px 16px', color: '#e0e0e0' };
const deleteButtonStyle = { padding: '6px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' };

import { useState, useEffect } from 'react';
import { supabase, createTempClient } from '../../lib/supabase.js';
import toast from 'react-hot-toast';

export default function ManageFaculty() {
  const [faculties, setFaculties] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', branchId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Naya State: Delete Modal ke liye
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, facultyId: null });

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
      setFaculties(data);
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

     // ... upar ka supabase add wala code ...
      if (profileError) throw profileError;

      toast.success('Faculty added successfully. Default password is Test@123');
      alert('SUCCESS: Nayi faculty add ho gayi!');
      
      setFormData({ fullName: '', email: '', phone: '', branchId: '' });
      fetchFaculties();
    } catch (error) {
      toast.error('Error: ' + error.message);
      
      // 👉 ERROR CATCH KARNE WALA ALERT
      alert('ERROR AAYI HAI ADD MEIN: ' + error.message);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Naya Function: Jo actual me delete karta hai aur Toast dikhata hai
 const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', deleteModal.facultyId);

      if (error) throw error;

      setFaculties(prev => prev.filter(f => f.id !== deleteModal.facultyId));
      
      toast.success('Faculty deleted successfully!');
      alert('SUCCESS: Code yahan tak pahunch gaya! Delete ho gaya.');
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete faculty.');
      
      // 👉 ERROR CATCH KARNE WALA ALERT
      alert('ERROR AAYI HAI DELETE MEIN: ' + error.message); 
      
    } finally {
      setDeleteModal({ isOpen: false, facultyId: null });
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
              <tr key={faculty.id} style={tableRowStyle}>
                <td style={tableCellStyle}>{faculty.full_name}</td>
                <td style={tableCellStyle}>{faculty.email || 'N/A'}</td>
                <td style={tableCellStyle}>{faculty.phone || 'N/A'}</td>
                <td style={tableCellStyle}>
                  {/* BUTTON KI ONCLICK CHANGE KI HAI MODAL OPEN KARNE KE LIYE */}
                  <button onClick={() => setDeleteModal({ isOpen: true, facultyId: faculty.id })} style={deleteButtonStyle}>🗑️ Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🛑 PREMIUM DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>Delete Faculty?</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 24px 0', lineHeight: '1.5' }}>Are you sure you want to remove this faculty member? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                onClick={() => setDeleteModal({ isOpen: false, facultyId: null })}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b4063'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d314d'}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: 'white', backgroundColor: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)', transition: 'background-color 0.2s' }}
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
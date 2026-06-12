import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; 
import { createClient } from '@supabase/supabase-js'; 

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [formData, setFormData] = useState({ fullName: '', rollNumber: '', phone: '', email: '', batchId: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchBatches();
    fetchStudents();
  }, []);

  const fetchBatches = async () => {
    const { data, error } = await supabase.from('batches').select('*').order('semester', { ascending: true });
    if (!error && data) setBatches(data);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, batches(semester, section)')
      .eq('role', 'student');
    if (!error && data) setStudents(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔥 AUTO-INHERIT JUGAD: Keys apne aap purane connection se uth jayengi!
    const tempSupabase = createClient(supabase.supabaseUrl, supabase.supabaseKey, { 
      auth: { persistSession: false, autoRefreshToken: false } 
    });

    try {
      // 1. Student Auth Account Creation
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.rollNumber,
        options: {
          data: { role: 'student' }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Could not create user. Email might already exist.");

      // 2. Student Profile Creation
      const { error: profileError } = await supabase.from('user_profiles').insert([{
        id: authData.user.id,
        full_name: formData.fullName,
        roll_number: formData.rollNumber,
        phone: formData.phone,
        role: 'student',
        batch_id: formData.batchId,
        college_id: '11111111-0000-0000-0000-000000000001',
        is_active: true
      }]);

      if (profileError) throw profileError;

      setToast({ message: 'Student Registered Successfully! 🎉 Password is Roll No.', type: 'success' });
      setFormData({ fullName: '', rollNumber: '', phone: '', email: '', batchId: '' });
      fetchStudents(); 
      
    } catch (error) {
      setToast({ message: 'Error: ' + error.message, type: 'error' });
    }
    
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      const { error } = await supabase.from('user_profiles').delete().eq('id', studentId);

      if (error) {
        alert('Error deleting student: ' + error.message);
        return;
      }

      setStudents(prev => prev.filter(s => s.id !== studentId));
      alert("Student deleted successfully!");
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h2>Manage Students 🎓</h2>
      
      {toast && (
        <div style={{ padding: '15px', background: toast.type === 'success' ? '#22c55e' : '#ef4444', marginBottom: '20px', borderRadius: '8px', fontWeight: 'bold' }}>
          {toast.message}
        </div>
      )}

      <div style={{ background: '#1e1e2d', padding: '25px', borderRadius: '12px', marginBottom: '30px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Full Name" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Roll Number" required value={formData.rollNumber} onChange={(e) => setFormData({...formData, rollNumber: e.target.value})} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <input type="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
          </div>

          <select required value={formData.batchId} onChange={(e) => setFormData({...formData, batchId: e.target.value})} style={inputStyle}>
            <option value="">-- Select Batch --</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>
                Semester {batch.semester} - Sec {batch.section}
              </option>
            ))}
          </select>

          <button type="submit" style={{ padding: '12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>
            Register Student
          </button>
        </form>
      </div>

      <div style={{ background: '#1e1e2d', padding: '20px', borderRadius: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Roll Number</th>
              <th style={{ padding: '12px' }}>Batch</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '12px' }}>{student.full_name}</td>
                <td style={{ padding: '12px' }}>{student.roll_number}</td>
                <td style={{ padding: '12px' }}>
                  {student.batches ? `Sem ${student.batches.semester} - Sec ${student.batches.section}` : 'N/A'}
                </td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleDeleteStudent(student.id)} style={deleteButtonStyle}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: '1',
  minWidth: '250px',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #333',
  background: '#2d2d3d',
  color: '#fff',
  fontSize: '15px'
};

const deleteButtonStyle = {
  padding: '6px 10px',
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold'
};

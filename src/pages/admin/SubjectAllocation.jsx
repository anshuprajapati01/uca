import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import './SubjectAllocation.css';

export default function SubjectAllocation() {
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      // Fetch all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*');
      
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
      }
      
      // Fetch all faculty members
      const { data: facultyData, error: facultyError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'faculty');
      
      if (facultyError) {
        console.error('Error fetching faculty:', facultyError);
      }
      
      setSubjects(subjectsData || []);
      setFaculty(facultyData || []);
      setLoading(false);
    }
    
    loadData();
  }, []);

  async function handleFacultyChange(subjectId, facultyId) {
    const { error } = await supabase
      .from('subjects')
      .update({ faculty_id: facultyId === '' ? null : facultyId })
      .eq('id', subjectId);
    
    if (error) {
      console.error('Error updating subject:', error);
      setToast({ message: 'Failed to assign faculty.', type: 'error' });
      setTimeout(() => setToast({ message: '', type: '' }), 3000);
      return;
    }
    
    // Update local state
    setSubjects(prev => 
      prev.map(s => s.id === subjectId ? { ...s, faculty_id: facultyId || null } : s)
    );
    
    // Show success toast
    setToast({ message: 'Faculty assigned successfully! 🎉', type: 'success' });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  }

  if (loading) {
    return <div className="allocation-status">Loading subjects...</div>;
  }

  return (
    <div className="allocation-container">
      <header className="allocation-header">
        <h2>Subject Allocation</h2>
      </header>
      
      {toast.message && (
        <div className={`custom-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Name</th>
              <th>Semester</th>
              <th>Assigned Faculty</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(subject => (
              <tr key={subject.id}>
                <td>
                  <span className="subject-badge">{subject.code}</span>
                </td>
                <td>{subject.name}</td>
                <td>{subject.semester}</td>
                <td>
                  <select
                    value={subject.faculty_id || ''}
                    onChange={e => handleFacultyChange(subject.id, e.target.value)}
                    className="faculty-dropdown"
                  >
                    <option value="">-- Unassigned --</option>
                    {faculty.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.full_name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
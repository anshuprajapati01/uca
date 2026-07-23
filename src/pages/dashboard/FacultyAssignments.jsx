import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { Plus, X, Calendar, FileText, Award, Users, Trash2 } from 'lucide-react';

export default function FacultyAssignments() {
  const [categories, setCategories] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionMode, setSubmissionMode] = useState('Online');
  const [isTesIncluded, setIsTesIncluded] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);

  const [subjectId, setSubjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState(10);
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingForm, setGradingForm] = useState({});
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkGrades, setBulkGrades] = useState({});
  const [bulkSectionFilter, setBulkSectionFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [categoriesRes, subjectsRes, assignmentsRes] = await Promise.all([
          supabase.from('assignment_categories').select('*').order('name'),
          supabase.from('subjects').select('*').eq('faculty_id', user.id),
          supabase
            .from('assignments')
            .select('*, subjects(name), assignment_categories(name)')
            .eq('faculty_id', user.id)
            .eq('is_tes_included', false)
            .order('due_date', { ascending: true }),
        ]);

        if (categoriesRes.error) throw categoriesRes.error;
        if (subjectsRes.error) throw subjectsRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;

        if (!cancelled) {
          setCategories(categoriesRes.data || []);
          setMySubjects(subjectsRes.data || []);
          setMyAssignments(assignmentsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load assignments data:', err);
        toast.error('Failed to load assignments data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const resetForm = () => {
    setSubjectId('');
    setCategoryId('');
    setTitle('');
    setDescription('');
    setDueDate('');
    setMaxMarks(10);
    setSubmissionMode('Online');
    setIsTesIncluded(false);
    setMaxMarks(10);
    setAttachment(null);
    setGradingAssignment(null);
    setSubmissions([]);
    setGradingForm({});
  };

  const openGrading = async (assignment) => {
    setGradingAssignment(assignment);
    setSubmissions([]);
    setGradingForm({});
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*, student:user_profiles!assignment_submissions_student_id_fkey(full_name)')
        .eq('assignment_id', assignment.id);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      toast.error('Failed to load submissions.');
    }
  };

  const closeGrading = () => {
    setGradingAssignment(null);
    setSubmissions([]);
    setGradingForm({});
  };
const openBulkGrading = async (assignment) => {
    setGradingAssignment(assignment);
    setBulkGrades({});
    setBulkSectionFilter('All');
    try {
      // 1. Assignment ka subject fetch karo taaki uski year/branch pata chale
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id, year, department')
        .eq('id', assignment.subject_id)
        .single();

      if (subjectError) throw subjectError;

      // 2. Sirf us subject ke year + branch ke students lao (privacy scope).
      //    Faculty sirf apne subject ke valid students ko hi dekhega.
      const { data: allStudents, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, full_name, roll_number, section, selected_year, selected_branch, branch_id')
        .eq('role', 'student')
        .eq('selected_year', subject.year)
        .eq('selected_branch', subject.department);

      if (studentsError) throw studentsError;

      // 3. Sirf DUMMY/Test hatayenge
      const validStudents = (allStudents || []).filter(s => {
        if (!s.full_name) return false;
        const name = s.full_name.toLowerCase();
        return !(name.includes('dummy') || name.includes('test') || name.includes('demo') || name.includes('user'));
      });

      // 4. Roll Number ke hisaab se sort karo (grading ke liye aasan)
      const sortedStudents = [...validStudents].sort((a, b) => {
        const ra = a.roll_number || '';
        const rb = b.roll_number || '';
        return ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
      });

      // 5. Pehle se diye marks lao
      const { data: existing } = await supabase.from('assignment_submissions').select('*').eq('assignment_id', assignment.id);

      const gradesMap = {};
      (existing || []).forEach((sub) => {
        gradesMap[sub.student_id] = { marks: sub.marks ?? '', feedback: sub.feedback ?? '' };
      });

      setBulkStudents(sortedStudents);
      setBulkGrades(gradesMap);
      setIsBulkModalOpen(true);
    } catch (err) {
      console.error('Failed to load bulk grading data:', err);
      toast.error('Failed to load students.');
    }
  };

  const closeBulkGrading = () => {
    setIsBulkModalOpen(false);
    setBulkStudents([]);
    setBulkGrades({});
    setBulkSectionFilter('All');
    setGradingAssignment(null);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setMyAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success('Assignment deleted successfully!');
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      toast.error('Failed to delete assignment. Please try again.');
    } finally {
      setAssignmentToDelete(null);
    }
  };

  const saveBulkGrades = async () => {
    // Sirf active section ke students ko save karo (All = sab)
    const studentsToSave = bulkStudents.filter((s) =>
      bulkSectionFilter === 'All' ? true : (s.section || '').toUpperCase() === bulkSectionFilter,
    );

    const upsertData = studentsToSave
      .map((student) => {
        const data = bulkGrades[student.id] || {};
        return {
          assignment_id: gradingAssignment.id,
          student_id: student.id,
          marks: data.marks !== '' ? Number(data.marks) : null,
          feedback: data.feedback?.trim() || '',
          status: 'Graded',
          submission_url: 'Offline Physical Submission',
          graded_at: new Date().toISOString(),
        };
      })
      .filter((item) => item.marks !== null);

    if (upsertData.length === 0) {
      toast.error('Please enter marks for at least one student.');
      return;
    }

    try {
      const { error } = await supabase.from('assignment_submissions').upsert(upsertData, { onConflict: 'assignment_id, student_id' });
      if (error) throw error;
      toast.success('All grades saved successfully!');
      closeBulkGrading();
    } catch (err) {
      console.error('Failed to save bulk grades:', err);
      toast.error('Failed to save grades. Please try again.');
    }
  };

  const handleBulkGradeChange = (studentId, field, value) => {
    setBulkGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleSaveGrade = async (submissionId) => {
    const entry = gradingForm[submissionId] || {};
    const marks = entry.marks;
    const feedback = entry.feedback || '';

    if (marks === undefined || marks === null || marks === '') {
      toast.error('Please enter marks before saving.');
      return;
    }

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          marks: Number(marks),
          feedback: feedback.trim(),
          status: 'Graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Grade saved!');
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, marks: Number(marks), feedback: feedback.trim(), status: 'Graded', graded_at: new Date().toISOString() } : s)),
      );
    } catch (err) {
      console.error('Failed to save grade:', err);
      toast.error('Failed to save grade. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectId || !categoryId || !title.trim() || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let attachmentUrl = null;

      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, attachment);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

      const { error } = await supabase.from('assignments').insert([
        {
          faculty_id: user.id,
          subject_id: subjectId,
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate,
          max_marks: Number(maxMarks),
          attachment_url: attachmentUrl,
          submission_mode: submissionMode,
          is_tes_included: isTesIncluded,
        },
      ]);

      if (error) throw error;

      toast.success('Assignment created successfully!');
      setIsModalOpen(false);
      resetForm();

      const { data: updated } = await supabase
        .from('assignments')
        .select('*, subjects(name), assignment_categories(name)')
        .eq('faculty_id', user.id)
        .order('due_date', { ascending: true });

      setMyAssignments(updated || []);
    } catch (err) {
      console.error('Failed to create assignment:', err);
      toast.error('Failed to create assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
        Loading assignments…
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
          Manage Assignments
        </h2>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
          }}
        >
          <Plus size={18} /> Create Assignment
        </button>
      </div>

      {myAssignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#151623', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', color: '#9ca3af' }}>
          <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No assignments yet. Create your first one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {myAssignments.map((assignment) => (
            <div
              key={assignment.id}
              style={{
                backgroundColor: '#1c1d2e',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', margin: '0 0 4px 0' }}>
                    {assignment.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {assignment.assignment_categories?.name || 'Assignment'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9ca3af', fontSize: '0.875rem', marginLeft: 'auto' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {formatDate(assignment.due_date)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} /> {assignment.max_marks} marks
                  </span>
                  {assignment.submission_mode && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: assignment.submission_mode === 'Offline' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: assignment.submission_mode === 'Offline' ? '#f59e0b' : '#818cf8',
                      border: assignment.submission_mode === 'Offline' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                    }}>
                       {assignment.submission_mode === 'Offline' ? 'Physical Submission' : 'Online Submission'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAssignmentToDelete(assignment.id)}
                    title="Delete assignment"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                {assignment.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', color: '#9ca3af', fontSize: '0.875rem' }}>
                <span>Subject: {assignment.subjects?.name || '—'}</span>
                {assignment.attachment_url && (
                  <a
                    href={assignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600' }}
                  >
                    View Attachment
                  </a>
                )}
</div>
              <button
                type="button"
                onClick={() => assignment.submission_mode === 'Offline' ? openBulkGrading(assignment) : openGrading(assignment)}
                style={{
                  marginTop: '8px',
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: assignment.submission_mode === 'Offline' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: assignment.submission_mode === 'Offline' ? '#f59e0b' : '#818cf8',
                  border: assignment.submission_mode === 'Offline' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                }}
              >
                <Users size={16} /> {assignment.submission_mode === 'Offline' ? 'Bulk Grading (Grid)' : 'View Submissions'}
              </button>
            </div>
          ))}
        </div>
      )}

      {isBulkModalOpen && gradingAssignment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>

          {/* Main Modal Box (maxHeight: 85vh restricts it from getting too big) */}
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', width: '100%', maxWidth: '760px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ backgroundColor: '#1c1d2e', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px 24px', zIndex: 10 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Bulk Grading: {gradingAssignment.title}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                Max Marks: {gradingAssignment.max_marks}
              </p>
            </div>

            {/* Section Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', backgroundColor: '#11131f', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#d1d5db' }}>Filter by Section:</label>
              {['All', 'B1', 'B2'].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setBulkSectionFilter(sec)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    backgroundColor: bulkSectionFilter === sec ? '#6366f1' : 'transparent',
                    color: bulkSectionFilter === sec ? 'white' : '#9ca3af',
                    borderColor: bulkSectionFilter === sec ? '#6366f1' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* Scrollable Table Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0', maxHeight: '55vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#1c1d2e', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' }}>
                    <th style={{ backgroundColor: '#1c1d2e', padding: '14px 24px', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', width: '40%' }}>Student Name</th>
                    <th style={{ backgroundColor: '#1c1d2e', padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', width: '30%' }}>Roll Number</th>
                    <th style={{ backgroundColor: '#1c1d2e', padding: '14px 24px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', color: '#d1d5db', borderBottom: '1px solid #2d314d', width: '30%' }}>Marks (out of {gradingAssignment.max_marks})</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = bulkStudents.filter((s) =>
                      bulkSectionFilter === 'All' ? true : (s.section || '').toUpperCase() === bulkSectionFilter,
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>No students found.</td>
                        </tr>
                      );
                    }
                    return filtered.map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 24px', fontSize: '0.875rem', color: 'white' }}>{student.full_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#94a3b8' }}>{student.roll_number || '—'}</td>
                        <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max={gradingAssignment.max_marks}
                            value={bulkGrades[student.id]?.marks ?? ''}
                            onChange={(e) => handleBulkGradeChange(student.id, 'marks', e.target.value)}
                            style={{
                              width: '110px', textAlign: 'center', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '8px 10px', borderRadius: '6px', fontSize: '0.9rem', outline: 'none'
                            }}
                          />
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div style={{ backgroundColor: '#1c1d2e', borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 10 }}>
              <button
                type="button"
                onClick={closeBulkGrading}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBulkGrades}
                style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: 'white', backgroundColor: '#059669', border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' }}
              >
                Save All Grades
              </button>
            </div>

          </div>
        </div>
      )}

      {gradingAssignment && !isBulkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Grading: {gradingAssignment.title} (Max Marks: {gradingAssignment.max_marks})
              </h3>
              <button type="button" onClick={closeGrading} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            {submissions.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    style={{
                      backgroundColor: '#11131f',
                      borderRadius: '12px',
                      border: '1px solid #2d314d',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                       <div>
                          <p style={{ color: 'white', fontWeight: '600', margin: '0 0 4px 0' }}>
                           {submission.student?.full_name || 'Unknown Student'}
                         </p>
                       </div>
                      <a
                        href={submission.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}
                      >
                        View Student's Work
                      </a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marks</label>
                        <input
                          type="number"
                          min="0"
                          value={gradingForm[submission.id]?.marks ?? submission.marks ?? ''}
                          onChange={(e) =>
                            setGradingForm((prev) => ({
                              ...prev,
                              [submission.id]: { ...prev[submission.id], marks: e.target.value },
                            }))
                          }
                          style={{
                            width: '100%',
                            backgroundColor: '#1c1d2e',
                            border: '1px solid #2d314d',
                            color: 'white',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Feedback</label>
                        <input
                          type="text"
                          value={gradingForm[submission.id]?.feedback ?? submission.feedback ?? ''}
                          onChange={(e) =>
                            setGradingForm((prev) => ({
                              ...prev,
                              [submission.id]: { ...prev[submission.id], feedback: e.target.value },
                            }))
                          }
                          style={{
                            width: '100%',
                            backgroundColor: '#1c1d2e',
                            border: '1px solid #2d314d',
                            color: 'white',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveGrade(submission.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          color: 'white',
                          backgroundColor: submission.status === 'Graded' ? '#059669' : '#6366f1',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {submission.status === 'Graded' ? 'Update Grade' : 'Save Grade'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}




        {isModalOpen && (
          <div
            onClick={() => setIsModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#1c1d2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  Create Assignment
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                    style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                  >
                    <option value="">-- Select Subject --</option>
                    {mySubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                  <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                  >
                    <option value="">-- Select Category --</option>
                    {categories
                      .filter((category) =>
                        isTesIncluded
                          ? ['Tutorial', 'Assignment', 'Quiz'].includes(category.name)
                          : true,
                      )
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Assignment title"
                    style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Optional description"
                    style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '12px 14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isTesIncluded}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsTesIncluded(checked);
                        if (checked) {
                          setMaxMarks(10);
                          const isTesCategory = ['Tutorial', 'Assignment', 'Quiz'].some(
                            (name) => categories.find((c) => c.id === categoryId)?.name === name,
                          );
                          if (!isTesCategory) {
                            const assignmentCat = categories.find((c) => c.name === 'Assignment');
                            setCategoryId(assignmentCat ? assignmentCat.id : '');
                          }
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fbbf24' }}>
                      Include in Official Internal Assessment (TES T/A/Q)
                    </span>
                  </label>
                  <p style={{ margin: '6px 0 0 28px', fontSize: '0.75rem', color: '#9ca3af' }}>
                    If checked, marks will be included in the final official 30-mark internal calculation sheet.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {submissionMode === 'Offline' ? 'Test / Submission Date' : 'Due Date'}
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                      style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Max Marks {isTesIncluded && <span style={{ color: '#f59e0b' }}>(TES locked: 10)</span>}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={maxMarks}
                      disabled={isTesIncluded}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      required
                      style={{ width: '100%', backgroundColor: isTesIncluded ? '#1a1b2a' : '#11131f', border: '1px solid #2d314d', color: isTesIncluded ? '#9ca3af' : 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', cursor: isTesIncluded ? 'not-allowed' : 'text' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Submission Mode
                  </label>
                  <select
                    value={submissionMode}
                    onChange={(e) => setSubmissionMode(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Attachment (optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    style={{ width: '100%', backgroundColor: '#11131f', border: '1px solid #2d314d', color: 'white', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      color: 'white',
                      backgroundColor: isSubmitting ? '#4b5563' : '#6366f1',
                      border: 'none',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      boxShadow: isSubmitting ? 'none' : '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    {isSubmitting ? (isUploading ? 'Uploading…' : 'Creating…') : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {assignmentToDelete && (
          <div
            onClick={() => setAssignmentToDelete(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#1c1d2e',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', margin: '0 0 12px 0' }}>
                Delete Assignment
              </h3>
              <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                Are you sure you want to delete this assignment? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAssignmentToDelete(null)}
                  style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#d1d5db', backgroundColor: '#2d314d', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAssignment(assignmentToDelete)}
                  style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: 'white', backgroundColor: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </>
    );
  }

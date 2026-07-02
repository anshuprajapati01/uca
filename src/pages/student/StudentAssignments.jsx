import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import { X, Calendar, Award, FileText, Upload } from 'lucide-react';

export default function StudentAssignments({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const assignmentsRes = await supabase
          .from('assignments')
          .select('*, subjects(name)')
          .eq('status', 'Published')
          .order('due_date', { ascending: true });

        if (assignmentsRes.error) throw assignmentsRes.error;

        const submissionsRes = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', user.id);

        if (submissionsRes.error) throw submissionsRes.error;

        const { data: labData, error: labError } = await supabase
          .from('lab_evaluations')
          .select('*, subjects(name)')
          .eq('student_id', user.id);

        if (!cancelled) {
          setAssignments(assignmentsRes.data || []);
          setSubmissions(submissionsRes.data || []);
          if (!labError && labData) {
            setLabResults(labData);
          }
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
        toast.error('Failed to load assignments.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user.id]);

  const submittedAssignmentIds = new Set(submissions.map((s) => s.assignment_id));
  const pendingAssignments = assignments.filter((a) => !submittedAssignmentIds.has(a.id));
  const completedAssignments = assignments.filter((a) => submittedAssignmentIds.has(a.id));

  const openSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAssignment(null);
    setSubmissionFile(null);
    setIsUploading(false);
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    if (!submissionFile) {
      toast.error('Please select a file to submit.');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);
    try {
      const filePath = `submissions/${user.id}/${Date.now()}_${submissionFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(filePath, submissionFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('assignment_submissions')
        .insert([
          {
            assignment_id: selectedAssignment.id,
            student_id: user.id,
            submission_url: publicUrl,
            status: 'Submitted',
          },
        ]);

      if (insertError) throw insertError;

      toast.success('Assignment submitted successfully!');
      closeModal();

      const { data: updatedSubmissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user.id);

      setSubmissions(updatedSubmissions || []);
    } catch (err) {
      console.error('Failed to submit assignment:', err);
      toast.error('Failed to submit assignment. Please try again.');
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

 const AssignmentCard = ({ assignment, isPending }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: '0 0 4px 0' }}>{assignment.title}</h3>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {assignment.assignment_categories?.name || 'Assignment'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9ca3af', fontSize: '0.875rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatDate(assignment.due_date)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Award size={14} /> {assignment.max_marks} marks</span>
        </div>
      </div>

      {/* Description */}
      <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
        {assignment.description}
      </p>

      {/* Subject & Download Link */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', color: '#9ca3af', fontSize: '0.875rem' }}>
        <span>Subject: {assignment.subjects?.name || '—'}</span>
        {assignment.attachment_url && (
          <a
            href={assignment.attachment_url} target="_blank" rel="noopener noreferrer"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)'; e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'; e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.2)'; }}
            style={{
              color: '#60a5fa', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(96, 165, 250, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.2)', transition: 'all 0.2s ease'
            }}
          >
            📎 Download Question Paper
          </a>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          {assignment.submission_mode === 'Online' ? (
            <button
              onClick={() => openSubmitModal(assignment)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.7)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px',
                background: 'rgba(99, 102, 241, 0.7)', border: '1px solid rgba(99, 102, 241, 0.5)', color: 'white',
                borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
              }}
            >
              <Upload size={18} /> Submit Work
            </button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', color: '#fde68a', fontSize: '0.9rem', fontWeight: '500' }}>
              ⚠️ Submit physical copy in class
            </div>
          )}
        </div>
      )}
    </div>
  );
  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
        Loading assignments…
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>
        📋 My Assignments
      </h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: activeTab === 'pending' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (activeTab === 'pending' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.1)'),
            color: '#e2e8f0',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          ⏳ Pending ({pendingAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: activeTab === 'submitted' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
            border: '1px solid ' + (activeTab === 'submitted' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.1)'),
            color: '#e2e8f0',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          ✅ Submitted ({completedAssignments.length})
        </button>
      </div>

      {activeTab === 'pending' && pendingAssignments.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: '#151623',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
          color: '#9ca3af',
        }}>
          <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No pending assignments.</p>
        </div>
      )}

      {activeTab === 'submitted' && completedAssignments.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: '#151623',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
          color: '#9ca3af',
        }}>
          <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No submitted assignments yet.</p>
        </div>
      )}

<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'pending' && pendingAssignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} isPending />
        ))}
        {activeTab === 'submitted' && completedAssignments.map((assignment) => {
          const submission = submissions.find((s) => s.assignment_id === assignment.id);
          return (
            <div
              key={assignment.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9ca3af', fontSize: '0.875rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {formatDate(assignment.due_date)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} /> {assignment.max_marks} marks
                  </span>
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
                    style={{
                      color: '#60a5fa',
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    📎 Download Question Paper
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                <span>Submitted on: {submission ? new Date(submission.submitted_at).toLocaleString() : '—'}</span>
                {submission && (
                  <a
                    href={submission.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#60a5fa',
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    📄 View My Submission
                  </a>
                )}
              </div>
              {submission?.status === 'Graded' && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}>
                    Marks: {submission.marks} / {assignment.max_marks}
                  </span>
                  {submission.feedback && (
                    <span style={{ color: '#d1d5db', fontSize: '0.85rem' }}>
                      Feedback: {submission.feedback}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginTop: '32px', marginBottom: '24px' }}>🧪 Lab Performance (LES)</h2>

      {labResults.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: '#151623',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
          color: '#9ca3af',
        }}>
          <p style={{ margin: 0 }}>No lab evaluations published yet.</p>
        </div>
      ) : (
        labResults.map((result) => {
          const lSum = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'].reduce((acc, l) => acc + (parseFloat(result[l]) || 0), 0);
          const compA = (lSum / 200) * 10;
          const compB = ((parseFloat(result.lt) || 0) / 30) * 10;
          const compC = parseFloat(result.conduct) || 0;
          const finalMarks = (compA + compB + compC).toFixed(1);
          return (
            <div key={result.id} style={{ backgroundColor: '#1c1d2e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{result.subjects?.name || 'Unknown Subject'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>Labs Total: {lSum} / 200</span>
                  <span style={{ color: '#60a5fa', fontSize: '0.875rem' }}>({compA.toFixed(1)} / 10)</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>Lab Test (LT): {result.lt || 0} / 30</span>
                  <span style={{ color: '#60a5fa', fontSize: '0.875rem' }}>({compB.toFixed(1)} / 10)</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Conduct: {compC} / 5</span>
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.25rem', display: 'inline-block', width: 'fit-content' }}>
                Final Score: {finalMarks} / 25
              </div>
            </div>
          );
        })
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: '#1c1d2e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Submit Assignment</h3>
              <button type="button" onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmission} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px' }}>Assignment</label>
                <div style={{
                  width: '100%',
                  backgroundColor: '#11131f',
                  border: '1px solid #2d314d',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}>
                  {selectedAssignment?.title || '—'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#d1d5db', marginBottom: '6px' }}>Upload Your Work</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip"
                  onChange={(e) => setSubmissionFile(e.target.files[0])}
                  disabled={isUploading}
                  style={{
                    width: '100%',
                    backgroundColor: '#11131f',
                    border: '1px solid #2d314d',
                    color: 'white',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                {submissionFile && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
                    Selected: {submissionFile.name}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: '#d1d5db',
                    backgroundColor: '#2d314d',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: '#6366f1',
                    border: 'none',
                    cursor: (isSubmitting || isUploading) ? 'not-allowed' : 'pointer',
                    opacity: (isSubmitting || isUploading) ? 0.7 : 1,
                    fontSize: '0.875rem',
                    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {isUploading ? 'Uploading...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

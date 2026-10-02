import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';
import {
  X, Calendar, Award, FileText, Upload,
  ClipboardList, FlaskConical, Hourglass, SquareCheck,
  Paperclip, TriangleAlert,
} from 'lucide-react';
import './StudentAssignments.css';

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
    <div className="sa-card">
      {/* Header */}
      <div className="sa-card__head">
        <div>
          <h3 className="sa-card__title">{assignment.title}</h3>
          <span className="sa-card__cat">
            {assignment.assignment_categories?.name || 'Assignment'}
          </span>
        </div>
        <div className="sa-card__meta">
          <span><Calendar size={14} aria-hidden="true" /> {formatDate(assignment.due_date)}</span>
          <span><Award size={14} aria-hidden="true" /> {assignment.max_marks} marks</span>
        </div>
      </div>

      {/* Description */}
      <p className="sa-card__desc">
        {assignment.description}
      </p>

      {/* Subject & Download Link */}
      <div className="sa-card__row">
        <span>Subject: {assignment.subjects?.name || '—'}</span>
        {assignment.attachment_url && (
          <a
            className="sa-link sa-link--chip"
            href={assignment.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Paperclip size={14} aria-hidden="true" />
            Download Question Paper
          </a>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="sa-card__actions">
          {assignment.submission_mode === 'Online' ? (
            <button className="sa-btn-primary" onClick={() => openSubmitModal(assignment)}>
              <Upload size={18} aria-hidden="true" /> Submit Work
            </button>
          ) : (
            <div className="sa-btn-offline">
              <TriangleAlert size={16} aria-hidden="true" />
              Submit physical copy in class
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <div className="sa-loading">Loading assignments…</div>;
  }

  return (
    <>
      <h2 className="sa-title">
        <ClipboardList size={20} aria-hidden="true" />
        My Assignments
      </h2>

      <div className="sa-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`sa-tab ${activeTab === 'pending' ? 'sa-tab--active' : ''}`}
        >
          <Hourglass size={16} aria-hidden="true" />
          Pending ({pendingAssignments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submitted')}
          className={`sa-tab ${activeTab === 'submitted' ? 'sa-tab--active' : ''}`}
        >
          <SquareCheck size={16} aria-hidden="true" />
          Submitted ({completedAssignments.length})
        </button>
      </div>

      {activeTab === 'pending' && pendingAssignments.length === 0 && (
        <div className="sa-empty">
          <FileText size={48} strokeWidth={1} className="sa-empty__icon" aria-hidden="true" />
          <p>No pending assignments.</p>
        </div>
      )}

      {activeTab === 'submitted' && completedAssignments.length === 0 && (
        <div className="sa-empty">
          <FileText size={48} strokeWidth={1} className="sa-empty__icon" aria-hidden="true" />
          <p>No submitted assignments yet.</p>
        </div>
      )}

      <div className="sa-list">
        {activeTab === 'pending' && pendingAssignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} isPending />
        ))}
        {activeTab === 'submitted' && completedAssignments.map((assignment) => {
          const submission = submissions.find((s) => s.assignment_id === assignment.id);
          return (
            <div key={assignment.id} className="sa-card">
              <div className="sa-card__head">
                <div>
                  <h3 className="sa-card__title">{assignment.title}</h3>
                  <span className="sa-card__cat">
                    {assignment.assignment_categories?.name || 'Assignment'}
                  </span>
                </div>
                <div className="sa-card__meta">
                  <span>
                    <Calendar size={14} aria-hidden="true" /> {formatDate(assignment.due_date)}
                  </span>
                  <span>
                    <Award size={14} aria-hidden="true" /> {assignment.max_marks} marks
                  </span>
                </div>
              </div>
              <p className="sa-card__desc">{assignment.description}</p>
              <div className="sa-card__row">
                <span>Subject: {assignment.subjects?.name || '—'}</span>
                {assignment.attachment_url && (
                  <a
                    className="sa-link sa-link--underline"
                    href={assignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Paperclip size={14} aria-hidden="true" />
                    Download Question Paper
                  </a>
                )}
              </div>
              <div className="sa-card__row">
                <span>Submitted on: {submission ? new Date(submission.submitted_at).toLocaleString() : '—'}</span>
                {submission && assignment.submission_mode !== 'Offline' && submission.submission_url && (
                  <a
                    className="sa-link sa-link--underline"
                    href={submission.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={14} aria-hidden="true" />
                    View My Submission
                  </a>
                )}
              </div>
              {submission?.status === 'Graded' && (
                <div className="sa-marks">
                  <span className="sa-marks__pill">
                    Marks: {submission.marks} / {assignment.max_marks}
                  </span>
                  {submission.feedback && (
                    <span className="sa-marks__feedback">Feedback: {submission.feedback}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="sa-title sa-title--spaced">
        <FlaskConical size={20} aria-hidden="true" />
        Lab Performance (LES)
      </h2>

      {labResults.length === 0 ? (
        <div className="sa-empty">
          <p>No lab evaluations published yet.</p>
        </div>
      ) : (
        labResults.map((result) => {
          const lSum = ['l1','l2','l3','l4','l5','l6','l7','l8','l9','l10'].reduce((acc, l) => acc + (parseFloat(result[l]) || 0), 0);
          const compA = (lSum / 200) * 10;
          const compB = ((parseFloat(result.lt) || 0) / 30) * 10;
          const compC = parseFloat(result.conduct) || 0;
          const finalMarks = (compA + compB + compC).toFixed(1);
          return (
            <div key={result.id} className="sa-lab">
              <h3 className="sa-lab__title">{result.subjects?.name || 'Unknown Subject'}</h3>
              <div className="sa-lab__stats">
                <div>
                  <span className="sa-lab__label">Labs Total: {lSum} / 200</span>
                  <span className="sa-lab__sub">({compA.toFixed(1)} / 10)</span>
                </div>
                <div>
                  <span className="sa-lab__label">Lab Test (LT): {result.lt || 0} / 30</span>
                  <span className="sa-lab__sub">({compB.toFixed(1)} / 10)</span>
                </div>
                <div>
                  <span className="sa-lab__label">Conduct: {compC} / 5</span>
                </div>
              </div>
              <div className="sa-lab__final">Final Score: {finalMarks} / 25</div>
            </div>
          );
        })
      )}

      {isModalOpen && (
        <div className="sa-modal-overlay">
          <div className="sa-modal">
            <div className="sa-modal__head">
              <h3 className="sa-modal__title">Submit Assignment</h3>
              <button type="button" onClick={closeModal} className="sa-close" aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmission} className="sa-form">
              <div>
                <label className="sa-label">Assignment</label>
                <div className="sa-readonly">
                  {selectedAssignment?.title || '—'}
                </div>
              </div>

              <div>
                <label className="sa-label">Upload Your Work</label>
                <input
                  type="file"
                  className="sa-file"
                  accept=".pdf,.doc,.docx,.zip"
                  onChange={(e) => setSubmissionFile(e.target.files[0])}
                  disabled={isUploading}
                />
                {submissionFile && (
                  <p className="sa-selected">Selected: {submissionFile.name}</p>
                )}
              </div>

              <div className="sa-form__actions">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="sa-btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || isUploading} className="sa-btn-submit">
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

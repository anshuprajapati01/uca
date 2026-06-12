import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import useStudentSubjects from '../../hooks/useStudentSubjects';
import './StudentSubjects.css';

export default function StudentSubjects() {
  const navigate = useNavigate();
  const { subjects, isLoading, error } = useStudentSubjects();

  if (isLoading) {
    return <div>Loading your subjects...</div>;
  }

  if (error) {
    return (
      <p className="dashboard-resources__status dashboard-resources__status--error">
        Unable to load subjects. Please try again later.
      </p>
    );
  }

  return (
    <>
      <header className="student-subjects__header">
        <h2>My Subjects</h2>
      </header>

      {subjects.length === 0 ? (
        <p className="dashboard-resources__status">No subjects available yet.</p>
      ) : (
        <div className="student-subjects__grid">
          {subjects.map((subject) => (
            <div key={subject.id} className="subject-card">
              <div className="subject-card__icon">
                <BookOpen size={22} />
              </div>
              <div className="subject-card__body">
                <h3 className="subject-card__name">{subject.name}</h3>
                <span className="subject-card__code">{subject.code}</span>
                <div className="subject-card__meta">
                  <span>Semester {subject.semester}</span>
                  <span>{subject.credits} Credits</span>
                </div>
                <div className="subject-card__progress">
                  <div className="subject-card__progress-bar" />
                </div>
                <button
                  type="button"
                  className="subject-card__syllabus-btn"
                  onClick={() => navigate(`/student/subjects/${subject.id}`)}
                >
                  Start Learning
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

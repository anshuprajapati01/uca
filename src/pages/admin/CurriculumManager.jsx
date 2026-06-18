import { useState } from 'react';
import './CurriculumManager.css';

const HOD_BRANCHES = [
  { id: 'cs', name: 'Computer Science', code: 'CS' },
  { id: 'it', name: 'Information Technology', code: 'IT' }
];

const BRANCH_SEMESTERS = [
  { id: 'sem3', name: 'Semester 3', year: '2nd Year', isLive: false },
  { id: 'sem4', name: 'Semester 4', year: '2nd Year', isLive: true }
];

export default function CurriculumManager() {
  const [curriculumBranch, setCurriculumBranch] = useState(null);

  return (
    <div className="curriculum-manager">
      <h3 className="section-title">Curriculum Manager</h3>

      {!curriculumBranch ? (
        <>
          <p className="curriculum-manager__hint">Select a branch to manage curriculum.</p>
          <div className="branch-cards-grid">
            {HOD_BRANCHES.map((branch) => (
              <div
                key={branch.id}
                className="branch-card"
                onClick={() => setCurriculumBranch(branch)}
              >
                <div className="branch-card__code">{branch.code}</div>
                <div className="branch-card__name">{branch.name}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="curriculum-manager__back" onClick={() => setCurriculumBranch(null)}>
            ← Back to Branches
          </button>
          <p className="curriculum-manager__subtitle">
            Managing Curriculum for <strong>{curriculumBranch.name}</strong>
          </p>
          <div className="semester-cards-grid">
            {BRANCH_SEMESTERS.map((sem) => (
              <div key={sem.id} className="semester-card">
                {sem.isLive && <span className="live-badge">🟢 LIVE</span>}
                <h4 className="semester-card__name">{sem.name}</h4>
                <p className="semester-card__year">{sem.year}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

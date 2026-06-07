import './SubjectsCard.css';

/**
 * @param {Object} props
 * @param {{ id: string; name: string; code: string; credit_hours: number }[]} props.subjects
 * @param {boolean} props.isLoading
 * @param {Error | null} props.error
 */
export default function SubjectsCard({ subjects, isLoading, error }) {
  if (isLoading) {
    return <p className="subjects-card__status">Loading subjects…</p>;
  }

  if (error) {
    return (
      <p className="subjects-card__status subjects-card__status--error">
        Unable to load subjects. Please try again later.
      </p>
    );
  }

  if (subjects.length === 0) {
    return <p className="subjects-card__status">No subjects found.</p>;
  }

  return (
    <div className="subjects-card">
      <h3 className="subjects-card__title">My Subjects</h3>
      <ul className="subjects-card__list">
        {subjects.map((subject) => (
          <li className="subjects-card__item" key={subject.id}>
            <div className="subjects-card__info">
              <span className="subjects-card__name">{subject.name}</span>
              <span className="subjects-card__code">{subject.code}</span>
            </div>
            <span className="subjects-card__credits">{subject.credit_hours} credits</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
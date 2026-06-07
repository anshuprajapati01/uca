import './ProfileCard.css';

/**
 * @param {Object} props
 * @param {{ label: string; value: string | null }[]} props.items
 */
export default function ProfileCard({ items }) {
  return (
    <div className="profile-card">
      <h3 className="profile-card__title">Student Profile</h3>
      <dl className="profile-card__list">
        {items.map(({ label, value }) => (
          <div className="profile-card__row" key={label}>
            <dt className="profile-card__label">{label}</dt>
            <dd className="profile-card__value">
              {value || '\u2014'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
